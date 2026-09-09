# API dat san bong da (Node.js + Express + PostgreSQL)

Ket noi truc tiep vao CSDL trong `../csdl/docker-compose.yml`.

## Cach 1 - Chay API trong Docker cung CSDL (khuyen dung)

```powershell
cd D:\DoAn\csdl
docker compose --profile app up -d --build
```

- API:     http://localhost:3000
- Adminer: http://localhost:8081
- Postgres: localhost:5432

## Cach 2 - CSDL trong Docker, API chay ngoai bang Node

```powershell
cd D:\DoAn\csdl
docker compose up -d

cd D:\DoAn\api
copy .env.example .env
npm install
npm start
```

`.env` khi chay ngoai Docker:

```
DATABASE_URL=postgresql://sanbong:sanbong123@localhost:5432/sanbong
PORT=3000
HOLD_MINUTES=15
```

> Trong Docker phai dung host `db` (ten service), ngoai Docker dung `localhost`.

## Danh sach endpoint

| Method | Duong dan | Cong dung |
|---|---|---|
| GET | `/health` | Kiem tra ket noi CSDL, dem so bang |
| GET | `/api/districts` | Danh sach quan/huyen |
| GET | `/api/venues?district=&q=` | Tim co so da duyet |
| GET | `/api/venues/:id` | Chi tiet co so + san + tien ich + bang gia |
| GET | `/api/venues/:id/revenue` | Doanh thu theo ngay (view `v_venue_daily_revenue`) |
| GET | `/api/fields/:id/schedule?date=YYYY-MM-DD` | Lich san (view `v_field_schedule`) |
| GET | `/api/fields/:id/availability?date=&start=&end=` | Goi ham `fn_is_slot_available` |
| POST | `/api/bookings` | Tao don giu cho (HELD) |
| GET | `/api/bookings/:code` | Chi tiet don + slot + thanh toan |
| POST | `/api/bookings/:code/cancel` | Huy don, nha khung gio |
| POST | `/api/bookings/maintenance/release-expired` | Goi `fn_release_expired_holds()` |

### Tao don

```bash
curl -X POST http://localhost:3000/api/bookings ^
  -H "content-type: application/json" ^
  -d "{\"field_id\":1,\"play_date\":\"2026-09-15\",\"start\":\"18:00\",\"end\":\"19:30\",\"user_id\":1}"
```

Gia duoc tinh tu bang `price_rule`: `base_price * multiplier * so_gio`,
tien coc = `total * venue.deposit_rate`.

`user_id` la bat buoc (rang buoc `ck_booking_owner` cua CSDL). Truong
`guest_name` / `guest_phone` chi la thong tin lien he them.

### Cac ma loi tra ve

| HTTP | Truong hop |
|---|---|
| 409 + `23P01` | Khung gio da co nguoi giu (rang buoc EXCLUDE `no_slot_overlap`) |
| 400 + `23514` | Vi pham CHECK: thoi luong ngoai khoang 1-4 gio, SDT sai dinh dang... |
| 409 | Co so chua duoc duyet, hoac chua co bang gia cho khung gio do |
| 503 | Khong ket noi duoc CSDL |

## Ghi chu ky thuat

- `src/db.js` dung connection pool (toi da 10 ket noi) va co `waitForDb()`
  de doi Postgres san sang khi chay chung docker compose.
- Tao don chay trong mot giao dich: insert `booking` roi insert `booking_slot`.
  Neu trung gio, rang buoc EXCLUDE cua Postgres nem loi `23P01` va toan bo
  giao dich duoc ROLLBACK - khong bao gio sinh ra don rac.
- Kieu NUMERIC va BIGINT duoc parse ve so JavaScript thay vi chuoi.
