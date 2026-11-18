-- =====================================================================
-- V26 — Chủ sân nhập tỷ số trận cáp kèo (thay cho hai đội trưởng tự nhập)
-- =====================================================================

-- Người nhập tỷ số (chủ sân hoặc admin). NULL = kết quả cũ do hai đội trưởng tự khớp
ALTER TABLE match_result ADD COLUMN recorded_by BIGINT REFERENCES app_user(id);
