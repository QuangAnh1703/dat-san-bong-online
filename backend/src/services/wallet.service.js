'use strict';
const crypto = require('crypto');
const { AppError } = require('../lib/errors');

// Vi hoi vien theo cum san (PRD 2.2.6)

const vnd = (n) => `${Math.round(Number(n)).toLocaleString('vi-VN')}đ`;
const digits = (s) => String(s || '').replace(/\D/g, '');

function makeTopupCode() {
  const ymd = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  return `NP${ymd}${crypto.randomBytes(4).toString('hex').slice(0, 5).toUpperCase()}`;
}

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

/**
 * Khop chuyen khoan "NAP <ma>" (goi tu bank-match, trong transaction).
 */
async function applyTopup(c, txn, code) {
  const r = await c.query(
    `SELECT t.*, p.name AS plan_name, p.bonus, p.discount_percent, v.bank_account, v.name AS venue_name
       FROM wallet_topup t JOIN membership_plan p ON p.id = t.plan_id JOIN venue v ON v.id = t.venue_id
      WHERE t.code = $1 FOR UPDATE OF t`,
    [code]
  );
  const t = r.rows[0];
  const setTxn = (status, note) =>
    c.query(`UPDATE bank_transaction SET status = $2, topup_id = $3, note = $4 WHERE id = $1`, [
      txn.id,
      status,
      t ? t.id : null,
      note || null,
    ]);
  if (!t) {
    await setTxn('UNMATCHED', `Không tìm thấy lệnh nạp ${code}`);
    return { result: 'unmatched', transaction_id: txn.id };
  }
  if (txn.account_number && t.bank_account && digits(txn.account_number) !== digits(t.bank_account)) {
    await setTxn('UNMATCHED', 'Tài khoản nhận không khớp tài khoản cụm sân');
    return { result: 'unmatched', transaction_id: txn.id };
  }
  if (t.status !== 'PENDING') {
    await setTxn('UNMATCHED', 'Lệnh nạp đã được xử lý trước đó');
    return { result: 'unmatched', transaction_id: txn.id };
  }
  if (Number(txn.amount) < Number(t.amount)) {
    await setTxn('UNMATCHED', `Chuyển thiếu: gói cần ${vnd(t.amount)}`);
    await notify(c, t.user_id, 'WALLET_UNDERPAID', `Nạp gói ${t.plan_name} chưa thành công`, `Đã nhận ${vnd(txn.amount)}/${vnd(t.amount)}. Chủ sân sẽ đối soát và liên hệ bạn.`);
    return { result: 'underpaid', transaction_id: txn.id };
  }

  const w = await c.query(
    `INSERT INTO member_wallet (user_id, venue_id) VALUES ($1, $2)
     ON CONFLICT (user_id, venue_id) DO UPDATE SET updated_at = now()
     RETURNING id, status, plan_id`,
    [t.user_id, t.venue_id]
  );
  const wallet = w.rows[0];
  if (wallet.status === 'FROZEN') {
    await setTxn('REFUND_PENDING', 'Ví hội viên đang bị đóng băng');
    return { result: 'refund_pending', transaction_id: txn.id };
  }
  await addTxn(c, wallet.id, 'TOPUP', Number(txn.amount), { note: `Nạp gói ${t.plan_name}` });
  let balance = Number(txn.amount);
  if (Number(t.bonus) > 0) balance = await addTxn(c, wallet.id, 'BONUS', Number(t.bonus), { note: `Tặng kèm gói ${t.plan_name}` });
  // Gia han len hang goi tot hon (giam gia cao hon), khong ha hang
  await c.query(
    `UPDATE member_wallet w SET plan_id = $2
      WHERE w.id = $1 AND (w.plan_id IS NULL OR
            (SELECT discount_percent FROM membership_plan WHERE id = w.plan_id) <= $3)`,
    [wallet.id, t.plan_id, t.discount_percent]
  );
  await c.query(`UPDATE wallet_topup SET status = 'PAID', paid_at = now() WHERE id = $1`, [t.id]);
  await setTxn('APPLIED');
  await notify(
    c,
    t.user_id,
    'WALLET_TOPUP',
    `Đã kích hoạt gói ${t.plan_name} · ${t.venue_name}`,
    `Ví hội viên được cộng ${vnd(Number(txn.amount) + Number(t.bonus))}. Số dư hiện tại ${vnd(balance)}.`,
    'VENUE',
    t.venue_id
  );
  return { result: 'confirmed', transaction_id: txn.id };
}

