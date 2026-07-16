import { useContext } from 'react';
import { UIContext } from '@context/UIContext';

/** Access cross-cutting UI state (sidebar, global loading, etc). */
export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}

export default useUI;
