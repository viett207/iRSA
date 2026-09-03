"""LLM Factory service for initializing Gemini, Groq & OpenAI models with key rotation."""

import logging
import os
from typing import Any

from src.config import get_settings

logger = logging.getLogger(__name__)


import re


class LLMResponseWrapper:
    """Wrapper that exposes both .content and .text to maintain compatibility with LangChain and direct GenAI."""
    def __init__(self, text: str):
        cleaned = text
        if "<think>" in cleaned and "</think>" in cleaned:
            cleaned = re.sub(r"<think>.*?</think>", "", cleaned, flags=re.DOTALL).strip()
        self.text = cleaned
        self.content = cleaned
        self.raw_text = text

    def __str__(self):
        return self.text


def _format_input(input_val: Any) -> str:
    """Format diverse message formats (tuples, BaseMessage, dicts) into a unified string prompt."""
    if isinstance(input_val, str):
        return input_val
    if isinstance(input_val, list):
        parts = []
        for item in input_val:
            if isinstance(item, tuple) and len(item) == 2:
                role, text = item
                parts.append(f"{str(role).upper()}:\n{text}")
            elif hasattr(item, "content"):
                role = getattr(item, "type", "user")
                parts.append(f"{str(role).upper()}:\n{item.content}")
            else:
                parts.append(str(item))
        return "\n\n".join(parts)
    return str(input_val)


def _format_messages_for_chat(input_val: Any) -> list[dict[str, str]]:
    """Convert input into standard chat messages list [{'role': ..., 'content': ...}]."""
    if isinstance(input_val, str):
        return [{"role": "user", "content": input_val}]
    if isinstance(input_val, list):
        messages = []
        for item in input_val:
            if isinstance(item, tuple) and len(item) == 2:
                role, text = item
                r = str(role).lower()
                role_str = "user"
                if r in ("system",):
                    role_str = "system"
                elif r in ("assistant", "ai"):
                    role_str = "assistant"
                messages.append({"role": role_str, "content": str(text)})
            elif hasattr(item, "content"):
                msg_type = getattr(item, "type", "user").lower()
                role_str = "user"
                if msg_type in ("system",):
                    role_str = "system"
                elif msg_type in ("assistant", "ai"):
                    role_str = "assistant"
                messages.append({"role": role_str, "content": str(item.content)})
            elif isinstance(item, dict) and "role" in item and "content" in item:
                messages.append({"role": item["role"], "content": str(item["content"])})
            else:
                messages.append({"role": "user", "content": str(item)})
        return messages
    return [{"role": "user", "content": str(input_val)}]


