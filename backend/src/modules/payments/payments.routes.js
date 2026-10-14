'use strict';
const express = require('express');
const crypto = require('crypto');
const { withTransaction } = require('../../db');
const { AppError, requireFields } = require('../../lib/errors');
const { requireAuthenticated } = require('../../middlewares/auth');
const router = express.Router();

router.use(requireAuthenticated);

// POST /api/payments  body: { booking_code, bill_image_url? }
// Nguoi dat bao da chuyen khoan tien coc -> don chuyen sang PENDING_VERIFY cho chu san doi soat (UC-25).
// Cong VNPay/MoMo chua tich hop nen chi ho tro BANK_TRANSFER.
router.post('/', async (req, res, next) => {
  const { booking_code, bill_image_url } = req.body || {};
  try {
    requireFields(req.body, ['booking_code']);
    if (bill_image_url !== undefined && (typeof bill_image_url !== 'string' || bill_image_url.length > 500)) {
      throw new AppError('INVALID_FIELD', { details: { field: 'bill_image_url' } });
    }

    const out = await withTransaction(async (c) => {
      const b = await c.query(
        `SELECT b.id, b.code, b.status, b.user_id, b.deposit_amount,
                v.bank_name, v.bank_account, v.bank_holder
           FROM booking b JOIN venue v ON v.id = b.venue_id
          WHERE b.code = $1 FOR UPDATE OF b`,
        [booking_code]
      );
      if (b.rowCount === 0) throw new AppError('BOOKING_NOT_FOUND', { details: { code: booking_code } });
      const booking = b.rows[0];
      if (booking.user_id !== req.user.id) throw new AppError('FORBIDDEN');
      if (booking.status !== 'HELD') {
        throw new AppError('INVALID_STATUS', {
          message:
            booking.status === 'CANCELLED_EXPIRED'
              ? 'Da qua thoi gian giu cho, vui long dat lai'
              : `Don dang o trang thai ${booking.status}`,
          details: { status: booking.status },
        });
      }

      const p = await c.query(
        `INSERT INTO payment (booking_id, method, status, amount, provider_ref, bill_image_url)
         VALUES ($1, 'BANK_TRANSFER', 'PENDING', $2, $3, $4)
         RETURNING id, method, status, amount, provider_ref, bill_image_url, created_at`,
        [
          booking.id,
          booking.deposit_amount,
          `BT-${booking.code}-${crypto.randomBytes(3).toString('hex')}`,
          bill_image_url || null,
        ]
      );

      // Da bao chuyen khoan -> khong con bi tu huy khi het 15 phut giu cho
      await c.query(`UPDATE booking SET status = 'PENDING_VERIFY', hold_expires_at = NULL WHERE id = $1`, [
        booking.id,
      ]);

      return {
        booking_code: booking.code,
        status: 'PENDING_VERIFY',
        payment: p.rows[0],
        transfer: {
          bank_name: booking.bank_name,
          bank_account: booking.bank_account,
          bank_holder: booking.bank_holder,
          amount: Number(booking.deposit_amount),
          content: `SANBONG ${booking.code}`,
        },
      };
    });

    res.status(201).json(out);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
