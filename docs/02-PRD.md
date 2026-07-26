# Product Requirement Document (PRD)

**Project:** AI Screening Agent – Intelligent Resume Screening & Ranking  
**Version:** 1.0  
**Author:** Team  
**Document Type:** Product Requirement Document (PRD)  
**Last Updated:** July 2026

---

# Table of Contents

1. Product Overview
2. Business Objectives
3. Product Goals
4. Stakeholders
5. User Personas
6. User Journey
7. User Stories
8. Functional Requirements
9. Non-functional Requirements
10. Business Rules
11. AI Workflow
12. Acceptance Criteria
13. API Overview
14. Security
15. Future Enhancements

---

# 1. Product Overview

## 1.1 Introduction

AI Screening Agent là một hệ thống hỗ trợ tuyển dụng sử dụng công nghệ AI nhằm tự động hóa quá trình sàng lọc hồ sơ ứng viên. Hệ thống cho phép Recruiter tải lên Job Description (JD) và nhiều CV cùng lúc, sau đó AI sẽ phân tích, đánh giá mức độ phù hợp và đưa ra bảng xếp hạng ứng viên.

Khác với các hệ thống ATS truyền thống chỉ lưu trữ hồ sơ, AI Screening Agent tập trung vào khả năng hiểu nội dung CV bằng Large Language Model (LLM), kết hợp OCR, Embedding và Retrieval-Augmented Generation (RAG) để tạo ra kết quả đánh giá chính xác và có khả năng giải thích.

---

## 1.2 Vision

Xây dựng một AI Agent đóng vai trò là trợ lý tuyển dụng thông minh, giúp Recruiter giảm thời gian screening, nâng cao chất lượng đánh giá và chuẩn hóa quy trình tuyển dụng.

---

## 1.3 Mission

- Tự động hóa quy trình screening.
- Hỗ trợ Recruiter xử lý số lượng lớn CV.
- Đánh giá ứng viên theo cùng một tiêu chuẩn.
- Giải thích rõ ràng lý do chấm điểm.
- Giữ Human-in-the-Loop trong quyết định cuối cùng.

---

# 2. Business Objectives

Dự án hướng đến các mục tiêu sau:

- Giảm ít nhất 70% thời gian sàng lọc hồ sơ.
- Giảm chi phí tuyển dụng.
- Chuẩn hóa tiêu chí đánh giá ứng viên.
- Tăng khả năng phát hiện ứng viên phù hợp.
- Nâng cao trải nghiệm làm việc của Recruiter.

---

# 3. Product Goals

## Goal 1

Cho phép Recruiter tải lên Job Description và nhiều CV chỉ với vài thao tác.

---

## Goal 2

AI tự động phân tích nội dung hồ sơ mà không cần Recruiter đọc từng CV.

---

## Goal 3

AI so sánh CV với JD và chấm điểm theo nhiều tiêu chí.

---

## Goal 4

Hiển thị bảng xếp hạng ứng viên kèm giải thích chi tiết.

---

## Goal 5

Cho phép Recruiter đưa ra quyết định cuối cùng dựa trên gợi ý của AI.

---

# 4. Stakeholders

| Stakeholder | Vai trò |
|-------------|----------|
| Recruiter | Người trực tiếp sử dụng hệ thống |
| HR Manager | Theo dõi kết quả tuyển dụng |
| Admin | Quản trị hệ thống |
| AI Service | Phân tích và chấm điểm |
| Candidate | Người nộp hồ sơ |

---

# 5. User Personas

## 5.1 Recruiter

### Description

Là người chịu trách nhiệm tìm kiếm và lựa chọn ứng viên.

### Goals

- Tiết kiệm thời gian.
- Không bỏ sót ứng viên giỏi.
- Có bảng xếp hạng rõ ràng.
- Có giải thích kết quả.

### Pain Points

- Quá nhiều CV.
- Screening thủ công.
- Không có tiêu chuẩn đánh giá chung.

