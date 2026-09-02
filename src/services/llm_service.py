"""LLM Factory service for initializing Gemini & OpenAI models with key rotation."""

import logging
import os
from typing import Any

from src.config import get_settings

logger = logging.getLogger(__name__)


class LLMResponseWrapper:
    """Wrapper that exposes both .content and .text to maintain compatibility with LangChain and direct GenAI."""
    def __init__(self, text: str):
        self.text = text
        self.content = text

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


def get_agent_llm(temperature: float | None = None) -> Any:
    """Initialize LLM (Gemini with key rotation or OpenAI) for AI Agent."""
    settings = get_settings()
    temp = temperature if temperature is not None else settings.llm_temperature
    gemini_keys = settings.parsed_gemini_api_keys
    openai_key = settings.openai_api_key or os.environ.get("OPENAI_API_KEY", "")

    # 1. Try Gemini with Key Rotation if keys are present
    if gemini_keys:
        model_name = settings.model_name or "gemini-3.6-flash"
        logger.info(f"Initializing RotatingGeminiLLM with {len(gemini_keys)} API key(s) (model: {model_name})...")
        return RotatingGeminiLLM(api_keys=gemini_keys, model_name=model_name, temperature=temp)

    # 2. Try ChatOpenAI if OpenAI Key exists
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