class RotatingGeminiLLM:
    """LLM wrapper that automatically rotates through a list of Gemini API keys when quota/token limits or rate limits are reached."""

    def __init__(self, api_keys: list[str], model_name: str = "gemini-1.5-flash", temperature: float = 0.2):
        self.api_keys = [k.strip() for k in api_keys if k.strip()]
        self.model_name = model_name
        self.temperature = temperature
        self.current_index = 0
        self._clients = []

        try:
            from google import genai
            self._clients = [genai.Client(api_key=key) for key in self.api_keys]
        except Exception as e:
            logger.warning(f"Could not pre-initialize Google Gen AI clients: {e}")

    @property
    def current_key(self) -> str:
        if not self.api_keys:
            return ""
        return self.api_keys[self.current_index]

    def _rotate_key(self):
        if len(self.api_keys) > 1:
            old_idx = self.current_index
            self.current_index = (self.current_index + 1) % len(self.api_keys)
            logger.warning(
                f"Gemini API Key #{old_idx + 1} encountered rate limit / quota error. "
                f"Automatically rotating to Key #{self.current_index + 1}."
            )

    async def ainvoke(self, input: Any, config: Any = None, **kwargs) -> Any:
        num_keys = len(self.api_keys)
        last_exception = None
        start_idx = self.current_index
        candidate_models = [self.model_name]
        for fallback_m in ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash"]:
            if fallback_m not in candidate_models:
                candidate_models.append(fallback_m)

        for attempt in range(num_keys):
            idx = (start_idx + attempt) % num_keys
            client = self._client_for_index(idx)
            for model_name in candidate_models:
                try:
                    logger.info(
                        f"Invoking Gemini LLM (async) using API Key #{idx + 1}/{num_keys} "
                        f"(model: {model_name})..."
                    )
                    res = await client.aio.models.generate_content(
                        model=model_name,
                        contents=_format_input(input),
                        config={"temperature": self.temperature},
                    )
                    self.current_index = idx
                    return LLMResponseWrapper(res.text if hasattr(res, "text") else str(res))
                except Exception as e:
                    last_exception = e
                    err_str = str(e)
                    logger.warning(
                        f"Gemini API Key #{idx + 1} (model {model_name}) failed "
                        f"on attempt {attempt + 1}/{num_keys}: {e}"
                    )
                    if "404" in err_str or "not found" in err_str.lower():
                        continue
                    if "429" in err_str or "Quota exceeded" in err_str:
                        logger.info("429 Quota/RateLimit encountered; rotating to the next key.")
                    break
            self._rotate_key()

        logger.error("All Gemini API keys and candidate models in rotation failed!")
        if last_exception:
            raise last_exception

    def invoke(self, input: Any, config: Any = None, **kwargs) -> Any:
        num_keys = len(self.api_keys)
        last_exception = None
        start_idx = self.current_index

        for attempt in range(num_keys):
            idx = (start_idx + attempt) % num_keys
            try:
                client = self._client_for_index(idx)
                logger.info(
                    f"Invoking Gemini LLM (sync) using API Key #{idx + 1}/{num_keys} "
                    f"(model: {self.model_name})..."
                )
                res = client.models.generate_content(
                    model=self.model_name,
                    contents=_format_input(input),
                    config={"temperature": self.temperature},
                )
                self.current_index = idx
                return LLMResponseWrapper(res.text if hasattr(res, "text") else str(res))
            except Exception as e:
                last_exception = e
                logger.warning(
                    f"Gemini API Key #{idx + 1} failed on attempt {attempt + 1}/{num_keys}: {e}"
                )
                self._rotate_key()

        logger.error("All Gemini API keys in rotation failed!")
        if last_exception:
            raise last_exception

    async def generate_content_async(self, prompt: str, **kwargs) -> Any:
        """Async content-generation interface backed by the Google Gen AI SDK."""
        num_keys = len(self.api_keys)
        last_exception = None
        start_idx = self.current_index

        for attempt in range(num_keys):
            idx = (start_idx + attempt) % num_keys
            try:
                client = self._client_for_index(idx)
                logger.info(f"Generating content (async) with Google Gen AI using API Key #{idx + 1}/{num_keys}...")
                res = await client.aio.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config={"temperature": self.temperature},
                    **kwargs,
                )
                self.current_index = idx
                return res
            except Exception as e:
                last_exception = e
                logger.warning(
                    f"Gemini API Key #{idx + 1} failed on generate_content_async: {e}"
                )
                self._rotate_key()

        if last_exception:
            raise last_exception

    def generate_content(self, prompt: str, **kwargs) -> Any:
        """Synchronous content-generation interface backed by Google Gen AI."""
        num_keys = len(self.api_keys)
        last_exception = None
        start_idx = self.current_index

        for attempt in range(num_keys):
            idx = (start_idx + attempt) % num_keys
            try:
                client = self._client_for_index(idx)
                logger.info(f"Generating content with Google Gen AI using API Key #{idx + 1}/{num_keys}...")
                res = client.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config={"temperature": self.temperature},
                    **kwargs,
                )
                self.current_index = idx
                return res
            except Exception as e:
                last_exception = e
                logger.warning(
                    f"Gemini API Key #{idx + 1} failed on generate_content: {e}"
                )
                self._rotate_key()

        if last_exception:
            raise last_exception

    def _client_for_index(self, idx: int):
        if idx < len(self._clients):
            return self._clients[idx]
        from google import genai
        return genai.Client(api_key=self.api_keys[idx])


