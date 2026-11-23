# CLAUDE.md - SanBong.id.vn: Nền tảng đặt sân bóng đá trực tuyến

## Tóm tắt dự án

**Hệ thống đặt sân bóng đá trực tuyến** - cho phép xem lịch, đặt cọc, ghép đôi giao hữu, ghép chân lẻ.
Kiến trúc 3 lớp độc lập: Frontend (React), Backend (Express), Database (PostgreSQL).

**Ngôn ngữ:** Toàn bộ dự án viết bằng **JavaScript** (frontend `.jsx`/`.js`, backend CommonJS `.js`). Không dùng TypeScript.

**Trạng thái:**
- Phase 0 (MVP): đã có phần lớn màn hình người chơi, chủ sân, admin (xem bảng Wireframes bên dưới)
- Hiện tại: Đang làm feature auth phone register/login (feat/auth-phone-register-login)

## Tech Stack

| Phần | Công nghệ |
|---|---|
| Frontend | React 19 + Vite 8 + React Router v7 + Tailwind CSS 4 + lucide-react |
| Backend | Node.js ≥ 20 + Express 4 + `pg` (no ORM) + JWT + Redis + Passport (Google OAuth) + Nodemailer |
| Database | PostgreSQL 16 (Docker) + Migration system |
| Docs | OpenAPI 3.0 (Swagger UI) |

**Ports:**
- Frontend: `http://localhost:5173` (Vite proxy `/api`, `/health` → backend)
- Backend: `http://localhost:3000`
- Database: `localhost:5433` (Adminer: `http://localhost:8081`)

## Cấu trúc dự án

```
├── frontend/                    React app (Vite, JavaScript)
│   ├── src/
│   │   ├── main.jsx            Entry: BrowserRouter + App
│   │   ├── App.jsx             Khung chung (Navbar, toast, Footer, AuthModal) + bảng route
│   │   ├── pages/              Mỗi route một trang (HomePage, VenueDetailPage, ...)
│   │   ├── components/         Navbar, Footer, AuthModal, PaymentPanel, PitchCard, các section trang chủ
│   │   │   └── ui/             PageLayout (+ Card), Modal - khung dùng chung
│   │   ├── context/AppContext.jsx  State toàn cục: auth, role, dữ liệu sân/đơn, gọi API
│   │   ├── services/           api.js (apiClient, tokenStore), mappers.js (map dữ liệu API → UI)
│   │   ├── assets/images/      Ảnh tĩnh
│   │   └── index.css           Tailwind + style nền
│   └── package.json
│
├── backend/                     REST API (Express, CommonJS)
│   ├── src/
│   │   ├── server.js           App init, CORS, port listener
│   │   ├── db.js               PostgreSQL pool
│   │   ├── redis.js            Redis client
│   │   ├── db/migrate.js       Chạy/kiểm tra migration
│   │   ├── lib/errors.js       Danh sách error code
│   │   ├── middlewares/        index.js (log, 404, error handler), auth.js, rbac.js
│   │   ├── services/
│   │   ├── modules/            admin, auth, bookings, community, complaints, owner,
│   │   │                       payments, pricing, profile, teams, venues (*.routes.js, *.repository.js)
│   │   └── routes/index.js     /health + gắn router của các module
│   ├── .env.example
│   └── package.json
│
├── csdl/                        Database
│   ├── docker-compose.yml       PostgreSQL 16 + Redis 7 + Adminer
│   └── db/
│       ├── migration/           V01..V24 (SQL)
│       └── all_in_one.sql
│
├── docs/
│   └── openapi.yaml            API specification (OpenAPI 3.0)
│
└── README.md                    Setup guide + API endpoints
```

## Chạy dự án (3 terminal)

```bash
# 1) Database
cd csdl
docker compose up -d              # PostgreSQL + Redis + Adminer http://localhost:8081

# 2) Backend
cd backend
cp .env.example .env              # Config DATABASE_URL, JWT, Google OAuth...
npm install
npm run migrate                    # lần đầu / khi có migration mới
npm run create-admin -- <email> <mật_khẩu>   # tạo / đặt lại tài khoản admin (chỉ chạy tay, không đưa vào migration)
npm run dev                        # http://localhost:3000

# 3) Frontend
cd frontend
npm install
npm run dev                        # http://localhost:5173
```

**Frontend cần backend chạy:** Không còn demo data. Nếu backend tắt, trang chủ hiển thị trạng thái lỗi "Không tải được danh sách sân" kèm nút Thử lại.

