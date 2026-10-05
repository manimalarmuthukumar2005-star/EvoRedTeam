from typing import List, Optional, Dict, Literal, Any
from pydantic import BaseModel, Field
from enum import Enum
import datetime

class RiskCategory(str, Enum):
    JAILBREAK = "jailbreak"
    INJECTION = "injection"
    PII_EXTRACTION = "pii_extraction"
    BIAS = "bias"
    MISINFORMATION = "misinformation"
    REFUSAL_BOUNDARY = "refusal_boundary"
    ROLEPLAY_EXPLOIT = "roleplay_exploit"
    CONTRADICTION = "contradiction"
    LOGIC_EDGE_CASE = "logic_edge_case"

class RiskLevel(str, Enum):
    SAFE = "SAFE"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"
    UNTESTED = "UNTESTED"

class ExperimentStatus(str, Enum):
    QUEUED = "queued"
    GENERATING = "generating"
    TESTING = "testing"
    JUDGING = "judging"
    EVOLVING = "evolving"
    COMPLETED = "completed"
    FAILED = "failed"

# Auth Schemas
class SignUpRequest(BaseModel):
    email: str
    password: str
    confirm_password: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    confirm_password: Optional[str] = None

class DirectResetPasswordRequest(BaseModel):
    email: str
    new_password: str
    confirm_password: Optional[str] = None

class UserResponse(BaseModel):
    user_id: str
    email: str
    created_at: str

class ExperimentPatchRequest(BaseModel):
    title: Optional[str] = None

class BasePromptRecord(BaseModel):
    experiment_id: str
    base_prompt_id: str
    base_prompt: str
    category: str
    created_at: str

class PromptResult(BaseModel):
    experiment_id: str
    prompt_id: str
    parent_id: Optional[str] = None
    generation: int
    category: str
    technique_used: str
    model_tested: str
    prompt_text: str
    response_text: str = ""
    risk_score: Optional[float] = None
    risk_level: RiskLevel = RiskLevel.UNTESTED
    flagged: bool = False
    rationale: str = ""
    survived_selection: bool = False
    timestamp: str
    execution_mode: Optional[str] = ""

class LineageNode(BaseModel):
    prompt_id: str
    parent_id: Optional[str] = None
    parent_ids: List[str] = Field(default_factory=list)
    children: List[str] = Field(default_factory=list)
    generation: int

class GenerationSnapshot(BaseModel):
    generation: int
    prompt_ids: List[str]
    risk_scores: Dict[str, Optional[float]]
    culled_prompt_ids: List[str]
    surviving_prompt_ids: List[str]

class DefensePatch(BaseModel):
    patch_text: str
    applied_to_prompt_ids: List[str]
    before_risk_score: Dict[str, Optional[float]]
    after_risk_score: Dict[str, Optional[float]]

class ExperimentMetadata(BaseModel):
    experiment_id: str
    user_id: Optional[str] = None
    title: Optional[str] = None
    created_at: str
    base_prompt_id: str
    category: str
    initial_test_prompt_count: int
    generation_count: int
    models_tested: List[str]
    total_prompts_tested: int
    peak_risk_score: Optional[float] = None
    defense_testing_performed: bool
    status: ExperimentStatus = ExperimentStatus.COMPLETED
    error_message: Optional[str] = None

class ExperimentCreateRequest(BaseModel):
    base_prompt: str
    category: RiskCategory = RiskCategory.REFUSAL_BOUNDARY
    target_models: Optional[List[str]] = None
    generation_count: int = Field(default=5, ge=1, le=8)
    initial_test_count: int = Field(default=18, ge=10, le=25)
    title: Optional[str] = None

class DefenseTriggerRequest(BaseModel):
    model_id: Optional[str] = None

class WorkbenchMutateRequest(BaseModel):
    prompt_text: str
    technique: Optional[str] = None
    category: Optional[RiskCategory] = RiskCategory.REFUSAL_BOUNDARY
    model_id: Optional[str] = "evo-guardrail-v1"

class WorkbenchCrossoverRequest(BaseModel):
    parent_prompt_a: str
    parent_prompt_b: str
    category: Optional[RiskCategory] = RiskCategory.REFUSAL_BOUNDARY
    model_id: Optional[str] = "evo-guardrail-v1"

class WorkbenchIsolateTestRequest(BaseModel):
    prompt_text: str
    category: Optional[RiskCategory] = RiskCategory.REFUSAL_BOUNDARY
    technique_used: Optional[str] = "isolated_test_probe"
    model_id: Optional[str] = "evo-guardrail-v1"

class ArenaRunRequest(BaseModel):
    prompts: List[str]
    model_ids: List[str]
    category: Optional[RiskCategory] = RiskCategory.REFUSAL_BOUNDARY
