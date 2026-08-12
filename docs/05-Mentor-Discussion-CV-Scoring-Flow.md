# Tài liệu trao đổi với Mentor: Luồng xử lý và chấm điểm CV

> Mục tiêu: giải thích chính xác ứng dụng nhận CV, tạo application, chấm điểm, hiển thị bằng chứng và sử dụng AI như thế nào.  
> Căn cứ: source code hiện tại tại ngày 12/08/2026.  
> Trạng thái: một số phần AI Agent v2 đang ở working tree, chưa hoàn tất test/commit.

## 1. Thông điệp chính nên trình bày với mentor

Ứng dụng không đưa toàn bộ quyết định tuyển dụng cho LLM. Quy trình được chia thành hai lớp:

1. **Điểm sàng lọc ban đầu có công thức rõ ràng**: kỹ năng, kinh nghiệm và học vấn; dùng keyword matching kết hợp embedding để giảm bỏ sót từ đồng nghĩa/ngữ cảnh.
2. **Đánh giá AI sâu sau shortlist**: LangGraph thu thập bằng chứng trong CV, dùng LLM đánh giá chi tiết, sinh câu hỏi phỏng vấn và chạy bước verifier.

Điểm ban đầu phục vụ xếp hạng và hỗ trợ HR. AI evaluation cung cấp nhận xét/bằng chứng bổ sung. HR vẫn là người ra quyết định cuối cùng.

## 2. Luồng end-to-end

```text
Ứng viên upload/chọn CV
        │
        ▼
Validate PDF/DOCX và lưu file vào MinIO
        │
        ▼
Trích xuất plain text → resumes.raw_text
        │
        ▼
Ứng viên ứng tuyển → tạo applications
        │
        ├── Gửi thông báo xác nhận
        ├── Thông báo realtime cho HR
        └── Celery task chấm điểm ban đầu
                    │
                    ▼
         Skill + Experience + Education
                    │
                    ▼
       Lưu scoring_results + match_details
                    │
                    ▼
     HR xem điểm, bằng chứng, xếp hạng ứng viên
                    │
                    ▼
               HR shortlist
                    │
                    ▼
       AI evaluation sâu / LangGraph Agent
 Extractor → Evaluator → Question Generator → Verifier
                    │
                    ▼
   Lưu ai_score + ai_evaluation, gửi thông báo HR
```

## 3. Luồng dữ liệu chi tiết

### 3.1 Upload và trích xuất CV

Ứng viên có thể:

- upload CV mới khi ứng tuyển;
- chọn CV đã có;
- dùng CV mặc định.

Backend thực hiện:

1. Kiểm tra file và giới hạn số CV.
2. Upload file lên MinIO.
3. Trích xuất nội dung PDF/DOCX thành plain text.
4. Lưu metadata và `raw_text` vào bảng `resumes`.
5. Tạo `application` liên kết candidate, job và resume.

Điểm số được tính trên `resume.raw_text`, không trực tiếp trên file binary.

### 3.2 Kích hoạt scoring

Ngay sau khi application được tạo, API gọi:

```text
score_application_task.delay(application.id)
```

Celery worker chạy `score_application_sync`. Ngoài cơ chế tự động, HR có endpoint để:

- chấm lại một application;
- chấm toàn bộ application của một job;
- lấy score và match details.

Nếu thiếu application, resume text hoặc job criteria, scorer không thể tính đầy đủ. Hiện code có thể tự tạo criteria mặc định khi job chưa có criteria; hành vi này cần được cân nhắc vì criteria rỗng làm điểm skill bằng 0.

## 4. Công thức điểm sàng lọc ban đầu

### 4.1 Công thức tổng

```text
Total Score = Skill Score × Wskill
            + Experience Score × Wexperience
            + Education Score × Weducation
```

Trọng số mặc định:

| Tiêu chí | Trọng số |
|---|---:|
| Kỹ năng | 60% |
| Kinh nghiệm | 30% |
| Học vấn | 10% |

