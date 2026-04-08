// hooks/useAsyncAction.ts

'use client';

import { useState, useCallback, useRef } from 'react';

interface UseAsyncActionOptions {
  /** Minimum time to show loading state (prevents flash) */
  minLoadingTime?: number;
  /** Debounce time in ms (prevents rapid clicks) */
  debounceMs?: number;
  /** Callback on success */
  onSuccess?: (result: any) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

interface UseAsyncActionReturn<T extends (...args: any[]) => Promise<any>> {
  execute: T;
  isLoading: boolean;
  error: Error | null;
  reset: () => void;
}

/**
 * Hook for handling async actions with loading state and double-submit prevention
 */
export function useAsyncAction<T extends (...args: any[]) => Promise<any>>(
  action: T,
  options: UseAsyncActionOptions = {}
): UseAsyncActionReturn<T> {
  const {
    minLoadingTime = 300,
    debounceMs = 500,
    onSuccess,
    onError,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const lastCallTime = useRef<number>(0);
  const isExecuting = useRef<boolean>(false);

  const execute = useCallback(
    async (...args: Parameters<T>): Promise<ReturnType<T> | undefined> => {
      // Prevent double-submit
      if (isExecuting.current) {
        console.warn('[useAsyncAction] Action already in progress, ignoring');
        return undefined;
      }

      // Debounce rapid clicks
      const now = Date.now();
      if (now - lastCallTime.current < debounceMs) {
        console.warn('[useAsyncAction] Debouncing rapid click');
        return undefined;
      }
      lastCallTime.current = now;

      // Start loading
      isExecuting.current = true;
      setIsLoading(true);
      setError(null);

      const startTime = Date.now();

      try {
        const result = await action(...args);

        // Ensure minimum loading time for better UX
        const elapsed = Date.now() - startTime;
        if (elapsed < minLoadingTime) {
          await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsed));
        }

        onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
        throw error;
      } finally {
        setIsLoading(false);
        isExecuting.current = false;
      }
    },
    [action, debounceMs, minLoadingTime, onSuccess, onError]
  ) as T;

  const reset = useCallback(() => {
    setError(null);
    setIsLoading(false);
    isExecuting.current = false;
  }, []);

  return { execute, isLoading, error, reset };
}

/**
 * Simple hook for form submission with loading state
 */
export function useFormSubmit<T = void>(
  submitFn: () => Promise<T>,
  options?: UseAsyncActionOptions
) {
  return useAsyncAction(submitFn, options);
}