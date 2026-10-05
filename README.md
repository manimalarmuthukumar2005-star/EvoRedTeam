# EvoRedTeam: Autonomous LLM Evolutionary Red-Teaming Laboratory

**EvoRedTeam** is a state-of-the-art autonomous AI red-teaming laboratory and interactive phylogenetic visualization platform. It explores the adversarial boundary of large language models through multi-generational evolutionary mutations, crossover breeding, calibrated risk judging, and automated system prompt defense synthesis.

---

## Architecture Overview

EvoRedTeam operates as a dual-tier system:
1. **System A (Backend Engine)**: FastAPI asynchronous pipeline with strict schema enforcement, multi-provider LLM adapters, deterministic safety judging, and reproducible phylogenetic dataset storage.
2. **System B (Frontend Laboratory)**: React + Vite + Tailwind CSS laboratory interface featuring HTML5 Canvas 2D organism fields, interactive phylogenetic lineage visualizers, live evolution chambers, and executive safety audit reports.

---

## Stage-2 Features & Key Improvements

### 1. Untested Specimen State Lifecycle (FEAT-001 / FIX-002)
- **Patient Zero (Gen 0)**: Initial user seed prompts are tagged with `risk_level: UNTESTED` and `risk_score: null`.
- **Target Failure Resilience**: If a target LLM endpoint is unavailable or returns an error, the specimen is marked `UNTESTED` with a descriptive rationale, preventing arbitrary zero or simulated scores from polluting the dataset.
- **Fitness Selection Integrity**: `select_survivors` filters out unscored/untested rows so non-scored specimens cannot survive or mutate based on artificial fitness.
- **Null-Safe Frontend Visualizations**: All components (`OrganismField`, `LineageTreeVisualizer`, `SpecimenSlideModal`, `MutatorWorkbench`, `LandingHero`, `ProfileHistoryPage`, `VulnerabilitySpectrum`) gracefully render `UNTESTED` or `NO DATA` states.

### 2. Provider Adapter Architecture (FEAT-002 / FIX-003)
- **Unified `ProviderAdapter` ABC**: Extensible adapter interface with a shared execution template (`run()`) and provider-specific completion methods (`_complete()`).
- **Supported Providers**:
  - **OpenAI**: `chat/completions` (`gpt-4o`, `gpt-4o-mini`, `gpt-3.5-turbo`)
  - **Anthropic**: `v1/messages` (`claude-3-5-sonnet`, `claude-3-5-haiku`)
  - **Google Gemini**: `v1beta/models/{model}:generateContent` (`gemini-1.5-flash`, `gemini-1.5-pro`, `gemini-2.0-flash`)
  - **Groq**: OpenAI-compatible chat API (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`)
- **Prefix-Based Router**: Automatic model-to-provider resolution (`gpt-*`, `claude-*`, `gemini-*`, `llama-*`).
- **Strict Security Guarantees**:
  - API keys are read securely from server environment variables and never exposed to the client.
  - Request headers and authorization tokens are never logged.
  - Upstream error payloads and raw response bodies are sanitized (HTTP status code or exception type only).
  - If an API key is missing or unconfigured, the adapter returns `status="unavailable"` without silent fallback to simulation.

### 3. Execution Mode Tagging & Badging (FEAT-003)
- **Row-Level Provenance**: Every prompt result record stores an `execution_mode`:
  - `REAL_API`: Real LLM API response (UI label: **LIVE MODEL**).
  - `LOCAL_SIMULATION`: Calibrated local simulation (UI label: **SIMULATED**).
  - `MIXED`: Derived when an experiment contains multiple data sources (UI label: **MIXED SOURCES**).
  - Empty / Legacy: UI label **MODE UNKNOWN**.
- **`ExecutionModeBadge`**: Compact lab badge rendered across specimen slide modals, organism hover cards, and evolution chamber footers.

### 4. Calibrated Judge & Mutation Mapping (REM-001 / REM-003)
- **Deterministic Scoring**: Removed modulo response-length noise terms in `LLMJudge` to provide deterministic, calibrated risk scores $(0.00 - 1.00)$ and rationales.
- **Accurate Mutation Mapping**: Resolved technique mapping in `_mutate_prompt` so `technique_used` accurately reflects the applied mutation template.

### 5. Executive Audit Report & Data Integrity (FEAT-004 / REM-002)
- **OWASP & MITRE ATLAS Mapping**: Discovered vulnerabilities are mapped to OWASP Top 10 for LLMs and MITRE ATLAS matrices.
- **Dynamic Attestation**: Ground truth adherence is dynamically derived from recorded execution modes.
- **SHA-256 Fingerprint**: Real cryptographic digest computed for reproducible audit trails.

---

## Quickstart Guide

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
# source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env  # Optional: configure API keys

# Run tests
python -m pytest -q

# Start backend server (port 8000)
python run.py
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run build   # Production bundle verification
npm run dev     # Development server (port 5173)
```

---

## Environment Variables Reference

| Variable | Description | Default |
|---|---|---|
| `JWT_SECRET_KEY` | Secret key for JWT session tokens | `dev_secret_key...` |
| `OPENAI_API_KEY` | OpenAI API Secret Key | `None` |
| `ANTHROPIC_API_KEY` | Anthropic Claude API Key | `None` |
| `GEMINI_API_KEY` | Google Gemini API Key | `None` |
| `GROQ_API_KEY` | Groq Cloud API Key | `None` |
| `OPENAI_MODEL` | Default model ID for OpenAI | `gpt-4o-mini` |
| `ANTHROPIC_MODEL` | Default model ID for Anthropic | `claude-3-5-haiku-20241022` |
| `GEMINI_MODEL` | Default model ID for Gemini | `gemini-1.5-flash` |
| `GROQ_MODEL` | Default model ID for Groq | `llama-3.1-8b-instant` |

---

## License & Security Notes
EvoRedTeam is created for authorized AI safety research, boundary testing, and red-teaming simulations. All experiments and generated datasets remain sandboxed and under user control.
