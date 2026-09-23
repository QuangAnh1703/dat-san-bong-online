import { api, ApiError } from './api';

export async function login({ email, password }) {
  return api.post('/api/auth/login', { email, password });
}

export async function requestOtp({ email }) {
  return api.post('/api/auth/request-otp', { email });
}

export async function verifyOtp({ email, otp }) {
  return api.post('/api/auth/verify-otp', { email, otp });
}

export async function registerWithOtp({ temp_token, password, full_name, district_code }) {
  return api.post('/api/auth/register-with-otp', {
    temp_token,
    password,
    full_name,
    district_code,
  });
}

export function getGoogleLoginUrl() {
  const base = import.meta.env.VITE_API_URL || '';
  return `${base}/api/auth/google`;
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
