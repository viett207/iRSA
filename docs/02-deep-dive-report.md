# Báo Cáo Phân Tích Sâu (Deep-Dive Report)

**Tên Nhóm:** Nhóm ABC  
**Số lượng:** 06 Thành viên
1. Thành viên 1: Nguyễn Trọng Đức - 2A202601673
2. Thành viên 2: Nguyễn Đào Nam Hải - 2A202601037
3. Thành viên 3: Nguyễn Nam Anh - 2A202601703
4. Thành viên 4: Bùi Đặng Quốc An - 2A202601799
5. Thành viên 5: Nguyễn Minh Hoàng - 2A202601609
6. Thành viên 6: Nguyễn Hoàng Việt - 2A202601940
---

## 1. Bài toán lựa chọn
Nhóm quyết định chọn bài toán: **Xanh SM - Xử lý sự cố sạc pin thực địa cho tài xế.**

## 2. Problem Statement (Phân tích 6 yếu tố)
- **1. Actor / Operator:** Điều phối viên (Dispatcher) tại Trung tâm Điều vận Xanh SM.
- **2. Current Workflow:** Khi tài xế báo hết pin, điều phối viên phải làm thủ công: Tra cứu GPS xe trên hệ thống -> Mở bản đồ tìm trụ sạc trống gần nhất -> Tự viết tin nhắn gửi qua App tài xế -> Gọi cứu hộ nếu pin xe < 5%. (Tổng cộng mất khoảng 15 phút/lượt).
- **3. Bottleneck:** Bước tra cứu trụ sạc tương thích và tự gõ văn bản tin nhắn hướng dẫn đường đi.
- **4. Business Impact:** Mỗi ngày có khoảng 80 sự cố tương tự tại Hà Nội. Làm tốn 20 giờ làm việc của điều phối viên mỗi ngày. Tài xế phải chờ đợi lâu gây lãng phí doanh thu do xe không thể chạy đón khách và làm giảm trải nghiệm tài xế.
- **5. Success Metric:** Giảm tổng thời gian xử lý sự cố từ 15 phút xuống dưới 3 phút. Tỉ lệ chỉ đúng trạm sạc phù hợp đạt 98%.
- **6. Operational Boundary (Ranh giới an toàn):** AI được phép truy xuất vị trí xe và trạm sạc để soạn thảo văn bản nháp. Tuy nhiên:
  - **CẤM TỰ ĐỘNG GỬI TIN** khi chưa có sự phê duyệt của con người (Bắt buộc chèn thẻ `[DRAFT_ONLY]` ở đầu tin nhắn).
  - Nếu pin < 5%, **CẤM** chỉ đường đến trạm sạc xa hơn 5km, bắt buộc AI phải gọi xe sạc pin lưu động (Mobile Charger) thông qua API JSON.

## 3. Đánh giá độ khả thi & Quyết định (Evaluate)
- Dữ liệu mẫu/logs để test: **CÓ SẴN** (từ hệ thống điều vận của Xanh SM hiện tại).
- Kiểm soát rủi ro: **RẤT TỐT** (qua cơ chế Human-in-the-loop bắt buộc phê duyệt trước khi gửi. Nếu AI bị lỗi, điều phối viên sẽ tự gõ tin nhắn như quy trình cũ - Fallback an toàn).
- Stakeholders sẵn sàng đổi mới: **SẴN SÀNG** (Vì giúp điều phối viên giảm tải công việc và áp lực rõ rệt trong giờ cao điểm).

**Quyết định cuối cùng:** **GO (Tiến hành triển khai)**
- **Lý do:** Giải pháp chỉ sử dụng LLM Feature kết hợp với rule-based prompts. Chi phí phát triển phần mềm rất thấp nhưng mang lại giá trị cao (giải phóng 80% thời gian xử lý của bộ phận điều vận). Hơn nữa, ranh giới an toàn (safety boundaries) đã được nhóm thiết lập cực kỳ chặt chẽ bằng code, không lo rủi ro hệ thống điều hành sai.
