-- =====================================================================
-- V12 — Thêm rating & comment vào booking
-- =====================================================================

ALTER TABLE booking ADD COLUMN rating SMALLINT DEFAULT NULL;
ALTER TABLE booking ADD COLUMN rating_comment VARCHAR(500);
ALTER TABLE booking ADD COLUMN rated_at TIMESTAMPTZ;

-- Constraint: rating từ 1-5
ALTER TABLE booking ADD CONSTRAINT ck_rating CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));

CREATE INDEX ix_booking_rating ON booking (rating) WHERE rating IS NOT NULL;

COMMENT ON COLUMN booking.rating IS 'Đánh giá sân từ 1-5 (NULL nếu chưa đánh giá)';
COMMENT ON COLUMN booking.rating_comment IS 'Bình luận về trải nghiệm';
COMMENT ON COLUMN booking.rated_at IS 'Thời điểm gửi đánh giá';
