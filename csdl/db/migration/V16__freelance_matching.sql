-- =====================================================================
-- V16 — Ghép người chơi lẻ (PRD mục 2.1.6)
-- Dùng lại match_post / join_request của V7, bổ sung các trường còn thiếu.
-- =====================================================================

-- Vị trí: với TEAM_FINDS_PLAYER là vị trí ưu tiên cần tuyển,
-- với PLAYER_FINDS_TEAM là vị trí sở trường của người đăng.
ALTER TABLE match_post ADD COLUMN IF NOT EXISTS positions position_type[];

-- Người chơi lẻ có thể chọn nhiều khu vực mong muốn; district_code giữ khu vực đầu tiên để lọc nhanh.
ALTER TABLE match_post ADD COLUMN IF NOT EXISTS district_codes VARCHAR(10)[];

-- Đẩy bài tuyển lên đầu danh sách khi có người chơi lẻ bùng kèo sát giờ (lỗi E3 mục 2.1.6.1)
ALTER TABLE match_post ADD COLUMN IF NOT EXISTS bumped_at TIMESTAMPTZ;

-- join_request dùng cho cả hai chiều:
--   APPLY  : người chơi lẻ xin vào bài tuyển của đội
--   INVITE : đội trưởng mời người chơi lẻ (bài PLAYER_FINDS_TEAM) vào một trận đã đặt
ALTER TABLE join_request ADD COLUMN IF NOT EXISTS kind VARCHAR(10) NOT NULL DEFAULT 'APPLY';
ALTER TABLE join_request ADD COLUMN IF NOT EXISTS booking_id BIGINT REFERENCES booking(id) ON DELETE CASCADE;
-- Lời mời không phản hồi sau 30 phút thì tự hết hạn (lỗi E7 mục 2.1.6.2)
ALTER TABLE join_request ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

ALTER TABLE join_request ADD CONSTRAINT ck_request_kind CHECK (kind IN ('APPLY', 'INVITE'));
ALTER TABLE join_request ADD CONSTRAINT ck_invite_booking CHECK (kind <> 'INVITE' OR booking_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS ix_request_expiry ON join_request (expires_at) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS ix_participant_user ON match_participant (user_id) WHERE cancelled_at IS NULL;
