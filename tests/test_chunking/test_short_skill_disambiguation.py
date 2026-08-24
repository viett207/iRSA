"""Unit tests for the 4-Tier Short / Ambiguous Skill Disambiguation Engine.

Verifies that:
1. Compound patterns (Tier 1): "C/C++", "lập trình C", "R Studio", "Go developer" are matched
   with high confidence (0.95) regardless of section context.
2. Negative context (Tier 2): "Grade C", "Vitamin C", "ready to go", "Appendix R" are rejected.
3. Positive context (Tier 3): Nearby tech keywords ("programming", "kỹ năng", skill list separators)
   validate ambiguous matches with section-weighted confidence.
4. Section-weighted confidence (Tier 4): Ambiguous skills in SKILLS/EXPERIENCE sections are accepted
   at reduced confidence; those in UNKNOWN sections without context are rejected.
5. Non-ambiguous skills (Python, Docker, etc.) are unaffected by the disambiguation engine.
6. End-to-end integration with extract_and_bind_skills on realistic CV texts.
"""

import pytest

from src.chunking.skill_attachment import (
    AMBIGUOUS_SKILLS,
    CANONICAL_SKILL_MAP,
    COMPOUND_PATTERNS,
    SECTION_CONFIDENCE_WEIGHTS,
    TECH_CONTEXT_NEGATIVE_PATTERNS,
    TECH_CONTEXT_POSITIVE_SIGNALS,
    SkillBinder,
    _check_compound_patterns,
    _has_negative_context,
    _has_positive_context,
    _is_ambiguous_skill,
    _get_section_confidence_weight,
    extract_and_bind_skills,
)
from src.models.cv_fingerprint import SkillMention
from src.models.evidence import ChunkLevel, CVSection, EvidenceBlock


@pytest.fixture
def binder():
    return SkillBinder()


# ==============================================================================
# 0. PREREQUISITE: C, R ARE NOW IN CANONICAL_SKILL_MAP
# ==============================================================================

class TestCanonicalSkillMapExpansion:
    """Verify C, R, Swift, Kotlin, Scala are in CANONICAL_SKILL_MAP and categorized."""

    def test_c_in_map(self):
        assert CANONICAL_SKILL_MAP["c"] == "C"

    def test_r_in_map(self):
        assert CANONICAL_SKILL_MAP["r"] == "R"

    def test_go_in_map(self):
        assert CANONICAL_SKILL_MAP["go"] == "Golang"

    def test_c_plus_plus_still_works(self):
        assert CANONICAL_SKILL_MAP["c++"] == "C++"

    def test_c_sharp_still_works(self):
        assert CANONICAL_SKILL_MAP["c#"] == "C#"

    def test_ambiguous_skills_defined(self):
        assert "C" in AMBIGUOUS_SKILLS
        assert "R" in AMBIGUOUS_SKILLS
        assert "Golang" in AMBIGUOUS_SKILLS
        # Non-ambiguous skills should NOT be in the set
        assert "Python" not in AMBIGUOUS_SKILLS
        assert "Docker" not in AMBIGUOUS_SKILLS


# ==============================================================================
# 1. TIER 1: COMPOUND PATTERN DETECTION
# ==============================================================================

class TestTier1CompoundPatterns:
    """Verify compound patterns detect high-confidence contextual matches."""

    @pytest.mark.parametrize("text,expected_skill", [
        ("Kinh nghiệm với C/C++ trong 3 năm", "C"),
        ("C++/C programming experience", "C"),
        ("lập trình C tại công ty ABC", "C"),
        ("ngôn ngữ C là nền tảng của dự án", "C"),
        ("C programming language", "C"),
        ("C language fundamentals", "C"),
        ("ANSI C standard compliance", "C"),
        ("Used C99 and C11 features", "C"),
    ])
    def test_compound_c_detected(self, text, expected_skill):
        spans = _check_compound_patterns(expected_skill, text)
        assert len(spans) > 0, f"Compound pattern not found for '{expected_skill}' in: {text}"

    @pytest.mark.parametrize("text,expected_skill", [
        ("R programming for data analysis", "R"),
        ("lập trình R để phân tích dữ liệu", "R"),
        ("Used R Studio for visualization", "R"),
        ("RStudio IDE for statistical computing", "R"),
        ("R Shiny dashboard development", "R"),
        ("Analysis with ggplot2 and dplyr", "R"),
        ("Published packages on CRAN", "R"),
        ("ngôn ngữ R cho machine learning", "R"),
    ])
    def test_compound_r_detected(self, text, expected_skill):
        spans = _check_compound_patterns(expected_skill, text)
        assert len(spans) > 0, f"Compound pattern not found for '{expected_skill}' in: {text}"

    @pytest.mark.parametrize("text,expected_skill", [
        ("Go developer with 3 years experience", "Golang"),
        ("lập trình Golang microservices", "Golang"),
        ("Used goroutines for concurrency", "Golang"),
        ("go mod init project", "Golang"),
        ("Go/Golang backend services", "Golang"),
        ("ngôn ngữ Go cho hệ thống phân tán", "Golang"),
    ])
    def test_compound_golang_detected(self, text, expected_skill):
        spans = _check_compound_patterns(expected_skill, text)
        assert len(spans) > 0, f"Compound pattern not found for '{expected_skill}' in: {text}"


