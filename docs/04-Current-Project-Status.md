# Báo cáo chi tiết trạng thái hiện tại của dự án P-164

> Thời điểm kiểm kê: 12/08/2026 (Asia/Ho_Chi_Minh)  
> Nhánh làm việc: `nhv`  
> Commit nền gần nhất: `c711ebb feat: integrate current application code`  
> Phạm vi: source code, cấu hình, database local, giao diện, API, AI agent, kiểm thử và AI usage logging.

## 1. Tóm tắt điều hành

P-164 hiện là một hệ thống tuyển dụng và sàng lọc CV gồm hai ứng dụng Angular, một backend FastAPI, PostgreSQL, Redis/Celery, MinIO và một AI Evaluation Agent xây dựng bằng LangGraph. Hệ thống đã vượt xa mức template ban đầu: đã có luồng ứng viên, quản trị tuyển dụng, quản lý tin tuyển dụng, hồ sơ/CV, ứng tuyển, chấm điểm, shortlist, phỏng vấn, thông báo và báo cáo.

Tuy nhiên dự án chưa ở trạng thái sẵn sàng triển khai production. Working tree còn nhiều thay đổi chưa commit, pipeline AI mới đang được tích hợp, kiểm thử chưa chạy trọn bộ, cấu hình local còn phụ thuộc dịch vụ bên ngoài, và tài liệu gốc có một số nội dung không còn khớp code thực tế. Trạng thái phù hợp nhất hiện nay là **bản phát triển tích hợp (integration/development build)**.

### Đánh giá nhanh

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Candidate Portal | Khá hoàn chỉnh | Có đăng ký, đăng nhập, tìm việc, hồ sơ, CV và ứng tuyển |
| Admin/HR Portal | Khá hoàn chỉnh | Có dashboard, công việc, ứng viên, shortlist, phỏng vấn, báo cáo |
| Backend API | Khá hoàn chỉnh | Nhiều API nghiệp vụ đã có; cần test hồi quy |
| Database | Hoạt động local | 23 migration; database local có dữ liệu test |
| AI Agent | Đang tích hợp | Graph 4 node và self-reflection đã có trong working tree |
| Background jobs | Có nền tảng | Celery/Redis task đã có; cần xác minh end-to-end |
| File storage | Có tích hợp MinIO | Cần chuẩn hóa cách khởi động và dữ liệu local |
| Automated tests | Chưa đạt | Hai bộ test hiện lỗi ở bước import/collection |
| AI usage logging | Một phần | Script submit hoạt động; Codex extension hook chưa tự ghi ổn định |
| Deployment/CI | Chưa xác minh | Docker files ở commit hiện tại đã bị xóa; chưa có live URL được xác nhận |

## 2. Mục tiêu và phạm vi sản phẩm

Sản phẩm hướng tới tự động hóa quy trình tuyển dụng, đặc biệt là sàng lọc hồ sơ bằng AI. Có ba nhóm người dùng chính:

1. **Ứng viên**: tạo tài khoản, xác thực email, quản lý hồ sơ/CV, tìm kiếm việc làm, ứng tuyển và theo dõi trạng thái.
2. **HR/Recruiter**: tạo và quản lý tin tuyển dụng, xem hồ sơ ứng viên, chấm điểm, shortlist, lên lịch phỏng vấn và theo dõi pipeline.
3. **Admin**: phê duyệt tài khoản HR, quản lý người dùng/công ty và xem báo cáo tổng quan.

AI Agent nhận dữ liệu CV và yêu cầu công việc, trích xuất thông tin, đánh giá độ phù hợp, sinh câu hỏi phỏng vấn và tự kiểm chứng kết quả trước khi lưu/gửi thông báo.

## 3. Kiến trúc thực tế

```text
Candidate Portal (Angular, :4300) ─┐
                                   ├── FastAPI API (:8000) ── PostgreSQL
Admin/HR Portal (Angular, :4200) ──┘          │
                                              ├── Redis / Celery workers
                                              ├── MinIO object storage
                                              └── LangGraph AI Evaluation Agent
                                                       │
                                                       └── LLM provider
```

### 3.1 Thành phần chính

