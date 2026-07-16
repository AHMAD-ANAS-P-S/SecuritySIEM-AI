import { useContext } from 'react';
import { ThemeContext } from '@context/ThemeContext';

/** Access the current theme, and helpers to toggle/set it. */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default useTheme;
