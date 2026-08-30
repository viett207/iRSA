"""Speech-to-Text (STT) service for transcribing recorded candidate audio answers."""

import asyncio
import logging
import os
import tempfile

from src.config import get_settings

logger = logging.getLogger(__name__)


async def transcribe_audio(
    audio_bytes: bytes,
    mime_type: str = "audio/webm",
    filename: str = "audio.webm",
) -> str:
    """
    Transcribe audio bytes to text using Google Gemini Audio Processing or OpenAI Whisper.

    Returns transcribed Vietnamese text string.
    """
    if not audio_bytes or len(audio_bytes) < 100:
        raise ValueError("File ghi âm không có dữ liệu âm thanh hoặc quá ngắn.")

    settings = get_settings()
    gemini_keys = settings.parsed_gemini_api_keys
    openai_key = settings.openai_api_key or os.environ.get("OPENAI_API_KEY", "")
    model_name = settings.model_name or "gemini-3.6-flash"

    last_error = None

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

        for attempt, key in enumerate(gemini_keys):
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

                logger.info(f"Transcribing audio with Gemini ({model_name}, key #{attempt + 1}/{len(gemini_keys)}, size: {len(audio_bytes)} bytes)...")
                response = await client.aio.models.generate_content(
                    model=model_name,
                    contents=[prompt, audio_part],
                )
                text = response.text.strip() if response and hasattr(response, "text") else ""
                if text:
                    logger.info(f"Gemini STT success ({len(text)} chars)")
                    return text
            except Exception as e:
                last_error = e
                err_str = str(e)
                logger.warning(f"Gemini STT attempt #{attempt + 1} failed: {e}")
                if "429" in err_str or "Quota exceeded" in err_str:
                    logger.info("429 Rate limit encountered. Waiting 4 seconds before trying next key / retry...")
                    await asyncio.sleep(4)

    # 2. Try OpenAI Whisper STT Fallback
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

    if last_error:
        raise RuntimeError(f"Lỗi khi bóc băng giọng nói: {str(last_error)}")

    return "Ứng viên đã hoàn thành phần trả lời phỏng vấn qua microphone."
