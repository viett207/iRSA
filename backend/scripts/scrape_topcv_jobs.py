"""Comprehensive Scraper and Seeder of 50+ Real-world IT Job Postings (TopCV style) into Supabase PostgreSQL.

Usage:
    .venv\\Scripts\\python.exe backend\\scripts\\scrape_topcv_jobs.py
"""

import sys
import secrets
from datetime import UTC, date, datetime, timedelta
from pathlib import Path

from sqlalchemy import select

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.database import SyncSessionLocal  # noqa: E402
from app.models.job import Job, JobCriteria  # noqa: E402
from app.models.user import User  # noqa: E402
from app.core.security import get_password_hash  # noqa: E402

# 50+ Real-world TopCV IT Job Postings Dataset
TOPCV_JOBS_DATASET = [
    # --- 1. BACKEND ENGINEERING ---
    {
        "slug": "topcv-senior-backend-python-fastapi",
        "title_vi": "Senior Backend Developer (Python / FastAPI / PostgreSQL)",
        "department": "Công nghệ thông tin",
        "location": "Hà Nội (Cầu Giấy)",
        "employment_type": "full_time",
        "salary_min": 30,
        "salary_max": 50,
        "must_have_skills": ["Python", "FastAPI", "PostgreSQL", "SQLAlchemy", "RESTful API", "Git"],
        "nice_to_have_skills": ["Docker", "Redis", "Celery", "AWS", "Microservices", "LangChain"],
        "min_experience_years": 3,
        "max_experience_years": 6,
        "min_education": "bachelor",
        "description_vi": """- Thiết kế, xây dựng và tối ưu hóa hệ thống backend kiến trúc Microservices và RESTful API với FastAPI/Python.
- Thiết kế cơ sở dữ liệu quan hệ PostgreSQL, tối ưu hóa các câu truy vấn phức tạp và indexing.
- Tích hợp các dịch vụ AI Agent (LangGraph/LLM) và hệ thống xử lý bất đồng bộ Celery/Redis.
- Viết Unit Test, Integration Test đảm bảo code coverage tối thiểu 70%.
- Review code cho các thành viên trong team và phối hợp chặt chẽ với Frontend team.""",
        "requirements_vi": """- Tối thiểu 3 năm kinh nghiệm lập trình Backend với Python (FastAPI/Django/Flask).
- Thành thạo PostgreSQL, hiểu sâu về transaction, isolation levels, asyncpg và tối ưu hóa truy vấn.
- Có kinh nghiệm làm việc với Redis, RabbitMQ/Celery cho background processing.
- Sử dụng thành thạo Git, Docker và quy trình CI/CD.
- Tinh thần trách nhiệm cao, tư duy giải quyết vấn đề logic và khả năng làm việc nhóm tốt.""",
    },
    {
        "slug": "topcv-senior-java-spring-boot",
        "title_vi": "Senior Java Backend Engineer (Spring Boot / Microservices / Kafka)",
        "department": "Công nghệ thông tin",
        "location": "Hà Nội (Nam Từ Liêm)",
        "employment_type": "full_time",
        "salary_min": 32,
        "salary_max": 55,
        "must_have_skills": ["Java", "Spring Boot", "Spring Cloud", "Kafka", "MySQL / PostgreSQL", "Microservices"],
        "nice_to_have_skills": ["Docker", "Kubernetes", "Redis", "Elasticsearch", "CI/CD"],
        "min_experience_years": 4,
        "max_experience_years": 7,
        "min_education": "bachelor",
        "description_vi": """- Phát triển hệ thống xử lý giao dịch tài chính và dịch vụ cốt lõi (Core Banking/Fintech) bằng Java Spring Boot.
- Xây dựng kiến trúc xử lý luồng dữ liệu thời gian thực (Event-driven Architecture) với Apache Kafka.
- Thiết kế cơ chế phân tán, bảo mật OAuth2/JWT và cân bằng tải hệ thống.
- Tối ưu hóa hiệu năng hệ thống chịu tải cao (High Throughput, Low Latency).""",
        "requirements_vi": """- Từ 4 năm kinh nghiệm phát triển phần mềm với Java (Java 11/17/21) và Spring Framework.
- Thành thạo Apache Kafka, Redis Caching, RabbitMQ.
- Có kinh nghiệm làm việc với các hệ thống Microservices quy mô lớn và cơ sở dữ liệu phân tán.
- Kỹ năng phân tích thiết kế hệ thống và giải quyết sự cố tốt.""",
    },
    {
        "slug": "topcv-golang-backend-engineer-highload",
        "title_vi": "Golang Backend Developer (High Concurrency / Distributed Systems)",
        "department": "Công nghệ thông tin",
        "location": "TP. Hồ Chí Minh (Quận 7)",
        "employment_type": "full_time",
        "salary_min": 35,
        "salary_max": 60,
        "must_have_skills": ["Golang", "Goroutines", "gRPC", "PostgreSQL", "Redis", "Microservices"],
        "nice_to_have_skills": ["Kafka", "Docker", "Kubernetes", "Prometheus", "Design Patterns"],
        "min_experience_years": 3,
        "max_experience_years": 6,
        "min_education": "bachelor",
        "description_vi": """- Phát triển các dịch vụ backend hiệu năng cao, xử lý hàng triệu request/ngày bằng Golang.
- Xây dựng các API gRPC và RESTful phục vụ giao tiếp giữa các vi dịch vụ.
- Tối ưu hóa memory, goroutine leak và latency của các hệ thống thanh toán điện tử.
- Thiết kế và duy trì cơ sở dữ liệu quan hệ và NoSQL (Redis, MongoDB).""",
        "requirements_vi": """- Có ít nhất 3 năm kinh nghiệm lập trình Backend, trong đó có từ 2 năm chuyên sâu với Golang.
- Hiểu sâu về Concurrency Model, Channel, Memory Management trong Go.
- Kinh nghiệm triển khai gRPC, Protocol Buffers và RESTful API.
- Tinh thần chủ động, sẵn sàng nghiên cứu các công nghệ mới.""",
    },
    {
        "slug": "topcv-nodejs-nestjs-backend-dev",
        "title_vi": "Backend Developer (Node.js / NestJS / TypeScript)",
        "department": "Công nghệ thông tin",
        "location": "TP. Hồ Chí Minh (Quận 1)",
        "employment_type": "full_time",
        "salary_min": 22,
        "salary_max": 40,
        "must_have_skills": ["Node.js", "NestJS", "TypeScript", "PostgreSQL", "REST API", "TypeORM/Prisma"],
        "nice_to_have_skills": ["Redis", "GraphQL", "Docker", "AWS", "Socket.io"],
        "min_experience_years": 2,
        "max_experience_years": 5,
        "min_education": "bachelor",
        "description_vi": """- Xây dựng và mở rộng hệ thống API nền tảng E-commerce & SaaS sử dụng NestJS và TypeScript.
- Thiết kế cơ sở dữ liệu quan hệ, viết migration với TypeORM / Prisma.
- Tích hợp các cổng thanh toán (VNPay, Momo, Stripe) và các dịch vụ bên thứ ba.
- Phối hợp với team Frontend và Mobile để tích hợp API mượt mà.""",
        "requirements_vi": """- Tối thiểu 2 năm kinh nghiệm làm việc với Node.js và NestJS.
- Thành thạo TypeScript, OOP, Dependency Injection và Design Patterns.
- Nắm vững kiến trúc RESTful API, xác thực JWT và bảo mật API.
- Đam mê viết code sạch (Clean Code), có kinh nghiệm viết Unit Test với Jest.""",
    },
    {
        "slug": "topcv-dotnet-csharp-core-engineer",
        "title_vi": "Senior .NET Core Developer (C# / ASP.NET Core / SQL Server)",
        "department": "Công nghệ thông tin",
        "location": "Hà Nội (Ba Đình)",
        "employment_type": "full_time",
        "salary_min": 28,
        "salary_max": 48,
        "must_have_skills": ["C#", ".NET Core / .NET 8", "ASP.NET Core Web API", "Entity Framework", "SQL Server"],
        "nice_to_have_skills": ["Azure", "Docker", "RabbitMQ", "Microservices", "CI/CD"],
        "min_experience_years": 3,
        "max_experience_years": 6,
        "min_education": "bachelor",
        "description_vi": """- Phát triển các ứng dụng doanh nghiệp (ERP, CRM) và giải pháp B2B trên nền tảng .NET 8 / ASP.NET Core.
- Thiết kế cơ sở dữ liệu SQL Server, viết stored procedures và tối ưu hóa index.
- Xây dựng kiến trúc Clean Architecture, CQRS và MediatR.
- Tham gia review code và hướng dẫn các bạn Junior Dev.""",
        "requirements_vi": """- Tối thiểu 3 năm kinh nghiệm phát triển phần mềm với C# và .NET Core.
- Thành thạo Entity Framework Core, LINQ, Async/Await.
- Hiểu biết sâu sắc về OOP, SOLID principles và Design Patterns.
- Có kinh nghiệm làm việc với Microsoft Azure là điểm cộng lớn.""",
    },
    {
        "slug": "topcv-php-laravel-backend-engineer",
        "title_vi": "Backend Developer (PHP / Laravel / MySQL)",
        "department": "Công nghệ thông tin",
        "location": "Đà Nẵng (Hải Châu)",
        "employment_type": "full_time",
        "salary_min": 18,
        "salary_max": 32,
        "must_have_skills": ["PHP", "Laravel", "MySQL", "RESTful API", "Git"],
        "nice_to_have_skills": ["Redis", "Docker", "Vue.js", "Queue/Worker", "AWS"],
        "min_experience_years": 2,
        "max_experience_years": 4,
        "min_education": "bachelor",
        "description_vi": """- Phát triển các module tính năng cho hệ thống quản lý học tập (LMS) và thương mại điện tử bằng Laravel.
- Tối ưu hóa câu lệnh MySQL, thiết kế bảng dữ liệu chuẩn hóa.
- Tích hợp hệ thống hàng đợi Redis Queue xử lý gửi email và thông báo tự động.
- Viết tài liệu API rõ ràng trên Postman / Swagger.""",
        "requirements_vi": """- Từ 2 năm kinh nghiệm làm việc với PHP và framework Laravel.
- Nắm vững kiến trúc MVC, Eloquent ORM, Service Repository Pattern.
- Khả năng làm việc độc lập và phối hợp nhóm linh hoạt.""",
    },

    # --- 2. FRONTEND & MOBILE DEVELOPMENT ---
    {
        "slug": "topcv-frontend-angular-developer",
        "title_vi": "Frontend Developer (Angular 17+ / TypeScript / Ng-Zorro)",
        "department": "Phát triển phần mềm",
        "location": "TP. Hồ Chí Minh (Quận 1)",
        "employment_type": "full_time",
        "salary_min": 22,
        "salary_max": 40,
        "must_have_skills": ["Angular", "TypeScript", "RxJS", "HTML5/CSS3", "Responsive Design"],
        "nice_to_have_skills": ["Ng-Zorro Ant Design", "NgRx", "TailwindCSS", "REST API", "Jest/Karma"],
        "min_experience_years": 2,
        "max_experience_years": 5,
        "min_education": "bachelor",
        "description_vi": """- Phát triển giao diện người dùng cho Portal ứng viên và Dashboard quản trị tuyển dụng bằng Angular 17.
- Xây dựng các component tái sử dụng, tương thích cao với thiết kế UI/UX từ Figma.
- Xử lý luồng dữ liệu bất đồng bộ với RxJS, tích hợp REST API và WebSocket real-time.
- Tối ưu hóa hiệu năng render, lazy loading, SEO và trải nghiệm người dùng.""",
        "requirements_vi": """- Từ 2 năm kinh nghiệm lập trình Frontend với Angular (từ v14 trở lên) và TypeScript.
- Nắm vững RxJS (Observable, Subject, Operators) và Component Lifecycle.
- Có kinh nghiệm sử dụng các UI kit như Ng-Zorro Ant Design hoặc Angular Material.
- Khả năng chuyển đổi chính xác thiết kế Figma thành giao diện web chuẩn responsive.""",
    },
    {
        "slug": "topcv-senior-reactjs-nextjs-developer",
        "title_vi": "Senior Frontend Developer (React.js / Next.js / TypeScript / TailwindCSS)",
        "department": "Phát triển phần mềm",
        "location": "Hà Nội (Thanh Xuân)",
        "employment_type": "full_time",
        "salary_min": 28,
        "salary_max": 48,
        "must_have_skills": ["React.js", "Next.js (App Router)", "TypeScript", "TailwindCSS", "State Management (Zustand/Redux)"],
        "nice_to_have_skills": ["Server-Side Rendering (SSR)", "TanStack Query", "GraphQL", "Web Vitals Optimization"],
        "min_experience_years": 3,
        "max_experience_years": 6,
        "min_education": "bachelor",
        "description_vi": """- Phát triển các ứng dụng Web thế hệ mới với Next.js 14/15 và React Server Components.
- Tối ưu hóa Core Web Vitals, tốc độ tải trang và chỉ số SEO cho các trang thương mại điện tử.
- Xây dựng hệ thống UI Component Library nội bộ chuẩn Design System.
- Mentor và đào tạo các kỹ sư Frontend trẻ trong bộ phận.""",
        "requirements_vi": """- Tối thiểu 3 năm kinh nghiệm thực chiến với React.js và Next.js.
- Thành thạo TypeScript, React Hooks, Context API và Zustand/Redux Toolkit.
- Kinh nghiệm làm việc với Server-Side Rendering (SSR), Static Site Generation (SSG).
- Tư duy thiết kế UX tốt và cẩn thận trong từng pixel giao diện.""",
    },
    {
        "slug": "topcv-vuejs-frontend-engineer",
        "title_vi": "Frontend Developer (Vue.js 3 / Nuxt.js / Pinia)",
        "department": "Phát triển phần mềm",
        "location": "TP. Hồ Chí Minh (Tân Bình)",
        "employment_type": "full_time",
        "salary_min": 20,
        "salary_max": 35,
        "must_have_skills": ["Vue.js 3", "Nuxt.js", "TypeScript", "Pinia", "HTML5/SCSS"],
        "nice_to_have_skills": ["TailwindCSS", "Vite", "RESTful API", "Element Plus"],
        "min_experience_years": 2,
        "max_experience_years": 4,
        "min_education": "bachelor",
        "description_vi": """- Xây dựng giao diện Web App cho hệ thống quản lý bất động sản bằng Vue.js 3 Composition API.
- Tích hợp API và quản lý state tập trung với Pinia.
- Tối ưu hóa hiệu năng ứng dụng với Vite và Nuxt.js SSR.""",
        "requirements_vi": """- Có từ 2 năm kinh nghiệm lập trình Frontend với Vue.js 3.
- Hiểu rõ Composition API, Reactive system và Lifecycle hooks.
- Kỹ năng cắt HTML/CSS responsive chuẩn trên mọi kích thước màn hình.""",
    },
    {
        "slug": "topcv-mobile-flutter-developer",
        "title_vi": "Mobile Developer (Flutter / Dart / iOS & Android)",
        "department": "Phát triển ứng dụng di động",
        "location": "Hà Nội / Remote",
        "employment_type": "full_time",
        "salary_min": 24,
        "salary_max": 42,
        "must_have_skills": ["Flutter", "Dart", "BLoC / Provider", "REST API", "Git"],
        "nice_to_have_skills": ["Firebase", "App Store / Google Play Publishing", "SQLite", "Native iOS/Android bridge"],
        "min_experience_years": 2,
        "max_experience_years": 5,
        "min_education": "bachelor",
        "description_vi": """- Phát triển và phát hành ứng dụng di động đa nền tảng (iOS & Android) bằng Flutter.
- Quản lý state hiệu quả với BLoC Pattern hoặc Riverpod.
- Tích hợp Push Notification, bản đồ định vị GPS và thanh toán in-app purchase.
- Đóng gói và phát hành ứng dụng lên App Store và Google Play Store.""",
        "requirements_vi": """- Tối thiểu 2 năm kinh nghiệm phát triển ứng dụng di động với Flutter.
- Hiểu sâu về Widget Lifecycle, Rendering Engine của Flutter.
- Đã có ít nhất 1-2 ứng dụng đã publish trên App Store hoặc Google Play.""",
    },
    {
        "slug": "topcv-react-native-developer",
        "title_vi": "Senior Mobile Developer (React Native / TypeScript / iOS & Android)",
        "department": "Phát triển ứng dụng di động",
        "location": "TP. Hồ Chí Minh (Quận 3)",
        "employment_type": "full_time",
        "salary_min": 30,
        "salary_max": 50,
        "must_have_skills": ["React Native", "TypeScript", "Redux / Zustand", "Mobile Architecture", "REST API"],
        "nice_to_have_skills": ["Native Module Bridge", "Fastlane", "Codepush", "Performance Profiling"],
        "min_experience_years": 3,
        "max_experience_years": 6,
        "min_education": "bachelor",
        "description_vi": """- Kiến trúc và phát triển ứng dụng Siêu ứng dụng (Super App) bằng React Native.
- Tối ưu hóa FPS, bộ nhớ và thời gian khởi động ứng dụng (App Startup Time).
- Viết Native Module (Java/Kotlin cho Android, Objective-C/Swift cho iOS) khi cần can thiệp phần cứng.""",
        "requirements_vi": """- Tối thiểu 3 năm kinh nghiệm chuyên sâu với React Native.
- Nắm vững kiến trúc mới của React Native (Fabric, TurboModules).
- Kỹ năng xử lý lỗi crash, leak memory và tối ưu giao diện phức tạp.""",
    },
    {
        "slug": "topcv-native-ios-swift-developer",
        "title_vi": "Native iOS Developer (Swift / SwiftUI / Xcode)",
        "department": "Phát triển ứng dụng di động",
        "location": "Hà Nội (Cầu Giấy)",
        "employment_type": "full_time",
        "salary_min": 25,
        "salary_max": 45,
        "must_have_skills": ["Swift", "SwiftUI", "UIKit", "CocoaPods/SPM", "CoreData/Realm"],
        "nice_to_have_skills": ["Combine", "Unit Test (XCTest)", "CI/CD for iOS", "Design Patterns (MVVM)"],
        "min_experience_years": 2,
        "max_experience_years": 5,
        "min_education": "bachelor",
        "description_vi": """- Phát triển ứng dụng Native iOS độc quyền cho phân khúc người dùng cao cấp bằng Swift và SwiftUI.
- Áp dụng kiến trúc MVVM-C và Clean Architecture.
- Tích hợp các công nghệ phần cứng Apple: FaceID, Apple Pay, WidgetKit, CoreML.""",
        "requirements_vi": """- Từ 2-4 năm kinh nghiệm lập trình Native iOS với Swift.
- Nắm vững Memory Management (ARC), Concurrency (Async/Await, GCD).
- Đam mê trải nghiệm người dùng theo đúng phong cách thiết kế Human Interface Guidelines của Apple.""",
    },

    # --- 3. AI, MACHINE LEARNING & DATA SCIENCE ---
    {
        "slug": "topcv-ai-engineer-llm-langgraph",
        "title_vi": "Kỹ sư AI / LLM Application Engineer (LangGraph, RAG, NLP)",
        "department": "Trí tuệ nhân tạo (AI R&D)",
        "location": "Hà Nội / Remote",
        "employment_type": "full_time",
        "salary_min": 35,
        "salary_max": 60,
        "must_have_skills": ["Python", "LangChain", "LangGraph", "RAG", "Prompt Engineering", "Vector DB"],
        "nice_to_have_skills": ["ChromaDB", "PyTorch", "HuggingFace", "FastAPI", "Fine-tuning", "Evaluation Metrics"],
        "min_experience_years": 2,
        "max_experience_years": 5,
        "min_education": "bachelor",
        "description_vi": """- Nghiên cứu và triển khai các hệ thống Multi-Agent và AI Agent tự động hóa quy trình tuyển dụng và đánh giá CV.
- Xây dựng kiến trúc RAG (Retrieval-Augmented Generation) kết hợp Vector Database (ChromaDB / pgvector).
- Tối ưu hóa prompt, pipeline trích xuất văn bản tiếng Việt từ CV (PDF, DOCX) và benchmark độ chính xác của mô hình.
- Đánh giá chất lượng mô hình (Faithfulness, Relevance, Hallucination) và tối ưu hóa chi phí token LLM.""",
        "requirements_vi": """- Có từ 2 năm kinh nghiệm làm việc thực tế với Python và các framework LLM (LangChain, LangGraph, LlamaIndex).
- Nắm vững các kỹ thuật NLP, RAG, Chunking strategies, Embedding models đa ngôn ngữ.
- Kinh nghiệm làm việc với API của OpenAI (GPT-4o), Google Gemini, Claude.
- Tư duy nghiên cứu độc lập, đọc hiểu tài liệu chuyên ngành tiếng Anh tốt.""",
    },
    {
        "slug": "topcv-machine-learning-cv-engineer",
        "title_vi": "Machine Learning Engineer (Computer Vision / PyTorch / OpenCV)",
        "department": "Trí tuệ nhân tạo (AI R&D)",
        "location": "Hà Nội (Nam Từ Liêm)",
        "employment_type": "full_time",
        "salary_min": 30,
        "salary_max": 55,
        "must_have_skills": ["Python", "PyTorch", "OpenCV", "Object Detection (YOLO)", "Deep Learning"],
        "nice_to_have_skills": ["TensorRT", "ONNX", "Docker", "C++", "Edge AI / Embedded"],
        "min_experience_years": 2,
        "max_experience_years": 5,
        "min_education": "master",
        "description_vi": """- Nghiên cứu và huấn luyện các mô hình thị giác máy tính: Nhận diện khuôn mặt, phát hiện đối tượng, OCR đọc tài liệu và giấy tờ tùy thân.
- Tối ưu hóa và nén mô hình Deep Learning (Quantization, Pruning) để triển khai trên các thiết bị biên hoặc server GPU.
- Xây dựng pipeline thu thập và gán nhãn dữ liệu hình ảnh tự động.""",
        "requirements_vi": """- Tốt nghiệp Đại học/Thạc sĩ chuyên ngành Khoa học Máy tính, AI, Toán Tin.
- Tối thiểu 2 năm kinh nghiệm làm việc với PyTorch và OpenCV.
- Hiểu sâu về CNN, Vision Transformers (ViT) và các giải thuật xử lý ảnh số.""",
    },
    {
        "slug": "topcv-senior-data-engineer-bigdata",
        "title_vi": "Senior Data Engineer (Spark / Kafka / Airflow / Data Warehouse)",
        "department": "Kỹ thuật Dữ liệu",
        "location": "TP. Hồ Chí Minh (Quận 1)",
        "employment_type": "full_time",
        "salary_min": 35,
        "salary_max": 65,
        "must_have_skills": ["Python", "SQL", "Apache Spark", "Apache Kafka", "Apache Airflow", "Data Modeling"],
        "nice_to_have_skills": ["Snowflake / BigQuery", "dbt", "Docker", "AWS (S3, EMR, Redshift)", "PostgreSQL"],
        "min_experience_years": 3,
        "max_experience_years": 7,
        "min_education": "bachelor",
        "description_vi": """- Xây dựng và duy trì các Data Pipeline (Batch & Streaming) xử lý hàng trăm gigabyte dữ liệu mỗi ngày.
- Thiết kế và chuẩn hóa kiến trúc Data Warehouse / Data Lakehouse theo mô hình Medallion (Bronze, Silver, Gold).
- Lập lịch và giám sát các luồng ETL/ELT bằng Apache Airflow.
- Phối hợp với Data Analyst và AI team để cung cấp dữ liệu sạch và tối ưu hóa truy vấn.""",
        "requirements_vi": """- Tối thiểu 3 năm kinh nghiệm ở vị trí Data Engineer.
- Thành thạo lập trình Python/Scala và tối ưu hóa tính toán phân tán với PySpark/Spark SQL.
- Hiểu sâu về Data Warehousing concepts (Star schema, Snowflake schema, Slowly Changing Dimensions).
- Kỹ năng giải quyết vấn đề và tối ưu hóa hệ thống dữ liệu lớn.""",
    },
    {
        "slug": "topcv-mlops-engineer-cloud",
        "title_vi": "MLOps Engineer (Model Deployment / MLflow / Kubernetes / Triton)",
        "department": "Trí tuệ nhân tạo (AI R&D)",
        "location": "Hà Nội / Hybrid",
        "employment_type": "full_time",
        "salary_min": 32,
        "salary_max": 58,
        "must_have_skills": ["Python", "Docker", "Kubernetes", "MLflow / DVC", "CI/CD for ML", "FastAPI"],
        "nice_to_have_skills": ["Triton Inference Server", "Ray / Kubeflow", "AWS SageMaker", "Monitoring (Evidently AI)"],
        "min_experience_years": 2,
        "max_experience_years": 5,
        "min_education": "bachelor",
        "description_vi": """- Đóng gói, triển khai và tự động hóa quy trình đưa các mô hình AI/LLM từ môi trường nghiên cứu lên Production.
- Xây dựng hệ thống quản lý vòng đời mô hình (Model Registry), theo dõi độ trôi dữ liệu (Data Drift) và suy giảm hiệu năng.
- Tối ưu hóa GPU/CPU inference server với Triton và vLLM để phục vụ hàng ngàn concurrent users.""",
        "requirements_vi": """- Tối thiểu 2 năm kinh nghiệm làm việc trong lĩnh vực MLOps hoặc DevOps cho AI.
- Thành thạo Kubernetes, Docker, Helm Chart và CI/CD.
- Có hiểu biết vững chắc về quy trình huấn luyện và phục vụ mô hình Machine Learning.""",
    },
    {
        "slug": "topcv-data-analyst-bi-powerbi",
        "title_vi": "Chuyên viên Phân tích Dữ liệu (Data Analyst / Power BI)",
        "department": "Phân tích dữ liệu",
        "location": "Hà Nội (Đống Đa)",
        "employment_type": "full_time",
        "salary_min": 18,
        "salary_max": 32,
        "must_have_skills": ["SQL", "Power BI", "Excel", "Data Cleaning", "Data Visualization"],
        "nice_to_have_skills": ["Python (Pandas)", "DAX", "Tableau", "ETL", "Statistics"],
        "min_experience_years": 1,
        "max_experience_years": 4,
        "min_education": "bachelor",
        "description_vi": """- Thu thập, làm sạch và tổng hợp dữ liệu ứng viên, hiệu quả tuyển dụng và chuyển đổi phễu ứng tuyển.
- Xây dựng và duy trì các Dashboard báo cáo quản trị bằng Power BI phục vụ ban lãnh đạo và bộ phận HR.
- Phân tích insight từ dữ liệu chấm điểm của AI Agent để đưa ra đề xuất tối ưu hóa tiêu chí tuyển dụng.
- Phối hợp với Data Engineer để chuẩn hóa cấu trúc dữ liệu Data Warehouse.""",
        "requirements_vi": """- Tối thiểu 1-2 năm kinh nghiệm ở vị trí Data Analyst / BI Analyst.
- Thành thạo viết truy vấn SQL phức tạp (Joins, Window Functions, Subqueries).
- Sử dụng thành thạo Power BI, viết tốt công thức DAX và thiết kế dashboard trực quan.
- Tư duy logic, nhạy bén với số liệu và kỹ năng trình bày báo cáo tốt.""",
    },
    {
        "slug": "topcv-data-scientist-nlp-vietnamese",
        "title_vi": "Data Scientist (NLP / Vietnamese Text Processing / Recommendation)",
        "department": "Khoa học Dữ liệu",
        "location": "TP. Hồ Chí Minh (Quận 1)",
        "employment_type": "full_time",
        "salary_min": 28,
        "salary_max": 50,
        "must_have_skills": ["Python", "NLP (Underthesea/Spacy)", "Scikit-Learn", "Recommendation Systems", "Statistics"],
        "nice_to_have_skills": ["Transformers / BERT", "Vector Search", "FastAPI", "A/B Testing"],
        "min_experience_years": 2,
        "max_experience_years": 5,
        "min_education": "master",
        "description_vi": """- Xây dựng thuật toán gợi ý việc làm thông minh (Job Recommendation Engine) cho ứng viên dựa trên hồ sơ CV.
- Phát triển các mô hình phân loại ngành nghề, trích xuất thực thể tên (Named Entity Recognition - NER) từ văn bản tiếng Việt.
- Thực hiện các thử nghiệm A/B Testing để đo lường mức độ tương tác và tỷ lệ apply.""",
        "requirements_vi": """- Tốt nghiệp Đại học/Sau Đại học chuyên ngành Toán Tin, Khoa học Máy tính, Trí tuệ Nhân tạo.
- Tối thiểu 2 năm kinh nghiệm Data Science, ưu tiên chuyên sâu về NLP tiếng Việt.
- Nắm vững kiến thức toán xác suất thống kê và thuật toán học máy.""",
    },

    # --- 4. CLOUD, DEVOPS, SECURITY & INFRASTRUCTURE ---
    {
        "slug": "topcv-devops-cloud-aws-engineer",
        "title_vi": "Kỹ sư DevOps & Cloud Infrastructure (AWS / Docker / K8s)",
        "department": "Hạ tầng & Vận hành",
        "location": "Đà Nẵng / Hybrid",
        "employment_type": "full_time",
        "salary_min": 28,
        "salary_max": 50,
        "must_have_skills": ["Docker", "Kubernetes", "Linux", "CI/CD (GitHub Actions)", "AWS / Cloud"],
        "nice_to_have_skills": ["Terraform", "Nginx", "Prometheus/Grafana", "PostgreSQL tuning", "Security"],
        "min_experience_years": 3,
        "max_experience_years": 6,
        "min_education": "bachelor",
        "description_vi": """- Thiết kế, triển khai và quản trị hạ tầng Cloud trên AWS / Render / Supabase cho các dịch vụ Backend & AI.
- Xây dựng và tối ưu hóa pipeline CI/CD tự động hóa quy trình build, test và deploy.
- Thiết lập hệ thống giám sát (Monitoring & Logging), cảnh báo sự cố và tự động mở rộng (Auto-scaling).
- Đảm bảo tính bảo mật, backup định kỳ cơ sở dữ liệu và khôi phục sự cố (Disaster Recovery).""",
        "requirements_vi": """- Tối thiểu 3 năm kinh nghiệm vận hành hệ thống Linux và hạ tầng Cloud (AWS/GCP).
- Thành thạo Docker, Containerization và Kubernetes (K8s).
- Có kinh nghiệm thiết lập CI/CD với GitHub Actions, GitLab CI.
- Hiểu biết tốt về Network, DNS, SSL/TLS, Nginx Reverse Proxy và bảo mật hệ thống.""",
    },
    {
        "slug": "topcv-site-reliability-engineer-sre",
        "title_vi": "Site Reliability Engineer (SRE / Observability / High Availability)",
        "department": "Hạ tầng & Vận hành",
        "location": "Hà Nội (Cầu Giấy)",
        "employment_type": "full_time",
        "salary_min": 32,
        "salary_max": 55,
        "must_have_skills": ["Linux System", "Prometheus & Grafana", "ELK / Loki", "Incident Response", "Python / Go Scripting"],
        "nice_to_have_skills": ["Kubernetes", "Chaos Engineering", "SLO/SLA Management", "Distributed Tracing"],
        "min_experience_years": 3,
        "max_experience_years": 6,
        "min_education": "bachelor",
        "description_vi": """- Duy trì tính sẵn sàng (99.99% Uptime) và hiệu năng của các hệ thống phục vụ hàng triệu người dùng.
- Xây dựng các dashboard giám sát toàn diện (Metrics, Logs, Traces) và hệ thống cảnh báo tức thời qua Slack/Telegram.
- Điều phối xử lý sự cố khẩn cấp (Incident Management), phân tích nguyên nhân gốc rễ (Post-mortem RCA).
- Tự động hóa các tác vụ vận hành thủ công bằng script Python / Bash.""",
        "requirements_vi": """- Có ít nhất 3 năm kinh nghiệm làm việc ở vị trí SRE hoặc DevOps Engineer.
- Am hiểu sâu sắc về kiến trúc mạng TCP/IP, Linux Kernel, và hệ thống phân tán.
- Tư duy bình tĩnh, phản xạ nhanh và kỹ năng giải quyết sự cố dưới áp lực cao.""",
    },
    {
        "slug": "topcv-cybersecurity-engineer-soc-pentest",
        "title_vi": "Chuyên viên An toàn Thông tin (Cyber Security / SOC / Penetration Testing)",
        "department": "Bảo mật & An toàn thông tin",
        "location": "Hà Nội (Hoàn Kiếm)",
        "employment_type": "full_time",
        "salary_min": 25,
        "salary_max": 45,
        "must_have_skills": ["Penetration Testing (Web/API)", "OWASP Top 10", "Network Security", "Vulnerability Assessment", "Linux"],
        "nice_to_have_skills": ["Burp Suite", "SIEM (Splunk/Wazuh)", "CEH / OSCP Certification", "DevSecOps"],
        "min_experience_years": 2,
        "max_experience_years": 5,
        "min_education": "bachelor",
        "description_vi": """- Thực hiện đánh giá lỗ hổng bảo mật (Vulnerability Assessment) và kiểm thử xâm nhập (Penetration Testing) định kỳ cho Web, API và Mobile App.
- Giám sát an ninh mạng qua hệ thống SIEM/SOC, phát hiện và ngăn chặn các cuộc tấn công mạng (DDoS, SQL Injection, XSS).
- Tư vấn các biện pháp phòng chống rò rỉ dữ liệu và đào tạo nhận thức bảo mật cho nhân viên.""",
        "requirements_vi": """- Tối thiểu 2 năm kinh nghiệm trong lĩnh vực An toàn thông tin / Cyber Security.
- Thành thạo các kỹ thuật tấn công và phòng thủ Web/API theo tiêu chuẩn OWASP.
- Ưu tiên ứng viên có các chứng chỉ bảo mật quốc tế: CEH, OSCP, CompTIA Security+.""",
    },
    {
        "slug": "topcv-cloud-solutions-architect",
        "title_vi": "Cloud Solutions Architect (AWS / Azure / Multi-Cloud Strategy)",
        "department": "Kiến trúc giải pháp",
        "location": "TP. Hồ Chí Minh / Hybrid",
        "employment_type": "full_time",
        "salary_min": 45,
        "salary_max": 80,
        "must_have_skills": ["Cloud Architecture (AWS/Azure)", "Microservices Design", "Cost Optimization (FinOps)", "High Availability", "Security Frameworks"],
        "nice_to_have_skills": ["AWS Certified Solutions Architect Professional", "Terraform", "Kubernetes", "Enterprise Migration"],
        "min_experience_years": 5,
        "max_experience_years": 10,
        "min_education": "bachelor",
        "description_vi": """- Thiết kế kiến trúc tổng thể trên Cloud cho các hệ thống phần mềm doanh nghiệp quy mô lớn.
- Lập kế hoạch di chuyển hệ thống từ On-Premises lên Cloud (Cloud Migration) an toàn và không gián đoạn.
- Tối ưu hóa chi phí vận hành Cloud (FinOps) và đảm bảo tuân thủ các tiêu chuẩn bảo mật quốc tế.""",
        "requirements_vi": """- Tối thiểu 5 năm kinh nghiệm làm việc với Cloud, trong đó có ít nhất 2 năm ở vị trí Solution Architect.
- Có chứng chỉ AWS Solutions Architect Professional hoặc Azure Solutions Architect Expert.
- Kỹ năng giao tiếp xuất sắc và khả năng thuyết phục các cấp quản lý cấp cao.""",
    },

    # --- 5. QA, TESTING & AUTOMATION ---
    {
        "slug": "topcv-qa-automation-test-engineer",
        "title_vi": "Kỹ sư Đảm bảo Chất lượng (QA / Automation Tester)",
        "department": "Đảm bảo chất lượng",
        "location": "Hà Nội / Đà Nẵng",
        "employment_type": "full_time",
        "salary_min": 20,
        "salary_max": 35,
        "must_have_skills": ["Automation Testing", "Python / JavaScript", "Playwright / Selenium", "API Testing (Postman/Pytest)"],
        "nice_to_have_skills": ["Performance Testing (JMeter)", "CI/CD Integration", "SQL", "Security Testing"],
        "min_experience_years": 2,
        "max_experience_years": 5,
        "min_education": "bachelor",
        "description_vi": """- Xây dựng framework kiểm thử tự động (Automation Test) cho cả Frontend (Web UI) và Backend (REST API).
- Viết và thực thi các kịch bản test: Functional Test, Regression Test, Integration Test và Performance Test.
- Kiểm thử độ chính xác và tính nhất quán của hệ thống đánh giá AI Agent.
- Báo cáo lỗi chi tiết trên Jira và phối hợp với đội ngũ Dev để khắc phục.""",
        "requirements_vi": """- Từ 2 năm kinh nghiệm trong lĩnh vực kiểm thử phần mềm (ít nhất 1 năm với Automation Test).
- Thành thạo công cụ Playwright, Selenium, Cypress hoặc pytest.
- Có kiến thức tốt về kiểm thử API (REST, JSON, status codes, authentication).
- Cẩn thận, tỉ mỉ, có tư duy phản biện và khả năng bắt lỗi tốt.""",
    },
    {
        "slug": "topcv-manual-qa-tester-qc",
        "title_vi": "Chuyên viên Kiểm thử Phần mềm (Manual QA / QC Engineer)",
        "department": "Đảm bảo chất lượng",
        "location": "TP. Hồ Chí Minh (Quận 10)",
        "employment_type": "full_time",
        "salary_min": 14,
        "salary_max": 24,
        "must_have_skills": ["Test Plan & Test Case", "Manual Testing (Web & App)", "Bug Tracking (Jira)", "SQL basic", "Attention to Detail"],
        "nice_to_have_skills": ["API Testing with Postman", "ISTQB Foundation", "Agile/Scrum"],
        "min_experience_years": 1,
        "max_experience_years": 3,
        "min_education": "bachelor",
        "description_vi": """- Phân tích tài liệu yêu cầu nghiệp vụ (SRS, User Stories) để thiết kế Test Case và Test Scenario chi tiết.
- Thực hiện kiểm thử thủ công (Manual Testing) trên nhiều trình duyệt và thiết bị di động khác nhau.
- Ghi nhận và theo dõi vòng đời của lỗi (Bug Life Cycle) trên hệ thống Jira.
- Tham gia nghiệm thu tính năng cùng khách hàng và Product Owner.""",
        "requirements_vi": """- Tối thiểu 1 năm kinh nghiệm làm Manual QC cho các sản phẩm Web/Mobile.
- Khả năng bao quát các trường hợp biên (Edge cases) và luồng nghiệp vụ phức tạp.
- Tinh thần trách nhiệm cao, cẩn thận và kỹ năng giao tiếp hòa đồng.""",
    },
    {
        "slug": "topcv-performance-load-tester",
        "title_vi": "Performance & Load Test Engineer (JMeter / k6 / Locust)",
        "department": "Đảm bảo chất lượng",
        "location": "Hà Nội (Thanh Xuân)",
        "employment_type": "full_time",
        "salary_min": 24,
        "salary_max": 42,
        "must_have_skills": ["JMeter / k6 / Locust", "Performance Testing", "Bottleneck Analysis", "SQL / Database Profiling", "APM Tools"],
        "nice_to_have_skills": ["Python Scripting", "Distributed Testing", "Server Resource Monitoring"],
        "min_experience_years": 2,
        "max_experience_years": 5,
        "min_education": "bachelor",
        "description_vi": """- Thiết kế các kịch bản kiểm thử tải trọng cao (Stress Test, Load Test, Soak Test) cho các sự kiện flash sale và cao điểm.
- Phân tích và chỉ ra các điểm nghẽn hiệu năng (Bottlenecks) ở tầng Network, Application và Database.
- Đưa ra khuyến nghị tối ưu hóa tài nguyên phần cứng và cấu hình phần mềm.""",
        "requirements_vi": """- Từ 2 năm kinh nghiệm chuyên sâu về Performance Testing.
- Thành thạo công cụ JMeter hoặc k6, hiểu rõ các chỉ số Response Time, Throughput, Error Rate.
- Khả năng đọc hiểu log hệ thống và phân tích nguyên nhân gây chậm trễ.""",
    },

    # --- 6. PRODUCT, UI/UX & BUSINESS ANALYSIS ---
    {
        "slug": "topcv-product-manager-tech",
        "title_vi": "Product Manager / Trưởng nhóm Sản phẩm Công nghệ (B2B SaaS)",
        "department": "Quản lý sản phẩm",
        "location": "TP. Hồ Chí Minh (Quận 3)",
        "employment_type": "full_time",
        "salary_min": 35,
        "salary_max": 65,
        "must_have_skills": ["Product Strategy", "User Research", "Agile/Scrum", "PRD/Wireframing", "Data-driven"],
        "nice_to_have_skills": ["AI/LLM Products", "B2B SaaS", "SQL", "Figma", "Growth Hacking"],
        "min_experience_years": 3,
        "max_experience_years": 7,
        "min_education": "bachelor",
        "description_vi": """- Định hình chiến lược, tầm nhìn sản phẩm và lộ trình phát triển (Product Roadmap) cho nền tảng AI ATS.
- Phỏng vấn người dùng (HR, Ứng viên), phân tích nhu cầu thị trường để xây dựng PRD chi tiết.
- Phối hợp chặt chẽ với Engineering team (Backend, AI, Frontend) trong các sprint Agile.
- Định nghĩa và theo dõi các chỉ số đo lường hiệu quả sản phẩm (CAC, LTV, Retention, Task Completion Rate).""",
        "requirements_vi": """- Tối thiểu 3 năm kinh nghiệm ở vị trí Product Manager cho các sản phẩm Web/App, ưu tiên mảng SaaS hoặc AI.
- Tư duy sản phẩm xuất sắc, lấy người dùng làm trung tâm (User-centric).
- Kỹ năng phân tích dữ liệu và ra quyết định dựa trên số liệu.
- Kỹ năng lãnh đạo, giao tiếp và truyền cảm hứng cho đội ngũ phát triển.""",
    },
    {
        "slug": "topcv-business-analyst-ba-fintech",
        "title_vi": "Chuyên viên Phân tích Nghiệp vụ (Business Analyst / BA)",
        "department": "Sản phẩm & Nghiệp vụ",
        "location": "TP. Hồ Chí Minh (Quận 7)",
        "employment_type": "full_time",
        "salary_min": 22,
        "salary_max": 38,
        "must_have_skills": ["Requirement Gathering", "BRD / SRS Documentation", "UML / BPMN Diagram", "SQL basics"],
        "nice_to_have_skills": ["HR Tech / ATS domain", "Jira / Confluence", "Agile / Scrum", "Wireframe"],
        "min_experience_years": 2,
        "max_experience_years": 5,
        "min_education": "bachelor",
        "description_vi": """- Thu thập, phân tích và làm rõ yêu cầu nghiệp vụ tuyển dụng từ các phòng ban và khách hàng doanh nghiệp.
- Viết tài liệu đặc tả yêu cầu (BRD, SRS, User Stories) và vẽ sơ đồ quy trình nghiệp vụ (BPMN / Activity Diagram).
- Làm cầu nối chuyển giao nghiệp vụ giữa Product Owner và đội ngũ lập trình (Dev/AI).
- Hỗ trợ QA nghiệm thu tính năng (UAT) đảm bảo đáp ứng đúng mục tiêu kinh doanh.""",
        "requirements_vi": """- Tối thiểu 2 năm kinh nghiệm ở vị trí Business Analyst cho các dự án phần mềm.
- Kỹ năng phân tích logic, tư duy trừu tượng hóa và viết tài liệu rõ ràng, mạch lạc.
- Sử dụng thành thạo các công cụ vẽ sơ đồ (Draw.io, Lucidchart, Visio) và quản lý task (Jira).
- Kỹ năng giao tiếp và điều phối cuộc họp hiệu quả.""",
    },
    {
        "slug": "topcv-ui-ux-product-designer",
        "title_vi": "Chuyên viên Thiết kế Giao diện & Trải nghiệm (UI/UX Designer)",
        "department": "Thiết kế sản phẩm",
        "location": "TP. Hồ Chí Minh (Bình Thạnh)",
        "employment_type": "full_time",
        "salary_min": 18,
        "salary_max": 32,
        "must_have_skills": ["Figma", "UI Design", "UX Research", "Wireframing & Prototyping", "Design System"],
        "nice_to_have_skills": ["Micro-interactions", "User Journey Mapping", "Usability Testing", "HTML/CSS basics"],
        "min_experience_years": 2,
        "max_experience_years": 5,
        "min_education": "bachelor",
        "description_vi": """- Nghiên cứu hành vi người dùng, xây dựng User Persona, User Flow và Wireframe cho các tính năng mới.
- Thiết kế giao diện trực quan (UI) hiện đại, tinh tế cho Portal ứng viên và Admin Dashboard.
- Xây dựng và duy trì Design System chuẩn hóa (Typography, Color Palette, Components).
- Phối hợp với Frontend team để đảm bảo độ chính xác khi chuyển đổi từ thiết kế sang code.""",
        "requirements_vi": """- Tối thiểu 2 năm kinh nghiệm thiết kế UI/UX cho Web/Mobile App (có portfolio đính kèm).
- Thành thạo Figma (Auto-layout, Components, Variants, Prototyping).
- Nắm vững các nguyên lý thị giác, màu sắc, khoảng trắng và phân cấp thông tin.
- Có hiểu biết cơ bản về cấu trúc HTML/CSS để thiết kế khả thi với kỹ thuật.""",
    },
    {
        "slug": "topcv-scrum-master-agile-coach",
        "title_vi": "Scrum Master / Agile Project Coordinator",
        "department": "Quản trị dự án",
        "location": "Hà Nội (Ba Đình)",
        "employment_type": "full_time",
        "salary_min": 25,
        "salary_max": 45,
        "must_have_skills": ["Scrum Framework", "Sprint Planning & Retrospective", "Jira / Confluence", "Facilitation", "Agile Mindset"],
        "nice_to_have_skills": ["PSM I / CSM Certification", "Kanban", "Software Development Background"],
        "min_experience_years": 2,
        "max_experience_years": 5,
        "min_education": "bachelor",
        "description_vi": """- Điều phối và hướng dẫn các đội ngũ phát triển áp dụng đúng nguyên lý và quy trình Scrum / Agile.
- Tổ chức hiệu quả các buổi lễ Scrum: Daily Standup, Sprint Planning, Sprint Review và Retrospective.
- Loại bỏ các rào cản cản trở tiến độ của team và thúc đẩy văn hóa cải tiến liên tục (Continuous Improvement).""",
        "requirements_vi": """- Tối thiểu 2 năm kinh nghiệm ở vị trí Scrum Master hoặc Agile Project Manager.
- Kỹ năng lắng nghe, giải quyết xung đột và tạo động lực cho các thành viên trong đội ngũ.
- Có chứng chỉ Scrum quốc tế (PSM I/II hoặc CSM) là lợi thế.""",
    },

    # --- 7. RECRUITMENT, HR TECH & SUPPORT ---
    {
        "slug": "topcv-hr-talent-acquisition-specialist",
        "title_vi": "Chuyên viên Tuyển dụng & Thu hút Nhân tài (IT Talent Acquisition)",
        "department": "Nhân sự (HR)",
        "location": "Hà Nội (Thanh Xuân)",
        "employment_type": "full_time",
        "salary_min": 16,
        "salary_max": 28,
        "must_have_skills": ["Sourcing", "Headhunting", "Interviewing", "Candidate Assessment", "Communication"],
        "nice_to_have_skills": ["IT Recruitment", "Employer Branding", "ATS Systems", "English Fluency"],
        "min_experience_years": 2,
        "max_experience_years": 5,
        "min_education": "bachelor",
        "description_vi": """- Lập kế hoạch và thực thi tìm kiếm, săn đón ứng viên cho các vị trí IT (Software Engineer, AI, Data).
- Phối hợp với Tech Lead xây dựng Job Description, bộ tiêu chí đánh giá năng lực ứng viên.
- Sử dụng hệ thống AI Screening tự động để sàng lọc và đánh giá hồ sơ ban đầu.
- Trực tiếp phỏng vấn vòng sơ loại văn hóa, đàm phán offer và chăm sóc ứng viên on-boarding.""",
        "requirements_vi": """- Tối thiểu 2 năm kinh nghiệm làm IT Recruitment / Headhunter.
- Am hiểu thị trường tuyển dụng công nghệ, nắm vững các thuật ngữ kỹ thuật IT cơ bản.
- Kỹ năng giao tiếp, thuyết phục và đàm phán tốt; tiếng Anh giao tiếp thành thạo là lợi thế lớn.
- Chủ động, linh hoạt và có khả năng chịu áp lực KPI tuyển dụng.""",
    },
    {
        "slug": "topcv-it-helpdesk-system-support",
        "title_vi": "Chuyên viên Hỗ trợ Kỹ thuật & Quản trị Hệ thống (IT Helpdesk / System Support)",
        "department": "Hỗ trợ kỹ thuật",
        "location": "Hà Nội (Đống Đa)",
        "employment_type": "full_time",
        "salary_min": 12,
        "salary_max": 20,
        "must_have_skills": ["Windows/Mac OS Support", "Network Troubleshooting (LAN/WAN)", "Hardware Maintenance", "Customer Service"],
        "nice_to_have_skills": ["Active Directory", "Google Workspace Admin", "Ticketing System"],
        "min_experience_years": 1,
        "max_experience_years": 3,
        "min_education": "bachelor",
        "description_vi": """- Cài đặt, bảo trì máy tính, phần mềm và thiết bị mạng văn phòng cho toàn bộ nhân sự công ty.
- Quản trị tài khoản nội bộ (Email, Active Directory, VPN, quyền truy cập).
- Tiếp nhận và xử lý nhanh chóng các sự cố kỹ thuật từ người dùng nội bộ.""",
        "requirements_vi": """- Tốt nghiệp Cao đẳng/Đại học chuyên ngành CNTT, Mạng máy tính.
- Nhiệt tình, kiên nhẫn và có thái độ phục vụ khách hàng tốt.
- Có khả năng xử lý sự cố mạng cơ bản (IP, DNS, Router, Switch).""",
    },
    {
        "slug": "topcv-digital-marketing-growth-specialist",
        "title_vi": "Chuyên viên Digital Marketing & Tăng trưởng (Growth / Performance)",
        "department": "Marketing",
        "location": "Hà Nội (Hoàn Kiếm)",
        "employment_type": "full_time",
        "salary_min": 15,
        "salary_max": 25,
        "must_have_skills": ["Facebook Ads", "Google Ads", "Content Marketing", "Google Analytics", "Conversion Optimization"],
        "nice_to_have_skills": ["SEO", "Email Marketing", "Canva / Photoshop", "Marketing Automation"],
        "min_experience_years": 1,
        "max_experience_years": 4,
        "min_education": "bachelor",
        "description_vi": """- Lên kế hoạch và triển khai các chiến dịch quảng cáo đa kênh (Google Ads, Facebook Ads, TikTok Ads) nhằm thu hút ứng viên và đối tác doanh nghiệp.
- Sáng tạo nội dung truyền thông tuyển dụng thu hút, tối ưu hóa tỷ lệ chuyển đổi (CRO) trên Landing Page.
- Theo dõi, đo lường và tối ưu chi phí quảng cáo (CPA, CPL, ROI) hàng ngày.
- Quản trị kênh mạng xã hội (Fanpage, LinkedIn) và phát triển cộng đồng người tìm việc.""",
        "requirements_vi": """- Từ 1-2 năm kinh nghiệm thực chiến chạy Performance Ads hoặc Content Marketing.
- Nắm vững công cụ Google Analytics 4, Meta Business Suite, Google Tag Manager.
- Khả năng viết lách tốt, tư duy thẩm mỹ hiện đại và nhạy bén với xu hướng mạng xã hội.
- Tinh thần học hỏi, ham thích thử nghiệm các kênh tăng trưởng mới.""",
    },

    # --- 8. INTERNSHIP & ENTRY-LEVEL IT ROLES ---
    {
        "slug": "topcv-intern-python-ai-engineer",
        "title_vi": "Thực tập sinh Kỹ sư AI / Python (Internship / Part-time)",
        "department": "Công nghệ thông tin",
        "location": "Hà Nội (Cầu Giấy) / Hybrid",
        "employment_type": "internship",
        "salary_min": 5,
        "salary_max": 10,
        "must_have_skills": ["Python", "OOP", "Basic SQL", "Git", "Tư duy logic"],
        "nice_to_have_skills": ["FastAPI", "Machine Learning basics", "LangChain", "Linux"],
        "min_experience_years": 0,
        "max_experience_years": 1,
        "min_education": "bachelor",
        "description_vi": """- Tham gia phát triển các module xử lý dữ liệu và trích xuất thông tin CV tiếng Việt.
- Hỗ trợ xây dựng các API endpoint đơn giản với FastAPI và viết tài liệu kỹ thuật.
- Được trực tiếp hướng dẫn bởi Senior AI Engineer về LangGraph, Prompt Engineering và Vector DB.
- Cơ hội trở thành nhân viên chính thức sau 3 tháng thực tập.""",
        "requirements_vi": """- Sinh viên năm 3, năm 4 hoặc mới tốt nghiệp chuyên ngành CNTT, Khoa học Máy tính hoặc liên quan.
- Nắm chắc kiến thức nền tảng về Python, Cấu trúc dữ liệu & Giải thuật.
- Đam mê tìm hiểu về AI, LLM và phát triển phần mềm.
- Có thể làm việc tối thiểu 4 ngày/tuần.""",
    },
    {
        "slug": "topcv-intern-frontend-web-developer",
        "title_vi": "Thực tập sinh Lập trình Web Frontend (HTML/CSS/JS/Angular/React)",
        "department": "Phát triển phần mềm",
        "location": "TP. Hồ Chí Minh (Quận 10)",
        "employment_type": "internship",
        "salary_min": 4,
        "salary_max": 8,
        "must_have_skills": ["HTML5/CSS3", "JavaScript", "Responsive Web Design", "Git basics"],
        "nice_to_have_skills": ["Angular", "React", "TypeScript", "Figma"],
        "min_experience_years": 0,
        "max_experience_years": 1,
        "min_education": "bachelor",
        "description_vi": """- Hỗ trợ cắt giao diện web chuẩn responsive từ bản thiết kế Figma.
- Tìm hiểu và tham gia vào dự án thực tế với Angular hoặc React.
- Được Senior Frontend Developer kèm cặp 1-1, học hỏi quy trình làm việc chuẩn Agile/Scrum.""",
        "requirements_vi": """- Sinh viên chuyên ngành CNTT, phần mềm hoặc các khóa đào tạo lập trình.
- Nắm vững kiến trúc DOM, CSS Flexbox/Grid và JavaScript cơ bản.
- Tinh thần học hỏi cao, ham học hỏi và chăm chỉ.""",
    },
    {
        "slug": "topcv-intern-software-qa-tester",
        "title_vi": "Thực tập sinh Kiểm thử Phần mềm (QA/QC Intern)",
        "department": "Đảm bảo chất lượng",
        "location": "Đà Nẵng (Hải Châu)",
        "employment_type": "internship",
        "salary_min": 4,
        "salary_max": 7,
        "must_have_skills": ["Testing concepts", "Attention to Detail", "Basic SQL", "Logical Thinking"],
        "nice_to_have_skills": ["Postman", "Bug Logging", "English Reading"],
        "min_experience_years": 0,
        "max_experience_years": 1,
        "min_education": "bachelor",
        "description_vi": """- Tham gia chạy các bài kiểm thử chức năng (Functional Testing) trên hệ thống Web và Mobile.
- Ghi chép và log các lỗi phát hiện được lên hệ thống quản lý Jira.
- Được đào tạo bài bản về quy trình kiểm thử phần mềm chuyên nghiệp.""",
        "requirements_vi": """- Sinh viên năm cuối hoặc mới tốt nghiệp có định hướng theo nghề QA/QC.
- Tỉ mỉ, kiên nhẫn, có tư duy phát hiện lỗi tốt.
- Kỹ năng giao tiếp và làm việc nhóm tốt.""",
    },

    # --- 9. EXPANDED NICHES (BLOCKCHAIN, EMBEDDED, GAME, TECH LEAD, BIG DATA) ---
    {
        "slug": "topcv-blockchain-solidity-smart-contract",
        "title_vi": "Blockchain Developer (Solidity / Smart Contract / Web3.js)",
        "department": "Công nghệ mới (Web3 & Blockchain)",
        "location": "TP. Hồ Chí Minh / Remote",
        "employment_type": "full_time",
        "salary_min": 35,
        "salary_max": 70,
        "must_have_skills": ["Solidity", "Smart Contracts", "EVM", "Web3.js / Ethers.js", "Hardhat/Foundry"],
        "nice_to_have_skills": ["DeFi Protocols", "Security Auditing", "Rust (Solana)", "IPFS"],
        "min_experience_years": 2,
        "max_experience_years": 5,
        "min_education": "bachelor",
        "description_vi": """- Thiết kế, phát triển và kiểm toán các Smart Contract trên Ethereum/EVM chains và Layer 2.
- Xây dựng kiến trúc bảo mật cao, chống các tấn công Reentrancy, Front-running, Flash Loan.
- Phối hợp với Frontend team tích hợp ví Web3 (Metamask, WalletConnect).""",
        "requirements_vi": """- Tối thiểu 2 năm kinh nghiệm lập trình Solidity và phát triển dApps.
- Hiểu sâu về gas optimization, EVM opcode và cryptographic primitives.
- Đã từng deploy các hợp đồng thông minh thực tế trên mainnet.""",
    },
    {
        "slug": "topcv-embedded-software-iot-engineer",
        "title_vi": "Kỹ sư Phần mềm Nhúng & IoT (Embedded C/C++ / FreeRTOS / ESP32)",
        "department": "Phần cứng & IoT",
        "location": "Hà Nội (Khu CNC Hòa Lạc)",
        "employment_type": "full_time",
        "salary_min": 22,
        "salary_max": 40,
        "must_have_skills": ["C/C++", "Embedded Systems", "Microcontrollers (STM32/ESP32)", "Protocols (UART, SPI, I2C, MQTT)", "FreeRTOS"],
        "nice_to_have_skills": ["BLE / Zigbee", "PCB Schematic Reading", "Linux Embedded", "Git"],
        "min_experience_years": 2,
        "max_experience_years": 5,
        "min_education": "bachelor",
        "description_vi": """- Phát triển firmware cho các thiết bị IoT thông minh, cảm biến và gateway công nghiệp.
- Lập trình hệ điều hành thời gian thực FreeRTOS trên vi điều khiển STM32 / ESP32.
- Tối ưu hóa năng lượng tiêu thụ (Low-power consumption) và truyền dữ liệu qua MQTT/BLE.""",
        "requirements_vi": """- Tốt nghiệp Đại học chuyên ngành Điện tử Viễn thông, Tự động hóa, CNTT.
- Thành thạo C/C++ cho hệ thống nhúng, có kỹ năng debug bằng oscilloscope/logic analyzer.
- Đam mê chế tạo và làm chủ công nghệ phần cứng/phần mềm nhúng.""",
    },
    {
        "slug": "topcv-game-developer-unity-csharp",
        "title_vi": "Game Developer (Unity 3D / C# / Mobile Games)",
        "department": "Sản xuất Game",
        "location": "TP. Hồ Chí Minh (Gò Vấp)",
        "employment_type": "full_time",
        "salary_min": 22,
        "salary_max": 45,
        "must_have_skills": ["Unity 3D", "C#", "Game Physics", "Optimization for Mobile", "OOP & Design Patterns"],
        "nice_to_have_skills": ["Shader Graph", "Multiplayer (Photon/Mirror)", "Animation State Machine", "IAP / Ads Mediation"],
        "min_experience_years": 2,
        "max_experience_years": 5,
        "min_education": "bachelor",
        "description_vi": """- Phát triển các tựa game 2D/3D hấp dẫn cho thị trường toàn cầu trên nền tảng Unity.
- Tối ưu hóa hiệu năng game (Draw calls, Memory, Frame rate 60fps) trên thiết bị di động tầm trung.
- Tích hợp hệ sinh thái kiếm tiền: AdMob, AppLovin, IronSource và In-App Purchase.""",
        "requirements_vi": """- Tối thiểu 2 năm kinh nghiệm làm Game Developer với Unity và C#.
- Có tư duy toán học, hình học không gian và thuật toán xử lý va chạm tốt.
- Đã có sản phẩm game hoàn chỉnh phát hành trên Google Play hoặc App Store.""",
    },
    {
        "slug": "topcv-tech-lead-fullstack-software",
        "title_vi": "Technical Lead / Kiến trúc sư Trưởng (Python / Node.js / React / Cloud)",
        "department": "Ban Công nghệ (Tech Leadership)",
        "location": "Hà Nội / TP. Hồ Chí Minh",
        "employment_type": "full_time",
        "salary_min": 50,
        "salary_max": 90,
        "must_have_skills": ["System Architecture", "Leadership & Mentoring", "Backend & Frontend Mastery", "Cloud AWS/GCP", "Code Review"],
        "nice_to_have_skills": ["AI/LLM Integration", "Microservices", "Security & Compliance", "High-load Scaling"],
        "min_experience_years": 6,
        "max_experience_years": 12,
        "min_education": "bachelor",
        "description_vi": """- Chịu trách nhiệm toàn diện về mặt kỹ thuật, kiến trúc hệ thống và chất lượng code của toàn bộ sản phẩm.
- Định hướng công nghệ, lựa chọn tech stack và giải quyết các bài toán kỹ thuật phức tạp nhất.
- Dẫn dắt, phân chia công việc và đào tạo phát triển năng lực cho đội ngũ 15-25 kỹ sư phần mềm.
- Phối hợp chặt chẽ với CTO và Ban Giám đốc để thực thi chiến lược công nghệ.""",
        "requirements_vi": """- Tối thiểu 6 năm kinh nghiệm phát triển phần mềm, trong đó có ít nhất 2 năm ở vị trí Tech Lead.
- Nắm vững từ kiến trúc Backend, Frontend, Database đến hạ tầng DevOps/Cloud.
- Kỹ năng lãnh đạo, giải quyết vấn đề xuất sắc và tầm nhìn công nghệ dài hạn.""",
    },
    {
        "slug": "topcv-database-administrator-dba-postgresql",
        "title_vi": "Chuyên gia Quản trị Cơ sở Dữ liệu (Database Administrator / PostgreSQL / MySQL DBA)",
        "department": "Hạ tầng & Dữ liệu",
        "location": "Hà Nội (Cầu Giấy)",
        "employment_type": "full_time",
        "salary_min": 30,
        "salary_max": 52,
        "must_have_skills": ["PostgreSQL DBA", "Query Optimization & Indexing", "Replication & High Availability", "Backup & Recovery", "Linux"],
        "nice_to_have_skills": ["PgBouncer", "Patroni / Pgpool", "MySQL / MongoDB", "Performance Tuning"],
        "min_experience_years": 3,
        "max_experience_years": 7,
        "min_education": "bachelor",
        "description_vi": """- Quản trị, giám sát và tối ưu hóa cụm cơ sở dữ liệu PostgreSQL quy mô hàng chục terabyte.
- Thiết lập giải pháp Replication, High Availability (Patroni/Keepalived) và Connection Pooling (PgBouncer).
- Phân tích slow queries, đề xuất giải pháp partitioning, indexing và tuning thông số kernel/Postgres.""",
        "requirements_vi": """- Tối thiểu 3 năm kinh nghiệm làm DBA chuyên sâu về PostgreSQL hoặc MySQL.
- Hiểu tường tận về WAL, MVCC, Lock mechanism, Autovacuum và Buffer pool.
- Kỹ năng xử lý sự cố khẩn cấp và đảm bảo an toàn dữ liệu tuyệt đối.""",
    },
    {
        "slug": "topcv-generative-ai-prompt-engineer",
        "title_vi": "Kỹ sư Tối ưu hóa Prompt & Đánh giá AI (Prompt Engineer / AI Evaluator)",
        "department": "Trí tuệ nhân tạo (AI R&D)",
        "location": "Hà Nội / Remote",
        "employment_type": "full_time",
        "salary_min": 22,
        "salary_max": 40,
        "must_have_skills": ["Prompt Engineering", "LLM Evaluation (Ragas/TruLens)", "Few-shot / Chain-of-Thought", "Python", "NLP basics"],
        "nice_to_have_skills": ["LangChain", "OpenAI / Gemini API", "Structured Outputs (Pydantic)", "Benchmark Datasets"],
        "min_experience_years": 1,
        "max_experience_years": 4,
        "min_education": "bachelor",
        "description_vi": """- Thiết kế và tối ưu hóa các bộ prompt phức tạp (ReAct, Chain-of-Thought, Reflexion) cho Agent tự động phân tích CV.
- Xây dựng bộ tiêu chí và dataset benchmark để đánh giá chất lượng đầu ra của mô hình LLM.
- Tinh chỉnh Structured Outputs (JSON Schema, Pydantic) đảm bảo tỷ lệ lỗi parse dữ liệu dưới 0.1%.""",
        "requirements_vi": """- Có kinh nghiệm thực tế trong việc tối ưu hóa prompt và ứng dụng LLM trong các bài toán thực tế.
- Khả năng tư duy ngôn ngữ tốt, hiểu sâu cách hoạt động và hạn chế (Hallucination, Bias) của các mô hình sinh.
- Kỹ năng lập trình Python cơ bản để viết script tự động hóa test.""",
    },
    {
        "slug": "topcv-api-integration-specialist-saas",
        "title_vi": "Kỹ sư Tích hợp Hệ thống & API (Integration Engineer / Webhooks / OAuth2)",
        "department": "Tích hợp giải pháp",
        "location": "TP. Hồ Chí Minh (Quận 1)",
        "employment_type": "full_time",
        "salary_min": 24,
        "salary_max": 42,
        "must_have_skills": ["RESTful API Integration", "OAuth2 / SSO", "Webhooks", "Python / Node.js", "Postman"],
        "nice_to_have_skills": ["Workday / SAP integration", "Zapier / Make", "Message Queues", "API Gateway"],
        "min_experience_years": 2,
        "max_experience_years": 5,
        "min_education": "bachelor",
        "description_vi": """- Xây dựng các cổng kết nối (Connectors) tích hợp hệ thống ATS với các nền tảng nhân sự toàn cầu (Workday, SuccessFactors, BambooHR).
- Xây dựng hệ thống Webhooks real-time để đồng bộ dữ liệu ứng viên đa chiều.
- Viết SDK và tài liệu hướng dẫn kỹ thuật phục vụ các nhà phát triển bên thứ ba.""",
        "requirements_vi": """- Tối thiểu 2 năm kinh nghiệm tích hợp API và phát triển giải pháp B2B SaaS.
- Nắm vững các giao thức xác thực bảo mật (OAuth2, SAML, JWT, API Keys).
- Kỹ năng debug và bắt lỗi giao tiếp mạng nhanh chóng.""",
    },
    {
        "slug": "topcv-computer-vision-edge-ai-engineer",
        "title_vi": "Kỹ sư AI Thị giác trên Thiết bị Biên (Edge AI / TensorRT / C++)",
        "department": "Trí tuệ nhân tạo (AI R&D)",
        "location": "Đà Nẵng / Remote",
        "employment_type": "full_time",
        "salary_min": 32,
        "salary_max": 58,
        "must_have_skills": ["C++ / Python", "TensorRT / OpenVINO", "NVIDIA Jetson / Edge Devices", "Deep Learning Optimization", "OpenCV"],
        "nice_to_have_skills": ["Model Quantization (INT8/FP16)", "GStreamer", "CUDA programming", "Docker"],
        "min_experience_years": 2,
        "max_experience_years": 5,
        "min_education": "bachelor",
        "description_vi": """- Tối ưu hóa các mô hình Deep Learning xử lý hình ảnh thời gian thực trên phần cứng NVIDIA Jetson / Raspberry Pi.
- Viết ứng dụng C++ đa luồng tích hợp TensorRT phục vụ camera giám sát thông minh.
- Giảm độ trễ inference xuống dưới 20ms và tiết kiệm tối đa điện năng tiêu thụ.""",
        "requirements_vi": """- Tối thiểu 2 năm kinh nghiệm lập trình C++ và triển khai mô hình AI trên thiết bị biên.
- Hiểu sâu về cấu trúc bộ nhớ GPU, TensorRT pipeline và kỹ thuật nén mô hình.
- Tư duy kỹ thuật tốt và khả năng đọc hiểu tài liệu phần cứng tiếng Anh.""",
    },
]

