# Hướng dẫn kết nối cơ sở dữ liệu (Windows + Docker)

> **CẬP NHẬT:** máy này đã có sẵn PostgreSQL 18 chiếm cổng 5432, nên container
> trong `docker-compose.yml` đã đổi sang cổng **5433**. Mọi chỗ ghi
> `localhost:5432` bên dưới, nếu là nói tới CSDL **trong Docker**, hãy đọc thành
> `localhost:5433`. Muốn cài CSDL thẳng vào PostgreSQL 18 bằng pgAdmin thì xem
> file `HUONG_DAN_POSTGRESQL_18.md`.

## 0. Thông tin kết nối (dùng cho mọi công cụ)

| Thông số | Giá trị |
|---|---|
| Host | `localhost` |
| Port | `5432` |
| Database | `sanbong` |
| Username | `sanbong` |
| Password | `sanbong123` |
| JDBC URL | `jdbc:postgresql://localhost:5432/sanbong` |

---

## 1. Cài Docker Desktop

1. Tải tại <https://www.docker.com/products/docker-desktop/> → bản **Windows**.
2. Cài xong, khởi động lại máy nếu được hỏi.
3. Mở Docker Desktop, chờ đến khi góc dưới bên trái hiện **Engine running** (chấm xanh).
4. Mở PowerShell, kiểm tra:

```powershell
docker --version
```

> Nếu báo lỗi về WSL2: mở PowerShell **quyền Administrator**, chạy `wsl --install`, khởi động lại máy.

---

## 2. Khởi động cơ sở dữ liệu

Giải nén thư mục này ra, ví dụ `D:\DoAn\csdl`. Cấu trúc phải là:

```
D:\DoAn\csdl\
├── docker-compose.yml
└── db\
    ├── migration\   (V01 … V10)
    └── test_constraints.sql
```

Mở PowerShell tại đúng thư mục đó:

```powershell
cd D:\DoAn\csdl
docker compose up -d
```

Lần đầu Docker tải image mất 1–2 phút. Sau đó PostgreSQL tự chạy 10 file
`V01` → `V10` để tạo bảng và nạp dữ liệu mẫu.

Kiểm tra đã chạy xong:

```powershell
docker compose logs db | Select-String "database system is ready"
```

---

## 3. Kiểm tra dữ liệu bằng dòng lệnh

```powershell
docker compose exec db psql -U sanbong -d sanbong
```

Trong `psql`:

```sql
\dt                     -- liệt kê bảng (phải có 36 bảng)
\dT                     -- liệt kê kiểu ENUM
SELECT name, status FROM venue;
SELECT * FROM v_field_schedule;
\q                      -- thoát
```

---

## 4. Kết nối bằng công cụ trực quan

### Cách A — Adminer (đã kèm sẵn, không cần cài gì)

Mở trình duyệt: <http://localhost:8081>

| Trường | Điền |
|---|---|
| System | PostgreSQL |
| Server | `db` |
| Username | `sanbong` |
| Password | `sanbong123` |
| Database | `sanbong` |

> Lưu ý: Server là `db` (tên service trong docker-compose), **không phải** `localhost`,
> vì Adminer chạy bên trong mạng Docker.

### Cách B — pgAdmin 4 hoặc DBeaver

Tải pgAdmin tại <https://www.pgadmin.org/download/> hoặc DBeaver tại <https://dbeaver.io/download/>.

Tạo connection mới với: Host `localhost`, Port `5432`, Database `sanbong`,
User `sanbong`, Password `sanbong123`.

---

## 5. Chạy bộ kiểm thử ràng buộc

```powershell
Get-Content db\test_constraints.sql | docker compose exec -T db psql -U sanbong -d sanbong
```

Kết quả mong đợi: 11 dòng `TC-xx DAT`.

---

## 6. Kết nối từ Spring Boot

`src/main/resources/application.yml`:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/sanbong
    username: sanbong
    password: sanbong123
    driver-class-name: org.postgresql.Driver
  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: true
  jpa:
    hibernate:
      ddl-auto: validate      # KHÔNG dùng update
    properties:
      hibernate:
        jdbc:
          time_zone: Asia/Ho_Chi_Minh
```

`pom.xml`:

```xml
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-core</artifactId>
</dependency>
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-database-postgresql</artifactId>
</dependency>
```

Nếu dùng Flyway trong ứng dụng thì chép thư mục `db/migration` vào
`src/main/resources/db/migration` và **bỏ** phần mount `docker-entrypoint-initdb.d`
trong `docker-compose.yml` (nếu không, script sẽ chạy hai lần và Flyway báo lỗi
"found non-empty schema without schema history table").

---

## 7. Các lệnh hay dùng

| Việc cần làm | Lệnh |
|---|---|
| Bật CSDL | `docker compose up -d` |
| Tắt (giữ dữ liệu) | `docker compose down` |
| **Xóa sạch, tạo lại từ đầu** | `docker compose down -v` rồi `docker compose up -d` |
| Xem log | `docker compose logs -f db` |
| Vào psql | `docker compose exec db psql -U sanbong -d sanbong` |
| Sao lưu | `docker compose exec db pg_dump -U sanbong sanbong > backup.sql` |
| Phục hồi | `Get-Content backup.sql \| docker compose exec -T db psql -U sanbong -d sanbong` |

> Quan trọng: các file `V01..V10` **chỉ chạy một lần duy nhất** khi volume còn
> trống. Sửa file migration rồi `docker compose restart` sẽ không có tác dụng —
> phải `docker compose down -v` để xóa volume rồi bật lại.

---

## 8. Lỗi thường gặp

| Lỗi | Nguyên nhân & cách xử lý |
|---|---|
| `port is already allocated` | Máy đã cài sẵn PostgreSQL chiếm cổng 5432. Đổi dòng ports thành `"5433:5432"` rồi kết nối qua cổng 5433, hoặc tắt service PostgreSQL trong `services.msc`. |
| `password authentication failed` | Sai mật khẩu, hoặc volume cũ còn mật khẩu cũ. Chạy `docker compose down -v` rồi bật lại. |
| Không có bảng nào sau khi `up` | Volume đã tồn tại từ lần trước nên script khởi tạo bị bỏ qua. `docker compose down -v` rồi `up -d`. |
| `relation "district" does not exist` | Migration chạy sai thứ tự (V10 trước V02). Kiểm tra tên file phải là `V01__`…`V10__` (hai chữ số). |
| Adminer báo không kết nối được | Ô Server phải điền `db`, không phải `localhost`. |
| `docker: command not found` | Docker Desktop chưa chạy. Mở app và chờ chấm xanh "Engine running". |
