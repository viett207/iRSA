"""Bộ fixture CV + JD cho regression test của scoring pipeline.

Mỗi fixture mô tả một tình huống ranh giới (edge case) mà cả hai tầng chấm điểm
phải xử lý đúng:

  - Vòng 1: ``backend/app/services/scoring.py`` (``ResumeScorer``) — keyword +
    embedding, regex số năm kinh nghiệm, keyword học vấn.
  - Vòng 2: agent LangGraph (``src/agents/``) — evaluator + verifier.

Dùng qua helper:

    from tests.fixtures import get_fixture, as_agent_state, as_job_criteria

    fx = get_fixture("jd_requires_3_years_cv_proves_1")
    state = as_agent_state(fx)          # input cho agent_graph.ainvoke
    criteria = as_job_criteria(fx)      # JobCriteria detached cho ResumeScorer._score_*

Trường ``expected`` chứa các sự thật (ground truth) rút ra thủ công từ CV —
regression test dùng chúng làm mốc so sánh, KHÔNG phải là output hiện tại của
pipeline (một số case pipeline hiện chấm sai có chủ đích được ghi trong notes).

Quy ước để fixture ổn định theo thời gian: mọi date range đều đóng (không dùng
"hiện tại"/"present"), nên số năm chứng minh được không trôi khi thời gian chạy.
"""

from dataclasses import dataclass, field
from textwrap import dedent
from typing import Any, Dict, Optional


@dataclass(frozen=True)
class JDSpec:
    """Yêu cầu tuyển dụng tối thiểu — khớp field của model JobCriteria."""

    job_title: str
    must_have_skills: list
    nice_to_have_skills: list = field(default_factory=list)
    min_experience_years: int = 0
    min_education: Optional[str] = "bachelor"  # high_school|bachelor|master|phd
    weight_skills: int = 60
    weight_experience: int = 30
    weight_education: int = 10


@dataclass(frozen=True)
class ScoringFixture:
    id: str
    description: str
    candidate_name: str
    resume_text: str
    jd: JDSpec
    # Ground truth do người viết fixture xác định thủ công từ CV.
    expected: Dict[str, Any] = field(default_factory=dict)
    notes: str = ""


_PYTHON_JD = JDSpec(
    job_title="Python Developer",
    must_have_skills=["Python"],
    nice_to_have_skills=["Docker"],
    min_experience_years=2,
    min_education="bachelor",
)


FIXTURES: Dict[str, ScoringFixture] = {}


def _register(fx: ScoringFixture) -> None:
    if fx.id in FIXTURES:
        raise ValueError(f"Duplicate fixture id: {fx.id}")
    FIXTURES[fx.id] = fx


# ---------------------------------------------------------------------------
# 1. Python chỉ xuất hiện trong Skills, không có trong Experience
# ---------------------------------------------------------------------------
_register(ScoringFixture(
    id="python_only_in_skills",
    description="Python chỉ nằm trong mục Kỹ năng; phần Kinh nghiệm không nhắc tới.",
    candidate_name="Trần Minh Quân",
    resume_text=dedent("""\
        TRẦN MINH QUÂN
        Email: quan.tm@example.com

        KỸ NĂNG
        - Python, SQL, Git

        KINH NGHIỆM LÀM VIỆC
        Nhân viên phân tích dữ liệu — Công ty ABC (01/2021 - 12/2023)
        - Xây dựng báo cáo bằng Excel và Power BI.
        - Làm sạch dữ liệu bán hàng theo tuần.

        HỌC VẤN
        Cử nhân Hệ thống thông tin — Đại học Kinh tế (2017 - 2021)
        """),
    jd=_PYTHON_JD,
    expected={
        "python_in_skills_section": True,
        "python_in_experience_section": False,
        "provable_python_years": 0.0,
        "total_experience_years": 3.0,
        "education_level": "bachelor",
    },
    notes=(
        "Keyword matching sẽ thấy 'Python' (match_sections hiện luôn là "
        "'full_text' — scoring.py:300-311 chưa phân biệt section), nhưng "
        "không có bằng chứng dùng Python trong công việc thực tế."
    ),
))