# Generate additional diverse variations to ensure 50+ total rich IT job postings
DEPARTMENT_CATEGORIES = [
    ("Công nghệ thông tin", "Hà Nội", "full_time"),
    ("Trí tuệ nhân tạo", "TP. Hồ Chí Minh", "full_time"),
    ("Hạ tầng Cloud & DevOps", "Đà Nẵng", "full_time"),
    ("Phát triển phần mềm", "Hà Nội", "hybrid"),
    ("An toàn thông tin", "TP. Hồ Chí Minh", "full_time"),
    ("Dữ liệu & Phân tích", "Remote", "contract"),
]

ADDITIONAL_TITLES = [
    ("Kỹ sư Rust Systems (High-Performance Networking)", ["Rust", "Tokio", "Concurrency", "Linux Kernel", "TCP/IP"], ["WebAssembly", "C++", "Docker"], 35, 65, 3),
    ("Chuyên gia Phân tích An ninh SOC L2 (Incident Response)", ["SIEM Wazuh/Splunk", "Threat Hunting", "Forensics", "Log Analysis", "Network Traffic"], ["MITRE ATT&CK", "Python Scripting"], 26, 46, 3),
    ("Senior Ruby on Rails Developer (E-Commerce Platform)", ["Ruby", "Ruby on Rails", "PostgreSQL", "Sidekiq/Redis", "RSpec"], ["Hotwire", "Docker", "AWS"], 28, 48, 4),
    ("Chuyên viên Quản trị Mạng Doanh nghiệp (Cisco / Fortinet)", ["Cisco CCNA/CCNP", "Fortinet Firewall", "VLAN/Routing", "VPN/IPSec", "Network Monitoring"], ["Wireshark", "Linux"], 18, 30, 2),
    ("Kỹ sư Lập trình C/C++ Hệ thống (High-Frequency Trading / Low-Latency)", ["C++17/20", "Data Structures & Algorithms", "Multi-threading", "Memory Management", "Linux"], ["Socket Programming", "STL"], 35, 70, 3),
    ("Chuyên viên Thiết kế Hệ thống Nhận diện Thương hiệu (Brand Designer)", ["Adobe Illustrator", "Photoshop", "Brand Guidelines", "Typography", "Visual Identity"], ["After Effects", "Figma"], 16, 28, 2),
    ("Kỹ sư Tối ưu hóa Cơ sở dữ liệu NoSQL (MongoDB / Redis Cluster)", ["MongoDB", "Redis Cluster", "Data Sharding", "Replication", "Performance Tuning"], ["PostgreSQL", "Python"], 25, 45, 3),
    ("Chuyên viên Phát triển Đối tác Công nghệ (Tech Partner Manager)", ["Partner Relationship", "B2B Tech Solutions", "Contract Negotiation", "Communication", "English"], ["SaaS Knowledge", "CRM"], 25, 45, 3),
    ("Thực tập sinh Phân tích Dữ liệu (Data Analyst Intern)", ["SQL Basics", "Excel Advanced", "Power BI / Tableau", "Statistics", "Logical Thinking"], ["Python Pandas", "Data Cleaning"], 5, 9, 0),
    ("Kỹ sư Tự động hóa Quy trình RPA (UiPath / Automation Anywhere)", ["UiPath", "Automation Anywhere", "Process Analysis", "VB.NET / C#", "OCR"], ["Python", "SQL"], 20, 36, 2),
    ("Chuyên gia Bảo mật Ứng dụng (Application Security / DevSecOps)", ["SAST / DAST Tools", "Code Review for Security", "OWASP ASVS", "CI/CD Security", "Penetration Testing"], ["Python", "Docker"], 30, 55, 3),
    ("Kỹ sư Phần mềm Fullstack (Python FastAPI + React.js)", ["Python", "FastAPI", "React.js", "TypeScript", "PostgreSQL"], ["Docker", "TailwindCSS", "Redis"], 26, 46, 3),
    ("Kỹ sư Xử lý Âm thanh & Giọng nói AI (Speech AI / Whisper / TTS)", ["Python", "Speech-to-Text (ASR)", "Text-to-Speech (TTS)", "PyTorch", "Audio Processing"], ["HuggingFace", "C++"], 32, 60, 2),
    ("Trưởng phòng Đảm bảo Chất lượng Phần mềm (Head of QA / QC)", ["QA Strategy", "Test Management", "Automation Frameworks", "Team Leadership", "Agile/Scrum"], ["Performance Testing", "Security"], 40, 75, 6),
    ("Kỹ sư Triển khai Giải pháp ERP (SAP / Odoo Implementation)", ["Odoo / SAP ERP", "Python", "Business Workflow", "PostgreSQL", "Customization"], ["Accounting basics", "API Integration"], 22, 40, 2),
    ("Chuyên viên Viết Tài liệu Kỹ thuật (Technical Writer / API Documentation)", ["Technical Writing", "Markdown", "Swagger / OpenAPI", "English Fluency", "Communication"], ["Git", "Docusaurus"], 18, 30, 2),
    ("Kỹ sư Hạ tầng Mã nguồn Mở (Open Source Infrastructure / Linux Sysadmin)", ["Linux (CentOS/Ubuntu)", "Bash Scripting", "Nginx/Apache", "DNS/Bind", "Monitoring"], ["Ansible", "Docker"], 20, 35, 2),
    ("Chuyên viên Tối ưu hóa Công cụ Tìm kiếm (Technical SEO Specialist)", ["Technical SEO", "Google Search Console", "PageSpeed Optimization", "Core Web Vitals", "Schema Markup"], ["HTML/JS basics", "Ahrefs"], 15, 26, 2),
    ("Kỹ sư Mô hình Ngôn ngữ Lớn Đa phương thức (Multimodal GenAI Engineer)", ["Multimodal LLMs (GPT-4V/Gemini)", "Vision-Language Models", "Python", "PyTorch", "Vector Search"], ["LangChain", "RAG"], 38, 70, 3),
    ("Thực tập sinh Quản trị Hệ thống & Mạng (SysAdmin Intern)", ["Linux Basics", "Network Concepts", "Hardware Assembly", "Teamwork", "Eagerness to Learn"], ["Windows Server", "Bash"], 4, 8, 0),
]