# ==============================================================================
# 2. TIER 2: NEGATIVE CONTEXT REJECTION
# ==============================================================================

class TestTier2NegativeContext:
    """Verify false positives are rejected via negative context signals."""

    @pytest.mark.parametrize("text,skill", [
        ("Achieved Grade C in Mathematics", "C"),
        ("Vitamin C supplementation benefits", "C"),
        ("Type C USB connector", "C"),
        ("Level C clearance required", "C"),
        ("Category C driver's license", "C"),
        ("Đạt hạng C trong kỳ thi", "C"),
        ("Giấy phép lái xe loại C", "C"),
        ("Bằng C tiếng Anh", "C"),
        ("Trình độ C ngoại ngữ", "C"),
        ("Hepatitis C treatment", "C"),
    ])
    def test_negative_c_rejected(self, text, skill):
        # Find approximate position of standalone C
        idx = text.lower().find(" c ")
        if idx < 0:
            idx = text.lower().find(" c\b")
            if idx < 0:
                idx = len(text) // 2
        assert _has_negative_context(skill, text, idx, idx + 1)

    @pytest.mark.parametrize("text,skill", [
        ("See Appendix R for details", "R"),
        ("Refer to Section R", "R"),
        ("Part R of the regulation", "R"),
        ("Xem phần R trong tài liệu", "R"),
    ])
    def test_negative_r_rejected(self, text, skill):
        idx = text.lower().find(" r")
        assert _has_negative_context(skill, text, idx, idx + 1)

    @pytest.mark.parametrize("text,skill", [
        ("Ready to go for the interview", "Golang"),
        ("Let's go ahead with the plan", "Golang"),
        ("This is a go-to solution", "Golang"),
        ("Go back to the previous step", "Golang"),
        ("The system will go live next week", "Golang"),
        ("Go through the documentation", "Golang"),
    ])
    def test_negative_golang_rejected(self, text, skill):
        idx = text.lower().find("go")
        assert _has_negative_context(skill, text, idx, idx + 2)


# ==============================================================================
# 3. TIER 3: POSITIVE CONTEXT VALIDATION
# ==============================================================================

class TestTier3PositiveContext:
    """Verify positive tech context signals are detected near ambiguous matches."""

    @pytest.mark.parametrize("text", [
        "Kỹ năng lập trình: Python, C, Java, R",
        "Technical skills: C, Python, Docker",
        "Programming languages: C, R, Go",
        "Ngôn ngữ lập trình C và C++",
        "Backend developer sử dụng C và Golang",
        "Phát triển phần mềm bằng C",
        "Built API framework using C code",
    ])
    def test_positive_context_detected(self, text):
        # Find a position in the text to test
        idx = len(text) // 2
        assert _has_positive_context(text, idx, idx + 1)


# ==============================================================================
# 4. END-TO-END: extract_skill_mentions WITH DISAMBIGUATION
# ==============================================================================

