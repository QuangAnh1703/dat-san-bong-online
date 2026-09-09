-- ============================================================
-- CSDL Nen tang dat san bong da - GOP V01..V10 thanh 1 file
-- Dung cho pgAdmin / psql tren PostgreSQL cai truc tiep tren may.
--
-- Cach dung trong pgAdmin:
--   1. Chuot phai Databases > Create > Database... > Name: sanbong
--   2. Chon database sanbong > Tools > Query Tool
--   3. Mo file nay (bieu tuong folder) > bam Execute (F5)
-- ============================================================

-- ============================================================
-- V01__extensions_and_enums.sql
-- ============================================================
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


-- ============================================================
-- V02__users_and_teams.sql
-- ============================================================
-- =====================================================================
-- V2 — Nhóm NGƯỜI DÙNG: tài khoản, hồ sơ, đội bóng, điểm uy tín
-- =====================================================================

-- Danh mục quận/huyện dùng chung cho hồ sơ người dùng, cụm sân và bài đăng.
CREATE TABLE district (
    code        VARCHAR(10)  PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    province    VARCHAR(100) NOT NULL,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE
);
COMMENT ON TABLE district IS 'Danh mục khu vực (Quận/Huyện) do Admin quản lý';

CREATE TABLE app_user (
    id              BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    phone           VARCHAR(10),
    email           VARCHAR(150),
    password_hash   VARCHAR(255),
    role            user_role    NOT NULL DEFAULT 'PLAYER',
    status          user_status  NOT NULL DEFAULT 'PENDING_VERIFY',
    phone_verified  BOOLEAN      NOT NULL DEFAULT FALSE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

    -- SĐT Việt Nam: đúng 10 chữ số, bắt đầu bằng 0 (lỗi E1 của UC-01)
    CONSTRAINT ck_user_phone_format CHECK (phone IS NULL OR phone ~ '^0[0-9]{9}$'),
    CONSTRAINT ck_user_has_identity CHECK (phone IS NOT NULL OR email IS NOT NULL)
);
CREATE UNIQUE INDEX uq_user_phone ON app_user (phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX uq_user_email ON app_user (lower(email)) WHERE email IS NOT NULL;
COMMENT ON TABLE app_user IS 'Tài khoản đăng nhập. Một tài khoản chỉ có một vai trò chính';

-- Đăng nhập nhanh qua Google/Facebook (UC-01, luồng thay thế A1)
CREATE TABLE oauth_account (
    id           BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    user_id      BIGINT      NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    provider     VARCHAR(20) NOT NULL,          -- GOOGLE | FACEBOOK
    provider_uid VARCHAR(191) NOT NULL,
    linked_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_oauth UNIQUE (provider, provider_uid)
);

CREATE TABLE user_profile (
    user_id            BIGINT PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
    full_name          VARCHAR(120) NOT NULL,
    avatar_url         VARCHAR(500),
    district_code      VARCHAR(10) REFERENCES district(code),
    skill_level        skill_level   NOT NULL DEFAULT 'BEGINNER',
    preferred_position position_type NOT NULL DEFAULT 'ANY',
    -- Điểm uy tín: 0–100, mặc định 100, trừ 5 điểm khi bùng kèo (UC-09, lỗi E3)
    reputation_score   SMALLINT      NOT NULL DEFAULT 100,
    total_matches      INTEGER       NOT NULL DEFAULT 0,
    bio                VARCHAR(500),
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT ck_reputation_range CHECK (reputation_score BETWEEN 0 AND 100)
);

CREATE TABLE team (
    id               BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    name             VARCHAR(120) NOT NULL,
    captain_id       BIGINT       NOT NULL REFERENCES app_user(id),
    district_code    VARCHAR(10)  REFERENCES district(code),
    skill_level      skill_level  NOT NULL DEFAULT 'INTERMEDIATE',
    logo_url         VARCHAR(500),
    reputation_score SMALLINT     NOT NULL DEFAULT 100,
    total_matches    INTEGER      NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_team_reputation CHECK (reputation_score BETWEEN 0 AND 100)
);
CREATE INDEX ix_team_captain ON team (captain_id);

CREATE TABLE team_member (
    team_id      BIGINT      NOT NULL REFERENCES team(id) ON DELETE CASCADE,
    user_id      BIGINT      NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    role_in_team VARCHAR(20) NOT NULL DEFAULT 'MEMBER',   -- CAPTAIN | MEMBER
    joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (team_id, user_id)
);

-- Nhật ký điểm uy tín — bảng chỉ ghi thêm, không sửa. Là bằng chứng khi
-- người dùng thắc mắc vì sao bị trừ điểm (WF-09).
CREATE TABLE reputation_log (
    id             BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    user_id        BIGINT      NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    delta          SMALLINT    NOT NULL,
    reason         VARCHAR(200) NOT NULL,
    ref_type       target_type,
    ref_id         BIGINT,
    balance_after  SMALLINT    NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_reputation_user ON reputation_log (user_id, created_at DESC);

-- Chống brute-force OTP (UC-01, lỗi E4). Bản ghi có thể để Redis quản lý,
-- lưu ở đây để phục vụ điều tra và báo cáo.
CREATE TABLE otp_request (
    id           BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    phone        VARCHAR(10) NOT NULL,
    code_hash    VARCHAR(255) NOT NULL,
    purpose      VARCHAR(30)  NOT NULL,   -- REGISTER | RESET_PASSWORD
    attempt_count SMALLINT    NOT NULL DEFAULT 0,
    expires_at   TIMESTAMPTZ  NOT NULL,
    consumed_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_otp_phone ON otp_request (phone, created_at DESC);


-- ============================================================
-- V03__venues_and_fields.sql
-- ============================================================
-- =====================================================================
-- V3 — Nhóm SÂN BÃI: cụm sân, sân con, tiện ích, hồ sơ duyệt
-- =====================================================================

CREATE TABLE amenity (
    code VARCHAR(30)  PRIMARY KEY,          -- LIGHT | WIFI | CANTEEN | PARKING ...
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50)
);

CREATE TABLE venue (
    id             BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    owner_id       BIGINT       NOT NULL REFERENCES app_user(id),
    name           VARCHAR(150) NOT NULL,
    address        VARCHAR(300) NOT NULL,
    district_code  VARCHAR(10)  NOT NULL REFERENCES district(code),
    latitude       NUMERIC(9,6),
    longitude      NUMERIC(9,6),
    phone          VARCHAR(10),
    description    TEXT,
    status         venue_status NOT NULL DEFAULT 'DRAFT',
    -- Tỷ lệ đặt cọc do chủ sân tự cấu hình, mặc định 30% (giả định Phase 0)
    deposit_rate   NUMERIC(4,3) NOT NULL DEFAULT 0.300,
    bank_name      VARCHAR(100),
    bank_account   VARCHAR(50),
    bank_holder    VARCHAR(150),
    avg_rating     NUMERIC(2,1) NOT NULL DEFAULT 0.0,
    rating_count   INTEGER      NOT NULL DEFAULT 0,
    open_time      TIME         NOT NULL DEFAULT '06:00',
    close_time     TIME         NOT NULL DEFAULT '23:59',
    max_advance_days SMALLINT   NOT NULL DEFAULT 90,   -- UC-05, lỗi E2
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT ck_deposit_rate CHECK (deposit_rate BETWEEN 0 AND 1),
    CONSTRAINT ck_venue_rating CHECK (avg_rating BETWEEN 0 AND 5),
    CONSTRAINT ck_venue_geo CHECK (
        (latitude IS NULL AND longitude IS NULL)
        OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180))
);
CREATE INDEX ix_venue_district ON venue (district_code) WHERE status = 'APPROVED';
CREATE INDEX ix_venue_owner    ON venue (owner_id);
CREATE INDEX ix_venue_geo      ON venue (latitude, longitude) WHERE status = 'APPROVED';
COMMENT ON TABLE venue IS 'Cụm sân — một địa điểm kinh doanh, gồm nhiều sân con';

CREATE TABLE venue_amenity (
    venue_id     BIGINT      NOT NULL REFERENCES venue(id) ON DELETE CASCADE,
    amenity_code VARCHAR(30) NOT NULL REFERENCES amenity(code),
    PRIMARY KEY (venue_id, amenity_code)
);

CREATE TABLE venue_image (
    id         BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    venue_id   BIGINT       NOT NULL REFERENCES venue(id) ON DELETE CASCADE,
    url        VARCHAR(500) NOT NULL,
    sort_order SMALLINT     NOT NULL DEFAULT 0,
    is_cover   BOOLEAN      NOT NULL DEFAULT FALSE
);
CREATE INDEX ix_venue_image ON venue_image (venue_id, sort_order);

-- Lịch sử duyệt hồ sơ cụm sân (UC-30). Lưu lý do từ chối để chủ sân sửa.
CREATE TABLE venue_approval (
    id         BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    venue_id   BIGINT      NOT NULL REFERENCES venue(id) ON DELETE CASCADE,
    admin_id   BIGINT      REFERENCES app_user(id),
    action     VARCHAR(20) NOT NULL,        -- SUBMIT | APPROVE | REJECT | SUSPEND
    reason     VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_reject_reason CHECK (action <> 'REJECT' OR reason IS NOT NULL)
);
CREATE INDEX ix_venue_approval ON venue_approval (venue_id, created_at DESC);

CREATE TABLE field (
    id         BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    venue_id   BIGINT      NOT NULL REFERENCES venue(id) ON DELETE CASCADE,
    name       VARCHAR(50) NOT NULL,        -- 'Sân 7 - A'
    type       field_type  NOT NULL,
    is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_field_name UNIQUE (venue_id, name)
);
CREATE INDEX ix_field_venue ON field (venue_id) WHERE is_active;
COMMENT ON TABLE field IS 'Sân con — đơn vị nhỏ nhất có thể đặt riêng';

-- Chính sách hủy / hoàn cọc do chủ sân cấu hình (UC-27, WF-12).
-- Ví dụ: (24h → 100%), (6h → 50%), (0h → 0%).
CREATE TABLE cancellation_policy (
    id             BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    venue_id       BIGINT   NOT NULL REFERENCES venue(id) ON DELETE CASCADE,
    hours_before   SMALLINT NOT NULL,
    refund_percent SMALLINT NOT NULL,
    CONSTRAINT ck_refund_percent CHECK (refund_percent BETWEEN 0 AND 100),
    CONSTRAINT ck_hours_before   CHECK (hours_before >= 0),
    CONSTRAINT uq_policy_step    UNIQUE (venue_id, hours_before)
);


-- ============================================================
-- V04__pricing.sql
-- ============================================================
-- =====================================================================
-- V4 — Nhóm GIÁ: bảng giá theo khung giờ, khuyến mãi, lịch sử giá
-- =====================================================================

-- Bảng giá chuẩn của chủ sân (UC-23).
-- time_span lưu bằng int4range = số phút tính từ 00:00, ví dụ 17:00–19:00
-- là int4range(1020, 1140). Dùng range thay vì hai cột start/end để có thể
-- áp ràng buộc EXCLUDE chống cấu hình chồng lấp khung giờ (lỗi UC-23/E1).
CREATE TABLE price_rule (
    id          BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    venue_id    BIGINT      NOT NULL REFERENCES venue(id) ON DELETE CASCADE,
    field_type  field_type  NOT NULL,
    day_type    day_type    NOT NULL,
    time_span   INT4RANGE   NOT NULL,
    base_price  NUMERIC(12,2) NOT NULL,
    multiplier  NUMERIC(4,2)  NOT NULL DEFAULT 1.00,
    label       VARCHAR(50),                -- 'Giờ vàng', 'Giờ thấp điểm'
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ck_price_positive CHECK (base_price > 0),
    CONSTRAINT ck_multiplier     CHECK (multiplier BETWEEN 0.1 AND 5),
    CONSTRAINT ck_time_span      CHECK (
        lower(time_span) >= 0 AND upper(time_span) <= 1440
        AND upper(time_span) > lower(time_span)),

    -- Không cho hai khung giờ giá của cùng một loại sân, cùng loại ngày
    -- đè lên nhau. Đây chính là lỗi "Khung giờ cài đặt giá bị chồng lấp"
    -- trong PRD mục 2.2.3.2 — chặn ngay ở tầng cơ sở dữ liệu.
    CONSTRAINT no_price_overlap EXCLUDE USING gist (
        venue_id   WITH =,
        field_type WITH =,
        day_type   WITH =,
        time_span  WITH &&
    )
);
CREATE INDEX ix_price_rule_lookup ON price_rule (venue_id, field_type, day_type);

-- Khuyến mãi: Flash Sale giờ chót (UC-24) và chiết khấu hợp đồng dài hạn.
CREATE TABLE promotion (
    id                BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    venue_id          BIGINT         NOT NULL REFERENCES venue(id) ON DELETE CASCADE,
    type              promotion_type NOT NULL,
    name              VARCHAR(100)   NOT NULL,
    discount_percent  SMALLINT       NOT NULL,
    -- Flash Sale: kích hoạt khi slot còn trống và cách giờ đá <= N giờ
    trigger_hours_before SMALLINT,
    -- Không giảm xuống dưới mức giá sàn này
    floor_price       NUMERIC(12,2),
    -- Chiết khấu hợp đồng: áp khi hợp đồng dài >= N tháng
    min_contract_months SMALLINT,
    applies_field_type  field_type,
    is_active         BOOLEAN        NOT NULL DEFAULT TRUE,
    valid_from        DATE,
    valid_to          DATE,
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT now(),

    CONSTRAINT ck_discount CHECK (discount_percent BETWEEN 1 AND 100),
    CONSTRAINT ck_flash_sale_config CHECK (
        type <> 'FLASH_SALE' OR trigger_hours_before IS NOT NULL),
    CONSTRAINT ck_valid_period CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);
CREATE INDEX ix_promotion_active ON promotion (venue_id, type) WHERE is_active;

-- Khung giờ mà Flash Sale được phép áp dụng (WF-12: chọn 09–15, 21–00...)
CREATE TABLE promotion_time_span (
    promotion_id BIGINT    NOT NULL REFERENCES promotion(id) ON DELETE CASCADE,
    time_span    INT4RANGE NOT NULL,
    PRIMARY KEY (promotion_id, time_span)
);


-- ============================================================
-- V05__bookings.sql
-- ============================================================
-- =====================================================================
-- V5 — Nhóm ĐẶT SÂN: đơn đặt, ô giờ, hợp đồng định kỳ, lịch sử giá
-- Đây là nhóm bảng quan trọng nhất của hệ thống.
-- =====================================================================

CREATE TABLE booking (
    id              BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    code            VARCHAR(20)  NOT NULL UNIQUE,      -- 'BK240905A17'
    kind            booking_kind NOT NULL DEFAULT 'SINGLE',
    status          booking_status NOT NULL DEFAULT 'HELD',
    venue_id        BIGINT       NOT NULL REFERENCES venue(id),
    user_id         BIGINT       REFERENCES app_user(id),
    team_id         BIGINT       REFERENCES team(id),

    total_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
    deposit_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,

    -- Khách vãng lai do chủ sân nhập khi khóa sân 1-tap (UC-22)
    guest_name      VARCHAR(120),
    guest_phone     VARCHAR(10),
    lock_reason     lock_reason,

    -- Thời điểm hết hạn giữ chỗ = created_at + 5 phút (UC-04, bước 4)
    hold_expires_at TIMESTAMPTZ,
    confirmed_at    TIMESTAMPTZ,
    cancelled_at    TIMESTAMPTZ,
    cancel_reason   VARCHAR(300),
    note            VARCHAR(500),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT ck_amounts CHECK (
        total_amount >= 0 AND deposit_amount >= 0
        AND deposit_amount <= total_amount + discount_amount),

    -- Đơn của khách online phải có người đặt; đơn khóa tay của chủ sân
    -- phải có tên khách vãng lai và lý do khóa.
    CONSTRAINT ck_booking_owner CHECK (
        (kind = 'OWNER_LOCK' AND lock_reason IS NOT NULL)
        OR (kind <> 'OWNER_LOCK' AND user_id IS NOT NULL)),

    -- Đơn đang giữ chỗ bắt buộc có hạn giữ chỗ
    CONSTRAINT ck_hold_expiry CHECK (status <> 'HELD' OR hold_expires_at IS NOT NULL)
);
CREATE INDEX ix_booking_user      ON booking (user_id, created_at DESC);
CREATE INDEX ix_booking_venue     ON booking (venue_id, status);
CREATE INDEX ix_booking_expiring  ON booking (hold_expires_at) WHERE status = 'HELD';
COMMENT ON TABLE booking IS 'Đơn đặt sân — một đơn có thể gồm nhiều ô giờ (đơn định kỳ)';

-- ---------------------------------------------------------------------
-- BẢNG QUAN TRỌNG NHẤT: mỗi bản ghi là MỘT ô giờ trên MỘT sân con.
-- Tách khỏi booking để một hợp đồng định kỳ 26 buổi vẫn chỉ là một
-- booking với 26 slot, và ràng buộc chống trùng chỉ cần đặt ở một nơi.
-- ---------------------------------------------------------------------
CREATE TABLE booking_slot (
    id          BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    booking_id  BIGINT      NOT NULL REFERENCES booking(id) ON DELETE CASCADE,
    field_id    BIGINT      NOT NULL REFERENCES field(id),
    play_date   DATE        NOT NULL,           -- ngày đá, phục vụ truy vấn lịch
    time_range  TSTZRANGE   NOT NULL,           -- [19:30, 21:00)
    price       NUMERIC(12,2) NOT NULL,
    status      slot_status NOT NULL DEFAULT 'HELD',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Thời lượng tối thiểu 60 phút, tối đa 4 tiếng (giả định Phase 0)
    CONSTRAINT ck_slot_duration CHECK (
        upper(time_range) - lower(time_range) BETWEEN INTERVAL '60 min' AND INTERVAL '4 hours'),
    CONSTRAINT ck_slot_bounds CHECK (NOT isempty(time_range)),
    CONSTRAINT ck_slot_price CHECK (price >= 0),

    -- ================================================================
    -- CHỐT CHẶN CUỐI CÙNG CHỐNG ĐẶT TRÙNG (PRD mục 2.1.3.2 — lỗi E2)
    -- Hai ô giờ giao nhau trên cùng một sân con không thể cùng tồn tại
    -- khi đang ở trạng thái giữ chỗ, đã xác nhận hoặc bị chủ sân khóa.
    -- Kể cả khi mã ứng dụng có lỗi, cơ sở dữ liệu vẫn từ chối bản ghi
    -- thứ hai với SQLSTATE 23P01 (exclusion_violation).
    -- ================================================================
    CONSTRAINT no_slot_overlap EXCLUDE USING gist (
        field_id   WITH =,
        time_range WITH &&
    ) WHERE (status IN ('HELD', 'CONFIRMED', 'LOCKED'))
);
CREATE INDEX ix_slot_field_date ON booking_slot (field_id, play_date);
CREATE INDEX ix_slot_booking    ON booking_slot (booking_id);
CREATE INDEX ix_slot_range      ON booking_slot USING gist (time_range);
COMMENT ON CONSTRAINT no_slot_overlap ON booking_slot IS
    'Chống double-booking ở tầng CSDL — tầng phòng vệ thứ ba sau UI và service';

-- Hợp đồng đặt sân định kỳ (UC-05)
CREATE TABLE recurring_contract (
    id               BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    booking_id       BIGINT   NOT NULL UNIQUE REFERENCES booking(id) ON DELETE CASCADE,
    weekdays         SMALLINT[] NOT NULL,        -- {3,5} = Thứ 3 và Thứ 5 (ISO: 1=T2)
    start_date       DATE     NOT NULL,
    end_date         DATE     NOT NULL,
    time_span        INT4RANGE NOT NULL,         -- 19:00–20:30 = (1140,1230)
    sessions_total   SMALLINT NOT NULL,
    sessions_skipped SMALLINT NOT NULL DEFAULT 0,
    discount_percent SMALLINT NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ck_contract_period  CHECK (end_date > start_date),
    CONSTRAINT ck_contract_session CHECK (sessions_total > 0 AND sessions_skipped >= 0),
    CONSTRAINT ck_contract_weekday CHECK (array_length(weekdays, 1) BETWEEN 1 AND 7)
);

-- Lịch sử tính giá: giải thích được vì sao đơn A rẻ hơn đơn B.
CREATE TABLE price_history (
    id              BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    booking_slot_id BIGINT        NOT NULL REFERENCES booking_slot(id) ON DELETE CASCADE,
    price_rule_id   BIGINT        REFERENCES price_rule(id),
    promotion_id    BIGINT        REFERENCES promotion(id),
    base_price      NUMERIC(12,2) NOT NULL,
    time_multiplier NUMERIC(4,2)  NOT NULL DEFAULT 1.00,
    day_multiplier  NUMERIC(4,2)  NOT NULL DEFAULT 1.00,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    final_price     NUMERIC(12,2) NOT NULL,
    computed_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX ix_price_history_slot ON price_history (booking_slot_id);


-- ============================================================
-- V06__payments.sql
-- ============================================================
-- =====================================================================
-- V6 — Nhóm THANH TOÁN: thanh toán cọc, giao dịch cổng, hoàn tiền
-- =====================================================================

CREATE TABLE payment (
    id              BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    booking_id      BIGINT         NOT NULL REFERENCES booking(id) ON DELETE CASCADE,
    method          payment_method NOT NULL,
    status          payment_status NOT NULL DEFAULT 'PENDING',
    amount          NUMERIC(12,2)  NOT NULL,

    -- Mã tham chiếu gửi sang cổng thanh toán (vnp_TxnRef)
    provider_ref    VARCHAR(64)    NOT NULL UNIQUE,
    provider_txn_no VARCHAR(64),                   -- mã giao dịch cổng trả về
    bank_code       VARCHAR(20),

    -- Chuyển khoản thủ công: ảnh bill và người duyệt (UC-25)
    bill_image_url  VARCHAR(500),
    verified_by     BIGINT         REFERENCES app_user(id),
    verified_at     TIMESTAMPTZ,

    expires_at      TIMESTAMPTZ,
    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),

    CONSTRAINT ck_payment_amount CHECK (amount > 0),
    CONSTRAINT ck_payment_paid   CHECK (status <> 'SUCCESS' OR paid_at IS NOT NULL)
);
CREATE INDEX ix_payment_booking ON payment (booking_id);
CREATE INDEX ix_payment_status  ON payment (status, created_at DESC);
COMMENT ON TABLE payment IS 'Một lần thanh toán cọc cho một đơn đặt sân';

-- ---------------------------------------------------------------------
-- Nhật ký giao dịch — BẢNG CHỈ GHI THÊM, KHÔNG SỬA, KHÔNG XÓA.
-- Mỗi lần cổng thanh toán gọi IPN đều được ghi lại nguyên văn payload.
-- Ràng buộc UNIQUE bên dưới là cơ chế chống xử lý trùng (idempotency):
-- VNPay có thể gọi lại IPN nhiều lần cho cùng một giao dịch, lần thứ hai
-- trở đi sẽ vi phạm UNIQUE và bị bỏ qua thay vì cộng tiền hai lần.
-- ---------------------------------------------------------------------
CREATE TABLE payment_transaction (
    id               BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    payment_id       BIGINT      NOT NULL REFERENCES payment(id) ON DELETE CASCADE,
    type             txn_type    NOT NULL DEFAULT 'DEPOSIT',
    amount           NUMERIC(12,2) NOT NULL,
    provider         VARCHAR(20) NOT NULL,
    provider_txn_no  VARCHAR(64) NOT NULL,
    response_code    VARCHAR(10),
    signature_valid  BOOLEAN     NOT NULL DEFAULT FALSE,
    raw_payload      JSONB       NOT NULL,
    received_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_provider_txn UNIQUE (provider, provider_txn_no, type)
);
CREATE INDEX ix_txn_payment ON payment_transaction (payment_id, received_at DESC);

CREATE TABLE refund (
    id             BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    payment_id     BIGINT         NOT NULL REFERENCES payment(id),
    amount         NUMERIC(12,2)  NOT NULL,
    refund_percent SMALLINT       NOT NULL,
    reason         VARCHAR(300)   NOT NULL,
    status         payment_status NOT NULL DEFAULT 'PENDING',
    approved_by    BIGINT         REFERENCES app_user(id),
    created_at     TIMESTAMPTZ    NOT NULL DEFAULT now(),
    completed_at   TIMESTAMPTZ,

    CONSTRAINT ck_refund_amount  CHECK (amount >= 0),
    CONSTRAINT ck_refund_percent CHECK (refund_percent BETWEEN 0 AND 100)
);
CREATE INDEX ix_refund_payment ON refund (payment_id);


-- ============================================================
-- V07__matchmaking.sql
-- ============================================================
-- =====================================================================
-- V7 — Nhóm GHÉP ĐỘI: bài đăng, yêu cầu tham gia, hội thoại
-- Một bảng match_post dùng chung cho cả ba loại bài đăng, thay vì ba bảng
-- riêng — vì cả ba có cùng vòng đời và cùng bộ trường lọc.
-- =====================================================================

CREATE TABLE match_post (
    id              BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    type            post_type   NOT NULL,
    status          post_status NOT NULL DEFAULT 'OPEN',

    -- Bài của đội (TEAM_FINDS_TEAM / TEAM_FINDS_PLAYER) luôn gắn với một
    -- đơn đặt sân đã xác nhận. Bài của người chơi lẻ (PLAYER_FINDS_TEAM)
    -- thì không có booking, chỉ có khung giờ rảnh và khu vực mong muốn.
    booking_id      BIGINT      REFERENCES booking(id) ON DELETE CASCADE,
    author_user_id  BIGINT      NOT NULL REFERENCES app_user(id),
    team_id         BIGINT      REFERENCES team(id),

    district_code   VARCHAR(10) REFERENCES district(code),
    play_date       DATE,
    time_span       INT4RANGE,

    required_level  skill_level,
    deal_note       VARCHAR(200),               -- kèo: 'Chia 5-5', 'Thua chịu nước'

    -- Chỉ dùng cho TEAM_FINDS_PLAYER
    slots_needed    SMALLINT,
    slots_filled    SMALLINT    NOT NULL DEFAULT 0,
    cost_kind       cost_type,
    cost_amount     NUMERIC(12,2),

    content         VARCHAR(500),
    expires_at      TIMESTAMPTZ NOT NULL,       -- = giờ bóng lăn
    closed_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Tối đa 10 người/bài đăng (PRD mục 2.1.6.1 — lỗi E1)
    CONSTRAINT ck_slots_needed CHECK (
        slots_needed IS NULL OR slots_needed BETWEEN 1 AND 10),
    CONSTRAINT ck_slots_filled CHECK (
        slots_needed IS NULL OR slots_filled BETWEEN 0 AND slots_needed),
    CONSTRAINT ck_recruit_fields CHECK (
        type <> 'TEAM_FINDS_PLAYER'
        OR (slots_needed IS NOT NULL AND cost_kind IS NOT NULL)),
    CONSTRAINT ck_team_post_booking CHECK (
        type = 'PLAYER_FINDS_TEAM' OR booking_id IS NOT NULL),
    CONSTRAINT ck_cost_amount CHECK (
        cost_kind IS DISTINCT FROM 'FIXED' OR cost_amount IS NOT NULL)
);
CREATE INDEX ix_post_browse ON match_post (type, status, play_date, district_code);
CREATE INDEX ix_post_author ON match_post (author_user_id, created_at DESC);
CREATE INDEX ix_post_expiry ON match_post (expires_at) WHERE status = 'OPEN';

-- Một người chơi lẻ không được đăng hai bài tìm đội đè giờ nhau
-- (PRD mục 2.1.6.2 — lỗi E6). Ràng buộc dùng int8range để so trùng ngày.
CREATE UNIQUE INDEX uq_player_post_per_slot
    ON match_post (author_user_id, play_date, time_span)
    WHERE type = 'PLAYER_FINDS_TEAM' AND status = 'OPEN';

CREATE TABLE join_request (
    id               BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    post_id          BIGINT         NOT NULL REFERENCES match_post(id) ON DELETE CASCADE,
    requester_user_id BIGINT        NOT NULL REFERENCES app_user(id),
    requester_team_id BIGINT        REFERENCES team(id),
    message          VARCHAR(300),
    status           request_status NOT NULL DEFAULT 'PENDING',
    level_warning_ack BOOLEAN       NOT NULL DEFAULT FALSE,  -- đã xác nhận cảnh báo lệch trình độ
    responded_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),

    -- Không cho gửi yêu cầu trùng lặp (lỗi E2 của UC-07)
    CONSTRAINT uq_request_once UNIQUE (post_id, requester_user_id)
);
CREATE INDEX ix_request_post ON join_request (post_id, status);
CREATE INDEX ix_request_user ON join_request (requester_user_id, created_at DESC);

