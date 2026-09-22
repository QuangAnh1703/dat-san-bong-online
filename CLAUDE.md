# CLAUDE.md - SanBong.vn: Nền tảng đặt sân bóng đá trực tuyến

## Tóm tắt dự án

**Hệ thống đặt sân bóng đá trực tuyến** - cho phép xem lịch, đặt cọc, ghép đôi giao hữu, ghép chân lẻ.
Kiến trúc 3 lớp độc lập: Frontend (React), Backend (Express), Database (PostgreSQL).

**Trạng thái:** 
- Phase 0 (MVP): WF-01 hoàn thành, WF-02 → WF-10 chưa làm
- Hiện tại: Đang làm feature auth phone register/login (feat/auth-phone-register-login)

## Tech Stack

| Phần | Công nghệ |
|---|---|
| Frontend | React 18 + Vite + React Router v6 |
| Backend | Node.js + Express + `pg` (no ORM) + JWT |
| Database | PostgreSQL 16 (Docker) + Migration system |
| Docs | OpenAPI 3.0 (Swagger UI) |

**Ports:**
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Database: `localhost:5433` (Adminer: `http://localhost:8081`)

## Cấu trúc dự án

```
├── frontend/                    React app (Vite)
│   ├── src/
│   │   ├── components/         Header, Footer, AppLayout, UI components
│   │   ├── features/           Screens tương ứng wireframes (WF-xx)
│   │   ├── pages/              ComingSoonPage, NotFoundPage
│   │   ├── services/           api.js, venues.js, ...
│   │   ├── lib/                format.js, demoData.js
│   │   ├── styles/global.css   Color palette + component shared
│   │   └── router.jsx          Route definitions
│   └── package.json
│
├── backend/                     REST API (Express)
│   ├── src/
│   │   ├── server.js           App init, CORS, port listener
│   │   ├── db.js               PostgreSQL pool
│   │   ├── middlewares/        Logging, 404, error handler
│   │   └── routes/
│   │       ├── index.js        /health, /api/districts + attach sub-routers
│   │       ├── venues.js       /api/venues
│   │       ├── fields.js       /api/fields
│   │       └── bookings.js     /api/bookings
│   ├── .env.example
│   └── package.json
│
├── csdl/                        Database
│   ├── docker-compose.yml       PostgreSQL 16
│   ├── migrations/              V01..V10 (SQL)
│   └── seed/                    Sample data
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
docker compose up -d              # PostgreSQL + Adminer http://localhost:8081

# 2) Backend
cd backend
cp .env.example .env              # Config DATABASE_URL
npm install
npm run dev                        # http://localhost:3000

# 3) Frontend
cd frontend
npm install
npm run dev                        # http://localhost:5173
```

**Frontend fallback:** Nếu backend không chạy, giao diện dùng demo data từ `frontend/src/lib/demoData.js` + hiển thị banner cảnh báo.

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

### Thêm màn hình mới

1. Tạo thư mục trong `frontend/src/features/<tên-feature>/`
2. Khai báo route trong `frontend/src/router.jsx`
3. Gọi dữ liệu qua `frontend/src/services/`
4. **Không sửa:** `frontend/src/App.jsx`, `global.css` (chỉ extend, không thay đổi design chung)

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

## Wireframes & Progress (Phase 0)

| Mã | Màn hình | Route | Tên file | Trạng thái |
|---|---|---|---|---|
| WF-01 | Trang chủ | `/` | HomePage | ✅ Hoàn thành |
| WF-02 | Kết quả tìm kiếm & bộ lọc | `/tim-san` | SearchPage | ⏳ Chưa làm |
| WF-03 | Chi tiết sân & sơ đồ lịch realtime | `/san/:id` | VenueDetailPage | ⏳ Chưa làm |
| WF-04 | Xác nhận & thanh toán tiền cọc | `/thanh-toan/:code` | PaymentPage | ⏳ Chưa làm |
| WF-05 | Đặt sân định kỳ | `/dat-dinh-ky` | SubscriptionPage | ⏳ Chưa làm |
| WF-06 | Quản lý lịch đã đặt & đánh giá | `/lich-cua-toi` | MyBookingsPage | ⏳ Chưa làm |
| WF-07 | Tìm đội giao hữu | `/giao-huu` | FindTeamPage | ⏳ Chưa làm |
| WF-08 | Ghép chân lẻ | `/ghep-chan-le` | MatchmakingPage | ⏳ Chưa làm |
| WF-09 | Hộ sơ & điểm uy tín | `/ho-so` | ProfilePage | ⏳ Chưa làm |
| WF-10 | Dashboard chủ sân | `/chu-san` | OwnerDashboard | ⏳ Chưa làm |

## Frontend Design System

**Color Palette:** `frontend/src/styles/global.css`
- Được áp dụng từ mobile-first (xem memory)
- Responsive grid, không thay đổi cấu trúc layout

**Component Patterns:**
- `VenueCard` - thẻ sân
- `Banner` - thông báo
- `EmptyState` - trạng thái trống
- `SkeletonGrid` - loading placeholder
- `PitchGraphic` - vẽ sân bóng

**Layout chung:** `frontend/src/components/layout/AppLayout`

## Quy ước khác

### Database Migrations

- Chạy tự động khi backend khởi động
- File: `csdl/migrations/V0X__description.sql`
- Không xóa migration cũ, chỉ thêm migration mới

### Environment Variables

**Backend** (`.env` từ `.env.example`):
```
DATABASE_URL=postgresql://user:pass@localhost:5433/sandbox
PORT=3000
NODE_ENV=development
JWT_SECRET=<secret-key>
```

## Preference Claude

1. **Linting & Format:** Nếu dự án có ESLint/Prettier setup, tuân thủ quy tắc
2. **Commit Style:** Luôn tuân thủ format `<loại>(<phạm-vi>): <mô-tả>`
3. **Error Handling:** Dùng cấu trúc lỗi chung từ `backend/src/middlewares/`
4. **Component Organization:** Không tạo abstraction không cần thiết; 3 dòng giống nhau là OK
5. **Comments:** Chỉ viết comment nếu lý do không rõ ràng (WHY, không phải WHAT)
6. **Testing:** Khi có test suite, chạy trước khi commit
7. **API Documentation:** Cập nhật `docs/openapi.yaml` ngay khi thay đổi endpoint
8. **UI Testing:** Trước khi báo xong, test chính UI qua browser (không chỉ tests)
9. **Mobile-First Design:** Luôn thiết kế từ mobile trước, sau đó scale up (từ memory)

## Quick Links

- **API Docs (interactive):** `http://localhost:3000/docs` (khi backend chạy)
- **OpenAPI Spec:** `docs/openapi.yaml`
- **Error Codes:** `backend/src/lib/errors.js`
- **Color Palette:** `frontend/src/styles/global.css`
- **Endpoints:** Xem `README.md` phần "Endpoint"
