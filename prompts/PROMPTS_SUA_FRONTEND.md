# Danh sách Prompt Sửa & Tối Ưu Frontend (Admin & Portal)

> Bộ 50 prompt chi tiết dành cho việc rà soát, refactor, sửa lỗi, hoàn thiện tính năng và tối ưu hóa trải nghiệm người dùng trên 2 ứng dụng Frontend: `frontend-admin` (Angular) và `frontend-portal` (Angular).

---

## Quy tắc thực hiện áp dụng cho mỗi prompt

```text
Quy tắc thực hiện:
- Trước khi sửa, đọc code component, template, style và service liên quan.
- Giữ các thay đổi trong đúng phạm vi prompt yêu cầu.
- Tuân thủ Angular Standalone Components, Signal/RxJS và cấu trúc hiện có.
- Không thay đổi các file backend/API không liên quan.
- Đảm bảo type-safe (TypeScript strict mode), không dùng `any` bừa bãi.
- Kiểm tra tính tương thích Responsive (Desktop, Tablet, Mobile).
- Chạy build/test `ng build` hoặc `npm run build` sau khi chỉnh sửa để đảm bảo không gãy compile.
- Báo cáo rõ: các file đã sửa, quyết định UI/UX, logic đã tối ưu và rủi ro còn lại.
```

---

## Nhóm 1 — Khảo sát, Kiểm kê & Chuẩn hóa Kiến trúc Frontend (Prompts 1 – 6)

### Prompt 1 — Khảo sát kiến trúc và luồng dữ liệu 2 App Frontend

```text
Hãy khảo sát toàn bộ mã nguồn của cả 2 ứng dụng `frontend-admin` và `frontend-portal`.

Chỉ phân tích, chưa sửa code.

Hãy trả về:
1. Sơ đồ cây Routing và các Route Guard của từng ứng dụng.
2. Danh sách các Feature Modules/Components (Standalone Components).
3. Cách thức quản lý state (Signals, BehaviorSubject, Service-based state).
4. Danh sách các API endpoints được gọi và HttpInterceptor xử lý token/lỗi.
5. Danh sách component dùng chung (shared components, pipes, directives).
6. Các điểm bất đồng bộ dữ liệu hoặc code thừa/lỗi thời giữa admin và portal.
```

### Prompt 2 — Kiểm tra và chuẩn hóa Type/Interface với Backend Schema

```text
Hãy rà soát toàn bộ các file models/interfaces trong `frontend-admin/src/app/features/jobs/models` và `frontend-portal/src/app/core/models`.

Yêu cầu:
- So sánh các interface (`Job`, `Application`, `ScoringResult`, `AiEvaluation`, `JobCriteria`, `CandidateProfile`) với Pydantic schema ở backend (`backend/app/schemas` và `src/models/schemas.py`).
- Phát hiện các field bị lệch tên, thiếu optional (`?`), hoặc sai kiểu dữ liệu (ví dụ `number` vs `string`, `null` vs `undefined`).
- Cập nhật và đồng bộ lại các interface TypeScript để đảm bảo strict type-checking, không dùng `any`.
- Báo cáo danh sách interface đã cập nhật.
```

### Prompt 3 — Kiểm tra cấu hình Build, Environment & Interceptor ######

```text
Hãy kiểm tra cấu hình môi trường và HTTP client trong cả 2 app (`frontend-admin` và `frontend-portal`).

Yêu cầu:
- Kiểm tra `environment.ts` và `environment.prod.ts` cho API URL (`http://localhost:8000/api/v1` và production URL).
- Kiểm tra `auth.interceptor.ts`: xử lý đính kèm Bearer JWT Token, bắt lỗi 401 (refresh token hoặc redirect về login), bắt lỗi 403 (cấm quyền) và lỗi 500.
- Đảm bảo `withFetch()` hoặc `provideHttpClient()` được cấu hình chuẩn trong `app.config.ts`.
- Báo cáo và sửa các thiếu sót trong Interceptor.
```

### Prompt 4 — Chuẩn hóa Design System & Typography/Color Tokens

```text
Hãy rà soát CSS/SCSS toàn cục (`styles.scss`, `tailwind.config.js` nếu có) của cả 2 app Frontend.

Yêu cầu:
- Chuẩn hóa bảng màu (Primary, Secondary, Success, Warning, Danger, Neutral Grayscale) theo chuẩn HSL/CSS Variables.
- Đảm bảo tính nhất quán về font chữ, border-radius, box-shadow, badge styles giữa admin và portal.
- Loại bỏ các inline style thừa hoặc màu sắc hardcoded không đồng nhất.
- Đảm bảo độ tương phản màu sắc (Contrast Ratio) đạt chuẩn WCAG AA cho khả năng đọc.
```

### Prompt 5 — Rà soát Memory Leak trong Subscriptions RxJS

```text
Hãy quét toàn bộ components trong `frontend-admin` và `frontend-portal` để tìm các subscription RxJS chưa được unsubscribe.

Yêu cầu:
- Chuyển đổi các subscription thủ công sang dùng `takeUntilDestroyed()`, `async pipe` trên template, hoặc chuyển sang Angular Signals (`toSignal()`, `signal()`).
- Đảm bảo mọi Observable gọi HTTP hoặc Timer được dọn dẹp sạch sẽ khi component bị destroy.
- Báo cáo danh sách các components đã được refactor.
```

### Prompt 6 — Thiết lập Global Error Handler & Toast Notification Service

```text
Hãy kiểm tra và hoàn thiện hệ thống thông báo Toast (Success, Error, Info, Warning) và Global Error Handler cho cả 2 app frontend.

