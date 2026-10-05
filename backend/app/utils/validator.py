import logging
import math
from typing import List, Dict, Any, Tuple, Optional
import pandas as pd

logger = logging.getLogger(__name__)

class LineageTreeValidator:
    @staticmethod
    def validate_lineage(
        lineage_nodes: List[Dict[str, Any]],
        base_prompt_id: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Validates the lineage graph:
        1. Single tree rooted at generation-0 base_prompt_id.
        2. No orphan parent_ids.
        3. Reciprocal child relationships.
        4. Generation numbers consistent with parent generation.
        5. No impossible generation jumps or cycles.
        """
        if not lineage_nodes:
            return False, "Lineage graph is empty."

        node_map = {n["prompt_id"]: n for n in lineage_nodes}

        # 1. Base prompt root check
        if base_prompt_id not in node_map:
            return False, f"Base prompt '{base_prompt_id}' missing from lineage graph."

        root = node_map[base_prompt_id]
        if root.get("generation") != 0:
            return False, f"Base prompt must have generation=0, found {root.get('generation')}."
        if root.get("parent_id") is not None:
            return False, "Base prompt (root) must have parent_id=None."

        # 2. Check all nodes
        for node in lineage_nodes:
            p_id = node["prompt_id"]
            gen = node.get("generation", 0)
            parent_id = node.get("parent_id")
            parent_ids = node.get("parent_ids", [])
            children = node.get("children", [])

            if p_id == base_prompt_id:
                continue

            # Check primary parent_id
            if not parent_id:
                return False, f"Node '{p_id}' in generation {gen} has no parent_id."
            if parent_id not in node_map:
                return False, f"Node '{p_id}' has orphan parent_id '{parent_id}' not found in lineage."

            parent_node = node_map[parent_id]
            if parent_node.get("generation") != gen - 1:
                return False, f"Invalid generation jump: Parent '{parent_id}' is Gen {parent_node.get('generation')}, but child '{p_id}' is Gen {gen}."

            # Check parent_ids list
            for pid in parent_ids:
                if pid not in node_map:
                    return False, f"Node '{p_id}' has orphan parent_ids entry '{pid}'."
                if node_map[pid].get("generation") != gen - 1:
                    return False, f"Parent '{pid}' has invalid generation for child '{p_id}'."

            # Check parent reciprocal child link
            if p_id not in parent_node.get("children", []):
                return False, f"Parent '{parent_id}' does not list '{p_id}' in its children array."

        # 3. Check reachability from root (no isolated subgraphs)
        visited = set()
        queue = [base_prompt_id]
        while queue:
            curr = queue.pop(0)
            if curr in visited:
                continue
            visited.add(curr)
            for child_id in node_map[curr].get("children", []):
                if child_id in node_map:
                    queue.append(child_id)

        if len(visited) != len(node_map):
            unreachable = set(node_map.keys()) - visited
            return False, f"Unreachable nodes detected in lineage tree: {unreachable}"

        return True, None

class DataContractValidator:
    REQUIRED_CSV_COLUMNS = [
        "experiment_id", "prompt_id", "parent_id", "generation",
        "category", "technique_used", "model_tested", "prompt_text",
        "response_text", "risk_score", "risk_level", "flagged",
        "rationale", "survived_selection", "timestamp"
    ]

    @classmethod
    def validate_results_data(cls, results: List[Dict[str, Any]]) -> Tuple[bool, Optional[str]]:
        if not results:
            return False, "Results dataset is empty."

        for i, row in enumerate(results):
            for col in cls.REQUIRED_CSV_COLUMNS:
                if col not in row:
                    return False, f"Row {i} missing required column '{col}'."
            
            gen = row.get("generation")
            pid = row.get("parent_id")
            is_empty_pid = pid is None or pid == "" or (isinstance(pid, float) and math.isnan(pid))

            raw_score = row.get("risk_score")
            is_empty_score = raw_score is None or raw_score == "" or (isinstance(raw_score, float) and math.isnan(raw_score)) or str(raw_score).lower() == "nan"
            
            risk_level = str(row.get("risk_level", "")).strip().upper()

            if gen == 0:
                # Generation 0 must have null/empty parent_id, UNTESTED risk_level, and no score
                if not is_empty_pid:
                    return False, "Generation 0 row must have null or empty parent_id."
                if not is_empty_score:
                    return False, "Generation 0 row must not have a risk_score (must be untested)."
                if risk_level and risk_level != "UNTESTED":
                    return False, f"Generation 0 row must be UNTESTED, found '{risk_level}'."
            else:
                if is_empty_pid:
                    return False, f"Row {row.get('prompt_id')} (Gen {gen}) must have a valid parent_id."
                
                # Gen 1+ rows need a score unless marked UNTESTED because the target was unavailable
                if risk_level != "UNTESTED" and is_empty_score:
                    return False, f"Row {row.get('prompt_id')} (Gen {gen}) is marked '{risk_level}' but has no risk_score."

        return True, None