- `frontend-portal/`: Angular 17 dành cho ứng viên.
- `frontend-admin/`: Angular 17 dành cho HR và admin.
- `backend/app/`: API nghiệp vụ FastAPI, ORM, service và background tasks.
- `src/`: AI Evaluation Agent và API agent độc lập được mount vào backend.
- `backend/alembic/`: migration PostgreSQL.
- `scripts/`: AI usage hooks và submit log lên Phoenix/grading server.
- `tests/` và `backend/tests/`: hai nhóm kiểm thử Python hiện chưa được hợp nhất.
- `docs/`: Project Brief, PRD, wireframe, hướng dẫn kỹ thuật và báo cáo này.

### 3.2 Sai lệch tài liệu cần lưu ý

`ARCHITECTURE.md` hiện vẫn mô tả frontend là React/Next.js, nhưng source thực tế sử dụng **Angular 17** cho cả hai frontend. Khi tiếp tục dự án, source code và báo cáo này nên được coi là nguồn sự thật hiện tại; tài liệu kiến trúc cũ cần cập nhật.

## 4. Chức năng đã hiện diện trong code

### 4.1 Xác thực và tài khoản

- Đăng ký ứng viên.
- Đăng ký tài khoản HR.
- Đăng nhập chung cho các role.
- Access token và refresh token.
- Cookie HttpOnly và token trong frontend interceptor.
- Xác thực/resend email.
- Quên mật khẩu và đặt lại mật khẩu.
- Lấy thông tin người dùng hiện tại.
- Admin phê duyệt hoặc từ chối tài khoản HR.
- CRUD người dùng dành cho admin.
- Role guard cho candidate, HR và admin.

### 4.2 Quản lý công ty

- Danh sách, tạo, xem, sửa và xóa công ty.
- Liên kết HR với `company_code`.
- Trang công ty công khai và danh sách việc theo công ty.

### 4.3 Tin tuyển dụng

- CRUD tin tuyển dụng.
- Workflow: `draft`, `pending_approval`, `approved`, `rejected`, `active`, `closed`.
- Submit, approve, reject, publish, unpublish và close.
- Tiêu chí bắt buộc/ưu tiên, số năm kinh nghiệm, trình độ học vấn.
- Trọng số kỹ năng, kinh nghiệm và học vấn.
- Danh sách việc công khai, lọc/sắp xếp, chi tiết theo slug.
- Tìm kiếm việc làm bằng CV.

### 4.4 Hồ sơ ứng viên và CV

- Xem/cập nhật profile ứng viên.
- Upload, xem danh sách, xóa và chọn CV mặc định.
- Trích xuất nội dung file CV.
- Lưu file qua MinIO.
- Phân tích section và xử lý tiếng Việt.

### 4.5 Ứng tuyển và pipeline tuyển dụng

- Ứng tuyển vào tin tuyển dụng.
- Xem các công việc đã ứng tuyển.
- Candidate xem danh sách và chi tiết hồ sơ ứng tuyển.
- HR xem ứng viên theo công việc.
- Chuyển trạng thái ứng viên.
- Shortlist, interviewing và interview-passed.
- So sánh ứng viên và xem chi tiết match/scoring.
- Tạo và quản lý lịch phỏng vấn.

### 4.6 Chấm điểm và AI evaluation

- Chấm điểm theo keyword/criteria.
- Embedding scorer đa ngôn ngữ.
- Lưu kết quả chấm điểm chi tiết.
- Chạy lại scoring.
- AI evaluation và email đánh giá.
- Pipeline LangGraph mới gồm:
  - `extractor`: chia nhỏ và trích xuất bằng chứng từ CV.
  - `evaluator`: đánh giá kỹ năng, kinh nghiệm, học vấn và đề xuất.
  - `question_gen`: sinh câu hỏi phỏng vấn.
  - `verifier`: kiểm tra chất lượng kết quả.
  - Self-reflection: quay lại evaluator tối đa hai lần nếu verification không đạt.

Phần graph/nodes mới đang nằm trong working tree chưa commit, do đó phải được review và test trước khi merge hoặc deploy.

### 4.7 Thông báo và báo cáo

- Danh sách thông báo, unread count, đánh dấu đã đọc và read-all.
- WebSocket cho thông báo thời gian thực.
- Email service cho xác thực, reset password, ứng tuyển và AI evaluation.
- Dashboard statistics.
- Reports overview.

## 5. Giao diện hiện tại

### 5.1 Candidate Portal (`frontend-portal`)

Các route đã có:

