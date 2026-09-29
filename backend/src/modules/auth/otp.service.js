'use strict';
const crypto = require('crypto');
const { client } = require('../../redis');
const { sendOtpEmail } = require('../../services/email.service');

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

/** Store OTP in Redis with attempt tracking, send via email or SMS (mocked) */
async function storeOtp(contact, purpose = 'REGISTER') {
  const otp = generateOtp();
  const hash = hashOtp(otp);
  const key = `otp:${contact}:${purpose}`;
  const attemptsKey = `otp:attempts:${contact}:${purpose}`;

  // Check if locked out
  const locked = await client.get(`otp:locked:${contact}:${purpose}`);
  if (locked) {
    throw new Error(`OTP_LOCKED_${Math.ceil(Number(locked))}s`);
  }

  // Store OTP hash
  await client.setEx(key, OTP_EXPIRY, hash);
  // Reset attempts counter
  await client.del(attemptsKey);

  // Determine if email or phone
  const isEmail = contact.includes('@');

  if (isEmail) {
    // Send email
    await sendOtpEmail(contact, otp);
    console.log(`[OTP] Sent to email ${contact}`);
  } else {
    // Mock SMS for phone (in production, integrate with SMS service)
    console.log(`[OTP] Sent to phone ${contact.replace(/\d{3}$/, '***')} (mocked SMS: ${otp})`);
  }

  return { contact, message: isEmail ? 'OTP sent to email' : 'OTP sent to phone' };
}

/** Verify OTP and track failed attempts */
async function verifyOtp(contact, otp, purpose = 'REGISTER') {
  const key = `otp:${contact}:${purpose}`;
  const attemptsKey = `otp:attempts:${contact}:${purpose}`;
  const lockKey = `otp:locked:${contact}:${purpose}`;

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
