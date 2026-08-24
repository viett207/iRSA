"""Deterministic rule-based SectionDetector for English and Vietnamese CVs.

Identifies standard CV sections, heading spans, and explainable confidence scores without using LLMs.
Distinguishes real section headings from normal conversational/descriptive sentences.
Provides transparent, signal-based confidence scoring with clear formula and tiers.
Allows runtime extension of aliases.
"""

import difflib
import re
import unicodedata
from typing import Any, Literal

from pydantic import BaseModel, Field

from src.models.evidence import CVSection


def strip_accents(text: str) -> str:
    """Strip Vietnamese diacritics and convert to lower ASCII string for accent-insensitive fuzzy matching."""
    if not text:
        return ""
    nfkd = unicodedata.normalize("NFKD", text)
    res = "".join(c for c in nfkd if unicodedata.category(c) != "Mn")
    return res.replace("đ", "d").replace("Đ", "D").lower().strip()


class HeadingSpan(BaseModel):
    """Exact character offset coordinates of a detected section heading in raw text."""
    char_start: int = Field(ge=0, description="Start offset in raw text")
    char_end: int = Field(gt=0, description="End offset in raw text")
    matched_text: str = Field(min_length=1, description="Original text of the heading line")


class SectionConfidenceBreakdown(BaseModel):
    """Explainable signal breakdown for section heading confidence.

    Confidence is computed deterministically as:
        Confidence = Clamp[0.0, 1.0]( BaseMatchScore + Sum(SignalWeights) )
    """
    base_match_score: float = Field(..., description="Base score from match type: exact, prefix, fuzzy, implicit, or none")
    match_type: Literal["exact", "prefix", "fuzzy", "implicit", "none"] = Field(..., description="Match category")
    matched_alias: str | None = Field(default=None, description="The alias string matched")
    similarity_ratio: float = Field(default=0.0, description="String similarity ratio [0.0, 1.0]")
    is_short_line: bool = Field(default=False, description="Line is concise (<= 25 chars or <= 4 words)")
    is_uppercase: bool = Field(default=False, description="Line is ALL CAPS")
    is_title_case: bool = Field(default=False, description="Line is Title Case / Capitalized")
    has_colon: bool = Field(default=False, description="Line ends with or has colon separator")
    has_heading_marker: bool = Field(default=False, description="Line has markdown/banner/bullet heading marker")
    is_standalone_line: bool = Field(default=False, description="Line is isolated without sentence punctuation/indicators")
    has_valid_qualifier: bool = Field(default=False, description="Valid qualifier attached to heading")
    has_sentence_penalty: bool = Field(default=False, description="Penalty if line contains descriptive prose/indicators")
    signal_weights: dict[str, float] = Field(default_factory=dict, description="Numerical contributions of each signal")
    raw_confidence: float = Field(..., description="Sum of base score + signal weights before clamping")
    final_confidence: float = Field(..., description="Clamped final confidence in [0.0, 1.0]")
    confidence_tier: Literal["high", "medium", "low", "none"] = Field(..., description="Confidence tier: high, medium, low, none")
    explanation: str = Field(..., description="Human-readable formula explanation")


class SectionDetectionResult(BaseModel):
    """Result of section heading classification."""
    section: CVSection = Field(default=CVSection.UNKNOWN, description="Identified section type")
    confidence: float = Field(default=0.0, ge=0.0, le=1.0, description="Classification confidence [0.0, 1.0]")
    heading_span: HeadingSpan | None = Field(default=None, description="Coordinates of heading if detected")
    matched_alias: str | None = Field(default=None, description="The alias string that triggered the match")
    is_heading: bool = Field(default=False, description="True if line was recognized as a section heading")
    confidence_breakdown: SectionConfidenceBreakdown | None = Field(
        default=None, description="Structured explainable breakdown of confidence score"
    )
    confidence_signals: dict[str, Any] | None = Field(
        default=None, description="Dictionary of signal weights and features for backward compatibility / serialization"
    )
    match_type: str | None = Field(default=None, description="Match mechanism: exact, prefix, fuzzy, implicit, none")