---

## 5.2 HR Manager

### Description

Quản lý hoạt động tuyển dụng.

### Goals

- Theo dõi hiệu quả AI.
- Kiểm soát quy trình.
- Kiểm tra chất lượng shortlist.

---

## 5.3 Administrator

### Description

Quản trị hệ thống.

### Responsibilities

- Quản lý tài khoản.
- Quản lý cấu hình AI.
- Theo dõi AI Log.
- Quản lý quyền truy cập.

---

# 6. User Journey

## Recruiter Journey

```text
Login

↓

Dashboard

↓

Create / Upload Job Description

↓

Upload Candidate CVs

↓

AI Screening

↓

Ranking Candidates

↓

View Candidate Detail

↓

Approve / Reject

↓

Interview
```

---

# 7. User Stories

## US-01 Login

Là Recruiter, tôi muốn đăng nhập hệ thống để sử dụng các chức năng tuyển dụng.

---

## US-02 Upload JD

Là Recruiter, tôi muốn tải lên Job Description để AI có tiêu chí đánh giá ứng viên.

---

## US-03 Upload CV

Là Recruiter, tôi muốn tải nhiều CV cùng lúc để giảm thời gian thao tác.

---

## US-04 AI Screening

Là Recruiter, tôi muốn AI tự động phân tích và chấm điểm CV.

---

## US-05 Candidate Ranking

Là Recruiter, tôi muốn xem danh sách ứng viên được sắp xếp theo điểm.

---

## US-06 AI Explanation

Là Recruiter, tôi muốn biết AI chấm điểm dựa trên những tiêu chí nào.

---

## US-07 Recruiter Review

Là Recruiter, tôi muốn tự quyết định Approve hoặc Reject sau khi xem gợi ý của AI.

---

## US-08 Dashboard

Là HR Manager, tôi muốn xem thống kê quá trình tuyển dụng.

---

# 8. Product Scope

## In Scope (MVP)

- User Authentication
- Upload Job Description
- Upload Multiple CV
- OCR
- Resume Parsing
- AI Matching
- Candidate Ranking
- AI Explanation
- Dashboard
- Recruiter Review

---

## Out of Scope

Các chức năng sau chưa thuộc phạm vi MVP:

- Video Interview
- AI Voice Interview
- Salary Recommendation
- Offer Letter Generation
- Payroll Integration
- HRM Integration
- Employee Onboarding
- Mobile Application

---

# 9. Assumptions

- Recruiter có sẵn Job Description.
- CV ở định dạng PDF, DOCX hoặc Image.
- AI có kết nối Internet để gọi LLM API.
- Người dùng đã được cấp tài khoản.

---

# 10. Constraints

- AI không được tự động loại ứng viên.
- Recruiter luôn là người quyết định cuối cùng.
- Hệ thống phải bảo vệ dữ liệu cá nhân của ứng viên.
- Prompt và Response phải được ghi nhận thông qua AI Log.
- Hệ thống phải hỗ trợ mở rộng trong tương lai.

---

---

# 11. Functional Requirements

## FR-01 User Authentication

### Description

Hệ thống phải cho phép người dùng đăng nhập để sử dụng các chức năng theo đúng quyền hạn.

### Actors

- Recruiter
- HR Manager
- Administrator

### Preconditions

- Người dùng đã có tài khoản.
- Tài khoản đang hoạt động.

### Main Flow

1. Người dùng mở màn hình Login.
2. Nhập Email và Password.
3. Hệ thống kiểm tra thông tin.
4. Xác thực thành công.
5. Sinh JWT Access Token.
6. Chuyển đến Dashboard.

### Alternative Flow

- Sai email hoặc mật khẩu.
- Tài khoản bị khóa.
- JWT hết hạn.

### Business Rules

- Email phải là duy nhất.
- Password được mã hóa bằng BCrypt.
- JWT có thời hạn 24 giờ.

