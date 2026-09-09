-- =====================================================================
-- V1 — Extension và kiểu dữ liệu liệt kê (ENUM)
-- Nền tảng đặt sân bóng đá trực tuyến thông minh
-- PostgreSQL 16
-- =====================================================================

-- btree_gist cho phép kết hợp toán tử "=" (khóa thường) với "&&" (giao nhau
-- của range) trong cùng một ràng buộc EXCLUDE. Đây là nền tảng của cơ chế
-- chống đặt trùng khung giờ ở V5.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Sinh mã ngẫu nhiên cho mã đơn đặt sân, mã ticket.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------
-- Người dùng
-- ---------------------------------------------------------------------
CREATE TYPE user_role      AS ENUM ('PLAYER', 'OWNER', 'ADMIN');
CREATE TYPE user_status    AS ENUM ('PENDING_VERIFY', 'ACTIVE', 'LOCKED');

-- Mới chơi / Trung bình / Khá / Phủi
CREATE TYPE skill_level    AS ENUM ('BEGINNER', 'INTERMEDIATE', 'GOOD', 'SEMI_PRO');

-- Thủ môn / Hậu vệ / Tiền vệ / Tiền đạo / Đá tự do
CREATE TYPE position_type  AS ENUM ('GK', 'DF', 'MF', 'FW', 'ANY');

-- ---------------------------------------------------------------------
-- Sân bãi
-- ---------------------------------------------------------------------
CREATE TYPE venue_status   AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');
CREATE TYPE field_type     AS ENUM ('F5', 'F7', 'F11');
CREATE TYPE day_type       AS ENUM ('WEEKDAY', 'WEEKEND', 'HOLIDAY');

-- ---------------------------------------------------------------------
-- Đặt sân — các trạng thái phải khớp đúng sơ đồ State Machine (Hình 6.5,
-- tài liệu Phase 0). Không được phát sinh thêm giá trị ngoài danh sách này.
-- ---------------------------------------------------------------------
CREATE TYPE booking_kind   AS ENUM ('SINGLE', 'RECURRING', 'OWNER_LOCK');
CREATE TYPE booking_status AS ENUM (
    'HELD',                 -- đang giữ chỗ 5 phút chờ thanh toán
    'PENDING_VERIFY',       -- chuyển khoản, chờ chủ sân duyệt bill
    'CONFIRMED',            -- đã cọc thành công, slot bị khóa
    'IN_PROGRESS',          -- đang trong giờ đá
    'COMPLETED',            -- đã đá xong, cho phép đánh giá
    'CANCELLED_EXPIRED',    -- hết 5 phút giữ chỗ, hệ thống tự hủy
    'CANCELLED_BY_USER',
    'CANCELLED_BY_OWNER',
    'REFUNDED'
);
CREATE TYPE slot_status    AS ENUM ('HELD', 'CONFIRMED', 'LOCKED', 'RELEASED');
CREATE TYPE lock_reason    AS ENUM ('WALK_IN', 'MAINTENANCE', 'OTHER');

-- ---------------------------------------------------------------------
-- Thanh toán
-- ---------------------------------------------------------------------
CREATE TYPE payment_method AS ENUM ('VNPAY', 'MOMO', 'ZALOPAY', 'BANK_TRANSFER', 'CASH');
CREATE TYPE payment_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED');
CREATE TYPE txn_type       AS ENUM ('DEPOSIT', 'REFUND', 'ADJUSTMENT');

-- ---------------------------------------------------------------------
-- Ghép đội
-- ---------------------------------------------------------------------
CREATE TYPE post_type      AS ENUM ('TEAM_FINDS_TEAM', 'TEAM_FINDS_PLAYER', 'PLAYER_FINDS_TEAM');
CREATE TYPE post_status    AS ENUM ('OPEN', 'MATCHED', 'CLOSED', 'EXPIRED');
CREATE TYPE request_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED');
CREATE TYPE cost_type      AS ENUM ('FREE', 'FIXED', 'VOLUNTARY');

-- ---------------------------------------------------------------------
-- Vận hành
-- ---------------------------------------------------------------------
CREATE TYPE promotion_type AS ENUM ('FLASH_SALE', 'CONTRACT_DISCOUNT', 'MANUAL');
CREATE TYPE ticket_status  AS ENUM ('NEW', 'IN_PROGRESS', 'NEED_INFO', 'RESOLVED', 'CLOSED');
CREATE TYPE target_type    AS ENUM ('USER', 'TEAM', 'VENUE', 'BOOKING');
