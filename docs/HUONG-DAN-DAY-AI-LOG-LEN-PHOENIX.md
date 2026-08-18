# Hướng dẫn đẩy AI log của Claude, Codex và Antigravity lên Phoenix

Tài liệu này áp dụng cho Windows PowerShell và repo `P-164`.

## Luồng thực hiện

```text
Thiết lập chung một lần
    ↓
Dùng Claude Code để tạo log Claude
    ↓
Dùng Codex để tạo log Codex
    ↓
Dùng Antigravity để tạo transcript
    ↓
Quét transcript Antigravity vào session.jsonl
    ↓
Kiểm tra session.jsonl có đủ cả ba tool
    ↓
Gửi toàn bộ log lên Phoenix bằng submit_log.py
```

## 1. Mở PowerShell tại repo

```powershell
cd C:\Users\Nguye\Desktop\P-164
```

Các lệnh trong những phần tiếp theo đều phải chạy tại thư mục này.

## 2. Thiết lập chung (chỉ cần làm một lần)

### 2.1. Kiểm tra thông tin Git

```powershell
git config user.name
git config user.email
```

Nếu chưa có, cấu hình bằng thông tin của thành viên:

```powershell
git config user.name "Tên của bạn"
git config user.email "email-cua-ban@example.com"
```

Email này được ghi vào AI log để nhận diện người thực hiện.

### 2.2. Kiểm tra cấu hình Phoenix

Mở file `.env` và bảo đảm có ba biến sau:

```env
AI_LOG_SERVER=https://ai-logs.note.transformerlabs.ai/api/ingest
AI_LOG_API_KEY=KEY_RIENG_CUA_BAN
AI_LOG_DIR=.ai-log
```

Không chia sẻ `AI_LOG_API_KEY` và không commit file `.env`.

Kiểm tra nhanh mà không hiển thị API key:

```powershell
Select-String -Path .env -Pattern '^AI_LOG_SERVER=', '^AI_LOG_DIR='
```

### 2.3. Cài pre-push hook

```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup_hooks.ps1
```

Kết quả mong đợi:

```text
[ai-log] Git pre-push hook installed.
[ai-log] Setup complete.
```

Kiểm tra hook:

```powershell
Get-Content .git\hooks\pre-push
```

### 2.4. Kích hoạt virtual environment

```powershell
.\.venv\Scripts\Activate.ps1
```

Nếu PowerShell chặn script, dùng Python trực tiếp qua đường dẫn:

```powershell
.\.venv\Scripts\python.exe --version
```

## 3. Tạo log bằng Claude Code

Mở terminal thứ nhất tại repo:

```powershell
cd C:\Users\Nguye\Desktop\P-164
claude
```

Gửi ít nhất một yêu cầu thật liên quan đến dự án, ví dụ:

```text
Đọc cấu trúc backend và giải thích luồng xử lý đăng nhập hiện tại.
```

Chờ Claude trả lời xong rồi thoát phiên. Repo đã cấu hình hook trong
`.claude/settings.json`; chỉ prompt bạn gửi cho Claude sẽ được ghi tự động vào
`.ai-log/session.jsonl`.

Kiểm tra log Claude:

```powershell
Get-Content .ai-log\session.jsonl | Select-String '"tool"\s*:\s*"claude"'
```

Chỉ chuyển sang bước kế tiếp sau khi lệnh trên trả về ít nhất một dòng.

## 4. Tạo log bằng Codex

Mở terminal mới tại repo:

```powershell
cd C:\Users\Nguye\Desktop\P-164
codex
```

Gửi ít nhất một yêu cầu thật, ví dụ:

```text
Kiểm tra các test hiện có và đề xuất test còn thiếu cho API đăng nhập.
```

Chờ Codex hoàn thành lượt trả lời rồi thoát. Repo đã bật hooks trong
`.codex/config.toml` và khai báo logger trong `.codex/hooks.json`.

Kiểm tra log Codex:

```powershell
Get-Content .ai-log\session.jsonl | Select-String '"tool"\s*:\s*"codex"'
```

Chỉ chuyển sang bước kế tiếp sau khi lệnh trên trả về ít nhất một dòng.

## 5. Tạo và quét log Antigravity

### 5.1. Thêm `agy` vào PATH của terminal hiện tại

```powershell
$env:Path += ";$env:LOCALAPPDATA\agy\bin"
agy --version
```

Nếu chưa đăng nhập:

```powershell
agy auth login
```

### 5.2. Dùng Antigravity trong repo

```powershell
cd C:\Users\Nguye\Desktop\P-164
agy
```

Gửi ít nhất một yêu cầu thật, ví dụ:

```text
Phân tích cấu trúc frontend và chỉ ra component phù hợp để hiển thị trạng thái đăng nhập.
```

Chờ Antigravity trả lời xong rồi thoát phiên.

### 5.3. Quét transcript Antigravity

Antigravity không ghi trực tiếp bằng hook giống Claude và Codex. Chạy:

```powershell
.\.venv\Scripts\python.exe scripts\log_antigravity.py --auto
```

