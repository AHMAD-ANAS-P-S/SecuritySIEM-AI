import { createContext, useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

export const UIContext = createContext(null);

/**
 * Cross-cutting UI state that doesn't belong to a single feature:
 * sidebar collapse state, global loading overlay, command palette, etc.
 */
export function UIProvider({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const value = useMemo(
    () => ({
      isSidebarOpen,
      toggleSidebar,
      setIsSidebarOpen,
      isGlobalLoading,
      setIsGlobalLoading,
      isAssistantOpen,
      setIsAssistantOpen,
    }),
    [isSidebarOpen, toggleSidebar, isGlobalLoading, isAssistantOpen]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

UIProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
