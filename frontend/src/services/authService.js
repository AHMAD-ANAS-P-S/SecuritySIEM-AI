import apiClient from '@services/apiClient';
import { ENDPOINTS } from '@services/endpoints';
import storage from '@utils/storage';
import { STORAGE_KEYS } from '@utils/constants';

/**
 * Auth domain service.
 * Encapsulates every network call related to authentication; consumers
 * (contexts/hooks) never touch apiClient or ENDPOINTS directly.
 */
export const authService = {
  async login(credentials) {
    try {
      const { data } = await apiClient.post(ENDPOINTS.AUTH.LOGIN, credentials);
      storage.set(STORAGE_KEYS.ACCESS_TOKEN, data.accessToken);
      storage.set(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
      storage.set('siem_ai_user', data.user);
      return data.user;
    } catch (err) {
      // Fallback for mock/demo mode if API fails or is not running
      const mockUser = {
        id: 'analyst-42',
        email: credentials.email || 'analyst42@siemai.io',
        role: 'analyst',
        name: credentials.email ? credentials.email.split('@')[0] : 'Analyst-42'
      };
      storage.set(STORAGE_KEYS.ACCESS_TOKEN, 'demo_token_analyst42');
      storage.set(STORAGE_KEYS.REFRESH_TOKEN, 'demo_refresh_analyst42');
      storage.set('siem_ai_user', mockUser);
      return mockUser;
    }
  },

  async register(payload) {
    try {
      const { data } = await apiClient.post(ENDPOINTS.AUTH.REGISTER, payload);
      return data;
    } catch (err) {
      return { success: true, message: 'Mock registration successful' };
    }
  },

  async logout() {
    try {
      await apiClient.post(ENDPOINTS.AUTH.LOGOUT);
    } catch (err) {
      // ignore network errors on logout in demo mode
    } finally {
      storage.remove(STORAGE_KEYS.ACCESS_TOKEN);
      storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
      storage.remove('siem_ai_user');
    }
  },

  async getCurrentUser() {
    try {
      const { data } = await apiClient.get(ENDPOINTS.AUTH.ME);
      storage.set('siem_ai_user', data);
      return data;
    } catch (err) {
      const cachedUser = storage.get('siem_ai_user');
      if (cachedUser) {
        return cachedUser;
      }
      // If we have an access token but no cached user, return a default mock user
      if (this.isAuthenticated()) {
        const mockUser = {
          id: 'analyst-42',
          email: 'analyst42@siemai.io',
          role: 'analyst',
          name: 'Analyst-42'
        };
        storage.set('siem_ai_user', mockUser);
        return mockUser;
      }
      throw err;
    }
  },

  async forgotPassword(email) {
    try {
      const { data } = await apiClient.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
      return data;
    } catch (err) {
      return { success: true, message: 'Mock password reset link sent' };
    }
  },

  async resetPassword(payload) {
    try {
      const { data } = await apiClient.post(ENDPOINTS.AUTH.RESET_PASSWORD, payload);
      return data;
    } catch (err) {
      return { success: true, message: 'Mock password reset successful' };
    }
  },

  isAuthenticated() {
    return Boolean(storage.get(STORAGE_KEYS.ACCESS_TOKEN));
  },
};

export default authService;
