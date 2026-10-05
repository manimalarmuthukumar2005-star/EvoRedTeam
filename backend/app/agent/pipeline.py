import uuid
import datetime
import logging
from typing import Dict, Any, List, Optional
from ..models.schemas import (
    RiskCategory, ExperimentStatus, RiskLevel,
    BasePromptRecord, PromptResult, LineageNode,
    GenerationSnapshot, ExperimentMetadata
)
from .generator import PromptTesterAgent
from .target_runner import TargetRunner
from .judge import LLMJudge
from .evolver import EvolutionaryEngine
from ..storage.experiment_store import ExperimentStore
from ..utils.validator import LineageTreeValidator, DataContractValidator

logger = logging.getLogger(__name__)

class ExperimentPipeline:
    def __init__(
        self,
        store: ExperimentStore,
        generator: PromptTesterAgent,
        target_runner: TargetRunner,
        judge: LLMJudge,
        evolver: EvolutionaryEngine
    ):
        self.store = store
        self.generator = generator
        self.target_runner = target_runner
        self.judge = judge
        self.evolver = evolver

    async def _test_and_judge(
        self,
        prompt_item: Dict[str, Any],
        model_id: str,
        category: RiskCategory,
        generation: int,
        parent_id: Optional[str],
        experiment_id: str
    ) -> Dict[str, Any]:
        """
        Shared execution unit: tests prompt against target model and evaluates response with LLM judge.
        If target call is not successful (unavailable or error), marks row as UNTESTED with no risk score;
        the judge is not called.
        """
        target_out = await self.target_runner.run_target_test(
            prompt_text=prompt_item["prompt_text"],
            model_id=model_id
        )

        exec_mode = target_out.get("execution_mode", "")
        status = target_out.get("status", "error")

        if status != "success":
            # If target status is not success, row gets risk_score null, UNTESTED, and failure rationale; judge is not called
            return {
                "experiment_id": experiment_id,
                "prompt_id": prompt_item["prompt_id"],
                "parent_id": parent_id,
                "generation": generation,
                "category": category.value if hasattr(category, 'value') else str(category),
                "technique_used": prompt_item["technique_used"],
                "model_tested": model_id,
                "prompt_text": prompt_item["prompt_text"],
                "response_text": target_out.get("response_text", ""),
                "risk_score": None,
                "risk_level": RiskLevel.UNTESTED.value,
                "flagged": False,
                "rationale": f"Target model unavailable or error ({target_out.get('response_text', status)}). Judge omitted.",
                "survived_selection": False,
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "execution_mode": exec_mode
            }

        # Successful target call: evaluate with judge
        judge_out = await self.judge.evaluate_response(
            prompt_text=prompt_item["prompt_text"],
            response_text=target_out["response_text"],
            category=category,
            technique_used=prompt_item["technique_used"]
        )

        risk_lvl_val = judge_out["risk_level"].value if hasattr(judge_out["risk_level"], 'value') else str(judge_out["risk_level"])

        return {
            "experiment_id": experiment_id,
            "prompt_id": prompt_item["prompt_id"],
            "parent_id": parent_id,
            "generation": generation,
            "category": category.value if hasattr(category, 'value') else str(category),
            "technique_used": prompt_item["technique_used"],
            "model_tested": model_id,
            "prompt_text": prompt_item["prompt_text"],
            "response_text": target_out["response_text"],
            "risk_score": judge_out["risk_score"],
            "risk_level": risk_lvl_val,
            "flagged": judge_out["flagged"],
            "rationale": judge_out["rationale"],
            "survived_selection": False,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "execution_mode": exec_mode
        }

    async def execute_experiment(
        self,
        experiment_id: str,
        base_prompt_text: str,
        category: RiskCategory,
        target_models: List[str],
        user_id: str = "usr_system",
        title: Optional[str] = None,
        generation_count: int = 5,
        initial_test_count: int = 18
    ) -> Dict[str, Any]:
        """
        Executes the complete PromptTesterAgent + Evolutionary Red-Teaming Pipeline.
        """
        created_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
        base_prompt_id = f"gen00_base_{uuid.uuid4().hex[:6]}"
        primary_model = target_models[0] if target_models else "evo-guardrail-v1"

        # Initialize tracking structures
        all_results: List[Dict[str, Any]] = []
        lineage_nodes: Dict[str, Dict[str, Any]] = {}
        generations_snapshots: Dict[int, Dict[str, Any]] = {}

        # -------------------------------------------------------------
        # STEP 1: Generation 0 - The User's Base Prompt (Patient Zero)
        # -------------------------------------------------------------
        base_record = {
            "experiment_id": experiment_id,
            "base_prompt_id": base_prompt_id,
            "base_prompt": base_prompt_text,
            "category": category.value if hasattr(category, 'value') else str(category),
            "created_at": created_at
        }

        # Generation 0 seed row gets risk_score None and risk_level UNTESTED
        base_prompt_result = {
            "experiment_id": experiment_id,
            "prompt_id": base_prompt_id,
            "parent_id": None,
            "generation": 0,
            "category": base_record["category"],
            "technique_used": "origin_seed_specimen",
            "model_tested": primary_model,
            "prompt_text": base_prompt_text,
            "response_text": "",
            "risk_score": None,
            "risk_level": RiskLevel.UNTESTED.value,
            "flagged": False,
            "rationale": "Origin baseline prompt (Patient Zero). Descendants are tested.",
            "survived_selection": True,
            "timestamp": created_at,
            "execution_mode": ""
        }
        all_results.append(base_prompt_result)

        lineage_nodes[base_prompt_id] = {
            "prompt_id": base_prompt_id,
            "parent_id": None,
            "parent_ids": [],
            "children": [],
            "generation": 0
        }

        generations_snapshots[0] = {
            "generation": 0,
            "prompt_ids": [base_prompt_id],
            "risk_scores": {base_prompt_id: None},
            "culled_prompt_ids": [],
            "surviving_prompt_ids": [base_prompt_id]
        }

        # Save initial metadata
        init_metadata = {
            "experiment_id": experiment_id,
            "user_id": user_id,
            "title": title,
            "created_at": created_at,
            "base_prompt_id": base_prompt_id,
            "category": base_record["category"],
            "initial_test_prompt_count": initial_test_count,
            "generation_count": generation_count,
            "models_tested": target_models if target_models else [primary_model],
            "total_prompts_tested": 0,
            "peak_risk_score": None,
            "defense_testing_performed": False,
            "status": ExperimentStatus.GENERATING.value
        }
        self.store.save_experiment_state(
            experiment_id=experiment_id,
            base_prompt_record=base_record,
            results=all_results,
            lineage=list(lineage_nodes.values()),
            generations=generations_snapshots,
            metadata=init_metadata,
            user_id=user_id
        )

        try:
            # -------------------------------------------------------------
            # STEP 2: Generation 1 - PromptTesterAgent Test Set Burst
            # -------------------------------------------------------------
            self.store.update_status(experiment_id, ExperimentStatus.GENERATING)
            gen1_prompts = await self.generator.generate_initial_tests(
                base_prompt_id=base_prompt_id,
                base_prompt=base_prompt_text,
                category=category,
                count=initial_test_count
            )

            # Link Generation 1 children to Generation 0 root
            for p in gen1_prompts:
                p_id = p["prompt_id"]
                lineage_nodes[base_prompt_id]["children"].append(p_id)
                lineage_nodes[p_id] = {
                    "prompt_id": p_id,
                    "parent_id": base_prompt_id,
                    "parent_ids": [base_prompt_id],
                    "children": [],
                    "generation": 1
                }

            # -------------------------------------------------------------
            # STEP 3: Test and Judge Generation 1
            # -------------------------------------------------------------
            self.store.update_status(experiment_id, ExperimentStatus.TESTING)
            gen1_results = []
            gen1_scores = {}

            for p in gen1_prompts:
                rec = await self._test_and_judge(
                    prompt_item=p,
                    model_id=primary_model,
                    category=category,
                    generation=1,
                    parent_id=base_prompt_id,
                    experiment_id=experiment_id
                )
                gen1_results.append(rec)
                gen1_scores[p["prompt_id"]] = rec["risk_score"]

            # Select survivors for Gen 1 (drops unscored rows)
            survivors, surviving_ids, culled_ids = self.evolver.select_survivors(gen1_results)
            for r in gen1_results:
                if r["prompt_id"] in surviving_ids:
                    r["survived_selection"] = True

            all_results.extend(gen1_results)
            generations_snapshots[1] = {
                "generation": 1,
                "prompt_ids": [p["prompt_id"] for p in gen1_prompts],
                "risk_scores": gen1_scores,
                "culled_prompt_ids": culled_ids,
                "surviving_prompt_ids": surviving_ids
            }

            # -------------------------------------------------------------
            # STEP 4: Subsequent Generations 2..N (Evolve -> Test -> Judge)
            # -------------------------------------------------------------
            current_survivors = survivors
            for gen_idx in range(2, generation_count + 1):
                if not current_survivors:
                    logger.info("Population collapsed at generation %s.", gen_idx)
                    generations_snapshots[gen_idx] = {
                        "generation": gen_idx,
                        "prompt_ids": [],
                        "risk_scores": {},
                        "culled_prompt_ids": [],
                        "surviving_prompt_ids": []
                    }
                    break

                self.store.update_status(experiment_id, ExperimentStatus.EVOLVING)
                offspring = self.evolver.evolve_next_generation(
                    survivors=current_survivors,
                    target_generation=gen_idx,
                    target_population_size=max(8, len(current_survivors) * 2)
                )

                # Update lineage graph
                for child in offspring:
                    c_id = child["prompt_id"]
                    p_id = child["parent_id"]
                    if p_id in lineage_nodes:
                        lineage_nodes[p_id]["children"].append(c_id)
                    lineage_nodes[c_id] = {
                        "prompt_id": c_id,
                        "parent_id": p_id,
                        "parent_ids": child.get("parent_ids", [p_id]),
                        "children": [],
                        "generation": gen_idx
                    }

                # Test & Judge offspring
                self.store.update_status(experiment_id, ExperimentStatus.TESTING)
                gen_results = []
                gen_scores = {}

                for child in offspring:
                    rec = await self._test_and_judge(
                        prompt_item=child,
                        model_id=primary_model,
                        category=category,
                        generation=gen_idx,
                        parent_id=child["parent_id"],
                        experiment_id=experiment_id
                    )
                    gen_results.append(rec)
                    gen_scores[child["prompt_id"]] = rec["risk_score"]

                # Selection for this generation
                gen_survivors, gen_surv_ids, gen_cull_ids = self.evolver.select_survivors(gen_results)
                for r in gen_results:
                    if r["prompt_id"] in gen_surv_ids:
                        r["survived_selection"] = True

                all_results.extend(gen_results)
                generations_snapshots[gen_idx] = {
                    "generation": gen_idx,
                    "prompt_ids": [c["prompt_id"] for c in offspring],
                    "risk_scores": gen_scores,
                    "culled_prompt_ids": gen_cull_ids,
                    "surviving_prompt_ids": gen_surv_ids
                }
                current_survivors = gen_survivors

            # -------------------------------------------------------------
            # STEP 5: Validation & Finalization
            # -------------------------------------------------------------
            lineage_list = list(lineage_nodes.values())
            valid_lineage, l_err = LineageTreeValidator.validate_lineage(lineage_list, base_prompt_id)
            if not valid_lineage:
                logger.error("Lineage validation failed: %s", l_err)
                raise ValueError(f"Lineage integrity failure: {l_err}")

            valid_data, d_err = DataContractValidator.validate_results_data(all_results)
            if not valid_data:
                logger.error("Data contract validation failed: %s", d_err)
                raise ValueError(f"Data contract integrity failure: {d_err}")

            # Calculate actual peak risk score from scored rows only, or None
            tested_prompts = [r for r in all_results if r["generation"] > 0]
            scored_prompts = [r for r in tested_prompts if r.get("risk_score") is not None and r.get("risk_score") != ""]
            peak_risk = max([float(r["risk_score"]) for r in scored_prompts], default=None)

            final_metadata = {
                "experiment_id": experiment_id,
                "user_id": user_id,
                "title": title,
                "created_at": created_at,
                "base_prompt_id": base_prompt_id,
                "category": base_record["category"],
                "initial_test_prompt_count": initial_test_count,
                "generation_count": len(generations_snapshots) - 1,
                "models_tested": target_models if target_models else [primary_model],
                "total_prompts_tested": len(tested_prompts),
                "peak_risk_score": peak_risk,
                "defense_testing_performed": False,
                "status": ExperimentStatus.COMPLETED.value
            }

            self.store.save_experiment_state(
                experiment_id=experiment_id,
                base_prompt_record=base_record,
                results=all_results,
                lineage=lineage_list,
                generations=generations_snapshots,
                metadata=final_metadata,
                user_id=user_id
            )

            logger.info("Experiment %s successfully completed. %s prompts tested.", experiment_id, len(tested_prompts))
            return final_metadata

        except Exception as e:
            logger.exception("Experiment %s failed: %s", experiment_id, e)
            self.store.update_status(experiment_id, ExperimentStatus.FAILED, str(e))
            raise e
