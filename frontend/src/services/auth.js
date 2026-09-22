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
