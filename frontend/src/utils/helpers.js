/**
 * Generic, dependency-free helper functions shared across the app.
 */

/** Merge conditional class names (lightweight clsx alternative). */
export function cn(...inputs) {
  return inputs
    .flat(Infinity)
    .filter(Boolean)
    .join(' ')
    .trim();
}

/** Debounce a function invocation. */
export function debounce(fn, delay = 300) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/** Throttle a function invocation. */
export function throttle(fn, limit = 300) {
  let inThrottle = false;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/** Safely access nested object paths without throwing. */
export function getNested(obj, path, fallback = undefined) {
  return path
    .split('.')
    .reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : fallback), obj);
}

/** Truncate a string to a maximum length with ellipsis. */
export function truncate(str = '', maxLength = 80) {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength).trimEnd()}…`;
}

/** Format a number using locale-aware grouping. */
export function formatNumber(value, options = {}) {
  return new Intl.NumberFormat('en-US', options).format(value ?? 0);
}

/** Generate a lightweight unique id (non-cryptographic). */
export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Sleep helper, primarily for mock/dev flows. */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
