# AI Screening Agent – Intelligent Resume Screening & Ranking

**Version:** 1.0  
**Project Type:** AI Product / AI Agent  
**Document Type:** Project Brief  
**Author:** Team  
**Last Updated:** July 2026

---

# 1. Executive Summary

AI Screening Agent là một hệ thống hỗ trợ tuyển dụng thông minh sử dụng Large Language Model (LLM), OCR và Retrieval-Augmented Generation (RAG) để tự động phân tích hồ sơ ứng viên (CV), so sánh với Job Description (JD), chấm điểm mức độ phù hợp và tạo danh sách ứng viên tiềm năng.

Hệ thống giúp giảm đáng kể thời gian sàng lọc hồ sơ, chuẩn hóa quy trình đánh giá và hỗ trợ Recruiter đưa ra quyết định nhanh hơn. Tuy nhiên, hệ thống không tự động loại ứng viên mà luôn giữ Human-in-the-Loop (HITL) để đảm bảo tính minh bạch và giảm sai sót.

---

# 2. Background

Trong quá trình tuyển dụng, đặc biệt đối với các công ty công nghệ, mỗi vị trí có thể nhận từ hàng trăm đến hàng nghìn CV.

Recruiter phải thực hiện các công việc:

- Đọc CV
- Đối chiếu với Job Description
- Đánh giá kỹ năng
- Đánh giá kinh nghiệm
- Chọn shortlist

Quá trình này tiêu tốn rất nhiều thời gian và phụ thuộc nhiều vào kinh nghiệm cá nhân của từng Recruiter.

Trong khi đó, sự phát triển của các mô hình ngôn ngữ lớn (Large Language Models) cho phép AI hiểu nội dung CV gần giống như con người, từ đó hỗ trợ quá trình sàng lọc hiệu quả hơn.

---

# 3. Problem Statement

Quy trình sàng lọc hồ sơ hiện nay tồn tại nhiều vấn đề:

- Recruiter mất nhiều giờ để đọc từng CV.
- Quy trình đánh giá chưa đồng nhất giữa các Recruiter.
- Dễ bỏ sót ứng viên phù hợp.
- Không có tiêu chí chấm điểm thống nhất.
- Khó giải thích lý do lựa chọn hoặc loại ứng viên.
- Chi phí tuyển dụng tăng do phải xử lý thủ công.

Nếu số lượng CV tăng lên hàng nghìn hồ sơ thì quy trình hiện tại gần như không còn khả năng mở rộng.

---

# 4. Proposed Solution

Xây dựng AI Screening Agent hỗ trợ toàn bộ quá trình screening.

Hệ thống sẽ:

1. Upload Job Description.
2. Upload nhiều CV.
3. OCR và trích xuất nội dung.
4. Chuẩn hóa dữ liệu.
5. So sánh CV với JD.
6. Chấm điểm theo nhiều tiêu chí.
7. Giải thích kết quả.
8. Xếp hạng ứng viên.
9. Cho phép Recruiter duyệt hoặc loại thủ công.

AI đóng vai trò là trợ lý hỗ trợ quyết định chứ không thay thế hoàn toàn Recruiter.

---

# 5. Objectives

## Business Objectives

- Giảm thời gian screening CV từ nhiều giờ xuống còn vài phút.
- Chuẩn hóa tiêu chí đánh giá.
- Hỗ trợ Recruiter xử lý số lượng lớn hồ sơ.
- Tăng chất lượng shortlist.
- Giảm chi phí tuyển dụng.

---

## Product Objectives

Hệ thống cần có khả năng:

- Upload CV hàng loạt.
- Upload Job Description.
- Đọc PDF, DOCX và hình ảnh.
- OCR tài liệu scan.
- So sánh CV với JD.
- Chấm điểm bằng AI.
- Giải thích kết quả.
- Hiển thị danh sách xếp hạng.
- Hỗ trợ Recruiter phê duyệt.

---

# 6. Target Users

## Recruiter

### Mô tả

Là người trực tiếp xử lý hồ sơ ứng viên.

### Nhu cầu

- Giảm thời gian đọc CV.
- Có danh sách ứng viên phù hợp.
- Có giải thích rõ ràng.
- Không phải đọc toàn bộ CV.

---

## HR Manager

### Mô tả

Quản lý hoạt động tuyển dụng.

### Nhu cầu

- Theo dõi hiệu quả tuyển dụng.
- Kiểm tra tiêu chí AI.
- Đảm bảo AI minh bạch.
- Kiểm soát quyết định tuyển dụng.

---

# 7. Pain Points

| Pain Point | Mức độ |
|------------|---------|
| Quá nhiều CV | Cao |
| Đọc CV thủ công | Cao |
| Dễ bỏ sót ứng viên | Cao |
| Thiếu tiêu chí thống nhất | Trung bình |
| Khó giải thích kết quả | Trung bình |
| Tốn nhiều nhân lực | Cao |

