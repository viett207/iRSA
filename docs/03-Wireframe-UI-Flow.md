# Wireframe & UI Flow

**Project:** AI Screening Agent – Intelligent Resume Screening & Ranking  
**Version:** 1.0  
**Document Type:** Wireframe & UI Flow  
**Last Updated:** July 2026

---

# Table of Contents

1. Overview
2. Design Principles
3. User Flow
4. Navigation Flow
5. Screen List
6. Screen Details
7. User Interaction
8. Responsive Design

---

# 1. Overview

Tài liệu này mô tả giao diện người dùng (UI), luồng điều hướng (Navigation Flow) và cách người dùng tương tác với hệ thống AI Screening Agent.

Mục tiêu của tài liệu là giúp nhóm phát triển hiểu được:

- Hệ thống gồm những màn hình nào.
- Người dùng thao tác theo trình tự nào.
- Chức năng của từng màn hình.
- Điều hướng giữa các màn hình.
- Các thành phần giao diện cần xây dựng.

Wireframe trong tài liệu chỉ mang tính mô phỏng bố cục và không đại diện cho thiết kế đồ họa cuối cùng.

---

# 2. Design Principles

Hệ thống được thiết kế dựa trên các nguyên tắc sau:

## 2.1 Simplicity

Giao diện đơn giản, trực quan, giúp Recruiter thao tác nhanh mà không cần đào tạo nhiều.

---

## 2.2 Efficiency

Giảm số lượng thao tác cần thiết.

Ví dụ:

- Upload nhiều CV cùng lúc.
- AI tự động xử lý sau khi upload.
- Không cần bấm nhiều bước.

---

## 2.3 Transparency

AI luôn giải thích lý do chấm điểm.

Recruiter luôn biết:

- Vì sao ứng viên được điểm cao.
- Vì sao AI đánh giá chưa phù hợp.

---

## 2.4 Human in the Loop

AI chỉ hỗ trợ.

Recruiter luôn là người:

- Approve
- Reject

---

# 3. User Flow

Luồng sử dụng chính của Recruiter như sau:

```text
Login

↓

Dashboard

↓

Create Job Description

↓

Upload Candidate CV

↓

AI Screening

↓

Candidate Ranking

↓

Candidate Detail

↓

Approve / Reject
```

---

# 4. Navigation Flow

```text
+------------------+
| Login            |
+------------------+
         |
         v
+------------------+
| Dashboard        |
+------------------+
      |        |
      |        |
      v        v
+-----------+  +----------------+
| Job List  |  | Upload Resume  |
+-----------+  +----------------+
       \          /
        \        /
         v      v
    +-------------------+
    | AI Screening      |
    +-------------------+
              |
              v
    +-------------------+
    | Candidate Ranking |
    +-------------------+
              |
              v
    +-------------------+
    | Candidate Detail  |
    +-------------------+
          |        |
          |        |
          v        v
     Approve    Reject
```

---

# 5. Screen List

| Screen ID | Screen Name | Description |
|------------|-------------|-------------|
| S01 | Login | Đăng nhập hệ thống |
| S02 | Dashboard | Trang tổng quan |
| S03 | Job Description | Quản lý JD |
| S04 | Upload Resume | Upload CV |
| S05 | AI Screening | AI xử lý hồ sơ |
| S06 | Candidate Ranking | Danh sách ứng viên |
| S07 | Candidate Detail | Chi tiết ứng viên |
| S08 | Settings | Cấu hình hệ thống |

---

# 6. Screen Details

## S01 – Login

### Purpose

Cho phép người dùng xác thực trước khi truy cập hệ thống.

---

### Wireframe

```text
+------------------------------------------------+

             AI Screening Agent

            Welcome Back

 Email

 [____________________________]

 Password

 [____________________________]

 [ Login ]

--------------------------------------------------

Forgot Password?

```

---

### Components

- Logo
- Email
- Password
- Login Button
- Forgot Password

---

### User Actions

- Nhập Email.
- Nhập Password.
- Nhấn Login.

---

### Success Flow

```
Login Success

↓

Dashboard
```

---

### Failure Flow

```
Sai Email

↓

Thông báo lỗi

↓

Nhập lại
```

---

## S02 – Dashboard

### Purpose

Hiển thị tổng quan về hoạt động tuyển dụng.

---

### Wireframe