class RotatingGroqLLM:
    """LLM wrapper that automatically rotates through a list of Groq API keys when quota or rate limits are reached."""

    def __init__(
        self,
        api_keys: list[str],
        model_name: str = "llama-3.3-70b-versatile",
        temperature: float = 0.2,
    ):
        self.api_keys = [k.strip() for k in api_keys if k.strip()]
        # Default to llama-3.3-70b-versatile if model_name is empty or specifies a Gemini/OpenAI cloud model
        if not model_name or "gemini" in model_name.lower() or model_name.lower() in {"gpt-4", "gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"}:
            self.model_name = "llama-3.3-70b-versatile"
        else:
            self.model_name = model_name
        self.temperature = temperature
        self.current_index = 0
        self._async_clients = []
        self._sync_clients = []

        try:
            from groq import AsyncGroq, Groq
            self._async_clients = [AsyncGroq(api_key=k) for k in self.api_keys]
            self._sync_clients = [Groq(api_key=k) for k in self.api_keys]
        except Exception as e:
            logger.warning(f"Could not pre-initialize Groq clients: {e}")

    @property
    def current_key(self) -> str:
        if not self.api_keys:
            return ""
        return self.api_keys[self.current_index]

    def _rotate_key(self):
        if len(self.api_keys) > 1:
            old_idx = self.current_index
            self.current_index = (self.current_index + 1) % len(self.api_keys)
            logger.warning(
                f"Groq API Key #{old_idx + 1} encountered rate limit / error. "
                f"Automatically rotating to Key #{self.current_index + 1}."
            )

    def _async_client_for_index(self, idx: int):
        if idx < len(self._async_clients) and self._async_clients[idx] is not None:
            return self._async_clients[idx]
        try:
            from groq import AsyncGroq
            return AsyncGroq(api_key=self.api_keys[idx])
        except ImportError:
            from openai import AsyncOpenAI
            return AsyncOpenAI(api_key=self.api_keys[idx], base_url="https://api.groq.com/openai/v1")

    def _sync_client_for_index(self, idx: int):
        if idx < len(self._sync_clients) and self._sync_clients[idx] is not None:
            return self._sync_clients[idx]
        try:
            from groq import Groq
            return Groq(api_key=self.api_keys[idx])
        except ImportError:
            from openai import OpenAI
            return OpenAI(api_key=self.api_keys[idx], base_url="https://api.groq.com/openai/v1")

    async def ainvoke(self, input: Any, config: Any = None, **kwargs) -> Any:
        num_keys = len(self.api_keys)
        last_exception = None
        start_idx = self.current_index
        candidate_models = [self.model_name]
        for fallback_m in [
            "groq/compound",
            "qwen/qwen3.8-27b",
            "openai/gpt-oss-120b",
            "groq/compound-mini",
            "llama-3.3-70b-versatile",
            "llama-3.1-8b-instant",
            "mixtral-8x7b-32768",
        ]:
            if fallback_m not in candidate_models:
                candidate_models.append(fallback_m)

        formatted_messages = _format_messages_for_chat(input)

        for attempt in range(num_keys):
            idx = (start_idx + attempt) % num_keys
            client = self._async_client_for_index(idx)
            for model_name in candidate_models:
                try:
                    logger.info(
                        f"Invoking Groq LLM (async) using API Key #{idx + 1}/{num_keys} "
                        f"(model: {model_name})..."
                    )
                    res = await client.chat.completions.create(
                        model=model_name,
                        messages=formatted_messages,
                        temperature=self.temperature,
                    )
                    self.current_index = idx
                    text = res.choices[0].message.content or ""
                    return LLMResponseWrapper(text)
                except Exception as e:
                    last_exception = e
                    err_str = str(e)
                    logger.warning(
                        f"Groq API Key #{idx + 1} (model {model_name}) failed "
                        f"on attempt {attempt + 1}/{num_keys}: {e}"
                    )
                    if "404" in err_str or "not_found" in err_str.lower() or "model_decommissioned" in err_str.lower():
                        continue
                    if "429" in err_str or "rate_limit" in err_str.lower() or "quota" in err_str.lower():
                        logger.info("Groq 429 RateLimit encountered; rotating to the next key.")
                    break
            self._rotate_key()

        logger.error("All Groq API keys and candidate models in rotation failed!")
        if last_exception:
            raise last_exception

    def invoke(self, input: Any, config: Any = None, **kwargs) -> Any:
        num_keys = len(self.api_keys)
        last_exception = None
        start_idx = self.current_index
        candidate_models = [self.model_name]
        for fallback_m in [
            "groq/compound",
            "qwen/qwen3.8-27b",
            "openai/gpt-oss-120b",
            "groq/compound-mini",
            "llama-3.3-70b-versatile",
            "llama-3.1-8b-instant",
            "mixtral-8x7b-32768",
        ]:
            if fallback_m not in candidate_models:
                candidate_models.append(fallback_m)

        formatted_messages = _format_messages_for_chat(input)

        for attempt in range(num_keys):
            idx = (start_idx + attempt) % num_keys
            client = self._sync_client_for_index(idx)
            for model_name in candidate_models:
                try:
                    logger.info(
                        f"Invoking Groq LLM (sync) using API Key #{idx + 1}/{num_keys} "
                        f"(model: {model_name})..."
                    )
                    res = client.chat.completions.create(
                        model=model_name,
                        messages=formatted_messages,
                        temperature=self.temperature,
                    )
                    self.current_index = idx
                    text = res.choices[0].message.content or ""
                    return LLMResponseWrapper(text)
                except Exception as e:
                    last_exception = e
                    err_str = str(e)
                    logger.warning(
                        f"Groq API Key #{idx + 1} (model {model_name}) failed "
                        f"on attempt {attempt + 1}/{num_keys}: {e}"
                    )
                    if "404" in err_str or "not_found" in err_str.lower() or "model_decommissioned" in err_str.lower():
                        continue
                    if "429" in err_str or "rate_limit" in err_str.lower() or "quota" in err_str.lower():
                        logger.info("Groq 429 RateLimit encountered; rotating to the next key.")
                    break
            self._rotate_key()

        logger.error("All Groq API keys in rotation failed!")
        if last_exception:
            raise last_exception

    async def generate_content_async(self, prompt: str, **kwargs) -> Any:
        """Async content-generation interface compatible with Gemini-style callers."""
        return await self.ainvoke(prompt, **kwargs)

    def generate_content(self, prompt: str, **kwargs) -> Any:
        """Synchronous content-generation interface compatible with Gemini-style callers."""
        return self.invoke(prompt, **kwargs)


