import { api } from './api';

export const getDistricts = () =>
  api.get('/api/districts').then((r) => r.data ?? []);

export function getVenues({ district, q, fieldType, maxPrice, minRating, amenities } = {}) {
  const params = new URLSearchParams();
  if (district) params.set('district', district);
  if (q) params.set('q', q);
  if (fieldType) params.set('fieldType', fieldType);
  if (maxPrice !== undefined) params.set('maxPrice', maxPrice);
  if (minRating !== undefined) params.set('minRating', minRating);
  if (amenities) params.set('amenities', amenities);
  const qs = params.toString();
  return api.get('/api/venues' + (qs ? `?${qs}` : '')).then((r) => r.data ?? []);
}

export const getVenue = (id) => api.get(`/api/venues/${id}`).then(r => ({ data: r }));

export const getFieldSchedule = (fieldId, date) =>
  api.get(`/api/fields/${fieldId}/schedule?date=${date}`);
