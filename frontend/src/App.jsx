import { Toaster } from 'react-hot-toast';
import { AppProviders } from '@context';
import { AppRouter } from '@routes';

/**
 * Application root. Composition order: theme/auth/UI providers wrap
 * the router, and a single global <Toaster/> handles all notifications
 * (services layer dispatches toasts on error/success internally).
 */
function App() {
  return (
    <AppProviders>
      <AppRouter />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          className: 'text-sm font-medium',
          success: { iconTheme: { primary: '#4f46e5', secondary: '#fff' } },
        }}
      />
    </AppProviders>
  );
}

export default App;
