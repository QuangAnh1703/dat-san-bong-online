# Quy uoc lam viec

Tai lieu nay chot cach ca nhom lam viec tren repo. Doc truoc khi commit dau tien.

## 1. Nhanh Git

| Nhanh | Muc dich | Quy tac |
|---|---|---|
| `main` | Ma nguon on dinh, luon chay duoc | Chi merge tu `dev` khi da test xong; moi lan merge gan tag phien ban |
| `dev` | Nhanh tich hop hang ngay | Moi feature branch merge vao day qua Pull Request |
| `feature/<ma UC>-<mo ta>` | Mot nhanh cho mot use case | `feature/UC04-booking-realtime` |
| `fix/<mo ta>` | Sua loi | `fix/redis-lock-expire` |

Khong commit thang vao `main`. Khong lam viec chung tren mot nhanh feature.

```bash
git checkout dev
git pull
git checkout -b feature/UC04-booking-realtime
# ... lam viec, commit ...
git push -u origin feature/UC04-booking-realtime
# mo Pull Request vao dev
```

## 2. Commit

Dinh dang: `<loai>(<pham vi>): <mo ta ngan khong dau, chu thuong>`

```
feat(frontend): them man hinh WF-03 so do lich
fix(backend): tra dung ma loi khi khung gio bi trung
docs(api): bo sung vi du loi SLOT_TAKEN vao openapi
```

Loai: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`.
Pham vi: `frontend`, `backend`, `csdl`, `api`, `docs`, hoac ten man hinh (`wf03`).

Moi commit lam mot viec. Khong gop "sua 5 thu linh tinh" vao mot commit.

## 3. Pull Request

- Tieu de viet nhu commit: `feat(backend): them endpoint huy don dinh ky`
- Mo ta neu ro: **lam gi**, **tai sao**, **test the nao**
- Gan nhan use case lien quan (UC04, WF-03...)
- Phai co it nhat 1 nguoi review truoc khi merge
- Merge xong thi xoa nhanh feature

## 4. Cau truc thu muc

```
DoAn/
├── csdl/       PostgreSQL: docker-compose, migration V01..V10, du lieu mau
├── backend/    REST API: Express + pg
├── frontend/   Giao dien: React + Vite
├── docs/       openapi.yaml va tai lieu thiet ke
└── .vscode/    Task chay du an
```

Quy tac: **frontend khong bao gio truy cap CSDL truc tiep**, moi thu di qua API.
Backend khong phuc vu file giao dien.

## 5. Quy uoc dat ten trong ma nguon

| Doi tuong | Quy uoc | Vi du |
|---|---|---|
| Bang, cot trong CSDL | `snake_case`, tieng Anh, so it | `booking_slot`, `hold_expires_at` |
| Bien, ham JavaScript | `camelCase` | `getFieldSchedule` |
| Component React | `PascalCase`, mot file mot component | `VenueCard.jsx` |
| Custom hook | `useXxx` | `useVenues.js` |
| Duong dan API | `kebab-case`, so nhieu | `/api/bookings/:code/cancel` |
| Route giao dien | Tieng Viet khong dau, `kebab-case` | `/lich-cua-toi` |
| Ma loi API | `SCREAMING_SNAKE_CASE` | `SLOT_TAKEN` |

Chu thich trong ma nguon viet tieng Viet **khong dau** cho dong nhat voi code hien co.

## 6. Xu ly loi trong API

Moi loi tra ve deu co dang thong nhat (xem `docs/openapi.yaml`):

```json
{ "error": { "code": "SLOT_TAKEN", "message": "...", "requestId": "...", "timestamp": "..." } }
```

Route **khong tu goi** `res.status(4xx).json(...)`. Thay vao do:

```js
const { AppError, requireFields } = require('../lib/errors');

requireFields(req.body, ['field_id', 'play_date']);          // thieu -> MISSING_FIELD
if (!found) throw new AppError('VENUE_NOT_FOUND', { details: { id } });
```

Them ma loi moi thi khai bao trong `backend/src/lib/errors.js` **va** bo sung vao
danh sach `enum` trong `docs/openapi.yaml`.

## 7. Them mot man hinh moi (frontend)

1. Tao thu muc `frontend/src/features/<ten-man-hinh>/`
2. Khai bao route trong `frontend/src/router.jsx`
3. Goi du lieu qua `frontend/src/services/` - khong viet `fetch` truc tiep trong component
4. Dung lai component trong `components/ui/`, chi them moi khi that su can
5. Cap nhat bang tien do trong `README.md`

## 8. Truoc khi push

```bash
cd backend  && npm run dev     # chay thu, khong loi khoi dong
cd frontend && npm run build   # build phai sach
```
