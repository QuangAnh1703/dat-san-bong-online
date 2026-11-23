---
name: database-migrations
description: PostgreSQL migration rules for SanBong.id.vn - forward-only SQL files in csdl/db/migration, checksum-validated, one transaction per file. Use when creating or changing tables, columns, indexes, constraints, or seed data.
origin: ECC
---

# Migration CSDL - SanBong.id.vn

PostgreSQL 16 (Docker, `csdl/docker-compose.yml`, cổng 5433). Không ORM - migration là SQL thuần.

## Quy tắc

1. **Mọi thay đổi schema/seed đều qua migration** - không sửa tay DB rồi bỏ đó.
2. **File mới:** `csdl/db/migration/VXX__mo_ta.sql`, XX = số lớn nhất hiện có + 1.
3. **Không sửa/xóa migration cũ.** `backend/src/db/migrate.js` lưu checksum SHA-256 trong `schema_history`; file cũ bị đổi thì backend từ chối khởi động. Muốn hoàn tác → viết migration mới.
4. **Mỗi file chạy trong một transaction** (`BEGIN`/`COMMIT`) → **không dùng `CREATE INDEX CONCURRENTLY`** hoặc lệnh không chạy được trong transaction.
5. **Tách schema và dữ liệu:** đổi cấu trúc một file, seed/backfill một file riêng (như `V14__seed_...`, `V15__seed_...`).

## Mẫu an toàn

```sql
-- Thêm cột: cho phép NULL hoặc có DEFAULT
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE booking ADD COLUMN IF NOT EXISTS is_rated BOOLEAN NOT NULL DEFAULT false;

-- Cần NOT NULL mà chưa có default: thêm cột NULL → backfill → đặt NOT NULL
ALTER TABLE field ADD COLUMN IF NOT EXISTS max_players INT;
UPDATE field SET max_players = 10 WHERE max_players IS NULL;
ALTER TABLE field ALTER COLUMN max_players SET NOT NULL;

-- Index
CREATE INDEX IF NOT EXISTS idx_booking_slot_field_date ON booking_slot (field_id, play_date);

-- Ràng buộc nghiệp vụ đặt ở DB khi được (CHECK, UNIQUE, FK)
ALTER TABLE booking ADD CONSTRAINT chk_booking_deposit CHECK (deposit_amount <= total_amount);
```

Tên bảng/cột: `snake_case`, tên bảng **số ít** (`app_user`, `venue`, `field`, `booking`, `booking_slot`).

Đổi tên / xóa cột đang được code dùng: sửa code trước (hoặc cùng lúc), xóa cột sau; tránh để backend đọc cột đã mất.

## Chạy

```bash
cd backend
npm run migrate            # áp dụng migration mới
npm run migrate:validate   # kiểm tra schema khớp
```

Sau khi thêm migration: cập nhật `csdl/db/all_in_one.sql` nếu file đó đang dùng để dựng DB từ đầu, và sửa repository/OpenAPI nếu cột đổi ảnh hưởng tới API.

## Checklist

- [ ] Tên file đúng `VXX__mo_ta.sql`, số tiếp theo
- [ ] Không chạm vào file migration cũ
- [ ] Cột mới nullable hoặc có default; dùng `IF NOT EXISTS` khi được
- [ ] Không có `CONCURRENTLY`
- [ ] `npm run migrate` chạy thành công trên DB local và backend khởi động lại được