Nếu cuộc hội thoại cũ hơn 24 giờ, quét 72 giờ:

```powershell
.\.venv\Scripts\python.exe scripts\log_antigravity.py --hours 72
```

Kiểm tra log Antigravity:

```powershell
Get-Content .ai-log\session.jsonl | Select-String '"tool"\s*:\s*"antigravity"'
```

Không dùng chế độ legacy dạng `log_antigravity.py "tóm tắt" "model"`, vì nó
không lấy prompt thật từ transcript.

## 6. Kiểm tra đã có đủ log của cả ba công cụ

Chạy khối PowerShell sau:

```powershell
$logFile = '.ai-log\session.jsonl'

if (-not (Test-Path $logFile)) {
    Write-Host 'CHƯA CÓ file session.jsonl' -ForegroundColor Red
} else {
    foreach ($tool in @('claude', 'codex', 'antigravity')) {
        $count = (Select-String -Path $logFile -Pattern "`"tool`"\s*:\s*`"$tool`"" | Measure-Object).Count
        if ($count -gt 0) {
            Write-Host "OK: $tool có $count log" -ForegroundColor Green
        } else {
            Write-Host "THIẾU: $tool" -ForegroundColor Red
        }
    }
}
```

Chỉ gửi lên Phoenix khi kết quả có đủ:

```text
OK: claude có ... log
OK: codex có ... log
OK: antigravity có ... log
```

## 7. Gửi cả ba loại log lên Phoenix

Khi đã đủ log, gửi trực tiếp bằng một lệnh:

```powershell
.\.venv\Scripts\python.exe scripts\submit_log.py
```

Script gửi toàn bộ entry đang chờ trong `.ai-log/session.jsonl`, không cần chạy
ba lệnh submit riêng cho ba công cụ.

Kết quả thành công có dạng:

```text
[ai-log] Submitted 12 entries → 200
```

Sau khi gửi thành công, log được lưu cục bộ trong:

```text
.ai-log/archive/YYYY-MM-DD.jsonl
```

Kiểm tra archive:

```powershell
Get-ChildItem .ai-log\archive
```

## 8. Cách gửi tự động khi `git push`

Sau khi tạo log bằng cả ba công cụ, có thể dùng quy trình Git bình thường:

```powershell
git status
git add <cac-file-can-commit>
git commit -m "mô tả thay đổi"
git push
```

Ngay trước khi push, hook sẽ:

1. Quét transcript Antigravity trong 24 giờ gần nhất.
2. Gộp với log Claude và Codex đang có trong `session.jsonl`.
3. Gửi toàn bộ lên Phoenix.
4. Tiếp tục push code lên GitHub.

Không dùng `git push --no-verify`, vì tùy chọn đó bỏ qua hook AI log.

## 9. Bộ lệnh rút gọn

Sau khi đã dùng xong cả Claude, Codex và Antigravity, chạy lần lượt:

```powershell
cd C:\Users\Nguye\Desktop\P-164

# Quét prompt thật của Antigravity vào cùng hàng chờ với Claude và Codex
.\.venv\Scripts\python.exe scripts\log_antigravity.py --auto

# Kiểm tra file hàng chờ
Get-Content .ai-log\session.jsonl

# Gửi tất cả log lên Phoenix
.\.venv\Scripts\python.exe scripts\submit_log.py

# Kiểm tra log đã được archive
Get-ChildItem .ai-log\archive
```

## 10. Xử lý lỗi thường gặp

### `No logs to submit`

Chưa có entry trong `.ai-log/session.jsonl`, hoặc log đã được gửi trước đó. Hãy
kiểm tra từng tool theo các bước 3, 4 và 5.

### Không có log Claude

```powershell
bash --version
Get-Content .claude\settings.json
```

Đóng và mở lại Claude Code sau khi xác nhận cấu hình hook.

### Không có log Codex

```powershell
Get-Content .codex\config.toml
Get-Content .codex\hooks.json
```

`config.toml` phải có:

```toml
[features]
hooks = true
```

Sau đó đóng và mở lại Codex.

### Không có log Antigravity

Bảo đảm đã mở `agy` trong đúng thư mục repo, sau đó thử:

```powershell
.\.venv\Scripts\python.exe scripts\log_antigravity.py --hours 72
```

### `401 Unauthorized` hoặc `403 Forbidden`

Kiểm tra `AI_LOG_API_KEY` trong `.env`. Không in key ra terminal hoặc gửi key
cho người khác.

### Lỗi mạng hoặc Phoenix tạm thời không hoạt động

`submit_log.py` giữ log lại trong `.ai-log/session.jsonl`. Không xóa file; chạy
lại lệnh submit khi kết nối ổn định.

## Lưu ý quan trọng

- Không sửa hoặc xóa thủ công nội dung trong `.ai-log`.
- Không commit `.env` hoặc API key.
- Không dùng `git push --no-verify`.
- Chỉ log những prompt thật đã dùng trong quá trình phát triển dự án.
- Có thể gửi chung log của cả ba công cụ trong một lần `submit_log.py`.