Yêu cầu:
- Tạo hoặc tối ưu `NotificationService` để hiển thị popup toast mượt mà với auto-dismiss (3-5s).
- Bắt lỗi HTTP toàn cục để hiển thị thông báo lỗi thân thiện bằng tiếng Việt (ví dụ: "Không thể kết nối đến máy chủ", "Phiên đăng nhập đã hết hạn", "Dữ liệu không hợp lệ").
- Tránh việc hiển thị raw JSON error từ backend lên UI người dùng.
```

---

## Nhóm 2 — Modal Đánh giá AI & Hiển thị Kết quả Chấm Điểm (Prompts 7 – 13)

### Prompt 7 — Tối ưu hóa UI/UX Modal Đánh Giá AI Chuyên Sâu (`ai-evaluation-modal`)

```text
Hãy nâng cấp giao diện `ai-evaluation-modal.component.ts` trong `frontend-admin`.

Yêu cầu:
- Thiết kế layout phân vùng rõ ràng:
  1. Header: Họ tên ứng viên, vị trí ứng tuyển, badge recommendation (`STRONG_FIT`, `GOOD_FIT`, `PARTIAL_FIT`, `WEAK_FIT`, `NOT_FIT`) có màu sắc trực quan.
  2. Cột trái: Điểm tổng quan AI Score (vòng tròn tiến trình / gauge chart 0-100), Nhận xét tổng quan, Điểm mạnh (Strengths - icon tick xanh), Điểm cần lưu ý (Concerns - icon cảnh báo vàng).
  3. Cột phải: Bảng đánh giá chi tiết từng kỹ năng (Must-have, Nice-to-have) kèm mức độ thành thạo và bằng chứng trích xuất từ CV.
- Thêm tab xem "Kinh nghiệm & Học vấn" và tab "Bộ câu hỏi phỏng vấn đề xuất".
```

### Prompt 8 — Xử lý trạng thái Loading, Re-evaluating & Empty State trong AI Modal

```text
Hãy hoàn thiện các trạng thái động trong `ai-evaluation-modal.component.ts`.

Yêu cầu:
- Khi đang chạy AI evaluation: hiển thị Skeleton Loading hoặc hiệu ứng Animation "AI Agent đang phân tích đa chiều hồ sơ..." kèm bước xử lý (Đang trích xuất -> Đang đối chiếu kỹ năng -> Đang sinh câu hỏi...).
- Nút "Chấm lại bằng AI (Re-evaluate)": hiển thị spinner, disable nút để tránh spam request.
- Nếu ứng viên chưa có kết quả AI: hiển thị Empty State lịch sự với nút "Kích hoạt Chấm điểm AI ngay".
- Nếu AI evaluation thất bại: hiển thị thông báo lỗi rõ ràng và nút "Thử lại".
```

### Prompt 9 — Hiển thị Bằng chứng Kỹ năng (Evidence Snippets) chống hiển thị ảo giác

```text
Trong `ai-evaluation-modal.component.ts`, hãy cải tiến phần hiển thị danh sách kỹ năng (`skill_assessments`).

Yêu cầu:
- Với mỗi skill: hiển thị tên skill, badge "Đã tìm thấy" (xanh) hoặc "Không tìm thấy" (xám/đỏ), mức độ tin cậy (Confidence %).
- Nếu `found = true`: hiển thị trích đoạn bằng chứng (`evidence`) trong một block trích dẫn có viền nổi bật (quote block).
- Nếu `evidence` là "Không tìm thấy" hoặc rỗng: hiển thị rõ nhãn "Chưa thấy bằng chứng cụ thể trong CV", tránh để trống.
- Có tooltip giải thích ý nghĩa của từng mức độ thành thạo (Beginner, Intermediate, Advanced, Expert).
```

### Prompt 10 — Hiển thị Đánh giá Học vấn & Kinh nghiệm chi tiết trong AI Modal

```text
Trong `ai-evaluation-modal.component.ts`, hãy bổ sung section trực quan cho `experience_assessment` và `education_assessment`.

Yêu cầu:
- Kinh nghiệm: Hiển thị số năm phát hiện (`detected_years`) so với yêu cầu (`min_experience_years`), thanh tiến trình đạt/vượt yêu cầu, tóm tắt đánh giá kinh nghiệm thực tế.
- Học vấn: Hiển thị cấp độ bằng cấp (`detected_level`), độ phù hợp ngành nghề (`field_relevant` - Đúng chuyên ngành / Trái ngành), và tóm tắt nhận xét học vấn.
- Thêm tag cảnh báo nếu ứng viên thiếu năm kinh nghiệm tối thiểu hoặc bằng cấp chưa khớp.
```

### Prompt 11 — Hiển thị Danh sách Câu hỏi Phỏng vấn Thông minh từ AI Agent

```text
Trong `ai-evaluation-modal.component.ts`, hãy xây dựng giao diện hiển thị danh sách câu hỏi phỏng vấn (`interview_questions`).

