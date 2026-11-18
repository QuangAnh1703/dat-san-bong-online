# Deploy SanBong.vn (gói miễn phí)

| Phần | Dịch vụ | Ghi chú gói free |
|---|---|---|
| Frontend | Vercel | Không giới hạn đáng kể |
| Backend | Render (Web Service) | Ngủ sau 15 phút không có request, lần gọi đầu chờ ~50 giây. **Chặn cổng SMTP** → gửi mail bằng Brevo |
| PostgreSQL | Neon | 0.5 GB, không hết hạn (Postgres free của Render bị xoá sau 30 ngày) |
| Redis | Upstash | 500k lệnh/tháng |
| Email | Brevo | 300 mail/ngày, gửi qua HTTP API |

Thứ tự làm: **CSDL → Redis → Email → Backend → Frontend → quay lại điền URL chéo**.

## 1. PostgreSQL trên Neon

1. https://neon.tech → New Project, Postgres 16, region **AWS Asia Pacific (Singapore)**.
2. Copy connection string (dạng `postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`) → đây là `DATABASE_URL`.
3. Tạo bảng và tài khoản admin từ máy mình (trong `backend/`, PowerShell):

```powershell
$env:DATABASE_URL="<connection string Neon>"; npm run migrate
$env:DATABASE_URL="<connection string Neon>"; npm run create-admin -- admin@email.com MatKhauManh123
```

(Backend trên Render cũng tự chạy `npm run migrate` mỗi lần khởi động, nên migration mới sẽ tự được áp dụng.)

## 2. Redis trên Upstash

https://console.upstash.com → Create Database, region Singapore → copy URL dạng `rediss://default:<pass>@<host>.upstash.io:6379` → `REDIS_URL`.

## 3. Email trên Brevo

1. https://app.brevo.com → Senders, Domains → thêm và xác minh email người gửi (có thể dùng Gmail của bạn) → `EMAIL_FROM`.
2. Settings → SMTP & API → API Keys → tạo key → `BREVO_API_KEY`.

## 4. Backend trên Render

1. Đẩy code lên GitHub.
2. https://dashboard.render.com → New → **Blueprint** → chọn repo `dat-san-bong-online` (và nhánh). Render đọc `render.yaml` ở thư mục gốc.
3. Điền các biến đang trống:

| Biến | Giá trị |
|---|---|
| `DATABASE_URL` | URL Neon |
| `REDIS_URL` | URL Upstash |
| `BREVO_API_KEY`, `EMAIL_FROM` | Từ bước 3 |
| `CORS_ORIGIN`, `FRONTEND_URL` | URL Vercel (bước 5), ví dụ `https://sanbong.vercel.app`. Chưa có thì tạm để `http://localhost:5173` |
| `BACKEND_URL` | `https://sanbong-api.onrender.com` (URL Render cấp) |
| `GOOGLE_OAUTH_REDIRECT_URI` | `https://sanbong-api.onrender.com/api/auth/google/callback` |
| `GOOGLE_OAUTH_CLIENT_ID/SECRET`, `SEPAY_*`, `DEEPSEEK_API_KEY` | Copy từ `backend/.env` |

`JWT_*_SECRET` do Render tự sinh. Không dùng lại giá trị mẫu.

4. Deploy xong mở `https://<tên>.onrender.com/health` phải thấy `"status":"ok"`.

## 5. Frontend trên Vercel

1. https://vercel.com → Add New → Project → chọn repo.
2. **Root Directory: `frontend`**, Framework: Vite (tự nhận).
3. Environment Variables: `VITE_API_URL=https://sanbong-api.onrender.com` (không có `/` ở cuối).
4. Deploy. `frontend/vercel.json` đã cấu hình để các route như `/san/1` không bị 404 khi tải lại trang.

`VITE_API_URL` được gắn vào lúc build, nên đổi biến này thì phải **Redeploy**.

## 6. Nối các dịch vụ với nhau

- Render: cập nhật `CORS_ORIGIN` và `FRONTEND_URL` = URL Vercel thật.
- Google Cloud Console → Credentials → OAuth client:
  - Authorized JavaScript origins: URL Vercel
  - Authorized redirect URIs: `https://<render>/api/auth/google/callback`
- SePay (https://my.sepay.vn) → Webhook URL: `https://<render>/api/payments/sepay/webhook`, xác thực "API Key" = `SEPAY_WEBHOOK_API_KEY`.

## Gắn tên miền riêng (khi có)

- Vercel → Project → Settings → Domains → thêm `sanbong.vn` và làm theo bản ghi DNS được hướng dẫn.
- Render → Service → Settings → Custom Domains → thêm `api.sanbong.vn` (bản ghi CNAME).
- Cập nhật lại: `VITE_API_URL` (rồi redeploy Vercel), `CORS_ORIGIN`, `FRONTEND_URL`, `BACKEND_URL`, `GOOGLE_OAUTH_REDIRECT_URI`, Google Console, webhook SePay.

## Lỗi thường gặp

| Triệu chứng | Nguyên nhân |
|---|---|
| Trang chủ báo "Không tải được danh sách sân" lần đầu | Backend Render đang thức dậy (~50 giây), bấm Thử lại |
| Lỗi CORS trong console | `CORS_ORIGIN` sai (thừa `/` cuối, sai http/https) |
| Gọi API ra 404 HTML của Vercel | Thiếu `VITE_API_URL` hoặc chưa redeploy sau khi đặt |
| Google login báo `redirect_uri_mismatch` | Redirect URI trong Google Console khác `GOOGLE_OAUTH_REDIRECT_URI` |
| Không nhận được OTP email | Chưa đặt `BREVO_API_KEY` / `EMAIL_FROM`, hoặc email người gửi chưa được xác minh trên Brevo |
