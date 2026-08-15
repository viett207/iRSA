# P-164 — Tài liệu thuyết trình và demo

Thư mục này lưu trữ các tài liệu phục vụ Demo Day của **P-164 — iRSA (AI Recruitment Screening Agent)**. iRSA hỗ trợ doanh nghiệp quản lý quy trình tuyển dụng và dùng AI để đối chiếu CV với yêu cầu công việc, giải thích kết quả đánh giá và tạo câu hỏi phỏng vấn phù hợp cho từng ứng viên.

## Nội dung thư mục

| Tệp | Mục đích | Trạng thái |
|---|---|---|
| `pitch_deck.pptx` | Slide thuyết trình chính | Chưa bổ sung |
| `pitch_deck.pdf` | Bản PDF dự phòng của slide | Chưa bổ sung |
| `video_demo.mp4` | Video demo sản phẩm, tối đa 5 phút | Chưa bổ sung |
| `demo-script.md` | Lời thoại và thao tác chi tiết khi demo | Tùy chọn |
| `screenshots/` | Ảnh chụp các màn hình chính | Tùy chọn |

> Không commit tài khoản thật, CV chứa dữ liệu cá nhân, API key hoặc thông tin nhạy cảm vào thư mục này. Nên dùng dữ liệu giả lập và che địa chỉ email trong ảnh/video.

## Thông điệp chính

**iRSA giúp đội ngũ tuyển dụng sàng lọc hồ sơ nhanh hơn nhưng vẫn giữ được tính minh bạch:** mỗi kết quả AI đều đi kèm bằng chứng từ CV, đánh giá theo tiêu chí của vị trí và bộ câu hỏi để HR kiểm chứng trong vòng phỏng vấn.

Các điểm nổi bật cần thể hiện trong bài trình bày:

- Một hệ thống thống nhất cho ứng viên, HR và quản trị viên.
- Ứng viên tìm việc, quản lý CV, ứng tuyển và theo dõi trạng thái hồ sơ.
- HR tạo tin tuyển dụng, cấu hình tiêu chí, quản lý ứng viên và báo cáo.
- AI Agent phân tích CV theo nhiều mức chunk, đánh giá mức độ phù hợp và trích dẫn bằng chứng.
- Agent tạo 8–10 câu hỏi phỏng vấn cá nhân hóa, sau đó tự kiểm tra chất lượng kết quả và đánh giá lại khi cần.

## Cấu trúc pitch deck đề xuất (10 slide)

1. **Title** — P-164, iRSA, tagline và thành viên nhóm.
2. **Problem** — Sàng lọc CV thủ công tốn thời gian; kết quả phụ thuộc người đọc; khó giải thích vì sao một hồ sơ phù hợp hoặc không phù hợp.
3. **Users & Pain Points** — Nhu cầu của ứng viên, HR và quản trị viên.
4. **Solution** — Hành trình từ đăng tin, nộp CV, chấm điểm đến đánh giá chuyên sâu và chuẩn bị phỏng vấn.
5. **Product Demo** — Minh họa luồng ứng viên và luồng HR bằng demo trực tiếp hoặc video.
6. **AI Agent** — Luồng `Extractor → Evaluator → Question Generator → Verifier`; nhấn mạnh evidence và vòng self-reflection.
7. **Architecture & Tech Stack** — Angular, FastAPI, LangGraph/LangChain, PostgreSQL, Redis/Celery và MinIO. Có thể dùng [sơ đồ kiến trúc tổng quan](../docs/kien-truc-tong-quan.png).
8. **Evaluation & Safety** — Cách kiểm thử, chỉ số dự kiến, kiểm soát hallucination, dữ liệu cá nhân và vai trò quyết định cuối cùng của HR. Chỉ đưa số liệu đã đo được từ [báo cáo đánh giá](../eval/results/report.md).
9. **Team & Roadmap** — Nguyễn Hoàng Việt, Tạ Thị Thu Huyền, Quách Xuân Trường, Phạm Hải Yến; nêu vai trò thực tế và các mốc tiếp theo.
10. **Closing / Ask** — Giá trị mang lại, nhu cầu thử nghiệm với người dùng thật và lời mời đặt câu hỏi.

