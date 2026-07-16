import { Navigate, Outlet, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '@hooks';
import { PATHS } from '@routes/paths';

/**
 * Route guard: renders the nested route (<Outlet />) only when the
 * user is authenticated; otherwise redirects to /login, preserving
 * the attempted location for a post-login redirect back.
 *
 * Optionally restricts by role via the `allowedRoles` prop.
 */
export function ProtectedRoute({ allowedRoles = [] }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) return null; // Delegate to a global loading UI if desired.

  if (!isAuthenticated) {
    return <Navigate to={PATHS.LOGIN} state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to={PATHS.UNAUTHORIZED} replace />;
  }

  return <Outlet />;
}

ProtectedRoute.propTypes = {
  allowedRoles: PropTypes.arrayOf(PropTypes.string),
};

export default ProtectedRoute;