# ---------------------------------------------------------------------------
# 2. Python nằm trong Experience kèm date range rõ ràng
# ---------------------------------------------------------------------------
_register(ScoringFixture(
    id="python_in_experience_with_dates",
    description="Python xuất hiện trong mô tả công việc có date range 01/2020-06/2023.",
    candidate_name="Lê Thị Hồng",
    resume_text=dedent("""\
        LÊ THỊ HỒNG
        Email: hong.lt@example.com

        KINH NGHIỆM LÀM VIỆC
        Backend Developer — Công ty FinTech XYZ (01/2020 - 06/2023)
        - Phát triển REST API bằng Python (FastAPI) phục vụ 200k người dùng.
        - Viết unit test với pytest, độ phủ 85%.

        KỸ NĂNG
        - Python, FastAPI, PostgreSQL, Docker

        HỌC VẤN
        Cử nhân Công nghệ thông tin — Đại học Bách Khoa (2015 - 2019)
        """),
    jd=_PYTHON_JD,
    expected={
        "python_in_skills_section": True,
        "python_in_experience_section": True,
        "provable_python_years": 3.5,
        "total_experience_years": 3.5,
        "education_level": "bachelor",
        "meets_min_experience": True,
    },
    notes="Case chuẩn: bằng chứng Python gắn với date range cụ thể.",
))

# ---------------------------------------------------------------------------
# 3. JD yêu cầu 3 năm nhưng CV chỉ chứng minh 1 năm
# ---------------------------------------------------------------------------
_register(ScoringFixture(
    id="jd_requires_3_years_cv_proves_1",
    description="JD đòi 3 năm kinh nghiệm; lịch sử làm việc chỉ có 1 năm (03/2023-03/2024).",
    candidate_name="Phạm Văn Đức",
    resume_text=dedent("""\
        PHẠM VĂN ĐỨC
        Email: duc.pv@example.com

        KINH NGHIỆM LÀM VIỆC
        Junior Python Developer — Startup Delta (03/2023 - 03/2024)
        - Viết script Python tự động hoá quy trình nhập liệu.

        KỸ NĂNG
        - Python, Pandas

        HỌC VẤN
        Cử nhân Khoa học máy tính — Đại học Quốc gia (2019 - 2023)
        """),
    jd=JDSpec(
        job_title="Python Developer",
        must_have_skills=["Python"],
        min_experience_years=3,
        min_education="bachelor",
    ),
    expected={
        "provable_python_years": 1.0,
        "total_experience_years": 1.0,
        "meets_min_experience": False,
        "education_level": "bachelor",
    },
    notes="Điểm experience phải phản ánh thiếu 2 năm so với yêu cầu.",
))

# ---------------------------------------------------------------------------
# 4. Summary tự khai 5 năm nhưng lịch sử chỉ chứng minh 2 năm
# ---------------------------------------------------------------------------
_register(ScoringFixture(
    id="summary_claims_5_history_proves_2",
    description="Summary khai '5 năm kinh nghiệm Python' nhưng date range chỉ chứng minh 2 năm.",
    candidate_name="Ngô Thu Trang",
    resume_text=dedent("""\
        NGÔ THU TRANG
        Email: trang.nt@example.com

        GIỚI THIỆU
        Lập trình viên với 5 năm kinh nghiệm Python, đam mê xây dựng sản phẩm.

        KINH NGHIỆM LÀM VIỆC
        Python Developer — Công ty Omega (01/2022 - 01/2024)
        - Phát triển hệ thống ETL bằng Python và Airflow.

        KỸ NĂNG
        - Python, Airflow, SQL

        HỌC VẤN
        Cử nhân Toán - Tin — Đại học Sư phạm (2014 - 2018)
        """),
    jd=JDSpec(
        job_title="Senior Python Developer",
        must_have_skills=["Python"],
        min_experience_years=4,
        min_education="bachelor",
    ),
    expected={
        "claimed_years": 5.0,
        "provable_python_years": 2.0,
        "total_experience_years": 2.0,
        "meets_min_experience": False,
    },
    notes=(
        "Bẫy self-claim: regex bắt '5 năm kinh nghiệm' trong summary sẽ chấm "
        "vượt bằng chứng thật. Pipeline đúng phải ưu tiên date range."
    ),
))

