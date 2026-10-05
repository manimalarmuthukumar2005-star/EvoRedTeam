import time
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import httpx
from ..config import (
    OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, GROQ_API_KEY,
    OPENAI_MODEL, ANTHROPIC_MODEL, GEMINI_MODEL, GROQ_MODEL
)

logger = logging.getLogger(__name__)

class ProviderAdapter(ABC):
    def __init__(self, model_id: str):
        self.model_id = model_id
        self.mode = "REAL_API"

    @abstractmethod
    def _has_key(self) -> bool:
        """Returns True if the required API key is configured."""
        pass

    @abstractmethod
    async def _complete(self, prompt: str, system_patch: Optional[str] = None) -> str:
        """Performs the provider-specific HTTP completion call."""
        pass

    async def run(self, prompt: str, system_patch: Optional[str] = None) -> Dict[str, Any]:
        """
        Shared execution wrapper with uniform error handling, latency measurement,
        and strict security guarantees (no echoing of upstream bodies, no key leakage).
        """
        start_time = time.time()

        if not self._has_key():
            return {
                "model_tested": self.model_id,
                "response_text": f"Provider API key not configured for model '{self.model_id}'.",
                "latency_ms": 0,
                "status": "unavailable",
                "execution_mode": self.mode
            }

        try:
            response_text = await self._complete(prompt, system_patch)
            latency = round((time.time() - start_time) * 1000, 2)
            return {
                "model_tested": self.model_id,
                "response_text": response_text,
                "latency_ms": latency,
                "status": "success",
                "execution_mode": self.mode
            }
        except httpx.HTTPStatusError as e:
            latency = round((time.time() - start_time) * 1000, 2)
            logger.error("Provider HTTP error: status_code=%s", e.response.status_code)
            return {
                "model_tested": self.model_id,
                "response_text": f"HTTP {e.response.status_code}",
                "latency_ms": latency,
                "status": "error",
                "execution_mode": self.mode
            }
        except Exception as e:
            latency = round((time.time() - start_time) * 1000, 2)
            logger.error("Provider request error: %s", type(e).__name__)
            return {
                "model_tested": self.model_id,
                "response_text": f"Error: {type(e).__name__}",
                "latency_ms": latency,
                "status": "error",
                "execution_mode": self.mode
            }


class OpenAIProvider(ProviderAdapter):
    def _has_key(self) -> bool:
        return bool(OPENAI_API_KEY)

    async def _complete(self, prompt: str, system_patch: Optional[str] = None) -> str:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        system_content = system_patch if system_patch else "You are a helpful and safe AI assistant."
        messages = [
            {"role": "system", "content": system_content},
            {"role": "user", "content": prompt}
        ]
        payload = {
            "model": self.model_id,
            "messages": messages,
            "temperature": 0.7
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(url, headers=headers, json=payload)
            res.raise_for_status()
            data = res.json()
            return data["choices"][0]["message"]["content"]


class GroqProvider(ProviderAdapter):
    def _has_key(self) -> bool:
        return bool(GROQ_API_KEY)

    async def _complete(self, prompt: str, system_patch: Optional[str] = None) -> str:
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        system_content = system_patch if system_patch else "You are a helpful and safe AI assistant."
        messages = [
            {"role": "system", "content": system_content},
            {"role": "user", "content": prompt}
        ]
        payload = {
            "model": self.model_id,
            "messages": messages,
            "temperature": 0.7
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(url, headers=headers, json=payload)
            res.raise_for_status()
            data = res.json()
            return data["choices"][0]["message"]["content"]


class AnthropicProvider(ProviderAdapter):
    def _has_key(self) -> bool:
        return bool(ANTHROPIC_API_KEY)

    async def _complete(self, prompt: str, system_patch: Optional[str] = None) -> str:
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        payload: Dict[str, Any] = {
            "model": self.model_id,
            "max_tokens": 1024,
            "messages": [
                {"role": "user", "content": prompt}
            ]
        }
        if system_patch:
            payload["system"] = system_patch

        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(url, headers=headers, json=payload)
            res.raise_for_status()
            data = res.json()
            parts = [c.get("text", "") for c in data.get("content", []) if c.get("type") == "text"]
            return "\n".join(parts)


class GeminiProvider(ProviderAdapter):
    def _has_key(self) -> bool:
        return bool(GEMINI_API_KEY)

    async def _complete(self, prompt: str, system_patch: Optional[str] = None) -> str:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_id}:generateContent"
        headers = {
            "x-goog-api-key": GEMINI_API_KEY,
            "Content-Type": "application/json"
        }
        contents = [
            {
                "role": "user",
                "parts": [{"text": prompt}]
            }
        ]
        payload: Dict[str, Any] = {
            "contents": contents
        }
        if system_patch:
            payload["systemInstruction"] = {
                "parts": [{"text": system_patch}]
            }

        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(url, headers=headers, json=payload)
            res.raise_for_status()
            data = res.json()
            candidates = data.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                return "".join(p.get("text", "") for p in parts)
            return ""


def provider_for_model(model_id: str) -> Optional[ProviderAdapter]:
    """
    Routes a given model_id to its corresponding provider adapter based on prefix conventions.
    Returns None for local engine models (e.g. 'evo-guardrail-v1').
    """
    if not model_id:
        return None
    mid = model_id.lower()
    if mid.startswith("gpt-") or mid.startswith("o1-") or mid.startswith("o3-"):
        return OpenAIProvider(model_id)
    elif mid.startswith("claude-"):
        return AnthropicProvider(model_id)
    elif mid.startswith("gemini-"):
        return GeminiProvider(model_id)
    elif mid.startswith("llama-") or mid.startswith("mixtral-") or mid.startswith("gemma-"):
        return GroqProvider(model_id)
    return None
