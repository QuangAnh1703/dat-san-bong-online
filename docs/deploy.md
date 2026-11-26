# Deploy SanBong.id.vn (Vercel + Render, gói miễn phí)

| Phần | Dịch vụ | Ghi chú gói free |
|---|---|---|
| Frontend | Vercel | |
| Backend `sanbong-api` | Render Web Service | Ngủ sau 15 phút không có request, lần gọi đầu chờ ~50 giây. Chặn cổng SMTP |
| PostgreSQL `sanbong-db` | Render Postgres | 1 GB, **hết hạn sau 30 ngày** (có 14 ngày gia hạn để nâng cấp), mỗi tài khoản 1 CSDL free |
| Redis `sanbong-redis` | Render Key Value | 25 MB, không lưu ra đĩa (mất dữ liệu khi restart, chỉ ảnh hưởng OTP đang chờ) |

Cả ba phần trên Render được khai báo trong `render.yaml`. URL CSDL và Redis tự được nối vào backend.

## 1. Render: CSDL + Redis + backend

1. Đẩy code lên GitHub.
2. https://dashboard.render.com → **New → Blueprint** → kết nối GitHub, chọn repo `dat-san-bong-online` và nhánh muốn deploy.
3. Render hiện danh sách 3 tài nguyên và hỏi các biến còn trống:

| Biến | Giá trị |
|---|---|
| `CORS_ORIGIN`, `FRONTEND_URL` | URL Vercel (bước 2), ví dụ `https://sanbong.vercel.app`. Chưa có thì tạm điền `http://localhost:5173` |
| `BACKEND_URL` | `https://sanbong-api.onrender.com` (đúng URL Render cấp, xem ở trang service) |
| `GOOGLE_OAUTH_REDIRECT_URI` | `<BACKEND_URL>/api/auth/google/callback` |
| `GOOGLE_OAUTH_CLIENT_ID/SECRET`, `SEPAY_*`, `DEEPSEEK_API_KEY` | Copy từ `backend/.env` |
| `GMAIL_*`, `BREVO_API_KEY`, `EMAIL_FROM` | Để trống được, xem mục Email |

`JWT_*_SECRET` do Render tự sinh. `DATABASE_URL` và `REDIS_URL` tự điền.

4. Bấm **Apply**. Backend tự chạy `npm run migrate` khi khởi động, tạo toàn bộ bảng và dữ liệu mẫu.
5. Mở `https://<tên>.onrender.com/health`, phải thấy `"status":"ok"`.

### Tạo tài khoản admin

Gói free không có Shell, nên chạy từ máy mình:

1. Render → `sanbong-db` → Connect → copy **External Database URL**.
2. Trong `backend/` (PowerShell), thêm `?sslmode=require` vào cuối URL:

```powershell
$env:DATABASE_URL="<External Database URL>?sslmode=require"; npm run create-admin -- admin@email.com MatKhauManh123
```

## 2. Vercel: frontend

1. https://vercel.com → Add New → Project → chọn repo.
2. **Root Directory: `frontend`**, Framework Vite (tự nhận).
3. Environment Variables: `VITE_API_URL=https://sanbong-api.onrender.com` (không có `/` cuối).
4. Deploy. `frontend/vercel.json` giúp các route như `/san/1` không bị 404 khi tải lại trang.

`VITE_API_URL` được gắn vào lúc build: đổi biến này thì phải **Redeploy**.

## 3. Nối các dịch vụ với nhau

- Render → `sanbong-api` → Environment: sửa `CORS_ORIGIN`, `FRONTEND_URL` thành URL Vercel thật (Render tự deploy lại).
- Google Cloud Console → Credentials → OAuth client:
  - Authorized JavaScript origins: URL Vercel
  - Authorized redirect URIs: `<BACKEND_URL>/api/auth/google/callback`
