'use strict';

// Vi hoi vien theo cum san (PRD 2.2.6)

const vnd = (n) => `${Math.round(Number(n)).toLocaleString('vi-VN')}đ`;

async function notify(c, userId, type, title, body, refKind = null, refId = null) {
  await c.query(
    `INSERT INTO notification (user_id, type, title, body, ref_kind, ref_id) VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, type, title, body, refKind, refId]
  );
}

async function addTxn(c, walletId, type, amount, { bookingId = null, note = null, by = null } = {}) {
  const w = await c.query(
    `UPDATE member_wallet SET balance = balance + $2, updated_at = now() WHERE id = $1 RETURNING balance`,
    [walletId, amount]
  );
  await c.query(
    `INSERT INTO wallet_txn (wallet_id, type, amount, balance_after, booking_id, note, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [walletId, type, amount, w.rows[0].balance, bookingId, note, by]
  );
  return Number(w.rows[0].balance);
}

// Job nen: don het han / bi huy da tru vi -> hoan lai vi
async function refundCancelledWalletPayments(c) {
  const r = await c.query(
    `UPDATE payment p SET status = 'REFUNDED', updated_at = now()
       FROM booking b
      WHERE b.id = p.booking_id AND p.method = 'WALLET' AND p.status = 'SUCCESS'
        AND (b.status::text LIKE 'CANCELLED%' OR b.status = 'REFUNDED')
      RETURNING p.amount, b.id AS booking_id, b.code, b.user_id, b.venue_id`
  );
  for (const row of r.rows) {
    const w = await c.query(`SELECT id FROM member_wallet WHERE user_id = $1 AND venue_id = $2`, [row.user_id, row.venue_id]);
    if (!w.rows[0]) continue;
    await addTxn(c, w.rows[0].id, 'REFUND', Number(row.amount), { bookingId: row.booking_id, note: `Hoàn cọc đơn ${row.code}` });
    await notify(c, row.user_id, 'WALLET_REFUND', `Hoàn ${vnd(row.amount)} vào ví hội viên`, `Đơn ${row.code} đã hủy / hết hạn nên tiền ví được hoàn lại.`, 'BOOKING', row.booking_id);
  }
  return r.rowCount;
}

// Cum san / chu san bi khoa: dong bang vi con tien, bao admin lam thu tuc hoan
async function freezeOwnerWallets(c, ownerId) {
  const r = await c.query(
    `UPDATE member_wallet w SET status = 'FROZEN', updated_at = now()
       FROM venue v
      WHERE v.id = w.venue_id AND v.owner_id = $1 AND w.status = 'ACTIVE' AND w.balance > 0
      RETURNING w.user_id, w.balance, v.name AS venue_name`,
    [ownerId]
  );
  if (r.rowCount === 0) return 0;
  const total = r.rows.reduce((s, x) => s + Number(x.balance), 0);
  const admins = await c.query(`SELECT id FROM app_user WHERE role = 'ADMIN' AND status = 'ACTIVE'`);
  for (const a of admins.rows) {
    await notify(c, a.id, 'WALLET_FROZEN_ADMIN', `${r.rowCount} ví hội viên bị đóng băng`, `Tổng ${vnd(total)} tiền đọng cần hoàn trả cho người chơi.`);
  }
  for (const w of r.rows) {
    await notify(c, w.user_id, 'WALLET_FROZEN', `Ví hội viên ${w.venue_name} tạm khóa`, `Cụm sân ngừng hoạt động. Quản trị viên sẽ liên hệ hoàn trả ${vnd(w.balance)}.`);
  }
  return r.rowCount;
}

module.exports = {
  refundCancelledWalletPayments,
  freezeOwnerWallets,
  addTxn,
  notify,
  vnd,
};