## Quy ước lập trình

### Git Flow

**Branches:**
- `main` - mã ổn định, luôn chạy được
- `dev` - tích hợp hàng ngày  
- `feature/<mã-UC>-<mô-tả>` - ví dụ `feature/UC04-booking-realtime`
- `fix/<mô-tả>` - ví dụ `fix/redis-lock-expire`

**Commit message:**
```
<loại>(<phạm-vi>): <mô-tả ngắn>

[body nếu cần]
```

Ví dụ:
- `feat(frontend): thêm màn hình WF-03 chi tiết sân`
- `fix(backend): lỗi kiểm tra slot trống`
- `docs(api): cập nhật OpenAPI endpoint mới`

Phạm vi thường dùng: `frontend`, `backend`, `csdl`, `docs`.

### Thêm màn hình mới (frontend)

1. Tạo file trong `frontend/src/pages/<TênPage>.jsx`
2. Bọc nội dung bằng `PageLayout` (`components/ui/PageLayout.jsx`) để giữ cùng độ rộng, header, nút "Về trang chủ"; khối nội dung dùng `Card`
3. Khai báo route trong `frontend/src/App.jsx` (trang cần đăng nhập thì bọc `RequireAuth`)
4. Gọi dữ liệu qua `AppContext` / `frontend/src/services/`
5. Điều hướng bằng `useNavigate` / `Link` của React Router, không dùng cờ `isXxxOpen` trong context

### Trang hay Modal?

- **Chức năng chính** (xem, đặt, quản lý) → **trang riêng** có route, dùng `PageLayout`
- **Thao tác ngắn** (đăng nhập, xác nhận, form vài trường) → `Modal` (`components/ui/Modal.jsx`), kích thước `sm` / `md` / `lg`. Không tự viết overlay `fixed inset-0` riêng.

### API Error Response

Mọi lỗi có cấu trúc chung (định nghĩa tại `backend/src/middlewares/index.js`):

```json
{
  "error": {
    "code": "ERROR_CODE",           // Fixable code for frontend (not i18n-dependent)
    "message": "Mô tả lỗi",          // Message for logging
    "details": { /* extra */ },      // Error context
    "requestId": "uuid",             // Header: X-Request-Id
    "timestamp": "ISO-8601"
  }
}
```

Danh sách error code: `backend/src/lib/errors.js`

### API Documentation

**Chạy backend, mở:**
- Swagger UI (interactive): `http://localhost:3000/docs`
- OpenAPI spec: `http://localhost:3000/openapi.yaml` (import Postman/Insomnia)
- Source file: `docs/openapi.yaml`

**Quy ước:** Mỗi khi sửa API, cập nhật `docs/openapi.yaml` để giữ sync.

## Routes & Wireframes (Phase 0)