Yêu cầu:
- Nhóm câu hỏi theo danh mục: Kỹ thuật chuyên sâu (Technical), Kiến trúc & Tối ưu (Architecture), Kinh nghiệm thực tế (Experience), Xử lý tình huống (Situational), Kỹ năng mềm (Behavioral).
- Mỗi câu hỏi hiển thị: Nội dung câu hỏi (in đậm, rõ ràng), Mục tiêu đánh giá (`purpose`), Kỹ năng nhắm tới (`target_skill`).
- Thêm nút "Sao chép câu hỏi" (Copy to clipboard) cho từng câu và nút "Sao chép toàn bộ bộ câu hỏi phỏng vấn".
- Có nút "Tạo lịch phỏng vấn với các câu hỏi này" để mở nhanh `interview-schedule-modal`.
```

### Prompt 12 — Phân biệt rõ ràng giữa Điểm Sàng Lọc Ban Đầu và Điểm Đánh Giá AI

```text
Hãy rà soát tất cả các màn hình hiển thị điểm số trong `frontend-admin` (`shortlisted.component.ts`, `job-detail.component.ts`, modal).

Yêu cầu:
- Không gộp chung hoặc làm lẫn lộn giữa `total_score` (Điểm công thức sàng lọc tự động) và `ai_score` (Điểm đánh giá sâu của AI Agent).
- Hiển thị 2 cột/badge điểm riêng biệt:
  + "Điểm Sàng lọc": Kèm tooltip giải thích công thức (Kỹ năng + Kinh nghiệm + Học vấn).
  + "Điểm AI Agent": Kèm tooltip giải thích (Đánh giá sâu ngữ cảnh & năng lực thực tế).
- Thêm badge cảnh báo nếu có sự chênh lệch lớn giữa Điểm Sàng lọc và Điểm AI (để HR lưu ý kiểm tra lại).
```

### Prompt 13 — Chức năng Xuất Báo Cáo Đánh Giá AI ra PDF/In Ấn

```text
Trong `ai-evaluation-modal.component.ts`, hãy thêm tính năng xuất báo cáo đánh giá ứng viên.

Yêu cầu:
- Thêm nút "In / Xuất PDF báo cáo đánh giá" trên header của modal.
- Định dạng Print CSS (`@media print`) tối ưu: ẩn các nút bấm, format trang A4 chuẩn đẹp, giữ nguyên thông tin ứng viên, điểm số, nhận xét, kỹ năng và bộ câu hỏi phỏng vấn.
- Thêm watermark logo công ty và thời gian xuất báo cáo.
```

---

## Nhóm 3 — Modal So Sánh Ứng Viên & Match Details (Prompts 14 – 20)

### Prompt 14 — Nâng cấp Modal So Sánh Ứng Viên (`compare-candidates-modal`)

```text
Hãy nâng cấp toàn diện `compare-candidates-modal.component.ts` trong `frontend-admin`.

Yêu cầu:
- Cho phép so sánh song song từ 2 đến 4 ứng viên đã chọn.
- Bảng so sánh đa chiều gồm các hàng:
  1. Thông tin chung (Họ tên, email, năm sinh/kinh nghiệm, vị trí hiện tại).
  2. Điểm sàng lọc (Tổng điểm, Điểm Kỹ năng, Điểm Kinh nghiệm, Điểm Học vấn).
  3. Điểm AI Agent & Khuyến nghị (Recommendation).
  4. Ma trận Kỹ năng Bắt buộc (Must-have): Đánh dấu Tick xanh / Cross đỏ cho từng ứng viên.
  5. Điểm mạnh nổi bật nhất & Rủi ro/Lỗ hổng tiềm ẩn.
- Có highlight màu xanh cho ứng viên có điểm số/kỹ năng vượt trội nhất ở từng tiêu chí.
```

### Prompt 15 — Biểu đồ Radar/Bar Chart So Sánh Ứng Viên

```text
Trong `compare-candidates-modal.component.ts`, hãy tích hợp biểu đồ trực quan (dùng SVG thuần hoặc Chart.js/ApexCharts nếu có).

Yêu cầu:
- Vẽ biểu đồ Radar Chart hoặc Grouped Bar Chart so sánh các ứng viên trên 5 trục:
  1. Kỹ năng Bắt buộc (Must-have Skills)
  2. Kỹ năng Mở rộng (Nice-to-have Skills)
  3. Số năm Kinh nghiệm (Experience)
  4. Trình độ Học vấn (Education)
  5. Đánh giá Tổng thể AI (Overall AI Fit)
- Có legend chú thích màu cho từng ứng viên, animation vẽ biểu đồ mượt mà.
```

### Prompt 16 — Nâng cấp Modal Chi Tiết Điểm Khớp (`match-details-modal`)

```text
Hãy cải tiến `match-details-modal.component.ts` trong `frontend-admin`.

Yêu cầu:
- Phân tích chi tiết công thức tính điểm: Hiển thị trọng số từng phần (ví dụ: Skills 60%, Exp 30%, Edu 10%).
- Section Kỹ năng: Phân loại rõ kỹ năng nào match bằng "Từ khóa chính xác" (Keyword Exact), kỹ năng nào match bằng "AI Ngữ nghĩa" (Embedding Rescued kèm % Similarity), và kỹ năng nào "Còn thiếu" (Missing).
- Section Kinh nghiệm: Hiển thị các câu trích dẫn trong CV được hệ thống dùng để tính số năm kinh nghiệm.
- Section Học vấn: Hiển thị tên trường/ngành học trích xuất từ CV.
```

### Prompt 17 — Highlight Từ Khóa & Trích Đoạn Trong CV Modal

```text
Trong `match-details-modal.component.ts` hoặc modal xem CV, hãy thêm tính năng highlight trực quan.

