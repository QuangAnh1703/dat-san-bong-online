import { api, ApiError } from './api';

export async function login({ email, phone_number, password }) {
  return api.post('/api/auth/login', {
    ...(email && { email }),
    ...(phone_number && { phone_number }),
    password,
  });
}

export async function requestOtp({ email, phone_number }) {
  const payload = {};
  if (email) payload.email = email;
  if (phone_number) payload.phone_number = phone_number;
  return api.post('/api/auth/request-otp', payload);
}

export async function verifyOtp({ email, phone_number, otp }) {
  const payload = { otp };
  if (email) payload.email = email;
  if (phone_number) payload.phone_number = phone_number;
  return api.post('/api/auth/verify-otp', payload);
}

export async function registerWithOtp({ temp_token, password, full_name, district_code, role = 'PLAYER' }) {
  return api.post('/api/auth/register-with-otp', {
    temp_token,
    password,
    full_name,
    district_code,
    role,
  });
}

export function getGoogleLoginUrl() {
  const base = import.meta.env.VITE_API_URL || '';
  return `${base}/api/auth/google`;
}

export async function forgotPassword({ email }) {
  return api.post('/api/auth/forgot-password', { email });
}

export async function verifyResetOtp({ email, otp }) {
  return api.post('/api/auth/verify-reset-otp', { email, otp });
}

export async function resetPassword({ temp_token, password }) {
  return api.post('/api/auth/reset-password', { temp_token, password });
}

export function handleGoogleCallback(params) {
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  const userStr = params.get('user');

  if (!access_token || !refresh_token || !userStr) {
    throw new Error('Missing tokens or user data from Google OAuth');
  }

  try {
    const user = JSON.parse(userStr);
    return { access_token, refresh_token, user };
  } catch (e) {
    throw new Error('Invalid user data from Google OAuth');
  }
}
