/* useHeader.js — Hook managing states and shortcuts for the SIEM Header */
import { useState, useEffect, useCallback } from 'react';
import { WORKSPACES, MOCK_ALERTS, SEARCH_COMMANDS } from '@utils/headerConfig';

export function useHeader() {
  const [activeWorkspace, setActiveWorkspace] = useState(WORKSPACES[0]);
  const [alerts, setAlerts] = useState(MOCK_ALERTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);

  // Keyboard shortcut listener (Ctrl+Space or Ctrl+/ to open command bar)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === ' ' || e.key === '/')) {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const unreadCount = alerts.filter((a) => !a.read).length;

  const markAllAsRead = useCallback(() => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  }, []);

  const clearAlert = useCallback((id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const filteredCommands = searchQuery
    ? SEARCH_COMMANDS.filter((cmd) =>
        cmd.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cmd.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : SEARCH_COMMANDS;

  return {
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
  };
}

export default useHeader;
