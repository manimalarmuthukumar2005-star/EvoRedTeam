import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env if present
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

DATA_DIR = Path(os.getenv("DATA_DIR", BASE_DIR / "data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)

# API Keys (Kept server side ONLY)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# Default Model Overrides via Environment Variables
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")

# Configured Target Models
def get_configured_models():
    models = []
    # Always include the controlled deterministic Target Engine
    models.append({
        "id": "evo-guardrail-v1",
        "name": "EvoGuardrail Target (Controlled Robustness Model)",
        "provider": "local",
        "is_default": True,
        "description": "Standard controlled LLM target engine configured with calibrated guardrail boundaries."
    })
    
    if OPENAI_API_KEY:
        models.append({
            "id": OPENAI_MODEL,
            "name": f"OpenAI {OPENAI_MODEL}",
            "provider": "openai",
            "is_default": False,
            "description": "Commercial target model via OpenAI API"
        })
        if OPENAI_MODEL != "gpt-4o":
            models.append({
                "id": "gpt-4o",
                "name": "OpenAI GPT-4o",
                "provider": "openai",
                "is_default": False,
                "description": "Flagship OpenAI model"
            })
    if ANTHROPIC_API_KEY:
        models.append({
            "id": ANTHROPIC_MODEL,
            "name": f"Anthropic {ANTHROPIC_MODEL}",
            "provider": "anthropic",
            "is_default": False,
            "description": "Anthropic Claude model"
        })
    if GEMINI_API_KEY:
        models.append({
            "id": GEMINI_MODEL,
            "name": f"Google {GEMINI_MODEL}",
            "provider": "gemini",
            "is_default": False,
            "description": "Google Gemini target model"
        })
    if GROQ_API_KEY:
        models.append({
            "id": GROQ_MODEL,
            "name": f"Groq {GROQ_MODEL}",
            "provider": "groq",
            "is_default": False,
            "description": "Groq-hosted open model"
        })
    return models
