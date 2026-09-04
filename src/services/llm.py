from typing import Any

from src.config import get_settings


def get_llm() -> Any:
    settings = get_settings()
    provider = (settings.llm_provider or "").strip().lower()
    groq_keys = settings.parsed_groq_api_keys

    if provider == "groq" or (not settings.openai_api_key and groq_keys):
        from src.services.llm_service import RotatingGroqLLM
        return RotatingGroqLLM(
            api_keys=groq_keys,
            model_name=settings.groq_model,
            temperature=settings.llm_temperature,
        )

    from langchain_openai import ChatOpenAI
    return ChatOpenAI(
        model=settings.model_name or "gpt-4o-mini",
        api_key=settings.openai_api_key,
        temperature=settings.llm_temperature,
    )