- SePay (https://my.sepay.vn) → Webhook: `<BACKEND_URL>/api/payments/sepay/webhook`, xác thực "API Key" = `SEPAY_WEBHOOK_API_KEY`.

## 4. CI/CD

`.github/workflows/ci.yml` chạy mỗi lần push / mở PR:

| Job | Kiểm tra |
|---|---|
| Backend | Dựng PostgreSQL 16 + Redis tạm → `npm run migrate` trên CSDL trống → `migrate:validate` → `npm test` (Jest) → khởi động server và gọi `/health` |
| Frontend | `npm run build` |

Render → `sanbong-api` → Settings → **Auto-Deploy: After CI Checks Pass**: chỉ deploy khi CI xanh. Vercel vẫn tự deploy mỗi lần push (frontend đã được CI build thử).

Quy ước CSDL: máy dev dùng CSDL Docker (`DATABASE_URL` trỏ `localhost:5433`), bản online dùng CSDL Render. Thay đổi cấu trúc đi bằng migration mới → push → CI → Render tự chạy `npm run migrate` khi khởi động. Không sửa tay CSDL Render.

## Email (OTP qua email, gửi báo cáo admin)

Render free chặn cổng SMTP nên Gmail không gửi được. Server vẫn chạy bình thường, chỉ các chức năng gửi mail bị lỗi. Có ba cách:

- Không cần email: bỏ qua. OTP qua số điện thoại hiện là giả lập (in ra log Render).
- Nâng `sanbong-api` lên gói Starter (7 USD/tháng): mở SMTP, điền `GMAIL_USER` và `GMAIL_APP_PASSWORD` như ở máy.
- Brevo (miễn phí 300 mail/ngày, gửi qua HTTP): xác minh email người gửi, tạo API key, điền `BREVO_API_KEY` và `EMAIL_FROM`. Tạo API key cần xác minh số điện thoại, số Việt Nam có thể không nhận được mã.
- Resend (miễn phí 3.000 mail/tháng, gửi qua HTTP, được ưu tiên nếu có): thêm tên miền `sanbong.id.vn` trên Resend, tạo các bản ghi DNS Resend đưa (DKIM, SPF) ở iNET, tạo API key, điền `RESEND_API_KEY` và `EMAIL_FROM=no-reply@sanbong.id.vn`.

## Tên miền sanbong.id.vn

| Địa chỉ | Trỏ tới | Bản ghi DNS (iNET) |
|---|---|---|
| `www.sanbong.id.vn` (chính) | Vercel | `CNAME www` → giá trị Vercel đưa (`...vercel-dns-017.com`) |
| `sanbong.id.vn` | Vercel, tự chuyển 308 sang `www` | `A @` → `216.198.79.1`, **tắt "Bảo vệ"** của iNET (bật thì trỏ sang máy chủ chống DDoS, Vercel không cấp được HTTPS) |
| `api.sanbong.id.vn` | Render `sanbong-api` | `CNAME api` → `sanbong-api.onrender.com` |

Cấu hình đi kèm:

- Vercel: `VITE_API_URL=https://api.sanbong.id.vn` (kiểu **Config**, không phải Secret — biến `VITE_` lộ ra trình duyệt), đổi xong phải Redeploy.
- Render: `CORS_ORIGIN=https://www.sanbong.id.vn,https://sanbong.id.vn,https://dat-san-bong-online.vercel.app`, `FRONTEND_URL=https://www.sanbong.id.vn`, `BACKEND_URL=https://api.sanbong.id.vn`, `GOOGLE_OAUTH_REDIRECT_URI=https://api.sanbong.id.vn/api/auth/google/callback`.
- Google Console (client SanBong1): origins `https://www.sanbong.id.vn`, `https://sanbong.id.vn`; redirect `https://api.sanbong.id.vn/api/auth/google/callback`.
- SePay webhook: `https://api.sanbong.id.vn/api/payments/sepay/webhook`, API Key = `SEPAY_WEBHOOK_API_KEY`, bật tự gửi lại khi lỗi (backend free ngủ ~50 giây).

## Lỗi thường gặp

| Triệu chứng | Nguyên nhân |
|---|---|
| Trang chủ báo "Không tải được danh sách sân" lần đầu | Backend đang thức dậy (~50 giây), bấm Thử lại |
| Lỗi CORS trong console | `CORS_ORIGIN` sai (thừa `/` cuối, sai http/https) |
| Gọi API ra 404 HTML của Vercel | Thiếu `VITE_API_URL` hoặc chưa redeploy sau khi đặt |
| Google login báo `redirect_uri_mismatch` | Redirect URI trong Google Console khác `GOOGLE_OAUTH_REDIRECT_URI` |
| Deploy lỗi `Loi khi chay migration ...` | Xem log Render, sửa bằng migration mới (không sửa file cũ) |