- `/`: trang chủ.
- `/jobs`: danh sách việc làm.
- `/jobs/:slug`: chi tiết công việc.
- `/companies/:code`: thông tin công ty.
- `/login`, `/register`.
- `/verify-email`, `/resend-verification`, `/email-required`.
- `/forgot-password`, `/reset-password`.
- `/dashboard`: dashboard ứng viên.
- `/dashboard/applications`: hồ sơ đã ứng tuyển.
- `/dashboard/profile`: hồ sơ và CV.
- `/dashboard/cv-search`: tìm việc bằng CV.

### 5.2 Admin/HR Portal (`frontend-admin`)

Các route đã có:

- `/login`, `/register-hr`.
- `/dashboard`.
- `/jobs`, `/jobs/new`, `/jobs/:id`, `/jobs/:id/edit`.
- `/jobs/shortlisted`.
- `/jobs/interviewing`.
- `/jobs/interview-passed`.
- `/reports`.
- `/users`, `/companies`, `/approvals` dành cho admin.

### 5.3 Trạng thái chạy được xác minh

Trong lần kiểm tra gần nhất:

- Admin frontend `http://localhost:4200`: HTTP 200.
- Candidate portal `http://localhost:4300`: HTTP 200.
- Backend từng chạy thành công và `/health` trả 200, nhưng tại thời điểm lập báo cáo backend không còn chạy.

Phải dùng hostname `localhost`, không dùng `127.0.0.1`, vì CORS hiện chỉ allow `http://localhost:4200` và `http://localhost:4300`.

## 6. Backend và API

Backend chính được khởi động qua `run_local.py`, file này đưa `backend/` vào Python path và mount cả API nghiệp vụ lẫn agent router.

Các nhóm endpoint chính:

- `/health`: health check.
- `/pub/auth/*`: xác thực công khai.
- `/pub/jobs/*`: việc làm và ứng tuyển công khai.
- `/pub/me/*`: profile/CV ứng viên.
- `/pub/applications/*`: hồ sơ ứng tuyển của ứng viên.
- `/api/v1/auth/me`: người dùng hiện tại.
- `/api/v1/users/*`: quản lý user/phê duyệt HR.
- `/api/v1/companies/*`: quản lý công ty.
- `/api/v1/jobs/*`: quản lý workflow công việc.
- `/api/v1/jobs/{id}/applications`: pipeline ứng viên.
- `/api/v1/scoring/*`: scoring và AI evaluation.
- `/api/v1/interviews/*`: lịch phỏng vấn.
- `/api/v1/notifications/*`: thông báo và WebSocket.
- `/api/v1/dashboard/stats`, `/api/v1/reports/overview`.
- Agent API `/evaluate` và `/status` theo prefix được mount trong app.

Backend có rate limiting, CORS, security validation lúc startup, JWT, role dependency và exception handling. Chưa có bằng chứng test bảo mật end-to-end đầy đủ.

## 7. Database và dữ liệu local

### 7.1 Schema

Có **23 Alembic migrations**, bao phủ:

- users và authentication;
- jobs và criteria;
- candidate profile, resumes và applications;
- scoring results;
- AI evaluation fields;
- companies và HR approval;
- interviews;
- notifications.

Các model chính gồm User, CandidateProfile, Company, Job, JobCriteria, Resume, Application, ScoringResult, Interview, Notification và Audit.

### 7.2 Dữ liệu tại thời điểm kiểm kê

Database local được truy vấn thành công và có:

- 16 công việc tổng cộng.
- 16 công việc đang publish.
- 12 công việc mock có slug `mock-ui-*`.
- 6 người dùng.
- 1 admin.

Đây là dữ liệu local phục vụ phát triển, không phải dữ liệu production.

### 7.3 Script hỗ trợ local

- `backend/scripts/create_admin.py`: tạo/cập nhật admin local.
- `backend/scripts/seed_mock_jobs.py`: seed tin tuyển dụng idempotent.
- `backend/scripts/reset_non_admin_users.py`: reset tài khoản non-admin; cần dùng thận trọng.

Hai script đầu đang chưa được Git track tại thời điểm báo cáo.

## 8. Cấu hình và dịch vụ phụ thuộc

`.env` hiện có cấu hình cho database, Redis, MinIO, JWT, SMTP và AI logging. Không ghi giá trị bí mật vào báo cáo này.

Trạng thái biến quan trọng:

| Nhóm | Trạng thái |
|---|---|
| PostgreSQL | Đã cấu hình và truy cập được |
| Redis | Đã cấu hình; chưa xác minh worker end-to-end trong lượt kiểm tra này |
| MinIO | Đã cấu hình; có `minio.exe` local chưa track |
| JWT | Đã cấu hình |
| SMTP | Đã cấu hình |
| Gemini API | Hiện để trống |
| Phoenix AI log server/key | Đã cấu hình |
| DEBUG | Đã đặt dạng boolean tại thời điểm kiểm kê |

`minio.exe` khoảng 38 MB đang nằm ở root và chưa được track. Không nên commit binary này nếu chưa có chủ đích; nên dùng hướng dẫn tải/cài hoặc container rõ ràng.

## 9. Kiểm thử và chất lượng

### 9.1 Kết quả pytest thực tế

Hai bộ test đều chưa chạy thành công:

1. `pytest tests` dừng ở bước load `conftest.py` vì `src` import `app.models` nhưng `backend/` chưa nằm trong Python path.
2. `pytest backend/tests` dừng ở collection vì thiếu package `rapidfuzz` trong virtual environment hiện tại.

Vì vậy hiện chưa thể khẳng định regression suite pass. Đây là blocker quan trọng trước khi merge/deploy.

### 9.2 Frontend dependencies

`npm ci` đã cài thành công cho cả hai frontend. NPM audit báo 77 vulnerability trong dependency tree (4 low, 22 moderate, 48 high, 3 critical). Chưa chạy `npm audit fix --force` vì có nguy cơ gây breaking changes cho Angular 17.

### 9.3 Các kiểm tra cần bổ sung

- Hợp nhất cách đặt Python path và dependency giữa root/backend.
- Chạy đầy đủ unit/integration tests.
- Thêm test API auth, CORS, job workflow, upload/apply và scoring.
- Chạy `ng test` và `ng build` cho cả hai frontend.
- Kiểm tra migration từ database rỗng.
- Kiểm tra Celery + Redis + MinIO end-to-end.
- Mock LLM để test graph deterministically.

## 10. AI usage logging

Hệ thống logging gồm:

- `.ai-log/session.jsonl`: log mới đang chờ gửi.
- `.ai-log/archive/YYYY-MM-DD.jsonl`: log đã gửi và lưu cục bộ.
- `scripts/log_hook.py`: chuẩn hóa hook event.
- `scripts/log_antigravity.py`: quét transcript Antigravity.
- `scripts/submit_log.py`: gửi batch lên Phoenix/grading server rồi rotate archive.
- Git pre-push hook: quét và submit khi push.

`submit_log.py` đã được chỉnh để tự đọc `.env` tại root mà không phụ thuộc bắt buộc vào `python-dotenv`.

Codex project hooks đã được sửa theo schema mới (`type = command`, `commandWindows`) và `[features].hooks = true` đã được thêm. Tuy nhiên VS Code Codex extension chưa chứng minh được rằng nó tự động kích hoạt hook trong chat; các entry Codex gần nhất là smoke test được mô phỏng. Không nên coi Codex auto-logging là hoàn tất cho tới khi một prompt thật từ chat mới xuất hiện tự động trong `session.jsonl`.

## 11. Git và trạng thái mã nguồn

Nhánh hiện tại `nhv` đang đồng bộ với `origin/nhv` tại commit `c711ebb`, nhưng working tree có nhiều thay đổi chưa commit.

Nhóm thay đổi đang làm gồm:

- Hook/config AI logging.
- API jobs, applications và scoring.
- Service resume, storage, scoring và AI evaluation.
- Celery configuration.
- Một số màn hình job/shortlist của frontend admin.
- Toàn bộ pipeline LangGraph mới, prompt, tool, chunking và service AI.
- Script tạo admin và seed mock jobs.
- Binary `minio.exe` chưa track.

Không được reset/checkout hàng loạt vì đây có thể là công việc chưa commit của thành viên dự án. Nên review, chia commit theo chức năng và chạy test trước khi push.

## 12. Các rủi ro và vấn đề ưu tiên

### P0 — phải xử lý trước khi demo/deploy

1. Sửa test import/dependency để có regression baseline.
2. Review và test pipeline AI mới end-to-end.
3. Xác minh Gemini/LLM provider; `GEMINI_API_KEY` hiện trống.
4. Chuẩn hóa cách chạy PostgreSQL, Redis, MinIO và Celery.
5. Kiểm tra các secret trong `.env`, rotate nếu từng bị lộ trong terminal/log/chat.
6. Tách và commit có kiểm soát các thay đổi đang dở.