# ---------------------------------------------------------------------------
# 5. Không có Python
# ---------------------------------------------------------------------------
_register(ScoringFixture(
    id="no_python",
    description="CV hoàn toàn không chứa Python; JD bắt buộc Python.",
    candidate_name="Đỗ Quốc Bảo",
    resume_text=dedent("""\
        ĐỖ QUỐC BẢO
        Email: bao.dq@example.com

        KINH NGHIỆM LÀM VIỆC
        Java Developer — Ngân hàng Beta (06/2019 - 06/2024)
        - Phát triển core banking bằng Java Spring Boot.
        - Tối ưu truy vấn Oracle, giảm 40% thời gian phản hồi.

        KỸ NĂNG
        - Java, Spring Boot, Oracle, Kafka

        HỌC VẤN
        Kỹ sư Phần mềm — Đại học FPT (2015 - 2019)
        """),
    jd=_PYTHON_JD,
    expected={
        "python_found": False,
        "must_have_match_ratio": 0.0,
        "total_experience_years": 5.0,
        "education_level": "bachelor",
    },
    notes=(
        "Must-have = 0 → verifier phải ép trần điểm (verifier_node.py:93-109). "
        "Mọi 'evidence' về Python cho case này đều là hallucination."
    ),
))

# ---------------------------------------------------------------------------
# 6. Section heading lạ / không nhận diện được
# ---------------------------------------------------------------------------
_register(ScoringFixture(
    id="weird_section_headings",
    description="Heading phi chuẩn (emoji, tiếng lóng) — parser section không nhận diện được.",
    candidate_name="Vũ Hải Nam",
    resume_text=dedent("""\
        VŨ HẢI NAM ✦ builder of things
        Email: nam.vh@example.com

        ~ HÀNH TRÌNH CỦA TÔI ~
        Code dạo tại Công ty Gamma (02/2021 - 08/2023): làm việc với Python,
        dựng pipeline dữ liệu, deploy lên AWS.

        >>> ĐỒ NGHỀ <<<
        Python | Docker | AWS | Linux

        ★ TRƯỜNG LỚP ★
        Cử nhân CNTT — Đại học Mở (2016 - 2020)
        """),
    jd=_PYTHON_JD,
    expected={
        "python_found": True,
        "provable_python_years": 2.5,
        "education_level": "bachelor",
        "standard_headings": False,
    },
    notes=(
        "Pipeline hiện scan full_text nên vẫn match keyword; fixture này để "
        "regression khi bổ sung section detection thật."
    ),
))

# ---------------------------------------------------------------------------
# 7. Keyword-stuffed CV
# ---------------------------------------------------------------------------
_register(ScoringFixture(
    id="keyword_stuffed",
    description="CV nhồi keyword hàng loạt, không có ngữ cảnh công việc hay date range.",
    candidate_name="Bùi Anh Tú",
    resume_text=dedent("""\
        BÙI ANH TÚ
        Email: tu.ba@example.com

        KỸ NĂNG
        Python Python Python Java C++ JavaScript TypeScript Go Rust PHP Ruby
        FastAPI Django Flask Spring React Angular Vue Docker Kubernetes AWS
        GCP Azure PostgreSQL MySQL MongoDB Redis Kafka RabbitMQ Elasticsearch
        Machine Learning Deep Learning NLP Computer Vision Data Science
        Blockchain DevOps CI/CD Agile Scrum Leadership Teamwork

        KINH NGHIỆM LÀM VIỆC
        (đang cập nhật)

        HỌC VẤN
        (đang cập nhật)
        """),
    jd=_PYTHON_JD,
    expected={
        "python_found": True,
        "provable_python_years": 0.0,
        "total_experience_years": 0.0,
        "has_work_evidence": False,
        "education_level": None,
    },
    notes=(
        "Keyword matcher sẽ chấm skill cao dù không có bằng chứng nào; "
        "case này đo khả năng chống keyword stuffing."
    ),
))

