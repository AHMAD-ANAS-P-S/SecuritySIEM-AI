/* useSidebar.js - State orchestrator hook for SIEM AI Sidebar */
import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'siem_ai_sidebar_collapsed';
const MOBILE_BREAKPOINT = 1024; // Tailwind lg screen
const TABLET_BREAKPOINT = 1280; // Tailwind xl screen

export function useSidebar() {
  // Initialize collapse state based on localStorage or screen sizes
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const persistedValue = localStorage.getItem(STORAGE_KEY);
      if (persistedValue !== null) {
        return JSON.parse(persistedValue);
      }
      // If no persistence, auto-collapse on tablet layouts
      return window.innerWidth < TABLET_BREAKPOINT && window.innerWidth >= MOBILE_BREAKPOINT;
    }
    return false;
  });

  const [isHovered, setIsHovered] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < MOBILE_BREAKPOINT;
    }
    return false;
  });

  // Handle window resizing
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const width = window.innerWidth;
      const onMobile = width < MOBILE_BREAKPOINT;
      setIsMobileView(onMobile);

      if (onMobile) {
        // Reset collapse state when moving to mobile
        setIsCollapsed(false);
      } else {
        // Auto close mobile drawer when switching back to desktop
        setIsMobileOpen(false);

        // Auto collapse sidebar if window resized to tablet dimensions
        if (width < TABLET_BREAKPOINT && width >= MOBILE_BREAKPOINT) {
          setIsCollapsed(true);
        } else {
          // Read user preference back for large desktops
          const preference = localStorage.getItem(STORAGE_KEY);
          setIsCollapsed(preference !== null ? JSON.parse(preference) : false);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    // Execute immediately on mount to ensure size alignment
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Collapse toggle that persists user setting
  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const nextValue = !prev;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextValue));
      return nextValue;
    });
  }, []);

  const toggleMobileOpen = useCallback(() => {
    setIsMobileOpen((prev) => !prev);
  }, []);

  return {
    isCollapsed,
    setIsCollapsed,
    isHovered,
    setIsHovered,
    isMobileOpen,
    setIsMobileOpen,
    isMobileView,
    toggleCollapse,
    toggleMobileOpen,
  };
}

export default useSidebar;
