'use strict';

// Tu khop chuyen khoan VietQR voi don dat san (PRD 2.3.4).
// Moi ham nhan client dang trong transaction; nguoi goi lo BEGIN/COMMIT.

const UNDERPAID_GRACE_MINUTES = 5;
const ACCEPT_STATUSES = ['HELD', 'PENDING_VERIFY'];

const vnd = (n) => `${Math.round(Number(n)).toLocaleString('vi-VN')}đ`;
const digits = (s) => String(s || '').replace(/\D/g, '');

function config() {
  const apiKey = process.env.BANK_WEBHOOK_API_KEY || '';
  return { apiKey, mock: !apiKey && process.env.NODE_ENV !== 'production' };
}

// Ngan hang thuong bo dau cach / ky tu dac biet va doi sang chu hoa, nen so khop tren chuoi da lam sach
const clean = (content) => String(content || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

function extractBookingCode(content) {
  const m = clean(content).match(/BK\d{6}[A-Z0-9]{5}/);
  return m ? m[0] : null;
}

/**
 * Doc noi dung chuyen khoan -> doi tuong can gach no:
 *   QUY <ma tran> <SDT>  -> phan chia tien cua thanh vien (PRD 2.1.8)
 *   NAP <ma lenh nap>    -> mua goi hoi vien (PRD 2.2.6)
 *   GIAI <ma dang ky>    -> le phi giai dau (PRD 2.1.9)
 *   SANBONG <ma don>     -> tien coc dat san
 */
function parseTarget(content) {
  const s = clean(content);
  let m = s.match(/QUY(BK\d{6}[A-Z0-9]{5})(0\d{9})/);
  if (m) return { kind: 'SPLIT', bookingCode: m[1], phone: m[2] };
  m = s.match(/NP\d{6}[A-Z0-9]{5}/);
  if (m) return { kind: 'TOPUP', code: m[0] };
  m = s.match(/GI\d{6}[A-Z0-9]{5}/);
  if (m) return { kind: 'TOURNAMENT', code: m[0] };
  m = s.match(/BK\d{6}[A-Z0-9]{5}/);
  if (m) return { kind: 'BOOKING', code: m[0] };
  return null;
}

// So tai khoan se nhan tien cho mot noi dung chuyen khoan (dung cho API gia lap)
async function accountFor(c, content) {
  const t = parseTarget(content);
  if (!t) return null;
  const sql = {
    SPLIT: [`SELECT sb.bank_account, sb.bank_name FROM split_bill sb JOIN booking b ON b.id = sb.booking_id WHERE b.code = $1`, t.bookingCode],
    TOPUP: [`SELECT v.bank_account, v.bank_name FROM wallet_topup w JOIN venue v ON v.id = w.venue_id WHERE w.code = $1`, t.code],
    TOURNAMENT: [`SELECT v.bank_account, v.bank_name FROM tournament_team tt JOIN tournament x ON x.id = tt.tournament_id
                  JOIN venue v ON v.id = x.venue_id WHERE tt.fee_code = $1`, t.code],
    BOOKING: [`SELECT v.bank_account, v.bank_name FROM booking b JOIN venue v ON v.id = b.venue_id WHERE b.code = $1`, t.code],
  }[t.kind];
  const r = await c.query(sql[0], [sql[1]]);
  return r.rows[0] || null;
}

async function notify(c, userId, type, title, body, bookingId) {
  await c.query(
    `INSERT INTO notification (user_id, type, title, body, ref_kind, ref_id) VALUES ($1, $2, $3, $4, 'BOOKING', $5)`,
    [userId, type, title, body, bookingId]
  );
}

async function setTxn(c, txnId, status, bookingId, note) {
  await c.query(`UPDATE bank_transaction SET status = $2, booking_id = $3, note = $4 WHERE id = $1`, [
    txnId,
    status,
    bookingId,
    note || null,
  ]);
}

async function lockBooking(c, code) {
  const r = await c.query(
    `SELECT b.id, b.code, b.status, b.user_id, b.deposit_amount, b.hold_expires_at,
            v.owner_id, v.name AS venue_name, v.bank_account,
            (SELECT min(lower(s.time_range)) FROM booking_slot s WHERE s.booking_id = b.id) AS starts_at
       FROM booking b JOIN venue v ON v.id = b.venue_id
      WHERE b.code = $1 FOR UPDATE OF b`,
    [code]
  );
  return r.rows[0] || null;
}

// Tien chuyen khoan da khop + tien da tru tu vi hoi vien
async function receivedFor(c, bookingId) {
  const r = await c.query(
    `SELECT (SELECT COALESCE(sum(amount), 0) FROM bank_transaction
              WHERE booking_id = $1 AND status IN ('PARTIAL', 'APPLIED'))
          + (SELECT COALESCE(sum(amount), 0) FROM payment
              WHERE booking_id = $1 AND method = 'WALLET' AND status = 'SUCCESS') AS total`,
    [bookingId]
  );
  return Number(r.rows[0].total);
}

async function confirmPaid(c, b, total, verifiedBy) {
  const bankOnly = Number(
    (
      await c.query(
        `SELECT COALESCE(sum(amount), 0) AS s FROM bank_transaction WHERE booking_id = $1 AND status IN ('PARTIAL', 'APPLIED')`,
        [b.id]
      )
    ).rows[0].s
  );
  await c.query(
    `UPDATE booking SET status = 'CONFIRMED', confirmed_at = now(), hold_expires_at = NULL,
                        cancelled_at = NULL, cancel_reason = NULL
      WHERE id = $1`,
    [b.id]
  );
  await c.query(`UPDATE bank_transaction SET status = 'APPLIED' WHERE booking_id = $1 AND status = 'PARTIAL'`, [b.id]);

  // Don da bao chuyen khoan thu cong -> dung lai payment PENDING do, khong thi tao moi
  const upd = await c.query(
    `UPDATE payment SET status = 'SUCCESS', paid_at = now(), verified_by = $2, verified_at = now(), updated_at = now()
      WHERE booking_id = $1 AND method = 'BANK_TRANSFER' AND status = 'PENDING'`,
    [b.id, verifiedBy]
  );
  if (upd.rowCount === 0) {
    await c.query(
      `INSERT INTO payment (booking_id, method, status, amount, provider_ref, paid_at, verified_by, verified_at)
       VALUES ($1, 'BANK_TRANSFER', 'SUCCESS', $2, $3, now(), $4, now())`,
      [b.id, bankOnly, `BANK-${b.code}-${Date.now().toString(36)}`, verifiedBy]
    );
  }
  await c.query(`UPDATE payment SET status = 'CANCELLED', updated_at = now() WHERE booking_id = $1 AND status = 'PENDING'`, [
    b.id,
  ]);

  await notify(
    c,
    b.user_id,
    'BOOKING_CONFIRMED',
    `Đặt sân thành công · ${b.code}`,
    `Đã nhận ${vnd(total)} tiền cọc chuyển khoản tại ${b.venue_name}.`,
    b.id
  );
  await notify(c, b.owner_id, 'BOOKING_PAID', `Đơn ${b.code} đã nhận cọc`, `Hệ thống đã tự đối soát ${vnd(total)} chuyển khoản.`, b.id);
}

async function markRefund(c, txn, b, reason) {
  await setTxn(c, txn.id, 'REFUND_PENDING', b.id, reason);
  await notify(
    c,
    b.user_id,
    'PAYMENT_REFUND_PENDING',
    `Đơn ${b.code} không còn hiệu lực`,
    `Đã nhận ${vnd(txn.amount)} nhưng ${reason.toLowerCase()}. Khoản tiền đang chờ hoàn trả 100%.`,
    b.id
  );
  return { result: 'refund_pending', booking_code: b.code };
}

/**
 * Ap mot giao dich (da ghi vao bank_transaction) vao don `b` (da khoa FOR UPDATE).
 * Tra ve { result: confirmed | underpaid | refund_pending | unmatched, ... }
 */
async function applyToBooking(c, txn, b, verifiedBy = null) {
  if (['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(b.status)) {
    // Don da du coc tu truoc: de chu san quyet (thu them tien san hay hoan lai)
    await setTxn(c, txn.id, 'UNMATCHED', b.id, 'Đơn đã xác nhận trước đó');
    return { result: 'unmatched', booking_code: b.code };
  }

  if (b.status === 'CANCELLED_EXPIRED') {
    if (!b.starts_at || new Date(b.starts_at) <= new Date()) return markRefund(c, txn, b, 'Đơn đã quá giờ đá');
    if (Number(txn.amount) + (await receivedFor(c, b.id)) < Number(b.deposit_amount)) {
      return markRefund(c, txn, b, 'Đơn đã hết hạn giữ chỗ');
    }
    // Slot con trong thi giu lai don cho khach; da co nguoi dat de thi rang buoc no_slot_overlap bao loi
    await c.query('SAVEPOINT revive');
    try {
      await c.query(`UPDATE booking_slot SET status = 'CONFIRMED' WHERE booking_id = $1 AND status = 'RELEASED'`, [b.id]);
      await c.query('RELEASE SAVEPOINT revive');
    } catch (err) {
      if (err.code !== '23P01') throw err;
      await c.query('ROLLBACK TO SAVEPOINT revive');
      return markRefund(c, txn, b, 'Khung giờ đã có người khác đặt');
    }
    await setTxn(c, txn.id, 'PARTIAL', b.id);
    const total = await receivedFor(c, b.id);
    await confirmPaid(c, b, total, verifiedBy);
    return { result: 'confirmed', booking_code: b.code, received: total };
  }

  if (!ACCEPT_STATUSES.includes(b.status)) return markRefund(c, txn, b, 'Đơn đã bị hủy');

  await setTxn(c, txn.id, 'PARTIAL', b.id);
  const total = await receivedFor(c, b.id);
  const deposit = Number(b.deposit_amount);

  if (total >= deposit) {
    await c.query(`UPDATE booking_slot SET status = 'CONFIRMED' WHERE booking_id = $1 AND status = 'HELD'`, [b.id]);
    await confirmPaid(c, b, total, verifiedBy);
    return { result: 'confirmed', booking_code: b.code, received: total };
  }

  // Thieu tien: giu cho them toi da 5 phut de khach chuyen bo sung
  const missing = deposit - total;
  const r = await c.query(
    `UPDATE booking
        SET status = 'HELD',
            hold_expires_at = GREATEST(COALESCE(hold_expires_at, now()), now() + make_interval(mins => $2))
      WHERE id = $1
      RETURNING hold_expires_at`,
    [b.id, UNDERPAID_GRACE_MINUTES]
  );
  await notify(
    c,
    b.user_id,
    'PAYMENT_UNDERPAID',
    `Đơn ${b.code} còn thiếu ${vnd(missing)}`,
    `Đã nhận ${vnd(total)}/${vnd(deposit)} tiền cọc. Bạn còn thiếu ${vnd(missing)}. Vui lòng chuyển bổ sung trong ${UNDERPAID_GRACE_MINUTES} phút để giữ chỗ.`,
    b.id
  );
  return {
    result: 'underpaid',
    booking_code: b.code,
    received: total,
    missing,
    hold_expires_at: r.rows[0].hold_expires_at,
  };
}

/**
 * Ghi nhan mot bien dong so du va tu khop. Goi lai voi cung (provider, provider_txn_id) thi bo qua.
 * txn: { provider, provider_txn_id, account_number, bank_name, amount, content, reference_code, transaction_at, raw }
 */
async function processIncoming(c, txn) {
  const ins = await c.query(
    `INSERT INTO bank_transaction (provider, provider_txn_id, account_number, bank_name, amount, content,
                                   reference_code, transaction_at, raw_payload)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (provider, provider_txn_id) DO NOTHING
     RETURNING id, amount, account_number`,
    [
      txn.provider,
      txn.provider_txn_id,
      txn.account_number || null,
      txn.bank_name || null,
      txn.amount,
      String(txn.content || '').slice(0, 500),
      txn.reference_code || null,
      txn.transaction_at || null,
      txn.raw,
    ]
  );
  if (ins.rowCount === 0) return { result: 'duplicate' };
  const row = ins.rows[0];

  const target = parseTarget(txn.content);
  if (target?.kind === 'SPLIT') return require('./split.service').applyShareTransfer(c, row, target.bookingCode, target.phone);
  if (target?.kind === 'TOPUP') return require('./wallet.service').applyTopup(c, row, target.code);
  if (target?.kind === 'TOURNAMENT') return require('./tournament.service').applyFee(c, row, target.code);

  const code = target?.kind === 'BOOKING' ? target.code : null;
  const b = code && (await lockBooking(c, code));
  if (!b) {
    await setTxn(c, row.id, 'UNMATCHED', null, code ? `Không tìm thấy đơn ${code}` : 'Nội dung không chứa mã đơn');
    return { result: 'unmatched', transaction_id: row.id };
  }
  // Tien vao tai khoan khac tai khoan cua cum san -> khong tu gach no
  if (row.account_number && b.bank_account && digits(row.account_number) !== digits(b.bank_account)) {
    await setTxn(c, row.id, 'UNMATCHED', b.id, 'Tài khoản nhận không khớp tài khoản cụm sân');
    return { result: 'unmatched', transaction_id: row.id, booking_code: b.code };
  }
  return { ...(await applyToBooking(c, row, b)), transaction_id: row.id };
}

// Job nen: don het han / bi huy ma con tien PARTIAL -> chuyen sang cho hoan
async function flagRefundsForCancelled(c) {
  const r = await c.query(
    `UPDATE bank_transaction t SET status = 'REFUND_PENDING', note = 'Đơn hết hạn khi chưa đủ tiền cọc'
       FROM booking b
      WHERE b.id = t.booking_id AND t.status = 'PARTIAL' AND b.status::text LIKE 'CANCELLED%'
      RETURNING t.amount, b.id AS booking_id, b.code, b.user_id`
  );
  for (const row of r.rows) {
    await notify(
      c,
      row.user_id,
      'PAYMENT_REFUND_PENDING',
      `Đơn ${row.code} đã hết hạn giữ chỗ`,
      `Đơn chưa nhận đủ tiền cọc trước khi hết hạn. Khoản ${vnd(row.amount)} đã chuyển đang chờ hoàn trả 100%.`,
      row.booking_id
    );
  }
  return r.rowCount;
}

module.exports = {
  config,
  extractBookingCode,
  parseTarget,
  accountFor,
  lockBooking,
  applyToBooking,
  processIncoming,
  flagRefundsForCancelled,
  receivedFor,
};
