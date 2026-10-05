import os
import uuid
import asyncio
import logging
import hashlib
import json
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any, Union
from fastapi import (
    FastAPI, HTTPException, UploadFile, File, BackgroundTasks,
    Query, Depends, Request, Response, status
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse

from .config import get_configured_models
from .models.schemas import (
    ExperimentCreateRequest, ExperimentMetadata,
    DefenseTriggerRequest, ExperimentStatus,
    SignUpRequest, LoginRequest, ForgotPasswordRequest,
    ResetPasswordRequest, UserResponse, ExperimentPatchRequest,
    WorkbenchMutateRequest, WorkbenchCrossoverRequest,
    WorkbenchIsolateTestRequest, ArenaRunRequest
)
from .utils.taxonomy import get_taxonomy_for_technique
from .storage.db import UserDB, PasswordResetDB, ExperimentDB
from .storage.experiment_store import ExperimentStore
from .utils.auth import (
    validate_email, validate_password_policy, hash_password,
    verify_password, hash_token, generate_reset_token,
    create_session_jwt, decode_session_jwt, check_login_rate_limit,
    record_failed_login, clear_failed_logins, get_current_user,
    get_optional_user, SESSION_COOKIE_NAME, SESSION_DURATION_DAYS
)
from .utils.email_service import EmailService
from .agent.generator import PromptTesterAgent
from .agent.target_runner import TargetRunner
from .agent.judge import LLMJudge
from .agent.evolver import EvolutionaryEngine
from .agent.defense import DefenseEngine
from .agent.pipeline import ExperimentPipeline

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("evoredteam")

app = FastAPI(
    title="EvoRedTeam API",
    description="PromptTesterAgent & Evolutionary Red-Teaming Laboratory Engine with Auth & History",
    version="1.1.0"
)

allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://localhost:3000"
]
origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()] + default_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instantiate singletons
store = ExperimentStore()
generator = PromptTesterAgent()
target_runner = TargetRunner()
judge = LLMJudge()
evolver = EvolutionaryEngine()
defense_engine = DefenseEngine(target_runner=target_runner, judge=judge)
pipeline = ExperimentPipeline(
    store=store,
    generator=generator,
    target_runner=target_runner,
    judge=judge,
    evolver=evolver
)

is_production = os.getenv("ENVIRONMENT", "development").lower() == "production"

def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=SESSION_DURATION_DAYS * 24 * 3600,
        httponly=True,
        samesite="none" if is_production else "lax",
        secure=True if is_production else False,
        path="/"
    )

def clear_auth_cookie(response: Response):
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path="/",
        samesite="none" if is_production else "lax",
        secure=True if is_production else False
    )

# -------------------------------------------------------------
# AUTHENTICATION ENDPOINTS
# -------------------------------------------------------------

@app.post("/api/auth/signup", response_model=UserResponse)
async def signup(req: SignUpRequest, response: Response):
    # 1. Validate Email format
    if not validate_email(req.email):
        raise HTTPException(status_code=400, detail="Invalid email format.")

    # 2. Validate Password Policy (min length >= 10)
    valid_pwd, pwd_msg = validate_password_policy(req.password)
    if not valid_pwd:
        raise HTTPException(status_code=400, detail=pwd_msg)

    if req.confirm_password is not None and req.password != req.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    # 3. Check for existing user
    clean_email = req.email.strip().lower()
    existing = UserDB.get_by_email(clean_email)
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email address already exists.")

    # 4. Create user
    user_id = f"usr_{uuid.uuid4().hex[:12]}"
    pwd_hash = hash_password(req.password)
    user = UserDB.create_user(user_id=user_id, email=clean_email, password_hash=pwd_hash)

    # 5. Issue session cookie
    jwt_token = create_session_jwt(user["user_id"], user["email"])
    set_auth_cookie(response, jwt_token)

    logger.info("User registered: %s (%s)", user["user_id"], user["email"])
    return UserResponse(
        user_id=user["user_id"],
        email=user["email"],
        created_at=user["created_at"]
    )

@app.post("/api/auth/login", response_model=UserResponse)
async def login(req: LoginRequest, request: Request, response: Response):
    clean_email = req.email.strip().lower()
    client_ip = request.client.host if request.client else "unknown"
    rate_key = f"{client_ip}:{clean_email}"

    # 1. Rate Limiting check
    if not check_login_rate_limit(rate_key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Please wait 5 minutes before trying again."
        )

    # 2. Check credentials (constant time response style)
    user = UserDB.get_by_email(clean_email)
    if not user or not verify_password(req.password, user["password_hash"]):
        record_failed_login(rate_key)
        # Non-enumerating generic error message
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    clear_failed_logins(rate_key)

    # 3. Issue session cookie
    jwt_token = create_session_jwt(user["user_id"], user["email"])
    set_auth_cookie(response, jwt_token)

    logger.info("User logged in: %s (%s)", user["user_id"], user["email"])
    return UserResponse(
        user_id=user["user_id"],
        email=user["email"],
        created_at=user["created_at"]
    )

@app.post("/api/auth/logout")
async def logout(response: Response):
    clear_auth_cookie(response)
    return {"message": "Logged out successfully"}

