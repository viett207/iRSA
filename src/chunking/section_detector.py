"""Deterministic rule-based SectionDetector for English and Vietnamese CVs.

Identifies standard CV sections, heading spans, and confidence scores without using LLMs.
Distinguishes real section headings from normal conversational/descriptive sentences.
Allows runtime extension of aliases.
"""

import re
import unicodedata
from typing import Dict, List, Optional, Tuple, Set, Union
from pydantic import BaseModel, Field

from src.models.evidence import CVSection


class HeadingSpan(BaseModel):
    """Exact character offset coordinates of a detected section heading in raw text."""
    char_start: int = Field(ge=0, description="Start offset in raw text")
    char_end: int = Field(gt=0, description="End offset in raw text")
    matched_text: str = Field(min_length=1, description="Original text of the heading line")


class SectionDetectionResult(BaseModel):
    """Result of section heading classification."""
    section: CVSection = Field(default=CVSection.UNKNOWN, description="Identified section type")
    confidence: float = Field(default=0.0, ge=0.0, le=1.0, description="Classification confidence [0.0, 1.0]")
    heading_span: Optional[HeadingSpan] = Field(default=None, description="Coordinates of heading if detected")
    matched_alias: Optional[str] = Field(default=None, description="The alias string that triggered the match")
    is_heading: bool = Field(default=False, description="True if line was recognized as a section heading")


class DetectedSection(BaseModel):
    """A segmented region in a CV document with header and body spans."""
    section: CVSection
    confidence: float
    heading_span: Optional[HeadingSpan] = None
    body_char_start: int
    body_char_end: int
    full_char_start: int
    full_char_end: int
    raw_heading: Optional[str] = None


