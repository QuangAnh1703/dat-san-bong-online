# Cài CSDL vào PostgreSQL 18 trên máy (pgAdmin)

Dành cho trường hợp bạn muốn dùng PostgreSQL đã cài sẵn trên Windows
(server **PostgreSQL 18** đang hiện trong pgAdmin), không qua Docker.

## Lưu ý về cổng

PostgreSQL 18 trên máy đang chiếm cổng **5432**. Vì vậy `docker-compose.yml`
đã được đổi sang **5433** cho container:

| Chạy ở đâu | Host | Port |
|---|---|---|
| PostgreSQL 18 cài trên máy | `localhost` | **5432** |
| Container `sanbong-db` | `localhost` | **5433** |
| Từ trong mạng Docker (Adminer, service `api`) | `db` | 5432 |

Hai bên chạy song song được, không xung đột.

---

## Bước 1 — Tạo database

Trong pgAdmin, ở cây bên trái:

1. `Servers` → `PostgreSQL 18` → chuột phải **`Databases`** → **Create** → **Database…**
2. Ô **Database**: gõ `sanbong`
3. Ô **Owner**: để `postgres` (hoặc tài khoản bạn dùng)
4. Bấm **Save**

## Bước 2 — Chạy script tạo bảng

1. Bấm chọn database **`sanbong`** vừa tạo (phải chọn đúng nó, không phải `postgres`)
2. Menu **Tools** → **Query Tool**
3. Trong Query Tool bấm biểu tượng **thư mục** (Open File) → chọn:
   `D:\DoAn\csdl\db\all_in_one.sql`
4. Bấm **Execute/Refresh (F5)**

File này là 10 file `V01`…`V10` gộp lại theo đúng thứ tự. Chạy khoảng vài giây.

## Bước 3 — Kiểm tra

Vẫn trong Query Tool, chạy:

```sql
SELECT count(*) AS so_bang
  FROM information_schema.tables
 WHERE table_schema = 'public' AND table_type = 'BASE TABLE';   -- phải ra 36

SELECT name, status, avg_rating FROM venue;                     -- 3 cơ sở mẫu
SELECT * FROM v_field_schedule LIMIT 10;
```

Hoặc nhìn cây bên trái: `sanbong` → `Schemas` → `public` → `Tables` (36 bảng).

## Bước 4 — Chạy bộ kiểm thử ràng buộc (tuỳ chọn)

Mở tiếp file `D:\DoAn\csdl\db\test_constraints.sql` trong Query Tool và chạy.
Xem tab **Messages**, phải thấy 11 dòng `TC-01 DAT` … `TC-11 DAT`.

## Bước 5 — Nối app Node vào PostgreSQL 18

Trong `D:\DoAn\api\.env`:

```
DATABASE_URL=postgresql://postgres:MAT_KHAU_CUA_BAN@localhost:5432/sanbong
PORT=3000
HOLD_MINUTES=15
```

Rồi:

```powershell
cd D:\DoAn\api
npm install
npm start
```

Mở http://localhost:3000/health — thấy `"tables": 36` là xong.

---

## Lỗi hay gặp

| Lỗi | Cách xử lý |
|---|---|
| `extension "btree_gist" is not available` | Cài thiếu gói contrib. Chạy lại bộ cài PostgreSQL, chọn thành phần **Command Line Tools / contrib modules**. |
| `permission denied to create extension "pgcrypto"` | Phải chạy bằng tài khoản superuser (`postgres`). |
| `relation "district" does not exist` | Bạn chạy nhầm database. Chọn đúng `sanbong` trước khi Execute. |
| Chạy lại lần hai báo `already exists` | Script chỉ chạy được trên database trắng. Xoá database `sanbong` rồi tạo lại từ Bước 1. |
| `password authentication failed` | Sai mật khẩu tài khoản `postgres` đặt lúc cài PostgreSQL 18. |