# ---------------------------------------------------------------------------
# 8. Hai công việc trùng thời gian
# ---------------------------------------------------------------------------
_register(ScoringFixture(
    id="overlapping_jobs",
    description="Hai job overlap: 01/2020-12/2022 và 06/2021-06/2023. Tổng thật = 3.5 năm, cộng dồn ngây thơ = 5 năm.",
    candidate_name="Hoàng Gia Huy",
    resume_text=dedent("""\
        HOÀNG GIA HUY
        Email: huy.hg@example.com

        KINH NGHIỆM LÀM VIỆC
        Python Developer — Công ty Sigma (01/2020 - 12/2022)
        - Xây dựng API nội bộ bằng Python và Flask.

        Freelance Backend Engineer — Dự án EdTech (06/2021 - 06/2023)
        - Phát triển service chấm bài bằng Python.

        KỸ NĂNG
        - Python, Flask, Celery

        HỌC VẤN
        Cử nhân CNTT — Đại học Cần Thơ (2015 - 2019)
        """),
    jd=JDSpec(
        job_title="Python Developer",
        must_have_skills=["Python"],
        min_experience_years=4,
        min_education="bachelor",
    ),
    expected={
        "python_found": True,
        "naive_summed_years": 5.0,
        "provable_python_years": 3.5,  # union của 2 khoảng: 01/2020 - 06/2023
        "meets_min_experience": False,
    },
    notes="Cộng dồn duration từng job mà không trừ overlap sẽ chấm 5 năm — sai.",
))

# ---------------------------------------------------------------------------
# 9. Project không có date range
# ---------------------------------------------------------------------------
_register(ScoringFixture(
    id="project_no_dates",
    description="Chỉ có mục Dự án cá nhân dùng Python, không có date range nào trong CV.",
    candidate_name="Đặng Khánh Linh",
    resume_text=dedent("""\
        ĐẶNG KHÁNH LINH
        Email: linh.dk@example.com

        DỰ ÁN CÁ NHÂN
        - Web quản lý chi tiêu: backend Python FastAPI, frontend React.
        - Bot Telegram nhắc lịch học viết bằng Python.

        KỸ NĂNG
        - Python, FastAPI, React

        HỌC VẤN
        Cử nhân Khoa học dữ liệu — Đại học Tôn Đức Thắng
        """),
    jd=_PYTHON_JD,
    expected={
        "python_found": True,
        "provable_python_years": 0.0,
        "total_experience_years": 0.0,
        "has_date_ranges": False,
        "education_level": "bachelor",
    },
    notes="Không có mốc thời gian nào → không được quy đổi project thành năm kinh nghiệm.",
))

# ---------------------------------------------------------------------------
# 10. Certification có ngày cấp
# ---------------------------------------------------------------------------
_register(ScoringFixture(
    id="certification_with_issue_date",
    description="Có chứng chỉ PCEP cấp 05/2023 — ngày cấp không được tính nhầm thành date range kinh nghiệm.",
    candidate_name="Lý Thanh Sơn",
    resume_text=dedent("""\
        LÝ THANH SƠN
        Email: son.lt@example.com

        KINH NGHIỆM LÀM VIỆC
        Python Developer — Công ty Lambda (07/2022 - 07/2024)
        - Bảo trì hệ thống báo cáo viết bằng Python.

        CHỨNG CHỈ
        - PCEP – Certified Entry-Level Python Programmer, cấp 05/2023
        - AWS Cloud Practitioner, cấp 11/2023

        KỸ NĂNG
        - Python, AWS

        HỌC VẤN
        Cử nhân CNTT — Đại học Duy Tân (2018 - 2022)
        """),
    jd=_PYTHON_JD,
    expected={
        "python_found": True,
        "provable_python_years": 2.0,
        "certifications": ["PCEP", "AWS Cloud Practitioner"],
        "cert_dates_are_not_experience": True,
    },
    notes="Regex năm/tháng ngây thơ có thể nuốt '05/2023' của chứng chỉ vào tính năm kinh nghiệm.",
))

