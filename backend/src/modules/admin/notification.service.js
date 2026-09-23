'use strict';

/**
 * SCRUM-120: Send notification to venue owner when venue is rejected
 * Notification includes rejection reason
 */
async function sendVenueRejectionNotification(dbConnection, ownerId, venueId, reason) {
  try {
    const venueRes = await dbConnection.query(
      `SELECT name FROM venue WHERE id = $1`,
      [venueId]
    );

    if (venueRes.rowCount === 0) return;

    const venueName = venueRes.rows[0].name;
    const title = `Hồ sơ cụm sân "${venueName}" bị từ chối`;
    const body = reason || 'Hồ sơ cụm sân của bạn bị từ chối duyệt. Vui lòng kiểm tra lý do và sửa chữa.';

    await dbConnection.query(
      `INSERT INTO notification (user_id, type, title, body, ref_kind, ref_id, created_at)
       VALUES ($1, 'VENUE_REJECTED', $2, $3, 'VENUE', $4, now())`,
      [ownerId, title, body, venueId]
    );
  } catch (error) {
    console.error('Error sending rejection notification:', error);
  }
}

/**
 * Send notification to venue owner when venue is approved
 */
async function sendVenueApprovalNotification(dbConnection, ownerId, venueId) {
  try {
    const venueRes = await dbConnection.query(
      `SELECT name FROM venue WHERE id = $1`,
      [venueId]
    );

    if (venueRes.rowCount === 0) return;

    const venueName = venueRes.rows[0].name;
    const title = `Hồ sơ cụm sân "${venueName}" được phê duyệt`;
    const body = 'Chúc mừng! Cụm sân của bạn đã được phê duyệt. Bạn có thể bắt đầu nhận đặt sân.';

    await dbConnection.query(
      `INSERT INTO notification (user_id, type, title, body, ref_kind, ref_id, created_at)
       VALUES ($1, 'VENUE_APPROVED', $2, $3, 'VENUE', $4, now())`,
      [ownerId, title, body, venueId]
    );
  } catch (error) {
    console.error('Error sending approval notification:', error);
  }
}

module.exports = {
  sendVenueRejectionNotification,
  sendVenueApprovalNotification,
};
