import apiClient from '@services/apiClient';
import { ENDPOINTS } from '@services/endpoints';

/**
 * Alerts domain service - CRUD + acknowledge actions for the alerting
 * subsystem of SIEM AI.
 */
export const alertsService = {
  async list(params = {}) {
    const { data } = await apiClient.get(ENDPOINTS.ALERTS.BASE, { params });
    return data;
  },

  async getById(id) {
    const { data } = await apiClient.get(ENDPOINTS.ALERTS.BY_ID(id));
    return data;
  },

  async acknowledge(id) {
    const { data } = await apiClient.post(ENDPOINTS.ALERTS.ACKNOWLEDGE(id));
    return data;
  },

  async remove(id) {
    const { data } = await apiClient.delete(ENDPOINTS.ALERTS.BY_ID(id));
    return data;
  },
};

export default alertsService;
