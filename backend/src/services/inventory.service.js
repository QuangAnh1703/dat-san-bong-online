'use strict';
const { AppError } = require('../lib/errors');

// Tru kho; het hang thi bao loi (rang buoc ck_service_stock la chot chan cuoi)
async function takeStock(c, venueId, items) {
  const out = [];
  for (const it of items) {
    const qty = Number(it.quantity) || 1;
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
      throw new AppError('INVALID_FIELD', { details: { field: 'quantity' } });
    }
    const r = await c.query(
      `UPDATE venue_service SET stock = stock - $3
        WHERE id = $1 AND venue_id = $2 AND is_active AND (stock IS NULL OR stock >= $3)
        RETURNING id, name, category, price, stock`,
      [Number(it.service_id ?? it.id), venueId, qty]
    );
    if (r.rowCount === 0) {
      const s = await c.query(`SELECT name, stock FROM venue_service WHERE id = $1 AND venue_id = $2`, [
        Number(it.service_id ?? it.id),
        venueId,
      ]);
      throw new AppError('OUT_OF_STOCK', {
        message: s.rows[0] ? `"${s.rows[0].name}" chỉ còn ${s.rows[0].stock ?? 0} trong kho` : undefined,
        details: { service_id: it.service_id ?? it.id, stock: s.rows[0]?.stock ?? null },
      });
    }
    out.push({ ...r.rows[0], quantity: qty });
  }
  return out;
}

// Tra lai kho cac mon da ban kem mot don (don het han / bi huy)
async function restockBooking(c, bookingId) {
  await c.query(
    `UPDATE venue_service vs SET stock = vs.stock + bs.quantity
       FROM booking_service bs
      WHERE bs.booking_id = $1 AND bs.service_id = vs.id AND vs.stock IS NOT NULL`,
    [bookingId]
  );
}

// Job nen: don da huy / het han con giu hang dat kem -> tra kho mot lan
async function restockCancelled(c) {
  const r = await c.query(
    `UPDATE booking SET services_restocked = TRUE
      WHERE NOT services_restocked AND (status::text LIKE 'CANCELLED%' OR status = 'REFUNDED')
        AND EXISTS (SELECT 1 FROM booking_service bs WHERE bs.booking_id = booking.id)
      RETURNING id`
  );
  for (const row of r.rows) await restockBooking(c, row.id);
  return r.rowCount;
}

module.exports = { takeStock, restockBooking, restockCancelled };
