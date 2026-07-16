import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Generic async fetch hook: wraps a service call with loading/error/data
 * state and an abortable, re-runnable `refetch`. Keeps components free
 * of repeated try/catch/loading boilerplate.
 *
 * @param {Function} fetcher - async function returning data, receives an AbortSignal
 * @param {Array} deps - dependency array controlling automatic re-fetch
 * @param {{ immediate?: boolean }} options
 */
export function useFetch(fetcher, deps = [], { immediate = true } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(immediate);
  const controllerRef = useRef(null);

  const execute = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    try {
      const result = await fetcher(controller.signal);
      if (!controller.signal.aborted) {
        setData(result);
      }
      return result;
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err);
      }
      throw err;
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (immediate) execute();
    return () => controllerRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [execute, immediate]);

  return { data, error, isLoading, refetch: execute };
}

export default useFetch;
