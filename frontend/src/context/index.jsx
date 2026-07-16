import PropTypes from 'prop-types';
import { AuthProvider } from '@context/AuthContext';
import { ThemeProvider } from '@context/ThemeContext';
import { UIProvider } from '@context/UIContext';

/**
 * Composes every context provider in the correct order.
 * Import once in main.jsx to keep the render tree flat and readable.
 */
export function AppProviders({ children }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UIProvider>{children}</UIProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

AppProviders.propTypes = {
  children: PropTypes.node.isRequired,
};

export { AuthContext } from '@context/AuthContext';
export { ThemeContext, THEMES } from '@context/ThemeContext';
export { UIContext } from '@context/UIContext';