Yêu cầu:
- Hiển thị nội dung văn bản CV thô (`raw_text`) hoặc CV viewer.
- Tự động highlight bằng màu sắc các từ khóa kỹ năng đã match (màu xanh lá cho must-have, màu xanh dương cho nice-to-have, màu vàng cho kinh nghiệm).
- Có thanh tìm kiếm từ khóa nhanh trong văn bản CV kèm nút Next/Previous vị trí tìm thấy.
```

### Prompt 18 — Modal Đặt Lịch Phỏng Vấn (`interview-schedule-modal`)

```text
Hãy hoàn thiện `interview-schedule-modal.component.ts` trong `frontend-admin`.

Yêu cầu:
- Form đặt lịch gồm các trường:
  + Vòng phỏng vấn (Vòng 1 - HR, Vòng 2 - Technical, Vòng 3 - Culture Fit/Final).
  + Thời gian phỏng vấn (Ngày, Giờ bắt đầu, Giờ kết thúc).
  + Hình thức (Online qua Google Meet/Zoom/Teams hoặc Trực tiếp tại văn phòng).
  + Link họp online hoặc Địa chỉ phòng phỏng vấn.
  + Người phỏng vấn (Interviewer name, email).
  + Ghi chú / Đính kèm bộ câu hỏi gợi ý từ AI.
- Validate ngày giờ không được ở quá khứ, validate email người phỏng vấn.
- Có checkbox "Tự động gửi email thông báo kèm lịch cho ứng viên".
```

### Prompt 19 — Gửi Email Mời Phỏng Vấn Trực Tiếp Từ Giao Diện

```text
Trong `interview-schedule-modal.component.ts`, hãy thêm chức năng xem trước (Preview) và tùy chỉnh mẫu email mời phỏng vấn.

Yêu cầu:
- Có tab "Xem trước Email": hiển thị nội dung email được điền sẵn các biến động (`{candidate_name}`, `{job_title}`, `{interview_time}`, `{interview_link}`).
- Cho phép HR chỉnh sửa lại câu chữ email trước khi bấm nút "Xác nhận & Gửi thư mời".
- Xử lý trạng thái gửi email (spinner loading, toast thông báo thành công/thất bại).
```

### Prompt 20 — Lưu và Quản Lý Lịch Sử Phỏng Vấn Của Ứng Viên

```text
Hãy tạo hoặc tối ưu component hiển thị lịch sử phỏng vấn và kết quả các vòng phỏng vấn của ứng viên trong `frontend-admin`.

Yêu cầu:
- Hiển thị Timeline các vòng: Đã ứng tuyển -> Đã sàng lọc -> Đã Shortlist -> Đang phỏng vấn (Vòng 1, 2) -> Đạt/Không đạt.
- Với mỗi buổi phỏng vấn đã hoàn thành: cho phép HR nhập Điểm đánh giá phỏng vấn, Ghi chú nhận xét của Interviewer, và Đề xuất Tiếp tục / Dừng lại.
```

---

## Nhóm 4 — Quản lý Pipeline Ứng Viên & Trang Shortlisted (Prompts 21 – 27)

### Prompt 21 — Nâng cấp Giao diện Bảng Ứng Viên Shortlisted (`shortlisted.component.ts`)

```text
Hãy nâng cấp toàn diện trang `frontend-admin/src/app/features/jobs/pages/shortlisted/shortlisted.component.ts`.

Yêu cầu:
- Bảng danh sách ứng viên shortlisted với các cột: Checkbox chọn nhiều, Họ tên & Avatar, Điểm sàng lọc ban đầu, Điểm đánh giá AI, Trạng thái AI (Chưa chấm / Đã chấm / Lỗi), Ngày shortlist, Thao tác.
- Thanh công cụ phía trên: Nút "Chấm điểm AI hàng loạt" (Batch AI Evaluation), Nút "So sánh các ứng viên đã chọn" (kích hoạt khi chọn 2-4 ứng viên), Nút "Xuất danh sách Excel/CSV".
- Tìm kiếm tức thời theo tên ứng viên, email, số điện thoại.
```

### Prompt 22 — Bộ Lọc Đa Tiêu Chí cho Danh Sách Ứng Viên

```text
Trong `shortlisted.component.ts` và `job-detail.component.ts`, hãy bổ sung thanh lọc đa tiêu chí (Filter Bar).

Yêu cầu:
- Lọc theo khoảng điểm sàng lọc (ví dụ: >= 80, 60-79, < 60).
- Lọc theo khoảng điểm AI (ví dụ: >= 85, 70-84, < 70).
- Lọc theo Khuyến nghị AI (Tất cả, STRONG_FIT, GOOD_FIT, PARTIAL_FIT, WEAK_FIT, NOT_FIT).
- Lọc theo số năm kinh nghiệm (Tất cả, < 1 năm, 1-3 năm, 3-5 năm, > 5 năm).
- Lọc theo trạng thái phỏng vấn (Chưa xếp lịch, Đã xếp lịch, Đã phỏng vấn).
- Có nút "Xóa tất cả bộ lọc" và hiển thị số lượng kết quả khớp bộ lọc.
```

### Prompt 23 — Sắp Xếp Đa Chiều Danh Sách Ứng Viên

```text
Trong bảng danh sách ứng viên (`shortlisted.component.ts`), hãy thêm tính năng sắp xếp linh hoạt trên các tiêu đề cột (Sortable Table Headers).

Yêu cầu:
- Cho phép click vào header để sort tăng/giảm theo:
  + Điểm Sàng Lọc
  + Điểm AI Agent
  + Số năm kinh nghiệm
  + Ngày nộp đơn / Ngày shortlist
  + Họ tên A-Z
