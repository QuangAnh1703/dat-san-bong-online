'use strict';
const crypto = require('crypto');
const { client } = require('../../redis');

const OTP_EXPIRY = 15 * 60; // 15 minutes
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60; // 15 minutes

/** Generate 6-digit OTP */
function generateOtp() {
  return String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
}

/** Hash OTP for storage */
function hashOtp(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

/** Store OTP in Redis with attempt tracking */
async function storeOtp(phone, purpose = 'REGISTER') {
  const otp = generateOtp();
  const hash = hashOtp(otp);
  const key = `otp:${phone}:${purpose}`;
  const attemptsKey = `otp:attempts:${phone}:${purpose}`;

  // Check if locked out
  const locked = await client.get(`otp:locked:${phone}:${purpose}`);
  if (locked) {
    throw new Error(`OTP_LOCKED_${Math.ceil(Number(locked))}s`);
  }

  // Store OTP hash + plain OTP (for logging/demo only, remove in production)
  await client.setEx(key, OTP_EXPIRY, hash);
  // Reset attempts counter
  await client.del(attemptsKey);

  console.log(`[OTP] Generated for ${phone}: ${otp}`);
  return otp;
}

/** Verify OTP and track failed attempts */
async function verifyOtp(phone, otp, purpose = 'REGISTER') {
  const key = `otp:${phone}:${purpose}`;
  const attemptsKey = `otp:attempts:${phone}:${purpose}`;
  const lockKey = `otp:locked:${phone}:${purpose}`;

  // Check if locked
  const locked = await client.get(lockKey);
  if (locked) {
    throw new Error(`OTP_LOCKED_${Math.ceil(Number(locked))}s`);
  }

  // Get stored hash
  const storedHash = await client.get(key);
  if (!storedHash) {
    throw new Error('OTP_EXPIRED');
  }

  // Verify
  const otpHash = hashOtp(otp);
  if (storedHash !== otpHash) {
    // Increment failed attempts
    const attempts = await client.incr(attemptsKey);
    await client.expire(attemptsKey, OTP_EXPIRY);

    if (attempts >= MAX_ATTEMPTS) {
      // Lock for 15 minutes
      await client.setEx(lockKey, LOCKOUT_DURATION, LOCKOUT_DURATION);
      throw new Error(`OTP_LOCKED_${LOCKOUT_DURATION}s`);
    }

    throw new Error(`OTP_INVALID_${MAX_ATTEMPTS - attempts}attempts_left`);
  }

  // Success - delete OTP
  await client.del(key);
  await client.del(attemptsKey);
  return true;
}

module.exports = { generateOtp, storeOtp, verifyOtp };
