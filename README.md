# Nen tang dat san bong da truc tuyen

Do an: he thong dat san bong da theo thoi gian thuc - xem lich trong tung san con,
giu cho, dat coc online, ghep doi giao huu va ghep chan le.

## Kien truc

Ba tang tach roi hoan toan, chay doc lap, giao tiep qua HTTP JSON:

```
+-------------------+       fetch /api/...       +------------------+      SQL      +--------------+
|  frontend (5173)  |  ----------------------->  |  backend (3000)  |  --------->   |  csdl (5433) |
|  React + Vite     |  <-----------------------  |  Express + pg    |  <---------   |  PostgreSQL  |
+-------------------+          JSON              +------------------+               +--------------+
```

| Thu muc | Vai tro | Cong nghe |
|---|---|---|
| `csdl/` | Co so du lieu | PostgreSQL 16 (Docker), migration `V01..V10`, du lieu mau |
| `backend/` | REST API | Node.js + Express + `pg` (khong ORM), CORS |
| `frontend/` | Giao dien nguoi dung | React 18 + Vite + React Router |

Frontend **khong** duoc backend phuc vu - hai ben chay rieng, deploy rieng,
co the thay the doc lap. Dev thi Vite proxy `/api` sang cong 3000 nen khong dinh CORS.

## Chay du an (3 terminal)

```bash
# 1) Co so du lieu
cd csdl
docker compose up -d              # Adminer: http://localhost:8081

# 2) Backend
cd backend
cp .env.example .env              # chon dung DATABASE_URL trong file
npm install
npm run dev                       # http://localhost:3000

# 3) Frontend
cd frontend
npm install
npm run dev                       # http://localhost:5173
```

Mo `http://localhost:5173`.

> Neu chua chay backend, giao dien van mo duoc: no tu chuyen sang du lieu mau
> va hien banner canh bao (xem `frontend/src/lib/demoData.js`).

## Cau truc frontend

```
frontend/src/
├── components/
│   ├── layout/        Header, Footer, AppLayout (khung chung moi trang)
│   └── ui/            VenueCard, Banner, EmptyState, SkeletonGrid, PitchGraphic
├── features/
│   └── home/          WF-01: HomePage, Hero, SearchBar, FlashSale, useVenues, useCountdown
├── pages/             ComingSoonPage, NotFoundPage
├── services/          api.js (lop fetch dung chung), venues.js (goi endpoint)
├── lib/               format.js (tien/ngay/gio), demoData.js
├── styles/global.css  He mau + component dung chung
└── router.jsx         Mot route cho moi wireframe
```

Them mot man hinh moi = tao thu muc trong `features/`, khai bao route trong `router.jsx`,
goi du lieu qua `services/`. Khong sua `App` hay CSS toan cuc.

## Cau truc backend

```
backend/src/
├── server.js          Khoi tao app, CORS, lang nghe cong
├── db.js              Pool ket noi PostgreSQL
├── middlewares/       Log request, 404, bo bat loi chung
└── routes/
    ├── index.js       /health, /api/districts + gan cac router con
    ├── venues.js      /api/venues
    ├── fields.js      /api/fields
    └── bookings.js    /api/bookings
```

## Endpoint

```
GET  /health                                        Kiem tra ket noi CSDL
GET  /api/districts                                 Danh sach quan/huyen
GET  /api/venues?district=&q=                       Tim cum san
GET  /api/venues/:id                                Chi tiet + san con + bang gia
GET  /api/venues/:id/revenue                        Doanh thu theo ngay
GET  /api/fields/:id/schedule?date=YYYY-MM-DD       So do lich mot san con
GET  /api/fields/:id/availability?date=&start=&end= Kiem tra slot con trong
POST /api/bookings                                  Tao don (giu cho)
GET  /api/bookings/:code                            Tra cuu don
POST /api/bookings/:code/cancel                     Huy don
```

## Tien do theo wireframe (Phase 0)

| Ma | Man hinh | Route | Trang thai |
|---|---|---|---|
| WF-01 | Trang chu | `/` | Xong |
| WF-02 | Ket qua tim kiem & bo loc | `/tim-san` | Chua lam |
| WF-03 | Chi tiet san & so do lich real-time | `/san/:id` | Chua lam |
| WF-04 | Xac nhan & thanh toan tien coc | `/thanh-toan/:code` | Chua lam |
| WF-05 | Dat san dinh ky | `/dat-dinh-ky` | Chua lam |
| WF-06 | Quan ly lich da & danh gia | `/lich-cua-toi` | Chua lam |
| WF-07 | Tim doi giao huu | `/giao-huu` | Chua lam |
| WF-08 | Ghep chan le | `/ghep-chan-le` | Chua lam |
| WF-09 | Ho so & diem uy tin | `/ho-so` | Chua lam |
| WF-10 | Dashboard chu san | `/chu-san` | Chua lam |

## Quy uoc Git

- `main` - ma nguon on dinh, luon chay duoc
- `dev` - nhanh tich hop hang ngay
- `feature/<ma UC>-<mo ta>` - vi du `feature/UC04-booking-realtime`
- `fix/<mo ta>` - vi du `fix/redis-lock-expire`

Commit: `<loai>(<pham vi>): <mo ta ngan>` - vi du `feat(frontend): them man hinh WF-03`.
Pham vi thuong dung: `frontend`, `backend`, `csdl`, `docs`.
