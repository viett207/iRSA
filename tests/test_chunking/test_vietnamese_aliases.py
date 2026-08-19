"""Unit tests for SectionDetector Vietnamese aliases, positive heading matching, and negative sentence rejection."""

import pytest
from src.chunking.section_detector import SectionDetector
from src.models.evidence import CVSection


@pytest.fixture
def detector():
    return SectionDetector()


def test_positive_required_vietnamese_aliases(detector):
    """Verify all 10 required Vietnamese aliases are positively recognized as section headings."""
    required_positive_cases = [
        # 1. Kinh nghiệm làm việc
        ("Kinh nghiệm làm việc", CVSection.EXPERIENCE),
        ("KINH NGHIỆM LÀM VIỆC:", CVSection.EXPERIENCE),
        ("1. Kinh nghiệm làm việc (2020 - 2024)", CVSection.EXPERIENCE),
        # 2. Quá trình công tác
        ("Quá trình công tác", CVSection.EXPERIENCE),
        ("QUÁ TRÌNH CÔNG TÁC:", CVSection.EXPERIENCE),
        # 3. Kinh nghiệm chuyên môn
        ("Kinh nghiệm chuyên môn", CVSection.EXPERIENCE),
        ("KINH NGHIỆM CHUYÊN MÔN:", CVSection.EXPERIENCE),
        # 4. Dự án
        ("Dự án", CVSection.PROJECTS),
        ("DỰ ÁN:", CVSection.PROJECTS),
        ("### DỰ ÁN CÁ NHÂN", CVSection.PROJECTS),
        # 5. Dự án tiêu biểu
        ("Dự án tiêu biểu", CVSection.PROJECTS),
        ("DỰ ÁN TIÊU BIỂU:", CVSection.PROJECTS),
        # 6. Kỹ năng
        ("Kỹ năng", CVSection.SKILLS),
        ("KỸ NĂNG:", CVSection.SKILLS),
        ("KỸ NĂNG CHUYÊN MÔN:", CVSection.SKILLS),
        # 7. Học vấn
        ("Học vấn", CVSection.EDUCATION),
        ("HỌC VẤN:", CVSection.EDUCATION),
        ("--- HỌC VẤN ---", CVSection.EDUCATION),
        # 8. Trình độ học vấn
        ("Trình độ học vấn", CVSection.EDUCATION),
        ("TRÌNH ĐỘ HỌC VẤN:", CVSection.EDUCATION),
        # 9. Chứng chỉ
        ("Chứng chỉ", CVSection.CERTIFICATIONS),
        ("CHỨNG CHỈ:", CVSection.CERTIFICATIONS),
        ("CHỨNG CHỈ NGHỀ NGHIỆP:", CVSection.CERTIFICATIONS),
        # 10. Giải thưởng
        ("Giải thưởng", CVSection.AWARDS),
        ("GIẢI THƯỞNG:", CVSection.AWARDS),
        ("GIẢI THƯỞNG & THÀNH TÍCH:", CVSection.AWARDS),
    ]

    for line, expected_section in required_positive_cases:
        res = detector.detect_heading(line)
        assert res.is_heading is True, f"Positive test failed for: '{line}'"
        assert res.section == expected_section, (
            f"Expected {expected_section}, got {res.section} for line '{line}'"
        )
        assert res.confidence >= 0.90


def test_negative_normal_sentences_rejected_as_headings(detector):
    """Verify normal descriptive sentences and narrative paragraphs are NOT matched as section headings."""
    negative_sentence_cases = [
        # Sentences containing 'Kinh nghiệm làm việc'
        "Kinh nghiệm làm việc 3 năm với Python đã giúp tôi giải quyết nhiều bài toán phức tạp.",
        "Tôi có 5 năm kinh nghiệm làm việc trong lĩnh vực phát triển hệ thống phân tán.",
        # Sentences containing 'Quá trình công tác'
        "Quá trình công tác tại công ty CMC từ năm 2021 đến 2023 với vai trò Backend Lead.",
        "Trong suốt quá trình công tác, tôi luôn hoàn thành xuất sắc các chỉ tiêu được giao.",
        # Sentences containing 'Kinh nghiệm chuyên môn'
        "Kinh nghiệm chuyên môn bao gồm thiết kế kiến trúc microservices và tối ưu database.",
        "Tích lũy kinh nghiệm chuyên môn sâu rộng về các giải pháp đám mây AWS và GCP.",
        # Sentences containing 'Dự án'
        "Dự án phát triển cổng thanh toán trực tuyến cho hơn 50.000 người dùng hàng ngày.",
        "Tham gia phát triển dự án thương mại điện tử phục vụ khách hàng toàn cầu.",
        # Sentences containing 'Dự án tiêu biểu'
        "Dự án tiêu biểu này đã giúp công ty tăng trưởng 30% doanh thu trong quý 4.",
        "Một trong những dự án tiêu biểu mà tôi từng phụ trách là hệ thống core banking.",
        # Sentences containing 'Kỹ năng'
        "Kỹ năng giao tiếp và làm việc nhóm là thế mạnh nổi bật của tôi.",
        "Sử dụng thành thạo các kỹ năng lập trình hướng đối tượng và tối ưu thuật toán.",
        # Sentences containing 'Học vấn'
        "Học vấn tại Đại học Bách Khoa đã trang bị cho tôi nền tảng tư duy toán học vững chắc.",
        "Nền tảng học vấn vững chắc giúp tôi nhanh chóng nắm bắt các công nghệ mới.",
        # Sentences containing 'Trình độ học vấn'
        "Trình độ học vấn Cử nhân Công nghệ thông tin loại Giỏi tốt nghiệp năm 2020.",
        # Sentences containing 'Chứng chỉ'
        "Chứng chỉ AWS Certified Solutions Architect được cấp vào tháng 5/2023.",
        "Đã hoàn thành khóa đào tạo và nhận chứng chỉ Scrum Master chuyên nghiệp.",
        # Sentences containing 'Giải thưởng'
        "Giải thưởng Nhân viên xuất sắc quý 3/2022 tại công ty công nghệ XYZ.",
        "Đạt giải thưởng Ba cuộc thi Olympic Tin học sinh viên toàn quốc năm 2019.",
    ]

    for sentence in negative_sentence_cases:
        res = detector.detect_heading(sentence)
        assert res.is_heading is False, (
            f"Negative test failed: Sentence '{sentence}' was incorrectly classified as heading for {res.section}"
        )
        assert res.section == CVSection.UNKNOWN
        assert res.confidence == 0.0


def test_vietnamese_heading_with_valid_compact_qualifiers(detector):
    """Verify compact qualifiers such as date ranges or combined subjects are accepted as headings."""
    compact_valid_headings = [
        ("KINH NGHIỆM LÀM VIỆC (2020 - 2024)", CVSection.EXPERIENCE),
        ("Kinh nghiệm làm việc (3 năm)", CVSection.EXPERIENCE),
        ("Kỹ năng & Công nghệ:", CVSection.SKILLS),
        ("Học vấn & Đào tạo:", CVSection.EDUCATION),
        ("Giải thưởng & Danh hiệu:", CVSection.AWARDS),
    ]

    for heading, expected_sec in compact_valid_headings:
        res = detector.detect_heading(heading)
        assert res.is_heading is True, f"Failed for compact heading '{heading}'"
        assert res.section == expected_sec
        assert res.confidence >= 0.90