| Mã | Màn hình | Route | File | Trạng thái |
|---|---|---|---|---|
| WF-01 | Trang chủ | `/` (role player) | `pages/HomePage.jsx` | ✅ Có |
| WF-02 | Tìm kiếm & bộ lọc | Section `#search-pitches` trên trang chủ | `HomePage` + `SearchBar` | 🟡 Chưa có route `/tim-san` riêng |
| WF-03 | Chi tiết sân & lịch trống | `/san/:id` | `pages/VenueDetailPage.jsx` | ✅ Có |
| WF-04 | Thanh toán tiền cọc (VietQR + webhook ngân hàng SePay, đơn tự xác nhận) | Hiển thị ngay sau khi giữ chỗ | `components/PaymentPanel.jsx` (API `/api/payments/sepay`) | ✅ Có |
| — | Tin nhắn (nhóm chat trận đã chốt kèo / ghép chân lẻ) | `/tin-nhan`, `/tin-nhan/:id` (cần đăng nhập) | `pages/MessagesPage.jsx` | ✅ Có |
| — | Khiếu nại của tôi (theo dõi, bổ sung thông tin) | `/khieu-nai` (cần đăng nhập) | `pages/ComplaintsPage.jsx` | ✅ Có |
| WF-05 | Đặt sân định kỳ | `/dat-dinh-ky` | `pages/SubscriptionPage.jsx` | ✅ Có |
| WF-06 | Lịch đã đặt & đánh giá | `/lich-cua-toi` (cần đăng nhập) | `pages/MyBookingsPage.jsx` | ✅ Tab Sắp đá / Đã đá / Đã hủy, đánh giá sau trận |
| WF-07 | Cáp kèo & tìm đối giao hữu | `/giao-huu`, đăng tin `/giao-huu/dang-tin` | `pages/MatchmakingPage.jsx`, `pages/ChallengePostPage.jsx` | ✅ Có |
| — | Kèo gấp giá hời (Flash Sale) | `/keo-gap` | `pages/FlashSalePage.jsx` | ✅ Có |
| WF-08 | Ghép chân lẻ | `/ghep-chan-le?tab=doi-tim-nguoi\|nguoi-tim-doi\|cua-toi`, đăng tuyển `/ghep-chan-le/dang-tuyen`, tìm đội `/ghep-chan-le/dang-tin` | `pages/FreelancePage.jsx`, `pages/RecruitPostPage.jsx`, `pages/PlayerPostPage.jsx` (API `/api/freelance`) | ✅ Có |
| WF-09 | Hồ sơ & điểm uy tín | `/ho-so` (cần đăng nhập) | `pages/ProfilePage.jsx` | ✅ Có |
| WF-10 | Dashboard chủ sân | `/` khi role = owner | `pages/OwnerDashboard.jsx` | ✅ Có |
| — | Chủ sân: đơn đặt / lịch sân / bảng giá / cụm sân (đăng ký, sửa, gửi duyệt lại) | `/chu-san/don-dat`, `/chu-san/lich`, `/chu-san/bang-gia`, `/chu-san/cum-san`, `/chu-san/cum-san/moi`, `/chu-san/cum-san/:id` | `pages/Owner*Page.jsx`, `pages/OwnerVenueFormPage.jsx` | ✅ Có |
| — | Sổ quỹ & chia tiền trận | `/chia-tien/:code` (cần đăng nhập) | `pages/SplitBillPage.jsx` (API `/api/splits`) | ✅ Có |
| — | Bảng xếp hạng Elo & giải đấu | `/bang-xep-hang?tab=giai-dau`, `/giai-dau/:id` | `pages/LeaderboardPage.jsx`, `pages/TournamentDetailPage.jsx` (API `/api/leaderboard`, `/api/tournaments`) | ✅ Có |
| — | Chủ sân: căng-tin POS & kho / gói thành viên / giải đấu | `/chu-san/dich-vu`, `/chu-san/goi-thanh-vien`, `/chu-san/giai-dau` | `pages/OwnerServicesPage.jsx`, `pages/OwnerMembershipPage.jsx`, `pages/OwnerTournamentsPage.jsx` | ✅ Có |
| — | Admin: ví hội viên đóng băng | `/quan-tri/vi-hoi-vien` | `pages/AdminWalletsPage.jsx` | ✅ Có |
| — | Trợ lý chat (DeepSeek + RAG kho tri thức, theo vai trò; link ca trống `/san/:id?ngay=&san=&gio=`) | Bong bóng nổi mọi trang | `components/ChatbotWidget.jsx` (API `/api/chatbot/messages`) | ✅ Có |
| — | Admin: kho tri thức trợ lý (RAG) | `/quan-tri/tro-ly` | `pages/AdminKnowledgePage.jsx` (API `/api/admin/knowledge`) | ✅ Có |
| — | Đăng nhập Google (nhận token từ backend) | `/auth/google-callback` | `pages/GoogleCallbackPage.jsx` | ✅ Có |
| — | Admin: tổng quan / người dùng / duyệt chủ sân / cụm sân / khiếu nại / báo cáo | `/` khi role = admin, `/quan-tri/nguoi-dung`, `/quan-tri/chu-san`, `/quan-tri/cum-san`, `/quan-tri/khieu-nai`, `/quan-tri/khieu-nai/:id`, `/quan-tri/bao-cao` | `pages/AdminDashboard.jsx`, `pages/Admin*Page.jsx` | ✅ Có |

Route `/` hiển thị theo vai trò của tài khoản (`role` trong `AppContext` = `user.role`). Ba vai trò tách biệt hoàn toàn: không có menu chuyển góc nhìn, trang của vai trò khác bị chặn (`RequireOwner`, `RequireAdmin` trong `App.jsx`).

## Frontend Design System

**Styling:** Tailwind CSS 4 (class utility trực tiếp trong JSX), giao diện tối (nền `#0b130e`, card `slate-900`, viền `slate-800`).
- Màu nhấn theo vai trò: **emerald** (người chơi), **amber** (chủ sân), **cyan** (admin) - truyền qua prop `tone` của `PageLayout`
- Font: Plus Jakarta Sans (khai báo trong `index.css`)

