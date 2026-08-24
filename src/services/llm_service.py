"""LLM Factory service for initializing Gemini & OpenAI models with key rotation."""

import asyncio
import os
import logging
from typing import Any, List
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

    def __init__(self, api_keys: List[str], model_name: str = "gemini-3.6-flash", temperature: float = 0.2):
        self.api_keys = [k.strip() for k in api_keys if k.strip()]
        self.model_name = model_name
        self.temperature = temperature
        self.current_index = 0
        self._llms = []

        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            for idx, key in enumerate(self.api_keys):
                self._llms.append(
                    ChatGoogleGenerativeAI(
                        model=self.model_name,
                        google_api_key=key,
                        temperature=self.temperature,
                        max_retries=1,
                    )
                )
        except Exception as e:
            logger.warning(f"Could not pre-initialize ChatGoogleGenerativeAI instances: {e}")

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

        for attempt in range(num_keys):
            idx = (start_idx + attempt) % num_keys
            try:
                if self._llms and idx < len(self._llms):
                    logger.info(f"Invoking Gemini LLM (async) using API Key #{idx + 1}/{num_keys}...")
                    res = await self._llms[idx].ainvoke(input, config=config, **kwargs)
                    self.current_index = idx
                    return res
                else:
                    import google.generativeai as genai
                    genai.configure(api_key=self.api_keys[idx])
                    model = genai.GenerativeModel(self.model_name)
                    logger.info(f"Invoking direct google.generativeai using API Key #{idx + 1}/{num_keys}...")
                    prompt = _format_input(input)
                    res = await asyncio.to_thread(model.generate_content, prompt)
                    text = res.text if hasattr(res, "text") else str(res)
                    self.current_index = idx
                    return LLMResponseWrapper(text)
            except Exception as e:
                last_exception = e
                err_str = str(e)
                logger.warning(
                    f"Gemini API Key #{idx + 1} failed on attempt {attempt + 1}/{num_keys}: {e}"
                )
                if "429" in err_str or "Quota exceeded" in err_str:
                    logger.info("429 Quota/RateLimit encountered. Waiting 3 seconds before key rotation/retry...")
                    await asyncio.sleep(3)
                self._rotate_key()

        logger.error("All Gemini API keys in rotation failed!")
        if last_exception:
            raise last_exception

    def invoke(self, input: Any, config: Any = None, **kwargs) -> Any:
        num_keys = len(self.api_keys)
        last_exception = None
        start_idx = self.current_index

        for attempt in range(num_keys):
            idx = (start_idx + attempt) % num_keys
            try:
                if self._llms and idx < len(self._llms):
                    logger.info(f"Invoking Gemini LLM (sync) using API Key #{idx + 1}/{num_keys}...")
                    res = self._llms[idx].invoke(input, config=config, **kwargs)
                    self.current_index = idx
                    return res
                else:
                    import google.generativeai as genai
                    genai.configure(api_key=self.api_keys[idx])
                    model = genai.GenerativeModel(self.model_name)
                    logger.info(f"Invoking direct google.generativeai (sync) using API Key #{idx + 1}/{num_keys}...")
                    prompt = _format_input(input)
                    res = model.generate_content(prompt)
                    text = res.text if hasattr(res, "text") else str(res)
                    self.current_index = idx
                    return LLMResponseWrapper(text)
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
        """Async fallback interface matching google.generativeai GenerativeModel."""
        import google.generativeai as genai

        num_keys = len(self.api_keys)
        last_exception = None
        start_idx = self.current_index

        for attempt in range(num_keys):
            idx = (start_idx + attempt) % num_keys
            try:
                genai.configure(api_key=self.api_keys[idx])
                model = genai.GenerativeModel(self.model_name)
                logger.info(f"Generating content (async) with google.generativeai using API Key #{idx + 1}/{num_keys}...")
                if hasattr(model, "generate_content_async"):
                    res = await model.generate_content_async(prompt, **kwargs)
                else:
                    res = await asyncio.to_thread(model.generate_content, prompt, **kwargs)
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
        """Fallback interface matching google.generativeai GenerativeModel."""
        import google.generativeai as genai

        num_keys = len(self.api_keys)
        last_exception = None
        start_idx = self.current_index

        for attempt in range(num_keys):
            idx = (start_idx + attempt) % num_keys
            try:
                genai.configure(api_key=self.api_keys[idx])
                model = genai.GenerativeModel(self.model_name)
                logger.info(f"Generating content with google.generativeai using API Key #{idx + 1}/{num_keys}...")
                res = model.generate_content(prompt, **kwargs)
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


def get_agent_llm(temperature: float | None = None) -> Any:
    """Initialize LLM (Gemini with key rotation or OpenAI) for AI Agent."""
    settings = get_settings()
    temp = temperature if temperature is not None else settings.llm_temperature
    gemini_keys = settings.parsed_gemini_api_keys
    openai_key = settings.openai_api_key or os.environ.get("OPENAI_API_KEY", "")

    # 1. Try Gemini with Key Rotation if keys are present
    if gemini_keys:
        model_name = settings.model_name or "gemini-1.5-flash"
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