HR/job criteria có thể lưu trọng số riêng. Backend normalize ba giá trị để tổng bằng 1. Ví dụ `60, 30, 10` thành `0.6, 0.3, 0.1`.

Kết quả được làm tròn một chữ số thập phân và lưu vào `scoring_results`.

## 5. Cách tính Skill Score

### 5.1 Trọng số must-have và nice-to-have

- Mỗi must-have skill: 2 điểm.
- Mỗi nice-to-have skill: 1 điểm.

```text
Skill Score = Earned Skill Points / Total Skill Points × 100
```

Ví dụ:

```text
Must-have: Python, SQL, Docker       → 3 × 2 = 6 điểm tối đa
Nice-to-have: AWS, Kubernetes       → 2 × 1 = 2 điểm tối đa
Tổng tối đa                         → 8 điểm

CV match Python, SQL và AWS:
Earned = 2 + 2 + 1 = 5
Skill Score = 5 / 8 × 100 = 62.5
```

### 5.2 Bước 1 — keyword và alias matching

Hệ thống chuẩn hóa tiếng Việt và trích xuất keyword từ toàn bộ CV. Một skill được match khi:

- alias/exact text xuất hiện trong CV; hoặc
- toàn bộ token của skill có trong tập keyword CV.

Alias map hiện hỗ trợ rõ hơn cho Excel, Word, PowerPoint, Microsoft Office, Google Sheets, VLOOKUP, Pivot Table, VBA và một số kỹ năng văn phòng.

### 5.3 Bước 2 — embedding rescue

Chỉ các skill bị keyword matcher bỏ sót mới được đưa sang embedding scorer.

Quy trình:

1. Chia CV theo ba mức: từng dòng, chunk 30 từ và chunk 80 từ.
2. Encode skill và các chunk bằng sentence-transformer đa ngôn ngữ.
3. Tính cosine similarity.
4. Lấy similarity lớn nhất của mỗi skill với toàn bộ chunk.
5. Nếu similarity `>= 0.30`, skill được “rescue” và tính là match.

Mỗi skill được ghi rõ nguồn match:

```json
{
  "Python": "keyword",
  "Machine Learning": "embedding"
}
```

Nếu embedding model không tải/chạy được, hệ thống fallback về keyword-only thay vì làm hỏng toàn bộ scoring.

### 5.4 Dữ liệu giải thích được

`match_details.skills` lưu:

- `matched_must`, `missing_must`;
- `matched_nice`, `missing_nice`;
- skill match bằng keyword hay embedding;
- similarity score;
- các skill cả hai phương pháp đều không tìm thấy.

API match-details còn lấy snippet xung quanh keyword trong CV để HR xem bằng chứng.

## 6. Cách tính Experience Score

Scorer dùng regex tiếng Việt và tiếng Anh để tìm các câu như:

- `5 năm kinh nghiệm`;
- `5 years of experience`;
- `kinh nghiệm 5 năm`;
- `hơn 5 năm`;
- `5+ năm làm việc`.

Hệ thống lấy số năm lớn nhất hợp lệ tìm được trong CV và giới hạn dưới 50 để giảm false positive.

```text
Nếu job không yêu cầu kinh nghiệm: Experience Score = 100
Nếu có yêu cầu:
Experience Score = min(Detected Years / Required Minimum × 100, 100)
```

Ví dụ:

```text
Job yêu cầu 4 năm, CV phát hiện 2 năm → 50 điểm
Job yêu cầu 4 năm, CV phát hiện 6 năm → 100 điểm
```

`max_experience_years` được lưu trong chi tiết nhưng hiện chưa tạo penalty nếu ứng viên vượt mức tối đa.

## 7. Cách tính Education Score

Hệ thống ánh xạ học vấn theo bậc:

```text
high_school = 1
bachelor    = 2
master      = 3
phd         = 4
```

