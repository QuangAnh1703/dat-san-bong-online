'use strict';
const { AppError } = require('../lib/errors');

/**
 * Tinh gia mot o gio: base_price * multiplier * so gio theo price_rule,
 * roi tru Flash Sale neu slot nam trong cua so kich hoat (cach gio da <= N gio).
 * `c` la client/pool co ham query (dung duoc trong giao dich).
 */
async function quoteSlot(c, { venueId, fieldType, playDate, start, end }) {
  const r = await c.query(
    `WITH span AS (
       SELECT ($1 || ' ' || $2)::timestamptz AS s, ($1 || ' ' || $3)::timestamptz AS e
     ), meta AS (
       SELECT s, e,
              extract(epoch FROM (e - s)) / 3600.0 AS hours,
              CASE WHEN extract(isodow FROM s) >= 6 THEN 'WEEKEND' ELSE 'WEEKDAY' END::day_type AS dtype,
              (extract(hour FROM s) * 60 + extract(minute FROM s))::int AS start_min
         FROM span
     )
     SELECT m.hours, pr.id AS price_rule_id,
            round(pr.base_price * pr.multiplier * m.hours) AS amount,
            promo.id AS promotion_id, promo.discount_percent, promo.floor_price
       FROM meta m
       LEFT JOIN price_rule pr
              ON pr.venue_id = $4 AND pr.field_type = $5
             AND pr.day_type = m.dtype AND pr.time_span @> m.start_min
       LEFT JOIN LATERAL (
         SELECT p.id, p.discount_percent, p.floor_price
           FROM promotion p
          WHERE p.venue_id = $4 AND p.type = 'FLASH_SALE' AND p.is_active
            AND (p.applies_field_type IS NULL OR p.applies_field_type = $5)
            AND (p.valid_from IS NULL OR p.valid_from <= $1::date)
            AND (p.valid_to IS NULL OR p.valid_to >= $1::date)
            AND m.s > now()
            AND m.s - now() <= make_interval(hours => p.trigger_hours_before)
            AND (NOT EXISTS (SELECT 1 FROM promotion_time_span t WHERE t.promotion_id = p.id)
                 OR EXISTS (SELECT 1 FROM promotion_time_span t
                             WHERE t.promotion_id = p.id AND t.time_span @> m.start_min))
          ORDER BY p.discount_percent DESC
          LIMIT 1
       ) promo ON TRUE`,
    [playDate, start, end, venueId, fieldType]
  );

  const row = r.rows[0];
  if (!row || row.amount === null) {
    throw new AppError('NO_PRICE_RULE', {
      details: { play_date: playDate, start, end, field_type: fieldType },
    });
  }

  const base = Number(row.amount);
  let discount = 0;
  if (row.promotion_id) {
    discount = Math.round((base * row.discount_percent) / 100);
    if (row.floor_price !== null && base - discount < Number(row.floor_price)) {
      discount = Math.max(0, base - Number(row.floor_price));
    }
  }

  return {
    baseAmount: base,
    discount,
    amount: base - discount,
    hours: Number(row.hours),
    priceRuleId: row.price_rule_id,
    promotionId: discount > 0 ? row.promotion_id : null,
  };
}

module.exports = { quoteSlot };
