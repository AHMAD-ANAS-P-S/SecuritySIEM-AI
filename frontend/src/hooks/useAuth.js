import { useContext } from 'react';
import { AuthContext } from '@context/AuthContext';

/**
 * Access authentication state and actions.
 * Throws early if used outside <AuthProvider> to catch wiring mistakes.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default useAuth;