- Hiển thị icon mũi tên sắp xếp rõ ràng (Up/Down/Default).
- Lưu lại trạng thái sort vào URL query params để khi F5 không bị mất.
```

### Prompt 24 — Tính Năng Chấm Điểm AI Hàng Loạt (Batch AI Evaluation)

```text
Trong `shortlisted.component.ts`, hãy hoàn thiện luồng "Chấm điểm AI hàng loạt cho các ứng viên đã chọn".

Yêu cầu:
- Khi HR chọn nhiều ứng viên và bấm "Chấm điểm AI hàng loạt":
  1. Hiển thị modal xác nhận số lượng ứng viên sẽ chấm.
  2. Hiển thị thanh tiến trình xử lý (Progress bar: X / Y ứng viên hoàn thành).
  3. Cập nhật real-time trạng thái từng dòng trong bảng khi có kết quả trả về từ API.
  4. Hiển thị tổng kết khi xong: Số ứng viên thành công, số ứng viên bị lỗi (kèm nút thử lại cho các ứng viên lỗi).
```

### Prompt 25 — Chuyển Trạng Thái Ứng Viên Mượt Mà (Status Transition Kanban/Action)

```text
Trong `frontend-admin`, hãy tối ưu thao tác chuyển trạng thái ứng viên (Applied -> Shortlisted -> Interviewing -> Passed / Rejected).

Yêu cầu:
- Nút Action Dropdown hoặc Quick Buttons trên từng dòng ứng viên:
  + "Chuyển sang Phỏng vấn" (Mở modal xếp lịch).
  + "Đánh dấu Trúng tuyển" (Passed) kèm modal nhập offer lương/ngày nhận việc.
  + "Từ chối" (Reject) kèm modal chọn lý do từ chối và tùy chọn gửi email cảm ơn.
- Có hiệu ứng chuyển trạng thái mượt mà, cập nhật ngay UI không cần reload toàn bộ trang.
```

### Prompt 26 — Giao diện Quản Lý Ứng Viên Đang Phỏng Vấn (`interviewing.component.ts`)

```text
Hãy hoàn thiện trang `frontend-admin/src/app/features/jobs/pages/interviewing/interviewing.component.ts`.

Yêu cầu:
- Hiển thị danh sách các buổi phỏng vấn sắp diễn ra (Hôm nay, Tuần này, Đã hoàn thành).
- Card buổi phỏng vấn: Tên ứng viên, Vị trí, Thời gian, Link họp trực tuyến (có nút 1-click để vào phòng họp), Tên người phỏng vấn.
- Nút "Nhập kết quả & nhận xét phỏng vấn" và nút "Đổi lịch / Hủy lịch phỏng vấn".
```

### Prompt 27 — Giao diện Ứng Viên Trúng Tuyển (`interview-passed.component.ts`)

```text
Hãy hoàn thiện trang `frontend-admin/src/app/features/jobs/pages/interview-passed/interview-passed.component.ts`.

Yêu cầu:
- Hiển thị danh sách các ứng viên đã vượt qua phỏng vấn thành công.
- Thông tin quản lý Onboarding: Trạng thái gửi Offer (Chưa gửi, Đã gửi, Đã chấp nhận, Đã từ chối), Mức lương thỏa thuận, Ngày dự kiến onboard.
- Nút "Xuất hồ sơ ứng viên trọn gói" (gồm CV gốc, bảng điểm screening, đánh giá AI và nhận xét phỏng vấn).
```

---

## Nhóm 5 — Quản lý Job, Tiêu Chí & Form Trọng Số (Prompts 28 – 34)

### Prompt 28 — Nâng cấp Form Tạo/Sửa Job (`job-form.component.ts`)

```text
Hãy nâng cấp toàn diện `frontend-admin/src/app/features/jobs/pages/job-form/job-form.component.ts`.

Yêu cầu:
- Phân chia Form thành các bước (Step Wizard hoặc Tabs):
  + Bước 1: Thông tin chung (Tiêu đề công việc, Phòng ban, Cấp bậc, Địa điểm làm việc, Hình thức Fulltime/Remote, Dải lương Min-Max).
  + Bước 2: Mô tả công việc (Job Description) & Quyền lợi (Rich Text Editor hoặc Markdown Editor).
  + Bước 3: Tiêu chí chấm điểm tự động (Must-have skills, Nice-to-have skills, Kinh nghiệm, Học vấn).
  + Bước 4: Cấu hình trọng số tính điểm (Weights Configuration).
- Validate chặt chẽ: Dải lương Min <= Max, ngày hết hạn > ngày hiện tại, ít nhất 1 kỹ năng bắt buộc.
```

### Prompt 29 — Component Nhập Kỹ Năng Thông Minh Dạng Tag/Chips Input

```text
Trong `job-form.component.ts`, hãy xây dựng component nhập liệu Kỹ năng (Must-have / Nice-to-have Skills).

Yêu cầu:
- Dạng Chips / Tags input: Cho phép gõ phím Enter hoặc phẩy để thêm skill mới, có nút x để xóa chip.
- Gợi ý từ khóa tự động (Autocomplete / Typeahead) dựa trên danh mục kỹ năng phổ biến (Python, Java, React, Docker, AWS, SQL, v.v.).
- Ngăn chặn nhập trùng lặp kỹ năng giữa danh sách Must-have và Nice-to-have.
```

### Prompt 30 — Giao diện Điều Chỉnh Trọng Số Chấm Điểm (Criteria Weights Slider)

```text
Trong `job-form.component.ts`, hãy thiết kế component cấu hình trọng số chấm điểm (`weight_skills`, `weight_experience`, `weight_education`).