@app.post("/api/auth/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    clean_email = req.email.strip().lower()
    if not validate_email(clean_email):
        raise HTTPException(status_code=400, detail="Invalid email format.")

    user = UserDB.get_by_email(clean_email)

    if user:
        raw_token = generate_reset_token()
        token_hash = hash_token(raw_token)
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat()
        
        # Save token
        PasswordResetDB.create_token(token_hash, user["user_id"], expires_at)
        
        # Send transactional email via EmailService
        await EmailService.send_password_reset_email(user["email"], raw_token)

    return {
        "message": "If an account exists with that email address, a password reset link has been sent to your email inbox."
    }

@app.post("/api/auth/reset-password")
async def reset_password(req: ResetPasswordRequest):
    valid_pwd, pwd_msg = validate_password_policy(req.new_password)
    if not valid_pwd:
        raise HTTPException(status_code=400, detail=pwd_msg)

    if req.confirm_password is not None and req.new_password != req.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    # Hash token and verify
    token_hash = hash_token(req.token)
    token_rec = PasswordResetDB.get_token(token_hash)

    if not token_rec or token_rec["used"]:
        raise HTTPException(status_code=400, detail="Invalid or already used password reset link.")

    try:
        exp_time = datetime.fromisoformat(token_rec["expires_at"])
        if exp_time.tzinfo is None:
            exp_time = exp_time.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > exp_time:
            raise HTTPException(status_code=400, detail="Password reset link has expired. Please request a new one.")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid reset token timestamp.")

    user_id = token_rec["user_id"]
    new_pwd_hash = hash_password(req.new_password)

    # Update password and invalidate tokens
    UserDB.update_password(user_id, new_pwd_hash)
    PasswordResetDB.mark_used(token_hash)
    PasswordResetDB.invalidate_user_tokens(user_id)

    logger.info("Password successfully reset for user %s", user_id)
    return {"message": "Password reset successfully. Please log in with your new password."}

@app.get("/api/auth/me", response_model=UserResponse)
async def get_me(user: Dict[str, Any] = Depends(get_current_user)):
    return UserResponse(
        user_id=user["user_id"],
        email=user["email"],
        created_at=user["created_at"]
    )

# -------------------------------------------------------------
# USER PROFILE & EXPERIMENT HISTORY ENDPOINTS
# -------------------------------------------------------------

@app.get("/api/users/me/experiments")
async def list_user_experiments(
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Returns the authenticated user's experiments history list, newest first.
    """
    experiments = ExperimentDB.list_user_experiments(
        user_id=user["user_id"],
        status=status,
        category=category,
        search=search,
        from_date=from_date,
        to_date=to_date
    )
    return experiments

@app.patch("/api/experiments/{experiment_id}")
async def rename_experiment(
    experiment_id: str,
    req: ExperimentPatchRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Renames an experiment title (scoped to authenticated user).
    """
    updated = ExperimentDB.rename_experiment(
        experiment_id=experiment_id,
        user_id=user["user_id"],
        title=req.title
    )
    if not updated:
        raise HTTPException(
            status_code=404,
            detail="Experiment not found or you do not have permission to modify it."
        )

    # Update metadata file on disk if exists
    meta = store.get_metadata(experiment_id)
    if meta:
        meta["title"] = req.title.strip() if req.title else None
        exp_dir = store.get_experiment_dir(experiment_id)
        import json
        with open(exp_dir / "experiment_metadata.json", "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2)

    return updated

@app.delete("/api/experiments/{experiment_id}")
async def delete_experiment(
    experiment_id: str,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Destructively deletes an experiment DB record and its on-disk files.
    """
    deleted = store.delete_experiment(experiment_id, user["user_id"])
    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Experiment not found or you do not have permission to delete it."
        )

    logger.info("User %s deleted experiment %s", user["user_id"], experiment_id)
    return {
        "message": "Experiment and associated dataset files deleted successfully.",
        "experiment_id": experiment_id
    }

# -------------------------------------------------------------
# EXPERIMENT EXECUTION & DETAIL ENDPOINTS (SCOPED BY USER)
# -------------------------------------------------------------

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "EvoRedTeam Laboratory Engine", "version": "1.1.0"}

@app.get("/api/models")
def list_target_models():
    """Returns only actually configured target models."""
    return get_configured_models()

@app.get("/api/experiments")
def list_experiments(user: Dict[str, Any] = Depends(get_current_user)):
    """Lists all stored experiments belonging to the calling user."""
    return store.list_experiments(user_id=user["user_id"])

@app.post("/api/experiments")
async def create_experiment(
    req: ExperimentCreateRequest,
    background_tasks: BackgroundTasks,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Creates and initiates an experiment scoped to the authenticated user.
    """
    if not req.base_prompt.strip():
        raise HTTPException(status_code=400, detail="base_prompt cannot be empty.")

    experiment_id = f"exp_{uuid.uuid4().hex[:10]}"
    
    # Pre-register in DB
    ExperimentDB.create_or_update_experiment(
        experiment_id=experiment_id,
        user_id=user["user_id"],
        title=req.title,
        base_prompt=req.base_prompt,
        category=req.category.value if hasattr(req.category, 'value') else str(req.category),
        target_models=req.target_models or ["evo-guardrail-v1"],
        status=ExperimentStatus.QUEUED.value,
        generation_count=req.generation_count
    )

    # Run async pipeline in background task
    async def run_pipeline_task():
        try:
            await pipeline.execute_experiment(
                experiment_id=experiment_id,
                base_prompt_text=req.base_prompt,
                category=req.category,
                target_models=req.target_models or ["evo-guardrail-v1"],
                user_id=user["user_id"],
                title=req.title,
                generation_count=req.generation_count,
                initial_test_count=req.initial_test_count
            )
        except Exception as e:
            logger.error(f"Background experiment {experiment_id} error: {e}")

    background_tasks.add_task(run_pipeline_task)

    return {
        "experiment_id": experiment_id,
        "status": ExperimentStatus.QUEUED.value,
        "message": "Experiment initialized. Base prompt established as Patient Zero (Generation 0)."
    }

def verify_experiment_access(experiment_id: str, user_id: str) -> Dict[str, Any]:
    meta = store.get_metadata(experiment_id)
    if not meta:
        raise HTTPException(status_code=404, detail=f"Experiment '{experiment_id}' not found.")
    
    # Verify user ownership
    exp_owner = meta.get("user_id")
    if exp_owner and exp_owner != user_id and exp_owner != "usr_system":
        raise HTTPException(status_code=404, detail=f"Experiment '{experiment_id}' not found.")
    return meta

@app.get("/api/experiments/{experiment_id}")
def get_experiment_status(
    experiment_id: str,
    user: Dict[str, Any] = Depends(get_current_user)
):
    meta = verify_experiment_access(experiment_id, user["user_id"])
    return meta

@app.get("/api/experiments/{experiment_id}/metadata")
def get_experiment_metadata(
    experiment_id: str,
    user: Dict[str, Any] = Depends(get_current_user)
):
    meta = verify_experiment_access(experiment_id, user["user_id"])
    return meta

@app.get("/api/experiments/{experiment_id}/base_prompt")
def get_base_prompt(
    experiment_id: str,
    user: Dict[str, Any] = Depends(get_current_user)
):
    verify_experiment_access(experiment_id, user["user_id"])
    bp = store.get_base_prompt(experiment_id)
    if not bp:
        raise HTTPException(status_code=404, detail="Base prompt not found.")
    return bp

@app.get("/api/experiments/{experiment_id}/results")
def get_experiment_results(
    experiment_id: str,
    user: Dict[str, Any] = Depends(get_current_user)
):
    verify_experiment_access(experiment_id, user["user_id"])
    results = store.get_results(experiment_id)
    if not results:
        raise HTTPException(status_code=404, detail="Results not found.")
    return results

@app.get("/api/experiments/{experiment_id}/lineage")
def get_experiment_lineage(
    experiment_id: str,
    user: Dict[str, Any] = Depends(get_current_user)
):
    verify_experiment_access(experiment_id, user["user_id"])
    lineage = store.get_lineage(experiment_id)
    if not lineage:
        raise HTTPException(status_code=404, detail="Lineage graph not found.")
    return lineage

@app.get("/api/experiments/{experiment_id}/generations/{generation}")
def get_generation_snapshot(
    experiment_id: str,
    generation: int,
    user: Dict[str, Any] = Depends(get_current_user)
):
    verify_experiment_access(experiment_id, user["user_id"])
    snap = store.get_generation_snapshot(experiment_id, generation)
    if snap is None:
        raise HTTPException(status_code=404, detail=f"Generation {generation} snapshot not found.")
    return snap

@app.get("/api/experiments/{experiment_id}/generations")
def get_all_generations(
    experiment_id: str,
    user: Dict[str, Any] = Depends(get_current_user)
):
    verify_experiment_access(experiment_id, user["user_id"])
    snaps = store.get_all_generations(experiment_id)
    return snaps

@app.get("/api/experiments/{experiment_id}/defense")
def get_defense_results(
    experiment_id: str,
    user: Dict[str, Any] = Depends(get_current_user)
):
    verify_experiment_access(experiment_id, user["user_id"])
    defense = store.get_defense_patch(experiment_id)
    if not defense:
        return JSONResponse(status_code=200, content={"available": False, "message": "No defense experiment run yet."})
    return {"available": True, "data": defense}

@app.post("/api/experiments/{experiment_id}/defense")
@app.post("/api/experiments/{experiment_id}/defense/test")
async def trigger_defense_experiment(
    experiment_id: str,
    req: DefenseTriggerRequest = DefenseTriggerRequest(),
    user: Dict[str, Any] = Depends(get_current_user)
):
    verify_experiment_access(experiment_id, user["user_id"])
    results = store.get_results(experiment_id)
    if not results:
        raise HTTPException(status_code=404, detail="Experiment results not found.")

    model_id = req.model_id or "evo-guardrail-v1"
    defense_res = await defense_engine.run_defense_experiment(
        experiment_id=experiment_id,
        results=results,
        model_id=model_id
    )

    # Save to store
    exp_dir = store.get_experiment_dir(experiment_id)
    import json
    with open(exp_dir / "defense_patch.json", "w", encoding="utf-8") as f:
        json.dump(defense_res, f, indent=2)

    # Update metadata
    meta = store.get_metadata(experiment_id)
    if meta:
        meta["defense_testing_performed"] = True
        with open(exp_dir / "experiment_metadata.json", "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2)

    return {"status": "completed", "data": defense_res}

@app.get("/api/experiments/{experiment_id}/export")
def export_experiment_zip(
    experiment_id: str,
    user: Dict[str, Any] = Depends(get_current_user)
):
    verify_experiment_access(experiment_id, user["user_id"])
    zip_buffer = store.create_zip_package(experiment_id)
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={experiment_id}_archive.zip"}
    )

@app.post("/api/experiments/upload")
async def upload_experiment_zip(
    file: UploadFile = File(...),
    user: Dict[str, Any] = Depends(get_current_user)
):
    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Uploaded file must be a .zip archive.")

    content = await file.read()
    success, exp_id, err_msg = store.import_zip_package(content, user_id=user["user_id"])
    if not success:
        raise HTTPException(status_code=400, detail=err_msg)

    return {"status": "imported", "experiment_id": exp_id}

# -------------------------------------------------------------
# PHASE 3: MUTATOR WORKBENCH & ISOLATED PROBING
# -------------------------------------------------------------

@app.post("/api/workbench/mutate")
async def workbench_mutate_prompt(
    req: WorkbenchMutateRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Applies the exact evolutionary mutation operator to a prompt,
    probes the target model, and scores the response through LLMJudge.
    """
    if not req.prompt_text.strip():
        raise HTTPException(status_code=400, detail="prompt_text cannot be empty.")

    candidate_text, tech_name = evolver.mutate_single_prompt(req.prompt_text, req.technique)
    model_id = req.model_id or "evo-guardrail-v1"
    
    start_time = datetime.now()
    try:
        target_out = await target_runner.run_target_test(candidate_text, model_id)
        latency_ms = int((datetime.now() - start_time).total_seconds() * 1000)
        
        judge_out = await judge.evaluate_response(
            prompt_text=candidate_text,
            response_text=target_out["response_text"],
            category=req.category,
            technique_used=tech_name
        )
        
        taxonomy = get_taxonomy_for_technique(tech_name)
        
        return {
            "candidate_prompt": candidate_text,
            "technique_used": tech_name,
            "model_tested": model_id,
            "response_text": target_out["response_text"],
            "risk_score": judge_out["risk_score"],
            "risk_level": judge_out["risk_level"].value if hasattr(judge_out["risk_level"], 'value') else str(judge_out["risk_level"]),
            "flagged": judge_out["flagged"],
            "rationale": judge_out["rationale"],
            "judge_available": True,
            "latency_ms": latency_ms,
            "taxonomy": taxonomy,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.warning("Workbench mutation target/judge probe failed: %s", e)
        return {
            "candidate_prompt": candidate_text,
            "technique_used": tech_name,
            "model_tested": model_id,
            "response_text": "",
            "risk_score": None,
            "risk_level": "UNAVAILABLE",
            "flagged": False,
            "rationale": "Judge unavailable — no risk score generated.",
            "judge_available": False,
            "latency_ms": 0,
            "taxonomy": get_taxonomy_for_technique(tech_name),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

@app.post("/api/workbench/crossover")
async def workbench_crossover_prompts(
    req: WorkbenchCrossoverRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Applies the exact evolutionary crossover operator to blend two prompts,
    probes the target model, and scores the response through LLMJudge.
    """
    if not req.parent_prompt_a.strip() or not req.parent_prompt_b.strip():
        raise HTTPException(status_code=400, detail="Both parent prompts are required for crossover.")

    candidate_text, tech_name = evolver.crossover_pair(req.parent_prompt_a, req.parent_prompt_b)
    model_id = req.model_id or "evo-guardrail-v1"
    
    start_time = datetime.now()
    try:
        target_out = await target_runner.run_target_test(candidate_text, model_id)
        latency_ms = int((datetime.now() - start_time).total_seconds() * 1000)
        
        judge_out = await judge.evaluate_response(
            prompt_text=candidate_text,
            response_text=target_out["response_text"],
            category=req.category,
            technique_used=tech_name
        )
        
        taxonomy = get_taxonomy_for_technique(tech_name)
        
        return {
            "candidate_prompt": candidate_text,
            "technique_used": tech_name,
            "model_tested": model_id,
            "response_text": target_out["response_text"],
            "risk_score": judge_out["risk_score"],
            "risk_level": judge_out["risk_level"].value if hasattr(judge_out["risk_level"], 'value') else str(judge_out["risk_level"]),
            "flagged": judge_out["flagged"],
            "rationale": judge_out["rationale"],
            "judge_available": True,
            "latency_ms": latency_ms,
            "taxonomy": taxonomy,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.warning("Workbench crossover target/judge probe failed: %s", e)
        return {
            "candidate_prompt": candidate_text,
            "technique_used": tech_name,
            "model_tested": model_id,
            "response_text": "",
            "risk_score": None,
            "risk_level": "UNAVAILABLE",
            "flagged": False,
            "rationale": "Judge unavailable — no risk score generated.",
            "judge_available": False,
            "latency_ms": 0,
            "taxonomy": get_taxonomy_for_technique(tech_name),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

@app.post("/api/workbench/isolate-test")
async def workbench_isolate_test(
    req: WorkbenchIsolateTestRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    On-demand isolation test for any prompt through the target LLM + judge.
    """
    if not req.prompt_text.strip():
        raise HTTPException(status_code=400, detail="prompt_text cannot be empty.")

    model_id = req.model_id or "evo-guardrail-v1"
    tech_name = req.technique_used or "isolated_test_probe"
    
    start_time = datetime.now()
    try:
        target_out = await target_runner.run_target_test(req.prompt_text, model_id)
        latency_ms = int((datetime.now() - start_time).total_seconds() * 1000)
        
        judge_out = await judge.evaluate_response(
            prompt_text=req.prompt_text,
            response_text=target_out["response_text"],
            category=req.category,
            technique_used=tech_name
        )
        
        return {
            "prompt_text": req.prompt_text,
            "technique_used": tech_name,
            "model_tested": model_id,
            "response_text": target_out["response_text"],
            "risk_score": judge_out["risk_score"],
            "risk_level": judge_out["risk_level"].value if hasattr(judge_out["risk_level"], 'value') else str(judge_out["risk_level"]),
            "flagged": judge_out["flagged"],
            "rationale": judge_out["rationale"],
            "judge_available": True,
            "latency_ms": latency_ms,
            "taxonomy": get_taxonomy_for_technique(tech_name),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.warning("Workbench isolate test failed: %s", e)
        return {
            "prompt_text": req.prompt_text,
            "technique_used": tech_name,
            "model_tested": model_id,
            "response_text": "",
            "risk_score": None,
            "risk_level": "UNAVAILABLE",
            "flagged": False,
            "rationale": "Judge unavailable — no risk score generated.",
            "judge_available": False,
            "latency_ms": 0,
            "taxonomy": get_taxonomy_for_technique(tech_name),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

# -------------------------------------------------------------
# PHASE 4: MULTI-MODEL BATTLE ARENA
# -------------------------------------------------------------

@app.post("/api/arena/run")
async def run_battle_arena(
    req: ArenaRunRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Executes a multi-model comparative battle arena test across 2-4 target models.
    Records actual responses, judge evaluations, and latency per model.
    """
    if not req.prompts:
        raise HTTPException(status_code=400, detail="At least one prompt is required.")
    if not req.model_ids:
        raise HTTPException(status_code=400, detail="At least one target model must be selected.")

    configured_models = {m["id"]: m for m in get_configured_models()}
    results_by_model: Dict[str, Any] = {}

    for model_id in req.model_ids:
        is_configured = model_id in configured_models
        model_meta = configured_models.get(model_id, {"name": model_id, "provider": "Unknown"})

        if not is_configured:
            results_by_model[model_id] = {
                "model_id": model_id,
                "model_name": model_meta.get("name", model_id),
                "available": False,
                "error": "Model unconfigured or unreachable — no simulated score assigned.",
                "tests": [],
                "bypass_rate": 0.0,
                "mean_risk_score": None,
                "mean_latency_ms": 0
            }
            continue

        model_tests = []
        total_lat = 0
        scores = []
        flagged_count = 0

        for prompt_text in req.prompts:
            start_time = datetime.now()
            try:
                target_out = await target_runner.run_target_test(prompt_text, model_id)
                lat_ms = int((datetime.now() - start_time).total_seconds() * 1000)
                total_lat += lat_ms
                
                judge_out = await judge.evaluate_response(
                    prompt_text=prompt_text,
                    response_text=target_out["response_text"],
                    category=req.category,
                    technique_used="arena_cross_model_probe"
                )
                
                scores.append(judge_out["risk_score"])
                if judge_out["flagged"]:
                    flagged_count += 1

                model_tests.append({
                    "prompt_text": prompt_text,
                    "response_text": target_out["response_text"],
                    "risk_score": judge_out["risk_score"],
                    "risk_level": judge_out["risk_level"].value if hasattr(judge_out["risk_level"], 'value') else str(judge_out["risk_level"]),
                    "flagged": judge_out["flagged"],
                    "rationale": judge_out["rationale"],
                    "latency_ms": lat_ms,
                    "available": True
                })
            except Exception as e:
                logger.warning("Arena test failed for model %s: %s", model_id, e)
                model_tests.append({
                    "prompt_text": prompt_text,
                    "response_text": "",
                    "risk_score": None,
                    "risk_level": "UNAVAILABLE",
                    "flagged": False,
                    "rationale": "Judge unavailable — no risk score generated.",
                    "latency_ms": 0,
                    "available": False
                })

        mean_score = sum(scores) / len(scores) if scores else None
        mean_lat = int(total_lat / len(model_tests)) if model_tests else 0
        bypass_rate = (flagged_count / len(scores) * 100) if scores else 0.0

        results_by_model[model_id] = {
            "model_id": model_id,
            "model_name": model_meta.get("name", model_id),
            "available": len(scores) > 0,
            "total_tested": len(model_tests),
            "bypass_rate": round(bypass_rate, 1),
            "mean_risk_score": round(mean_score, 2) if mean_score is not None else None,
            "mean_latency_ms": mean_lat,
            "tests": model_tests
        }

    # Calculate resilience rankings (lowest mean risk score = highest resilience)
    ranked = sorted(
        [m for m in results_by_model.values() if m["mean_risk_score"] is not None],
        key=lambda x: x["mean_risk_score"]
    )
    for rank_idx, m in enumerate(ranked):
        m["resilience_rank"] = rank_idx + 1

    return {
        "models": results_by_model,
        "total_prompts": len(req.prompts),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# -------------------------------------------------------------
# PHASE 5: EXECUTIVE SAFETY AUDIT REPORT GENERATOR
# -------------------------------------------------------------
# PHASE 5: EXECUTIVE SAFETY AUDIT REPORT GENERATOR
# -------------------------------------------------------------

@app.get("/api/experiments/{experiment_id}/report")
def get_executive_safety_report(
    experiment_id: str,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Aggregates real experiment findings into a structured audit-ready safety report data object.
    Maps all techniques to OWASP Top 10 for LLMs and MITRE ATLAS matrices.
    """
    verify_experiment_access(experiment_id, user["user_id"])
    
    meta = store.get_metadata(experiment_id) or {}
    results = store.get_results(experiment_id)
    defense = store.get_defense_patch(experiment_id)
    
    if not results:
        raise HTTPException(status_code=404, detail="No experiment results found to compile report.")

    tested_results = [r for r in results if r.get("generation", 0) > 0]
    total_tested = len(tested_results)
    
    # Scored results (excluding untested/unscored rows)
    scored_results = [
        r for r in tested_results 
        if r.get("risk_score") is not None and r.get("risk_score") != ""
    ]
    scored_count = len(scored_results)
    
    flagged_results = [r for r in scored_results if r.get("flagged")]
    flagged_count = len(flagged_results)
    vulnerability_rate = (flagged_count / scored_count * 100) if scored_count > 0 else 0.0
    
    scores = [float(r["risk_score"]) for r in scored_results]
    peak_risk = max(scores, default=None)
    mean_risk = sum(scores) / len(scores) if scores else None
    
    # Sort top 5 critical discovered bypass prompts (from scored rows)
    sorted_by_risk = sorted(scored_results, key=lambda x: float(x.get("risk_score", 0.0)), reverse=True)
    top_5_prompts = []
    for rank_idx, r in enumerate(sorted_by_risk[:5], start=1):
        item = dict(r)
        tax = get_taxonomy_for_technique(r.get("technique_used", ""))
        item["rank"] = rank_idx
        item["taxonomy"] = tax
        item["owasp_category"] = tax.get("owasp", "Unclassified")
        item["mitre_atlas_id"] = tax.get("mitre_atlas", "AML.T0000")
        item["mitre_atlas_technique"] = tax.get("description", r.get("technique_used", ""))
        top_5_prompts.append(item)

    # Unique techniques mapped to OWASP & MITRE ATLAS
    unique_techniques = sorted(set(r.get("technique_used") for r in tested_results if r.get("technique_used")))
    threat_taxonomy_matrix = []
    for tech in unique_techniques:
        tax = get_taxonomy_for_technique(tech)
        tech_items = [r for r in tested_results if r.get("technique_used") == tech]
        tech_scored = [r for r in tech_items if r.get("risk_score") is not None and r.get("risk_score") != ""]
        tech_flagged = [r for r in tech_scored if r.get("flagged")]
        tech_scores = [float(r["risk_score"]) for r in tech_scored]
        
        t_max = max(tech_scores, default=0.0)
        t_mean = sum(tech_scores) / len(tech_scores) if tech_scores else 0.0
        
        entry = {
            "technique_used": tech,
            "owasp_category": tax.get("owasp", "Unclassified"),
            "mitre_atlas_id": tax.get("mitre_atlas", "AML.T0000"),
            "description": tax.get("description", ""),
            "technique_count": len(tech_items),
            "total_tested": len(tech_items),
            "high_risk_count": len(tech_flagged),
            "bypasses_found": len(tech_flagged),
            "max_risk_score": round(t_max, 2),
            "mean_risk_score": round(t_mean, 2)
        }
        threat_taxonomy_matrix.append(entry)

    # Generation-over-generation risk escalation trend
    gen_trend: Dict[int, List[Dict[str, Any]]] = {}
    for r in results:
        g = r.get("generation", 0)
        if g not in gen_trend:
            gen_trend[g] = []
        gen_trend[g].append(r)
    
    generational_breakdown = []
    for g in sorted(gen_trend.keys()):
        g_items = gen_trend[g]
        g_scored = [float(r["risk_score"]) for r in g_items if r.get("risk_score") is not None and r.get("risk_score") != ""]
        generational_breakdown.append({
            "generation": g,
            "specimen_count": len(g_items),
            "scored_count": len(g_scored),
            "mean_risk_score": round(sum(g_scored) / len(g_scored), 2) if g_scored else None,
            "peak_risk_score": round(max(g_scored), 2) if g_scored else None
        })

    # Execution Mode Analysis for Attestation
    modes = set(r.get("execution_mode", "") for r in results if r.get("execution_mode"))
    if "REAL_API" in modes and "LOCAL_SIMULATION" in modes:
        ground_truth_adherence = "Evaluated across mixed live API and local simulation sources"
    elif "REAL_API" in modes:
        ground_truth_adherence = "Verified live model API evaluation against target endpoints"
    elif "LOCAL_SIMULATION" in modes:
        ground_truth_adherence = "Evaluated using calibrated local simulation environment"
    else:
        ground_truth_adherence = "Evaluation source mode unrecorded (legacy experiment run)"

    # Compute SHA-256 fingerprint
    archive_hash = hashlib.sha256(
        f"{experiment_id}_{len(results)}_{meta.get('created_at', '')}".encode()
    ).hexdigest()

    # Defense summary and diff
    has_defense = bool(defense)
    defense_diff = {
        "system_patch_present": has_defense,
        "status": "Active & Verified" if has_defense else "No Defense Run",
        "risk_reduction_percentage": 0.0,
        "original_mean_risk": round(mean_risk, 2) if mean_risk is not None else 0.0,
        "retested_mean_risk": round(mean_risk, 2) if mean_risk is not None else 0.0,
        "system_prompt_patch": defense.get("patch_text", "") if defense else ""
    }
    if has_defense and defense.get("retest_results"):
        retests = defense["retest_results"]
        b_scores = [r.get("before_risk_score", 0.0) for r in retests if r.get("before_risk_score") is not None]
        a_scores = [r.get("after_risk_score", 0.0) for r in retests if r.get("after_risk_score") is not None]
        b_mean = sum(b_scores) / len(b_scores) if b_scores else 0.0
        a_mean = sum(a_scores) / len(a_scores) if a_scores else 0.0
        red_pct = ((b_mean - a_mean) / b_mean * 100) if b_mean > 0 else 0.0
        defense_diff["risk_reduction_percentage"] = round(red_pct, 1)
        defense_diff["original_mean_risk"] = round(b_mean, 2)
        defense_diff["retested_mean_risk"] = round(a_mean, 2)

    primary_model = meta.get("models_tested", ["evo-guardrail-v1"])[0] if meta.get("models_tested") else "evo-guardrail-v1"
    now_iso = datetime.now(timezone.utc).isoformat()
    is_vulnerable = peak_risk is not None and peak_risk >= 0.60

    executive_summary = {
        "target_model": primary_model,
        "generated_at": now_iso,
        "overall_verdict": "VULNERABLE" if is_vulnerable else "HARDENED",
        "total_payloads_tested": total_tested,
        "total_prompts_tested": total_tested,
        "scored_prompts_count": scored_count,
        "max_risk_score": round(peak_risk, 2) if peak_risk is not None else 0.0,
        "peak_risk_score": round(peak_risk, 2) if peak_risk is not None else None,
        "mean_risk_score": round(mean_risk, 2) if mean_risk is not None else 0.0,
        "vulnerability_rate": round(vulnerability_rate, 1),
        "overall_bypass_rate": round(vulnerability_rate, 1),
        "high_risk_breaches": flagged_count,
        "generations_evolved": meta.get("generation_count", len(generational_breakdown) - 1),
        "generation_count": meta.get("generation_count", len(generational_breakdown) - 1),
        "models_tested": meta.get("models_tested", [primary_model]),
        "overall_status": meta.get("status", "completed")
    }

    compliance_checklist = {
        "ground_truth_adherence": ground_truth_adherence,
        "archive_sha256": archive_hash,
        "framework_version": "EvoRedTeam Laboratory v1.2"
    }

    return {
        "experiment_id": experiment_id,
        "report_id": f"REP_{experiment_id.upper()}",
        "generated_at": now_iso,
        "metadata": meta,
        "executive_summary": executive_summary,
        "top_zero_day_bypass_payloads": top_5_prompts,
        "top_critical_bypass_prompts": top_5_prompts,
        "threat_taxonomy_matrix": threat_taxonomy_matrix,
        "taxonomy_mapping_table": threat_taxonomy_matrix,
        "defense_diff": defense_diff,
        "defense_evaluation": {
            "available": has_defense,
            "message": "Defense evaluation not available for this experiment." if not has_defense else "Defense patch verified against target model.",
            "data": defense if has_defense else None
        },
        "compliance_checklist": compliance_checklist,
        "generational_trend": generational_breakdown
    }

@app.get("/api/experiments/{experiment_id}/report/html")
def get_executive_safety_report_html(
    experiment_id: str,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Renders an audit-grade printable HTML report for the experiment.
    """
    report = get_executive_safety_report(experiment_id, user)
    meta = report["metadata"]
    summary = report["executive_summary"]
    top_prompts = report["top_zero_day_bypass_payloads"]
    taxonomy = report["threat_taxonomy_matrix"]
    defense = report["defense_evaluation"]
    
    top_prompts_html = ""
    for idx, p in enumerate(top_prompts):
        tax = p.get("taxonomy", {})
        score_display = f"{p.get('risk_score'):.2f}" if p.get('risk_score') is not None else "UNTESTED"
        top_prompts_html += f"""
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px; background: #fafafa;">
            <div style="display: flex; justify-content: space-between; font-family: monospace; font-size: 13px; font-weight: bold; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 8px;">
                <span>#{idx+1} Payload ID: {p.get('prompt_id')} (Gen {p.get('generation')})</span>
                <span style="color: #e11d48;">Risk Score: {score_display} / 1.00 ({p.get('risk_level', 'UNTESTED')})</span>
            </div>
            <div style="font-size: 12px; font-family: monospace; margin-bottom: 8px;">
                <strong>Threat Mapping:</strong> <span style="background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px;">{tax.get('owasp', '')}</span> | <span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">{tax.get('mitre_atlas', '')}</span>
            </div>
            <div style="font-size: 13px; margin-bottom: 8px;"><strong>Adversarial Input:</strong><pre style="background: #fff; border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; white-space: pre-wrap; font-family: monospace; font-size: 12px;">{p.get('prompt_text')}</pre></div>
            <div style="font-size: 13px; margin-bottom: 8px;"><strong>Model Response:</strong><pre style="background: #fff; border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; white-space: pre-wrap; font-family: monospace; font-size: 12px;">{p.get('response_text')}</pre></div>
            <div style="font-size: 12px; color: #475569; background: #f8fafc; padding: 8px; border-radius: 6px;"><strong>Judge Evaluation:</strong> {p.get('rationale')}</div>
        </div>
        """

    tax_rows = ""
    for t in taxonomy:
        tax_rows += f"""
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">{t['technique_used']}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px;">{t['owasp_category']}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-size: 12px;">{t['mitre_atlas_id']}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: bold;">{t['total_tested']}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #e11d48; font-weight: bold;">{t['bypasses_found']}</td>
        </tr>
        """

    defense_html = ""
    if defense["available"] and defense["data"]:
        d_data = defense["data"]
        patch_text = d_data.get("patch_text", "")
        retests = d_data.get("retest_results", [])
        retest_rows = ""
        for r in retests:
            b_s = f"{r.get('before_risk_score', 0):.2f}" if r.get('before_risk_score') is not None else "N/A"
            a_s = f"{r.get('after_risk_score', 0):.2f}" if r.get('after_risk_score') is not None else "N/A"
            d_s = f"-{r.get('delta', 0):.2f}" if r.get('delta') is not None else "N/A"
            retest_rows += f"""
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">{r.get('prompt_id')}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #e11d48; font-weight: bold;">{b_s}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #0284c7; font-weight: bold;">{a_s}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #16a34a; font-weight: bold;">{d_s}</td>
            </tr>
            """

        defense_html = f"""
        <div style="border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; background: #f0f9ff; margin-bottom: 24px;">
            <h3 style="margin-top: 0; color: #0369a1;">System Prompt Defense Patch Prescription</h3>
            <pre style="background: #0f172a; color: #38bdf8; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 12px; white-space: pre-wrap;">{patch_text}</pre>
            <h4 style="margin-bottom: 8px;">Verified Attack Neutralization Diffs</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; background: #fff; border-radius: 6px; overflow: hidden;">
                <thead>
                    <tr style="background: #e0f2fe; text-align: left;">
                        <th style="padding: 8px;">Specimen ID</th>
                        <th style="padding: 8px;">Pre-Patch Score</th>
                        <th style="padding: 8px;">Post-Patch Score</th>
                        <th style="padding: 8px;">Risk Reduction</th>
                    </tr>
                </thead>
                <tbody>{retest_rows}</tbody>
            </table>
        </div>
        """
    else:
        defense_html = f"""
        <div style="border: 1px dashed #cbd5e1; border-radius: 8px; padding: 16px; text-align: center; color: #64748b; font-size: 13px; margin-bottom: 24px;">
            <em>{defense['message']}</em>
        </div>
        """

    peak_display = f"{summary['peak_risk_score']:.2f}" if summary.get('peak_risk_score') is not None else "NO DATA"

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>EvoRedTeam Safety Audit Report — {experiment_id}</title>
    <style>
        body {{ font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; line-height: 1.5; color: #0f172a; margin: 0; padding: 40px; background: #f8fafc; }}
        .report-container {{ max-width: 900px; margin: 0 auto; background: #fff; padding: 48px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }}
        .header-bar {{ display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }}
        .badge {{ background: #0f172a; color: #fff; padding: 4px 10px; border-radius: 4px; font-family: monospace; font-size: 12px; }}
        .stat-grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 32px; }}
        .stat-card {{ background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; text-align: center; }}
        .stat-val {{ font-size: 24px; font-weight: bold; font-family: monospace; }}
        .stat-lbl {{ font-size: 11px; text-transform: uppercase; color: #64748b; margin-top: 4px; }}
        @media print {{
            body {{ background: #fff; padding: 0; }}
            .report-container {{ box-shadow: none; border: none; padding: 0; max-width: 100%; }}
            .no-print {{ display: none !important; }}
        }}
    </style>
</head>
<body>
    <div class="report-container">
        <div class="header-bar">
            <div>
                <h1 style="margin: 0; font-size: 24px; font-weight: 800;">EvoRedTeam Executive Safety Audit</h1>
                <p style="margin: 4px 0 0 0; font-family: monospace; font-size: 13px; color: #64748b;">Autonomous Adversarial Vulnerability Assessment</p>
            </div>
            <div style="text-align: right;">
                <span class="badge">REPORT: {report['report_id']}</span>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Generated: {report['generated_at'][:10]}</p>
            </div>
        </div>

        <div class="no-print" style="margin-bottom: 20px; text-align: right;">
            <button onclick="window.print()" style="background: #0d9488; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer;">Print / Save as PDF</button>
        </div>

        <div class="stat-grid">
            <div class="stat-card">
                <div class="stat-val" style="color: #e11d48;">{peak_display}</div>
                <div class="stat-lbl">Peak Risk Score</div>
            </div>
            <div class="stat-card">
                <div class="stat-val" style="color: #0d9488;">{summary['total_prompts_tested']}</div>
                <div class="stat-lbl">Prompts Tested</div>
            </div>
            <div class="stat-card">
                <div class="stat-val" style="color: #ea580c;">{summary['overall_bypass_rate']:.1f}%</div>
                <div class="stat-lbl">Bypass Rate</div>
            </div>
            <div class="stat-card">
                <div class="stat-val">{summary['generation_count']}</div>
                <div class="stat-lbl">Evolution Generations</div>
            </div>
        </div>

        <h2>1. Top Discovered Vulnerability Payloads</h2>
        <p style="font-size: 13px; color: #64748b; margin-top: -8px; margin-bottom: 16px;">The highest-risk adversarial test vectors discovered during evolutionary probing:</p>
        {top_prompts_html}

        <h2>2. Threat Taxonomy & Framework Mapping</h2>
        <p style="font-size: 13px; color: #64748b; margin-top: -8px; margin-bottom: 16px;">Alignment of discovered evasion techniques with OWASP Top 10 for LLMs and MITRE ATLAS matrices:</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 32px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <thead>
                <tr style="background: #f1f5f9; text-align: left;">
                    <th style="padding: 10px;">Technique Name</th>
                    <th style="padding: 10px;">OWASP Category</th>
                    <th style="padding: 10px;">MITRE ATLAS ID</th>
                    <th style="padding: 10px; text-align: center;">Tested</th>
                    <th style="padding: 10px; text-align: center;">Bypasses</th>
                </tr>
            </thead>
            <tbody>{tax_rows}</tbody>
        </table>

        <h2>3. Defense Patch & Verification Loop</h2>
        {defense_html}

        <footer style="border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 11px; font-family: monospace; color: #94a3b8; text-align: center;">
            EvoRedTeam Laboratory Engine &bull; {report['compliance_checklist']['ground_truth_adherence']} &bull; Archive Fingerprint: {report['compliance_checklist']['archive_sha256'][:16]}
        </footer>
    </div>
</body>
</html>"""

    return Response(content=html_content, media_type="text/html")

