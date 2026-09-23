'use strict';
const { query } = require('../../db');
const { AppError } = require('../../lib/errors');

/**
 * Tính giá cuối cho một khung giờ cụ thể
 * @param {number} venueId - ID sân
 * @param {string} fieldType - Loại sân (e.g., '5-a-side', '7-a-side')
 * @param {string} dayType - Loại ngày (e.g., 'WEEKDAY', 'WEEKEND', 'HOLIDAY')
 * @param {number} minutes - Phút trong ngày (0-1440)
 * @returns {Promise<{base_price: number, multiplier: number, final_price: number, label: string}>}
 */
async function calculatePrice(venueId, fieldType, dayType, minutes) {
  if (minutes < 0 || minutes >= 1440) {
    throw new AppError('INVALID_TIME_RANGE', {
      message: 'Phút phải trong khoảng 0-1439',
    });
  }

  const result = await query(
    `SELECT base_price, multiplier, label
       FROM price_rule
      WHERE venue_id = $1
        AND field_type = $2
        AND day_type = $3
        AND time_span @> $4::int4
      LIMIT 1`,
    [venueId, fieldType, dayType, minutes]
  );

  if (result.rowCount === 0) {
    throw new AppError('NO_PRICE_RULE', {
      message: `Chưa có bảng giá cho ${fieldType} vào ${dayType} khung giờ này`,
      details: { field_type: fieldType, day_type: dayType, minutes },
    });
  }

  const rule = result.rows[0];
  const finalPrice = Math.round(rule.base_price * rule.multiplier * 100) / 100;

  return {
    base_price: rule.base_price,
    multiplier: rule.multiplier,
    final_price: finalPrice,
    label: rule.label || null,
  };
}

/**
 * Tính giá cho một khoảng thời gian
 * @param {number} venueId
 * @param {string} fieldType
 * @param {string} dayType
 * @param {number} startMinutes - Phút bắt đầu
 * @param {number} endMinutes - Phút kết thúc
 * @returns {Promise<{hours: number, total_price: number, breakdown: Array}>}
 */
async function calculatePriceRange(venueId, fieldType, dayType, startMinutes, endMinutes) {
  if (startMinutes < 0 || endMinutes > 1440 || startMinutes >= endMinutes) {
    throw new AppError('INVALID_TIME_RANGE', {
      message: 'Khoảng thời gian không hợp lệ',
    });
  }

  const hours = (endMinutes - startMinutes) / 60;
  const breakdown = [];
  let totalPrice = 0;

  // Kiểm tra giá cho từng giờ trong khoảng
  for (let minute = startMinutes; minute < endMinutes; minute += 60) {
    try {
      const priceInfo = await calculatePrice(venueId, fieldType, dayType, minute);
      breakdown.push({
        hour_start: minute,
        hour_end: Math.min(minute + 60, endMinutes),
        base_price: priceInfo.base_price,
        multiplier: priceInfo.multiplier,
        price: priceInfo.final_price,
        label: priceInfo.label,
      });
      totalPrice += priceInfo.final_price;
    } catch (err) {
      if (err.code === 'NO_PRICE_RULE') {
        throw new AppError('NO_PRICE_RULE', {
          message: `Chưa cấu hình giá cho ${fieldType} vào ${dayType} từ ${minute}-${minute + 60} phút`,
        });
      }
      throw err;
    }
  }

  return {
    hours,
    total_price: Math.round(totalPrice * 100) / 100,
    breakdown,
  };
}

/**
 * Lấy tất cả pricing rules cho venue
 * @param {number} venueId
 * @returns {Promise<Array>}
 */
async function getPricingRules(venueId) {
  const result = await query(
    `SELECT id, venue_id, field_type, day_type,
            lower(time_span) AS from_minute, upper(time_span) AS to_minute,
            base_price, multiplier, label
       FROM price_rule
      WHERE venue_id = $1
      ORDER BY field_type, day_type, lower(time_span)`,
    [venueId]
  );
  return result.rows;
}

module.exports = {
  calculatePrice,
  calculatePriceRange,
  getPricingRules,
};
