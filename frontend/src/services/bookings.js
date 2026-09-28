import { api } from './api';

export async function createBooking(data) {
  return api.post('/api/bookings', data);
}

export async function getBookingByCode(code) {
  return api.get(`/api/bookings/${code}`);
}

export async function cancelBooking(code) {
  return api.post(`/api/bookings/${code}/cancel`, {});
}

export async function getMyBookings() {
  return api.get('/api/bookings');
}

export async function rateBooking(code, data) {
  return api.post(`/api/bookings/${code}/rate`, data);
}
