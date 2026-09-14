# Backend - API dat san bong da

Node.js + Express + `pg` (khong ORM), noi toi PostgreSQL trong `../csdl/docker-compose.yml`.

Backend **chi tra ve JSON**. Giao dien nam o `../frontend` va chay rieng o cong 5173.

## Chay

```bash
cd D:\DoAn\csdl
docker compose up -d          # bat PostgreSQL truoc

cd D:\DoAn\backend
copy .env.example .env
npm install
npm run dev                   # http://localhost:3000
```

`.env` khi chay ngoai Docker:

```
DATABASE_URL=postgresql://sanbong:sanbong123@localhost:5433/sanbong
PORT=3000
HOLD_MINUTES=15
CORS_ORIGIN=http://localhost:5173
```

Chay **trong** Docker thi host la `db` (ten service), chay **ngoai** Docker thi dung `localhost`.

## Tai lieu API

Chay backend roi mo `http://localhost:3000/docs` - Swagger UI, thu duoc tung endpoint.
File dac ta: `../docs/openapi.yaml`.

## Cau truc

```
src/
├── server.js          Khoi tao app, CORS, lang nghe cong
├── db.js              Connection pool (toi da 10 ket noi) + waitForDb()
├── lib/errors.js      Bang ma loi, lop AppError, fromDbError, requireFields
├── middlewares/       requestId, requestLogger, notFound, errorHandler
└── routes/
    ├── index.js       /health, /docs, /openapi.yaml, /api/districts
    ├── venues.js      /api/venues
    ├── fields.js      /api/fields
    └── bookings.js    /api/bookings
```

## Endpoint

| Method | Duong dan | Cong dung |
|---|---|---|
| GET | `/docs` | Tai lieu API (Swagger UI) |
| GET | `/openapi.yaml` | File dac ta OpenAPI 3.0 |
| GET | `/health` | Kiem tra ket noi CSDL, dem so bang |
| GET | `/api/districts` | Danh sach quan/huyen |
| GET | `/api/venues?district=&q=` | Tim cum san da duyet |
| GET | `/api/venues/:id` | Chi tiet + san con + tien ich + bang gia |
| GET | `/api/venues/:id/revenue` | Doanh thu theo ngay (view `v_venue_daily_revenue`) |
| GET | `/api/fields/:id/schedule?date=` | Lich san (view `v_field_schedule`) |
| GET | `/api/fields/:id/availability?date=&start=&end=` | Goi `fn_is_slot_available` |
| POST | `/api/bookings` | Tao don giu cho (HELD) |
| GET | `/api/bookings/:code` | Chi tiet don + slot + thanh toan |
| POST | `/api/bookings/:code/cancel` | Huy don, nha khung gio |
| POST | `/api/bookings/maintenance/release-expired` | Goi `fn_release_expired_holds()` |

### Tao don

```bash
curl -X POST http://localhost:3000/api/bookings ^
  -H "content-type: application/json" ^
  -d "{\"field_id\":1,\"play_date\":\"2026-09-20\",\"start\":\"18:00\",\"end\":\"19:30\",\"user_id\":1}"
```

Gia tinh tu bang `price_rule`: `base_price * multiplier * so_gio`;
tien coc = `total * venue.deposit_rate`.

`user_id` bat buoc (rang buoc `ck_booking_owner`). `guest_name` / `guest_phone`
chi la thong tin lien he them, khong thay the `user_id`.

## Dinh dang phan hoi loi

Moi loi deu co cung cau truc, sinh tai **mot cho duy nhat** (`middlewares/errorHandler`):

```json
{
  "error": {
    "code": "SLOT_TAKEN",
    "message": "Khung gio nay da co nguoi dat",
    "details": { "field_id": 3 },
    "requestId": "3f7c9b12-1f0a-4c2e-9f11-2b7d4e8a91c3",
    "timestamp": "2026-09-14T12:30:00.000Z"
  }
}
```

| Ma loi | HTTP | Truong hop |
|---|---|---|
| `MISSING_FIELD` | 400 | Thieu truong bat buoc, `details.missing` liet ke ten truong |
| `CONSTRAINT_VIOLATED` | 400 | Vi pham CHECK: thoi luong ngoai 1-4 gio, SDT sai dinh dang... |
| `FIELD_NOT_FOUND` | 404 | San khong ton tai hoac dang tam ngung |
| `BOOKING_NOT_FOUND` | 404 | Khong tim thay don |
| `SLOT_TAKEN` | 409 | Khung gio da co nguoi giu (rang buoc EXCLUDE `no_slot_overlap`) |
| `NO_PRICE_RULE` | 409 | Chua co bang gia cho khung gio do |
| `VENUE_NOT_APPROVED` | 409 | Cum san chua duoc duyet |
| `INVALID_STATUS` | 409 | Don o trang thai khong cho thao tac |
| `DB_UNAVAILABLE` | 503 | Khong ket noi duoc CSDL |

Bang day du: `src/lib/errors.js`. Them ma moi thi **phai** bo sung vao `enum`
trong `../docs/openapi.yaml`.

Trong route **khong tu goi** `res.status(4xx).json(...)`:

```js
const { AppError, requireFields } = require('../lib/errors');

requireFields(req.body, ['field_id', 'play_date']);
if (!found) throw new AppError('VENUE_NOT_FOUND', { details: { id } });
```

Moi request co header `X-Request-Id`, trung voi `error.requestId` - dung doi chieu log server.

## Ghi chu ky thuat

- `src/db.js` dung connection pool (toi da 10 ket noi), co `waitForDb()` de doi
  Postgres san sang khi chay chung `docker compose`.
- Tao don chay trong mot giao dich: insert `booking` roi insert `booking_slot`.
  Neu trung gio, rang buoc EXCLUDE cua Postgres nem loi `23P01`, toan bo giao dich
  ROLLBACK - khong bao gio sinh ra don rac. `fromDbError` doi `23P01` thanh `SLOT_TAKEN`.
- Kieu `NUMERIC` va `BIGINT` duoc parse ve so JavaScript thay vi chuoi.
