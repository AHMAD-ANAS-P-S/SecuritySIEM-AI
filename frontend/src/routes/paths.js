/**
 * Single source of truth for every route path in the app.
 * Import these instead of hardcoding strings in <Link>/navigate calls.
 */
export const PATHS = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  DASHBOARD: '/dashboard',
  ALERTS: '/alerts',
  ALERT_DETAIL: '/alerts/:alertId',
  AI_INVESTIGATION: '/ai-investigation',
  THREAT_HUNTING: '/hunting',
  REPORTS: '/reports',
  ANALYTICS: '/analytics',
  HISTORY: '/history',
  NETWORK_TOPOLOGY: '/network',
  SETTINGS: '/settings',
  PROFILE: '/profile',
  HELP_CENTER: '/help',
  UNAUTHORIZED: '/unauthorized',
  NOT_FOUND: '*',
};

/** Helper to build a concrete path from a param-based route. */
export function buildPath(path, params = {}) {
  return Object.entries(params).reduce(
    (acc, [key, value]) => acc.replace(`:${key}`, encodeURIComponent(value)),
    path
  );
}

export default PATHS;
