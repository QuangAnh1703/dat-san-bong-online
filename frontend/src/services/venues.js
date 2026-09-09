import { api } from './api';

export const getDistricts = () =>
  api.get('/api/districts').then((r) => r.data ?? []);

export function getVenues({ district, q } = {}) {
  const params = new URLSearchParams();
  if (district) params.set('district', district);
  if (q) params.set('q', q);
  const qs = params.toString();
  return api.get('/api/venues' + (qs ? `?${qs}` : '')).then((r) => r.data ?? []);
}

export const getVenue = (id) => api.get(`/api/venues/${id}`);

export const getFieldSchedule = (fieldId, date) =>
  api.get(`/api/fields/${fieldId}/schedule?date=${date}`);
