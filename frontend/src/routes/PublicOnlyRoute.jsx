import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@hooks';
import { PATHS } from '@routes/paths';

/**
 * Inverse of ProtectedRoute: redirects already-authenticated users
 * away from public-only pages such as /login and /register.
 */
export function PublicOnlyRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to={PATHS.DASHBOARD} replace />;

  return <Outlet />;
}

export default PublicOnlyRoute;
