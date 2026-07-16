import apiClient from '@services/apiClient';
import { ENDPOINTS } from '@services/endpoints';

/**
 * Dashboard domain service - metrics and summary data consumed by
 * dashboard-related pages/components.
 */
export const dashboardService = {
  async getMetrics(params = {}) {
    const { data } = await apiClient.get(ENDPOINTS.DASHBOARD.METRICS, { params });
    return data;
  },

  async getSummary(params = {}) {
    const { data } = await apiClient.get(ENDPOINTS.DASHBOARD.SUMMARY, { params });
    return data;
  },
};

export default dashboardService;