### Acceptance Criteria

- Đăng nhập thành công dưới 2 giây.
- Token được lưu an toàn.
- Chỉ người dùng hợp lệ mới được truy cập.

---

## FR-02 Create Job Description

### Description

Recruiter có thể tạo mới Job Description hoặc tải lên JD có sẵn.

### Input

- Job Title
- Department
- Location
- Employment Type
- Required Skills
- Preferred Skills
- Experience
- Education
- Responsibilities

### Main Flow

1. Recruiter chọn "Create Job".
2. Nhập thông tin.
3. Nhấn Save.
4. Hệ thống lưu vào PostgreSQL.

### Validation

- Job Title không được để trống.
- Ít nhất phải có một Required Skill.
- Description tối thiểu 50 ký tự.

### Acceptance Criteria

- JD được lưu thành công.
- Có thể chỉnh sửa sau này.

---

## FR-03 Upload Resume

### Description

Recruiter có thể tải lên một hoặc nhiều CV để AI xử lý.

### Supported Format

- PDF
- DOCX
- PNG
- JPG
- JPEG

### Maximum Upload

- 50 CV mỗi lần
- 10MB mỗi file

### Main Flow

1. Recruiter chọn Upload CV.
2. Chọn nhiều file.
3. Hệ thống kiểm tra định dạng.
4. Upload thành công.
5. AI bắt đầu xử lý.

### Validation

- Không hỗ trợ file ZIP.
- Không hỗ trợ EXE.
- Không hỗ trợ TXT.

### Error Handling

Sai định dạng

```
Unsupported file type.
```

File quá lớn

```
Maximum file size exceeded.
```

### Acceptance Criteria

- Upload nhiều file thành công.
- Có Progress Bar.
- AI xử lý tự động.

---

## FR-04 OCR & Resume Parsing

### Description

Sau khi upload, hệ thống sẽ tự động trích xuất nội dung CV.

### Processing

- OCR nếu là ảnh.
- Đọc PDF.
- Đọc DOCX.
- Chuẩn hóa dữ liệu.

### Information Extracted

- Full Name
- Email
- Phone
- Address
- Skills
- Experience
- Education
- Certificates
- Languages
- Projects

### Acceptance Criteria

- OCR Accuracy ≥ 90%
- Resume Parsing Accuracy ≥ 90%

---

## FR-05 AI Candidate Matching

### Description

AI sẽ so sánh hồ sơ ứng viên với Job Description.

### Matching Criteria

- Technical Skills
- Experience
- Education
- Certificates
- Languages
- Soft Skills
- Keywords

### Output

- Matching Score
- Missing Skills
- Strong Skills
- Summary

### Acceptance Criteria

- AI trả kết quả trong vòng 5 giây.
- Có khả năng giải thích.

---

## FR-06 AI Scoring

### Description

AI tính điểm tổng hợp cho từng ứng viên.

### Score Range

0 - 100

### Sample Weight

| Criteria | Weight |
|-----------|---------|
| Skills | 40% |
| Experience | 30% |
| Education | 15% |
| Certificates | 10% |
| Other | 5% |

### Output

```
Overall Score

Technical Score

Experience Score

Education Score

Reasoning
```

### Acceptance Criteria

Điểm số nhất quán với cùng một CV và JD.

---

## FR-07 Candidate Ranking

### Description

Hệ thống sắp xếp ứng viên theo điểm giảm dần.

### Sorting

- Highest Score
- Most Experience
- Latest Upload

### Filtering

- Score
- Skills
- Experience
- Education

### Acceptance Criteria

Danh sách cập nhật ngay sau khi AI hoàn thành.

---

## FR-08 Candidate Detail

### Description

Hiển thị đầy đủ thông tin ứng viên.

### Sections

- Resume
- Parsed Information
- AI Score
- Matching Details
- Missing Skills
- AI Explanation

