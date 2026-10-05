import pytest
from app.utils.validator import LineageTreeValidator, DataContractValidator

def test_valid_lineage_tree():
    base_id = "gen00_base_test"
    lineage = [
        {
            "prompt_id": base_id,
            "parent_id": None,
            "parent_ids": [],
            "children": ["gen01_p1", "gen01_p2"],
            "generation": 0
        },
        {
            "prompt_id": "gen01_p1",
            "parent_id": base_id,
            "parent_ids": [base_id],
            "children": ["gen02_p1"],
            "generation": 1
        },
        {
            "prompt_id": "gen01_p2",
            "parent_id": base_id,
            "parent_ids": [base_id],
            "children": [],
            "generation": 1
        },
        {
            "prompt_id": "gen02_p1",
            "parent_id": "gen01_p1",
            "parent_ids": ["gen01_p1"],
            "children": [],
            "generation": 2
        }
    ]
    valid, err = LineageTreeValidator.validate_lineage(lineage, base_id)
    assert valid is True
    assert err is None

def test_orphan_parent_id():
    base_id = "gen00_base_test"
    lineage = [
        {
            "prompt_id": base_id,
            "parent_id": None,
            "parent_ids": [],
            "children": ["gen01_p1"],
            "generation": 0
        },
        {
            "prompt_id": "gen01_p1",
            "parent_id": "non_existent_parent",
            "parent_ids": ["non_existent_parent"],
            "children": [],
            "generation": 1
        }
    ]
    valid, err = LineageTreeValidator.validate_lineage(lineage, base_id)
    assert valid is False
    assert "orphan" in err.lower()

def test_generation_jump():
    base_id = "gen00_base_test"
    lineage = [
        {
            "prompt_id": base_id,
            "parent_id": None,
            "parent_ids": [],
            "children": ["gen02_p1"],
            "generation": 0
        },
        {
            "prompt_id": "gen02_p1",
            "parent_id": base_id,
            "parent_ids": [base_id],
            "children": [],
            "generation": 2  # Jump 0 -> 2
        }
    ]
    valid, err = LineageTreeValidator.validate_lineage(lineage, base_id)
    assert valid is False
    assert "invalid generation jump" in err.lower()
