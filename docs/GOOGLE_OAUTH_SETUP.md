# Google OAuth Setup Guide (SCRUM-103)

## Bước 1: Tạo Google Cloud Project

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a Project** → **New Project**
3. Nhập tên project: `SanBong.id.vn` (hoặc tên phù hợp)
4. Click **Create**

## Bước 2: Bật Google+ API

1. Trong Cloud Console, truy cập **APIs & Services**
2. Click **Enable APIs and Services**
3. Tìm `Google+ API` hoặc `Google Identity Services API`
4. Click vào và nhấn **Enable**

## Bước 3: Tạo OAuth 2.0 Client Credentials

1. Truy cập **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Nếu chưa tạo OAuth consent screen:
   - Click **Create OAuth consent screen**
   - Chọn User Type: **External** → **Create**
   - Điền:
     - **App name**: SanBong.id.vn
     - **Support email**: doquanganh200404@gmail.com
     - **Developer contact**: doquanganh200404@gmail.com
   - Click **Save and Continue** → **Save and Continue** → **Save and Continue**

4. Quay lại **Credentials** → **Create Credentials** → **OAuth client ID**
5. Chọn **Application type**: Web application
6. Điền:
   - **Name**: SanBong.id.vn Web Client
   - **Authorized JavaScript origins**:
     - `http://localhost:5173` (development)
     - `http://localhost:3000` (backend, nếu cần)
     - Hoặc domain production của bạn
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/google/callback` (development)
     - `https://yourdomain.com/api/auth/google/callback` (production)

7. Click **Create**
8. Copy **Client ID** và **Client Secret**

## Bước 4: Cấu hình Environment Variables

Thêm vào `.env` (hoặc `.env.local` cho development):

```
GOOGLE_OAUTH_CLIENT_ID=<YOUR_CLIENT_ID>.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=<YOUR_CLIENT_SECRET>
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
FRONTEND_URL=http://localhost:5173
```

## Bước 5: Test Google Login

1. Khởi động backend: `cd backend && npm run dev`
2. Khởi động frontend: `cd frontend && npm run dev`
3. Mở browser → http://localhost:5173
4. Click nút **Login/Register với Google**
5. Đăng nhập bằng Google account
6. Kiểm tra xem callback có lấy access token và user info không

## Lỗi Thường Gặp

### Lỗi: `redirect_uri_mismatch`
- **Nguyên nhân**: Redirect URI trong `.env` không khớp với Authorized redirect URIs trong Google Console
- **Giải pháp**: Kiểm tra chính xác URI trong cả backend (.env) và Google Console

### Lỗi: `invalid_client_id`
- **Nguyên nhân**: Client ID không tồn tại hoặc sai format
- **Giải pháp**: Copy lại Client ID từ Google Console

### Lỗi: Popup bị chặn
- **Nguyên nhân**: Browser chặn popup từ Google
- **Giải pháp**: Cho phép popup hoặc dùng redirect thay vì popup

## API Endpoints

### Initiate Google Login
```
GET /api/auth/google
```
Redirect to Google login

### Google OAuth Callback
```
GET /api/auth/google/callback?code=...&state=...
```
Handle callback từ Google, return access token & user info

### Database Tables
- `app_user` - Bảng người dùng (email, phone, role, status)
- `oauth_account` - Bảng liên kết OAuth (user_id, provider, provider_uid)
- `user_profile` - Hồ sơ người dùng (full_name, district_code, skill_level)

## Test Cases (SCRUM-105)

### Test Case 1: Đăng ký người dùng mới qua Google
1. Click "Đăng ký với Google"
2. Đăng nhập bằng Google account không tồn tại
3. Kiểm tra: User được tạo mới với email từ Google
4. Kiểm tra: oauth_account được tạo với provider='GOOGLE' và provider_uid từ Google

**Expected**: Người dùng được tạo và auto-login thành công

### Test Case 2: Đăng nhập bằng Google với email đã tồn tại
1. Tạo user A với email `test@gmail.com` bằng OTP
2. Click "Đăng nhập với Google" dùng cùng email `test@gmail.com`
3. Kiểm tra: Không tạo user mới, dùng user cũ
4. Kiểm tra: oauth_account được liên kết với user cũ

**Expected**: Auto-link tới user cũ, đăng nhập thành công, không báo lỗi "Email already taken"

### Test Case 3: Liên kết OAuth với account hiện tại
1. Đăng nhập bằng email + password
2. (Future feature) Click "Link with Google"
3. Kiểm tra: OAuth account được thêm vào user hiện tại

**Expected**: oauth_account được tạo với user_id của user hiện tại

## Security Notes

- Client Secret phải giữ bí mật, chỉ dùng ở backend
- HTTPS bắt buộc trong production
- Validate email từ Google trước khi tạo/liên kết user
- Implement rate limiting trên /api/auth/google/callback để chống brute-force
