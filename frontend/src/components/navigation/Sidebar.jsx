/* Sidebar.jsx - Main sidebar dashboard container with slide-in drawers and keyboard shortcut observers */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Menu, 
  X, 
  ShieldAlert, 
  Search, 
  ShieldOff 
} from 'lucide-react';

import { useSidebar } from '@hooks/useSidebar';
import { NAVIGATION_ITEMS, QUICK_ACTIONS } from '@utils/sidebarConfig';
import { NavItem } from './NavItem';
import { SocStatusCard } from './SocStatusCard';
import { SidebarFooter } from './SidebarFooter';

export function Sidebar({ 
  currentPath = '/dashboard', 
  onNavigate, 
  onLogout, 
  onSettings,
  onQuickAction 
}) {
  const {
    isCollapsed,
    isHovered,
    setIsHovered,
    isMobileOpen,
    setIsMobileOpen,
    isMobileView,
    toggleCollapse,
    toggleMobileOpen,
  } = useSidebar();

  // Manage active items locally if no navigate routing triggers exist
  const [activeTab, setActiveTab] = useState(() => {
    const matchedItem = NAVIGATION_ITEMS.find(item => item.path === currentPath);
    return matchedItem ? matchedItem.id : 'dashboard';
  });

  // Keep active tab aligned with current path changes
  useEffect(() => {
    const matchedItem = NAVIGATION_ITEMS.find(item => item.path === currentPath);
    if (matchedItem) {
      setActiveTab(matchedItem.id);
    }
  }, [currentPath]);

  // Global keyboard shortcut event listener (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // CMD+K or CTRL+K triggers KQL query command
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (onQuickAction) onQuickAction('run-query');
      }
      // CMD+I or CTRL+I triggers Host Isolation
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        if (onQuickAction) onQuickAction('contain-host');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onQuickAction]);

  const handleNavClick = (itemId, path) => {
    setActiveTab(itemId);
    if (onNavigate) {
      onNavigate(path);
    }
    // Auto-close mobile drawer on link clicks
    if (isMobileView) {
      setIsMobileOpen(false);
    }
  };

  // Determine if sidebar should visual display as collapsed
  const isDisplayCollapsed = isCollapsed && !isHovered;

  // Render Sidebar inner contents (reusable for drawer & docked)
  const renderSidebarContent = () => (
    <div className="flex h-full flex-col justify-between">
      {/* 1. Header (Logo & Collapse toggle buttons) */}
      <div className="flex h-14 items-center justify-between border-b border-cyber-border-muted px-3">
        <div className="flex items-center gap-2 overflow-hidden">
          {/* Glowing Shield logo mark */}
          <div className="flex h-8 w-8 min-w-[32px] items-center justify-center rounded border border-cyber-accent-cyan bg-cyber-bg-accent text-cyber-accent-cyan shadow-[0_0_8px_var(--cyber-accent-cyan-glow)]">
            <ShieldAlert size={18} className="animate-pulse" />
          </div>
          {!isDisplayCollapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="font-mono text-xs font-bold uppercase tracking-widest text-cyber-text-bright"
            >
              SIEM <span className="text-cyber-accent-cyan">AI</span>
            </motion.span>
          )}
        </div>

        {/* Docked collapse toggle (Hidden on Mobile) */}
        {!isMobileView && (
          <button
            onClick={toggleCollapse}
            aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="flex h-7 w-7 items-center justify-center rounded border border-cyber-border-subtle bg-cyber-bg-deep text-cyber-text-muted hover:text-cyber-accent-cyan hover:border-cyber-accent-cyan/50 transition-all duration-200"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        )}

        {/* Mobile Close toggle (Hidden on Desktop) */}
        {isMobileView && (
          <button
            onClick={toggleMobileOpen}
            aria-label="Close Navigation"
            className="flex h-7 w-7 items-center justify-center rounded border border-cyber-border-subtle bg-cyber-bg-deep text-cyber-text-muted hover:text-threat-critical transition-all duration-200"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* 2. Main Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4 space-y-1">
        {NAVIGATION_ITEMS.map((item) => (
          <NavItem
            key={item.id}
            label={item.label}
            path={item.path}
            iconName={item.iconName}
            isActive={activeTab === item.id}
            isCollapsed={isDisplayCollapsed}
            badge={item.badge}
            onClick={() => handleNavClick(item.id, item.path)}
          />
        ))}

        {/* Separator boundary */}
        <div className="border-t border-cyber-border-muted my-4 mx-2" />

        {/* 3. Quick Actions Panel */}
        <div className="space-y-1">
          {!isDisplayCollapsed ? (
            <motion.h3 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-5 font-mono text-[9px] font-bold uppercase tracking-wider text-cyber-text-muted mb-2"
            >
              Quick Actions
            </motion.h3>
          ) : (
            <div className="h-4" />
          )}

          {QUICK_ACTIONS.map((action) => (
            <div key={action.id} className="px-2">
              <button
                onClick={() => onQuickAction && onQuickAction(action.id)}
                className="flex w-full items-center gap-3 rounded px-3 py-2 text-cyber-text-base hover:text-cyber-text-bright hover:bg-cyber-bg-accent/40 transition-colors duration-200 tooltip-cyber-trigger"
              >
                <div className="flex items-center justify-center min-w-[18px]">
                  {action.iconName === 'Search' ? (
                    <Search size={14} className="text-cyber-accent-blue" />
                  ) : (
                    <ShieldOff size={14} className="text-threat-high" />
                  )}
                </div>
                {!isDisplayCollapsed && (
                  <>
                    <span className="flex-1 text-left font-mono text-[9px] font-medium text-cyber-text-base">
                      {action.label}
                    </span>
                    <span className="font-mono text-[9px] text-cyber-text-muted bg-cyber-bg-deep border border-cyber-border-muted px-1.5 py-0.5 rounded leading-none">
                      {action.shortcut}
                    </span>
                  </>
                )}

                {/* Collapsed view tooltip */}
                {isDisplayCollapsed && (
                  <div className="tooltip-cyber-content left-full ml-4 translate-x-0 bottom-auto top-1/2 -translate-y-1/2 font-mono z-50">
                    <span className="text-[10px] text-cyber-text-bright">{action.label}</span>
                    <span className="text-[9px] block text-cyber-text-muted mt-0.5">Shortcut: {action.shortcut}</span>
                  </div>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Telemetry SOC Health Index */}
      <SocStatusCard isCollapsed={isDisplayCollapsed} />

      {/* 5. User Profile Footer */}
      <SidebarFooter 
        isCollapsed={isDisplayCollapsed} 
        onLogout={onLogout} 
        onSettings={onSettings} 
      />
    </div>
  );

  return (
    <>
      {/* DESKTOP MODE (Fixed width transitions) */}
      {!isMobileView ? (
        <motion.aside
          onMouseEnter={() => isCollapsed && setIsHovered(true)}
          onMouseLeave={() => isCollapsed && setIsHovered(false)}
          animate={{ 
            width: isDisplayCollapsed ? 64 : 260,
          }}
          transition={{ 
            type: 'spring', 
            stiffness: 280, 
            damping: 30 
          }}
          className="fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-cyber-border-subtle bg-cyber-bg-panel/95 backdrop-blur lg:flex"
        >
          {renderSidebarContent()}
        </motion.aside>
      ) : (
        /* MOBILE VIEW HEADER TOOLBAR & OVERLAY DRAWER */
        <>
          {/* Top Mobile Menu Header bar */}
          <header className="fixed left-0 top-0 z-40 flex h-14 w-full items-center justify-between border-b border-cyber-border-subtle bg-cyber-bg-panel/95 px-4 backdrop-blur lg:hidden">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded border border-cyber-accent-cyan bg-cyber-bg-deep text-cyber-accent-cyan shadow-[0_0_8px_var(--cyber-accent-cyan-glow)]">
                <ShieldAlert size={16} />
              </div>
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-cyber-text-bright">
                SIEM <span className="text-cyber-accent-cyan">AI</span>
              </span>
            </div>
            <button
              onClick={toggleMobileOpen}
              aria-label="Open Navigation"
              className="flex h-8 w-8 items-center justify-center rounded border border-cyber-border-subtle bg-cyber-bg-deep text-cyber-text-base hover:text-cyber-accent-cyan"
            >
              <Menu size={16} />
            </button>
          </header>

          {/* Drawer overlay layout */}
          <AnimatePresence>
            {isMobileOpen && (
              <>
                {/* Translucent backdrop click tracker */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={toggleMobileOpen}
                  className="fixed inset-0 z-40 bg-cyber-bg-deep/80 backdrop-blur-sm lg:hidden"
                />

                {/* Sidebar Drawer Panel */}
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                  className="fixed left-0 top-0 z-50 h-screen w-[260px] border-r border-cyber-border-subtle bg-cyber-bg-panel/95 lg:hidden"
                >
                  {renderSidebarContent()}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}
    </>
  );
}

export default Sidebar;
