/**
 * Safe wrapper around window.localStorage.
 * Guards against SSR / privacy-mode environments where storage may throw.
 */

const isBrowser = typeof window !== 'undefined';

export const storage = {
  get(key) {
    if (!isBrowser) return null;
    try {
      const value = window.localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  },

  set(key, value) {
    if (!isBrowser) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage unavailable (private mode, quota exceeded) - fail silently.
    }
  },

  remove(key) {
    if (!isBrowser) return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // no-op
    }
  },

  clear() {
    if (!isBrowser) return;
    try {
      window.localStorage.clear();
    } catch {
      // no-op
    }
  },
};

export default storage;