---

# 8. Value Proposition

AI Screening Agent mang lại các giá trị sau:

- Tự động hóa quy trình screening.
- Tiết kiệm thời gian cho Recruiter.
- Đánh giá ứng viên khách quan hơn.
- Giảm sai sót khi tuyển dụng.
- Giải thích rõ lý do chấm điểm.
- Hỗ trợ xử lý số lượng CV lớn.

---

# 9. Scope

## MVP Scope

Phiên bản MVP sẽ bao gồm:

- Đăng nhập.
- Upload Job Description.
- Upload nhiều CV.
- OCR tài liệu.
- Trích xuất thông tin.
- So sánh với JD.
- AI chấm điểm.
- Giải thích kết quả.
- Candidate Ranking.
- Recruiter Approve/Reject.

---

## Future Scope

Các chức năng sẽ phát triển sau MVP:

- AI Interview Planner.
- Sinh câu hỏi phỏng vấn.
- AI Memory.
- Candidate Recommendation.
- Fraud Detection.
- Duplicate Resume Detection.
- Analytics Dashboard.
- Calendar Integration.
- Email Automation.

---

# 10. AI Workflow

```text
Recruiter

↓

Upload JD

↓

Upload CV

↓

OCR

↓

Resume Parser

↓

Embedding

↓

Vector Database

↓

RAG

↓

GPT-4o

↓

Candidate Score

↓

Ranking

↓

Recruiter Review

↓

Approve / Reject
```

---

# 11. Success Metrics

Hệ thống được xem là thành công nếu đạt các tiêu chí sau:

| Metric | Target |
|---------|---------|
| Screening Time Reduction | ≥ 70% |
| OCR Accuracy | ≥ 90% |
| Resume Parsing Accuracy | ≥ 90% |
| JD Matching Accuracy | ≥ 85% |
| AI Response Time | < 5 giây |
| Recruiter Satisfaction | ≥ 80% |

---

# 12. Technology Stack

| Layer | Technology |
|---------|------------|
| Frontend | React |
| Backend | FastAPI |
| Database | PostgreSQL |
| AI Agent | LangGraph |
| LLM | GPT-4o |
| OCR | PyMuPDF + Tesseract |
| Embedding | text-embedding-3-small |
| Vector Database | Qdrant |
| Authentication | JWT |
| Storage | MinIO |
| Cache | Redis |
| Deployment | Docker |

---

# 13. Risks

## AI Hallucination

LLM có thể đưa ra đánh giá không chính xác.

Giải pháp:

- Human in the Loop.
- Prompt Engineering.
- RAG.

---

## OCR Failure

CV scan chất lượng thấp.

Giải pháp:

- OCR nhiều bước.
- Kiểm tra confidence score.

---

## Cost

Chi phí API tăng khi xử lý nhiều CV.

Giải pháp:

- Batch Processing.
- Prompt Optimization.
- Embedding Cache.

---

## Privacy

CV chứa dữ liệu cá nhân.

Giải pháp:

- Mã hóa dữ liệu.
- JWT Authentication.
- Phân quyền người dùng.

---

# 14. Human in the Loop (HITL)

Hệ thống không tự động loại ứng viên.

Sau khi AI hoàn thành screening:

- Recruiter xem kết quả.
- Recruiter đọc giải thích.
- Recruiter quyết định:
  - Approve
  - Reject

Điều này đảm bảo AI chỉ đóng vai trò hỗ trợ và con người vẫn là người đưa ra quyết định cuối cùng.

---

# 15. Expected Outcomes

Sau khi hoàn thành MVP, hệ thống có thể:

- Tự động đọc hàng trăm CV.
- So sánh với Job Description.
- Chấm điểm ứng viên.
- Giải thích kết quả.
- Xếp hạng ứng viên.
- Giảm đáng kể thời gian tuyển dụng.
- Hỗ trợ Recruiter ra quyết định nhanh và minh bạch hơn.

---

# 16. Conclusion

AI Screening Agent là một sản phẩm AI ứng dụng Large Language Model vào quy trình tuyển dụng nhằm giải quyết bài toán sàng lọc hồ sơ ứng viên. Hệ thống giúp giảm thời gian xử lý, nâng cao chất lượng đánh giá và vẫn đảm bảo Human-in-the-Loop để duy trì tính minh bạch và độ tin cậy trong quá trình tuyển dụng.

Phiên bản MVP tập trung vào các chức năng cốt lõi gồm upload CV, upload JD, AI screening, ranking và recruiter review. Trong tương lai, hệ thống có thể mở rộng với các tính năng như AI Interview Planner, Candidate Recommendation và Email Automation.