class TestEndToEndDisambiguation:
    """End-to-end tests on extract_skill_mentions with the 4-tier engine active."""

    def test_c_in_skills_section_accepted(self, binder):
        """C listed in a skills section should be accepted."""
        blocks = [
            EvidenceBlock(
                block_id="blk_sk_01",
                text="KỸ NĂNG: Python, C, C++, Java, Docker",
                char_start=0, char_end=37,
                section=CVSection.SKILLS,
                chunk_level=ChunkLevel.LINE,
            ),
        ]
        mentions = binder.extract_skill_mentions(blocks)
        c_mentions = [m for m in mentions if m.skill_name == "C"]
        assert len(c_mentions) >= 1, "C should be detected in skills section"
        assert c_mentions[0].confidence > 0.0

    def test_c_in_experience_with_tech_context_accepted(self, binder):
        """C mentioned with 'lập trình' context in experience section should be accepted."""
        blocks = [
            EvidenceBlock(
                block_id="blk_exp_01",
                text="- Lập trình C và C++ cho hệ thống nhúng",
                char_start=0, char_end=42,
                section=CVSection.EXPERIENCE,
                chunk_level=ChunkLevel.LINE,
            ),
        ]
        mentions = binder.extract_skill_mentions(blocks)
        c_mentions = [m for m in mentions if m.skill_name == "C"]
        assert len(c_mentions) >= 1
        # Should have compound or positive_context method
        assert c_mentions[0].metadata.get("disambiguation_method") in ("compound_pattern", "positive_context")

    def test_grade_c_rejected_in_education(self, binder):
        """'Grade C' in education section should NOT produce a C skill mention."""
        blocks = [
            EvidenceBlock(
                block_id="blk_edu_01",
                text="Achieved Grade C in Advanced Mathematics",
                char_start=0, char_end=41,
                section=CVSection.EDUCATION,
                chunk_level=ChunkLevel.LINE,
            ),
        ]
        mentions = binder.extract_skill_mentions(blocks)
        c_mentions = [m for m in mentions if m.skill_name == "C"]
        assert len(c_mentions) == 0, "Grade C should not be detected as C programming language"

    def test_r_in_data_science_project_accepted(self, binder):
        """R with tech context in projects section should be accepted."""
        blocks = [
            EvidenceBlock(
                block_id="blk_proj_01",
                text="- Phân tích dữ liệu bằng R và Python, sử dụng RStudio",
                char_start=0, char_end=55,
                section=CVSection.PROJECTS,
                chunk_level=ChunkLevel.LINE,
            ),
        ]
        mentions = binder.extract_skill_mentions(blocks)
        r_mentions = [m for m in mentions if m.skill_name == "R"]
        assert len(r_mentions) >= 1, "R should be detected with RStudio compound context"

    def test_appendix_r_rejected(self, binder):
        """'Appendix R' in unknown section should NOT produce an R skill mention."""
        blocks = [
            EvidenceBlock(
                block_id="blk_unk_01",
                text="Refer to Appendix R for the full specification",
                char_start=0, char_end=47,
                section=CVSection.UNKNOWN,
                chunk_level=ChunkLevel.LINE,
            ),
        ]
        mentions = binder.extract_skill_mentions(blocks)
        r_mentions = [m for m in mentions if m.skill_name == "R"]
        assert len(r_mentions) == 0, "Appendix R should not be detected as R programming language"

    def test_go_in_experience_with_tech_context_accepted(self, binder):
        """'Go' with tech context in experience section should match as Golang."""
        blocks = [
            EvidenceBlock(
                block_id="blk_exp_01",
                text="- Phát triển microservices bằng Go và Docker",
                char_start=0, char_end=45,
                section=CVSection.EXPERIENCE,
                chunk_level=ChunkLevel.LINE,
            ),
        ]
        mentions = binder.extract_skill_mentions(blocks)
        go_mentions = [m for m in mentions if m.skill_name == "Golang"]
        assert len(go_mentions) >= 1, "Go should be detected as Golang in tech context"

    def test_ready_to_go_rejected(self, binder):
        """'ready to go' English phrase should NOT match as Golang."""
        blocks = [
            EvidenceBlock(
                block_id="blk_sum_01",
                text="I am ready to go for new challenges and opportunities",
                char_start=0, char_end=54,
                section=CVSection.SUMMARY,
                chunk_level=ChunkLevel.LINE,
            ),
        ]
        mentions = binder.extract_skill_mentions(blocks)
        go_mentions = [m for m in mentions if m.skill_name == "Golang"]
        assert len(go_mentions) == 0, "'ready to go' should not be detected as Golang"

    def test_go_to_market_rejected(self, binder):
        """'go to market' phrase should NOT match as Golang."""
        blocks = [
            EvidenceBlock(
                block_id="blk_exp_01",
                text="Led go to market strategy for the new product launch",
                char_start=0, char_end=52,
                section=CVSection.EXPERIENCE,
                chunk_level=ChunkLevel.LINE,
            ),
        ]
        mentions = binder.extract_skill_mentions(blocks)
        go_mentions = [m for m in mentions if m.skill_name == "Golang"]
        assert len(go_mentions) == 0, "'go to market' should not be detected as Golang"

    def test_non_ambiguous_skills_unaffected(self, binder):
        """Non-ambiguous skills (Python, Docker, etc.) should work exactly as before."""
        blocks = [
            EvidenceBlock(
                block_id="blk_exp_01",
                text="- Xây dựng backend microservices với Python, FastAPI và Docker",
                char_start=0, char_end=62,
                section=CVSection.EXPERIENCE,
                chunk_level=ChunkLevel.LINE,
            ),
        ]
        mentions = binder.extract_skill_mentions(blocks)
        python_mentions = [m for m in mentions if m.skill_name == "Python"]
        docker_mentions = [m for m in mentions if m.skill_name == "Docker"]
        fastapi_mentions = [m for m in mentions if m.skill_name == "FastAPI"]

        assert len(python_mentions) == 1
        assert len(docker_mentions) == 1
        assert len(fastapi_mentions) == 1

        # All should have standard disambiguation method and 0.95 confidence
        for m in [python_mentions[0], docker_mentions[0], fastapi_mentions[0]]:
            assert m.confidence == 0.95
            assert m.metadata.get("disambiguation_method") == "standard"

    def test_c_in_unknown_section_without_context_rejected(self, binder):
        """Standalone C in unknown section without tech context should be rejected."""
        blocks = [
            EvidenceBlock(
                block_id="blk_unk_01",
                text="Đạt kết quả tốt ở lĩnh vực C trong năm 2023",
                char_start=0, char_end=45,
                section=CVSection.UNKNOWN,
                chunk_level=ChunkLevel.LINE,
            ),
        ]
        mentions = binder.extract_skill_mentions(blocks)
        c_mentions = [m for m in mentions if m.skill_name == "C"]
        assert len(c_mentions) == 0, "Standalone C without tech context in unknown section should be rejected"