CV được quét bằng keyword tiếng Việt/Anh như đại học, kỹ sư, bachelor, master, MBA, tiến sĩ, PhD.

Quy tắc:

| So với yêu cầu | Điểm |
|---|---:|
| Bằng hoặc cao hơn | 100 |
| Thấp hơn đúng một bậc | 50 |
| Thấp hơn từ hai bậc hoặc không phát hiện | 0 |
| Job không yêu cầu học vấn | 100 |

## 8. Ví dụ tính điểm hoàn chỉnh

Giả sử job có:

- Must-have: Python, SQL, Docker.
- Nice-to-have: AWS, Kubernetes.
- Kinh nghiệm tối thiểu: 4 năm.
- Học vấn tối thiểu: Bachelor.
- Trọng số: Skill 60%, Experience 30%, Education 10%.

CV được phân tích:

- Match Python, SQL bằng keyword.
- Match AWS bằng embedding.
- Không match Docker, Kubernetes.
- Phát hiện 2 năm kinh nghiệm.
- Phát hiện Bachelor.

Tính điểm:

```text
Skill Score     = (2 + 2 + 1) / 8 × 100 = 62.5
Experience      = 2 / 4 × 100           = 50
Education       = 100

Total Score     = 62.5 × 0.60
                + 50   × 0.30
                + 100  × 0.10
                = 37.5 + 15 + 10
                = 62.5
```

HR không chỉ thấy `62.5`, mà còn thấy:

- skill nào match/miss;
- match bằng keyword hay embedding;
- similarity tương ứng;
- số năm phát hiện/yêu cầu;
- học vấn phát hiện/yêu cầu;
- snippet bằng chứng từ CV.

## 9. AI Evaluation Agent sau shortlist

Khi HR chuyển application sang `shortlisted`, hệ thống kích hoạt AI evaluation. Code hiện có hai đường AI: Celery/Gemini cũ và LangGraph Agent v2 đang được tích hợp. Khi trao đổi, cần phân biệt rõ cái nào đang chạy production-like và cái nào đang phát triển.

### 9.1 LangGraph Agent v2

```text
Database input
    ↓
Extractor
    ↓
Evaluator
    ↓
Question Generator
    ↓
Verifier
    ├── đạt → lưu kết quả
    └── chưa đạt, attempts < 2 → quay lại Evaluator
```

#### Extractor

- Chunk CV theo nhiều cấp.
- Vector search bằng chứng cho từng must-have/nice-to-have skill.
- Truyền các đoạn evidence tốt nhất cho evaluator.

#### Evaluator

- Gửi job criteria, CV và vector evidence cho LLM.
- Yêu cầu JSON có schema rõ ràng.
- Sinh `overall_score`, recommendation, skill assessments, experience, education, strengths và concerns.
- Evidence phải trích từ CV nếu tìm thấy.

#### Question Generator

- Sinh câu hỏi phỏng vấn dựa trên đánh giá, điểm mạnh và concerns.

#### Verifier

Hiện verifier kiểm tra tối thiểu:

- score nằm trong 0–100;
- có ít nhất một câu hỏi;
- recommendation thuộc tập giá trị cho phép.

Nếu không đạt, graph quay lại evaluator tối đa hai lần.

### 9.2 Dữ liệu AI được lưu

`scoring_results` phân tách:

- `total_score`: điểm công thức ban đầu;
- `ai_score`: điểm AI;
- `match_details`: bằng chứng rule-based/hybrid;
- `ai_evaluation`: nhận xét sâu, câu hỏi phỏng vấn và evidence từ agent.

Hiện hai điểm này **không được cộng thành một final score duy nhất**. Đây là chủ đích an toàn hợp lý trong giai đoạn hiện tại: giữ điểm deterministic và AI assessment riêng để HR so sánh.

## 10. Điểm mạnh của cách tiếp cận

