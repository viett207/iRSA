"""Anti-Hallucination CV Fixtures for Scoring & Evaluation Pipeline Regression Testing.

Contains 12 comprehensive scenarios covering edge cases in skill extraction,
date ranges, experience calculation, keyword stuffing, language variations,
overlapping timelines, and certificate validation.
"""

from typing import Dict, Any, List

CV_FIXTURES: Dict[str, Dict[str, Any]] = {
    # -------------------------------------------------------------------------
    # 1. Python CHỈ xuất hiện trong Skills (không có trong Experience/Projects)
    # -------------------------------------------------------------------------
    "python_in_skills_only": {
        "id": "CV-01",
        "name": "Trần Văn Kỹ Năng",
        "description": "Python chỉ được liệt kê trong danh sách Kỹ năng, hoàn toàn không xuất hiện trong phần Kinh nghiệm làm việc hay Dự án.",
        "raw_text": """
HỌ VÀ TÊN: TRẦN VĂN KỸ NĂNG
Email: tranvankynang@example.com | Điện thoại: 0912345678
Địa chỉ: Cầu Giấy, Hà Nội

MỤC TIÊU NGHỀ NGHIỆP:
Lập trình viên mong muốn phát triển chuyên môn trong lĩnh vực phần mềm.

KỸ NĂNG CHUYÊN MÔN:
- Ngôn ngữ lập trình: Python, C++, Java, PHP
- Cơ sở dữ liệu: MySQL, PostgreSQL
- Công cụ: Git, Postman, VS Code

KINH NGHIỆM LÀM VIỆC:
Công ty Cổ phần Giải pháp Công nghệ ABC (06/2022 - 06/2024)
Vị trí: Lập trình viên Backend PHP
- Phát triển hệ thống quản lý bán hàng sử dụng PHP Laravel và cơ sở dữ liệu MySQL.
- Tối ưu hóa các câu lệnh truy vấn SQL, cải thiện tốc độ tải trang 25%.
- Phối hợp với đội ngũ Frontend để tích hợp RESTful API.
- Viết tài liệu kỹ thuật và tham gia review mã nguồn hàng tuần.

HỌC VẤN:
Trường Đại học Bách Khoa Hà Nội (2018 - 2022)
- Chuyên ngành: Công nghệ Thông tin
- Bằng cấp: Cử nhân Kỹ thuật (Tốt nghiệp loại Khá)
""",
        "ground_truth": {
            "has_python": True,
            "python_in_skills": True,
            "python_in_experience": False,
            "proven_python_years": 0.0,
            "total_experience_years": 2.0,
            "education_level": "bachelor",
            "primary_backend_lang": "PHP",
        }
    },

    # -------------------------------------------------------------------------
    # 2. Python nằm trong Experience CÙNG date range cụ thể
    # -------------------------------------------------------------------------
    "python_in_experience_with_date_range": {
        "id": "CV-02",
        "name": "Lê Thị Thực Chiến",
        "description": "Python xuất hiện rõ ràng trong phần kinh nghiệm kèm thời gian cụ thể (01/2022 - 12/2023 = 2 năm).",
        "raw_text": """
HỌ VÀ TÊN: LÊ THỊ THỰC CHIẾN
Email: lethithucchien@example.com | SĐT: 0987654321
Vị trí: Python Backend Developer

TÓM TẮT:
Kỹ sư Backend với 2 năm kinh nghiệm thực chiến phát triển API và microservices bằng Python và FastAPI.

KINH NGHIỆM LÀM VIỆC:
1. Công ty TNHH Phần mềm Công nghệ FPT (01/2022 - 12/2023) - 2 năm
Vị trí: Python Software Engineer
- Thiết kế và triển khai hệ thống microservices sử dụng Python, FastAPI và Redis Cache.
- Xây dựng hơn 40 RESTful API cho ứng dụng thanh toán trực tuyến, phục vụ 100.000 người dùng mỗi ngày.
- Quản lý cơ sở dữ liệu PostgreSQL, viết complex queries và tối ưu hóa index.
- Ứng dụng Docker để containerize các dịch vụ và triển khai CI/CD pipeline với GitHub Actions.

KỸ NĂNG:
- Python, FastAPI, Django
- PostgreSQL, Redis, MongoDB
- Docker, Git, Linux, CI/CD

HỌC VẤN:
Đại học Quốc gia Hà Nội - Đại học Công nghệ (2017 - 2021)
- Bằng Cử nhân Công nghệ Thông tin
""",
        "ground_truth": {
            "has_python": True,
            "python_in_skills": True,
            "python_in_experience": True,
            "proven_python_years": 2.0,
            "total_experience_years": 2.0,
            "education_level": "bachelor",
            "matched_skills": ["Python", "FastAPI", "PostgreSQL", "Redis", "Docker"],
        }
    },

    # -------------------------------------------------------------------------
    # 3. JD yêu cầu 3 năm nhưng CV chỉ chứng minh 1 năm
    # -------------------------------------------------------------------------
    "jd_requires_3y_cv_proves_1y": {
        "id": "CV-03",
        "name": "Nguyễn Hoàng Nam",
        "description": "Ứng viên chỉ có 1 năm kinh nghiệm thực tế (03/2023 - 03/2024), không đáp ứng yêu cầu tối thiểu 3 năm của JD.",
        "raw_text": """
NGUYỄN HOÀNG NAM
Email: nam.nguyen@example.com | SĐT: 0933112233
Vị trí mong muốn: Python Developer

KINH NGHIỆM LÀM VIỆC:
Công ty Cổ phần Công nghệ TechAsia (03/2023 - 03/2024) - 1 năm
Vị trí: Junior Python Developer
- Tham gia phát triển backend cho website thương mại điện tử bằng Python và Django.
- Xây dựng các chức năng giỏ hàng, thanh toán và quản lý đơn hàng.
- Viết unit test đạt độ bao phủ mã nguồn 70%.

KỸ NĂNG:
- Python, Django, REST API, Git, MySQL

HỌC VẤN:
Đại học Sư phạm Kỹ thuật TP.HCM (2018 - 2022)
- Cử nhân Kỹ thuật Phần mềm
""",
        "ground_truth": {
            "has_python": True,
            "proven_python_years": 1.0,
            "total_experience_years": 1.0,
            "meets_3_year_requirement": False,
            "education_level": "bachelor",
        }
    },

    # -------------------------------------------------------------------------
    # 4. Summary tự khai 5 năm nhưng lịch sử công việc chỉ chứng minh 2 năm
    # -------------------------------------------------------------------------
    "summary_claims_5y_history_proves_2y": {
        "id": "CV-04",
        "name": "Vũ Đình Khai Man",
        "description": "Phần Tóm tắt tự nhận '5 năm kinh nghiệm backend' nhưng dòng thời gian kinh nghiệm chỉ có duy nhất 1 công ty từ 01/2022 đến 01/2024 (2 năm).",
        "raw_text": """
VŨ ĐÌNH KHAI MAN
Email: khaiman.vu@example.com | Điện thoại: 0901234567

TỔNG QUAN HỒ SƠ:
Kỹ sư phần mềm cao cấp với hơn 5 năm kinh nghiệm lập trình backend, dẫn dắt các dự án lớn về kiến trúc dữ liệu và xử lý tải cao.

LỊCH SỬ LÀM VIỆC:
Công ty TNHH Dịch vụ Phần mềm FastCode (01/2022 - 01/2024) - 2 năm kinh nghiệm
Vị trí: Lập trình viên Backend Python
- Xây dựng API và xử lý dữ liệu với Python, FastAPI và MySQL.
- Tích hợp cổng thanh toán VNPay và Momo vào hệ thống bán lẻ.
- Duy trì và sửa lỗi hệ thống máy chủ nội bộ.

KỸ NĂNG:
- Python, FastAPI, MySQL, Git

HỌC VẤN:
Đại học Giao thông Vận tải (2017 - 2021)
- Tốt nghiệp Cử nhân Công nghệ Thông tin
""",
        "ground_truth": {
            "claimed_years_in_summary": 5.0,
            "proven_years_in_history": 2.0,
            "discrepancy_detected": True,
            "actual_valid_experience": 2.0,
            "education_level": "bachelor",
        }
    },

    # -------------------------------------------------------------------------
    # 5. KHÔNG CÓ PYTHON (Không chứa bất kỳ từ khóa Python nào)
    # -------------------------------------------------------------------------
    "no_python_cv": {
        "id": "CV-05",
        "name": "Phạm Quốc Hùng",
        "description": "Ứng viên chuyên sâu về Java & Spring Boot, hoàn toàn không có kỹ năng hay kinh nghiệm Python.",
        "raw_text": """
HỌ VÀ TÊN: PHẠM QUỐC HÙNG
Email: hung.pham@example.com | SĐT: 0977889900
Chức danh: Senior Java Engineer

TÓM TẮT:
Chuyên gia lập trình Java Backend với 4 năm kinh nghiệm xây dựng hệ thống tài chính ngân hàng.

KINH NGHIỆM LÀM VIỆC:
Ngân hàng Thương mại Cổ phần X (02/2020 - 02/2024) - 4 năm
Vị trí: Senior Java Backend Developer
- Phát triển hệ thống Core Banking sử dụng Java 17, Spring Boot, Spring Cloud, Hibernate.
- Xây dựng giải pháp message streaming với Apache Kafka và RabbitMQ.
- Thiết kế cơ sở dữ liệu phân tán Oracle Database và Redis.
- Triển khai kiến trúc Microservices trên Kubernetes (K8s).

KỸ NĂNG CHÍNH:
- Java, Spring Boot, Spring Cloud, Hibernate
- Kafka, RabbitMQ, Redis, Oracle DB
- Kubernetes, Docker, Jenkins, Microservices

HỌC VẤN:
Đại học Khoa học Tự nhiên - ĐHQG TP.HCM (2015 - 2019)
- Cử nhân Khoa học Máy tính
""",
        "ground_truth": {
            "has_python": False,
            "proven_python_years": 0.0,
            "total_experience_years": 4.0,
            "primary_backend_lang": "Java",
            "education_level": "bachelor",
        }
    },

    # -------------------------------------------------------------------------
    # 6. Section heading lạ hoặc không nhận diện được (Unusual headings)
    # -------------------------------------------------------------------------
    "unusual_section_headings": {
        "id": "CV-06",
        "name": "Đặng Minh Sáng Tạo",
        "description": "Sử dụng tiêu đề mục cách điệu: 'Kho vũ khí công nghệ', 'Hành trình chinh phục thực tế', 'Nền tảng tri thức'.",
        "raw_text": """
ĐẶNG MINH SÁNG TẠO
Email: sangtao.dang@example.com | Phone: 0944556677

CHÂN DUNG NGHỀ NGHIỆP:
Người đam mê công nghệ và xây dựng các sản phẩm số chất lượng cao.

KHO VŨ KHÍ CÔNG NGHỆ:
- Ngôn ngữ thành thạo: Python, JavaScript, TypeScript
- Khung làm việc: FastAPI, ReactJS, Node.js
- Lưu trữ: PostgreSQL, Redis, Elasticsearch

HÀNH TRÌNH CHINH PHỤC THỰC TẾ:
Tại Studio Công nghệ Khởi nghiệp NextGen (03/2021 - 03/2024) - 3 năm
Vai trò: Kiến trúc sư giải pháp & Lập trình viên chính
- Trực tiếp lập trình hệ thống thu thập dữ liệu thông minh bằng Python và Beautiful Soup.
- Xây dựng REST API tốc độ cao với FastAPI xử lý 500 yêu cầu/giây.
- Lưu trữ và truy vấn văn bản lớn với Elasticsearch.

NỀN TẢNG TRI THỨC:
Trường Đại học Bách Khoa Đà Nẵng (2016 - 2020)
- Tấm bằng Cử nhân Kỹ thuật Điều khiển & Tự động hóa
""",
        "ground_truth": {
            "has_python": True,
            "proven_python_years": 3.0,
            "total_experience_years": 3.0,
            "unusual_headings": ["KHO VŨ KHÍ CÔNG NGHỆ", "HÀNH TRÌNH CHINH PHỤC THỰC TẾ", "NỀN TẢNG TRI THỨC"],
            "education_level": "bachelor",
        }
    },

    # -------------------------------------------------------------------------
    # 7. Keyword-stuffed CV (CV nhồi nhét từ khóa để thao túng điểm matching)
    # -------------------------------------------------------------------------
    "keyword_stuffed_cv": {
        "id": "CV-07",
        "name": "Hoàng Văn Spam",
        "description": "CV chứa danh sách nhồi nhét hàng chục từ khóa công nghệ nhưng không có dự án chứng minh cụ thể.",
        "raw_text": """
HỌ VÀ TÊN: HOÀNG VĂN SPAM
Email: spam.hoang@example.com | SĐT: 0988001122

TỪ KHÓA NĂNG LỰC:
Python, FastAPI, Django, Flask, PyTorch, TensorFlow, Keras, Scikit-Learn, Pandas, NumPy,
Docker, Kubernetes, AWS, GCP, Azure, Terraform, Ansible, CI/CD, Jenkins, GitHub Actions,
Kafka, RabbitMQ, Redis, Memcached, Elasticsearch, GraphQL, gRPC, Celery, Linux, Bash,
PostgreSQL, MySQL, MongoDB, Cassandra, DynamoDB, Neo4j, Microservices, System Design,
React, Vue, Angular, Next.js, Node.js, TypeScript, Go, Rust, C++, Java, Kotlin, Swift.

KINH NGHIỆM:
Công ty TNHH Dịch vụ ABC (01/2023 - 06/2023) - 6 tháng
Vị trí: Nhân viên thực tập IT
- Hỗ trợ cài đặt phần mềm máy tính văn phòng và kiểm tra đường truyền mạng.

HỌC VẤN:
Cao đẳng Kỹ thuật Cao Thắng (2020 - 2023)
- Bằng Tốt nghiệp Cao đẳng chuyên ngành Mạng máy tính
""",
        "ground_truth": {
            "is_keyword_stuffed": True,
            "has_python_in_keyword_cloud": True,
            "proven_python_years": 0.0,
            "actual_work_experience_months": 6,
            "education_level": "college",
            "hallucination_risk": "High - Keywords without project backing",
        }
    },

    # -------------------------------------------------------------------------
    # 8. Hai công việc TRÙNG THỜI GIAN (Overlapping date ranges)
    # -------------------------------------------------------------------------
    "overlapping_jobs_cv": {
        "id": "CV-08",
        "name": "Ngô Tiến Đạt",
        "description": "Hai công việc diễn ra song song (01/2022 - 12/2023 và 06/2022 - 06/2023). Tổng thời gian thực là 2 năm, không phải 3 năm.",
        "raw_text": """
HỌ VÀ TÊN: NGÔ TIẾN ĐẠT
Email: dat.ngo@example.com | Điện thoại: 0966778899

KINH NGHIỆM LÀM VIỆC:
1. Công ty Cổ phần Công nghệ Alpha (01/2022 - 12/2023) - 2 năm (Toàn thời gian)
Vị trí: Python Developer
- Phát triển hệ thống Backend quản lý chuỗi cung ứng bằng Python và FastAPI.
- Xây dựng API và cơ sở dữ liệu PostgreSQL.

2. Công ty TNHH Giải pháp Beta (06/2022 - 06/2023) - 1 năm (Làm thêm Bán thời gian / Freelance song song)
Vị trí: Python Automation Developer
- Viết kịch bản tự động hóa crawl dữ liệu giá sản phẩm bằng Python và Selenium.

KỸ NĂNG:
- Python, FastAPI, Selenium, PostgreSQL, Docker

HỌC VẤN:
Đại học Công nghiệp Hà Nội (2017 - 2021)
- Cử nhân Công nghệ Thông tin
""",
        "ground_truth": {
            "has_overlapping_dates": True,
            "job1_duration_years": 2.0,
            "job2_duration_years": 1.0,
            "raw_sum_years": 3.0,
            "deduplicated_calendar_years": 2.0,
            "proven_python_years": 2.0,
            "education_level": "bachelor",
        }
    },

    # -------------------------------------------------------------------------
    # 9. Project KHÔNG CÓ date range (Undated project)
    # -------------------------------------------------------------------------
    "project_without_date_range": {
        "id": "CV-09",
        "name": "Bùi Văn An",
        "description": "Mô tả dự án cá nhân chi tiết nhưng không có mốc thời gian bắt đầu hay kết thúc.",
        "raw_text": """
BÙI VĂN AN
Email: an.bui@example.com | SĐT: 0911223344

DỰ ÁN NỔI BẬT:
Dự án: Ứng dụng Quản lý Chi tiêu Cá nhân thông minh
Vai trò: Lập trình viên độc lập (Solo Developer)
- Công nghệ sử dụng: Python, FastAPI, SQLite, Docker, React Native
- Mô tả: Xây dựng ứng dụng theo dõi tài chính cá nhân với chức năng trích xuất hóa đơn tự động bằng AI OCR.
- Kết quả: Đạt 1.000 lượt tải trên GitHub và Google Play Store.

KỸ NĂNG:
- Python, FastAPI, SQLite, Git, Docker

HỌC VẤN:
Đại học Ngoại ngữ - Tin học TP.HCM (HUFLIT) (2019 - 2023)
- Cử nhân Công nghệ Thông tin
""",
        "ground_truth": {
            "has_projects": True,
            "projects_have_dates": False,
            "verifiable_employment_years": 0.0,
            "has_python_in_projects": True,
            "education_level": "bachelor",
        }
    },

    # -------------------------------------------------------------------------
    # 10. Certification có ngày cấp rõ ràng (Certification with issue date)
    # -------------------------------------------------------------------------
    "certification_with_date": {
        "id": "CV-10",
        "name": "Trịnh Thu Trang",
        "description": "Có chứng chỉ chuyên môn quốc tế kèm ngày cấp chính thức (AWS Certified, Python Institute).",
        "raw_text": """
HỌ VÀ TÊN: TRỊNH THU TRANG
Email: trang.trinh@example.com | Điện thoại: 0938112244

TÓM TẮT:
Kỹ sư Cloud Backend với 3 năm kinh nghiệm lập trình Python và tối ưu hóa hạ tầng đám mây AWS.

CHỨNG CHỈ QUỐC TẾ:
- AWS Certified Solutions Architect – Associate (Ngày cấp: 11/2023 - Hiệu lực đến: 11/2026)
- PCAP – Certified Associate in Python Programming (Python Institute, Ngày cấp: 05/2022)

KINH NGHIỆM LÀM VIỆC:
Công ty Cổ phần Công nghệ CloudViet (01/2021 - 01/2024) - 3 năm
Vị trí: Cloud Backend Engineer
- Phát triển API backend trên nền tảng AWS Serverless (AWS Lambda, API Gateway, DynamoDB) với ngôn ngữ Python.
- Tối ưu hóa chi phí vận hành đám mây giảm 30% hàng tháng.

KỸ NĂNG:
- Python, AWS (Lambda, S3, DynamoDB, CloudFront), Docker, Terraform, Git

HỌC VẤN:
Học viện Công nghệ Bưu chính Viễn thông (PTIT) (2016 - 2020)
- Bằng Cử nhân Kỹ thuật Điện tử Viễn thông
""",
        "ground_truth": {
            "has_valid_certifications": True,
            "certs": [
                {"name": "AWS Certified Solutions Architect", "date": "11/2023"},
                {"name": "PCAP – Certified Associate in Python Programming", "date": "05/2022"}
            ],
            "proven_python_years": 3.0,
            "education_level": "bachelor",
        }
    },

    # -------------------------------------------------------------------------
    # 11. CV Thuần Tiếng Việt (Standard Vietnamese Resume)
    # -------------------------------------------------------------------------
    "vietnamese_standard_cv": {
        "id": "CV-11",
        "name": "Đỗ Quang Minh",
        "description": "CV hoàn toàn bằng tiếng Việt chuẩn ngữ pháp, có dấu, phân chia mục bài bản.",
        "raw_text": """
HỌ VÀ TÊN: ĐỖ QUANG MINH
Ngày sinh: 15/08/1998
Địa chỉ: Ba Đình, Hà Nội
Email: minh.do@example.com | Điện thoại: 0915998877

MỤC TIÊU NGHỀ NGHIỆP:
Trở thành Kỹ sư Backend vững chắc về kiến trúc phần mềm và kỹ năng giải quyết sự cố thực tế.

KINH NGHIỆM LÀM VIỆC:
Công ty Cổ phần Viễn thông VinaTech (06/2021 - 06/2024) - 3 năm
Vị trí: Kỹ sư Lập trình Python
- Phát triển và vận hành hệ thống giám sát đường truyền mạng viễn thông.
- Sử dụng Python, FastAPI và Celery để lập lịch xử lý hàng triệu bản ghi nhật ký mỗi ngày.
- Quản trị hệ quản trị cơ sở dữ liệu PostgreSQL và cụm Redis đệm dữ liệu.
- Phối hợp với nhóm QA viết kiểm thử tự động, nâng cao độ ổn định của hệ thống lên 99.9%.

KỸ NĂNG CHUYÊN MÔN:
- Ngôn ngữ: Python, SQL
- Framework & Công cụ: FastAPI, Celery, Redis, PostgreSQL, Docker, Git

TRÌNH ĐỘ HỌC VẤN:
Trường Đại học Bách Khoa Hà Nội (2016 - 2021)
- Ngành: Kỹ thuật Máy tính
- Bằng cấp: Kỹ sư (Tương đương Thạc sĩ / Level 3)
""",
        "ground_truth": {
            "language": "vi",
            "has_python": True,
            "proven_python_years": 3.0,
            "total_experience_years": 3.0,
            "education_level": "bachelor",
            "matched_skills": ["Python", "FastAPI", "Celery", "PostgreSQL", "Redis", "Docker", "Git"],
        }
    },

    # -------------------------------------------------------------------------
    # 12. CV Tiếng Anh chuẩn (Standard English Resume)
    # -------------------------------------------------------------------------
    "english_standard_cv": {
        "id": "CV-12",
        "name": "Alex Nguyen",
        "description": "Professional English resume with standard international headings and terminology.",
        "raw_text": """
ALEX NGUYEN
Email: alex.nguyen@example.com | Mobile: +84 988 123 456
LinkedIn: linkedin.com/in/alexnguyen-dev | Location: Ho Chi Minh City, Vietnam

PROFESSIONAL SUMMARY:
Results-driven Backend Engineer with 4 years of experience specializing in Python, FastAPI, and distributed database systems. Proven track record of architecting high-throughput REST APIs and optimizing query latency.

PROFESSIONAL EXPERIENCE:
Nexus Fintech Solutions Ltd. (02/2020 - 02/2024) - 4 years
Position: Senior Python Developer
- Architected and maintained transaction processing services using Python 3.11, FastAPI, and asyncpg.
- Scaled database layer on PostgreSQL and Redis, reducing p95 latency from 450ms to 65ms.
- Built automated asynchronous task pipelines using Celery and RabbitMQ for fraud detection.
- Led a team of 4 engineers through sprint planning, technical design reviews, and code audits.

TECHNICAL SKILLS:
- Programming Languages: Python, Go, SQL
- Frameworks: FastAPI, Django, Flask, SQLAlchemy
- Storage & Cache: PostgreSQL, MySQL, Redis, DynamoDB
- DevOps & Tools: Docker, Kubernetes, CI/CD, Git, Linux

EDUCATION:
Ho Chi Minh City University of Technology (HCMUT) (2015 - 2019)
- Bachelor of Science in Computer Science (GPA: 3.6/4.0)
""",
        "ground_truth": {
            "language": "en",
            "has_python": True,
            "proven_python_years": 4.0,
            "total_experience_years": 4.0,
            "education_level": "bachelor",
            "matched_skills": ["Python", "FastAPI", "PostgreSQL", "Redis", "Celery", "Docker", "Git"],
        }
    }
}


def get_cv_fixture(fixture_key: str) -> Dict[str, Any]:
    """Retrieve a specific CV fixture by its dictionary key."""
    if fixture_key not in CV_FIXTURES:
        raise KeyError(f"CV fixture '{fixture_key}' not found. Available keys: {list(CV_FIXTURES.keys())}")
    return CV_FIXTURES[fixture_key]


def list_cv_fixture_keys() -> List[str]:
    """Return all available CV fixture keys."""
    return list(CV_FIXTURES.keys())
