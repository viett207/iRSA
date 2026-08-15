"""Generate 20+ Real-world IT Candidate Resumes (PDF), upload to Supabase Storage and Seed into DB.

Usage:
    .venv\\Scripts\\python.exe backend\\scripts\\generate_and_seed_resumes.py
"""

import sys
import uuid
import secrets
from datetime import UTC, datetime
from pathlib import Path
import pymupdf
from sqlalchemy import select

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.database import SyncSessionLocal  # noqa: E402
from app.models.job import Job  # noqa: E402
from app.models.user import User  # noqa: E402
from app.models.resume import Resume  # noqa: E402
from app.models.application import Application  # noqa: E402
from app.core.security import get_password_hash  # noqa: E402
from app.services.storage import get_storage_service  # noqa: E402

CANDIDATES_DATASET = [
    {
        "full_name": "Nguyen Hoang Long",
        "email": "long.nguyen.backend@gmail.com",
        "phone": "0987654321",
        "title": "Senior Python / FastAPI Backend Engineer",
        "target_job_slug": "topcv-senior-backend-python-fastapi",
        "experience_years": 4,
        "education": "Đại học Bách Khoa Hà Nội - Kỹ sư Công nghệ Thông tin (GPA 3.4/4.0)",
        "skills": ["Python", "FastAPI", "PostgreSQL", "SQLAlchemy", "Redis", "Celery", "Docker", "Git", "AWS", "RESTful API"],
        "summary": "Senior Backend Developer với hơn 4 năm kinh nghiệm chuyên sâu về Python, FastAPI và hệ thống kiến trúc Microservices phân tán. Có thế mạnh về thiết kế cơ sở dữ liệu quan hệ PostgreSQL và tối ưu hóa hiệu năng API chịu tải cao.",
        "experience": [
            "Senior Backend Developer tại VNG Corporation (2022 - Hiện tại): Thiết kế và vận hành các RESTful API phục vụ hơn 500,000 người dùng hàng ngày với FastAPI và PostgreSQL; giảm độ trễ truy vấn 40% bằng Redis Cache và tối ưu Index.",
            "Backend Developer tại FPT Software (2020 - 2022): Xây dựng hệ thống backend xử lý tác vụ ngầm với Celery/RabbitMQ; đóng gói ứng dụng với Docker và thiết lập pipeline CI/CD trên GitLab.",
        ],
        "projects": [
            "E-Commerce Microservices Platform: Xây dựng hệ thống 6 microservices backend bằng FastAPI, asyncpg, kết nối PostgreSQL và Kafka.",
            "AI Resume Screening Engine: Tích hợp LangChain và OpenAI API để tự động bóc tách và phân tích dữ liệu ứng viên.",
        ],
    },
    {
        "full_name": "Tran Minh Duc",
        "email": "duc.tran.ai@gmail.com",
        "phone": "0912345678",
        "title": "AI & LLM Application Engineer",
        "target_job_slug": "topcv-ai-engineer-llm-langgraph",
        "experience_years": 3,
        "education": "Đại học Công nghệ - ĐHQGHN - Cử nhân Khoa học Máy tính (GPA 3.6/4.0)",
        "skills": ["Python", "LangChain", "LangGraph", "RAG", "Prompt Engineering", "Vector DB", "ChromaDB", "PyTorch", "FastAPI"],
        "summary": "Kỹ sư AI có 3 năm kinh nghiệm nghiên cứu và triển khai thực tế các ứng dụng Generative AI, Multi-Agent systems (LangGraph) và kiến trúc RAG nâng cao.",
        "experience": [
            "AI Engineer tại VinAI Research / Tech (2023 - Hiện tại): Xây dựng hệ sinh thái AI Agent tự động hóa phân tích dữ liệu tuyển dụng bằng LangGraph và Google Gemini 1.5; tối ưu hóa chi phí token 35%.",
            "Junior NLP Engineer tại Viettel AI (2021 - 2023): Huấn luyện các mô hình phân loại văn bản tiếng Việt và nhận diện thực thể (NER) với PhoBERT và Transformers.",
        ],
        "projects": [
            "Multi-Agent Recruitment Assistant: Hệ thống phối hợp 4 agent (Parser, Evaluator, Interviewer, Reporter) dựa trên LangGraph.",
            "Enterprise Knowledge Base RAG: Pipeline tìm kiếm ngữ nghĩa với ChromaDB và Hybrid Search (BM25 + Dense Embeddings).",
        ],
    },
    {
        "full_name": "Le Thi Mai Linh",
        "email": "linh.le.frontend@gmail.com",
        "phone": "0934567890",
        "title": "Frontend Developer (Angular 17+ / TypeScript)",
        "target_job_slug": "topcv-frontend-angular-developer",
        "experience_years": 3,
        "education": "Đại học FPT - Kỹ sư Kỹ thuật Phần mềm (Loại Giỏi)",
        "skills": ["Angular", "TypeScript", "RxJS", "Ng-Zorro Ant Design", "HTML5/CSS3", "TailwindCSS", "REST API", "Figma"],
        "summary": "Frontend Developer nhiệt huyết với 3 năm kinh nghiệm chuyên sâu về Angular và TypeScript. Đam mê xây dựng trải nghiệm người dùng mượt mà, tối ưu hóa hiệu năng render và tuân thủ chặt chẽ thiết kế Figma.",
        "experience": [
            "Frontend Engineer tại One Mount Group (2022 - Hiện tại): Phát triển Portal quản trị và Web App khách hàng với Angular 16/17, RxJS và Ng-Zorro; tăng điểm Core Web Vitals lên 92/100.",
            "Junior Web Developer tại TMA Solutions (2021 - 2022): Xây dựng các component UI tái sử dụng và tích hợp REST API cho hệ thống ERP.",
        ],
        "projects": [
            "Applicant Tracking Portal: Giao diện ứng tuyển và theo dõi kết quả hồ sơ theo thời gian thực sử dụng Angular 17 và WebSocket.",
            "HR Analytics Dashboard: Bảng điều khiển quản trị trực quan với biểu đồ động và xuất báo cáo PDF/Excel.",
        ],
    },
    {
        "full_name": "Pham Van Thang",
        "email": "thang.pham.data@gmail.com",
        "phone": "0978901234",
        "title": "Data Analyst / BI Specialist",
        "target_job_slug": "topcv-data-analyst-bi-powerbi",
        "experience_years": 2,
        "education": "Đại học Kinh tế Quốc dân - Cử nhân Hệ thống Thông tin Quản lý",
        "skills": ["SQL", "Power BI", "DAX", "Excel Advanced", "Python (Pandas)", "Data Cleaning", "Data Visualization", "ETL"],
        "summary": "Data Analyst với 2 năm kinh nghiệm chuyển hóa dữ liệu thô thành các báo cáo trực quan và insight kinh doanh sắc bén. Thành thạo viết truy vấn SQL phức tạp và xây dựng dashboard quản trị bằng Power BI.",
        "experience": [
            "Data Analyst tại Shopee Vietnam (2022 - Hiện tại): Phân tích hiệu quả chiến dịch marketing và hành vi khách hàng; xây dựng hơn 20 báo cáo quản trị Power BI phục vụ ban giám đốc.",
            "BI Associate tại Momo (2021 - 2022): Xử lý làm sạch dữ liệu lớn và tự động hóa báo cáo định kỳ hàng ngày bằng Python và SQL.",
        ],
        "projects": [
            "Recruitment Funnel Dashboard: Báo cáo phân tích chuyển đổi phễu tuyển dụng từ lúc nộp CV đến khi nhận việc.",
            "Candidate Scoring Analysis: Đánh giá phân phối điểm số của AI Screening và tương quan với đánh giá thực tế từ HR.",
        ],
    },
    {
        "full_name": "Vu Dinh Quan",
        "email": "quan.vu.devops@gmail.com",
        "phone": "0901234567",
        "title": "DevOps & Cloud Infrastructure Engineer",
        "target_job_slug": "topcv-devops-cloud-aws-engineer",
        "experience_years": 4,
        "education": "Học viện Công nghệ Bưu chính Viễn thông - Kỹ sư An toàn Thông tin",
        "skills": ["Docker", "Kubernetes", "AWS", "Terraform", "GitHub Actions", "CI/CD", "Linux", "Prometheus", "Nginx"],
        "summary": "Kỹ sư DevOps với 4 năm kinh nghiệm vận hành hạ tầng Cloud AWS, container hóa ứng dụng với Docker/K8s và tự động hóa toàn bộ quy trình triển khai CI/CD.",
        "experience": [
            "DevOps Engineer tại Techcombank (2022 - Hiện tại): Quản trị cụm Kubernetes (EKS) và hạ tầng AWS; thiết lập pipeline CI/CD giúp giảm thời gian release từ 2 giờ xuống 10 phút.",
            "System Administrator tại CMC Telecom (2020 - 2022): Cấu hình và giám sát hơn 50 máy chủ Linux (Ubuntu/CentOS), thiết lập hệ thống giám sát Prometheus & Grafana.",
        ],
        "projects": [
            "Automated Multi-Environment Cloud Deployment: Triển khai hạ tầng Infrastructure-as-Code (IaC) bằng Terraform trên AWS.",
            "Zero-Downtime Migration: Chuyển đổi thành công hệ thống monolith sang kiến trúc microservices containerized.",
        ],
    },
    {
        "full_name": "Doan Quoc Bao",
        "email": "bao.doan.java@gmail.com",
        "phone": "0945678901",
        "title": "Senior Java Spring Boot Engineer",
        "target_job_slug": "topcv-senior-java-spring-boot",
        "experience_years": 5,
        "education": "Đại học Bách Khoa TP.HCM - Kỹ sư Khoa học Máy tính",
        "skills": ["Java", "Spring Boot", "Spring Cloud", "Kafka", "PostgreSQL", "Microservices", "Redis", "Docker"],
        "summary": "Senior Java Developer với 5 năm kinh nghiệm xây dựng các hệ thống tài chính phân tán, kiến trúc Event-driven với Apache Kafka và microservices Spring Boot.",
        "experience": [
            "Lead Java Developer tại VPBank (2021 - Hiện tại): Kiến trúc core dịch vụ thanh toán xử lý 2 triệu giao dịch/ngày; đảm bảo tính toàn vẹn dữ liệu với distributed transaction saga pattern.",
            "Software Engineer tại KMS Technology (2019 - 2021): Phát triển hệ thống B2B SaaS bằng Java 11, Spring Boot và Hibernate.",
        ],
        "projects": [
            "High-Throughput Payment Gateway: Cổng thanh toán phân tán chịu tải cao với Spring Cloud và Kafka.",
            "Real-time Notification Service: Dịch vụ thông báo đa kênh (SMS, Email, Push) xử lý bất đồng bộ.",
        ],
    },
    {
        "full_name": "Bui Thanh Tung",
        "email": "tung.bui.golang@gmail.com",
        "phone": "0967890123",
        "title": "Golang Backend Developer (High Concurrency)",
        "target_job_slug": "topcv-golang-backend-engineer-highload",
        "experience_years": 3,
        "education": "Đại học Bách Khoa Hà Nội - Kỹ sư CNTT",
        "skills": ["Golang", "Goroutines", "gRPC", "PostgreSQL", "Redis", "Docker", "Microservices", "Kafka"],
        "summary": "Backend Developer chuyên sâu về Golang với tư duy tối ưu hóa hiệu năng, xử lý đồng thời (Concurrency) và thiết kế hệ thống phân tán gRPC.",
        "experience": [
            "Golang Engineer tại Zalo / VNG (2022 - Hiện tại): Phát triển dịch vụ chat messaging backend và microservices gRPC; tối ưu hóa memory usage và latency dưới 15ms.",
            "Backend Developer tại Be Group (2021 - 2022): Xây dựng API tính giá cước và matching tài xế thời gian thực bằng Go.",
        ],
        "projects": [
            "Distributed Task Queue in Go: Hệ thống hàng đợi phân tán hiệu năng cao chịu tải 100,000 tasks/sec.",
            "gRPC Microservices Gateway: API Gateway trung gian điều phối và xác thực JWT cho hơn 10 vi dịch vụ.",
        ],
    },
    {
        "full_name": "Hoang Kim Ngan",
        "email": "ngan.hoang.pm@gmail.com",
        "phone": "0923456789",
        "title": "Technical Product Manager (B2B SaaS / AI)",
        "target_job_slug": "topcv-product-manager-tech",
        "experience_years": 4,
        "education": "Đại học Ngoại Thương Hà Nội - Cử nhân Kinh tế Đối ngoại (Bằng kép CNTT)",
        "skills": ["Product Strategy", "User Research", "Agile/Scrum", "PRD Writing", "Figma", "Data Analysis", "Growth"],
        "summary": "Product Manager với 4 năm kinh nghiệm định hình và phát triển các sản phẩm B2B SaaS và nền tảng ứng dụng AI. Nổi bật với tư duy dữ liệu và kỹ năng kết nối giữa Business và Engineering.",
        "experience": [
            "Product Manager tại Base.vn (2022 - Hiện tại): Quản trị vòng đời sản phẩm quản lý nhân sự Base HRM; tăng tỷ lệ active user hàng tháng (MAU) lên 45%.",
            "Associate Product Manager tại Sendo (2020 - 2022): Khảo sát người dùng, viết tài liệu PRD và điều phối sprint cùng đội ngũ kỹ thuật 15 người.",
        ],
        "projects": [
            "AI-Powered ATS Platform: Định nghĩa tính năng sàng lọc CV tự động và báo cáo insight ứng viên cho nhà tuyển dụng.",
            "Onboarding Experience Redesign: Tối ưu hóa luồng onboarding người dùng mới giúp tăng tỷ lệ kích hoạt 30%.",
        ],
    },
    {
        "full_name": "Ngo Thi Thu Ha",
        "email": "ha.ngo.qa@gmail.com",
        "phone": "0932109876",
        "title": "QA Automation Engineer (Playwright / Selenium / Pytest)",
        "target_job_slug": "topcv-qa-automation-test-engineer",
        "experience_years": 3,
        "education": "Đại học Quốc gia Hà Nội - Cử nhân Công nghệ Thông tin",
        "skills": ["Automation Testing", "Python", "Playwright", "Selenium", "Pytest", "API Testing (Postman)", "Jira", "CI/CD"],
        "summary": "Kỹ sư kiểm thử tự động với 3 năm kinh nghiệm xây dựng framework automation test cho Web và REST API. Đảm bảo chất lượng phần mềm và độ tin cậy của các hệ thống AI.",
        "experience": [
            "QA Automation Engineer tại Trusting Social (2022 - Hiện tại): Xây dựng framework Playwright + Python chạy tự động trên CI/CD; tự động hóa 80% kịch bản regression test.",
            "Manual QC tại VTI (2021 - 2022): Thiết kế test case, test plan chi tiết và kiểm thử chức năng cho các ứng dụng ngân hàng.",
        ],
        "projects": [
            "End-to-End Test Suite for ATS: Kịch bản test tự động luồng từ nộp CV, chấm điểm AI đến gửi email kết quả.",
            "API Load & Stress Testing: Đánh giá giới hạn chịu tải của hệ thống API bằng Postman và Locust.",
        ],
    },
    {
        "full_name": "Dang Tien Dat",
        "email": "dat.dang.uiux@gmail.com",
        "phone": "0981234567",
        "title": "Senior UI/UX Product Designer",
        "target_job_slug": "topcv-ui-ux-product-designer",
        "experience_years": 3,
        "education": "Đại học Mỹ thuật Công nghiệp - Cử nhân Thiết kế Đồ họa",
        "skills": ["Figma", "UI Design", "UX Research", "Design System", "Wireframing", "Prototyping", "User Journey", "HTML/CSS"],
        "summary": "Product Designer với 3 năm kinh nghiệm thiết kế giao diện Web/App tinh tế, chuẩn xác theo Design System và tối ưu hóa trải nghiệm người dùng.",
        "experience": [
            "UI/UX Designer tại Giao Hàng Tiết Kiệm (2022 - Hiện tại): Thiết kế ứng dụng Portal và Dashboard cho tài xế và khách hàng; xây dựng bộ Design System hơn 200 components.",
            "Graphic & UI Designer tại Clever Group (2021 - 2022): Thiết kế landing page và giao diện ứng dụng web marketing.",
        ],
        "projects": [
            "Candidate Portal & Recruiter Dashboard: Thiết kế giao diện toàn diện cho hệ sinh thái tuyển dụng thông minh P-164.",
            "Design System Foundation: Xây dựng bảng quy chuẩn màu sắc, typography và tương tác micro-animations.",
        ],
    },
    {
        "full_name": "Phan Gia Huy",
        "email": "huy.phan.flutter@gmail.com",
        "phone": "0971234567",
        "title": "Mobile Flutter Developer (iOS & Android)",
        "target_job_slug": "topcv-mobile-flutter-developer",
        "experience_years": 3,
        "education": "Đại học Bách Khoa Đà Nẵng - Kỹ sư CNTT",
        "skills": ["Flutter", "Dart", "BLoC Pattern", "REST API", "Firebase", "App Store Publishing", "Git"],
        "summary": "Mobile Developer với 3 năm kinh nghiệm phát triển ứng dụng di động đa nền tảng Flutter. Đã có 3 ứng dụng phát hành trên cả App Store và Google Play.",
        "experience": [
            "Flutter Developer tại Enouvo IT Solutions (2022 - Hiện tại): Phát triển ứng dụng đặt lịch và thương mại điện tử bằng Flutter và BLoC; tối ưu 60 FPS mượt mà.",
            "Junior Mobile Dev tại Axon Active (2021 - 2022): Xây dựng giao diện và tích hợp Firebase Auth, Push Notification.",
        ],
        "projects": [
            "Job Finder Mobile App: Ứng dụng tìm kiếm việc làm và nộp CV nhanh bằng Flutter.",
            "Real-time Chat & Video Call App: Ứng dụng phỏng vấn trực tuyến tích hợp WebRTC.",
        ],
    },
    {
        "full_name": "Nguyen Tuan Anh",
        "email": "tuananh.intern.ai@gmail.com",
        "phone": "0961234567",
        "title": "Thực tập sinh Kỹ sư AI / Python (Intern)",
        "target_job_slug": "topcv-intern-python-ai-engineer",
        "experience_years": 0,
        "education": "Đại học Bách Khoa Hà Nội - Sinh viên năm 4 ngành Trí tuệ Nhân tạo (GPA 3.5/4.0)",
        "skills": ["Python", "OOP", "Basic SQL", "Git", "FastAPI basics", "Machine Learning basics", "LangChain basics"],
        "summary": "Sinh viên năm cuối ngành Trí tuệ nhân tạo ĐHBK Hà Nội. Đam mê nghiên cứu các mô hình LLM, LangChain và phát triển phần mềm Backend với Python/FastAPI. Tìm kiếm vị trí thực tập để cống hiến và học hỏi.",
        "experience": [
            "Nghiên cứu sinh tại Lab AI Bách Khoa (2023 - 2024): Tham gia đề tài nghiên cứu trích xuất thông tin tự động từ văn bản tiếng Việt; đạt giải Ba NCKH cấp Trường.",
        ],
        "projects": [
            "Simple AI Chatbot with FastAPI: Chatbot tư vấn tuyển sinh sử dụng OpenAI API và Streamlit.",
            "CV Information Extractor: Script Python bóc tách email, số điện thoại và kỹ năng từ file PDF CV.",
        ],
    },
    {
        "full_name": "Do Thi Ngoc Anh",
        "email": "ngocanh.intern.fe@gmail.com",
        "phone": "0951234567",
        "title": "Thực tập sinh Lập trình Web Frontend (Intern)",
        "target_job_slug": "topcv-intern-frontend-web-developer",
        "experience_years": 0,
        "education": "Đại học Công nghệ - ĐHQGHN - Sinh viên năm 4 ngành CNTT",
        "skills": ["HTML5/CSS3", "JavaScript", "TypeScript", "Angular basics", "Responsive Design", "Git", "Figma"],
        "summary": "Sinh viên năm cuối đam mê phát triển giao diện Web với Angular và TypeScript. Nắm chắc kiến thức nền tảng HTML/CSS và khả năng học hỏi công nghệ mới nhanh chóng.",
        "experience": [
            "Thành viên CLB Lập trình UET Code Club (2022 - 2024): Tham gia phát triển website sự kiện của trường; quản lý mã nguồn bằng Git/GitHub.",
        ],
        "projects": [
            "Portfolio Website cá nhân: Trang web giới thiệu dự án chuẩn responsive với CSS Flexbox/Grid.",
            "Mini Job Board Web App: Ứng dụng web hiển thị danh sách việc làm và bộ lọc ngành nghề bằng Angular.",
        ],
    }
]


