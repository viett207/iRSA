"""Resume section parser — splits CV raw_text into semantic sections.

Detects common section headers in Vietnamese and English, then extracts
the text content between boundaries. Used by scoring.py to match skills
against the Skills section, experience against Experience section, etc.
"""

import re
from dataclasses import dataclass, field

# Section header keywords (Vietnamese + English).
# Longer phrases first so "kỹ năng chuyên môn" matches before "kỹ năng".
_SECTION_HEADERS: dict[str, list[str]] = {
    "skills": [
        "kỹ năng chuyên môn", "kỹ năng kỹ thuật", "kỹ năng mềm",
        "kỹ năng", "năng lực chuyên môn", "năng lực",
        "technical skills", "core competencies", "competencies",
        "key skills", "skills", "technologies",
    ],
    "experience": [
        "kinh nghiệm làm việc", "kinh nghiệm chuyên môn",
        "kinh nghiệm", "quá trình công tác", "lịch sử công tác",
        "work experience", "professional experience",
        "employment history", "experience",
    ],
    "education": [
        "trình độ học vấn", "quá trình đào tạo", "học vấn",
        "trình độ", "đào tạo",
        "academic background", "education", "qualifications",
    ],
}

# Leading bullets / numbering to strip before matching headers
_LEADING_NOISE = re.compile(r"^[\s\d.)\-•●▪▸►:IVXivx]+\s*")

# Confidence multiplier when matching against full-text fallback
FALLBACK_CONFIDENCE = 0.7


@dataclass
class ResumeSection:
    """A parsed section from a resume."""
    section_type: str   # "skills" | "experience" | "education" | "full_text"
    header: str         # Original header text detected (empty for full_text)
    text: str           # Section body content


@dataclass
class ParsedResume:
    """Result of parsing a resume into sections."""
    sections: dict[str, ResumeSection] = field(default_factory=dict)
    sections_found: list[str] = field(default_factory=list)
    full_text: str = ""

    def get_text(self, section_type: str) -> str | None:
        """Get text for a section, or None if not found."""
        s = self.sections.get(section_type)
        return s.text if s else None

    def get_header(self, section_type: str) -> str:
        """Get the detected header name for a section."""
        s = self.sections.get(section_type)
        return s.header if s else ""


def _match_header(line: str) -> tuple[str, str] | None:
    """Check if a line is a section header.

    Returns (section_type, original_header) or None.
    Lines over 60 chars are skipped (unlikely to be a header).
    """
    stripped = line.strip()
    if not stripped or len(stripped) > 60:
        return None

    # Remove leading numbers, bullets, roman numerals
    cleaned = _LEADING_NOISE.sub("", stripped).rstrip(":.-").strip()
    if not cleaned:
        return None

    cleaned_lower = cleaned.lower()

    for section_type, headers in _SECTION_HEADERS.items():
        for h in headers:
            if cleaned_lower == h or cleaned_lower.startswith(h + " "):
                return section_type, stripped

    return None


def parse_resume_sections(raw_text: str) -> ParsedResume:
    """Parse resume raw text into semantic sections.

    Scans line-by-line for known section headers, then splits the text
    at those boundaries. Returns a ParsedResume containing detected
    sections and the full text.
    """
    result = ParsedResume(full_text=raw_text)

    if not raw_text or not raw_text.strip():
        return result

    lines = raw_text.split("\n")

    # Find all section boundaries: (line_index, section_type, header_text)
    boundaries: list[tuple[int, str, str]] = []
    for i, line in enumerate(lines):
        match = _match_header(line)
        if match:
            section_type, header_text = match
            boundaries.append((i, section_type, header_text))

    # Extract text between boundaries
    for idx, (line_idx, section_type, header) in enumerate(boundaries):
        start = line_idx + 1
        end = boundaries[idx + 1][0] if idx + 1 < len(boundaries) else len(lines)
        section_text = "\n".join(lines[start:end]).strip()

        # Keep first occurrence of each section type
        if section_type not in result.sections and section_text:
            result.sections[section_type] = ResumeSection(
                section_type=section_type,
                header=header,
                text=section_text,
            )

    result.sections_found = list(result.sections.keys())
    return result
