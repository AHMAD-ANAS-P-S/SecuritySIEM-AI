/* Header.jsx — Sticky enterprise-grade header with full theme compliance */
import { Bot } from 'lucide-react';
import { Breadcrumbs } from './Breadcrumbs';
import { SearchBar } from './SearchBar';
import { NotificationMenu } from './NotificationMenu';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { ProfileMenu } from './ProfileMenu';
import { useHeader } from '@hooks/useHeader';
import { useUI } from '@hooks/useUI';
import { useTheme } from '@hooks';

export function Header() {
  const { isAssistantOpen, setIsAssistantOpen } = useUI();
  const { isDark } = useTheme();
  const {
    activeWorkspace,
    setActiveWorkspace,
    alerts,
    unreadCount,
    markAllAsRead,
    clearAlert,
    searchQuery,
    setSearchQuery,
    filteredCommands,
    isSearchOpen,
    setIsSearchOpen,
    isNotificationsOpen,
    setIsNotificationsOpen,
    isProfileOpen,
    setIsProfileOpen,
    isWorkspaceOpen,
    setIsWorkspaceOpen,
  } = useHeader();

  const handleAiTrigger = () => {
    setIsAssistantOpen((prev) => !prev);
  };

  return (
    <header
      className="sticky top-0 z-30 flex h-14 w-full items-center justify-between px-4 lg:px-6 border-b glass-panel"
      style={{
        borderColor: 'var(--cyber-border-subtle)',
      }}
    >
      {/* Left zone: Workspace Switcher & Breadcrumbs */}
      <div className="flex items-center gap-4">
        <WorkspaceSwitcher
          isOpen={isWorkspaceOpen}
          setIsOpen={setIsWorkspaceOpen}
          activeWorkspace={activeWorkspace}
          onSelect={setActiveWorkspace}
        />
        <div className="hidden lg:block h-4 border-l" style={{ borderColor: 'var(--cyber-border-subtle)' }} />
        <div className="hidden lg:block">
          <Breadcrumbs />
        </div>
      </div>

      {/* Right zone */}
      <div className="flex items-center gap-2">
        {/* Search Input Bar */}
        <SearchBar
          isOpen={isSearchOpen}
          setIsOpen={setIsSearchOpen}
          query={searchQuery}
          setQuery={setSearchQuery}
          suggestions={filteredCommands}
        />

        {/* SIEM AI Assistant Trigger */}
        <button
          onClick={handleAiTrigger}
          id="siem-ai-assistant-trigger"
          title="SIEM AI Assistant — Enterprise SOC Copilot"
          aria-pressed={isAssistantOpen}
          aria-label="Toggle SIEM AI Assistant"
          className={`
            flex h-8 items-center gap-1.5 rounded-lg border px-2.5
            font-mono text-[10px] font-bold uppercase tracking-wider
            transition-all duration-200 select-none
            ${isAssistantOpen
              ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-400 shadow-[0_0_14px_rgba(0,229,255,0.35)]'
              : isDark
                ? 'border-cyan-500/20 bg-cyan-500/5 text-cyan-400/80 hover:border-cyan-500/45 hover:bg-cyan-500/10 hover:text-cyan-400 hover:shadow-[0_0_10px_rgba(0,229,255,0.2)]'
                : 'border-sky-400/30 bg-sky-50 text-sky-600 hover:border-sky-500/50 hover:bg-sky-100 hover:shadow-[0_0_8px_rgba(2,132,199,0.15)]'
            }
          `}
        >
          <Bot size={13} className={isAssistantOpen ? 'text-cyan-400' : ''} />
          <span className="hidden md:inline">SIEM AI</span>
        </button>

        {/* Separator */}
        <div className="h-4 border-l mx-1" style={{ borderColor: 'var(--cyber-border-subtle)' }} />

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notification Feed */}
        <NotificationMenu
          isOpen={isNotificationsOpen}
          setIsOpen={setIsNotificationsOpen}
          alerts={alerts}
          unreadCount={unreadCount}
          onMarkAllRead={markAllAsRead}
          onClearAlert={clearAlert}
        />

        {/* Profile / Clearance */}
        <ProfileMenu isOpen={isProfileOpen} setIsOpen={setIsProfileOpen} />
      </div>
    </header>
  );
}

export default Header;