### Recruiter Actions

- Approve
- Reject
- Add Note

---

## FR-09 Dashboard

### Dashboard Widgets

- Total Jobs
- Total CV
- AI Processed
- Processing
- Approved
- Rejected

### Charts

- Candidate Score Distribution
- Daily Upload
- Processing Time
- Top Skills

---

## FR-10 Notification

### Description

Hệ thống gửi thông báo khi AI xử lý hoàn tất.

### Notification Types

- In-app Notification
- Email (Future)

### Events

- Upload Completed
- AI Screening Finished
- Candidate Approved
- Candidate Rejected

---

# 12. Business Rules

## BR-01

Một Job Description có thể có nhiều CV.

---

## BR-02

Một CV chỉ thuộc một lần screening.

---

## BR-03

AI không được tự động Reject ứng viên.

---

## BR-04

Recruiter luôn là người quyết định cuối cùng.

---

## BR-05

Điểm AI chỉ mang tính chất gợi ý.

---

## BR-06

Mọi Prompt và Response đều phải lưu AI Log.

---

## BR-07

Mọi API phải yêu cầu JWT Authentication.

---

## BR-08

CV phải được lưu trước khi AI xử lý.

---

## BR-09

AI chỉ xử lý các CV hợp lệ.

---

## BR-10

Không được lưu API Key trong Source Code.

---

# 13. Non-functional Requirements

## 13.1 Performance

Hệ thống phải đáp ứng các yêu cầu hiệu năng sau:

| Requirement | Target |
|-------------|---------|
| Login Response | < 2 giây |
| Upload CV | < 5 giây |
| OCR Processing | < 10 giây/CV |
| AI Screening | < 5 giây/CV |
| Dashboard Loading | < 3 giây |

---

## 13.2 Availability

- Uptime ≥ 99%
- Hệ thống có khả năng tự phục hồi khi service gặp lỗi.
- Hỗ trợ triển khai Docker.

---

## 13.3 Scalability

Hệ thống phải có khả năng mở rộng khi:

- Có nhiều Recruiter sử dụng đồng thời.
- Upload hàng trăm CV.
- Xử lý nhiều Job Description.

Giải pháp:

- Docker
- Queue Processing
- Redis Cache
- PostgreSQL
- Qdrant Vector Database

---

## 13.4 Security

Hệ thống phải đảm bảo:

- JWT Authentication
- BCrypt Password Hashing
- HTTPS
- Role-based Access Control
- API Authentication
- Input Validation
- SQL Injection Prevention

---

## 13.5 Logging

Hệ thống phải ghi nhận đầy đủ:

- API Request
- API Response
- Error Log
- Authentication Log
- AI Prompt
- AI Response
- AI Cost
- AI Latency

---

# 14. AI Workflow

## AI Pipeline

```text
Recruiter

↓

Upload Job Description

↓

Upload Resume

↓

OCR

↓

Resume Parser

↓

Extract Information

↓

Generate Embedding

↓

Vector Database

↓

Retrieve Related Context

↓

Prompt Engineering

↓

GPT-4o

↓

Candidate Score

↓

AI Explanation

↓

Ranking

↓

Recruiter Review
```

---

## AI Components

### OCR

Chuyển đổi PDF Scan hoặc hình ảnh thành văn bản.

Công nghệ:

- PyMuPDF
- Tesseract OCR

---

### Resume Parser

Trích xuất các trường dữ liệu:

- Name
- Email
- Phone
- Skills
- Experience
- Education
- Projects
- Certificates

---

### Embedding

Chuyển Resume và Job Description thành vector.

Model:

- text-embedding-3-small

---

### Vector Database

Lưu Embedding.

Công nghệ:

- Qdrant

---

### RAG

Truy xuất thông tin liên quan trước khi gửi Prompt tới LLM nhằm giảm Hallucination.

---

### Large Language Model

Model sử dụng