### P1 — quan trọng cho độ ổn định

1. Cho phép/chuẩn hóa CORS cho môi trường local, tránh lỗi `localhost` và `127.0.0.1`.
2. Xử lý dependency vulnerabilities theo cách có kiểm thử, không dùng `--force` mù quáng.
3. Xác minh upload/apply với MinIO và background scoring.
4. Xác minh SMTP và tất cả email flow.
5. Thêm validation/error UI nhất quán ở hai frontend.
6. Cập nhật README/ARCHITECTURE theo Angular và kiến trúc thực tế.

### P2 — hoàn thiện sản phẩm

1. Bổ sung observability/structured logging.
2. Thêm dữ liệu demo có thể seed/cleanup chính thức.
3. Chuẩn hóa scripts Windows/POSIX.
4. Hoàn thiện CI/CD, container và live deployment.
5. Hoàn thiện evaluation evidence, video demo và pitch deck.

## 13. Cách chạy local từ đầu

### 13.1 Python

```powershell
python -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
pip install -r backend\requirements.txt
```

### 13.2 Cấu hình

```powershell
Copy-Item .env.example .env
```

Điền database, Redis, MinIO, JWT, SMTP và LLM key phù hợp. Không commit `.env`.

### 13.3 Migration

```powershell
Set-Location backend
..\.venv\Scripts\python.exe -m alembic upgrade head
Set-Location ..
```

### 13.4 Backend

```powershell
.\.venv\Scripts\python.exe -m uvicorn run_local:app --reload --host 127.0.0.1 --port 8000
```

- Swagger: `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`

### 13.5 Frontend Admin

```powershell
Set-Location frontend-admin
npm ci
npm start -- --host 127.0.0.1 --port 4200
```

Mở `http://localhost:4200`.

### 13.6 Candidate Portal

```powershell
Set-Location frontend-portal
npm ci
npm start -- --host 127.0.0.1 --port 4300
```

Mở `http://localhost:4300`.

### 13.7 Dữ liệu test

```powershell
.\.venv\Scripts\python.exe backend\scripts\create_admin.py `
  --email admin@local.test `
  --password "<mat-khau-local-manh>" `
  --name "Local Admin"

.\.venv\Scripts\python.exe backend\scripts\seed_mock_jobs.py
```

Không dùng credential local cố định cho production.

## 14. Kế hoạch tiếp quản đề xuất

### Giai đoạn 1 — ổn định repository

1. Backup/commit các thay đổi hiện tại theo nhóm nhỏ.
2. Loại `minio.exe` khỏi phạm vi commit hoặc bổ sung chính sách artifact rõ ràng.
3. Đồng bộ requirements và Python import path.
4. Làm cho toàn bộ test collect và chạy được.

### Giai đoạn 2 — xác minh luồng nghiệp vụ

1. Auth candidate/HR/admin.
2. Job lifecycle từ draft tới publish/close.
3. Upload CV và ứng tuyển.
4. Scoring, shortlist, phỏng vấn và notification.
5. Dashboard/report.

### Giai đoạn 3 — hoàn thiện AI Agent

1. Khóa schema input/output cho từng node.
2. Mock LLM và viết unit test cho graph.
3. Chạy evaluation trên bộ CV/job mẫu.
4. Kiểm tra retry/reflection và failure handling.
5. Gắn kết quả agent với DB/email/UI.

### Giai đoạn 4 — production readiness

1. Docker/compose hoặc hướng dẫn dịch vụ local thống nhất.
2. CI chạy lint, test, build và migration check.
3. Secret management và rotate credentials.
4. Monitoring, structured logging, health/readiness checks.
5. Deploy staging, smoke test rồi mới deploy production.

## 15. Kết luận

Dự án đã có nền tảng sản phẩm tương đối rộng và nhiều màn hình/API nghiệp vụ thực tế. Giá trị chính hiện nằm ở hai portal Angular, backend tuyển dụng đầy đủ và pipeline AI đang được nâng cấp. Công việc ưu tiên không phải thêm nhiều tính năng mới, mà là **ổn định thay đổi đang dở, khôi phục test suite, xác minh hạ tầng và chứng minh AI workflow end-to-end**.

Nếu hoàn thành các P0 trong báo cáo này, dự án có thể chuyển từ trạng thái integration build sang demo-ready. Để production-ready, vẫn cần hardening bảo mật, CI/CD, deployment, observability và kiểm thử hồi quy toàn diện.
