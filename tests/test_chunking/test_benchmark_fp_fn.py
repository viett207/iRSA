"""Benchmark and Quality Assurance Suite: False Positive & False Negative Metrics (Phase 5).

Measures Precision, Recall, Specificity, and F1-Score across:
1. Short Technology Disambiguation (C, R, Golang vs non-tech colloquial text).
2. Section Heading Detection (Headings vs conversational prose sentences).
3. Hidden Structural Block Detection (Headingless structured vs pure conversational CVs).
4. Full Regression Verification across all standard fixtures.
"""

import pytest

from src.chunking.section_detector import SectionDetector
from src.chunking.skill_attachment import SkillBinder
from src.models.evidence import ChunkLevel, CVSection, EvidenceBlock


@pytest.fixture
def detector():
    return SectionDetector()


@pytest.fixture
def binder():
    return SkillBinder()


# ==============================================================================
# 1. BENCHMARK: SHORT TECHNOLOGY DISAMBIGUATION (FP / FN)
# ==============================================================================

class TestShortTechDisambiguationBenchmark:
    """Benchmark True Positives, True Negatives, False Positives, False Negatives for C, R, Golang."""

    # Curated negative dataset (Colloquial non-tech phrases that MUST NOT trigger skill extraction)
    NEGATIVE_TEST_CASES = [
        ("Achieved Grade C in Advanced Mathematics", "C"),
        ("Daily intake of Vitamin C improves health", "C"),
        ("Requires Type C USB cable for charging", "C"),
        ("Candidate holds Category C driving license", "C"),
        ("Passed with Level C foreign language certificate", "C"),
        ("Đạt kết quả hạng C trong kỳ thi tuyển", "C"),
        ("Có giấy phép lái xe hạng C còn hiệu lực", "C"),
        ("Đạt chứng chỉ trình độ C tiếng Anh năm 2018", "C"),
        ("Điều trị bệnh nhân viêm gan C thành công", "C"),
        ("Xem chi tiết tại phần C trong hợp đồng", "C"),
        ("Please refer to Appendix R for raw calculation data", "R"),
        ("Detailed guidelines are outlined in Section R", "R"),
        ("Part R of the regulatory framework applies here", "R"),
        ("Tra cứu thêm trong phụ lục R của tài liệu", "R"),
        ("Candidate is motivated and ready to go for new challenges", "Golang"),
        ("Let's go ahead with the proposed deployment plan", "Golang"),
        ("FastAPI is our primary go-to solution for microservices", "Golang"),
        ("User can go back to the previous screen at any time", "Golang"),
        ("The production system will go live next week", "Golang"),
        ("Please go through the attached resume carefully", "Golang"),
        ("Led go to market strategy for the flagship product launch", "Golang"),
        ("Set a clear go-no-go decision criteria for the release", "Golang"),
    ]

    # Curated positive dataset (True tech usage in diverse contexts)
    POSITIVE_TEST_CASES = [
        ("Kỹ sư có 5 năm kinh nghiệm lập trình C/C++ cho hệ thống nhúng", "C"),
        ("Thành thạo lập trình C trên vi điều khiển ARM Cortex", "C"),
        ("Strong understanding of C programming language and memory layout", "C"),
        ("Compliant with ANSI C (C99 and C11) coding standards", "C"),
        ("Sử dụng ngôn ngữ C để viết device drivers trên Linux", "C"),
        ("Phân tích dữ liệu thống kê bằng R và Python", "R"),
        ("Xây dựng báo cáo trực quan với RStudio và ggplot2", "R"),
        ("Phát triển dashboard phân tích bằng R Shiny", "R"),
        ("Published data processing packages on CRAN repository for R", "R"),
        ("Sử dụng ngôn ngữ R trong các bài toán Machine Learning", "R"),
        ("Backend Developer với 3 năm kinh nghiệm lập trình Go / Golang", "Golang"),
        ("Xây dựng microservices hiệu năng cao bằng Go và gRPC", "Golang"),
        ("Tối ưu hóa khả năng xử lý đồng thời bằng goroutines trong Go", "Golang"),
        ("Quản lý dependencies bằng go mod trong dự án", "Golang"),
        ("Phát triển hệ thống phân tán với ngôn ngữ Go và Docker", "Golang"),
    ]

    def test_benchmark_short_tech_precision_and_recall(self, binder):
        """Calculate Precision, Recall, and F1 for short technology disambiguation."""
        tp = 0
        fn = 0
        tn = 0
        fp = 0

        # Evaluate Positive Cases
        for text, target_skill in self.POSITIVE_TEST_CASES:
            block = EvidenceBlock(
                block_id="b_pos",
                text=text,
                char_start=0,
                char_end=len(text),
                section=CVSection.EXPERIENCE,
                chunk_level=ChunkLevel.LINE,
            )
            mentions = binder.extract_skill_mentions([block])
            matched_names = {m.skill_name for m in mentions}
            if target_skill in matched_names:
                tp += 1
            else:
                fn += 1

        # Evaluate Negative Cases
        for text, target_skill in self.NEGATIVE_TEST_CASES:
            block = EvidenceBlock(
                block_id="b_neg",
                text=text,
                char_start=0,
                char_end=len(text),
                section=CVSection.EXPERIENCE,
                chunk_level=ChunkLevel.LINE,
            )
            mentions = binder.extract_skill_mentions([block])
            matched_names = {m.skill_name for m in mentions}
            if target_skill in matched_names:
                fp += 1
            else:
                tn += 1

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        specificity = tn / (tn + fp) if (tn + fp) > 0 else 0.0
        f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

        # Assert zero false positives and zero false negatives
        assert fp == 0, f"False Positives detected: {fp}/{len(self.NEGATIVE_TEST_CASES)}"
        assert fn == 0, f"False Negatives detected: {fn}/{len(self.POSITIVE_TEST_CASES)}"
        assert precision == 1.0
        assert recall == 1.0
        assert specificity == 1.0
        assert f1 == 1.0


