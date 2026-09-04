"""Extract plain text from PDF and DOCX files.

Uses PyMuPDF (fitz) for PDF and python-docx for DOCX.
Both handle UTF-8 natively, supporting Vietnamese diacritics.
"""

import logging
from io import BytesIO

logger = logging.getLogger(__name__)


def extract_text(file_bytes: bytes, content_type: str) -> str | None:
    """Extract plain text from a file based on its content type.

    Returns extracted text or None if extraction fails.
    Never raises — logs errors and returns None so the upload
    flow is not blocked by extraction failures.
    """
    try:
        if content_type == "application/pdf":
            return _extract_from_pdf(file_bytes)
        elif content_type == (
            "application/vnd.openxmlformats-officedocument"
            ".wordprocessingml.document"
        ):
            return _extract_from_docx(file_bytes)
        else:
            logger.warning("Unsupported content type for text extraction: %s", content_type)
            return None
    except Exception:
        logger.exception("Text extraction failed")
        return None


def _extract_from_pdf(file_bytes: bytes) -> str | None:
    """Extract text from PDF using PyMuPDF.

    PyMuPDF reads the PDF's internal text layer which preserves
    Unicode/UTF-8 encoding — Vietnamese diacritics work out of the box.
    """
    # These libraries are sizeable native dependencies. Import them only for
    # upload/parser requests so normal API startup and list endpoints stay fast.
    import pymupdf

    doc = pymupdf.open(stream=file_bytes, filetype="pdf")
    try:
        pages = []
        for page in doc:
            text = page.get_text("text")
            if text:
                pages.append(text)
        combined = "\n".join(pages).strip()
        return combined or None
    finally:
        doc.close()


def _extract_from_docx(file_bytes: bytes) -> str | None:
    """Extract text from DOCX using python-docx.

    python-docx reads the XML inside the .docx zip, which is
    always UTF-8. Vietnamese text is preserved as-is.
    """
    from docx import Document

    doc = Document(BytesIO(file_bytes))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    combined = "\n".join(paragraphs).strip()
    return combined or None