## Kịch bản video demo (tối đa 5 phút)

| Thời lượng | Nội dung | Thao tác gợi ý |
|---|---|---|
| 0:00–0:25 | Vấn đề và giá trị | Giới thiệu ngắn tình huống HR phải đọc nhiều CV cho một vị trí. |
| 0:25–1:20 | Trải nghiệm ứng viên | Mở danh sách việc làm, xem chi tiết, đăng nhập, tải CV và ứng tuyển. |
| 1:20–2:10 | Quản lý tuyển dụng | Đăng nhập HR, mở dashboard, chọn vị trí và xem danh sách ứng viên. |
| 2:10–3:35 | Kết quả AI | Mở một hồ sơ; trình bày điểm/nhận định, kỹ năng phù hợp, phần còn thiếu và bằng chứng trích từ CV. |
| 3:35–4:20 | Câu hỏi phỏng vấn | Hiển thị bộ câu hỏi được tạo riêng cho ứng viên và giải thích cách HR dùng để xác minh nhận định AI. |
| 4:20–4:45 | Kiến trúc Agent | Cho xem sơ đồ 4 node và vòng kiểm tra lại của Verifier. |
| 4:45–5:00 | Kết luận | Tóm tắt tác động, giới hạn hiện tại và bước phát triển tiếp theo. |

### Dữ liệu demo cần chuẩn bị

- Một tài khoản ứng viên và một tài khoản HR dùng riêng cho demo.
- Một tin tuyển dụng đã publish, có tiêu chí kỹ năng, kinh nghiệm và học vấn rõ ràng.
- Hai CV giả lập: một hồ sơ phù hợp cao và một hồ sơ còn thiếu tiêu chí.
- Ít nhất một hồ sơ đã có sẵn kết quả AI để dự phòng khi mạng hoặc LLM gặp sự cố.
- Ảnh chụp màn hình và video quay sẵn cho các bước quan trọng.

## Checklist trước Demo Day

### Nội dung

- [ ] Slide dùng cùng một tên sản phẩm, màu sắc và thông điệp.
- [ ] Mọi số liệu trong slide có nguồn hoặc kết quả đo đi kèm.
- [ ] Không trình bày tính năng chưa hoạt động như tính năng đã hoàn thành.
- [ ] Font chữ, biểu đồ và ảnh chụp rõ khi trình chiếu ở màn hình lớn.
- [ ] Có slide kết luận và thông tin thành viên nhóm.

### Demo kỹ thuật

- [ ] Chạy migration, seed dữ liệu và kiểm tra toàn bộ dịch vụ trước giờ demo.
- [ ] Backend hoạt động tại `http://localhost:8000`; Swagger tại `/docs`.
- [ ] Admin/HR portal hoạt động tại `http://localhost:4200`.
- [ ] Candidate portal hoạt động tại `http://localhost:4300`.
- [ ] Kiểm thử trước luồng đăng nhập, upload CV, ứng tuyển và xem kết quả AI.
- [ ] Tắt thông báo, đóng tab không liên quan và tăng cỡ chữ trình duyệt.
- [ ] Có bản PDF của slide và video demo offline trên ít nhất hai thiết bị.

### Kiểm tra tệp bàn giao

- [ ] `pitch_deck.pptx` mở được và không thiếu font/ảnh.
- [ ] `pitch_deck.pdf` hiển thị đúng bố cục.
- [ ] `video_demo.mp4` có hình, tiếng rõ và dài không quá 5 phút.
- [ ] Link và QR code trong slide đã được thử trên thiết bị khác.

## Chạy hệ thống để ghi hình

Từ thư mục gốc của dự án trên Windows:

```powershell
.\start_all.ps1
```

Hướng dẫn cài đặt thủ công và cấu hình các dịch vụ nằm trong [LOCAL_SETUP.md](../LOCAL_SETUP.md). Nên quay video ở độ phân giải 1080p, tỉ lệ 16:9 và xuất định dạng H.264/AAC để dễ phát trên nhiều thiết bị.
