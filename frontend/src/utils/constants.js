/**
 * Centralized application constants.
 * All environment access is funneled through this file so the rest
 * of the app never touches import.meta.env directly.
 */

export const ENV = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  API_TIMEOUT: Number(import.meta.env.VITE_API_TIMEOUT ?? 15000),
  APP_NAME: import.meta.env.VITE_APP_NAME ?? 'SIEM AI',
  APP_ENV: import.meta.env.VITE_APP_ENV ?? 'development',
  ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  ENABLE_MOCK_API: import.meta.env.VITE_ENABLE_MOCK_API === 'true',
  SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN ?? '',
};

export const STORAGE_KEYS = {
  ACCESS_TOKEN: import.meta.env.VITE_AUTH_TOKEN_KEY ?? 'siem_ai_access_token',
  REFRESH_TOKEN: import.meta.env.VITE_AUTH_REFRESH_TOKEN_KEY ?? 'siem_ai_refresh_token',
  THEME: 'siem_ai_theme',
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

export const ROLES = {
  ADMIN: 'admin',
  ANALYST: 'analyst',
  VIEWER: 'viewer',
};

export const QUERY_KEYS = {
  CURRENT_USER: 'currentUser',
  DASHBOARD_METRICS: 'dashboardMetrics',
  ALERTS: 'alerts',
};

export const DATE_FORMATS = {
  SHORT: 'MMM d, yyyy',
  LONG: 'MMMM d, yyyy HH:mm',
  ISO: "yyyy-MM-dd'T'HH:mm:ss",
};