**Mobile-first (bắt buộc):**
- Viết class cho mobile trước, mở rộng bằng `sm:` / `lg:` (ví dụ `grid-cols-1 sm:grid-cols-2`)
- Dưới `lg`: menu ngang ẩn, dùng **thanh tab đáy** trong `Navbar.jsx`; `App.jsx` chừa `pb-16` cho thanh này
- Modal trên mobile hiển thị dạng bottom sheet

**Component dùng chung:**
- `PageLayout`, `Card` - khung trang + khối nội dung (`components/ui/PageLayout.jsx`)
- `Modal` - hộp thoại (`components/ui/Modal.jsx`), có Esc / bấm nền để đóng
- `PitchCard` - thẻ sân
- `PaymentPanel` - mã VietQR thanh toán cọc, tự cập nhật khi SePay báo tiền về (API `/api/payments/sepay`)

## Quy ước khác

### Database Migrations

- Backend khi khởi động chỉ **kiểm tra** schema khớp migration; nếu lệch phải chạy `npm run migrate` (trong `backend/`) rồi khởi động lại. Kiểm tra tay: `npm run migrate:validate`. Code: `backend/src/db/migrate.js`
- File: `csdl/db/migration/VXX__description.sql`
- Không xóa/sửa migration cũ, chỉ thêm migration mới

### Environment Variables

**Backend** (`backend/.env` từ `.env.example`), các biến chính:
```
DATABASE_URL=postgresql://sanbong:sanbong123@localhost:5433/sanbong
PORT=3000
CORS_ORIGIN=http://localhost:5173
JWT_ACCESS_SECRET=...  JWT_REFRESH_SECRET=...
GOOGLE_OAUTH_CLIENT_ID=...  GOOGLE_OAUTH_CLIENT_SECRET=...
FRONTEND_URL=http://localhost:5173
```

**Frontend** (`frontend/.env`): `VITE_API_URL` để trống khi dev (dùng Vite proxy), điền URL backend khi deploy.

## Preference Claude

1. **Ngôn ngữ:** Chỉ viết JavaScript (`.js`/`.jsx`), không thêm TypeScript
2. **Linting & Format:** Dự án chưa có ESLint/Prettier config; code hiện theo style Prettier (single quote, printWidth 120, trailing comma)
3. **Commit Style:** Luôn tuân thủ format `<loại>(<phạm-vi>): <mô-tả>`
4. **Error Handling:** Dùng cấu trúc lỗi chung từ `backend/src/middlewares/`
5. **Component Organization:** Không tạo abstraction không cần thiết; 3 dòng giống nhau là OK
6. **Comments:** Chỉ viết comment nếu lý do không rõ ràng (WHY, không phải WHAT)
7. **Testing:** Khi có test suite, chạy trước khi commit
8. **API Documentation:** Cập nhật `docs/openapi.yaml` ngay khi thay đổi endpoint
9. **UI Testing:** Trước khi báo xong, test chính UI qua browser (không chỉ build)
10. **Mobile-First Design:** Luôn thiết kế từ mobile trước, sau đó scale up
11. **Giao diện đồng nhất:** Màn hình mới dùng `PageLayout`/`Modal` dùng chung, không tự đặt độ rộng riêng

## Skills

Skill của dự án nằm trong `.claude/skills/` (Claude Code tự nạp; agent khác đọc qua `AGENTS.md`).

| Skill | Dùng khi |
|---|---|
| `api-design` | Thêm/sửa endpoint REST, status code, phân trang, lỗi API |
| `database-migrations` | Thay đổi schema/seed, viết migration `VXX__*.sql` mới |
| `frontend-design` | Dựng màn hình mới / làm lại giao diện (giữ design system ở trên) |

## Quick Links

- **Thiết kế hệ thống (kiến trúc, CSDL, phân quyền, job nền, quy tắc thiết kế):** `docs/design/system-design.md` — đọc trước khi thêm module / bảng / vai trò
- **Luồng nghiệp vụ (từ PRD):** `docs/design/flows.md`
- **API Docs (interactive):** `http://localhost:3000/docs` (khi backend chạy)
- **OpenAPI Spec:** `docs/openapi.yaml`
- **Error Codes:** `backend/src/lib/errors.js`
- **Routes frontend:** `frontend/src/App.jsx`
- **Layout dùng chung:** `frontend/src/components/ui/`
- **Endpoints:** Xem `README.md` phần "Endpoint"