Yêu cầu:
- Sử dụng 3 thanh trượt (Sliders) tương ứng: Kỹ năng (%), Kinh nghiệm (%), Học vấn (%).
- Tự động normalize hoặc ràng buộc tổng 3 thanh trượt luôn bằng 100%.
- Có nút "Khôi phục trọng số mặc định" (60% Kỹ năng - 30% Kinh nghiệm - 10% Học vấn).
- Hiển thị biểu đồ Donut Chart nhỏ xem trước tỷ trọng phân bổ điểm.
```

### Prompt 31 — Trang Chi Tiết Công Việc & Thống Kê Pipeline (`job-detail.component.ts`)

```text
Hãy nâng cấp trang `frontend-admin/src/app/features/jobs/pages/job-detail/job-detail.component.ts`.

Yêu cầu:
- Header: Tiêu đề job, badge trạng thái (Active / Paused / Closed), dải lương, phòng ban, hạn nộp.
- Dashboard mini tổng quan Pipeline của Job:
  + Số lượng hồ sơ mới (Applied)
  + Số lượng đã sàng lọc (Screened)
  + Số lượng đã Shortlist
  + Số lượng đang Phỏng vấn (Interviewing)
  + Số lượng Trúng tuyển (Passed)
- Tabs chuyển đổi giữa "Danh sách ứng viên", "Tiêu chí & Mô tả JD", "Cài đặt Job".
```

### Prompt 32 — Trang Danh Sách Công Việc Tuyển Dụng (`job-list.component.ts`)

```text
Hãy hoàn thiện trang `frontend-admin/src/app/features/jobs/pages/job-list/job-list.component.ts`.

Yêu cầu:
- Hiển thị danh sách Job dạng bảng hoặc card lưới: Tiêu đề, Phòng ban, Số lượng ứng viên hiện có, Điểm trung bình ứng viên, Hạn nộp đơn, Trạng thái.
- Bộ lọc: Lọc theo phòng ban, theo trạng thái tuyển dụng (Đang mở / Đã đóng), theo khoảng thời gian.
- Nút thao tác nhanh: Xem ứng viên, Sửa job, Đóng/Mở lại job, Sao chép link nộp đơn để chia sẻ.
```

### Prompt 33 — Tính Năng Clone / Nhân Bản Job Nhanh

```text
Trong `job-list.component.ts`, hãy thêm tính năng "Nhân bản Job" (Duplicate Job).

Yêu cầu:
- Khi HR bấm "Nhân bản", sao chép toàn bộ thông tin mô tả, kỹ năng, tiêu chí và trọng số của job cũ sang form tạo mới với tiêu đề `[Copy] <Tên job cũ>`.
- Cho phép HR chỉnh sửa nhanh các thông tin cần thiết trước khi xuất bản.
```

### Prompt 34 — Quản Lý Đóng / Mở Tuyển Dụng & Gia Hạn Job

```text
Trong `job-detail.component.ts` và `job-list.component.ts`, hãy thêm luồng quản lý vòng đời Job.

Yêu cầu:
- Nút "Đóng tuyển dụng" kèm modal cảnh báo và lý do đóng.
- Nút "Gia hạn hạn nộp hồ sơ" với datepicker chọn ngày hết hạn mới.
- Khi job đã đóng: hiển thị badge cảnh báo màu xám, vô hiệu hóa việc nhận thêm hồ sơ mới từ portal nhưng vẫn cho phép xử lý các ứng viên hiện có.
```

---

## Nhóm 6 — Candidate Portal: Tìm Việc Theo CV & Ứng Tuyển (Prompts 35 – 41)

### Prompt 35 — Nâng cấp Trang Tìm Việc Bằng CV Tự Động (`cv-job-search.component.ts`)

```text
Hãy nâng cấp toàn diện trang `frontend-portal/src/app/pages/cv-job-search/cv-job-search.component.ts`.

Yêu cầu:
- Vùng tải lên CV (Drag & Drop File Upload) hỗ trợ định dạng PDF, DOCX tối đa 5MB.
- Hiển thị thanh tiến trình tải lên và trích xuất nội dung CV với animation đẹp mắt.
- Sau khi phân tích xong: Hiển thị danh sách các việc làm phù hợp nhất (Job Recommendations) được sắp xếp theo mức độ % phù hợp giảm dần.
- Mỗi Card việc làm hiển thị: Tên job, Công ty, Mức độ phù hợp (% Match), Các kỹ năng CV của bạn đã đáp ứng (tag xanh), Các kỹ năng còn thiếu (tag xám), Mức lương, Nút "Ứng tuyển ngay".
```

### Prompt 36 — Component Tải Lên CV Kéo Thả (Drag-and-Drop Resume Uploader)

```text
Hãy xây dựng component dùng chung `resume-uploader.component.ts` trong `frontend-portal/src/app/shared/components`.

