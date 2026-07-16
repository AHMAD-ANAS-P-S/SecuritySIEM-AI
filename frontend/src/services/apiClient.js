import axios from 'axios';
import toast from 'react-hot-toast';
import { ENV, HTTP_STATUS, STORAGE_KEYS } from '@utils/constants';
import storage from '@utils/storage';

/**
 * Single axios instance used across every service module.
 * Centralizes base URL, timeouts, auth headers, and error handling
 * so individual services stay declarative and thin.
 */
const apiClient = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: ENV.API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ---- Request interceptor: attach bearer token ----
apiClient.interceptors.request.use(
  (config) => {
    const token = storage.get(STORAGE_KEYS.ACCESS_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ---- Refresh-token queue management ----
let isRefreshing = false;
let refreshQueue = [];

function resolveQueue(token) {
  refreshQueue.forEach(({ resolve }) => resolve(token));
  refreshQueue = [];
}

function rejectQueue(error) {
  refreshQueue.forEach(({ reject }) => reject(error));
  refreshQueue = [];
}

async function refreshAccessToken() {
  const refreshToken = storage.get(STORAGE_KEYS.REFRESH_TOKEN);
  if (!refreshToken) throw new Error('No refresh token available');

  const { data } = await axios.post(`${ENV.API_BASE_URL}/auth/refresh`, {
    refreshToken,
  });

  storage.set(STORAGE_KEYS.ACCESS_TOKEN, data.accessToken);
  if (data.refreshToken) {
    storage.set(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
  }
  return data.accessToken;
}

// ---- Response interceptor: refresh-on-401, unified error surfacing ----
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // Attempt a single silent token refresh on 401.
    if (status === HTTP_STATUS.UNAUTHORIZED && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();
        resolveQueue(newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        rejectQueue(refreshError);
        storage.remove(STORAGE_KEYS.ACCESS_TOKEN);
        storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
        window.dispatchEvent(new CustomEvent('auth:logout'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    handleGlobalError(error);
    return Promise.reject(error);
  }
);

/** Centralized, user-facing error surfacing. Individual services can still catch locally. */
function handleGlobalError(error) {
  const status = error.response?.status;
  const message =
    error.response?.data?.message || error.message || 'An unexpected error occurred';

  if (status === HTTP_STATUS.FORBIDDEN) {
    toast.error('You do not have permission to perform this action.');
    return;
  }
  if (status === HTTP_STATUS.NOT_FOUND) {
    toast.error('The requested resource was not found.');
    return;
  }
  if (status === HTTP_STATUS.TOO_MANY_REQUESTS) {
    toast.error('Too many requests. Please slow down.');
    return;
  }
  if (!error.response) {
    toast.error('Network error. Please check your connection.');
    return;
  }
  if (status >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    toast.error('Server error. Our team has been notified.');
    return;
  }

  toast.error(message);
}

export default apiClient;
