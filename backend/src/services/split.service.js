'use strict';
const { AppError } = require('../lib/errors');

// So quy doi bong & chia tien tran dau (PRD 2.1.8)

const ROUND_TO = 1000;
const vnd = (n) => `${Math.round(Number(n)).toLocaleString('vi-VN')}đ`;
const roundUp = (n) => Math.ceil(n / ROUND_TO) * ROUND_TO;

/**
 * Tinh so tien tung nguoi. Chia le thi lam tron LEN hang nghin, phan thua vao quy doi.
 * members: [{ amount? }] (amount chi dung cho CUSTOM)
 */
function computeShares({ mode, total, sponsorPercent = 0, members }) {
  const n = members.length;
  if (mode === 'CUSTOM') {
    const amounts = members.map((m) => Math.round(Number(m.amount)));
    if (amounts.some((a) => !Number.isFinite(a) || a < 0)) throw new AppError('INVALID_FIELD', { details: { field: 'amount' } });
    const sum = amounts.reduce((s, a) => s + a, 0);
    if (sum !== Math.round(total)) {
      throw new AppError('SPLIT_AMOUNT_MISMATCH', { details: { total: Math.round(total), sum } });
    }
    return { amounts, sponsor: 0, surplus: 0 };
  }
  const sponsor = mode === 'SPONSOR' ? Math.round((total * sponsorPercent) / 100) : 0;
  const rest = total - sponsor;
  const per = rest > 0 ? roundUp(rest / n) : 0;
  return { amounts: members.map(() => per), sponsor, surplus: per * n - rest };
}

async function notify(c, userId, type, title, body, bookingId) {
  if (!userId) return;
  await c.query(
    `INSERT INTO notification (user_id, type, title, body, ref_kind, ref_id) VALUES ($1, $2, $3, $4, 'BOOKING', $5)`,
    [userId, type, title, body, bookingId]
  );
}

// Moi nguoi da dong -> chot so quy, tien thua cong vao quy du cua doi
async function settleIfDone(c, billId) {
  const r = await c.query(
    `SELECT sb.*, b.code AS booking_code,
            (SELECT count(*) FROM split_bill_share s WHERE s.split_bill_id = sb.id AND s.status = 'UNPAID') AS unpaid
       FROM split_bill sb JOIN booking b ON b.id = sb.booking_id
      WHERE sb.id = $1 FOR UPDATE OF sb`,
    [billId]
  );
  const bill = r.rows[0];
  if (!bill || bill.status !== 'OPEN' || Number(bill.unpaid) > 0) return false;
  await c.query(`UPDATE split_bill SET status = 'DONE', completed_at = now() WHERE id = $1`, [billId]);
  if (bill.team_id && Number(bill.surplus) > 0) {
    const t = await c.query(
      `UPDATE team SET fund_balance = fund_balance + $2 WHERE id = $1 RETURNING fund_balance`,
      [bill.team_id, bill.surplus]
    );
    await c.query(
      `INSERT INTO team_fund_log (team_id, delta, reason, split_bill_id, balance_after) VALUES ($1, $2, $3, $4, $5)`,
      [bill.team_id, bill.surplus, `Tiền thừa do làm tròn · trận ${bill.booking_code}`, billId, t.rows[0].fund_balance]
    );
  }
  await notify(
    c,
    bill.captain_id,
    'SPLIT_DONE',
    `Cả đội đã đóng đủ tiền trận ${bill.booking_code}`,
    Number(bill.surplus) > 0 ? `Đã cộng ${vnd(bill.surplus)} tiền thừa vào quỹ đội.` : 'Sổ quỹ trận đã hoàn tất.',
    bill.booking_id
  );
  return true;
}

async function markSharePaid(c, shareId, status = 'PAID') {
  const r = await c.query(
    `UPDATE split_bill_share SET status = $2, paid_at = now() WHERE id = $1 AND status = 'UNPAID'
     RETURNING id, split_bill_id`,
    [shareId, status]
  );
  if (r.rowCount === 0) return null;
  await settleIfDone(c, r.rows[0].split_bill_id);
  return r.rows[0];
}


// Job nen: qua han nhac no -> nhac thanh vien chua dong (moi phan mot lan) + bao doi truong
async function remindOverdue(c) {
  const r = await c.query(
    `UPDATE split_bill_share s SET reminded_at = now()
       FROM split_bill sb JOIN booking b ON b.id = sb.booking_id
      WHERE sb.id = s.split_bill_id AND sb.status = 'OPEN' AND sb.due_at < now()
        AND s.status = 'UNPAID' AND s.reminded_at IS NULL
      RETURNING s.user_id, s.name, s.amount, sb.captain_id, sb.booking_id, b.code`
  );
  const captains = new Map();
  for (const row of r.rows) {
    await notify(
      c,
      row.user_id,
      'SPLIT_REMINDER',
      `Nhắc đóng tiền trận ${row.code}`,
      `Bạn chưa đóng ${vnd(row.amount)}. Quét mã VietQR trong sổ quỹ trận để đóng trước giờ bóng lăn.`,
      row.booking_id
    );
    const k = `${row.captain_id}:${row.booking_id}`;
    captains.set(k, { ...row, names: [...(captains.get(k)?.names || []), row.name] });
  }
  for (const v of captains.values()) {
    await notify(
      c,
      v.captain_id,
      'SPLIT_OVERDUE',
      `${v.names.length} người chưa đóng tiền trận ${v.code}`,
      `${v.names.join(', ')}. Bạn có thể đổi người đóng hoặc đóng thay.`,
      v.booking_id
    );
  }
  return r.rowCount;
}

module.exports = { computeShares, settleIfDone, markSharePaid, remindOverdue, notify, vnd };