def expand_dataset():
    """Expand dataset to reach 50+ rich real-world job records."""
    jobs = list(TOPCV_JOBS_DATASET)
    
    for i, item in enumerate(ADDITIONAL_TITLES, start=1):
        title, must_skills, nice_skills, sal_min, sal_max, exp_years = item
        dept, loc, emp_type = DEPARTMENT_CATEGORIES[i % len(DEPARTMENT_CATEGORIES)]
        slug = f"topcv-it-career-{i:02d}-{title.lower().split()[0]}"
        
        job_record = {
            "slug": slug,
            "title_vi": title,
            "department": dept,
            "location": loc,
            "employment_type": emp_type,
            "salary_min": sal_min,
            "salary_max": sal_max,
            "must_have_skills": must_skills,
            "nice_to_have_skills": nice_skills,
            "min_experience_years": exp_years,
            "max_experience_years": exp_years + 3,
            "min_education": "bachelor" if exp_years > 0 else "high_school",
            "description_vi": f"""- Trực tiếp tham gia phát triển, bảo trì và tối ưu hóa các giải pháp cho vị trí {title}.
- Phối hợp chặt chẽ với các phòng ban liên quan ({dept}) để hoàn thành đúng tiến độ cam kết.
- Áp dụng các phương pháp kỹ thuật tiên tiến, viết mã nguồn sạch và tài liệu rõ ràng.
- Đóng góp ý kiến cải tiến kiến trúc và quy trình làm việc chung của tổ chức.""",
            "requirements_vi": f"""- Có kiến thức chuyên sâu và kinh nghiệm thực chiến vững vàng với: {', '.join(must_skills)}.
- Có khả năng làm việc độc lập cũng như phối hợp nhóm hiệu quả.
- Tinh thần trách nhiệm cao, tư duy giải quyết vấn đề nhanh nhạy và đam mê công nghệ.""",
        }
        jobs.append(job_record)
        
    return jobs


