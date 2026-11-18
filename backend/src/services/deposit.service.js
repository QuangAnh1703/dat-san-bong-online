'use strict';

/**
 * Cong thanh toan bao da nhan tien coc: chot payment SUCCESS, xac nhan don va bao hai ben.
 * pm: dong payment JOIN booking/venue (booking_code, booking_status, user_id, owner_id, venue_name), da khoa FOR UPDATE.
 * Tra ve 'success', hoac 'late' neu tien ve khi don da het han / bi huy (ghi nhan de hoan qua khieu nai).
 */
async function settlePaidDeposit(c, pm, { gateway, txnNo, bankCode }) {
  await c.query(
    `UPDATE payment SET status = 'SUCCESS', paid_at = now(), provider_txn_no = $2, bank_code = $3, updated_at = now()
      WHERE id = $1`,
    [pm.id, txnNo || null, bankCode || null]
  );

  if (['HELD', 'PENDING_VERIFY'].includes(pm.booking_status)) {
    await c.query(
      `UPDATE booking SET status = 'CONFIRMED', confirmed_at = now(), hold_expires_at = NULL WHERE id = $1`,
      [pm.booking_id]
    );
    await c.query(`UPDATE booking_slot SET status = 'CONFIRMED' WHERE booking_id = $1 AND status = 'HELD'`, [
      pm.booking_id,
    ]);
    await c.query(
      `INSERT INTO notification (user_id, type, title, body, ref_kind, ref_id) VALUES
         ($1, 'BOOKING_CONFIRMED', $3, $4, 'BOOKING', $6),
         ($2, 'BOOKING_PAID', $5, $4, 'BOOKING', $6)`,
      [
        pm.user_id,
        pm.owner_id,
        `Đặt sân thành công · ${pm.booking_code}`,
        `Đã nhận ${Number(pm.amount).toLocaleString('vi-VN')}đ tiền cọc qua ${gateway} tại ${pm.venue_name}.`,
        `Đơn ${pm.booking_code} đã thanh toán cọc qua ${gateway}`,
        pm.booking_id,
      ]
    );
    return 'success';
  }

  await c.query(
    `INSERT INTO notification (user_id, type, title, body, ref_kind, ref_id)
     VALUES ($1, 'PAYMENT_AFTER_CANCEL', $2, $3, 'BOOKING', $4)`,
    [
      pm.user_id,
      `Đơn ${pm.booking_code} không còn hiệu lực`,
      'Đã nhận tiền cọc nhưng đơn đã hết hạn giữ chỗ hoặc bị hủy. Hãy gửi khiếu nại để được hoàn tiền.',
      pm.booking_id,
    ]
  );
  return 'late';
}

module.exports = { settlePaidDeposit };
