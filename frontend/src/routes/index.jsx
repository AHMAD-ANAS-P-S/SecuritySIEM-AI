import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { PATHS } from '@routes/paths';
import { ProtectedRoute } from '@routes/ProtectedRoute';
import { PublicOnlyRoute } from '@routes/PublicOnlyRoute';

/**
 * Route -> Page/Layout wiring.
 * All page components are lazy-loaded for optimal code splitting.
 */
const DashboardLayout = lazy(() => import('@layouts/DashboardLayout'));
const AuthLayout = lazy(() => import('@layouts/AuthLayout'));

// Core pages
const DashboardPage = lazy(() => import('@pages/DashboardPage'));
const AlertsPage = lazy(() => import('@pages/AlertsPage'));
const AlertDetailPage = lazy(() => import('@pages/AlertDetailPage'));
const SettingsPage = lazy(() => import('@pages/SettingsPage'));
const ProfilePage = lazy(() => import('@pages/ProfilePage'));

// New module pages
const AIInvestigationPage = lazy(() => import('@pages/AIInvestigationPage'));
const ThreatHuntingPage = lazy(() => import('@pages/ThreatHuntingPage'));
const ReportsPage = lazy(() => import('@pages/ReportsPage'));
const AnalyticsPage = lazy(() => import('@pages/AnalyticsPage'));
const HistoryPage = lazy(() => import('@pages/HistoryPage'));
const HelpCenterPage = lazy(() => import('@pages/HelpCenterPage'));
const NetworkTopologyPage = lazy(() => import('@pages/NetworkTopologyPage'));

// Auth pages
const LoginPage = lazy(() => import('@pages/LoginPage'));
const RegisterPage = lazy(() => import('@pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@pages/ResetPasswordPage'));

const UnauthorizedPage = lazy(() => import('@pages/UnauthorizedPage'));
const NotFoundPage = lazy(() => import('@pages/NotFoundPage'));

/** Minimal suspense fallback; swap for a branded loading screen. */
function RouteFallback() {
  return null;
}

function withSuspense(element) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  {
    element: withSuspense(<AuthLayout />),
    children: [
      {
        element: <PublicOnlyRoute />,
        children: [
          { path: PATHS.LOGIN, element: withSuspense(<LoginPage />) },
          { path: PATHS.REGISTER, element: withSuspense(<RegisterPage />) },
          {
            path: PATHS.FORGOT_PASSWORD,
            element: withSuspense(<ForgotPasswordPage />),
          },
          {
            path: PATHS.RESET_PASSWORD,
            element: withSuspense(<ResetPasswordPage />),
          },
        ],
      },
    ],
  },
  {
    element: withSuspense(<DashboardLayout />),
    children: [
      {
        element: <ProtectedRoute />,
        children: [
          // Core routes
          { path: PATHS.HOME, element: withSuspense(<DashboardPage />) },
          { path: PATHS.DASHBOARD, element: withSuspense(<DashboardPage />) },
          { path: PATHS.ALERTS, element: withSuspense(<AlertsPage />) },
          {
            path: PATHS.ALERT_DETAIL,
            element: withSuspense(<AlertDetailPage />),
          },
          { path: PATHS.SETTINGS, element: withSuspense(<SettingsPage />) },
          { path: PATHS.PROFILE, element: withSuspense(<ProfilePage />) },

          // New module routes
          {
            path: PATHS.AI_INVESTIGATION,
            element: withSuspense(<AIInvestigationPage />),
          },
          {
            path: PATHS.THREAT_HUNTING,
            element: withSuspense(<ThreatHuntingPage />),
          },
          { path: PATHS.REPORTS, element: withSuspense(<ReportsPage />) },
          { path: PATHS.ANALYTICS, element: withSuspense(<AnalyticsPage />) },
          { path: PATHS.HISTORY, element: withSuspense(<HistoryPage />) },
          {
            path: PATHS.HELP_CENTER,
            element: withSuspense(<HelpCenterPage />),
          },
          {
            path: PATHS.NETWORK_TOPOLOGY,
            element: withSuspense(<NetworkTopologyPage />),
          },
        ],
      },
    ],
  },
  { path: PATHS.UNAUTHORIZED, element: withSuspense(<UnauthorizedPage />) },
  { path: PATHS.NOT_FOUND, element: withSuspense(<NotFoundPage />) },
]);

/** Thin wrapper so App.jsx only imports one thing from this module. */
export function AppRouter() {
  return <RouterProvider router={router} />;
}

export default AppRouter;