# ==============================================================================
# 2. BENCHMARK: SECTION HEADING DETECTION (FP / FN)
# ==============================================================================

class TestSectionHeadingBenchmark:
    """Benchmark heading classification accuracy: true headings vs conversational prose."""

    # Sentences containing section keywords that MUST NOT be classified as headings
    NEGATIVE_HEADING_CASES = [
        "Tôi đã có hơn 5 năm kinh nghiệm làm việc tại các công ty tài chính lớn.",
        "Mục tiêu nghề nghiệp của tôi là trở thành một Technical Architect xuất sắc.",
        "Kỹ năng chuyên môn này giúp tôi giải quyết các bài toán tối ưu hóa hệ thống phức tạp.",
        "Quá trình làm việc tại FPT đã giúp tôi rèn luyện tư duy logic và kỹ năng làm việc nhóm.",
        "Trong quá trình học tập tại đại học, tôi đạt được nhiều học bổng xuất sắc.",
        "Dự án tiêu biểu mà tôi từng tham gia là sàn thương mại điện tử với hơn 1 triệu người dùng.",
        "Chứng chỉ này được cấp bởi AWS sau khi tôi hoàn thành khóa đào tạo chuyên sâu.",
        "I was responsible for developing high-throughput microservices using Python and Docker.",
        "My professional experience includes building large-scale distributed systems.",
        "During my career history, I achieved a 40% reduction in database latency.",
    ]

    # Real formatted section headings that MUST be recognized
    POSITIVE_HEADING_CASES = [
        ("KINH NGHIỆM LÀM VIỆC:", CVSection.EXPERIENCE),
        ("KỸ NĂNG CHUYÊN MÔN", CVSection.SKILLS),
        ("TRÌNH ĐỘ HỌC VẤN:", CVSection.EDUCATION),
        ("DỰ ÁN TIÊU BIỂU", CVSection.PROJECTS),
        ("CHỨNG CHỈ NGHỀ NGHIỆP", CVSection.CERTIFICATIONS),
        ("GIẢI THƯỞNG & THÀNH TÍCH", CVSection.AWARDS),
        ("CÔNG BỐ KHOA HỌC:", CVSection.PUBLICATIONS),
        ("NGOẠI NGỮ", CVSection.LANGUAGES),
        ("HOẠT ĐỘNG TÌNH NGUYỆN:", CVSection.VOLUNTEERING),
        ("THÔNG TIN THAM CHIẾU", CVSection.REFERENCES),
        ("SỞ THÍCH CÁ NHÂN", CVSection.INTERESTS),
        ("HOẠT ĐỘNG ĐOÀN THỂ", CVSection.ACTIVITIES),
        ("--- PROFESSIONAL EXPERIENCE ---", CVSection.EXPERIENCE),
        ("1. TECHNICAL SKILLS:", CVSection.SKILLS),
        ("II. EDUCATIONAL BACKGROUND", CVSection.EDUCATION),
    ]

    def test_benchmark_section_heading_precision_and_recall(self, detector):
        tp = 0
        fn = 0
        tn = 0
        fp = 0

        # Test True Headings
        for heading_text, expected_sec in self.POSITIVE_HEADING_CASES:
            res = detector.detect_heading(heading_text)
            if res.is_heading and res.section == expected_sec:
                tp += 1
            else:
                fn += 1

        # Test Conversational Prose (Negative)
        for sentence_text in self.NEGATIVE_HEADING_CASES:
            res = detector.detect_heading(sentence_text)
            if res.is_heading:
                fp += 1
            else:
                tn += 1

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

        assert fp == 0, f"Heading False Positives: {fp}/{len(self.NEGATIVE_HEADING_CASES)}"
        assert fn == 0, f"Heading False Negatives: {fn}/{len(self.POSITIVE_HEADING_CASES)}"
        assert precision == 1.0
        assert recall == 1.0
        assert f1 == 1.0