# ==============================================================================
# 5. FULL CV TEXT INTEGRATION TESTS
# ==============================================================================

class TestFullCVIntegration:
    """Integration tests with realistic full CV texts."""

    def test_mixed_cv_with_c_cpp_and_grade_c(self):
        """CV containing both 'C/C++' tech skills and 'Grade C' academic results."""
        raw_text = """NGUYỄN VĂN A
TÓM TẮT:
Kỹ sư phần mềm nhúng với 5 năm kinh nghiệm lập trình C/C++.

KINH NGHIỆM LÀM VIỆC:
Công ty Embedded Systems (01/2020 - 12/2023)
- Lập trình C cho vi điều khiển ARM Cortex-M
- Phát triển firmware bằng C++ và Python
- Tối ưu bộ nhớ và hiệu năng

HỌC VẤN:
Đại học Bách Khoa (2016 - 2020)
- Tốt nghiệp loại Khá
- Achieved Grade C in English Proficiency Test

KỸ NĂNG:
C, C++, Python, Docker, Linux, ARM, RTOS
"""
        mentions, attachments = extract_and_bind_skills(raw_text=raw_text)

        # C should be detected (in skills section and/or experience with compound pattern)
        c_mentions = [m for m in mentions if m.skill_name == "C"]
        assert len(c_mentions) >= 1, "C programming language should be detected"

        # Grade C should NOT produce a C mention
        # Verify no C mention has char_span overlapping with "Grade C" text
        grade_c_pos = raw_text.find("Grade C")
        for cm in c_mentions:
            for span_start, span_end in cm.char_spans:
                assert not (grade_c_pos <= span_start <= grade_c_pos + 7), \
                    "Grade C should not be detected as C programming language"

        # Python, C++, Docker should all be detected normally
        python_mentions = [m for m in mentions if m.skill_name == "Python"]
        cpp_mentions = [m for m in mentions if m.skill_name == "C++"]
        docker_mentions = [m for m in mentions if m.skill_name == "Docker"]
        assert len(python_mentions) >= 1
        assert len(cpp_mentions) >= 1
        assert len(docker_mentions) >= 1

    def test_data_science_cv_with_r_and_appendix(self):
        """CV containing R programming and non-tech 'R' references."""
        raw_text = """TRẦN THỊ B
TÓM TẮT:
Data Scientist với 3 năm kinh nghiệm phân tích dữ liệu.

KINH NGHIỆM LÀM VIỆC:
Công ty Data Analytics (01/2021 - Hiện tại)
- Phân tích dữ liệu bằng R và Python
- Sử dụng R Studio, ggplot2, dplyr cho visualization
- Xây dựng mô hình Machine Learning

KỸ NĂNG:
R, Python, SQL, Pandas, NumPy, TensorFlow
"""
        mentions, attachments = extract_and_bind_skills(raw_text=raw_text)

        r_mentions = [m for m in mentions if m.skill_name == "R"]
        assert len(r_mentions) >= 1, "R programming language should be detected"

        python_mentions = [m for m in mentions if m.skill_name == "Python"]
        assert len(python_mentions) >= 1

    def test_golang_developer_cv_with_english_go(self):
        """CV with Golang skills and casual English 'go' usage."""
        raw_text = """LÊ VĂN C
TÓM TẮT:
Backend Engineer ready to go for new challenges.

KINH NGHIỆM LÀM VIỆC:
Công ty Tech ABC (01/2022 - Hiện tại)
- Phát triển microservices bằng Go và Docker
- Sử dụng goroutines cho xử lý đồng thời
- Triển khai Go/Golang REST APIs

KỸ NĂNG:
Golang, Docker, Kubernetes, PostgreSQL, Redis
"""
        mentions, attachments = extract_and_bind_skills(raw_text=raw_text)

        golang_mentions = [m for m in mentions if m.skill_name == "Golang"]
        assert len(golang_mentions) >= 1, "Golang should be detected"

        # "ready to go" in summary should NOT produce Golang mention
        # Check that no Golang mention has char_span in the summary line
        summary_start = raw_text.find("ready to go")
        for gm in golang_mentions:
            for span_start, span_end in gm.char_spans:
                assert not (summary_start <= span_start <= summary_start + 11), \
                    "'ready to go' should not be detected as Golang"

    def test_backward_compat_existing_cv_fixtures(self):
        """Regression: existing CV fixtures (Python, FastAPI, Docker, etc.) should still work identically."""
        raw_text = """PHẠM HOÀNG
KINH NGHIỆM LÀM VIỆC:
Tập đoàn FPT (01/2022 - 12/2023)
- Backend Developer sử dụng Python, FastAPI
- Triển khai Docker containers và CI/CD

KỸ NĂNG:
Python, FastAPI, Docker, PostgreSQL, Redis, Git
"""
        mentions, attachments = extract_and_bind_skills(raw_text=raw_text)

        # These are all non-ambiguous, should be detected with standard method
        for skill_name in ["Python", "FastAPI", "Docker", "PostgreSQL", "Redis"]:
            skill_mentions = [m for m in mentions if m.skill_name == skill_name]
            assert len(skill_mentions) >= 1, f"{skill_name} should be detected"
            for sm in skill_mentions:
                assert sm.confidence == 0.95, f"{skill_name} should have 0.95 confidence"
                assert sm.metadata.get("disambiguation_method") == "standard"


