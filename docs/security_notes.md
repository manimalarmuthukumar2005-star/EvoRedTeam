# EvoRedTeam Security & Hardening Notes

## 1. Zero Credential Exposure
- API Keys (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`) reside exclusively in server-side environment variables and are never transmitted to the browser client.
- The `/api/models` endpoint exposes only sanitized public model identifiers (`id`, `name`, `provider`) without credentials.

## 2. ZIP Upload Security (Anti-Zip Slip & Bomb Protection)
- **Path Traversal Protection**: Archive member paths are normalized using `os.path.normpath` and rejected if they contain `..` or leading `/` or absolute Windows drive paths.
- **Decompression Bomb Guard**: Total uncompressed extraction volume is capped at 50MB.
- **Schema Validation**: Extracted experiments must pass `LineageTreeValidator` and `DataContractValidator` before entering the active experiment catalog.

## 3. Sandboxed Execution & Input Sanitization
- Prompt strings are treated as data payloads and never passed into `eval()` or executed as shell commands.
- Robust HTTP timeouts (25–30s) prevent stalled connections or unbounded resource starvation.
- File operations are confined to the designated `data/` directory.