class SectionDetector:
    """Deterministic section detector for CVs supporting Vietnamese & English headings."""

    # Default alias dictionary for standard sections (lowercase, stripped)
    DEFAULT_ALIASES: Dict[CVSection, List[str]] = {
        CVSection.SUMMARY: [
            # English
            "summary", "professional summary", "profile", "professional profile",
            "about me", "career objective", "objective", "executive summary",
            "personal summary", "overview", "introduction", "personal profile",
            "career summary", "bio", "biography",
            # Vietnamese
            "tóm tắt", "tóm tắt bản thân", "tóm tắt chuyên môn", "tóm tắt nghề nghiệp",
            "giới thiệu", "giới thiệu bản thân", "mục tiêu nghề nghiệp", "mục tiêu",
            "tổng quan", "thông tin tóm tắt", "sơ lược bản thân", "mục tiêu sự nghiệp",
            "thông tin chung", "về tôi", "tóm tắt cá nhân", "thông tin bản thân",
        ],
        CVSection.EXPERIENCE: [
            # English
            "experience", "work experience", "professional experience",
            "employment history", "work history", "career history",
            "working experience", "relevant experience", "employment",
            "career background", "professional background",
            # Vietnamese
            "kinh nghiệm làm việc", "quá trình công tác", "kinh nghiệm chuyên môn",
            "kinh nghiệm", "quá trình làm việc", "lịch sử làm việc",
            "kinh nghiệm nghề nghiệp", "kinh nghiệm thực tế", "hoạt động nghề nghiệp",
            "lịch sử công tác", "quá trình hoạt động", "kinh nghiệm dự án",
        ],
        CVSection.PROJECTS: [
            # English
            "projects", "personal projects", "key projects", "side projects",
            "academic projects", "highlighted projects", "portfolio projects",
            "featured projects", "notable projects", "technical projects",
            # Vietnamese
            "dự án tiêu biểu", "dự án", "dự án cá nhân", "các dự án",
            "dự án thực hiện", "dự án nổi bật", "dự án tham gia",
            "dự án chính", "sản phẩm cá nhân", "sản phẩm tiêu biểu",
        ],
        CVSection.SKILLS: [
            # English
            "skills", "technical skills", "core competencies", "competencies",
            "technologies", "skill set", "technical expertise", "skills & tools",
            "skills & abilities", "tools & technologies", "key skills",
            "professional skills", "programming languages", "tech stack",
            "expertise", "core skills", "hard skills", "soft skills",
            # Vietnamese
            "kỹ năng", "kỹ năng chuyên môn", "kỹ năng kỹ thuật", "kỹ năng nghề nghiệp",
            "kỹ năng chính", "công nghệ sử dụng", "chuyên môn", "sở trường",
            "công nghệ", "ngôn ngữ lập trình", "kỹ năng nổi bật",
        ],
        CVSection.EDUCATION: [
            # English
            "education", "educational background", "academic background",
            "qualifications", "academic qualifications", "degrees",
            "education & training", "academic history",
            # Vietnamese
            "học vấn", "trình độ học vấn", "quá trình học tập", "bằng cấp",
            "học vấn & đào tạo", "học vấn và bằng cấp", "đào tạo",
            "lịch sử học tập", "trình độ chuyên môn",
        ],
        CVSection.CERTIFICATIONS: [
            # English
            "certifications", "certificates", "licenses", "courses",
            "professional certifications", "accreditations",
            "training & certifications", "certifications & licenses",
            "certifications & qualifications",
            # Vietnamese
            "chứng chỉ", "chứng chỉ chuyên môn", "chứng nhận",
            "bằng cấp & chứng chỉ", "bằng cấp và chứng chỉ", "chứng chỉ nghề nghiệp",
            "khóa học & chứng chỉ", "chứng chỉ đào tạo",
        ],
        CVSection.AWARDS: [
            # English
            "awards", "honors", "achievements", "accomplishments",
            "awards & honors", "honors & awards", "recognition",
            "scholarships", "awards & achievements", "awards and honors",
            # Vietnamese
            "giải thưởng", "thành tích", "danh hiệu", "khen thưởng",
            "thành tựu", "học bổng & giải thưởng", "giải thưởng & thành tích",
            "thành tích nổi bật", "khen thưởng & thành tích", "khen thưởng & danh hiệu",
            "giải thưởng & danh hiệu",
        ],
    }

    # Common grammatical sentence indicators that identify descriptive text rather than a heading
    SENTENCE_INDICATORS: Set[str] = {
        # Vietnamese
        "là", "đã", "đang", "được", "giúp", "tại", "với", "cho", "của",
        "bao gồm", "phát triển", "xây dựng", "tốt nghiệp", "đạt", "tham gia",
        "nhằm", "chịu trách nhiệm", "thế mạnh", "cấp vào", "trang bị",
        "tăng trưởng", "phục vụ", "quản lý", "triển khai", "hướng dẫn",
        "trong", "sau khi", "từ", "đến", "năm 20", "năm 19",
        # English
        "was", "were", "is", "are", "has", "have", "with", "at", "for",
        "helped", "developed", "built", "responsible", "graduated",
        "achieved", "provided", "including", "served", "managed", "deployed",
    }

    def __init__(self, custom_aliases: Optional[Dict[CVSection, List[str]]] = None):
        """Initialize SectionDetector with default and optional custom aliases."""
        self._aliases: Dict[CVSection, Set[str]] = {}
        for section, alias_list in self.DEFAULT_ALIASES.items():
            self._aliases[section] = {self._normalize_text(a) for a in alias_list}

        if custom_aliases:
            for section, alias_list in custom_aliases.items():
                if section not in self._aliases:
                    self._aliases[section] = set()
                for a in alias_list:
                    self._aliases[section].add(self._normalize_text(a))

    @staticmethod
    def _normalize_text(text: str) -> str:
        """Normalize unicode, strip Markdown formatting, numbers, bullets, and colons."""
        if not text:
            return ""
        norm = unicodedata.normalize("NFC", text).lower().strip()
        # Remove enclosing decorative dashes/underscores/equals/asterisks (e.g. --- EDUCATION ---)
        norm = re.sub(r"^[\s\-\–\—\=\_\#\*\•]+", "", norm)
        norm = re.sub(r"[\s\-\–\—\=\_\#\*\•]+$", "", norm)
        # Remove roman numerals (e.g. 'i.', 'ii.', 'iv.') or single letter bullets ('a.', 'b.')
        norm = re.sub(r"^(?:[ivx]+\.|[a-z]\.)\s*", "", norm)
        # Remove bullet prefixes and digit numbering (-, *, +, •, 1., 2), etc.)
        norm = re.sub(r"^[-*+•–—\d\.\)\s]+", "", norm)
        # Remove trailing colons, dashes, and extra whitespace
        norm = re.sub(r"[\s\:\-\–\—\=\_]+$", "", norm)
        # Collapse multiple spaces
        norm = re.sub(r"\s+", " ", norm).strip()
        return norm

    def register_alias(self, section: CVSection, aliases: Union[str, List[str]]) -> None:
        """Register additional aliases dynamically for a section."""
        if isinstance(aliases, str):
            aliases = [aliases]
        if section not in self._aliases:
            self._aliases[section] = set()
        for alias in aliases:
            self._aliases[section].add(self._normalize_text(alias))

    def detect_heading(
        self,
        line_text: str,
        char_start: int = 0,
        char_end: Optional[int] = None,
    ) -> SectionDetectionResult:
        """Analyze a single line of text to determine if it is a CV section heading.

        Strictly rejects ordinary descriptive sentences or bullet points.
        """
        if not line_text or not line_text.strip():
            return SectionDetectionResult(section=CVSection.UNKNOWN, confidence=0.0)

        cleaned_line = line_text.strip()
        if char_end is None:
            char_end = char_start + len(line_text)

        norm_line = self._normalize_text(cleaned_line)
        if not norm_line or len(norm_line) > 55:
            # Section headers are compact titles (rarely exceeding 55 chars)
            return SectionDetectionResult(section=CVSection.UNKNOWN, confidence=0.0)

        words = norm_line.split()

        # 1. Exact Match against known aliases -> High Confidence (1.0)
        for section, alias_set in self._aliases.items():
            if norm_line in alias_set:
                return SectionDetectionResult(
                    section=section,
                    confidence=1.0,
                    heading_span=HeadingSpan(
                        char_start=char_start,
                        char_end=char_end,
                        matched_text=line_text,
                    ),
                    matched_alias=norm_line,
                    is_heading=True,
                )

        # 2. Prefix Match with Strict Sentence Rejection
        # Sentences ending in period/ellipsis with > 4 words are rejected
        if cleaned_line.endswith((".", "...", ";")) and len(words) > 3:
            return SectionDetectionResult(section=CVSection.UNKNOWN, confidence=0.0, is_heading=False)

        for section, alias_set in self._aliases.items():
            # Check longer aliases first
            for alias in sorted(alias_set, key=len, reverse=True):
                if norm_line.startswith(alias):
                    suffix = norm_line[len(alias):].strip()

                    # Suffix must be empty or a valid heading extension
                    if not suffix or suffix in {":", "-", "–", "—", "|"}:
                        return SectionDetectionResult(
                            section=section,
                            confidence=1.0,
                            heading_span=HeadingSpan(
                                char_start=char_start,
                                char_end=char_end,
                                matched_text=line_text,
                            ),
                            matched_alias=alias,
                            is_heading=True,
                        )

                    # Reject if suffix contains verbs or sentence indicators
                    suffix_words = suffix.split()
                    if any(w in self.SENTENCE_INDICATORS for w in suffix_words):
                        continue

                    # Reject if suffix is too long (> 4 words)
                    if len(suffix_words) > 4:
                        continue

                    # Allowable suffix patterns: date range, year count, or combined titles
                    is_valid_suffix = bool(
                        re.match(r"^[\(\[\{\s]*(?:19|20)\d{2}\s*[\-\–\—\tođến\s]*(?:(?:19|20)\d{2}|present|nay|hiện tại)?[\)\]\}\s\:]*$", suffix) or
                        re.match(r"^[\(\[\{\s]*\d+\s*(?:năm|years?|tháng|months?)\s*(?:kinh nghiệm|exp)?[\)\]\}\s\:]*$", suffix) or
                        re.match(r"^(?:&|và|\/|\+)\s*[\w\s]{2,20}[\:\s]*$", suffix) or
                        re.match(r"^(?:cá nhân|tiêu biểu|chuyên môn|nổi bật|chính|nghề nghiệp|bản thân|technical|personal|key|core)[\:\s]*$", suffix)
                    )

                    if is_valid_suffix:
                        return SectionDetectionResult(
                            section=section,
                            confidence=0.90,
                            heading_span=HeadingSpan(
                                char_start=char_start,
                                char_end=char_end,
                                matched_text=line_text,
                            ),
                            matched_alias=alias,
                            is_heading=True,
                        )

        return SectionDetectionResult(
            section=CVSection.UNKNOWN,
            confidence=0.0,
            is_heading=False,
        )

    def detect_sections(self, raw_text: str) -> List[DetectedSection]:
        """Segment raw CV text into structured sections based on detected headings."""
        if not raw_text or not raw_text.strip():
            return []

        # 1. Scan lines for section headings with exact offsets
        line_matches: List[Tuple[int, int, str, SectionDetectionResult]] = []

        for m in re.finditer(r"[^\r\n]+", raw_text):
            line_text = m.group(0)
            res = self.detect_heading(line_text, char_start=m.start(), char_end=m.end())
            if res.is_heading and res.section != CVSection.UNKNOWN:
                line_matches.append((m.start(), m.end(), line_text, res))

        if not line_matches:
            # Fallback: single UNKNOWN section covering entire document
            return [
                DetectedSection(
                    section=CVSection.UNKNOWN,
                    confidence=0.0,
                    heading_span=None,
                    body_char_start=0,
                    body_char_end=len(raw_text),
                    full_char_start=0,
                    full_char_end=len(raw_text),
                    raw_heading=None,
                )
            ]

        # 2. Create segmented regions between headings
        sections: List[DetectedSection] = []

        # If there is content before the first heading, treat as SUMMARY or UNKNOWN
        first_heading_start = line_matches[0][0]
        if first_heading_start > 0 and raw_text[:first_heading_start].strip():
            sections.append(
                DetectedSection(
                    section=CVSection.SUMMARY,
                    confidence=0.60,
                    heading_span=None,
                    body_char_start=0,
                    body_char_end=first_heading_start,
                    full_char_start=0,
                    full_char_end=first_heading_start,
                    raw_heading=None,
                )
            )

        for i, (h_start, h_end, h_text, res) in enumerate(line_matches):
            next_start = line_matches[i + 1][0] if i + 1 < len(line_matches) else len(raw_text)
            body_start = h_end

            sections.append(
                DetectedSection(
                    section=res.section,
                    confidence=res.confidence,
                    heading_span=res.heading_span,
                    body_char_start=body_start,
                    body_char_end=next_start,
                    full_char_start=h_start,
                    full_char_end=next_start,
                    raw_heading=h_text,
                )
            )

        return sections