# ==============================================================================
# 6. HELPER FUNCTION UNIT TESTS
# ==============================================================================

class TestHelperFunctions:
    """Unit tests for disambiguation helper functions."""

    def test_is_ambiguous_skill(self):
        assert _is_ambiguous_skill("C") is True
        assert _is_ambiguous_skill("R") is True
        assert _is_ambiguous_skill("Golang") is True
        assert _is_ambiguous_skill("Python") is False
        assert _is_ambiguous_skill("Docker") is False
        assert _is_ambiguous_skill("C++") is False

    def test_section_confidence_weights(self):
        assert _get_section_confidence_weight("skills") == 1.00
        assert _get_section_confidence_weight("experience") == 0.95
        assert _get_section_confidence_weight("projects") == 0.95
        assert _get_section_confidence_weight("unknown") == 0.60
        assert _get_section_confidence_weight("nonexistent") == 0.60  # fallback

    def test_compound_patterns_no_false_positive(self):
        """Compound patterns should NOT match non-tech usage."""
        assert len(_check_compound_patterns("C", "Grade C in Mathematics")) == 0
        assert len(_check_compound_patterns("R", "Appendix R reference")) == 0
        assert len(_check_compound_patterns("Golang", "Ready to go for interview")) == 0

    def test_positive_context_with_comma_separated_list(self):
        """Comma-separated skill lists should trigger positive context."""
        text = "Python, C, Java, R, Docker"
        assert _has_positive_context(text, 8, 9)  # position of C
        assert _has_positive_context(text, 17, 18)  # position of R
