---
name: api-design
description: REST API conventions for the SanBong.vn Express backend - route naming, status codes, pagination, errors via AppError, auth/RBAC, OpenAPI sync. Use when adding, changing, or reviewing an endpoint in backend/src/modules.
license: MIT
---

# Thiết kế API - SanBong.vn

Backend: Express 4, CommonJS, `pg` thuần (không ORM, không TypeScript, không thư viện validate).

## Cấu trúc

- Mỗi module trong `backend/src/modules/<module>/`: `<module>.routes.js` (HTTP) + `<module>.repository.js` (SQL).
- Router gắn trong `backend/src/routes/index.js` dưới prefix `/api/<module>` (không có `/v1`).
- Truy vấn luôn dùng tham số `$1, $2...`, không nối chuỗi SQL.

## Đặt tên route

```
GET    /api/venues            danh sách (lọc bằng query: ?district=...&date=...)
GET    /api/venues/:id        chi tiết
POST   /api/venues            tạo
PUT    /api/venues/:id        cập nhật
DELETE /api/venues/:id        xóa
GET    /api/venues/:id/fields tài nguyên con
POST   /api/bookings/:code/cancel   hành động không phải CRUD → POST + động từ ở cuối
```

Danh từ số nhiều, chữ thường, kebab-case; không đặt động từ trong URL (`/getVenues` ✗).

## Status code

| Code | Khi nào |
|---|---|
| 200 | GET / PUT / hành động thành công |
| 201 | POST tạo mới |
| 400 | Dữ liệu sai (`VALIDATION_ERROR`, `MISSING_FIELD`...) |
| 401 | Chưa đăng nhập / token hết hạn |
| 403 | Đã đăng nhập nhưng không đủ quyền / không sở hữu tài nguyên |
| 404 | Không tìm thấy |
| 409 | Trùng lặp, xung đột trạng thái (vd: slot đã có người giữ) |
| 500 | Lỗi không lường trước - không lộ chi tiết |

Không trả 200 kèm `success: false`.

## Response

- Thành công: giữ cùng dạng với các endpoint khác trong module (vd. danh sách sân trả `{ count, data }`). Đổi dạng response của endpoint cũ thì phải sửa cả frontend (`frontend/src/services/`, `mappers.js`).
- Danh sách có phân trang: offset với `?page=1&limit=20`, trả kèm `page`, `limit`, `total` (xem `admin.routes.js`).
- Không trả hash mật khẩu, token nội bộ, lỗi SQL.

## Lỗi

```js
const { AppError } = require('../../lib/errors');

if (!venue) throw new AppError('VENUE_NOT_FOUND');
if (!phone) throw new AppError('MISSING_FIELD', { field: 'phone' });
```

- Error handler (`backend/src/middlewares/index.js`) trả `{ error: { code, message, details, requestId, timestamp } }`.
- Code mới: thêm vào `ERRORS` trong `backend/src/lib/errors.js` với `status` + message tiếng Việt, tên `UPPER_SNAKE_CASE`.
- Lỗi Postgres (unique, FK...) để `fromDbError` tự map - không tự bắt rồi trả 500.
- Handler async bọc `try { ... } catch (e) { next(e); }` như các route hiện có.

## Xác thực & phân quyền

- Cần đăng nhập: `requireAuthenticated` (`backend/src/middlewares/auth.js`). Giới hạn vai trò: `requireRole('OWNER', 'ADMIN')` (`backend/src/middlewares/rbac.js`); vai trò: `PLAYER`, `OWNER`, `ADMIN`.
- Gắn middleware ngay trên route cần bảo vệ.
- Kiểm tra quyền sở hữu: chủ sân chỉ sửa sân của mình, người chơi chỉ xem đơn của mình → 403 nếu không phải.

## Checklist trước khi xong

- [ ] URL đúng quy ước, method và status code đúng
- [ ] Validate đầu vào, lỗi dùng `AppError` với code có trong `errors.js`
- [ ] Có `requireAuth` / `requireRole` và kiểm tra quyền sở hữu nếu cần
- [ ] Danh sách có phân trang
- [ ] Cập nhật `docs/openapi.yaml`
- [ ] Gọi thử endpoint (Swagger `http://localhost:3000/docs` hoặc qua UI)