1. Công thức ban đầu dễ giải thích và audit.
2. Must-have được ưu tiên hơn nice-to-have.
3. Embedding chỉ rescue phần keyword miss, giảm chi phí và giảm semantic false positive.
4. Có fallback keyword-only khi model embedding lỗi.
5. Lưu chi tiết match thay vì chỉ trả một con số.
6. AI evaluation tách khỏi điểm rule-based.
7. Có human-in-the-loop: HR shortlist và ra quyết định.
8. Có verifier/self-reflection trong kiến trúc agent mới.

## 11. Hạn chế cần chủ động nói với mentor

### 11.1 Rủi ro kỹ thuật hiện tại

1. **AI evaluator fallback cố định 75 điểm khi LLM lỗi.** Đây là hành vi không phù hợp production vì có thể tạo đánh giá giả hợp lệ. Nên đổi thành trạng thái `evaluation_failed`, không tạo điểm, hoặc dùng deterministic score làm fallback có nhãn rõ ràng.
2. **Ngưỡng embedding 0.30 khá thấp và chưa có evidence calibration.** Cần đánh giá precision/recall trên bộ CV đã gán nhãn.
3. **Experience lấy số năm lớn nhất trong text.** Có thể nhầm số năm của một kỹ năng hoặc mô tả không liên quan với tổng kinh nghiệm.
4. **Education dựa trên keyword.** Chưa kiểm tra chuyên ngành, trạng thái tốt nghiệp và ngữ cảnh phủ định.
5. **Keyword matching dùng toàn văn CV.** Chưa giới hạn theo section, dù `sections_found` hiện ghi `full_text`.
6. **CV search-by-CV hiện dùng keyword scorer trực tiếp**, chưa dùng combined embedding rescue như application scoring; kết quả hai màn hình có thể khác nhau.
7. **Hai AI path đang cùng tồn tại.** Cần chọn kiến trúc đích và tránh chạy trùng Celery Gemini cũ với Agent v2.
8. **Verifier còn nông.** Nó kiểm tra shape/range, chưa kiểm tra evidence có thật trong CV, score có nhất quán với assessment hay có hallucination.
9. **Chưa có bộ benchmark/evaluation chính thức.** Chưa thể khẳng định score tương quan tốt với đánh giá HR.

### 11.2 Rủi ro sản phẩm và đạo đức

- Điểm số chỉ là công cụ hỗ trợ, không nên tự động loại ứng viên.
- CV có thể thiếu thông tin nhưng ứng viên vẫn có năng lực.
- Keyword/embedding có thể ưu tiên cách viết CV hơn năng lực thực tế.
- Học vấn và số năm kinh nghiệm có thể tạo bias nếu dùng cứng nhắc.
- Cần giải thích điểm, cho HR override và lưu audit trail.
- Không nên dùng thông tin nhạy cảm như giới tính, tuổi, ảnh, dân tộc hoặc tình trạng hôn nhân để chấm điểm.

## 12. Đề xuất cải tiến để trao đổi

### Ưu tiên 1 — làm score đáng tin cậy

- Bỏ fallback AI 75 điểm.
- Version hóa scoring formula và embedding model.
- Log model, threshold, criteria và timestamp cho từng lần score.
- Tách `not found` khỏi `does not meet` để tránh phạt CV thiếu dữ liệu.
- Thêm minimum must-have gate tùy chọn thay vì chỉ weighted average.

### Ưu tiên 2 — tăng explainability

- Lưu exact evidence span và page/section của CV.
- Hiển thị confidence và phương pháp match.
- Cho HR sửa match sai và ghi feedback.
- Hiển thị deterministic score và AI score cạnh nhau, không trộn âm thầm.

### Ưu tiên 3 — evaluation khoa học

- Tạo dataset job–CV được 2–3 HR gán nhãn.
- Đo precision/recall của skill matching.
- Đo MAE/Spearman correlation giữa app score và HR score.
- Chạy threshold sweep cho embedding 0.30–0.70.
- So sánh keyword-only, embedding-only và hybrid.
- Theo dõi false positive/false negative theo loại kỹ năng.