async function confirmBooking(c, b, by) {
  await c.query(
    `UPDATE booking SET status = 'CONFIRMED', confirmed_at = now(), hold_expires_at = NULL WHERE id = $1`,
    [b.id]
  );
  await c.query(`UPDATE booking_slot SET status = 'CONFIRMED' WHERE booking_id = $1 AND status = 'HELD'`, [b.id]);
  await c.query(`UPDATE payment SET status = 'CANCELLED', updated_at = now() WHERE booking_id = $1 AND status = 'PENDING'`, [b.id]);
  await c.query(`UPDATE bank_transaction SET status = 'APPLIED' WHERE booking_id = $1 AND status = 'PARTIAL'`, [b.id]);
  await notify(c, b.user_id, 'BOOKING_CONFIRMED', `Đặt sân thành công · ${b.code}`, `Đã thanh toán cọc bằng ví hội viên ${b.venue_name}.`, 'BOOKING', b.id);
  await notify(c, b.owner_id, 'BOOKING_PAID', `Đơn ${b.code} đã nhận cọc`, `Khách trả cọc bằng ví hội viên.`, 'BOOKING', b.id);
  void by;
}

/**
 * Tra coc bang vi hoi vien: ap % giam cua goi len tien san, tru vi; thieu thi phan con lai chuyen VietQR.
 */
async function payBooking(c, bookingCode, user) {
  const r = await c.query(
    `SELECT b.*, v.owner_id, v.name AS venue_name,
            (SELECT COALESCE(sum(price), 0) FROM booking_slot s WHERE s.booking_id = b.id) AS field_total
       FROM booking b JOIN venue v ON v.id = b.venue_id WHERE b.code = $1 FOR UPDATE OF b`,
    [bookingCode]
  );
  const b = r.rows[0];
  if (!b) throw new AppError('BOOKING_NOT_FOUND');
  if (b.user_id !== user.id) throw new AppError('FORBIDDEN');
  if (b.status !== 'HELD') throw new AppError('INVALID_STATUS', { details: { status: b.status } });
  if (!b.hold_expires_at || new Date(b.hold_expires_at) <= new Date()) throw new AppError('HOLD_EXPIRED');
  const used = await c.query(`SELECT 1 FROM payment WHERE booking_id = $1 AND method = 'WALLET' AND status = 'SUCCESS'`, [b.id]);
  if (used.rowCount > 0) throw new AppError('INVALID_OPERATION', { message: 'Đơn đã trả bằng ví hội viên' });

  const w = await c.query(
    `SELECT w.id, w.balance, w.status, COALESCE(p.discount_percent, 0) AS discount_percent, p.name AS plan_name
       FROM member_wallet w LEFT JOIN membership_plan p ON p.id = w.plan_id
      WHERE w.user_id = $1 AND w.venue_id = $2 FOR UPDATE OF w`,
    [user.id, b.venue_id]
  );
  const wallet = w.rows[0];
  if (!wallet || Number(wallet.balance) <= 0) throw new AppError('WALLET_EMPTY');
  if (wallet.status !== 'ACTIVE') throw new AppError('WALLET_FROZEN');

  // Giam them % tien san (khong giam dich vu), giu nguyen ti le coc
  const discount = Math.round((Number(b.field_total) * Number(wallet.discount_percent)) / 100);
  const oldTotal = Number(b.total_amount);
  const newTotal = oldTotal - discount;
  const newDeposit = oldTotal > 0 ? Math.round((Number(b.deposit_amount) * newTotal) / oldTotal) : 0;
  if (discount > 0) {
    await c.query(
      `UPDATE booking SET total_amount = $2, deposit_amount = $3, discount_amount = discount_amount + $4 WHERE id = $1`,
      [b.id, newTotal, newDeposit, discount]
    );
  }
  const bank = await c.query(
    `SELECT COALESCE(sum(amount), 0) AS s FROM bank_transaction WHERE booking_id = $1 AND status IN ('PARTIAL', 'APPLIED')`,
    [b.id]
  );
  const due = Math.max(0, newDeposit - Number(bank.rows[0].s));
  const pay = Math.min(Number(wallet.balance), due);
  if (pay > 0) {
    await addTxn(c, wallet.id, 'PAY', -pay, { bookingId: b.id, note: `Cọc đơn ${b.code}`, by: user.id });
    await c.query(
      `INSERT INTO payment (booking_id, method, status, amount, provider_ref, paid_at)
       VALUES ($1, 'WALLET', 'SUCCESS', $2, $3, now())`,
      [b.id, pay, `WL-${b.code}-${crypto.randomBytes(3).toString('hex')}`]
    );
  }
  const remaining = due - pay;
  if (remaining <= 0) {
    await confirmBooking(c, b, user.id);
    return { result: 'confirmed', discount, paid_from_wallet: pay, remaining: 0, deposit: newDeposit };
  }
  return { result: 'partial', discount, paid_from_wallet: pay, remaining, deposit: newDeposit };
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
  makeTopupCode,
  applyTopup,
  payBooking,
  refundCancelledWalletPayments,
  freezeOwnerWallets,
  addTxn,
  notify,
  vnd,
};
