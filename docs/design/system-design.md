# Thiết kế hệ thống — SanBong.id.vn

> Tài liệu tổng thể: hệ thống gồm những phần nào, dữ liệu đi qua đâu, và các quy tắc thiết kế
> phải giữ khi thêm tính năng. Viết từ code hiện tại (tháng 10/2026), không phải từ PRD.
>
> - Luồng nghiệp vụ chi tiết (happy case + edge case): [`flows.md`](flows.md)
> - Đặc tả từng endpoint: [`../openapi.yaml`](../openapi.yaml) (Swagger: `http://localhost:3000/docs`)
> - Cách chạy, quy ước code, commit: [`CLAUDE.md`](../../CLAUDE.md)
>
> Sửa kiến trúc (thêm bảng, job nền, module, vai trò…) thì cập nhật file này trong cùng commit.

## Mục lục

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Backend](#2-backend)
3. [Cơ sở dữ liệu](#3-cơ-sở-dữ-liệu)
4. [Xác thực & phân quyền](#4-xác-thực--phân-quyền)
5. [Đặt sân: vòng đời đơn & chống đặt trùng](#5-đặt-sân-vòng-đời-đơn--chống-đặt-trùng)
6. [Giá, đặt cọc & thanh toán](#6-giá-đặt-cọc--thanh-toán)
7. [Cộng đồng: cáp kèo & ghép chân lẻ](#7-cộng-đồng-cáp-kèo--ghép-chân-lẻ)
8. [Thông báo & job nền](#8-thông-báo--job-nền)
9. [Frontend](#9-frontend)
10. [Quy tắc thiết kế bắt buộc](#10-quy-tắc-thiết-kế-bắt-buộc)
11. [Nợ kỹ thuật & điểm lệch đã biết](#11-nợ-kỹ-thuật--điểm-lệch-đã-biết)
12. [Chức năng bổ sung theo PRD](#12-chức-năng-bổ-sung-theo-prd)

---

## 1. Tổng quan kiến trúc

Ba lớp độc lập, giao tiếp qua REST/JSON. Không có message queue, không có WebSocket: dữ liệu "gần real-time"
là nhờ ràng buộc ở CSDL + frontend gọi lại API (polling).

```mermaid
flowchart LR
    subgraph Client
        FE["Frontend<br/>React 19 + Vite<br/>:5173"]
    end
    subgraph Server
        API["Backend<br/>Express 4 (CommonJS)<br/>:3000"]
        JOB["Job nền<br/>setInterval 60s<br/>(trong cùng tiến trình)"]
    end
    subgraph Data
        PG[("PostgreSQL 16<br/>:5433")]
        RD[("Redis 7<br/>OTP")]
    end
    MAIL["SMTP<br/>(Nodemailer)"]
    GG["Google OAuth"]

    FE -- "/api/* (Vite proxy khi dev)<br/>Bearer JWT" --> API
    API --> PG
    JOB --> PG
    API --> RD
    API --> MAIL
    API <--> GG
```

| Thành phần | Vai trò | Ghi chú |
|---|---|---|
| Frontend | SPA, một `AppContext` giữ state toàn cục | Mobile-first, giao diện tối, màu nhấn theo vai trò |
| Backend | REST API, toàn bộ logic nghiệp vụ | Không ORM, SQL thuần qua `pg` |
| PostgreSQL | Nguồn sự thật duy nhất | Ràng buộc nghiệp vụ đặt ở DB khi có thể (EXCLUDE, CHECK, trigger) |
| Redis | Mã OTP + đếm số lần nhập sai | Chỉ dùng cho OTP, mất Redis thì chỉ hỏng đăng ký/quên mật khẩu |
| Job nền | Nhả slot quá hạn, hết hạn bài đăng / lời mời | Chạy trong tiến trình API, xem [mục 8](#8-thông-báo--job-nền) |

---

## 2. Backend

### 2.1 Cấu trúc

```
backend/src/
├── server.js             Khởi tạo app, CORS, kiểm tra migration, job nền
├── db.js                 Pool pg, query(), withTransaction(); BIGINT/NUMERIC trả về number
├── redis.js              Client Redis
├── db/migrate.js         Chạy / kiểm tra migration (checksum)
├── db/create-admin.js    Tạo / đặt lại tài khoản admin (chạy tay)
├── lib/errors.js         AppError + bảng mã lỗi + map lỗi Postgres
├── middlewares/          index.js (requestId, log, 404, errorHandler), auth.js, rbac.js
├── routes/index.js       /health, /docs, /openapi.yaml, gắn router các module
└── modules/<module>/     <module>.routes.js (HTTP) + <module>.repository.js (SQL)
```

### 2.2 Module

| Prefix | Module | Trách nhiệm |
|---|---|---|
| `/api/auth` | `auth` | Đăng ký SĐT / email-OTP, đăng nhập, refresh token, Google OAuth, quên mật khẩu |
| `/api/profile` | `profile` | Hồ sơ cá nhân, trình độ, vị trí sở trường, avatar |
| `/api/teams` | `teams` | Đội bóng của đội trưởng |
| `/api/venues`, `/api/fields` | `venues` | Cụm sân, sân con, lịch trống, flash sale công khai |
| `/api/pricing` | `pricing` | Bảng giá theo khung giờ (chủ sân) |
| `/api/bookings` | `bookings` | Đặt sân lẻ / định kỳ, hủy, đánh giá |
| `/api/payments` | `payments` | Báo đã chuyển khoản cọc |
| `/api/owner` | `owner` | Xin làm chủ sân; quản lý đơn, khóa sân, flash sale |
| `/api/community` | `community` | Cáp kèo đội–đội, hội thoại |
| `/api/freelance` | `community` | Ghép chân lẻ (đội tìm người, người tìm đội) |
| `/api/notifications` | `notifications` | Hộp thông báo của người dùng |
| `/api/complaints` | `complaints` | Người chơi gửi khiếu nại |
| `/api/admin` | `admin` | Duyệt chủ sân / cụm sân, người dùng, khiếu nại, báo cáo |
| `/api/chatbot`, `/api/admin/knowledge` | `chatbot` | Trợ lý chat (DeepSeek + RAG), quản trị kho tri thức (mục 12.4) |

### 2.3 Một request đi qua những gì

```
requestId → requestLogger → verifyAccessToken (gắn req.user nếu có token)
  → checkPermission (bảng quyền tĩnh trong rbac.js) → router module
  → [requireAuthenticated / requireRole] → handler → errorHandler
```

- Mọi lỗi ném `AppError(code)`; `errorHandler` trả về `{ error: { code, message, details, requestId, timestamp } }`.
- Lỗi Postgres được map tự động trong `fromDbError`: `23P01` (EXCLUDE) → `SLOT_TAKEN` / `PRICE_SLOT_OVERLAP`,
  `23514` → `CONSTRAINT_VIOLATED`, `23505` → trùng dữ liệu, `23503` → khóa ngoại.
- Thao tác ghi nhiều bảng chạy trong `withTransaction`; chỗ có tranh chấp dùng `SELECT … FOR UPDATE`
  hoặc `pg_advisory_xact_lock`.

---

## 3. Cơ sở dữ liệu

### 3.1 Nhóm bảng

| Nhóm | Bảng chính | Migration |
|---|---|---|
| Người dùng | `app_user`, `user_profile`, `oauth_account`, `team`, `team_member`, `reputation_log`, `otp_request`, `district` | V02 |
| Sân | `venue`, `field`, `venue_image`, `amenity`, `venue_amenity`, `venue_approval`, `cancellation_policy` | V03 |
| Giá | `price_rule`, `promotion`, `promotion_time_span` | V04 |
| Đặt sân | `booking`, `booking_slot`, `recurring_contract`, `price_history` | V05 |
| Thanh toán | `payment`, `payment_transaction`, `refund` | V06 |
| Ghép đội | `match_post`, `join_request`, `match_participant`, `conversation`, `conversation_member`, `message` | V07, V16, V17 |
| Vận hành | `review`, `complaint_ticket`, `complaint_evidence`, `notification`, `audit_log` | V08 |
| Khác | `owner_request` (V11), `venue_service`, `booking_service` (V13), `complaint_message` (V17), `bank_transaction` (V19) | V11–V19 |
| PRD bổ sung | POS (V20), sổ quỹ (V21), ví hội viên (V22), Elo & giải đấu (V23), cờ trả kho (V24) — xem mục 12 | V20–V24 |

Seed dữ liệu mẫu ở V10, V14, V15.

### 3.2 Quan hệ cốt lõi

```mermaid
erDiagram
    app_user ||--|| user_profile : "có"
    app_user ||--o{ venue : "sở hữu (OWNER)"
    venue ||--o{ field : "gồm sân con"
    venue ||--o{ price_rule : "bảng giá"
    app_user ||--o{ booking : "đặt"
    booking ||--|{ booking_slot : "giữ khung giờ"
    field ||--o{ booking_slot : ""
    booking ||--o{ payment : ""
    booking ||--o| review : "đánh giá 1 lần"
    booking ||--o{ match_post : "bài tìm đối / tuyển người"
    match_post ||--o{ join_request : "xin vào / lời mời"
    booking ||--o{ match_participant : "danh sách trận"
    app_user ||--o{ notification : ""
```

### 3.3 Logic nằm trong CSDL

| Đối tượng | Làm gì |
|---|---|
| `booking_slot.no_slot_overlap` (EXCLUDE gist) | Hai slot giao nhau trên cùng sân con không thể cùng ở trạng thái `HELD`/`CONFIRMED`/`LOCKED` |
| `price_rule.no_price_overlap` (EXCLUDE gist) | Khung giá của một cụm sân không chồng lấp |
| `ck_slot_duration` | Mỗi slot 60 phút – 4 giờ |
| `ck_slots_needed` | Bài tuyển chân lẻ 1–10 người |
| `fn_release_expired_holds()` | Hủy đơn `HELD` quá `hold_expires_at`, nhả slot |
| `fn_apply_reputation()` | Cộng/trừ điểm uy tín (0–100) + ghi `reputation_log` |
| `tg_review_rating` | Đánh giá mới → tính lại `venue.avg_rating`, `rating_count` |
| `fn_touch_updated_at` | Tự cập nhật `updated_at` |
| `v_field_schedule`, `v_venue_daily_revenue` | View lịch sân và doanh thu |

### 3.4 Migration

Forward-only, `csdl/db/migration/VXX__mo_ta.sql`, mỗi file một transaction, kiểm tra checksum khi backend khởi động.
Chi tiết: skill [`database-migrations`](../../.claude/skills/database-migrations/SKILL.md).
Bảng do user `postgres` sở hữu nên migration có `ALTER TABLE` phải chạy bằng `postgres`
(`DATABASE_URL=postgresql://postgres:postgres@localhost:5433/sanbong npm run migrate`).

---

## 4. Xác thực & phân quyền

### 4.1 Token

| Token | Hạn | Lưu ở |
|---|---|---|
| Access (JWT, `sub` = user id, `role`) | 15 phút (`JWT_ACCESS_EXPIRES`) | `localStorage.auth_token` |
| Refresh (JWT) | 7 ngày (`JWT_REFRESH_EXPIRES`) | `localStorage.auth_refresh` |

`apiClient` ([`services/api.js`](../../frontend/src/services/api.js)) tự gọi `/api/auth/refresh` khi gặp lỗi token,
nhiều request hết hạn cùng lúc chỉ refresh một lần. Refresh thất bại → phát sự kiện `sanbong:session-expired` → đăng xuất.

Cách đăng nhập: SĐT + mật khẩu, email + mật khẩu (đăng ký qua OTP email, OTP lưu Redis 15 phút, khóa sau nhiều lần sai),
Google OAuth (tự chạy chế độ mock khi chưa cấu hình `GOOGLE_OAUTH_*`). Mật khẩu băm `bcryptjs`, tối thiểu 8 ký tự gồm cả chữ và số;
SĐT đăng ký phải là đầu số di động VN.

- `temp_token` sau khi xác minh OTP (đăng ký / quên mật khẩu) là **JWT có chữ ký**, sống 10 phút, mang `purpose` —
  token của luồng này không dùng được cho luồng kia.
- Google callback luôn redirect về `/auth/google-callback` của frontend (kèm token hoặc `?error=`); tài khoản `LOCKED` bị chặn ở đây.
- Người chơi chưa chọn khu vực sau khi đăng nhập/đăng ký → frontend chuyển sang `/ho-so` (PRD: lần đầu đăng nhập cập nhật hồ sơ).

### 4.2 Vai trò

Ba vai trò **tách biệt hoàn toàn**: `PLAYER`, `OWNER`, `ADMIN`. Một tài khoản có đúng một vai trò; frontend hiển thị
giao diện theo `user.role`, không có menu chuyển góc nhìn.

| Lớp | Cơ chế |
|---|---|
| Backend – từng route | `requireAuthenticated`, `requireRole('OWNER', 'ADMIN')` gắn trên router / route |
| Backend – sở hữu | Handler tự kiểm tra (`booking.user_id === req.user.id`, chủ cụm sân…) → `FORBIDDEN` |
| Backend – bảng tĩnh | `checkPermission()` trong `rbac.js` (route không có trong bảng được cho qua, xác thực do router lo) |
| Frontend | `RequireAuth`, `RequireOwner`, `RequireAdmin` trong `App.jsx`; menu theo vai trò trong `Navbar.jsx` |

Frontend chặn chỉ để điều hướng — **quyền thật luôn kiểm tra ở backend**.

Tài khoản admin không tạo qua migration: `npm run create-admin -- <email> <mật_khẩu>`.
Nâng người chơi lên chủ sân: người chơi gửi `owner_request` → admin duyệt (hoặc đăng ký thẳng vai trò `OWNER`).

Cụm sân: chủ sân tạo ở `/chu-san/cum-san/moi` (`POST /api/venues`, trạng thái `PENDING`) → admin duyệt / từ chối kèm lý do
(ghi `venue_approval`, gửi `notification`) → bị từ chối thì chủ sân sửa (`PUT /api/venues/:id`) và cụm sân tự về `PENDING`.
Mọi thao tác ghi trên cụm sân / sân con / ảnh / doanh thu đều kiểm tra `venue.owner_id = req.user.id` (trừ admin).

Khóa tài khoản chủ sân còn đơn chưa diễn ra: lần đầu API trả `OWNER_HAS_UPCOMING_BOOKINGS`, admin xác nhận (`confirm: true`)
thì các đơn đó chuyển `CANCELLED_BY_OWNER`, nhả slot và báo cho người đặt.

---

## 5. Đặt sân: vòng đời đơn & chống đặt trùng

### 5.1 Trạng thái đơn (`booking_status`)

```mermaid
stateDiagram-v2
    [*] --> HELD: đặt sân (giữ chỗ HOLD_MINUTES)
    HELD --> PENDING_VERIFY: (dữ liệu cũ) báo đã chuyển khoản
    HELD --> CONFIRMED: SePay báo đã thanh toán / chủ sân xác nhận
    PENDING_VERIFY --> CONFIRMED: chủ sân đối soát
    HELD --> CANCELLED_EXPIRED: quá hạn giữ chỗ (job nền)
    HELD --> CANCELLED_BY_USER: người đặt hủy
    PENDING_VERIFY --> CANCELLED_BY_USER
    CONFIRMED --> CANCELLED_BY_USER: chỉ trước giờ bắt đầu
    HELD --> CANCELLED_BY_OWNER: chủ sân từ chối / mở lại slot
    PENDING_VERIFY --> CANCELLED_BY_OWNER
    CONFIRMED --> CANCELLED_BY_OWNER
    CONFIRMED --> REFUNDED: admin xử lý khiếu nại "hoàn cọc"
    CANCELLED_BY_OWNER --> REFUNDED
    CONFIRMED --> COMPLETED: mọi slot đã qua giờ kết thúc (job nền)
    COMPLETED --> [*]
```

Job nền chuyển đơn `CONFIRMED` có mọi slot đã qua giờ kết thúc sang `COMPLETED` và cộng `total_matches` cho người đặt
và người tham gia. Trạng thái có thể trễ tới 60 giây nên các màn hình vẫn suy "đã đá" từ giờ kết thúc của slot.
`IN_PROGRESS` có trong enum nhưng không dùng.

Quy tắc đã cài:

- Đặt sân bắt buộc đăng nhập; giờ bắt đầu đã qua → `SLOT_IN_PAST`. Xem chi tiết đơn (`GET /api/bookings/:code`) chỉ người
  đặt, người đã được nhận vào trận, chủ cụm sân và admin.
- Đặt định kỳ trùng lịch → `RECURRING_CONFLICT` kèm ngày trùng; gửi lại `skip_conflicts: true` để bỏ qua các ngày đó (PRD 1.4 lựa chọn B).
- Hủy (`POST /api/bookings/:code/cancel`) chỉ khi đơn ở `HELD`/`PENDING_VERIFY`/`CONFIRMED` **và chưa tới giờ bắt đầu**
  (`BOOKING_ALREADY_STARTED`). Hủy → slot chuyển `RELEASED`, bài cáp kèo của đơn bị đóng.
- Đánh giá chỉ khi đơn `CONFIRMED`/`IN_PROGRESS`/`COMPLETED`, đã qua giờ kết thúc, đúng người đặt, mỗi đơn một lần.
- Khóa sân nhanh của chủ sân là một `booking` loại `OWNER_LOCK` với slot `LOCKED` → dùng chung cơ chế chống trùng.

### 5.2 Ba lớp chống đặt trùng

1. **UI**: lịch trống lấy từ `/api/fields/:id/schedule`, slot đã giữ không bấm được.
2. **Service**: `fn_is_slot_available()` kiểm tra trước — dùng ở API kiểm tra trống (`/api/fields/:id/availability`) và
   đặt định kỳ (báo một lần mọi buổi bị trùng). Đặt sân lẻ không gọi hàm này mà dựa thẳng vào lớp 3.
3. **CSDL**: ràng buộc `no_slot_overlap` — kể cả khi hai request lọt qua lớp 2 cùng lúc, bản ghi thứ hai bị từ chối
   (`23P01` → `SLOT_TAKEN`, HTTP 409). **Không được bỏ ràng buộc này.**

Thời gian lưu dạng `TSTZRANGE` (giờ bắt đầu bao gồm, giờ kết thúc không bao gồm), dựng từ ngày + giờ theo múi giờ của CSDL.

---

## 6. Giá, đặt cọc & thanh toán

- **Giá**: `pricing.service.quoteSlot()` tra `price_rule` theo cụm sân, loại sân, loại ngày, khung giờ; áp `promotion`
  loại `FLASH_SALE` nếu đang chạy. Giá cuối và giá gốc ghi vào `price_history` cho từng slot.
  Giá luôn tính ở server — không tin giá client gửi lên (kể cả dịch vụ cộng thêm).
- **Đặt định kỳ**: một `booking` loại `RECURRING` nhiều slot + `recurring_contract`, chiết khấu theo gói.
- **Cọc**: `deposit_amount = total × venue.deposit_rate` (mặc định 30%), hoặc trả đủ nếu `pay_full`.
- **Thanh toán cọc: VietQR + webhook ngân hàng SePay** (`/api/payments/sepay`, `services/sepay.service.js`, `payment_method` + `SEPAY` V27):
  ô thanh toán hiện ngay ảnh QR (qr.sepay.vn) chuyển vào **một tài khoản của nền tảng** đã liên kết SePay (`SEPAY_BANK_*`),
  nội dung = mã đơn. SePay gọi `POST /api/payments/sepay/webhook` (header `Authorization: Apikey <SEPAY_WEBHOOK_API_KEY>`) khi
  tiền về: tìm mã `BK…` trong `code` + `content`, mỗi đơn một `payment` `SEPAY`, mỗi lần chuyển một `payment_transaction`
  (UNIQUE `provider` + `provider_txn_no` = id giao dịch SePay → gửi lại không cộng trùng). Cộng dồn: đủ cọc →
  `deposit.service.settlePaidDeposit` (payment `SUCCESS`, đơn + slot `CONFIRMED`, báo người đặt + chủ sân); thiếu → báo số tiền còn
  thiếu, QR tự đổi sang số còn lại; đơn đã hết hạn → báo người đặt gửi khiếu nại. Giao dịch không có mã đơn chỉ ghi log.
  Frontend gọi `GET /api/payments/sepay/:code` mỗi 4 giây. Chưa cấu hình `SEPAY_WEBHOOK_API_KEY` → webhook luôn bị từ chối,
  QR vẫn hiện nhưng đơn không tự xác nhận.
- Cổng checkout SePay (chuyển sang trang SePay, IPN) đã thử rồi bỏ vì không hiện được QR trên web (chặn iframe, không có API QR).
- VNPay, chuyển khoản vào tài khoản riêng từng cụm sân + trang đối soát, báo chuyển khoản thủ công **đã gỡ**. Bảng `bank_transaction`,
  giá trị enum `VNPAY`/`BANK_TRANSFER`/`WALLET` và trạng thái `PENDING_VERIFY` vẫn còn cho dữ liệu cũ.

---

## 7. Cộng đồng: cáp kèo & ghép chân lẻ

Một bảng `match_post` cho cả ba loại bài, phân biệt bằng `type`:

| `type` | Ai đăng | Gắn với | Phản hồi |
|---|---|---|---|
| `TEAM_FINDS_TEAM` | Đội trưởng | Đơn đặt sân | Đội khác gửi `join_request` → chấp nhận 1 đội thì bài `MATCHED` |
| `TEAM_FINDS_PLAYER` | Đội trưởng | Đơn đặt sân, `slots_needed` 1–10, chi phí | Người chơi `APPLY` → mỗi lần chấp nhận `slots_filled + 1`, đủ thì `MATCHED` |
| `PLAYER_FINDS_TEAM` | Người chơi lẻ | Khung giờ rảnh + khu vực | Đội trưởng `INVITE` (hết hạn 30 phút) → người chơi chấp nhận |

- Người đã được nhận vào trận nằm trong `match_participant` → trận hiện trong "Lịch của tôi" của họ.
- Hủy tham gia trước giờ đá < 1 tiếng: `fn_apply_reputation(-5)` và đẩy bài tuyển lên đầu (`bumped_at`).
- Chấp nhận / tuyển người chạy trong transaction có `FOR UPDATE` để không tuyển quá số lượng khi nhiều người bấm cùng lúc.
- Tin tìm đội của một người không được đè giờ nhau (kiểm tra trong transaction có advisory lock theo user).
- SĐT đội trưởng / người chơi chỉ lộ ra khi yêu cầu đã được chấp nhận.
- Cáp kèo: còn < 30 phút trước giờ đá không được tìm đối (`MATCH_TOO_SOON`); đội khách có lịch khác trùng giờ → `SCHEDULE_CONFLICT`.
  Chấp nhận một đội: bài `MATCHED`, các đội còn lại tự `REJECTED` và nhận thông báo.
- **Nhóm chat của trận**: mỗi đơn một `conversation` (unique `booking_id`), thêm thành viên khi chốt kèo / nhận chân lẻ, rời nhóm khi
  hủy tham gia (`repo.joinMatchChat` / `leaveMatchChat`). Tin chưa đọc tính theo `conversation_member.last_read_at`; frontend polling
  4 giây khi mở cuộc trò chuyện. Admin xem nhật ký chat khi xử lý khiếu nại.

Luồng chi tiết: [`flows.md` mục 1.5, 1.6](flows.md).

---

## 8. Thông báo & job nền

### 8.1 Thông báo

Bảng `notification` (`type`, `title`, `body`, `ref_kind`/`ref_id`, `is_read`). Backend ghi khi có sự kiện
(xin tham gia, được nhận/từ chối, lời mời, hết hạn, duyệt/từ chối cụm sân…). Frontend đọc qua `/api/notifications`;
chuông trên Navbar gọi lại mỗi 60 giây. Chưa có push / email / WebSocket cho thông báo.

### 8.2 Job nền

Trong `server.js`, một `setInterval` 60 giây (tiến trình API) chạy lần lượt:

| Bước | Tác dụng |
|---|---|
| `fn_release_expired_holds()` | Đơn `HELD` quá hạn → `CANCELLED_EXPIRED`, slot `RELEASED` |
| Đóng bài của đơn đã hủy | `match_post` `OPEN` gắn với đơn `CANCELLED_*` → `CLOSED` |
| `expireFreelance()` | Bài quá giờ bóng lăn → `EXPIRED` (báo đội trưởng nếu chưa đủ người); lời mời quá 30 phút → `EXPIRED` (báo đội trưởng); yêu cầu còn chờ trên bài đã đóng → `EXPIRED` |
| `completeFinishedBookings()` | Đơn `CONFIRMED` đã qua giờ kết thúc mọi slot → `COMPLETED`, cộng `total_matches` |
| `flagRefundsForCancelled()` | Tiền chuyển thiếu (`bank_transaction` `PARTIAL`) của đơn đã hết hạn / bị hủy → `REFUND_PENDING`, báo người đặt |
| `restockCancelled()` | Món đặt kèm của đơn hết hạn / hủy → trả lại kho (một lần) |
| `remindOverdue()` | Phần chia tiền quá hạn nhắc → nhắc thành viên + báo đội trưởng |
| `refundCancelledWalletPayments()` | Đơn hết hạn / hủy đã trừ ví hội viên → hoàn lại ví |
| `remindMatchResults()` | Trận cáp kèo kết thúc 10 phút chưa có tỷ số → nhắc chủ sân nhập; trận giải chưa có kết quả → nhắc BTC |

Ngoài vòng 60 giây: xuất báo cáo admin > 366 ngày chạy nền (`setImmediate` sau khi trả 202) rồi gửi file CSV qua email.

### 8.3 Khiếu nại

`NEW` → (admin mở hồ sơ) `IN_PROGRESS` → (thiếu bằng chứng) `NEED_INFO`, hẹn 24h (`info_due_at`) → người gửi trả lời
(`complaint_message`, `complaint_evidence`) → `IN_PROGRESS` → phán quyết `RESOLVED`: hoàn cọc hoặc không, kèm tùy chọn trừ
điểm uy tín / khóa tài khoản người liên quan tới đơn. Quá hạn 24h không tự đóng: danh sách đánh dấu `info_overdue` để admin quyết.

Hệ quả thiết kế: trạng thái "hết hạn" có thể trễ tới 60 giây, nên **mọi chỗ ghi phải tự kiểm tra hạn** (ví dụ chấp nhận
lời mời kiểm tra `expires_at`, hủy đơn kiểm tra giờ bắt đầu), không chỉ dựa vào job. Nếu sau này chạy nhiều instance
API thì job sẽ chạy song song ở mỗi instance — các câu lệnh hiện đều idempotent, nhưng thông báo hết hạn có thể bị gửi trùng.

---

## 9. Frontend

```
frontend/src/
├── main.jsx / App.jsx      Router, khung chung, guard theo vai trò
├── context/AppContext.jsx  State toàn cục: phiên đăng nhập, vai trò, sân, đơn, cộng đồng, admin
├── services/api.js         apiClient (token, refresh, lỗi chuẩn ApiError)
├── services/mappers.js     Map dữ liệu API (snake_case, enum) → dạng UI
├── pages/                  Mỗi route một file
└── components/             Navbar, NotificationBell, PaymentPanel, ui/ (PageLayout, Card, Modal, ChoiceChips), admin/
```

- **Luồng dữ liệu**: trang → hàm trong `AppContext` hoặc `apiClient` → `mappers.js` → render. Component không tự `fetch`.
- **Trang hay Modal**: chức năng chính (xem, đặt, đăng tin, quản lý) là trang riêng có route và `PageLayout`;
  thao tác ngắn (đăng nhập, xác nhận, nhập lý do, xin tham gia) là `Modal`.
- **Vai trò → giao diện**: `/` hiển thị trang chủ / dashboard chủ sân / tổng quan admin theo `user.role`.
  Route riêng: người chơi (`/san/:id`, `/lich-cua-toi`, `/giao-huu`, `/ghep-chan-le`…), chủ sân (`/chu-san/*`),
  admin (`/quan-tri/*`). Danh sách đầy đủ: bảng Routes trong [`CLAUDE.md`](../../CLAUDE.md).
- **Đồng bộ nhiều tab**: token chung `localStorage`; tab khác đổi tài khoản → sự kiện `storage` → tải lại hồ sơ.
- **Thời gian**: các trạng thái phụ thuộc giờ (ẩn nút hủy, chuyển tab Sắp đá → Đã đá, đếm ngược lời mời) tự cập nhật
  mỗi 30 giây trên trang, nhưng backend vẫn là nơi quyết định.
- **Responsive**: mobile-first; dưới `lg` dùng thanh tab đáy, header phải vừa màn 360px.

---

## 10. Quy tắc thiết kế bắt buộc

1. **CSDL là chốt chặn cuối.** Quy tắc nghiệp vụ quan trọng (không đặt trùng, giới hạn số lượng, điểm 0–100…) đặt thành
   ràng buộc / hàm ở DB nếu làm được; code ứng dụng chỉ là lớp kiểm tra sớm để báo lỗi dễ hiểu.
2. **Không tin client.** Giá, tiền cọc, quyền sở hữu, trạng thái, mốc thời gian đều tính / kiểm tra lại ở server.
3. **Ghi nhiều bảng = một transaction.** Chỗ nhiều người cùng tranh một tài nguyên phải khóa dòng (`FOR UPDATE`) hoặc
   dựa vào ràng buộc DB.
4. **Thời hạn kiểm tra tại chỗ.** Job nền chỉ dọn dẹp; thao tác ghi tự kiểm tra hạn của chính nó.
5. **Lỗi chuẩn hóa.** Ném `AppError` với mã trong `lib/errors.js`; frontend dựa vào `code`, không dựa vào `message`.
6. **Đổi API = đổi `docs/openapi.yaml`** trong cùng commit (skill [`api-design`](../../.claude/skills/api-design/SKILL.md)).
7. **Đổi schema = migration mới**, không sửa migration cũ.
8. **Không đưa bí mật vào repo**: `.env`, mật khẩu, tài khoản admin mặc định không nằm trong code hay migration.
9. **Thông tin cá nhân lộ theo nhu cầu**: SĐT chỉ hiện khi hai bên đã kết nối (yêu cầu được chấp nhận).
10. **Phân quyền ở backend.** Ẩn nút ở frontend không thay thế `requireRole` / kiểm tra sở hữu.

---

## 11. Nợ kỹ thuật & điểm lệch đã biết

| Vấn đề | Ảnh hưởng | Hướng xử lý |
|---|---|---|
| Thời gian giữ chỗ thực tế là `HOLD_MINUTES` (mặc định **15 phút**), PRD và một số comment ghi 5 phút | Tài liệu và hành vi lệch nhau | Chốt một con số, cập nhật PRD / comment |
| `checkPermission()` cho qua route không có trong bảng | Dễ quên bảo vệ route mới | Route mới luôn gắn `requireAuthenticated` / `requireRole` trực tiếp |
| Job nền chạy trong tiến trình API | Nhiều instance → chạy lặp, thông báo trùng | Tách worker riêng hoặc dùng advisory lock khi scale |
| Chỉ thu tiền cọc qua SePay | Gói hội viên, lệ phí giải chưa thu được online (nút mua / đăng ký giải có phí đang khóa) | Tạo đơn SePay cho `wallet_topup` / `tournament_team` theo khuôn `sepay.routes.js` |
| Thông báo dựa vào polling 60 giây | Trễ tới 1 phút | WebSocket / SSE khi cần real-time thật |
| Hoàn tiền (`REFUND_PENDING`) chỉ là đánh dấu, chủ sân / admin tự chuyển trả ngoài hệ thống | Không có bằng chứng hoàn tiền trong hệ thống | Lưu mã giao dịch hoàn / tích hợp API chi hộ |
| `csdl/db/all_in_one.sql` chỉ tới V10 | Dựng DB bằng file này sẽ thiếu V11–V16 | Dùng `npm run migrate`, hoặc cập nhật lại file |
| Đăng ký SĐT không có OTP (chưa tích hợp SMS) | Tài khoản SĐT ở trạng thái `PENDING_VERIFY`, không xác minh được số | Tích hợp nhà cung cấp SMS, dùng lại `otp.service` |
| Google OAuth chế độ mock (dev) cho đăng nhập bằng email bất kỳ, kể cả email admin | Chỉ chạy khi `NODE_ENV !== 'production'` và chưa cấu hình `GOOGLE_OAUTH_*` | Không bật mock ở môi trường dùng chung |
| Chat dùng polling (4 giây khi mở, 60 giây cho số chưa đọc) | Trễ vài giây, tốn request | WebSocket / SSE |
| Bằng chứng khiếu nại chỉ nhận link (chưa upload file) | Người dùng phải tự tải ảnh lên nơi khác | Dùng `cloudinary.service` để upload |

---

## 12. Chức năng bổ sung theo PRD

PRD bổ sung 2.1.8, 2.1.9, 2.2.5, 2.2.6, 2.3.4 — đã cài. Luồng: [`flows.md`](flows.md) mục 1.8, 1.9, 2.5, 2.6, 3.4.

### 12.1 Thu tiền

Gạch nợ chuyển khoản tự động (webhook VietQR, nội dung `QUY` / `NAP` / `GIAI` / `SANBONG`) đã gỡ cùng VietQR. Hiện tại:
tiền cọc thu qua SePay (mục 6); chia tiền trận do thành viên chuyển thẳng cho đội trưởng, đội trưởng bấm "Đã nhận";
mua gói hội viên và lệ phí giải chưa có cách thu online.

### 12.2 Dữ liệu & quy tắc

| Chức năng | Module / service | Bảng (migration) | Quy tắc chính |
|---|---|---|---|
| POS & kho (2.2.5) | `owner/pos.routes.js`, `services/inventory.service.js` | `venue_service.category/stock`, `booking_service.quantity`, `service_order(_item)`, `booking.checked_out_at` (V20), `booking.services_restocked` (V24) | Trừ kho bằng `UPDATE … WHERE stock >= n` + `ck_service_stock`; hết hàng ẩn khỏi trang đặt sân. Đơn hết hạn / hủy → job trả kho một lần. Check-out đơn có đồ `RENTAL` bắt buộc xác nhận đã trả đồ (`RENTAL_CHECK_REQUIRED`), trả đủ thì cộng lại kho. Báo cáo có `service_revenue` tách tiền sân |
| Sổ quỹ (2.1.8) | `teams/split.routes.js`, `services/split.service.js` | `split_bill`, `split_bill_share`, `team.fund_balance`, `team_fund_log` (V21) | Đội trưởng = người đặt. Chia đều / tài trợ % làm tròn **lên** hàng nghìn, tiền thừa vào quỹ đội khi cả đội đóng đủ. Thành viên định danh bằng SĐT (đội phủi không cần tài khoản). Quá hạn nhắc → job nhắc mỗi người một lần + báo đội trưởng; đội trưởng "Đã nhận", "Đóng thay", "Đổi người" |
| Ví hội viên (2.2.6) | `wallets/wallet.routes.js`, `services/wallet.service.js` | `membership_plan`, `member_wallet`, `wallet_txn`, `wallet_topup`, `payment_method` + `WALLET` (V22) | Một ví / người / cụm sân, `ck_wallet_balance >= 0`. Mua gói / trả cọc bằng ví tạm gỡ (chỉ thanh toán SePay); job vẫn hoàn ví cho đơn cũ đã trả bằng ví bị hết hạn / hủy. Khóa chủ sân → ví còn tiền `FROZEN`, báo admin (`/quan-tri/vi-hoi-vien`) |
| Elo (2.1.9) | `leagues/league.routes.js`, `services/tournament.service.js` | `team.elo/wins/draws/losses/win_streak`, `match_result` (V23) | Chỉ trận cáp kèo đã `MATCHED`, đã qua giờ kết thúc. Chủ sân nơi diễn ra trận (hoặc admin) nhập tỷ số trong 14 ngày → chốt ngay `CONFIRMED`, tính Elo (K = 32 × (0,5 + 0,5 × uy tín/100)), lưu `recorded_by` (V26). Trạng thái `PENDING` / `DISPUTED` / `VOID` chỉ còn ở dữ liệu cũ khi đội trưởng tự nhập |
| Giải đấu (2.1.9) | như trên | `tournament`, `tournament_team`, `tournament_match`, `team.tournament_banned_until` (V23) | Chủ sân là BTC. Vòng tròn > 5 đội chia bảng tối đa 4; loại trực tiếp bốc thăm, gọi lại để xếp vòng sau. Mỗi trận là `booking` `OWNER_LOCK` → dùng chung `no_slot_overlap`, trùng thì lùi 30 phút. Bỏ trận: 0-3, −20 uy tín **đội**, cấm 30 ngày, nhả slot |

Job nền 60 giây (mục 8.2) có thêm: `restockCancelled`, `remindOverdue`, `refundCancelledWalletPayments`, `remindMatchResults`.

### 12.3 Còn thiếu / giả định

| Vấn đề | Ghi chú |
|---|---|
| Thông báo chỉ in-app | PRD nhắc Push / Zalo OA cho nhắc nợ, xác nhận cọc |
| Mã Check-in QR | Chưa có nội dung QR ký HMAC + màn quét của chủ sân |
| "Đã hoàn tiền" (giao dịch, ví) chỉ là đánh dấu | Tiền trả ngoài hệ thống |
| Webhook chỉ định dạng SePay; tiền quỹ đội về tài khoản đội trưởng nên chỉ tự khớp khi tài khoản đó cũng gửi webhook | Môi trường dev dùng API giả lập |
| Ví & quỹ là giữ tiền người dùng | Cần xem quy định trung gian thanh toán trước khi chạy thật |
| Giải vòng tròn nhiều bảng chưa có vòng loại trực tiếp sau vòng bảng | BTC tạo giải loại trực tiếp mới cho các đội đi tiếp |
| Gia hạn khi chuyển thiếu = `max(hạn giữ chỗ, bây giờ + 5 phút)` | PRD ghi 5 phút, giữ chỗ mặc định 15 phút |

### 12.4 Trợ lý chat (RAG)

Module `backend/src/modules/chatbot/`: `chatbot.routes.js` (vòng chat), `chatbot.tools.js` (công cụ cho model), `chatbot.repository.js` (SQL kho tri thức), `chatbot.sitemap.js` (bản sao route frontend), `knowledge.routes.js` (CRUD admin). Gọi model qua `services/deepseek.service.js` (API tương thích OpenAI, biến `DEEPSEEK_API_KEY`).

| Bước | Cách làm |
|---|---|
| Kho tri thức | Bảng `kb_article` (V28, seed V29): mỗi bài một chủ đề, `audience` ⊂ {GUEST, PLAYER, OWNER, ADMIN}, `route` trỏ trang frontend, `keywords` là cách hỏi khác. Admin sửa tại `/quan-tri/tro-ly` |
| Truy xuất | Full-text `simple` trên văn bản đã bỏ dấu (`f_unaccent`, cột `search_vector` GENERATED) + thưởng cụm 2 âm tiết liền nhau (`<->`) + `word_similarity` trigram trên tiêu đề/từ khóa. Lọc `audience && [vai trò]`. Ngưỡng tuyệt đối 0,6 và tương đối 50% điểm bài đầu vì `ts_rank` không có IDF. Không dùng embedding: DeepSeek không có API embedding, image `postgres:16` không có pgvector |
| Sinh câu trả lời | Mỗi lượt: truy xuất theo câu hỏi cuối (câu ngắn ghép thêm câu hỏi trước) → prompt hệ thống (vai trò + sitemap) + tài liệu tham khảo → model, tối đa 4 vòng gọi công cụ. `search_knowledge` cho mọi vai trò; `search_venues`, `get_venue_detail`, `find_free_slots` chỉ cho GUEST/PLAYER |
| Theo cấu trúc web | Link markdown trong câu trả lời được lọc theo sitemap của vai trò; link tới trang không có / của vai trò khác bị bỏ, chỉ giữ chữ. Đổi route ở `App.jsx` phải sửa `chatbot.sitemap.js` |
| Giới hạn | Không lưu hội thoại phía server; 20 lượt / 10 phút / user hoặc IP (Redis, dự phòng bộ nhớ). Trợ lý không tạo đơn, không đọc dữ liệu tài khoản |
