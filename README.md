# Nen tang dat san bong da truc tuyen

Do an: he thong dat san bong da theo thoi gian thuc - xem lich trong tung san con,
giu cho, dat coc online, ghep doi giao huu va ghep chan le.

## Cau truc thu muc

| Thu muc | Noi dung |
|---|---|
| `csdl/` | PostgreSQL: `docker-compose.yml`, migration `V01..V10`, du lieu mau, test rang buoc |
| `api/`  | REST API bang Express + `pg` (khong ORM) |
| `web/`  | Giao dien web tinh (HTML/CSS/JS thuan), dung theo wireframe Phase 0 |

## Chay du an

```bash
# 1. Khoi dong CSDL (PostgreSQL 16 + Adminer)
cd csdl
docker compose up -d          # Adminer: http://localhost:8081

# 2. Chay API + giao dien
cd ../api
cp .env.example .env          # chon dung DATABASE_URL trong file
npm install
npm start                     # http://localhost:3000
```

Mo `http://localhost:3000` -> trang chu (WF-01).
API doc dang JSON o `http://localhost:3000/api`, kiem tra ket noi CSDL o `/health`.

> Neu chua chay CSDL, giao dien van mo duoc va hien thi du lieu mau kem canh bao.

## Cac endpoint chinh

```
GET  /health
GET  /api/districts
GET  /api/venues?district=&q=
GET  /api/venues/:id
GET  /api/venues/:id/revenue
GET  /api/fields/:id/schedule?date=YYYY-MM-DD
GET  /api/fields/:id/availability?date=&start=HH:MM&end=HH:MM
POST /api/bookings
GET  /api/bookings/:code
POST /api/bookings/:code/cancel
```

## Man hinh theo wireframe (Phase 0)

| Ma | Man hinh | Trang thai |
|---|---|---|
| WF-01 | Trang chu | Xong (`web/index.html`) |
| WF-02 | Ket qua tim kiem & bo loc | Chua lam |
| WF-03 | Chi tiet san & so do lich real-time | Chua lam |
| WF-04 | Xac nhan & thanh toan tien coc | Chua lam |
| WF-06 | Quan ly lich da & danh gia | Chua lam |
| WF-10 | Dashboard chu san | Chua lam |

## Quy uoc nhanh Git

- `main` - ma nguon on dinh, luon chay duoc
- `dev` - nhanh tich hop hang ngay
- `feature/<ma UC>-<mo ta>` - vi du `feature/UC04-booking-realtime`
- `fix/<mo ta>` - vi du `fix/redis-lock-expire`

Commit: `<loai>(<pham vi>): <mo ta ngan>` - vi du `feat(web): them trang chu WF-01`.