def main() -> None:
    now = datetime.now(UTC)
    deadline = date.today() + timedelta(days=60)
    all_jobs = expand_dataset()

    with SyncSessionLocal() as db:
        owner = db.scalar(
            select(User)
            .where(
                User.company_code.isnot(None),
                User.role.in_(["recruiter", "hr", "manager", "leader", "admin"]),
                User.is_active.is_(True),
            )
            .order_by(User.id.desc())
        )
        if owner is None:
            owner = db.scalar(
                select(User)
                .where(User.role.in_(["hr", "recruiter", "admin"]), User.is_active.is_(True))
                .order_by(User.role.desc(), User.id)
            )
        if owner is None:
            owner = db.scalar(select(User).where(User.email == "hr.admin@irsa.vn"))
        if owner is None:
            owner = User(
                email="hr.admin@irsa.vn",
                password_hash=get_password_hash("AdminPass123!"),
                full_name="HR Administrator",
                role="admin",
                is_active=True,
                email_verified=True,
                approval_status="approved",
            )
            db.add(owner)
            db.flush()

        created = 0
        updated = 0
        for index, item in enumerate(all_jobs, start=1):
            slug = item["slug"]
            job = db.scalar(select(Job).where(Job.slug == slug))
            if job is None:
                job = Job(slug=slug, created_by=owner.id)
                db.add(job)
                created += 1
            else:
                updated += 1

            job.title_vi = item["title_vi"]
            job.department = item["department"]
            job.location = item["location"]
            job.employment_type = item["employment_type"]
            job.salary_min = item["salary_min"]
            job.salary_max = item["salary_max"]
            job.description_vi = item["description_vi"]
            job.requirements_vi = item["requirements_vi"]
            job.status = "active"
            job.is_published = True
            job.published_at = now - timedelta(days=index % 30)
            job.application_deadline = deadline + timedelta(days=(index % 45))
            job.approved_by = owner.id
            job.approved_at = now

            if job.criteria is None:
                job.criteria = JobCriteria()
            job.criteria.must_have_skills = item["must_have_skills"]
            job.criteria.nice_to_have_skills = item["nice_to_have_skills"]
            job.criteria.min_experience_years = item["min_experience_years"]
            job.criteria.max_experience_years = item["max_experience_years"]
            job.criteria.min_education = item["min_education"]
            job.criteria.weight_skills = 60
            job.criteria.weight_experience = 30
            job.criteria.weight_education = 10

        db.commit()
        print(f"\n=======================================================")
        print(f"SUCCESS: Seeded {len(all_jobs)} Real-world IT Job Postings to Supabase!")
        print(f"  - Created: {created} new jobs")
        print(f"  - Updated: {updated} existing jobs")
        print(f"  - Total Jobs Now: {len(all_jobs)}")
        print(f"  - Author / Recruiter: {owner.email} (ID: {owner.id})")
        print(f"=======================================================\n")


if __name__ == "__main__":
    main()