- GPT-4o

Nhiệm vụ

- Matching
- Reasoning
- Scoring
- Explanation

---

# 15. Database Overview

Các bảng chính của hệ thống

| Table | Description |
|---------|-------------|
| users | Thông tin tài khoản |
| job_descriptions | Job Description |
| resumes | Hồ sơ ứng viên |
| parsed_resumes | Dữ liệu đã trích xuất |
| screening_results | Kết quả AI |
| candidate_rankings | Xếp hạng |
| ai_logs | Nhật ký AI |
| api_logs | Nhật ký API |

---

# 16. API Overview

## Authentication

POST

```
/api/auth/login
```

POST

```
/api/auth/logout
```

GET

```
/api/auth/profile
```

---

## Job Description

POST

```
/api/jobs
```

GET

```
/api/jobs
```

PUT

```
/api/jobs/{id}
```

DELETE

```
/api/jobs/{id}
```

---

## Resume

POST

```
/api/resumes/upload
```

GET

```
/api/resumes
```

GET

```
/api/resumes/{id}
```

---

## Screening

POST

```
/api/screening/start
```

GET

```
/api/screening/{id}
```

---

## Candidate

GET

```
/api/candidates
```

GET

```
/api/candidates/{id}
```

PUT

```
/api/candidates/{id}/approve
```

PUT

```
/api/candidates/{id}/reject
```

---

# 17. Error Handling

| Error Code | Description |
|-------------|-------------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 413 | File Too Large |
| 415 | Unsupported File |
| 422 | Validation Error |
| 500 | Internal Server Error |

---

## Common Error Messages

### Invalid Login

```
Invalid email or password.
```

---

### Invalid File

```
Unsupported file type.
```

---

### Upload Failed

```
Upload failed. Please try again.
```

---

### AI Service Error

```
AI service is temporarily unavailable.
```

---

### OCR Error

```
Unable to extract text from document.
```

---

# 18. Acceptance Criteria

Hệ thống được xem là hoàn thành MVP khi đáp ứng các tiêu chí sau:

### Authentication

- Người dùng đăng nhập thành công.
- JWT hoạt động chính xác.

---

### Job Description

- Có thể tạo Job Description.
- Có thể chỉnh sửa.
- Có thể xem danh sách.

---

### Resume

- Upload nhiều CV.
- Hỗ trợ PDF, DOCX, PNG, JPG.
- Hiển thị tiến trình upload.

---

### AI

- OCR thành công.
- Resume Parsing chính xác.
- AI Scoring thành công.
- Có AI Explanation.

---

### Candidate Ranking

- Xếp hạng theo điểm.
- Có bộ lọc.
- Có tìm kiếm.

---

### Dashboard

- Hiển thị thống kê.
- Hiển thị trạng thái xử lý.

---

# 19. Future Enhancements

Sau khi hoàn thành MVP, hệ thống sẽ được mở rộng với các tính năng sau:

- AI Interview Question Generator
- AI Interview Planner
- Candidate Recommendation
- Duplicate Resume Detection
- Fraud Detection
- AI Memory
- Email Automation
- Calendar Integration
- HRM Integration
- Multi-language Support

---

# 20. Conclusion

AI Screening Agent là một nền tảng hỗ trợ tuyển dụng thông minh ứng dụng AI để tự động hóa quy trình sàng lọc hồ sơ ứng viên. Sản phẩm hướng tới việc giảm thời gian xử lý hồ sơ, nâng cao chất lượng đánh giá và tăng tính nhất quán trong quy trình tuyển dụng.

Phiên bản MVP tập trung vào các chức năng cốt lõi gồm quản lý Job Description, upload CV, OCR, AI Screening, Candidate Ranking và Recruiter Review. Trong các phiên bản tiếp theo, hệ thống sẽ được mở rộng với các tính năng AI nâng cao nhằm xây dựng một trợ lý tuyển dụng toàn diện.