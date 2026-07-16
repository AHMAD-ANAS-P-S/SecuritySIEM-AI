import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import authService from '@services/authService';
import toast from 'react-hot-toast';

export const AuthContext = createContext(null);

/**
 * Provides authentication state (user, loading, error) and actions
 * (login, logout, register) to the entire component tree.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const hydrateSession = useCallback(async () => {
    if (!authService.isAuthenticated()) {
      setIsLoading(false);
      return;
    }
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  // Listen for forced logout dispatched by the axios interceptor
  // when a token refresh attempt fails.
  useEffect(() => {
    const handleForcedLogout = () => {
      setUser(null);
      toast.error('Your session has expired. Please sign in again.');
    };
    window.addEventListener('auth:logout', handleForcedLogout);
    return () => window.removeEventListener('auth:logout', handleForcedLogout);
  }, []);

  const login = useCallback(async (credentials) => {
    setError(null);
    setIsLoading(true);
    try {
      const loggedInUser = await authService.login(credentials);
      setUser(loggedInUser);
      return loggedInUser;
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const register = useCallback(async (payload) => {
    setError(null);
    return authService.register(payload);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      error,
      login,
      logout,
      register,
    }),
    [user, isLoading, error, login, logout, register]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
