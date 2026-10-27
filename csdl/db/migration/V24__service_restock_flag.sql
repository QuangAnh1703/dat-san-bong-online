-- =====================================================================
-- V24 — Trả lại kho các món đặt kèm khi đơn hết hạn / bị hủy (PRD 2.2.5)
-- =====================================================================

-- Job nền trả kho đúng một lần cho mỗi đơn
ALTER TABLE booking ADD COLUMN services_restocked BOOLEAN NOT NULL DEFAULT FALSE;