# ---------------------------------------------------------------------------
# 11. CV tiếng Việt thuần
# ---------------------------------------------------------------------------
_register(ScoringFixture(
    id="vietnamese_cv",
    description="CV thuần tiếng Việt, heading chuẩn tiếng Việt, có dấu đầy đủ.",
    candidate_name="Nguyễn Thị Mai",
    resume_text=dedent("""\
        NGUYỄN THỊ MAI
        Email: mai.nt@example.com

        MỤC TIÊU NGHỀ NGHIỆP
        Trở thành kỹ sư phần mềm chuyên sâu về xử lý dữ liệu.

        KINH NGHIỆM LÀM VIỆC
        Lập trình viên Python — Công ty Cổ phần Công nghệ Sao Việt (04/2021 - 10/2024)
        - Phát triển hệ thống thu thập dữ liệu bằng Python và Scrapy.
        - Tối ưu cơ sở dữ liệu PostgreSQL.

        KỸ NĂNG
        - Python, Scrapy, PostgreSQL, Linux

        HỌC VẤN
        Cử nhân Công nghệ thông tin — Đại học Khoa học Tự nhiên (2017 - 2021)
        Tốt nghiệp loại Giỏi.
        """),
    jd=JDSpec(
        job_title="Kỹ sư Python",
        must_have_skills=["Python", "PostgreSQL"],
        nice_to_have_skills=["Scrapy"],
        min_experience_years=2,
        min_education="bachelor",
    ),
    expected={
        "language": "vi",
        "python_found": True,
        "provable_python_years": 3.5,
        "must_have_match_ratio": 1.0,
        "education_level": "bachelor",
        "meets_min_experience": True,
    },
))

# ---------------------------------------------------------------------------
# 12. CV tiếng Anh thuần
# ---------------------------------------------------------------------------
_register(ScoringFixture(
    id="english_cv",
    description="CV thuần tiếng Anh với heading chuẩn quốc tế.",
    candidate_name="John Nguyen",
    resume_text=dedent("""\
        JOHN NGUYEN
        Email: john.nguyen@example.com

        SUMMARY
        Backend engineer focused on building reliable data services.

        WORK EXPERIENCE
        Python Developer — Global Retail Corp (02/2019 - 08/2023)
        - Built and maintained order-processing microservices in Python.
        - Deployed services with Docker on AWS ECS.

        SKILLS
        Python, Docker, AWS, PostgreSQL

        EDUCATION
        Bachelor of Science in Computer Science — RMIT University (2014 - 2018)

        CERTIFICATIONS
        - AWS Certified Developer Associate, issued 09/2022
        """),
    jd=JDSpec(
        job_title="Python Developer",
        must_have_skills=["Python", "Docker"],
        nice_to_have_skills=["AWS"],
        min_experience_years=3,
        min_education="bachelor",
    ),
    expected={
        "language": "en",
        "python_found": True,
        "provable_python_years": 4.5,
        "must_have_match_ratio": 1.0,
        "education_level": "bachelor",
        "meets_min_experience": True,
    },
))


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_fixture(fixture_id: str) -> ScoringFixture:
    try:
        return FIXTURES[fixture_id]
    except KeyError:
        raise KeyError(
            f"Unknown fixture '{fixture_id}'. Available: {sorted(FIXTURES)}"
        ) from None


def as_agent_state(fx: ScoringFixture, application_id: int = 0) -> Dict[str, Any]:
    """Input state cho ``agent_graph.ainvoke`` (xem src/agents/state.py)."""
    return {
        "application_id": application_id,
        "candidate_name": fx.candidate_name,
        "job_title": fx.jd.job_title,
        "resume_text": fx.resume_text,
        "must_have_skills": list(fx.jd.must_have_skills),
        "nice_to_have_skills": list(fx.jd.nice_to_have_skills),
        "min_experience_years": fx.jd.min_experience_years,
        "min_education": fx.jd.min_education,
    }


def as_criteria_kwargs(fx: ScoringFixture) -> Dict[str, Any]:
    """Kwargs khởi tạo JobCriteria (không import model để giữ module nhẹ)."""
    return {
        "must_have_skills": list(fx.jd.must_have_skills),
        "nice_to_have_skills": list(fx.jd.nice_to_have_skills),
        "min_experience_years": fx.jd.min_experience_years,
        "min_education": fx.jd.min_education,
        "weight_skills": fx.jd.weight_skills,
        "weight_experience": fx.jd.weight_experience,
        "weight_education": fx.jd.weight_education,
    }


def as_job_criteria(fx: ScoringFixture):
    """JobCriteria detached (không gắn DB session) cho ResumeScorer._score_*."""
    from app.models.job import JobCriteria  # backend/ nằm trên sys.path qua conftest

    return JobCriteria(**as_criteria_kwargs(fx))