Yêu cầu:
- Hỗ trợ kéo thả file (dragover, dragleave, drop) với hiệu ứng viền đổi màu mượt mà.
- Validate ngay tại client: Kiểm tra đuôi file (.pdf, .docx), kiểm tra dung lượng (< 5MB), báo lỗi tiếng Việt nếu không hợp lệ.
- Hiển thị tên file đã chọn, dung lượng file, icon loại file, nút "Xóa file" để chọn lại.
- Hỗ trợ chọn nhanh từ "Danh sách CV đã lưu trong tài khoản của tôi".
```

### Prompt 37 — Nâng cấp Trang Chi Tiết Việc Làm & Nộp Đơn (`job-detail.component.ts` Portal)

```text
Hãy hoàn thiện trang `frontend-portal/src/app/pages/job-detail/job-detail.component.ts`.

Yêu cầu:
- Hiển thị đầy đủ thông tin: Tiêu đề job, Tên công ty & Logo, Địa điểm, Mức lương, Hạn nộp, Mô tả công việc, Yêu cầu kỹ năng bắt buộc/ưu tiên, Quyền lợi.
- Nút "Nộp đơn ứng tuyển" cố định (Sticky Apply Button) khi cuộn trang.
- Modal nộp đơn: Cho phép chọn CV có sẵn hoặc upload CV mới, nhập Thư giới thiệu (Cover Letter) ngắn gọn, số điện thoại liên hệ.
- Xử lý trạng thái nộp đơn: Thông báo thành công và chuyển hướng đến trang theo dõi đơn ứng tuyển.
```

### Prompt 38 — Trang Danh Sách Việc Làm & Bộ Lọc Khám Phá (`jobs.component.ts` Portal)

```text
Hãy nâng cấp trang tìm kiếm việc làm `frontend-portal/src/app/pages/jobs/jobs.component.ts`.

Yêu cầu:
- Thanh tìm kiếm từ khóa việc làm và chọn Địa điểm (Hà Nội, TP.HCM, Đà Nẵng, Remote...).
- Bộ lọc bên cạnh (Sidebar Filter): Theo mức lương, theo hình thức làm việc (Full-time, Part-time, Intern), theo cấp bậc (Fresher, Junior, Senior, Lead).
- Phân trang (Pagination) mượt mà hoặc Infinite Scroll.
- Trạng thái Empty State nếu không tìm thấy việc làm nào phù hợp.
```

### Prompt 39 — Trang Dashboard Theo Dõi Đơn Ứng Tuyển Của Ứng Viên (`dashboard.component.ts` Portal)

```text
Hãy hoàn thiện trang `frontend-portal/src/app/pages/dashboard/dashboard.component.ts`.

Yêu cầu:
- Hiển thị danh sách các công việc ứng viên đã nộp đơn kèm Timeline trạng thái:
  + "Đã nộp đơn" -> "Nhà tuyển dụng đã xem CV" -> "Đã vào vòng Phỏng vấn" -> "Kết quả".
- Nếu có lịch phỏng vấn: Hiển thị Card thông báo nổi bật với Thời gian, Hình thức, Link phỏng vấn online.
- Nút "Hủy ứng tuyển" nếu đơn đang ở trạng thái mới nộp.
```

### Prompt 40 — Trang Thông Tin & Đánh Giá Doanh Nghiệp (`company-detail.component.ts` Portal)

```text
Hãy nâng cấp trang `frontend-portal/src/app/pages/company-detail/company-detail.component.ts`.

Yêu cầu:
- Header: Ảnh bìa (Cover banner), Logo công ty, Tên công ty, Quy mô nhân sự, Địa chỉ trụ sở, Website liên kết.
- Giới thiệu văn hóa công ty và hình ảnh môi trường làm việc.
- Danh sách tất cả các vị trí đang tuyển dụng của công ty đó.
```

### Prompt 41 — Quản Lý Hồ Sơ Cá Nhân & Danh Sách CV Ứng Viên

```text
Hãy xây dựng trang Quản lý Hồ sơ Ứng viên trong `frontend-portal`.

Yêu cầu:
- Cập nhật thông tin cá nhân: Họ tên, Email, Số điện thoại, Địa chỉ, Link LinkedIn / GitHub / Portfolio.
- Quản lý danh sách CV: Danh sách các file CV đã tải lên, đặt 1 CV làm "CV Mặc định", xem trước CV, tải xuống CV, xóa CV cũ.
```

---

## Nhóm 7 — Authentication, Phân Quyền & Profile (Prompts 42 – 46)

### Prompt 42 — Nâng cấp Giao Diện Đăng Nhập & Đăng Ký (`login`, `register`)

```text
Hãy hoàn thiện giao diện và validation trang `login` và `register` trên cả 2 app.

Yêu cầu:
- Form Đăng nhập: Email, Mật khẩu, Checkbox "Ghi nhớ đăng nhập", Link "Quên mật khẩu?".
- Form Đăng ký: Họ tên, Email, Mật khẩu, Nhập lại mật khẩu, Checkbox "Đồng ý điều khoản sử dụng".
- Validation client-side thời gian thực: Hiển thị thanh đo độ mạnh mật khẩu (Password Strength Meter: yếu/vừa/mạnh), kiểm tra email hợp lệ, kiểm tra mật khẩu khớp nhau.
- Nút ẩn/hiện mật khẩu (Toggle Eye Icon).
```

### Prompt 43 — Luồng Xác Thực Email & Gửi Lại Mã (`verify-email`, `resend-verification`)

```text
Hãy hoàn thiện các trang xác thực email trong `frontend-portal`.

