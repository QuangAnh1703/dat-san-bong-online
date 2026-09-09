# Cơ sở dữ liệu — Nền tảng đặt sân bóng đá trực tuyến

PostgreSQL 16. Toàn bộ script đã được chạy và kiểm thử thực tế (11/11 test ĐẠT).

## Cấu trúc

```
db/
├── migration/
│   ├── V1__extensions_and_enums.sql      Extension + 22 kiểu ENUM
│   ├── V2__users_and_teams.sql           Người dùng, đội bóng, điểm uy tín
│   ├── V3__venues_and_fields.sql         Cụm sân, sân con, tiện ích, duyệt
│   ├── V4__pricing.sql                   Bảng giá theo khung giờ, khuyến mãi
│   ├── V5__bookings.sql                  Đơn đặt, ô giờ, hợp đồng định kỳ
│   ├── V6__payments.sql                  Thanh toán, IPN, hoàn tiền
│   ├── V7__matchmaking.sql               Ghép đội, chân lẻ, chat
│   ├── V8__reviews_and_operations.sql    Đánh giá, khiếu nại, thông báo
│   ├── V9__triggers_and_views.sql        5 hàm/trigger + 2 view
│   └── V10__seed_data.sql                Dữ liệu mẫu để demo
└── test_constraints.sql                  11 kịch bản kiểm thử ràng buộc
```

## Chạy bằng Docker (nhanh nhất)

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: sanbong
      POSTGRES_USER: sanbong
      POSTGRES_PASSWORD: sanbong
    ports: ["5432:5432"]
    volumes:
      - ./db/migration:/docker-entrypoint-initdb.d:ro
```

```bash
docker compose up -d
docker compose exec -T db psql -U sanbong -d sanbong -f /dev/stdin < db/test_constraints.sql
```

## Chạy thủ công

```bash
createdb sanbong
for n in 1 2 3 4 5 6 7 8 9 10; do
  psql -d sanbong -f db/migration/V${n}__*.sql
done
psql -d sanbong -f db/test_constraints.sql
```

> Lưu ý: KHÔNG dùng `V*.sql` với ký tự đại diện — V10 sẽ chạy trước V2 vì
> sắp xếp theo chuỗi. Flyway xử lý đúng thứ tự số.

## Cấu hình Flyway (Spring Boot)

```yaml
spring:
  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: true
  jpa:
    hibernate:
      ddl-auto: validate   # KHÔNG dùng update
```

## Tài khoản mẫu

| SĐT | Vai trò | Ghi chú |
|---|---|---|
| 0912345678 | PLAYER | Nguyễn Văn A, đội trưởng FC Bách Khoa, uy tín 95 |
| 0987654321 | PLAYER | Trần Văn B, uy tín 62 (đã bùng kèo 1 lần) |
| 0977111222 | OWNER  | Chủ Sân Cầu Giấy Center + Sân Long Biên (chờ duyệt) |
| 0900000000 | ADMIN  | Quản trị viên |

Mật khẩu mẫu trong seed là chuỗi băm giả lập — cần thay bằng hash BCrypt thật
khi tích hợp với Spring Security.

## Ba ràng buộc quan trọng nhất

1. `booking_slot.no_slot_overlap` — EXCLUDE chống đặt trùng khung giờ (SQLSTATE 23P01)
2. `price_rule.no_price_overlap` — EXCLUDE chống cấu hình giá chồng lấp
3. `payment_transaction.uq_provider_txn` — UNIQUE chống xử lý trùng IPN
