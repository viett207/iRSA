"""Speech-to-Text (STT) service for transcribing recorded candidate audio answers."""

import asyncio
import logging
import os
import tempfile

from src.config import get_settings

logger = logging.getLogger(__name__)


class STTTemporarilyUnavailableError(RuntimeError):
    """Raised when every configured STT provider is temporarily unavailable."""


def _is_transient_provider_error(error: Exception) -> bool:
    message = str(error).lower()
    return any(marker in message for marker in (
        "429",
        "503",
        "quota exceeded",
        "resource_exhausted",
        "unavailable",
        "high demand",
        "rate limit",
        "temporarily",
        "timeout",
    ))


async def _transcribe_with_groq(
    audio_bytes: bytes,
    filename: str,
    groq_keys: list[str],
) -> Optional[str]:
    """Transcribe audio using Groq Whisper API (whisper-large-v3-turbo)."""
    ext = ".webm"
    if "." in filename:
        ext = "." + filename.rsplit(".", 1)[1].lower()

    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        for key_idx, key in enumerate(groq_keys):
            try:
                try:
                    from groq import Groq
                    client = Groq(api_key=key)
                except ImportError:
                    from openai import OpenAI
                    client = OpenAI(api_key=key, base_url="https://api.groq.com/openai/v1")

                logger.info(
                    "Transcribing audio with Groq Whisper (key #%s/%s)...",
                    key_idx + 1,
                    len(groq_keys),
                )
                with open(tmp_path, "rb") as f:
                    transcript_resp = client.audio.transcriptions.create(
                        model="whisper-large-v3-turbo",
                        file=f,
                        language="vi",
                    )
                text = transcript_resp.text.strip() if hasattr(transcript_resp, "text") else ""
                if text:
                    logger.info("Groq Whisper STT success (%s chars)", len(text))
                    return text
            except Exception as e:
                logger.warning("Groq Whisper key #%s failed: %s", key_idx + 1, e)
                continue
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
    return None


async def transcribe_audio(
    audio_bytes: bytes,
    mime_type: str = "audio/webm",
    filename: str = "audio.webm",
) -> str:
    """
    Transcribe audio bytes to text using Google Gemini, Groq Whisper, or OpenAI Whisper.

    Returns transcribed Vietnamese text string.
    """
    if not audio_bytes or len(audio_bytes) < 100:
        raise ValueError("File ghi âm không có dữ liệu âm thanh hoặc quá ngắn.")

    settings = get_settings()
    gemini_keys = settings.parsed_gemini_api_keys
    groq_keys = settings.parsed_groq_api_keys
    openai_key = settings.openai_api_key or os.environ.get("OPENAI_API_KEY", "")
    provider = (settings.llm_provider or os.environ.get("LLM_PROVIDER", "")).strip().lower()
    model_name = settings.model_name or "gemini-3.6-flash"

    last_error = None

    # Priority 0: Explicit Groq Provider requested
    if provider == "groq" and groq_keys:
        groq_text = await _transcribe_with_groq(audio_bytes, filename, groq_keys)
        if groq_text:
            return groq_text

    # 1. Try Gemini Audio Transcription
    if gemini_keys:
        from google import genai
        from google.genai import types

        prompt = (
            "Bạn là chuyên gia bóc băng âm thanh phỏng vấn tuyển dụng tiếng Việt chuyên nghiệp. "
            "Hãy chuyển toàn bộ lời nói của ứng viên trong đoạn ghi âm sau thành văn bản chính xác từng từ. "
            "Quy tắc:\n"
            "1. Viết đúng chính tả tiếng Việt có dấu.\n"
            "2. Giữ nguyên các thuật ngữ kỹ thuật, công nghệ, ngôn ngữ lập trình bằng tiếng Anh (ví dụ: React, PostgreSQL, Docker, Microservices, CI/CD, OOP, REST API...).\n"
            "3. Không tự ý thêm bớt, không bình luận hay chào hỏi. Chỉ trả về duy nhất nội dung văn bản mà ứng viên đã nói."
        )

        for key_index, key in enumerate(gemini_keys):
            for retry_index in range(3):
                try:
                    client = genai.Client(api_key=key)

                    # Normalize mime type for Gemini
                    clean_mime = mime_type.split(";")[0].strip() if ";" in mime_type else mime_type.strip()
                    if "webm" in clean_mime:
                        clean_mime = "audio/webm"
                    elif "wav" in clean_mime:
                        clean_mime = "audio/wav"
                    elif "mp3" in clean_mime or "mpeg" in clean_mime:
                        clean_mime = "audio/mp3"
                    elif "ogg" in clean_mime:
                        clean_mime = "audio/ogg"
                    elif "m4a" in clean_mime or "mp4" in clean_mime:
                        clean_mime = "audio/mp4"

                    audio_part = types.Part.from_bytes(data=audio_bytes, mime_type=clean_mime)

                    logger.info(
                        "Transcribing audio with Gemini (%s, key #%s/%s, try %s/3, size: %s bytes)...",
                        model_name,
                        key_index + 1,
                        len(gemini_keys),
                        retry_index + 1,
                        len(audio_bytes),
                    )
                    response = await client.aio.models.generate_content(
                        model=model_name,
                        contents=[prompt, audio_part],
                    )
                    text = response.text.strip() if response and hasattr(response, "text") else ""
                    if text:
                        logger.info("Gemini STT success (%s chars)", len(text))
                        return text
                except Exception as e:
                    last_error = e
                    transient = _is_transient_provider_error(e)
                    logger.warning(
                        "Gemini STT key #%s try #%s failed (transient=%s): %s",
                        key_index + 1,
                        retry_index + 1,
                        transient,
                        e,
                    )
                    if transient and retry_index < 2:
                        await asyncio.sleep(2 * (retry_index + 1))
                        continue
                    break

    # 2. Try Groq Whisper STT Fallback
    if groq_keys:
        groq_text = await _transcribe_with_groq(audio_bytes, filename, groq_keys)
        if groq_text:
            return groq_text

    # 3. Try OpenAI Whisper STT Fallback
    if openai_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=openai_key)

            ext = ".webm"
            if "." in filename:
                ext = "." + filename.rsplit(".", 1)[1].lower()

            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
                tmp.write(audio_bytes)
                tmp_path = tmp.name

            try:
                with open(tmp_path, "rb") as f:
                    transcript_resp = client.audio.transcriptions.create(
                        model="whisper-1",
                        file=f,
                        language="vi",
                    )
                text = transcript_resp.text.strip() if hasattr(transcript_resp, "text") else ""
                if text:
                    logger.info(f"OpenAI Whisper STT success ({len(text)} chars)")
                    return text
            finally:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
        except Exception as e:
            last_error = e
            logger.error(f"OpenAI Whisper STT failed: {e}")

    if last_error and _is_transient_provider_error(last_error):
        raise STTTemporarilyUnavailableError(
            "Dịch vụ nhận dạng giọng nói đang bận. Vui lòng thử lại sau ít phút."
        )

    if last_error:
        raise RuntimeError(f"Lỗi khi bóc băng giọng nói: {str(last_error)}")

    return "Ứng viên đã hoàn thành phần trả lời phỏng vấn qua microphone."