class FallbackCompositeLLM:
    """Combines a primary and fallback LLM (e.g. Gemini primary, Groq fallback).
    If the primary LLM fails with an exception, automatically falls back to the secondary LLM.
    """

    def __init__(self, primary: Any, fallback: Any, primary_name: str = "primary", fallback_name: str = "fallback"):
        self.primary = primary
        self.fallback = fallback
        self.primary_name = primary_name
        self.fallback_name = fallback_name

    async def ainvoke(self, input: Any, config: Any = None, **kwargs) -> Any:
        try:
            return await self.primary.ainvoke(input, config=config, **kwargs)
        except Exception as e:
            logger.warning(
                f"Primary LLM ({self.primary_name}) failed: {e}. "
                f"Automatically falling back to {self.fallback_name}..."
            )
            return await self.fallback.ainvoke(input, config=config, **kwargs)

    def invoke(self, input: Any, config: Any = None, **kwargs) -> Any:
        try:
            return self.primary.invoke(input, config=config, **kwargs)
        except Exception as e:
            logger.warning(
                f"Primary LLM ({self.primary_name}) failed: {e}. "
                f"Automatically falling back to {self.fallback_name}..."
            )
            return self.fallback.invoke(input, config=config, **kwargs)

    async def generate_content_async(self, prompt: str, **kwargs) -> Any:
        try:
            if hasattr(self.primary, "generate_content_async"):
                return await self.primary.generate_content_async(prompt, **kwargs)
            return await self.primary.ainvoke(prompt, **kwargs)
        except Exception as e:
            logger.warning(
                f"Primary LLM ({self.primary_name}) failed in generate_content_async: {e}. "
                f"Automatically falling back to {self.fallback_name}..."
            )
            if hasattr(self.fallback, "generate_content_async"):
                return await self.fallback.generate_content_async(prompt, **kwargs)
            return await self.fallback.ainvoke(prompt, **kwargs)

    def generate_content(self, prompt: str, **kwargs) -> Any:
        try:
            if hasattr(self.primary, "generate_content"):
                return self.primary.generate_content(prompt, **kwargs)
            return self.primary.invoke(prompt, **kwargs)
        except Exception as e:
            logger.warning(
                f"Primary LLM ({self.primary_name}) failed in generate_content: {e}. "
                f"Automatically falling back to {self.fallback_name}..."
            )
            if hasattr(self.fallback, "generate_content"):
                return self.fallback.generate_content(prompt, **kwargs)
            return self.fallback.invoke(prompt, **kwargs)


