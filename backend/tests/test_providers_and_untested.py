import pytest
import asyncio
from app.agent.providers import provider_for_model, OpenAIProvider, AnthropicProvider, GeminiProvider, GroqProvider
from app.agent.target_runner import TargetRunner
from app.agent.evolver import EvolutionaryEngine
from app.models.schemas import RiskLevel

@pytest.mark.asyncio
async def test_unconfigured_provider_returns_unavailable():
    """Unconfigured provider returns unavailable status, not a simulated response."""
    # Test OpenAI provider with an unconfigured model
    provider = OpenAIProvider("gpt-nonexistent-model")
    # Even if an API key exists or not, test adapter routing and behavior when key is absent
    original_key_check = provider._has_key
    provider._has_key = lambda: False
    
    res = await provider.run("Test prompt")
    assert res["status"] == "unavailable"
    assert res["execution_mode"] == "REAL_API"
    assert "not configured" in res["response_text"].lower() or "unavailable" in res["status"]
    # Ensure it did not return a simulated response text like "[Simulated Target Response]"
    assert "[Simulated Target Response" not in res["response_text"]


@pytest.mark.asyncio
async def test_local_engine_labelled_local_simulation():
    """Local engine (e.g. evo-guardrail-v1) is labelled LOCAL_SIMULATION."""
    runner = TargetRunner()
    res = await runner.run_target_test("Test prompt for local model", model_id="evo-guardrail-v1")
    assert res["execution_mode"] == "LOCAL_SIMULATION"
    assert res["status"] == "success"
    assert res["model_tested"] == "evo-guardrail-v1"


def test_select_survivors_ignores_unscored_rows():
    """select_survivors drops unscored rows (risk_score is None) so no unscored row can survive."""
    evolver = EvolutionaryEngine()
    generation_results = [
        # Generation 0 root (unscored)
        {
            "prompt_id": "gen00_root",
            "generation": 0,
            "risk_score": None,
            "risk_level": "UNTESTED",
            "technique_used": "origin_seed_specimen"
        },
        # Gen 1 row with high score
        {
            "prompt_id": "gen01_high",
            "generation": 1,
            "risk_score": 0.85,
            "risk_level": "CRITICAL",
            "technique_used": "roleplay_framing"
        },
        # Gen 1 row with low score
        {
            "prompt_id": "gen01_low",
            "generation": 1,
            "risk_score": 0.15,
            "risk_level": "SAFE",
            "technique_used": "hypothetical_context"
        },
        # Gen 1 row unscored (target unavailable)
        {
            "prompt_id": "gen01_unscored",
            "generation": 1,
            "risk_score": None,
            "risk_level": "UNTESTED",
            "technique_used": "authority_inversion"
        }
    ]

    survivors, surviving_ids, culled_ids = evolver.select_survivors(generation_results, min_survivors=1)
    
    # Assert gen00_root and gen01_unscored are NOT in survivors
    assert "gen00_root" not in surviving_ids
    assert "gen01_unscored" not in surviving_ids
    assert "gen01_unscored" in culled_ids
    assert "gen01_high" in surviving_ids


def test_adapters_expose_no_key_attribute():
    """Provider adapters do not expose public 'key' or 'api_key' attributes."""
    for model_id in ["gpt-4o-mini", "claude-haiku-4-5-20251001", "gemini-2.0-flash", "llama-3.1-8b-instant"]:
        adapter = provider_for_model(model_id)
        assert adapter is not None
        assert not hasattr(adapter, "key")
        assert not hasattr(adapter, "api_key")
        assert not hasattr(adapter, "secret")
