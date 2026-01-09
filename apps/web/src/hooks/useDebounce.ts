"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Debounces a value by the specified delay
 * @param value - The value to debounce
 * @param delay - The debounce delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}

/**
 * Returns a debounced version of a callback function
 * @param callback - The callback function to debounce
 * @param delay - The debounce delay in milliseconds
 * @returns The debounced callback function
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
    callback: T,
    delay: number,
): (...args: Parameters<T>) => void {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const callbackRef = useRef(callback);

    // Update the callback ref when the callback changes
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const debouncedCallback = useCallback(
        (...args: Parameters<T>) => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
                callbackRef.current(...args);
            }, delay);
        },
        [delay],
    );

    return debouncedCallback;
}

/**
 * State hook with debounced value
 * Returns both the immediate value and the debounced value
 * @param initialValue - The initial value
 * @param delay - The debounce delay in milliseconds
 * @returns [value, debouncedValue, setValue]
 */
export function useDebouncedState<T>(
    initialValue: T,
    delay: number,
): [T, T, React.Dispatch<React.SetStateAction<T>>] {
    const [value, setValue] = useState<T>(initialValue);
    const debouncedValue = useDebounce(value, delay);

    return [value, debouncedValue, setValue];
}

/**
 * Hook for debounced API calls
 * Automatically cancels pending calls when a new call is made
 * @param fetchFn - The async function to debounce
 * @param delay - The debounce delay in milliseconds
 * @returns Object with execute function, loading state, error, and data
 */
export function useDebouncedFetch<T, Args extends unknown[]>(
    fetchFn: (...args: Args) => Promise<T>,
    delay: number,
): {
    execute: (...args: Args) => void;
    isLoading: boolean;
    error: Error | null;
    data: T | null;
    cancel: () => void;
} {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [data, setData] = useState<T | null>(null);

    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const fetchFnRef = useRef(fetchFn);

    // Update the fetch function ref when it changes
    useEffect(() => {
        fetchFnRef.current = fetchFn;
    }, [fetchFn]);

    const cancel = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsLoading(false);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cancel();
        };
    }, [cancel]);

    const execute = useCallback(
        (...args: Args) => {
            // Cancel any pending request
            cancel();

            // Set loading state
            setIsLoading(true);
            setError(null);

            // Create new abort controller
            abortControllerRef.current = new AbortController();

            // Debounce the actual fetch
            timeoutRef.current = setTimeout(async () => {
                try {
                    const result = await fetchFnRef.current(...args);
                    setData(result);
                    setError(null);
                } catch (err) {
                    if (err instanceof Error && err.name === "AbortError") {
                        // Request was cancelled, don't update state
                        return;
                    }
                    setError(err instanceof Error ? err : new Error(String(err)));
                } finally {
                    setIsLoading(false);
                }
            }, delay);
        },
        [delay, cancel],
    );

    return { execute, isLoading, error, data, cancel };
}
