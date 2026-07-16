/* DashboardLayout.jsx — Master layout coordinating Sidebar, Header, and Shell routing */
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from '@components/navigation/Sidebar';
import { Header } from '@components/header/Header';
import { DashboardShell } from '@components/layout/DashboardShell';
import { SiemAiAssistant } from '@components/layout/SiemAiAssistant';
import { useAuth } from '@hooks';
import { PATHS } from '@routes/paths';

export function DashboardLayout() {
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
    if (actionId === 'run-query') navigate(PATHS.HISTORY);
    if (actionId === 'ai-investigate') navigate(PATHS.AI_INVESTIGATION);
  };

  return (
    <div className="min-h-screen flex bg-cyber-bg-deep text-cyber-text-base select-none">
      {/* 1. Main Navigation Sidebar */}
      <Sidebar
        currentPath={location.pathname}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        onSettings={handleSettings}
        onQuickAction={handleQuickAction}
      />

      {/* 2. Content wrapper area */}
      <div className="flex-1 flex flex-col lg:ml-[260px] min-h-screen transition-all duration-300">
        {/* 3. Header bar (fixed/sticky) */}
        <Header />

        {/* 4. Scrollable inner content container */}
        <DashboardShell>
          <Outlet />
        </DashboardShell>
      </div>

      {/* 5. Enterprise SIEM AI Assistant Panel */}
      <SiemAiAssistant />
    </div>
  );
}

export default DashboardLayout;
