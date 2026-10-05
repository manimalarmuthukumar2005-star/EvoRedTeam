import os
import io
import json
import zipfile
import shutil
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import pandas as pd
from ..config import DATA_DIR
from .db import ExperimentDB
from ..models.schemas import (
    BasePromptRecord, PromptResult, LineageNode,
    GenerationSnapshot, DefensePatch, ExperimentMetadata,
    ExperimentStatus
)
from ..utils.validator import LineageTreeValidator, DataContractValidator

logger = logging.getLogger(__name__)

class ExperimentStore:
    def __init__(self, data_dir: Path = DATA_DIR):
        self.data_dir = data_dir
        self.data_dir.mkdir(parents=True, exist_ok=True)

    def get_experiment_dir(self, experiment_id: str) -> Path:
        exp_dir = self.data_dir / experiment_id
        exp_dir.mkdir(parents=True, exist_ok=True)
        return exp_dir

    def list_experiments(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        if user_id:
            return ExperimentDB.list_user_experiments(user_id)
            
        experiments = []
        for p in self.data_dir.iterdir():
            if p.is_dir() and (p / "experiment_metadata.json").exists():
                try:
                    with open(p / "experiment_metadata.json", "r", encoding="utf-8") as f:
                        meta = json.load(f)
                        experiments.append(meta)
                except Exception as e:
                    logger.warning("Failed to read metadata for %s: %s", p.name, e)
        return sorted(experiments, key=lambda x: x.get("created_at", ""), reverse=True)

    def save_experiment_state(
        self,
        experiment_id: str,
        base_prompt_record: Dict[str, Any],
        results: List[Dict[str, Any]],
        lineage: List[Dict[str, Any]],
        generations: Dict[int, Dict[str, Any]],
        metadata: Dict[str, Any],
        defense_patch: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None
    ) -> None:
        exp_dir = self.get_experiment_dir(experiment_id)

        # 1. base_prompt.json
        with open(exp_dir / "base_prompt.json", "w", encoding="utf-8") as f:
            json.dump(base_prompt_record, f, indent=2)

        # 2. results.csv
        df = pd.DataFrame(results)
        df.to_csv(exp_dir / "results.csv", index=False, encoding="utf-8")

        # 3. lineage.json
        with open(exp_dir / "lineage.json", "w", encoding="utf-8") as f:
            json.dump(lineage, f, indent=2)

        # 4. generations/
        gen_dir = exp_dir / "generations"
        gen_dir.mkdir(parents=True, exist_ok=True)
        for gen_idx, gen_data in generations.items():
            fname = f"gen_{gen_idx:02d}.json"
            with open(gen_dir / fname, "w", encoding="utf-8") as f:
                json.dump(gen_data, f, indent=2)

        # 5. defense_patch.json (optional)
        if defense_patch:
            with open(exp_dir / "defense_patch.json", "w", encoding="utf-8") as f:
                json.dump(defense_patch, f, indent=2)

        # Ensure user_id in metadata
        effective_user_id = user_id or metadata.get("user_id") or "usr_system"
        metadata["user_id"] = effective_user_id

        # 6. experiment_metadata.json
        with open(exp_dir / "experiment_metadata.json", "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)

        # 7. SQLite DB Sync
        peak_score = metadata.get("peak_risk_score")
        peak_score_val = float(peak_score) if peak_score is not None and not pd.isna(peak_score) else 0.0

        try:
            ExperimentDB.create_or_update_experiment(
                experiment_id=experiment_id,
                user_id=effective_user_id,
                title=metadata.get("title"),
                base_prompt=base_prompt_record.get("base_prompt"),
                category=base_prompt_record.get("category"),
                target_models=metadata.get("models_tested"),
                status=metadata.get("status", "completed"),
                peak_risk_score=peak_score_val,
                total_prompts_tested=int(metadata.get("total_prompts_tested", len(results))),
                generation_count=int(metadata.get("generation_count", len(generations)))
            )
        except Exception as e:
            logger.error("Failed to sync experiment %s to DB: %s", experiment_id, e)

    def get_base_prompt(self, experiment_id: str) -> Optional[Dict[str, Any]]:
        p = self.get_experiment_dir(experiment_id) / "base_prompt.json"
        if not p.exists():
            return None
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f)

    def get_results(self, experiment_id: str) -> List[Dict[str, Any]]:
        p = self.get_experiment_dir(experiment_id) / "results.csv"
        if not p.exists():
            return []
        df = pd.read_csv(p, encoding="utf-8")
        records = df.to_dict(orient="records")
        cleaned_records = []
        for r in records:
            # Clean string fields to prevent float NaN from pd.read_csv
            for str_field in ["response_text", "rationale", "prompt_text", "technique_used", "model_tested", "category", "experiment_id", "prompt_id", "timestamp"]:
                val = r.get(str_field)
                if val is None or pd.isna(val) or str(val).lower() == "nan":
                    r[str_field] = ""
                else:
                    r[str_field] = str(val)

            # Map empty or NaN risk_score to None and never to 0.0
            raw_score = r.get("risk_score")
            if pd.isna(raw_score) or raw_score == "" or str(raw_score).lower() == "nan" or raw_score is None:
                r["risk_score"] = None
            else:
                try:
                    r["risk_score"] = float(raw_score)
                except (ValueError, TypeError):
                    r["risk_score"] = None

            # Missing or empty risk_level becomes UNTESTED
            raw_lvl = r.get("risk_level")
            if pd.isna(raw_lvl) or not raw_lvl or str(raw_lvl).strip() == "" or str(raw_lvl).lower() == "nan":
                r["risk_level"] = "UNTESTED"
            else:
                r["risk_level"] = str(raw_lvl).strip()

            # Default missing execution_mode to empty string
            raw_mode = r.get("execution_mode")
            if pd.isna(raw_mode) or raw_mode is None or str(raw_mode).lower() == "nan":
                r["execution_mode"] = ""
            else:
                r["execution_mode"] = str(raw_mode)

            # Convert boolean fields
            if "flagged" in r:
                r["flagged"] = bool(r["flagged"]) if not pd.isna(r["flagged"]) else False
            if "survived_selection" in r:
                r["survived_selection"] = bool(r["survived_selection"]) if not pd.isna(r["survived_selection"]) else False
            
            # Handle parent_id
            if "parent_id" in r:
                if pd.isna(r["parent_id"]) or str(r["parent_id"]).lower() == "nan" or str(r["parent_id"]).strip() == "":
                    r["parent_id"] = None
                else:
                    r["parent_id"] = str(r["parent_id"])
            else:
                r["parent_id"] = None

            # Handle generation
            if "generation" in r:
                try:
                    r["generation"] = int(r["generation"])
                except (ValueError, TypeError):
                    r["generation"] = 0

            cleaned_records.append(r)
        return cleaned_records

    def get_lineage(self, experiment_id: str) -> List[Dict[str, Any]]:
        p = self.get_experiment_dir(experiment_id) / "lineage.json"
        if not p.exists():
            return []
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f)

    def get_generation_snapshot(self, experiment_id: str, generation: int) -> Optional[Dict[str, Any]]:
        fname = f"gen_{generation:02d}.json"
        p = self.get_experiment_dir(experiment_id) / "generations" / fname
        if not p.exists():
            return None
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f)

    def get_all_generations(self, experiment_id: str) -> Dict[str, Any]:
        gen_dir = self.get_experiment_dir(experiment_id) / "generations"
        if not gen_dir.exists():
            return {}
        result = {}
        for file in sorted(gen_dir.glob("gen_*.json")):
            with open(file, "r", encoding="utf-8") as f:
                result[file.stem] = json.load(f)
        return result

    def get_defense_patch(self, experiment_id: str) -> Optional[Dict[str, Any]]:
        p = self.get_experiment_dir(experiment_id) / "defense_patch.json"
        if not p.exists():
            return None
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f)

    def get_metadata(self, experiment_id: str) -> Optional[Dict[str, Any]]:
        p = self.get_experiment_dir(experiment_id) / "experiment_metadata.json"
        if not p.exists():
            # Check SQLite
            db_exp = ExperimentDB.get_experiment(experiment_id)
            return db_exp
        with open(p, "r", encoding="utf-8") as f:
            meta = json.load(f)
            db_exp = ExperimentDB.get_experiment(experiment_id)
            if db_exp:
                meta["title"] = db_exp.get("title")
                meta["display_title"] = db_exp.get("display_title")
                meta["user_id"] = db_exp.get("user_id")
            return meta

    def update_status(self, experiment_id: str, status: ExperimentStatus, error_msg: Optional[str] = None):
        meta = self.get_metadata(experiment_id)
        if meta:
            meta["status"] = status.value
            if error_msg:
                meta["error_message"] = error_msg
            with open(self.get_experiment_dir(experiment_id) / "experiment_metadata.json", "w", encoding="utf-8") as f:
                json.dump(meta, f, indent=2)
            
            try:
                user_id = meta.get("user_id", "usr_system")
                ExperimentDB.create_or_update_experiment(
                    experiment_id=experiment_id,
                    user_id=user_id,
                    status=status.value
                )
            except Exception as e:
                logger.warning("Error syncing status update to DB for %s: %s", experiment_id, e)

    def delete_experiment(self, experiment_id: str, user_id: str) -> bool:
        db_deleted = ExperimentDB.delete_experiment(experiment_id, user_id)
        exp_dir = self.data_dir / experiment_id
        if exp_dir.exists():
            shutil.rmtree(exp_dir, ignore_errors=True)
        return db_deleted

    def create_zip_package(self, experiment_id: str) -> io.BytesIO:
        exp_dir = self.get_experiment_dir(experiment_id)
        buffer = io.BytesIO()

        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as z:
            for root, _, files in os.walk(exp_dir):
                for file in files:
                    full_path = Path(root) / file
                    rel_path = full_path.relative_to(exp_dir)
                    z.write(full_path, arcname=rel_path.as_posix())

        buffer.seek(0)
        return buffer

    def import_zip_package(self, zip_bytes: bytes, user_id: str = "usr_system") -> Tuple[bool, str, Optional[str]]:
        """
        Safely imports an uploaded experiment ZIP with validation against zip-slip & data contracts.
        Returns: (success, experiment_id, error_message)
        """
        temp_id = f"import_temp_{os.urandom(4).hex()}"
        temp_dir = self.data_dir / temp_id
        temp_dir.mkdir(parents=True, exist_ok=True)

        try:
            with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as z:
                # Security: Check for path traversal attacks
                for member in z.namelist():
                    norm_path = os.path.normpath(member)
                    if norm_path.startswith("..") or os.path.isabs(norm_path):
                        return False, "", f"Security Violation: Malicious path '{member}' detected."
                
                # Check uncompressed total size (Max 50MB)
                total_size = sum(e.file_size for e in z.infolist())
                if total_size > 50 * 1024 * 1024:
                    return False, "", "Security Violation: Uncompressed ZIP size exceeds 50MB limit."

                z.extractall(temp_dir)

            # Check required files
            required_files = ["base_prompt.json", "results.csv", "lineage.json", "experiment_metadata.json"]
            for rf in required_files:
                if not (temp_dir / rf).exists():
                    return False, "", f"Malformed experiment package: missing '{rf}'."

            # Read and validate metadata
            with open(temp_dir / "experiment_metadata.json", "r", encoding="utf-8") as f:
                metadata = json.load(f)
            
            exp_id = metadata.get("experiment_id")
            base_prompt_id = metadata.get("base_prompt_id")
            if not exp_id or not base_prompt_id:
                return False, "", "Metadata missing experiment_id or base_prompt_id."

            # Set current user as owner
            metadata["user_id"] = user_id
            with open(temp_dir / "experiment_metadata.json", "w", encoding="utf-8") as f:
                json.dump(metadata, f, indent=2)

            # Validate lineage
            with open(temp_dir / "lineage.json", "r", encoding="utf-8") as f:
                lineage = json.load(f)
            
            valid_lineage, err = LineageTreeValidator.validate_lineage(lineage, base_prompt_id)
            if not valid_lineage:
                return False, "", f"Lineage validation failed: {err}"

            # Validate results CSV
            df = pd.read_csv(temp_dir / "results.csv", encoding="utf-8")
            valid_data, err = DataContractValidator.validate_results_data(df.to_dict(orient="records"))
            if not valid_data:
                return False, "", f"Data contract validation failed: {err}"

            # Target directory
            target_dir = self.data_dir / exp_id
            if target_dir.exists():
                shutil.rmtree(target_dir, ignore_errors=True)
            target_dir.mkdir(parents=True, exist_ok=True)
            
            # Copy all files from temp_dir to target_dir
            for item in temp_dir.iterdir():
                if item.is_dir():
                    shutil.copytree(item, target_dir / item.name, dirs_exist_ok=True)
                else:
                    shutil.copy2(item, target_dir / item.name)

            # Sync to DB
            with open(target_dir / "base_prompt.json", "r", encoding="utf-8") as f:
                bp_record = json.load(f)

            peak_score = metadata.get("peak_risk_score")
            peak_score_val = float(peak_score) if peak_score is not None and not pd.isna(peak_score) else 0.0

            ExperimentDB.create_or_update_experiment(
                experiment_id=exp_id,
                user_id=user_id,
                title=metadata.get("title"),
                base_prompt=bp_record.get("base_prompt"),
                category=bp_record.get("category"),
                target_models=metadata.get("models_tested"),
                status=metadata.get("status", "completed"),
                peak_risk_score=peak_score_val,
                total_prompts_tested=len(df),
                generation_count=int(metadata.get("generation_count", 0))
            )

            return True, exp_id, None

        except Exception as e:
            logger.error("Error importing ZIP: %s", e)
            return False, "", f"Failed to import ZIP package: {str(e)}"
        finally:
            if temp_dir.exists():
                shutil.rmtree(temp_dir, ignore_errors=True)