class DetectedSection(BaseModel):
    """A segmented region in a CV document with header and body spans."""
    section: CVSection
    confidence: float
    heading_span: HeadingSpan | None = None
    body_char_start: int
    body_char_end: int
    full_char_start: int
    full_char_end: int
    raw_heading: str | None = None
    confidence_breakdown: SectionConfidenceBreakdown | None = None
    confidence_signals: dict[str, Any] | None = None


def calculate_section_confidence(
    raw_line: str,
    norm_line: str,
    match_type: Literal["exact", "prefix", "fuzzy", "implicit", "none"],
    matched_alias: str | None = None,
    similarity_ratio: float = 1.0,
    has_valid_qualifier: bool = False,
    is_implicit_header: bool = False,
) -> SectionConfidenceBreakdown:
    """Calculate explainable confidence score and signal breakdown for a section heading candidate.

    Formula:
        Confidence = Clamp[0.0, 1.0]( BaseScore + Sum(SignalWeights) )

    Signals:
        - BaseScore:
            * exact match: +0.75
            * prefix match: +0.65
            * fuzzy match: +0.40 + (0.20 * similarity_ratio)
            * implicit pre-heading: +0.45
            * none: 0.00
        - is_uppercase (ALL CAPS): +0.10
        - is_title_case (Title Case / Capitalized words): +0.05
        - has_colon (ends with or contains ':'): +0.05
        - has_heading_marker (Markdown #, ---, ===, bullets, roman numerals): +0.05
        - is_short_line (<= 25 chars & <= 4 words: +0.05, <= 45 chars: +0.00, > 45 chars: -0.10)
        - is_standalone_line (clean line, no trailing sentence punctuation / conjunctions): +0.05
        - has_valid_qualifier (valid qualifier attached to prefix match): +0.05
        - has_sentence_penalty (contains sentence verbs/indicators): -0.25

    Confidence Tiers:
        - HIGH: confidence >= 0.85
        - MEDIUM: 0.60 <= confidence < 0.85
        - LOW: 0.0 < confidence < 0.60
        - NONE: confidence == 0.0
    """
    raw_stripped = raw_line.strip() if raw_line else ""

    if match_type == "none" or not raw_stripped:
        return SectionConfidenceBreakdown(
            base_match_score=0.0,
            match_type="none",
            matched_alias=None,
            similarity_ratio=0.0,
            is_short_line=False,
            is_uppercase=False,
            is_title_case=False,
            has_colon=False,
            has_heading_marker=False,
            is_standalone_line=False,
            has_sentence_penalty=False,
            signal_weights={},
            raw_confidence=0.0,
            final_confidence=0.0,
            confidence_tier="none",
            explanation="No heading match (confidence = 0.00)",
        )

    # 1. Base score from match type
    if match_type == "exact":
        base_score = 0.75
    elif match_type == "prefix":
        base_score = 0.65
    elif match_type == "fuzzy":
        sim = max(0.0, min(1.0, similarity_ratio))
        base_score = round(0.40 + 0.20 * sim, 4)
    elif match_type == "implicit":
        base_score = 0.45
    else:
        base_score = 0.0

    # 2. Extract signals from raw text and structure
    # Uppercase check: only alphabetic characters considered
    letters_only = [c for c in raw_stripped if c.isalpha()]
    is_uppercase = len(letters_only) > 0 and all(c.isupper() for c in letters_only)

    # Title case or Capitalized first word (common in Vietnamese headings)
    clean_words = [w for w in re.sub(r"[^\w\s]", "", raw_stripped).split() if any(c.isalpha() for c in w)]
    is_title_case = (
        not is_uppercase
        and len(clean_words) > 0
        and all(w[0].isupper() for w in clean_words)
    )
    is_capitalized = (
        not is_uppercase
        and not is_title_case
        and len(clean_words) > 0
        and clean_words[0][0].isupper()
    )

    # Colon indicator
    has_colon = ":" in raw_stripped

    # Heading marker indicator (Markdown #, dashes banner ---, numbered 1., bullet •)
    has_heading_marker = bool(
        re.search(r"^#{1,6}\s+", raw_stripped)
        or re.search(r"^[-=~_]{2,}|[-=~_]{2,}$", raw_stripped)
        or re.match(r"^(?:[ivxIVX]+\.|\d+\.|\([a-zA-Z\d]+\))\s+", raw_stripped)
        or re.match(r"^[•*+]\s+", raw_stripped)
    )

    # Short line check (filtering standalone non-alpha symbols for robust word count)
    alpha_words = [w for w in (norm_line or raw_stripped).split() if any(c.isalpha() for c in w)]
    line_len = len(norm_line) if norm_line else len(raw_stripped)
    if line_len <= 30 and len(alpha_words) <= 5:
        is_short_line = True
        short_line_val = 0.05
    elif line_len <= 50 and len(alpha_words) <= 8:
        is_short_line = False
        short_line_val = 0.00
    else:
        is_short_line = False
        short_line_val = -0.10

    # Standalone line check
    is_standalone_line = (
        not raw_stripped.endswith((".", "...", ";"))
        and len(alpha_words) <= 8
        and not is_implicit_header
    )

    # Sentence penalty check
    has_sentence_penalty = bool(
        raw_stripped.endswith((".", "...", ";")) and len(alpha_words) > 3
    )

    # 3. Assemble signal weights
    signal_weights: dict[str, float] = {}

    if is_uppercase:
        signal_weights["is_uppercase"] = 0.10
    elif is_title_case or is_capitalized:
        signal_weights["is_capitalized"] = 0.05

    if has_colon:
        signal_weights["has_colon"] = 0.05

    if has_heading_marker:
        signal_weights["has_heading_marker"] = 0.05

    if is_short_line:
        signal_weights["is_short_line"] = 0.05
    elif short_line_val < 0:
        signal_weights["long_line_penalty"] = short_line_val

    if is_standalone_line:
        signal_weights["is_standalone_line"] = 0.05

    if has_valid_qualifier:
        signal_weights["has_valid_qualifier"] = 0.10

    if has_sentence_penalty:
        signal_weights["has_sentence_penalty"] = -0.25

    # 4. Compute confidence & tier
    raw_confidence = round(base_score + sum(signal_weights.values()), 4)
    final_confidence = round(max(0.0, min(1.0, raw_confidence)), 4)

    if final_confidence >= 0.85:
        tier = "high"
    elif final_confidence >= 0.60:
        tier = "medium"
    elif final_confidence > 0.0:
        tier = "low"
    else:
        tier = "none"

    # 5. Build human-readable explanation
    signals_desc = " + ".join([f"{k}({v:+.2f})" for k, v in signal_weights.items()]) if signal_weights else "no modifier signals"
    explanation = (
        f"Base[{match_type}]={base_score:.2f} + Signals[{signals_desc}] -> "
        f"Raw={raw_confidence:.2f} -> Clamped={final_confidence:.2f} (Tier={tier})"
    )

    return SectionConfidenceBreakdown(
        base_match_score=base_score,
        match_type=match_type,
        matched_alias=matched_alias,
        similarity_ratio=round(similarity_ratio, 4),
        is_short_line=is_short_line,
        is_uppercase=is_uppercase,
        is_title_case=is_title_case or is_capitalized,
        has_colon=has_colon,
        has_heading_marker=has_heading_marker,
        is_standalone_line=is_standalone_line,
        has_valid_qualifier=has_valid_qualifier,
        has_sentence_penalty=has_sentence_penalty,
        signal_weights=signal_weights,
        raw_confidence=raw_confidence,
        final_confidence=final_confidence,
        confidence_tier=tier,
        explanation=explanation,
    )