def get_agent_llm(temperature: float | None = None) -> Any:
    """Initialize LLM (Groq / Gemini with key rotation, or OpenAI) for AI Agent."""
    settings = get_settings()
    temp = temperature if temperature is not None else settings.llm_temperature
    gemini_keys = settings.parsed_gemini_api_keys
    groq_keys = settings.parsed_groq_api_keys
    openai_key = settings.openai_api_key or os.environ.get("OPENAI_API_KEY", "")
    provider = (settings.llm_provider or os.environ.get("LLM_PROVIDER", "")).strip().lower()

    # Determine Groq model name
    groq_model = settings.groq_model or "llama-3.3-70b-versatile"
    if settings.model_name and not any(k in settings.model_name.lower() for k in ["gemini", "gpt"]):
        groq_model = settings.model_name

    # Determine Gemini model name
    gemini_model = settings.model_name or "gemini-3.6-flash"
    if "gemini" not in gemini_model.lower():
        gemini_model = "gemini-1.5-flash"

    # 1. Explicit Provider Selection via LLM_PROVIDER
    if provider == "groq":
        if groq_keys:
            logger.info(f"Initializing RotatingGroqLLM with {len(groq_keys)} API key(s) (model: {groq_model})...")
            return RotatingGroqLLM(api_keys=groq_keys, model_name=groq_model, temperature=temp)
        logger.warning("LLM_PROVIDER='groq' requested but no GROQ_API_KEY(S) found, checking fallbacks.")

    elif provider == "gemini":
        if gemini_keys:
            logger.info(f"Initializing RotatingGeminiLLM with {len(gemini_keys)} API key(s) (model: {gemini_model})...")
            return RotatingGeminiLLM(api_keys=gemini_keys, model_name=gemini_model, temperature=temp)
        logger.warning("LLM_PROVIDER='gemini' requested but no GEMINI_API_KEY(S) found, checking fallbacks.")

    elif provider == "openai":
        if openai_key:
            try:
                from langchain_openai import ChatOpenAI
                logger.info(f"Initializing ChatOpenAI ({settings.model_name or 'gpt-4o-mini'})...")
                return ChatOpenAI(
                    model=settings.model_name or "gpt-4o-mini",
                    api_key=openai_key,
                    temperature=temp,
                )
            except Exception as e:
                logger.warning(f"Failed to load ChatOpenAI: {e}")
        logger.warning("LLM_PROVIDER='openai' requested but no OPENAI_API_KEY found, checking fallbacks.")

    # 2. Auto-Detection based on model_name
    model_lower = (settings.model_name or "").lower()
    if any(k in model_lower for k in ["llama", "mixtral", "gemma", "deepseek-r1-distill", "groq"]):
        if groq_keys:
            logger.info(f"Initializing RotatingGroqLLM from model_name='{settings.model_name}'...")
            return RotatingGroqLLM(api_keys=groq_keys, model_name=settings.model_name, temperature=temp)

    # 3. Both Gemini & Groq available -> Use FallbackCompositeLLM (Gemini primary -> Groq fallback)
    if gemini_keys and groq_keys:
        logger.info(
            f"Both Gemini ({len(gemini_keys)} keys) and Groq ({len(groq_keys)} keys) configured. "
            f"Enabling FallbackCompositeLLM (Gemini primary -> Groq fallback)."
        )
        gemini_llm = RotatingGeminiLLM(api_keys=gemini_keys, model_name=gemini_model, temperature=temp)
        groq_llm = RotatingGroqLLM(api_keys=groq_keys, model_name=groq_model, temperature=temp)
        return FallbackCompositeLLM(primary=gemini_llm, fallback=groq_llm, primary_name="Gemini", fallback_name="Groq")

    # 4. Only Groq keys available
    if groq_keys:
        logger.info(f"Initializing RotatingGroqLLM with {len(groq_keys)} API key(s) (model: {groq_model})...")
        return RotatingGroqLLM(api_keys=groq_keys, model_name=groq_model, temperature=temp)

    # 5. Only Gemini keys available
    if gemini_keys:
        logger.info(f"Initializing RotatingGeminiLLM with {len(gemini_keys)} API key(s) (model: {gemini_model})...")
        return RotatingGeminiLLM(api_keys=gemini_keys, model_name=gemini_model, temperature=temp)

    # 6. OpenAI fallback
    if openai_key:
        try:
            from langchain_openai import ChatOpenAI
            logger.info("Initializing ChatOpenAI (gpt-4o-mini)...")
            return ChatOpenAI(
                model=settings.model_name or "gpt-4o-mini",
                api_key=openai_key,
                temperature=temp,
            )
        except Exception as e:
            logger.warning(f"Failed to load ChatOpenAI: {e}")

    logger.warning("No LLM API keys provided. Agent will operate in fallback mode.")
    return None