```text
+------------------------------------------------------+

 AI Screening Dashboard

--------------------------------------------------------

 [ Create JD ]

 [ Upload CV ]

 [ Start Screening ]

--------------------------------------------------------

 Statistics

 Total Jobs

 Total Candidates

 Processing

 Completed

--------------------------------------------------------

 Recent Jobs

 Backend Developer

 Frontend Developer

 AI Engineer

--------------------------------------------------------

 Recent Screening

 Candidate A

 Candidate B

 Candidate C

--------------------------------------------------------

```

---

### Components

- Navigation Bar
- Statistics Cards
- Recent Jobs
- Recent Screening
- Quick Actions

---

### User Actions

- Tạo Job mới.
- Upload CV.
- Xem thống kê.
- Chọn Job.

---

### Navigation

Dashboard

↓

Job Description

↓

Upload Resume

↓

Screening

---

## S03 – Job Description

### Purpose

Cho phép Recruiter tạo, chỉnh sửa và quản lý Job Description dùng làm tiêu chí đánh giá ứng viên.

---

### Wireframe

```text
+------------------------------------------------------------+

 Job Description

--------------------------------------------------------------

 Job Title

 [________________________________________]

 Department

 [ Backend ▼ ]

 Employment Type

 [ Full-time ▼ ]

 Experience

 [ 2 Years ▼ ]

 Required Skills

 [ Python ]
 [ FastAPI ]
 [ Docker ]

 Preferred Skills

 [ Redis ]
 [ PostgreSQL ]

 Responsibilities

 ___________________________________________

 ___________________________________________

 ___________________________________________

                 [ Save ]

--------------------------------------------------------------
```

---

### Components

- Job Title
- Department
- Employment Type
- Experience
- Required Skills
- Preferred Skills
- Responsibilities
- Save Button

---

### User Actions

- Tạo JD mới
- Chỉnh sửa JD
- Xóa JD
- Xem danh sách JD

---

### Navigation

Dashboard

↓

Job Description

↓

Upload Resume

---

## S04 – Upload Resume

### Purpose

Cho phép Recruiter tải lên nhiều hồ sơ ứng viên.

---

### Wireframe

```text
+------------------------------------------------------+

 Upload Candidate Resume

--------------------------------------------------------

 Drag & Drop CV Here

               OR

      [ Select Files ]

--------------------------------------------------------

 Supported

 PDF

 DOCX

 PNG

 JPG

--------------------------------------------------------

 Upload Progress

 ██████████ 80%

--------------------------------------------------------

        [ Start Screening ]

--------------------------------------------------------
```

---

### Components

- Drag & Drop Area
- Select File Button
- Progress Bar
- File List
- Upload Status
- Start Screening Button

---

### User Actions

- Chọn nhiều CV
- Kéo thả CV
- Xóa CV
- Upload

---

### Navigation

Upload Resume

↓

AI Screening

---

## S05 – AI Screening

### Purpose

Hiển thị trạng thái AI đang xử lý hồ sơ.

---

### Wireframe

```text
+-------------------------------------------------------+

 AI Screening

---------------------------------------------------------

 Resume Parsing

███████████████

Completed

---------------------------------------------------------

 OCR

██████████████

Completed

---------------------------------------------------------

 Embedding

██████████

Running

---------------------------------------------------------

 GPT Matching

██████

Running

---------------------------------------------------------

 Candidate Ranking

Waiting...

---------------------------------------------------------
```

---

### Components

- Progress Bar
- AI Status
- Current Step
- Estimated Time

---

### Processing Steps

1. OCR

2. Resume Parsing

3. Embedding

4. RAG

5. GPT Matching

6. AI Scoring

7. Candidate Ranking

---

### Navigation

Processing

↓

Candidate Ranking

---

## S06 – Candidate Ranking

### Purpose

Hiển thị danh sách ứng viên sau khi AI hoàn tất screening.

---

### Wireframe

```text
+--------------------------------------------------------------------+

 Candidate Ranking

---------------------------------------------------------------------

 Search

[____________________________]

 Filter

[ Score ▼ ]

---------------------------------------------------------------------

 Rank Name Score Status

1 Nguyen Van A 95 Excellent

2 Tran Van B 90 Good

3 Le Van C 84 Good

4 Pham Van D 71 Average

---------------------------------------------------------------------

          View Detail

---------------------------------------------------------------------
```

---

### Components

- Search Box
- Filter
- Sort
- Candidate Table
- Score
- Status
- View Detail

---

### User Actions

- Search
- Filter
- Sort
- View Candidate