class SectionDetector:
    """Deterministic section detector for CVs supporting Vietnamese & English headings."""

    # Default alias dictionary for standard sections (lowercase, stripped)
    DEFAULT_ALIASES: dict[CVSection, list[str]] = {
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
            "licenses & certifications",
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
        CVSection.PUBLICATIONS: [
            # English
            "publications", "research papers", "papers", "conference papers",
            "journal articles", "scientific publications", "patents",
            # Vietnamese
            "công bố khoa học", "bài báo khoa học", "nghiên cứu khoa học",
            "ấn phẩm", "bài báo", "công trình nghiên cứu", "sáng chế",
        ],
        CVSection.LANGUAGES: [
            # English
            "languages", "foreign languages", "language skills", "language proficiency",
            # Vietnamese
            "ngoại ngữ", "trình độ ngoại ngữ", "ngôn ngữ", "kỹ năng ngoại ngữ",
        ],
        CVSection.VOLUNTEERING: [
            # English
            "volunteering", "volunteer experience", "community service",
            "volunteer work", "social activities", "volunteering & leadership",
            # Vietnamese
            "hoạt động tình nguyện", "tình nguyện", "công tác xã hội",
            "hoạt động cộng đồng", "kinh nghiệm tình nguyện",
        ],
        CVSection.REFERENCES: [
            # English
            "references", "referees", "reference contacts", "professional references",
            # Vietnamese
            "người tham chiếu", "thông tin tham chiếu", "người giới thiệu",
            "tham chiếu", "thông tin người tham chiếu",
        ],
        CVSection.INTERESTS: [
            # English
            "interests", "hobbies", "personal interests", "activities & interests",
            # Vietnamese
            "sở thích", "sở thích cá nhân", "quan tâm",
        ],
        CVSection.ACTIVITIES: [
            # English
            "activities", "extracurricular activities", "leadership activities",
            "student activities", "club activities",
            # Vietnamese
            "hoạt động", "hoạt động ngoại khóa", "hoạt động đoàn thể",
            "hoạt động xã hội", "hoạt động câu lạc bộ", "hoạt động sinh viên",
        ],
    }


    # Common grammatical sentence indicators that identify descriptive text rather than a heading
    SENTENCE_INDICATORS: set[str] = {
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

    def __init__(self, custom_aliases: dict[CVSection, list[str]] | None = None):
        """Initialize SectionDetector with default and optional custom aliases."""
        self._aliases: dict[CVSection, set[str]] = {}
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

    def register_alias(self, section: CVSection, aliases: str | list[str]) -> None:
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
        char_end: int | None = None,
    ) -> SectionDetectionResult:
        """Analyze a single line of text to determine if it is a CV section heading.

        Calculates explainable confidence based on exact matches, qualifiers, formatting,
        and fuzzy similarity. Strictly rejects ordinary descriptive sentences.
        """
        if not line_text or not line_text.strip():
            breakdown = calculate_section_confidence("", "", match_type="none")
            return SectionDetectionResult(
                section=CVSection.UNKNOWN,
                confidence=0.0,
                is_heading=False,
                confidence_breakdown=breakdown,
                confidence_signals=breakdown.signal_weights,
                match_type="none",
            )

        cleaned_line = line_text.strip()
        if char_end is None:
            char_end = char_start + len(line_text)

        norm_line = self._normalize_text(cleaned_line)
        if not norm_line or len(norm_line) > 55:
            # Section headers are compact titles (rarely exceeding 55 chars)
            breakdown = calculate_section_confidence(cleaned_line, norm_line, match_type="none")
            return SectionDetectionResult(
                section=CVSection.UNKNOWN,
                confidence=0.0,
                is_heading=False,
                confidence_breakdown=breakdown,
                confidence_signals=breakdown.signal_weights,
                match_type="none",
            )

        words = norm_line.split()

        # Sentence Rejection: sentences ending in period/ellipsis with > 3 words are rejected
        if cleaned_line.endswith((".", "...", ";")) and len(words) > 3:
            breakdown = calculate_section_confidence(cleaned_line, norm_line, match_type="none")
            return SectionDetectionResult(
                section=CVSection.UNKNOWN,
                confidence=0.0,
                is_heading=False,
                confidence_breakdown=breakdown,
                confidence_signals=breakdown.signal_weights,
                match_type="none",
            )

        # 1. Exact Match against known aliases
        for section, alias_set in self._aliases.items():
            if norm_line in alias_set:
                breakdown = calculate_section_confidence(
                    raw_line=cleaned_line,
                    norm_line=norm_line,
                    match_type="exact",
                    matched_alias=norm_line,
                    similarity_ratio=1.0,
                )
                return SectionDetectionResult(
                    section=section,
                    confidence=breakdown.final_confidence,
                    heading_span=HeadingSpan(
                        char_start=char_start,
                        char_end=char_end,
                        matched_text=line_text,
                    ),
                    matched_alias=norm_line,
                    is_heading=True,
                    confidence_breakdown=breakdown,
                    confidence_signals=breakdown.signal_weights,
                    match_type="exact",
                )

        # 2. Prefix Match with Qualifier Validation
        for section, alias_set in self._aliases.items():
            for alias in sorted(alias_set, key=len, reverse=True):
                if norm_line.startswith(alias):
                    suffix = norm_line[len(alias):].strip()

                    # Empty suffix or simple punctuation separator
                    if not suffix or suffix in {":", "-", "–", "—", "|"}:
                        breakdown = calculate_section_confidence(
                            raw_line=cleaned_line,
                            norm_line=norm_line,
                            match_type="exact",
                            matched_alias=alias,
                            similarity_ratio=1.0,
                        )
                        return SectionDetectionResult(
                            section=section,
                            confidence=breakdown.final_confidence,
                            heading_span=HeadingSpan(
                                char_start=char_start,
                                char_end=char_end,
                                matched_text=line_text,
                            ),
                            matched_alias=alias,
                            is_heading=True,
                            confidence_breakdown=breakdown,
                            confidence_signals=breakdown.signal_weights,
                            match_type="prefix",
                        )

                    # Reject if suffix contains verbs or sentence indicators
                    suffix_words = suffix.split()
                    if any(w in self.SENTENCE_INDICATORS for w in suffix_words):
                        continue

                    # Reject if suffix is too long (> 5 words)
                    if len(suffix_words) > 5:
                        continue

                    # Allowable suffix patterns: date range, year count, or combined titles
                    is_valid_suffix = bool(
                        re.match(r"^[\(\[\{\s]*(?:19|20)\d{2}\s*[\-\–\—\tođến\s]*(?:(?:19|20)\d{2}|present|nay|hiện tại)?[\)\]\}\s\:]*$", suffix) or
                        re.match(r"^[\(\[\{\s]*\d+\s*(?:năm|years?|tháng|months?)\s*(?:kinh nghiệm|exp)?[\)\]\}\s\:]*$", suffix) or
                        re.match(r"^(?:&|và|\/|\+)\s*[\w\s]{2,35}[\:\s]*$", suffix) or
                        re.match(r"^(?:cá nhân|tiêu biểu|chuyên môn|nổi bật|chính|nghề nghiệp|bản thân|tổng quan|chi tiết|technical|personal|key|core|overview|details|background|history|summary|list)[\:\s]*$", suffix)
                    )

                    if is_valid_suffix:
                        breakdown = calculate_section_confidence(
                            raw_line=cleaned_line,
                            norm_line=norm_line,
                            match_type="prefix",
                            matched_alias=alias,
                            similarity_ratio=1.0,
                            has_valid_qualifier=True,
                        )
                        return SectionDetectionResult(
                            section=section,
                            confidence=breakdown.final_confidence,
                            heading_span=HeadingSpan(
                                char_start=char_start,
                                char_end=char_end,
                                matched_text=line_text,
                            ),
                            matched_alias=alias,
                            is_heading=True,
                            confidence_breakdown=breakdown,
                            confidence_signals=breakdown.signal_weights,
                            match_type="prefix",
                        )

        # 3. Fuzzy Match for minor typos / unaccented headings (compact candidate lines only)
        if len(norm_line) <= 45 and len(words) <= 5 and not any(w in self.SENTENCE_INDICATORS for w in words):
            best_match: tuple[CVSection, str, float] | None = None
            unaccented_norm = strip_accents(norm_line)

            for section, alias_set in self._aliases.items():
                for alias in alias_set:
                    unaccented_alias = strip_accents(alias)

                    # Unaccented exact equality (e.g. 'kinh nghiem lam viec' == 'kinh nghiem lam viec')
                    if unaccented_norm == unaccented_alias:
                        ratio = 0.95
                    else:
                        ratio1 = difflib.SequenceMatcher(None, norm_line, alias).ratio()
                        ratio2 = difflib.SequenceMatcher(None, unaccented_norm, unaccented_alias).ratio()
                        ratio = max(ratio1, ratio2)

                    if ratio >= 0.80:
                        if best_match is None or ratio > best_match[2] or (ratio == best_match[2] and len(alias) > len(best_match[1])):
                            best_match = (section, alias, ratio)

            if best_match is not None:
                matched_sec, matched_al, match_ratio = best_match
                breakdown = calculate_section_confidence(
                    raw_line=cleaned_line,
                    norm_line=norm_line,
                    match_type="fuzzy",
                    matched_alias=matched_al,
                    similarity_ratio=match_ratio,
                )
                return SectionDetectionResult(
                    section=matched_sec,
                    confidence=breakdown.final_confidence,
                    heading_span=HeadingSpan(
                        char_start=char_start,
                        char_end=char_end,
                        matched_text=line_text,
                    ),
                    matched_alias=matched_al,
                    is_heading=True,
                    confidence_breakdown=breakdown,
                    confidence_signals=breakdown.signal_weights,
                    match_type="fuzzy",
                )

        # 4. No heading matched
        breakdown = calculate_section_confidence(
            raw_line=cleaned_line,
            norm_line=norm_line,
            match_type="none",
        )
        return SectionDetectionResult(
            section=CVSection.UNKNOWN,
            confidence=0.0,
            is_heading=False,
            confidence_breakdown=breakdown,
            confidence_signals=breakdown.signal_weights,
            match_type="none",
        )

    def _detect_implicit_structural_sections(self, raw_text: str) -> list[DetectedSection]:
        """Detect implicit structured sections (e.g. Experience, Education) from structural signals

        when no explicit section headings exist in the document.

        Guarantees:
        - Pure conversational/narrative text without date ranges/company patterns is NEVER converted.
        - Only activates when clear entity patterns (Date range + Company/Role/Edu keywords) are detected.
        - Clamps confidence to 0.45 - 0.50 (low confidence tier) with explainable signals.
        """
        lines = list(re.finditer(r"[^\r\n]+", raw_text))
        if not lines:
            return []

        # Regex for date intervals: (MM/YYYY - MM/YYYY) or (YYYY - Present)
        date_pattern = re.compile(
            r"(?:\b|\()(?:\d{1,2}[/\-.])?(?:19|20)\d{2}\s*[-–—tođến]+\s*(?:(?:\d{1,2}[/\-.])?(?:19|20)\d{2}|hiện\s*tại|nay|present|current|now)(?:\b|\))",
            re.IGNORECASE,
        )

        company_pattern = re.compile(
            r"\b(?:công\s+ty|tập\s+đoàn|doanh\s+nghiệp|tnhh|jsc|corp|corporation|inc|ltd|limited|technologies|solutions|software|bank|ngân\s+hàng|studio|agency|lab|labs)\b",
            re.IGNORECASE,
        )

        role_pattern = re.compile(
            r"\b(?:developer|engineer|kỹ\s+sư|lập\s+trình\s+viên|chuyên\s+viên|trưởng\s+phòng|lead|architect|manager|intern|thực\s+tập\s+sinh|quản\s+trị|consultant|tester|qa|qc|devops|data\s+scientist|data\s+analyst)\b",
            re.IGNORECASE,
        )

        edu_pattern = re.compile(
            r"\b(?:đại\s+học|trường\s+đại\s+học|học\s+viện|cao\s+đẳng|university|college|academy|institute|bách\s+khoa|quốc\s+gia)\b",
            re.IGNORECASE,
        )

        candidate_blocks: list[tuple[int, CVSection, str]] = []

        idx = 0
        num_lines = len(lines)
        while idx < num_lines:
            m = lines[idx]
            lt = m.group(0).strip()
            if not lt or len(lt) < 4:
                idx += 1
                continue

            words = lt.split()
            if len(words) > 12 and any(lt.endswith(p) for p in (".", "...", ";")):
                idx += 1
                continue

            has_date = bool(date_pattern.search(lt))
            has_company = bool(company_pattern.search(lt))
            has_role = bool(role_pattern.search(lt))
            has_edu = bool(edu_pattern.search(lt))

            # Case A: Date + Education marker on same line
            if has_date and has_edu:
                candidate_blocks.append((m.start(), CVSection.EDUCATION, lt))
                idx += 1
                continue

            # Case B: Date + (Company or Role) marker on same line
            if has_date and (has_company or has_role):
                candidate_blocks.append((m.start(), CVSection.EXPERIENCE, lt))
                idx += 1
                continue

            # Case C: Two consecutive lines forming a block header (e.g. Line 1: Company/Edu, Line 2: Role + Date)
            if idx + 1 < num_lines:
                next_lt = lines[idx + 1].group(0).strip()
                next_has_date = bool(date_pattern.search(next_lt))
                if has_company and next_has_date:
                    candidate_blocks.append((m.start(), CVSection.EXPERIENCE, f"{lt} | {next_lt}"))
                    idx += 2
                    continue
                if has_edu and next_has_date:
                    candidate_blocks.append((m.start(), CVSection.EDUCATION, f"{lt} | {next_lt}"))
                    idx += 2
                    continue

            idx += 1

        if not candidate_blocks:
            return []

        # Deduplicate blocks that start at the same offset
        seen_starts = set()
        unique_blocks: list[tuple[int, CVSection, str]] = []
        for start_pos, sec_type, hint in candidate_blocks:
            if start_pos not in seen_starts:
                seen_starts.add(start_pos)
                unique_blocks.append((start_pos, sec_type, hint))

        unique_blocks.sort(key=lambda b: b[0])

        sections: list[DetectedSection] = []

        # Pre-block introductory text as SUMMARY
        first_start = unique_blocks[0][0]
        if first_start > 0 and raw_text[:first_start].strip():
            pre_breakdown = calculate_section_confidence(
                raw_line=raw_text[:first_start].strip().split("\n")[0][:40],
                norm_line="",
                match_type="implicit",
                is_implicit_header=True,
            )
            sections.append(
                DetectedSection(
                    section=CVSection.SUMMARY,
                    confidence=0.45,
                    heading_span=None,
                    body_char_start=0,
                    body_char_end=first_start,
                    full_char_start=0,
                    full_char_end=first_start,
                    raw_heading=None,
                    confidence_breakdown=pre_breakdown,
                    confidence_signals={"implicit_structural": True, "base_match_score": 0.45},
                )
            )

        for k, (b_start, b_sec, b_hint) in enumerate(unique_blocks):
            next_start = unique_blocks[k + 1][0] if k + 1 < len(unique_blocks) else len(raw_text)
            breakdown = calculate_section_confidence(
                raw_line=b_hint[:50],
                norm_line="",
                match_type="implicit",
                is_implicit_header=True,
            )
            sections.append(
                DetectedSection(
                    section=b_sec,
                    confidence=0.50,
                    heading_span=None,
                    body_char_start=b_start,
                    body_char_end=next_start,
                    full_char_start=b_start,
                    full_char_end=next_start,
                    raw_heading=None,
                    confidence_breakdown=breakdown,
                    confidence_signals={"implicit_structural": True, "detected_hint": b_hint[:60], "base_match_score": 0.50},
                )
            )

        return sections
    def detect_sections(self, raw_text: str) -> list[DetectedSection]:
        """Segment raw CV text into structured sections based on detected headings.

        Supports single-line headings, multi-line split headings, and implicit structural block fallback.
        """
        if not raw_text or not raw_text.strip():
            return []

        # 1. Scan lines for section headings with exact offsets (supporting multi-line heading merge)
        all_lines = list(re.finditer(r"[^\r\n]+", raw_text))
        line_matches: list[tuple[int, int, str, SectionDetectionResult]] = []
        i = 0
        num_lines = len(all_lines)

        while i < num_lines:
            m = all_lines[i]
            line_text = m.group(0)
            res = self.detect_heading(line_text, char_start=m.start(), char_end=m.end())

            # Check if line i and line i+1 can be merged into a multi-line heading
            if i + 1 < num_lines:
                m_next = all_lines[i + 1]
                next_text = m_next.group(0)
                l1_clean = line_text.strip()
                l2_clean = next_text.strip()

                if (
                    0 < len(l1_clean) <= 40
                    and 0 < len(l2_clean) <= 40
                    and len(l1_clean.split()) <= 4
                    and len(l2_clean.split()) <= 4
                    and not any(l1_clean.endswith(p) for p in (".", ";", "!"))
                    and not any(l2_clean.endswith(p) for p in (".", ";", "!"))
                ):
                    gap = raw_text[m.end():m_next.start()]
                    if len(gap) <= 4 and gap.strip() == "":
                        merged_raw = raw_text[m.start():m_next.end()]
                        merged_candidate = f"{l1_clean} {l2_clean}"
                        res_merged = self.detect_heading(
                            merged_candidate,
                            char_start=m.start(),
                            char_end=m_next.end(),
                        )
                        if res_merged.is_heading and res_merged.section != CVSection.UNKNOWN:
                            if not res.is_heading or res_merged.confidence >= res.confidence:
                                if res_merged.heading_span is not None:
                                    res_merged.heading_span.matched_text = merged_raw
                                line_matches.append((m.start(), m_next.end(), merged_raw, res_merged))
                                i += 2
                                continue

            if res.is_heading and res.section != CVSection.UNKNOWN:
                line_matches.append((m.start(), m.end(), line_text, res))

            i += 1

        if not line_matches:
            # Try implicit structural block detection for heading-less CVs
            implicit_secs = self._detect_implicit_structural_sections(raw_text)
            if implicit_secs:
                return implicit_secs

            # Fallback: single UNKNOWN section covering entire document
            none_breakdown = calculate_section_confidence(
                raw_line="",
                norm_line="",
                match_type="none",
            )
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
                    confidence_breakdown=none_breakdown,
                    confidence_signals=none_breakdown.signal_weights,
                )
            ]

        # 2. Create segmented regions between headings
        sections: list[DetectedSection] = []

        # If there is content before the first heading, treat as SUMMARY
        first_heading_start = line_matches[0][0]
        if first_heading_start > 0 and raw_text[:first_heading_start].strip():
            pre_slice = raw_text[:first_heading_start]
            pre_first_line = pre_slice.strip().split("\n")[0][:40]
            pre_breakdown = calculate_section_confidence(
                raw_line=pre_first_line,
                norm_line=self._normalize_text(pre_first_line),
                match_type="implicit",
                is_implicit_header=True,
            )
            sections.append(
                DetectedSection(
                    section=CVSection.SUMMARY,
                    confidence=pre_breakdown.final_confidence,
                    heading_span=None,
                    body_char_start=0,
                    body_char_end=first_heading_start,
                    full_char_start=0,
                    full_char_end=first_heading_start,
                    raw_heading=None,
                    confidence_breakdown=pre_breakdown,
                    confidence_signals=pre_breakdown.signal_weights,
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
                    confidence_breakdown=res.confidence_breakdown,
                    confidence_signals=res.confidence_signals,
                )
            )

        return sections