def generate_pdf_resume(candidate: dict) -> bytes:
    """Generate a clean, structured PDF resume document in memory."""
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)  # A4 size in points

    # Header Box Background
    rect_header = pymupdf.Rect(30, 30, 565, 115)
    page.draw_rect(rect_header, color=(0.12, 0.23, 0.36), fill=(0.94, 0.96, 0.98), width=1)

    # Header Text
    page.insert_text((45, 60), candidate["full_name"].upper(), fontsize=18, color=(0.1, 0.2, 0.35))
    page.insert_text((45, 80), candidate["title"], fontsize=12, color=(0.2, 0.4, 0.6))
    page.insert_text((45, 100), f"Email: {candidate['email']}  |  Phone: {candidate['phone']}", fontsize=10, color=(0.3, 0.3, 0.3))

    y = 145

    # 1. SUMMARY
    page.insert_text((35, y), "I. MỤC TIÊU NGHỀ NGHIỆP & TÓM TẮT BẢN THÂN", fontsize=11, color=(0.1, 0.2, 0.4))
    page.draw_line((35, y + 4), (560, y + 4), color=(0.7, 0.7, 0.7), width=0.8)
    y += 20
    summary_rect = pymupdf.Rect(40, y, 555, y + 45)
    page.insert_textbox(summary_rect, candidate["summary"], fontsize=9.5, color=(0.2, 0.2, 0.2))
    y += 55

    # 2. TECHNICAL SKILLS
    page.insert_text((35, y), "II. KỸ NĂNG CHUYÊN MÔN (TECHNICAL SKILLS)", fontsize=11, color=(0.1, 0.2, 0.4))
    page.draw_line((35, y + 4), (560, y + 4), color=(0.7, 0.7, 0.7), width=0.8)
    y += 20
    skills_text = " • " + "   • ".join(candidate["skills"])
    skills_rect = pymupdf.Rect(40, y, 555, y + 40)
    page.insert_textbox(skills_rect, skills_text, fontsize=9.5, color=(0.15, 0.15, 0.15))
    y += 45

    # 3. WORK EXPERIENCE
    page.insert_text((35, y), "III. KINH NGHIỆM LÀM VIỆC (WORK EXPERIENCE)", fontsize=11, color=(0.1, 0.2, 0.4))
    page.draw_line((35, y + 4), (560, y + 4), color=(0.7, 0.7, 0.7), width=0.8)
    y += 20
    for exp in candidate["experience"]:
        exp_rect = pymupdf.Rect(40, y, 555, y + 45)
        page.insert_textbox(exp_rect, f"▶ {exp}", fontsize=9, color=(0.2, 0.2, 0.2))
        y += 50

    # 4. PROJECTS
    page.insert_text((35, y), "IV. DỰ ÁN TIÊU BIỂU (FEATURED PROJECTS)", fontsize=11, color=(0.1, 0.2, 0.4))
    page.draw_line((35, y + 4), (560, y + 4), color=(0.7, 0.7, 0.7), width=0.8)
    y += 20
    for proj in candidate["projects"]:
        proj_rect = pymupdf.Rect(40, y, 555, y + 35)
        page.insert_textbox(proj_rect, f"★ {proj}", fontsize=9, color=(0.2, 0.2, 0.2))
        y += 40

    # 5. EDUCATION
    page.insert_text((35, y), "V. HỌC VẤN & BẰNG CẤP (EDUCATION)", fontsize=11, color=(0.1, 0.2, 0.4))
    page.draw_line((35, y + 4), (560, y + 4), color=(0.7, 0.7, 0.7), width=0.8)
    y += 20
    page.insert_text((40, y), f"🎓 {candidate['education']}", fontsize=9.5, color=(0.2, 0.2, 0.2))

    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def main():
    print("\n=======================================================")
    print("STARTING IT RESUME GENERATION & STORAGE SEEDING...")
    print("=======================================================\n")

    storage = get_storage_service()
    now = datetime.now(UTC)

    with SyncSessionLocal() as db:
        uploaded_resumes = 0
        created_candidates = 0
        created_applications = 0

        for cand_data in CANDIDATES_DATASET:
            email = cand_data["email"]

            # 1. Get or create Candidate User
            user = db.scalar(select(User).where(User.email == email))
            if user is None:
                user = User(
                    email=email,
                    password_hash=get_password_hash("Candidate123!"),
                    full_name=cand_data["full_name"],
                    phone=cand_data["phone"],
                    role="candidate",
                    is_active=True,
                    email_verified=True,
                    approval_status="approved",
                )
                db.add(user)
                db.flush()
                created_candidates += 1

            # 2. Find target job
            job = db.scalar(select(Job).where(Job.slug == cand_data["target_job_slug"]))
            job_id = job.id if job else None

            # 3. Generate PDF resume
            pdf_bytes = generate_pdf_resume(cand_data)
            file_size = len(pdf_bytes)
            filename = f"CV_{cand_data['full_name'].replace(' ', '_')}_{cand_data['title'].split()[0]}.pdf"
            minio_path = f"{user.id}/{uuid.uuid4()}.pdf"

            # 4. Upload to Supabase Storage Bucket
            storage.s3_client.put_object(
                Bucket=storage.bucket,
                Key=minio_path,
                Body=pdf_bytes,
                ContentType="application/pdf",
            )
            uploaded_resumes += 1

            # Raw text content for AI screening
            raw_text = f"""CURRICULUM VITAE
Họ và tên: {cand_data['full_name']}
Vị trí ứng tuyển: {cand_data['title']}
Email: {cand_data['email']} | Số điện thoại: {cand_data['phone']}

Tóm tắt chuyên môn:
{cand_data['summary']}

Kỹ năng:
{', '.join(cand_data['skills'])}

Kinh nghiệm làm việc ({cand_data['experience_years']} năm):
{chr(10).join(cand_data['experience'])}

Dự án tiêu biểu:
{chr(10).join(cand_data['projects'])}

Học vấn:
{cand_data['education']}
"""

            # 5. Create Resume Record in DB
            resume = Resume(
                candidate_id=user.id,
                job_id=job_id,
                original_filename=filename,
                minio_path=minio_path,
                file_size=file_size,
                content_type="application/pdf",
                raw_text=raw_text,
                is_default=True,
            )
            db.add(resume)
            db.flush()

            # 6. Create Application if job exists
            if job_id:
                app_record = db.scalar(
                    select(Application).where(
                        Application.job_id == job_id,
                        Application.candidate_id == user.id,
                    )
                )
                if app_record is None:
                    app_record = Application(
                        job_id=job_id,
                        candidate_id=user.id,
                        resume_id=resume.id,
                        cover_letter=f"Kính gửi Quý công ty, tôi là {cand_data['full_name']}, xin nộp hồ sơ ứng tuyển vị trí {cand_data['title']}.",
                        status="submitted",
                        public_status="in_review",
                    )
                    db.add(app_record)
                    created_applications += 1

        db.commit()

        print("=======================================================")
        print("SUCCESSFULLY SEEDED IT CANDIDATE RESUMES TO SUPABASE!")
        print(f"  - Candidates created / updated: {len(CANDIDATES_DATASET)}")
        print(f"  - Resumes uploaded to Storage: {uploaded_resumes}")
        print(f"  - Applications submitted: {created_applications}")
        print(f"  - Storage Bucket: {storage.bucket}")
        print(f"  - Public Storage URL Base: {storage.public_url_base}")
        print("=======================================================\n")


if __name__ == "__main__":
    main()
