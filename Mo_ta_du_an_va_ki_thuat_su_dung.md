# THÔNG TIN DỰ ÁN iRSA (P-164)

## 1. TÊN DỰ ÁN
**iRSA (Intelligent Recruitment Screening Agent) - Hệ thống AI Agent Tự động Sàng lọc Hồ sơ, Bóc băng Âm thanh & Đánh giá Phỏng vấn Tuyển dụng**

---

## 2. MÔ TẢ NGẮN (Dành cho form giới hạn ký tự / Tóm tắt)
iRSA là hệ thống AI Agent toàn diện hỗ trợ quy trình tuyển dụng thông minh. Hệ thống tự động phân tích và chấm điểm CV dựa trên mô tả công việc (JD) với cơ chế trích dẫn bằng chứng thực tế và chống ảo giác (Anti-Hallucination), tự động sinh bộ câu hỏi phỏng vấn cá nhân hóa theo khung năng lực STAR, đồng thời tích hợp tính năng ghi âm và bóc băng âm thanh (Speech-to-Text) để chấm điểm câu trả lời phỏng vấn theo thời gian thực.

---

## 3. MÔ TẢ DỰ ÁN CHI TIẾT

### Bối cảnh & Vấn đề giải quyết:
- Quy trình tuyển dụng truyền thống tốn hơn 70% thời gian vào việc lọc hồ sơ thủ công, dễ bị chi phối bởi cảm tính cá nhân và thiếu tiêu chí chuẩn hóa.
- Bộ phận HR non-tech gặp khó khăn khi đánh giá năng lực chuyên sâu và soạn câu hỏi phỏng vấn kỹ thuật.
- Việc ghi chép và đánh giá trong các buổi phỏng vấn sơ loại còn rời rạc, thiếu lưu vết và khó chuẩn hóa.

### Mục tiêu dự án:
- Tự động hóa và rút ngắn thời gian sàng lọc CV từ vài phút xuống dưới 3 giây/hồ sơ với độ chính xác cao.
- Đảm bảo tính khách quan và minh bạch 100% bằng việc trích dẫn bằng chứng nguyên văn từ hồ sơ của ứng viên.
- Cung cấp cẩm nang và bộ câu hỏi phỏng vấn thực chiến cho HR, hỗ trợ bóc băng và chấm điểm phỏng vấn tự động.

### Các tính năng cốt lõi:
1. **Sàng lọc & Chấm điểm CV thông minh:** Phân đoạn ngữ nghĩa CV đa cấp độ (Line-level, Cửa sổ trượt 30/80 từ), đối chiếu trọng số kỹ năng (Must-have, Nice-to-have, Kinh nghiệm, Học vấn) và trích xuất bằng chứng xác thực.
2. **Cơ chế Tự phản tư & Chống ảo giác (Self-Reflection):** Kiểm định tính nhất quán của điểm số, rà soát và loại bỏ việc AI bịa đặt thông tin không có trong CV.
3. **Sinh câu hỏi phỏng vấn thực chiến (STAR-based):** Tự động tạo 8-10 câu hỏi đào sâu vào điểm mạnh và khoảng trống kỹ năng của từng ứng viên, kèm cẩm nang đánh giá (mục đích câu hỏi, dấu hiệu trả lời tốt, cờ đỏ cảnh báo) cho HR.
4. **AI Interview Studio & Bóc băng âm thanh (Speech-to-Text):** Ghi âm trực tiếp buổi phỏng vấn, bóc băng giọng nói tự động, phân tích câu trả lời theo mô hình STAR (Situation - Task - Action - Result) và đề xuất câu hỏi đào sâu tiếp theo.
5. **Giao diện đa cổng (Multi-portal):** 
   - Cổng Quản trị cho HR: Quản lý tin tuyển dụng, danh sách ứng viên, cấu hình tiêu chí chấm điểm, studio phỏng vấn.
   - Cổng Ứng viên: Tìm kiếm việc làm, nộp hồ sơ, upload CV và theo dõi tiến trình tuyển dụng minh bạch.

---

## 4. KỸ THUẬT & CÔNG NGHỆ SỬ DỤNG

### Trí tuệ nhân tạo (AI, LLM & NLP):
- **LangGraph (StateGraph):** Điều phối luồng làm việc của AI Agent qua 4 node chuyên biệt (Extractor, Evaluator, Question Generator, Verifier) với vòng lặp tự phản tư (Self-Reflection Loop).
- **Mô hình Ngôn ngữ lớn (LLM):** Google Gemini API (Gemini 2.0 Flash / 1.5 Flash) xử lý suy luận sâu, đánh giá năng lực và sinh câu hỏi.
- **Xử lý Ngôn ngữ Tự nhiên & Vector Embeddings:** SentenceTransformers (mô hình `paraphrase-multilingual-MiniLM-L12-v2` chạy cục bộ), ChromaDB hỗ trợ tìm kiếm ngữ nghĩa và tối ưu chi phí gọi API.
- **Speech-to-Text (STT) & Audio Processing:** Engine bóc băng âm thanh hỗ trợ tiếng Việt và tiếng Anh cho phỏng vấn trực tiếp.

### Backend & API:
- **Ngôn ngữ & Framework:** Python 3.11+, FastAPI (REST API hiệu năng cao, xử lý bất đồng bộ AsyncIO).
- **Xác thực & Bảo mật:** JWT Authentication, HttpOnly Cookies, mã băm SHA-256 ẩn danh dữ liệu cá nhân (PII Protection), CORS Middleware.
- **Data Validation:** Pydantic v2.

### Frontend & Giao diện:
- **Framework:** Angular 17, TypeScript, RxJS.
- **UI Library & Styling:** Ng-Zorro Antd (Ant Design cho Angular), TailwindCSS/CSS Modules.
- **Cấu trúc:** 2 Ứng dụng Portal độc lập (Admin Portal cho HR và Candidate Portal cho ứng viên).

### Cơ sở dữ liệu & Lưu trữ đám mây (Cloud Tier):
- **Cơ sở dữ liệu:** Supabase PostgreSQL Cloud (hỗ trợ Connection Pooling chịu tải cao).
- **Lưu trữ File & Âm thanh:** Supabase S3-Compatible Object Storage (lưu trữ CV PDF/DOCX và file ghi âm).
- **Bộ đệm & Giới hạn tần suất:** Upstash Redis Cloud (Caching kết quả phân tích & API Rate Limiting).

### DevOps, CI/CD & Giám sát:
- **Containerization:** Docker, Docker Compose.
- **CI/CD:** GitHub Actions.
- **Kiểm thử chất lượng:** Pytest (Unit tests, Integration tests, Agent Graph tests với độ bao phủ >85%).
- **Observability:** Phoenix Observability / LangSmith theo dõi chi tiết vết thực thi LLM.
