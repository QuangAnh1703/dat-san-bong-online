import { api, ApiError } from './api';

export async function register({ phone, password, fullName, districtCode }) {
  return api.post('/api/auth/register', {
    phone,
    password,
    full_name: fullName,
    district_code: districtCode,
  });
}

export async function login({ phone, password }) {
  return api.post('/api/auth/login', { phone, password });
}

export async function requestOtp({ phone }) {
  return api.post('/api/auth/request-otp', { phone });
}

export async function verifyOtp({ phone, otp }) {
  return api.post('/api/auth/verify-otp', { phone, otp });
}

export async function registerWithOtp({ tempToken, password, fullName, districtCode }) {
  return api.post('/api/auth/register-with-otp', {
    temp_token: tempToken,
    password,
    full_name: fullName,
    district_code: districtCode,
  });
}
