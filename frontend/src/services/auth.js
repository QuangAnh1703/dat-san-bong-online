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
