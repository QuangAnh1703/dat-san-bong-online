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
