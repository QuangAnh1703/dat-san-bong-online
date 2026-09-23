import { api } from './api';

export const getPricingRules = (venueId) =>
  api.get(`/api/pricing/${venueId}`).then((r) => r.data ?? []);

export const getPricingRule = (venueId, id) =>
  api.get(`/api/pricing/${venueId}/${id}`);

export const createPricingRule = (venueId, data) =>
  api.post(`/api/pricing/${venueId}`, data);

export const updatePricingRule = (venueId, id, data) =>
  api.put(`/api/pricing/${venueId}/${id}`, data);

export const deletePricingRule = (venueId, id) =>
  api.delete(`/api/pricing/${venueId}/${id}`);
