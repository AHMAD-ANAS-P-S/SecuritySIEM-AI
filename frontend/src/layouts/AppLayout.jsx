/* AppLayout.jsx — Main application shell with SIEM AI sidebar */
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sidebar } from '@components/navigation/Sidebar';
import { Header } from '@components/header/Header';
import { useAuth } from '@hooks';
import { PATHS } from '@routes/paths';

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate(PATHS.LOGIN, { replace: true });
  };

  const handleSettings = () => navigate(PATHS.SETTINGS);
  const handleNavigate = (path) => navigate(path);
  const handleQuickAction = (actionId) => {
    if (actionId === 'run-query') navigate('/logs');
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--cyber-bg-deep)' }}>
      {/* Sidebar */}
      <Sidebar
        currentPath={location.pathname}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        onSettings={handleSettings}
        onQuickAction={handleQuickAction}
      />

      {/* Main content area — offsets for sidebar on lg+ */}
      <div className="flex-1 flex flex-col lg:ml-[260px] min-h-screen transition-all duration-300">
        {/* Production-grade Header */}
        <Header />

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}

