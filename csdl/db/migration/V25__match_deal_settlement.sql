-- =====================================================================
-- V25 — Kèo chia tiền trận cáp kèo theo kết quả (thua trả bao nhiêu %)
-- =====================================================================

-- Tỷ lệ tiền sân đội THUA chịu, thống nhất trước trận. 50 = chia đôi (hòa luôn chia đôi)
ALTER TABLE match_post ADD COLUMN loser_percent SMALLINT NOT NULL DEFAULT 50;
ALTER TABLE match_post ADD CONSTRAINT ck_post_loser_percent CHECK (loser_percent BETWEEN 50 AND 100);

-- Kết quả chia tiền chốt cùng lúc với tỷ số: mỗi đội gánh bao nhiêu trên tổng chi phí trận
ALTER TABLE match_result ADD COLUMN loser_percent SMALLINT;
ALTER TABLE match_result ADD COLUMN total_amount NUMERIC(12,2);
ALTER TABLE match_result ADD COLUMN home_amount NUMERIC(12,2);
ALTER TABLE match_result ADD COLUMN away_amount NUMERIC(12,2);
