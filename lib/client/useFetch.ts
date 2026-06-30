"use client";

import { useCallback, useEffect, useState } from "react";

export interface FetchState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

/**
 * Fetch JSON from an API route with loading/error state and manual refetch.
 * Pass `null` as the url to disable fetching. Aborts in-flight requests on
 * url change or unmount.
 */
export function useFetch<T>(
  url: string | null,
): FetchState<T> & { refetch: () => void } {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    error: null,
    loading: !!url,
  });
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  // This hook synchronizes React state with an external system (an HTTP
  // request); the setState calls below are that synchronization, so the
  // set-state-in-effect rule doesn't apply.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!url) {
      setState({ data: null, error: null, loading: false });
      return;
    }
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    fetch(url, { signal: controller.signal })
      .then(async (res) => {
        const body: unknown = await res.json().catch(() => ({}));
        if (!res.ok) {
          const message =
            typeof body === "object" && body && "error" in body
              ? String((body as { error: unknown }).error)
              : `Request failed (${res.status})`;
          throw new Error(message);
        }
        return body as T;
      })
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          data: null,
          error: err instanceof Error ? err.message : "Request failed",
          loading: false,
        });
      });
    return () => controller.abort();
  }, [url, tick]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return { ...state, refetch };
}