Yêu cầu:
- Trang `verify-email`: Tự động đọc token từ URL params, gọi API xác thực, hiển thị animation thành công và đếm ngược 5 giây tự động chuyển về trang Đăng nhập.
- Trang `email-required`: Thông báo tài khoản cần kích hoạt email trước khi sử dụng, có nút "Gửi lại email kích hoạt" kèm đếm ngược 60 giây chống spam.
```

### Prompt 44 — Luồng Quên Mật Khẩu & Đặt Lại Mật Khẩu (`forgot-password`, `reset-password`)

```text
Hãy hoàn thiện luồng quên mật khẩu trong `frontend-portal` và `frontend-admin`.

Yêu cầu:
- Trang `forgot-password`: Nhập email nhận link khôi phục mật khẩu, xử lý trạng thái gửi email thành công.
- Trang `reset-password`: Đọc token đặt lại mật khẩu từ URL, form nhập mật khẩu mới và xác nhận mật khẩu mới, kiểm tra độ an toàn mật khẩu và thông báo cập nhật thành công.
```

### Prompt 45 — Quản Lý Phân Quyền & Route Guard (`auth.guard.ts`, `role.guard.ts`)

```text
Hãy củng cố hệ thống Route Guards trong `frontend-admin` và `frontend-portal`.

Yêu cầu:
- `AuthGuard`: Kiểm tra token hợp lệ trong localStorage/cookie; nếu chưa đăng nhập, lưu lại URL hiện tại vào `returnUrl` và chuyển hướng về trang `/login`.
- `RoleGuard` (cho Admin): Kiểm tra role người dùng (Super Admin, HR Manager, Recruiter); nếu không đủ quyền, chuyển hướng về trang 403 Forbidden.
- Tự động đăng xuất và dọn dẹp state nếu token hết hạn khi đang thao tác.
```

### Prompt 46 — Trang Lỗi Chuẩn Hóa (404 Not Found & 403 Forbidden)

```text
Hãy tạo các trang lỗi đẹp mắt và thân thiện cho cả 2 app frontend (`404 Not Found` và `403 Access Denied`).

Yêu cầu:
- Thiết kế hình minh họa SVG hoặc Icon trực quan, thông điệp tiếng Việt lịch sự, dễ hiểu.
- Nút "Quay lại trang chủ" và nút "Quay lại trang trước đó".
```

---

## Nhóm 8 — UI/UX Polish, Accessibility, Responsive & Tối Ưu (Prompts 47 – 50)

### Prompt 47 — Tối Ưu Hóa Giao Diện Responsive Toàn Diện (Mobile / Tablet)

```text
Hãy rà soát và khắc phục các vấn đề hiển thị trên màn hình nhỏ (Mobile < 768px và Tablet < 1024px) cho cả admin và portal.

Yêu cầu:
- Bảng dữ liệu: Chuyển sang dạng thẻ (Card list) hoặc hỗ trợ cuộn ngang mượt mà trên mobile.
- Header / Navigation: Thu gọn thành Mobile Drawer Menu (Hamburger menu) có animation mở/đóng êm.
- Các Modal (AI Evaluation, Compare, Match Details): Fullscreen trên mobile với nút đóng to, dễ chạm bằng ngón tay.
- Đảm bảo kích thước nút bấm (Touch Target) tối thiểu 44x44px trên thiết bị cảm ứng.
```

### Prompt 48 — Tối Ưu Trải Nghiệm Bàn Phím & Khả Năng Tiếp Cận (Accessibility - a11y)

```text
Hãy nâng cao khả năng tiếp cận (Accessibility) theo chuẩn WCAG 2.1 cho các modal và form trong dự án.

Yêu cầu:
- Hỗ trợ đóng Modal bằng phím `Escape` và focus trap bên trong modal khi mở.
- Bổ sung các thuộc tính `aria-label`, `aria-expanded`, `aria-modal`, `role="dialog"` cho các interactive elements.
- Đảm bảo toàn bộ form có thể điều hướng hoàn toàn bằng phím `Tab` và `Enter`.
```

### Prompt 49 — Tối Ưu Tốc Độ Tải Trang & Lazy Loading

```text
Hãy tối ưu hiệu năng và kích thước bundle của cả 2 ứng dụng frontend.

Yêu cầu:
- Đảm bảo tất cả các trang/routes được cấu hình Lazy Loading (`loadComponent: () => import(...)`).
- Tối ưu hóa việc tải ảnh (sử dụng `NgOptimizedImage` của Angular cho avatar, logo công ty).
- Tránh import toàn bộ thư viện lớn (lodash, icons) nếu chỉ dùng vài hàm; chuyển sang tree-shakable imports.
- Chạy `ng build --configuration production` và báo cáo kích thước file bundle trước/sau tối ưu.
```

### Prompt 50 — Kiểm Tra Tổng Thể E2E User Flow & Hoàn Thiện Micro-Interactions

```text
Hãy kiểm tra và tinh chỉnh lại toàn bộ các vi tương tác (Micro-interactions) trên toàn bộ ứng dụng.

Yêu cầu:
- Thêm hiệu ứng Hover mượt mà cho các Card việc làm, Hàng trong bảng, Nút bấm.
- Thêm Tooltip giải thích chi tiết cho các icon chức năng và các thuật ngữ tuyển dụng.
- Đảm bảo trạng thái Active của Menu Sidebar/Header luôn đồng bộ chính xác với Route hiện tại.
- Kiểm tra lại toàn bộ luồng người dùng từ: Đăng nhập -> Tạo Job -> Nhận CV -> Sàng lọc tự động -> Đánh giá AI Agent -> So sánh ứng viên -> Đặt lịch phỏng vấn -> Tuyển dụng thành công.
```