---

### Navigation

Candidate Ranking

↓

Candidate Detail

---

## S07 – Candidate Detail

### Purpose

Hiển thị toàn bộ thông tin của ứng viên cùng kết quả đánh giá AI.

---

### Wireframe

```text
+----------------------------------------------------------+

 Candidate Detail

------------------------------------------------------------

 Name

 Nguyen Van A

------------------------------------------------------------

 Overall Score

 95 / 100

------------------------------------------------------------

 Technical Skills

✓ Python

✓ FastAPI

✓ Docker

✓ PostgreSQL

------------------------------------------------------------

 Missing Skills

• Redis

------------------------------------------------------------

 Experience

4 Years Backend Development

------------------------------------------------------------

 AI Explanation

Candidate satisfies most required skills.

Strong backend experience.

Good project portfolio.

Missing Redis experience.

------------------------------------------------------------

 [Approve]

 [Reject]

------------------------------------------------------------
```

---

### Components

- Candidate Information
- AI Score
- Skill Matching
- Missing Skills
- Experience
- Education
- AI Explanation
- Approve Button
- Reject Button

---

### User Actions

- Approve Candidate
- Reject Candidate
- Add Note

---

### Navigation

Candidate Detail

↓

Dashboard

---

## S08 – Settings

### Purpose

Cho phép Admin cấu hình hệ thống.

---

### Wireframe

```text
+------------------------------------------------------+

 Settings

--------------------------------------------------------

 OpenRouter API Key

 [********************************]

--------------------------------------------------------

 AI Model

 GPT-4o ▼

--------------------------------------------------------

 Embedding Model

 text-embedding-3-small ▼

--------------------------------------------------------

 Vector Database

 Qdrant

--------------------------------------------------------

 AI Log

 Enabled

--------------------------------------------------------

 [ Save ]

--------------------------------------------------------
```

---

### Components

- API Key
- AI Model
- Embedding Model
- AI Log
- Save

---

### User Actions

- Thay đổi Model
- Cập nhật API Key
- Bật/Tắt AI Log

---

# 7. User Interaction Rules

## Upload Resume

- Chỉ chấp nhận PDF, DOCX, PNG, JPG.
- Hiển thị Progress Bar khi upload.
- Không cho phép upload file lớn hơn 10MB.
- Có thông báo khi upload thành công hoặc thất bại.

---

## AI Screening

- Hiển thị trạng thái xử lý theo từng bước.
- Người dùng không cần làm mới trang.
- Kết quả tự động cập nhật khi AI hoàn thành.

---

## Candidate Ranking

- Mặc định sắp xếp theo điểm giảm dần.
- Cho phép tìm kiếm theo tên ứng viên.
- Cho phép lọc theo điểm, kỹ năng và kinh nghiệm.

---

## Candidate Detail

- Hiển thị đầy đủ thông tin ứng viên.
- AI Explanation luôn hiển thị cùng với điểm số.
- Recruiter phải xác nhận trước khi Reject.

---

# 8. Navigation Rules

```text
Login
   │
   ▼
Dashboard
   │
   ├──────────────┐
   ▼              ▼
Job List      Upload Resume
   │              │
   └──────┬───────┘
          ▼
    AI Screening
          │
          ▼
 Candidate Ranking
          │
          ▼
 Candidate Detail
      │          │
      ▼          ▼
 Approve      Reject
```

---

# 9. Responsive Design

## Desktop

- Sidebar cố định.
- Dashboard hiển thị nhiều cột.
- Candidate Table đầy đủ.

---

## Tablet

- Sidebar thu gọn.
- Card Layout.

---

## Mobile

- Menu dạng Drawer.
- Candidate chuyển sang Card View.
- AI Explanation hiển thị bên dưới thông tin ứng viên.

---

# 10. UI Design Guidelines

## Primary Color

- Blue (#1677FF)

## Success

- Green

## Warning

- Orange

## Error

- Red

## Font

- Inter
- Roboto

## UI Framework

- Ant Design (React)

---

# 11. Conclusion

Wireframe và UI Flow giúp nhóm phát triển thống nhất về cấu trúc giao diện, điều hướng và trải nghiệm người dùng trước khi triển khai Frontend. Tài liệu này là cơ sở để đội thiết kế và lập trình xây dựng giao diện MVP của AI Screening Agent, đảm bảo các chức năng trong PRD được hiện thực hóa một cách nhất quán và dễ sử dụng.

