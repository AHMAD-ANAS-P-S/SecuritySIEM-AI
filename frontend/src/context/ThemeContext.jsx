import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import storage from '@utils/storage';
import { STORAGE_KEYS } from '@utils/constants';

export const ThemeContext = createContext(null);

export const THEMES = { LIGHT: 'light', DARK: 'dark' };

function getPreferredTheme() {
  const stored = storage.get(STORAGE_KEYS.THEME);
  if (stored === THEMES.LIGHT || stored === THEMES.DARK) return stored;
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  return prefersDark ? THEMES.DARK : THEMES.LIGHT;
}

/**
 * Provides the current theme and a toggle/setter, syncing the choice
 * to localStorage and to the `dark` class on <html> for Tailwind.
 */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getPreferredTheme);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle('dark', theme === THEMES.DARK);
    storage.set(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK));
  }, []);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === THEMES.DARK,
      setTheme,
      toggleTheme,
    }),
    [theme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

