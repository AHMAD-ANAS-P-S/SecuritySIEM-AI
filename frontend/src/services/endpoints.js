/**
 * Single source of truth for API endpoint paths.
 * Keeps services free of hardcoded URL strings.
 */
export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
  DASHBOARD: {
    METRICS: '/dashboard/metrics',
    SUMMARY: '/dashboard/summary',
  },
  ALERTS: {
    BASE: '/alerts',
    BY_ID: (id) => `/alerts/${id}`,
    ACKNOWLEDGE: (id) => `/alerts/${id}/acknowledge`,
  },
  USERS: {
    BASE: '/users',
    BY_ID: (id) => `/users/${id}`,
  },
};

export default ENDPOINTS;