# ==============================================================================
# 3. BENCHMARK: MULTI-LINE HEADING MERGING (FP / FN)
# ==============================================================================

class TestMultiLineHeadingBenchmark:
    """Benchmark multi-line heading merging precision."""

    MULTILINE_CASES = [
        ("KINH NGHIỆM\nLÀM VIỆC", CVSection.EXPERIENCE),
        ("QUÁ TRÌNH\nCÔNG TÁC", CVSection.EXPERIENCE),
        ("PROFESSIONAL\nEXPERIENCE", CVSection.EXPERIENCE),
        ("TECHNICAL\nSKILLS", CVSection.SKILLS),
        ("TRÌNH ĐỘ\nHỌC VẤN", CVSection.EDUCATION),
        ("DỰ ÁN\nTIÊU BIỂU", CVSection.PROJECTS),
        ("CÔNG BỐ\nKHOA HỌC", CVSection.PUBLICATIONS),
    ]

    def test_benchmark_multiline_headings(self, detector):
        for text, expected_sec in self.MULTILINE_CASES:
            secs = detector.detect_sections(text + "\n- Nội dung kiểm thử")
            matched = [s for s in secs if s.section == expected_sec]
            assert len(matched) == 1
            assert matched[0].heading_span is not None


# ==============================================================================
# 4. BENCHMARK: HIDDEN / IMPLICIT BLOCK DETECTION (FP / FN)
# ==============================================================================

class TestHiddenBlockBenchmark:
    """Benchmark implicit block detection precision on headingless CVs."""

    def test_structured_headingless_cv_detected_with_zero_fn(self, detector):
        cv_text = """LÊ VĂN BÌNH
Công ty Cổ phần Phần mềm FPT (01/2021 - 12/2023)
Senior Backend Developer
- Lập trình Python, FastAPI

Đại học Công nghệ - ĐHQGHN (2016 - 2020)
Kỹ sư Công nghệ Thông tin
"""
        secs = detector.detect_sections(cv_text)
        sec_types = [s.section for s in secs]

        assert CVSection.EXPERIENCE in sec_types
        assert CVSection.EDUCATION in sec_types
        assert CVSection.UNKNOWN not in sec_types

    def test_unstructured_narrative_cv_retains_zero_fp(self, detector):
        cv_text = """Nguyễn Văn A sinh năm 1995 tại Hà Nội.
Tôi đã có 5 năm làm việc trong lĩnh vực phát triển phần mềm cho các công ty thương mại.
Hàng ngày tôi sử dụng Python và Docker để vận hành hệ thống.
"""
        secs = detector.detect_sections(cv_text)
        assert len(secs) == 1
        assert secs[0].section == CVSection.UNKNOWN
        assert secs[0].confidence == 0.0