### Ưu tiên 4 — hardening Agent

- Verifier kiểm tra evidence xuất hiện thật trong CV.
- Validate JSON nghiêm ngặt và retry có controlled prompt.
- Không gửi toàn bộ PII không cần thiết tới LLM.
- Thêm timeout, cost tracking và failure state.
- Chọn một AI execution path duy nhất.

## 13. Kịch bản demo cho mentor

Chuẩn bị một job và ba CV:

- CV A: match nhiều must-have, đủ kinh nghiệm, đúng học vấn.
- CV B: dùng từ đồng nghĩa để chứng minh embedding rescue.
- CV C: thiếu must-have và kinh nghiệm.

Trình tự demo:

1. Mở tiêu chí của job và giải thích trọng số.
2. Upload/ứng tuyển bằng ba CV.
3. Cho worker chấm điểm.
4. Mở bảng xếp hạng ứng viên.
5. Mở match details của từng CV.
6. Chỉ ra keyword match, embedding-rescued và missing skills.
7. Tính tay một ví dụ để đối chiếu với hệ thống.
8. Shortlist một ứng viên.
9. Chạy AI evaluation và xem nhận xét/câu hỏi phỏng vấn.
10. Nêu rõ HR quyết định cuối cùng và các hạn chế hiện tại.

## 14. Câu nói mở đầu gợi ý

> “Hệ thống của nhóm em dùng hai tầng. Tầng đầu là scoring có công thức cố định và giải thích được: kỹ năng 60%, kinh nghiệm 30%, học vấn 10%; must-have có trọng số gấp đôi nice-to-have. Keyword matcher chạy trước, embedding chỉ bổ sung những kỹ năng bị bỏ sót. Sau khi HR shortlist, LangGraph Agent mới chạy đánh giá sâu, trích bằng chứng và sinh câu hỏi phỏng vấn. Nhóm em giữ điểm công thức và điểm AI riêng, HR vẫn là người quyết định cuối cùng.”

## 15. Các câu hỏi nên hỏi mentor

1. Mentor muốn score phục vụ **xếp hạng**, **lọc ngưỡng**, hay chỉ **giải thích** cho HR?
2. Có nên áp dụng hard gate nếu thiếu một must-have skill không?
3. Trọng số 60/30/10 nên cố định hay cho từng job tự cấu hình?
4. AI score nên đứng riêng hay được dùng trong final ranking?
5. Mentor ưu tiên precision hay recall cho skill matching?
6. Bộ dữ liệu nào có thể dùng làm ground truth và ai sẽ gán nhãn?
7. Mức explainability tối thiểu cần có: snippet, section, page hay confidence?
8. Khi CV không ghi rõ dữ liệu, nên cho 0 điểm hay đánh dấu “không đủ thông tin”?
9. Có yêu cầu fairness/bias audit cụ thể nào cho bài toán tuyển dụng không?
10. Tiêu chí nào mentor dùng để xác nhận hệ thống đã “chấm đúng”?

## 16. Checklist trước buổi trao đổi

- [ ] Backend, Redis worker và MinIO chạy ổn định.
- [ ] Có ít nhất một job với criteria/trọng số rõ ràng.
- [ ] Có 3 CV demo với kết quả dự kiến.
- [ ] Scoring chạy xong và match details có dữ liệu.
- [ ] Tính tay một score để đối chiếu.
- [ ] Chuẩn bị ảnh hoặc live demo keyword vs embedding rescue.
- [ ] Không demo fallback AI 75 như kết quả hợp lệ.
- [ ] Xác định rõ Agent v2 là phần đã hoàn tất hay đang phát triển.
- [ ] Chuẩn bị số liệu benchmark nếu có; nếu chưa có, nói rõ kế hoạch đánh giá.
- [ ] Không để lộ CV thật, email, API key hoặc dữ liệu cá nhân trong demo.