-- Danh sách điểm danh của trận: thành viên đội + người chơi lẻ đã được duyệt
CREATE TABLE match_participant (
    booking_id  BIGINT      NOT NULL REFERENCES booking(id) ON DELETE CASCADE,
    user_id     BIGINT      NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    source      VARCHAR(20) NOT NULL DEFAULT 'TEAM',   -- TEAM | FREELANCE
    position    position_type,
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    cancelled_at TIMESTAMPTZ,
    PRIMARY KEY (booking_id, user_id)
);

CREATE TABLE conversation (
    id            BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    match_post_id BIGINT      REFERENCES match_post(id) ON DELETE SET NULL,
    booking_id    BIGINT      REFERENCES booking(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE conversation_member (
    conversation_id BIGINT NOT NULL REFERENCES conversation(id) ON DELETE CASCADE,
    user_id         BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE message (
    id              BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    conversation_id BIGINT      NOT NULL REFERENCES conversation(id) ON DELETE CASCADE,
    sender_id       BIGINT      NOT NULL REFERENCES app_user(id),
    content         VARCHAR(2000) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_message_conv ON message (conversation_id, created_at);
COMMENT ON TABLE message IS 'Nhật ký chat — dùng làm bằng chứng khi Admin xử lý khiếu nại';


-- ============================================================
-- V08__reviews_and_operations.sql
-- ============================================================
-- =====================================================================
-- V8 — Nhóm VẬN HÀNH: đánh giá, khiếu nại, thông báo, nhật ký kiểm toán
-- =====================================================================

CREATE TABLE review (
    id             BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    -- Mỗi đơn chỉ được đánh giá đúng một lần (PRD mục 2.1.7.2 — lỗi E2)
    booking_id     BIGINT      NOT NULL UNIQUE REFERENCES booking(id) ON DELETE CASCADE,
    venue_id       BIGINT      NOT NULL REFERENCES venue(id) ON DELETE CASCADE,
    user_id        BIGINT      NOT NULL REFERENCES app_user(id),
    pitch_rating   SMALLINT    NOT NULL,
    service_rating SMALLINT    NOT NULL,
    comment        VARCHAR(1000),
    owner_reply    VARCHAR(1000),
    replied_at     TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ck_pitch_rating   CHECK (pitch_rating BETWEEN 1 AND 5),
    CONSTRAINT ck_service_rating CHECK (service_rating BETWEEN 1 AND 5)
);
CREATE INDEX ix_review_venue ON review (venue_id, created_at DESC);

CREATE TABLE complaint_ticket (
    id               BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    code             VARCHAR(20)   NOT NULL UNIQUE,     -- 'TK-1042'
    reporter_id      BIGINT        NOT NULL REFERENCES app_user(id),
    target_kind      target_type   NOT NULL,
    target_id        BIGINT        NOT NULL,
    booking_id       BIGINT        REFERENCES booking(id),
    subject          VARCHAR(200)  NOT NULL,
    content          TEXT          NOT NULL,
    status           ticket_status NOT NULL DEFAULT 'NEW',
    assigned_admin_id BIGINT       REFERENCES app_user(id),
    resolution       TEXT,
    -- Hạn phản hồi khi Admin bấm "Yêu cầu bổ sung thông tin" (24h)
    info_due_at      TIMESTAMPTZ,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    closed_at        TIMESTAMPTZ,

    CONSTRAINT ck_ticket_closed CHECK (
        status NOT IN ('RESOLVED', 'CLOSED') OR resolution IS NOT NULL)
);
CREATE INDEX ix_ticket_status ON complaint_ticket (status, created_at DESC);

CREATE TABLE complaint_evidence (
    id         BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    ticket_id  BIGINT       NOT NULL REFERENCES complaint_ticket(id) ON DELETE CASCADE,
    url        VARCHAR(500) NOT NULL,
    media_type VARCHAR(20)  NOT NULL DEFAULT 'IMAGE',
    uploaded_by BIGINT      REFERENCES app_user(id),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE notification (
    id         BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    user_id    BIGINT       NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    type       VARCHAR(50)  NOT NULL,      -- BOOKING_CONFIRMED | MATCH_ACCEPTED ...
    title      VARCHAR(200) NOT NULL,
    body       VARCHAR(500),
    ref_kind   target_type,
    ref_id     BIGINT,
    is_read    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_notification_inbox ON notification (user_id, created_at DESC);
CREATE INDEX ix_notification_unread ON notification (user_id) WHERE NOT is_read;

-- Nhật ký kiểm toán: ai đã thay đổi gì. Dùng khi Admin phân xử khiếu nại
-- và khi giải thích các thay đổi trạng thái đơn hàng.
CREATE TABLE audit_log (
    id          BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    actor_id    BIGINT      REFERENCES app_user(id),
    action      VARCHAR(60) NOT NULL,       -- BOOKING_CANCEL | VENUE_APPROVE ...
    entity_kind target_type NOT NULL,
    entity_id   BIGINT      NOT NULL,
    before_data JSONB,
    after_data  JSONB,
    ip_address  INET,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_audit_entity ON audit_log (entity_kind, entity_id, created_at DESC);


-- ============================================================
-- V09__triggers_and_views.sql
-- ============================================================
-- =====================================================================
-- V9 — Trigger, hàm nghiệp vụ và view phục vụ truy vấn
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tự cập nhật cột updated_at
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_user_touch    BEFORE UPDATE ON app_user
    FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();
CREATE TRIGGER tg_venue_touch   BEFORE UPDATE ON venue
    FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();
CREATE TRIGGER tg_booking_touch BEFORE UPDATE ON booking
    FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();
CREATE TRIGGER tg_payment_touch BEFORE UPDATE ON payment
    FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

-- ---------------------------------------------------------------------
-- 2. Cập nhật điểm đánh giá trung bình của cụm sân sau mỗi review
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_refresh_venue_rating() RETURNS TRIGGER AS $$
DECLARE v_id BIGINT;
BEGIN
    v_id := COALESCE(NEW.venue_id, OLD.venue_id);
    UPDATE venue v
       SET avg_rating = COALESCE(sub.avg_rating, 0),
           rating_count = COALESCE(sub.cnt, 0)
      FROM (SELECT round(avg((pitch_rating + service_rating) / 2.0), 1) AS avg_rating,
                   count(*) AS cnt
              FROM review WHERE venue_id = v_id) sub
     WHERE v.id = v_id;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_review_rating AFTER INSERT OR UPDATE OR DELETE ON review
    FOR EACH ROW EXECUTE FUNCTION fn_refresh_venue_rating();

-- ---------------------------------------------------------------------
-- 3. Ghi nhật ký điểm uy tín và đồng bộ về hồ sơ người dùng
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_apply_reputation(
    p_user_id BIGINT, p_delta SMALLINT, p_reason VARCHAR,
    p_ref_kind target_type DEFAULT NULL, p_ref_id BIGINT DEFAULT NULL)
RETURNS SMALLINT AS $$
DECLARE v_new SMALLINT;
BEGIN
    UPDATE user_profile
       SET reputation_score = GREATEST(0, LEAST(100, reputation_score + p_delta))
     WHERE user_id = p_user_id
    RETURNING reputation_score INTO v_new;

    IF v_new IS NULL THEN
        RAISE EXCEPTION 'Khong tim thay ho so nguoi dung %', p_user_id;
    END IF;

    INSERT INTO reputation_log (user_id, delta, reason, ref_type, ref_id, balance_after)
    VALUES (p_user_id, p_delta, p_reason, p_ref_kind, p_ref_id, v_new);

    RETURN v_new;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_apply_reputation IS
    'Trừ/cộng điểm uy tín kèm ghi nhật ký. Bùng kèo < 1 tiếng: delta = -5';

-- ---------------------------------------------------------------------
-- 4. Kiểm tra một khung giờ còn trống hay không
--    (tầng phòng vệ thứ hai, trước khi INSERT vào booking_slot)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_is_slot_available(
    p_field_id BIGINT, p_range TSTZRANGE)
RETURNS BOOLEAN AS $$
BEGIN
    -- Không cho đặt khung giờ đã trôi qua (UC-04, lỗi E1)
    IF lower(p_range) <= now() THEN
        RETURN FALSE;
    END IF;

    RETURN NOT EXISTS (
        SELECT 1 FROM booking_slot
         WHERE field_id = p_field_id
           AND status IN ('HELD', 'CONFIRMED', 'LOCKED')
           AND time_range && p_range);
END;
$$ LANGUAGE plpgsql STABLE;

-- ---------------------------------------------------------------------
-- 5. Nhả các đơn quá hạn giữ chỗ 5 phút — được gọi bởi bộ lập lịch
--    (Spring Scheduler / node-cron) mỗi phút.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_release_expired_holds() RETURNS INTEGER AS $$
DECLARE v_count INTEGER;
BEGIN
    WITH expired AS (
        UPDATE booking
           SET status = 'CANCELLED_EXPIRED',
               cancelled_at = now(),
               cancel_reason = 'Het han giu cho 5 phut'
         WHERE status = 'HELD' AND hold_expires_at < now()
        RETURNING id)
    UPDATE booking_slot s
       SET status = 'RELEASED'
      FROM expired e
     WHERE s.booking_id = e.id;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- 6. View: lịch sân theo ngày, phục vụ màn hình WF-03 và WF-11
-- ---------------------------------------------------------------------
CREATE VIEW v_field_schedule AS
SELECT f.venue_id,
       f.id            AS field_id,
       f.name          AS field_name,
       f.type          AS field_type,
       s.play_date,
       lower(s.time_range) AS start_at,
       upper(s.time_range) AS end_at,
       s.price,
       s.status        AS slot_status,
       b.code          AS booking_code,
       b.kind          AS booking_kind,
       COALESCE(p.full_name, b.guest_name) AS customer_name
  FROM field f
  JOIN booking_slot s ON s.field_id = f.id
  JOIN booking b      ON b.id = s.booking_id
  LEFT JOIN user_profile p ON p.user_id = b.user_id
 WHERE s.status IN ('HELD', 'CONFIRMED', 'LOCKED');

-- ---------------------------------------------------------------------
-- 7. View: doanh thu theo ngày của từng cụm sân (dashboard WF-10)
-- ---------------------------------------------------------------------
-- Gộp theo từng đơn trước rồi mới gộp theo ngày, để tiền cọc của một đơn
-- định kỳ nhiều buổi không bị cộng trùng.
CREATE VIEW v_venue_daily_revenue AS
WITH per_booking AS (
    SELECT b.id           AS booking_id,
           b.venue_id,
           s.play_date,
           sum(s.price)   AS gross_amount,
           max(b.deposit_amount) / GREATEST(count(*) OVER (PARTITION BY b.id), 1) AS deposit_share
      FROM booking b
      JOIN booking_slot s ON s.booking_id = b.id
     WHERE b.status IN ('CONFIRMED', 'IN_PROGRESS', 'COMPLETED')
       AND s.status <> 'RELEASED'
     GROUP BY b.id, b.venue_id, s.play_date)
SELECT venue_id,
       play_date,
       count(*)            AS booking_count,
       sum(gross_amount)   AS gross_amount,
       round(sum(deposit_share), 2) AS deposit_amount
  FROM per_booking
 GROUP BY venue_id, play_date;


-- ============================================================
-- V10__seed_data.sql
-- ============================================================
-- =====================================================================
-- V10 — Dữ liệu mẫu (seed) phục vụ phát triển và demo
-- Mật khẩu mẫu của mọi tài khoản: 123456aA  (đã băm bằng BCrypt)
-- =====================================================================

INSERT INTO district (code, name, province) VALUES
 ('HN_CG',  'Cầu Giấy',      'Hà Nội'),
 ('HN_NTL', 'Nam Từ Liêm',   'Hà Nội'),
 ('HN_TX',  'Thanh Xuân',    'Hà Nội'),
 ('HN_HBT', 'Hai Bà Trưng',  'Hà Nội'),
 ('HN_LB',  'Long Biên',     'Hà Nội'),
 ('HN_HM',  'Hoàng Mai',     'Hà Nội');

INSERT INTO amenity (code, name, icon) VALUES
 ('LIGHT',    'Đèn cao áp',        'bulb'),
 ('PARKING',  'Bãi xe',            'car'),
 ('CANTEEN',  'Căng tin',          'cup'),
 ('WIFI',     'Wifi miễn phí',     'wifi'),
 ('LOCKER',   'Phòng thay đồ',     'door'),
 ('REFEREE',  'Trọng tài',         'whistle');

-- --------------------------------------------------------------- users
INSERT INTO app_user (id, phone, email, password_hash, role, status, phone_verified) VALUES
 (1, '0912345678', 'player1@example.com', '$2a$10$seedseedseedseedseedseXX', 'PLAYER', 'ACTIVE', TRUE),
 (2, '0987654321', 'player2@example.com', '$2a$10$seedseedseedseedseedseXX', 'PLAYER', 'ACTIVE', TRUE),
 (3, '0933111222', 'player3@example.com', '$2a$10$seedseedseedseedseedseXX', 'PLAYER', 'ACTIVE', TRUE),
 (4, '0977111222', 'owner1@example.com',  '$2a$10$seedseedseedseedseedseXX', 'OWNER',  'ACTIVE', TRUE),
 (5, '0977333444', 'owner2@example.com',  '$2a$10$seedseedseedseedseedseXX', 'OWNER',  'ACTIVE', TRUE),
 (9, '0900000000', 'admin@example.com',   '$2a$10$seedseedseedseedseedseXX', 'ADMIN',  'ACTIVE', TRUE);
SELECT setval(pg_get_serial_sequence('app_user','id'), 100);

INSERT INTO user_profile (user_id, full_name, district_code, skill_level, preferred_position, reputation_score, total_matches) VALUES
 (1, 'Nguyễn Văn A', 'HN_CG',  'GOOD',         'DF',  95, 37),
 (2, 'Trần Văn B',   'HN_NTL', 'BEGINNER',     'GK',  62, 11),
 (3, 'Lê Văn C',     'HN_TX',  'INTERMEDIATE', 'FW', 100,  4),
 (4, 'Phạm Văn D',   'HN_CG',  'BEGINNER',     'ANY',100,  0),
 (5, 'Hoàng Văn E',  'HN_NTL', 'BEGINNER',     'ANY',100,  0),
 (9, 'Quản trị hệ thống', 'HN_CG', 'BEGINNER', 'ANY',100,  0);

INSERT INTO team (id, name, captain_id, district_code, skill_level, reputation_score, total_matches) VALUES
 (1, 'FC Bách Khoa',  1, 'HN_CG',  'GOOD',         98, 24),
 (2, 'FC Sông Hồng',  3, 'HN_TX',  'INTERMEDIATE', 85, 11);
SELECT setval(pg_get_serial_sequence('team','id'), 100);

INSERT INTO team_member (team_id, user_id, role_in_team) VALUES
 (1, 1, 'CAPTAIN'), (1, 2, 'MEMBER'), (2, 3, 'CAPTAIN');

-- -------------------------------------------------------------- venues
INSERT INTO venue (id, owner_id, name, address, district_code, latitude, longitude,
                   phone, status, deposit_rate, bank_name, bank_account, bank_holder) VALUES
 (1, 4, 'Sân Cầu Giấy Center', 'Số 12 Trần Thái Tông, Cầu Giấy', 'HN_CG',
     21.030700, 105.782100, '0912345678', 'APPROVED', 0.300,
     'Vietcombank', '0123456789', 'CTY TNHH SAN CAU GIAY'),
 (2, 5, 'Sân Mỹ Đình A', 'Lê Đức Thọ, Nam Từ Liêm', 'HN_NTL',
     21.020500, 105.762300, '0987111222', 'APPROVED', 0.300,
     'Techcombank', '19001234', 'HOANG VAN E'),
 (3, 4, 'Sân Long Biên Sport', '45 Ngọc Lâm, Long Biên', 'HN_LB',
     21.045000, 105.870000, '0977111222', 'PENDING', 0.300, NULL, NULL, NULL);
SELECT setval(pg_get_serial_sequence('venue','id'), 100);

INSERT INTO venue_amenity (venue_id, amenity_code) VALUES
 (1,'LIGHT'), (1,'CANTEEN'), (1,'PARKING'), (1,'LOCKER'),
 (2,'LIGHT'), (2,'WIFI'), (2,'PARKING'),
 (3,'LIGHT'), (3,'PARKING');

INSERT INTO venue_approval (venue_id, admin_id, action, reason) VALUES
 (1, 9, 'APPROVE', NULL),
 (2, 9, 'APPROVE', NULL),
 (3, NULL, 'SUBMIT', NULL);

INSERT INTO field (id, venue_id, name, type) VALUES
 (1, 1, 'Sân 7 - A', 'F7'), (2, 1, 'Sân 7 - B', 'F7'),
 (3, 1, 'Sân 5 - C', 'F5'), (4, 1, 'Sân 5 - D', 'F5'),
 (5, 2, 'Sân 7 - 1', 'F7'), (6, 2, 'Sân 5 - 2', 'F5');
SELECT setval(pg_get_serial_sequence('field','id'), 100);

INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) VALUES
 (1, 24, 100), (1, 6, 50), (1, 0, 0),
 (2, 24, 100), (2, 12, 50), (2, 0, 0);

-- ------------------------------------------------------------- pricing
-- Khung giờ tính bằng phút từ 00:00: 15:00 = 900, 17:00 = 1020...
INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, multiplier, label) VALUES
 (1, 'F7', 'WEEKDAY', int4range(360, 540),   150000, 0.80, 'Giờ sáng'),
 (1, 'F7', 'WEEKDAY', int4range(540, 900),   180000, 0.90, 'Giờ thấp điểm'),
 (1, 'F7', 'WEEKDAY', int4range(900, 1020),  250000, 1.00, 'Giờ chiều'),
 (1, 'F7', 'WEEKDAY', int4range(1020, 1260), 300000, 1.20, 'Giờ vàng'),
 (1, 'F7', 'WEEKDAY', int4range(1260, 1440), 200000, 0.90, 'Giờ khuya'),
 (1, 'F7', 'WEEKEND', int4range(360, 1020),  280000, 1.10, 'Cuối tuần'),
 (1, 'F7', 'WEEKEND', int4range(1020, 1440), 350000, 1.30, 'Cuối tuần giờ vàng'),
 (1, 'F5', 'WEEKDAY', int4range(360, 1020),  180000, 0.90, 'Sân 5 ngày thường'),
 (1, 'F5', 'WEEKDAY', int4range(1020, 1440), 220000, 1.10, 'Sân 5 giờ vàng'),
 (2, 'F7', 'WEEKDAY', int4range(360, 1020),  200000, 0.90, 'Ngày thường'),
 (2, 'F7', 'WEEKDAY', int4range(1020, 1440), 250000, 1.20, 'Giờ vàng');

INSERT INTO promotion (id, venue_id, type, name, discount_percent,
                       trigger_hours_before, floor_price, is_active) VALUES
 (1, 1, 'FLASH_SALE', 'Flash Sale giờ chót', 20, 2, 120000, TRUE),
 (2, 2, 'FLASH_SALE', 'Xả sân giờ trưa',     25, 2, 100000, TRUE);
INSERT INTO promotion (id, venue_id, type, name, discount_percent, min_contract_months, is_active) VALUES
 (3, 1, 'CONTRACT_DISCOUNT', 'Chiết khấu hợp đồng 3 tháng', 10, 3, TRUE);
SELECT setval(pg_get_serial_sequence('promotion','id'), 100);

INSERT INTO promotion_time_span (promotion_id, time_span) VALUES
 (1, int4range(540, 900)), (1, int4range(1260, 1440)),
 (2, int4range(600, 900));

-- ------------------------------------------------------------ bookings
-- Đơn 1: đã xác nhận, đá vào ngày mai 19:30–21:00 trên sân 7A
INSERT INTO booking (id, code, kind, status, venue_id, user_id, team_id,
                     total_amount, deposit_amount, confirmed_at) VALUES
 (1, 'BK' || to_char(now(), 'YYMMDD') || 'A17', 'SINGLE', 'CONFIRMED', 1, 1, 1,
      450000, 135000, now());

-- Đơn 2: chuyển khoản, chờ chủ sân xác minh bill
INSERT INTO booking (id, code, kind, status, venue_id, user_id,
                     total_amount, deposit_amount) VALUES
 (2, 'BK' || to_char(now(), 'YYMMDD') || 'B02', 'SINGLE', 'PENDING_VERIFY', 2, 3,
      375000, 112500);

-- Đơn 3: chủ sân khóa sân cho khách gọi điện
INSERT INTO booking (id, code, kind, status, venue_id, guest_name, guest_phone,
                     lock_reason, total_amount, deposit_amount) VALUES
 (3, 'LK' || to_char(now(), 'YYMMDD') || 'C11', 'OWNER_LOCK', 'CONFIRMED', 1,
      'Anh Hùng', '0987654321', 'WALK_IN', 0, 0);
SELECT setval(pg_get_serial_sequence('booking','id'), 100);

INSERT INTO booking_slot (booking_id, field_id, play_date, time_range, price, status) VALUES
 (1, 1, (CURRENT_DATE + 1),
     tstzrange((CURRENT_DATE + 1) + TIME '19:30', (CURRENT_DATE + 1) + TIME '21:00', '[)'),
     450000, 'CONFIRMED'),
 (2, 5, (CURRENT_DATE + 2),
     tstzrange((CURRENT_DATE + 2) + TIME '17:00', (CURRENT_DATE + 2) + TIME '18:30', '[)'),
     375000, 'HELD'),
 (3, 3, (CURRENT_DATE + 1),
     tstzrange((CURRENT_DATE + 1) + TIME '16:30', (CURRENT_DATE + 1) + TIME '18:00', '[)'),
     0, 'LOCKED');

INSERT INTO payment (booking_id, method, status, amount, provider_ref, provider_txn_no, paid_at) VALUES
 (1, 'VNPAY', 'SUCCESS', 135000, 'REF-0001', '14237891', now()),
 (2, 'BANK_TRANSFER', 'PENDING', 112500, 'REF-0002', NULL, NULL);

INSERT INTO payment_transaction (payment_id, type, amount, provider, provider_txn_no,
                                 response_code, signature_valid, raw_payload) VALUES
 (1, 'DEPOSIT', 135000, 'VNPAY', '14237891', '00', TRUE,
  '{"vnp_ResponseCode":"00","vnp_Amount":13500000,"vnp_TxnRef":"REF-0001"}'::jsonb);

-- --------------------------------------------------------- matchmaking
INSERT INTO match_post (id, type, status, booking_id, author_user_id, team_id,
                        district_code, play_date, time_span, required_level,
                        deal_note, expires_at) VALUES
 (1, 'TEAM_FINDS_TEAM', 'OPEN', 1, 1, 1, 'HN_CG', (CURRENT_DATE + 1),
     int4range(1170, 1260), 'GOOD', 'Chia 5-5 tiền sân, có trọng tài',
     (CURRENT_DATE + 1) + TIME '19:30');

INSERT INTO match_post (id, type, status, booking_id, author_user_id, team_id,
                        district_code, play_date, time_span, required_level,
                        slots_needed, slots_filled, cost_kind, cost_amount, expires_at) VALUES
 (2, 'TEAM_FINDS_PLAYER', 'OPEN', 1, 1, 1, 'HN_CG', (CURRENT_DATE + 1),
     int4range(1170, 1260), 'INTERMEDIATE', 2, 0, 'FIXED', 30000,
     (CURRENT_DATE + 1) + TIME '19:30');

INSERT INTO match_post (id, type, status, author_user_id, district_code, play_date,
                        time_span, required_level, content, expires_at) VALUES
 (3, 'PLAYER_FINDS_TEAM', 'OPEN', 2, 'HN_NTL', (CURRENT_DATE + 1),
     int4range(1140, 1230), 'BEGINNER', 'Mình đá thủ môn, tối nay rảnh',
     (CURRENT_DATE + 1) + TIME '19:00');
SELECT setval(pg_get_serial_sequence('match_post','id'), 100);

INSERT INTO join_request (post_id, requester_user_id, requester_team_id, message, status) VALUES
 (1, 3, 2, 'Đội mình đá đều, kèo chia 5-5 nhé bạn', 'PENDING'),
 (2, 2, NULL, 'Mình đá thủ môn, tối nay tham gia được', 'PENDING');

INSERT INTO match_participant (booking_id, user_id, source, position) VALUES
 (1, 1, 'TEAM', 'DF');

-- --------------------------------------------------------- operations
INSERT INTO reputation_log (user_id, delta, reason, balance_after) VALUES
 (2, -5, 'Huy tham gia truoc gio da 45 phut', 62),
 (1,  1, 'Hoan thanh tran dau dung hen', 95);

INSERT INTO notification (user_id, type, title, body, ref_kind, ref_id) VALUES
 (1, 'BOOKING_CONFIRMED', 'Đặt sân thành công',
     'Sân Cầu Giấy Center - Sân 7A, 19:30 ngày mai', 'BOOKING', 1),
 (1, 'MATCH_REQUEST', 'FC Sông Hồng xin giao hữu',
     'Có 1 đội gửi yêu cầu giao hữu cho trận của bạn', 'BOOKING', 1);


