"use client";

import { useCallback, useEffect, useRef } from "react";
import {
    useSearchStore,
    type SearchResult,
    type SearchResultType,
    type SearchFilters,
} from "@/store";
import { isSupabaseConfigured } from "@/lib/supabase/client";

// API Response types
interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

interface SearchResponse {
    results: SearchResult[];
    query: string;
    total: number;
}

// Hook options
interface UseSearchOptions {
    debounceMs?: number;
    minQueryLength?: number;
}

/**
 * Custom hook for global search with API integration
 */
export function useSearch(options: UseSearchOptions = {}) {
    const { debounceMs = 300, minQueryLength = 2 } = options;

    // Store state
    const query = useSearchStore((state) => state.query);
    const debouncedQuery = useSearchStore((state) => state.debouncedQuery);
    const results = useSearchStore((state) => state.results);
    const selectedIndex = useSearchStore((state) => state.selectedIndex);
    const filters = useSearchStore((state) => state.filters);
    const isOpen = useSearchStore((state) => state.isOpen);
    const isLoading = useSearchStore((state) => state.isLoading);
    const hasSearched = useSearchStore((state) => state.hasSearched);
    const error = useSearchStore((state) => state.error);

    // Store actions
    const setQuery = useSearchStore((state) => state.setQuery);
    const setDebouncedQuery = useSearchStore(
        (state) => state.setDebouncedQuery,
    );
    const clearQuery = useSearchStore((state) => state.clearQuery);
    const setResults = useSearchStore((state) => state.setResults);
    const clearResults = useSearchStore((state) => state.clearResults);
    const setSelectedIndex = useSearchStore((state) => state.setSelectedIndex);
    const selectNext = useSearchStore((state) => state.selectNext);
    const selectPrevious = useSearchStore((state) => state.selectPrevious);
    const selectFirst = useSearchStore((state) => state.selectFirst);
    const setFilters = useSearchStore((state) => state.setFilters);
    const toggleType = useSearchStore((state) => state.toggleType);
    const resetFilters = useSearchStore((state) => state.resetFilters);
    const open = useSearchStore((state) => state.open);
    const close = useSearchStore((state) => state.close);
    const storeToggle = useSearchStore((state) => state.toggle);
    const setLoading = useSearchStore((state) => state.setLoading);
    const setError = useSearchStore((state) => state.setError);

    // Debounce timer ref
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    /**
     * Execute search against API
     */
    const executeSearch = useCallback(
        async (searchQuery: string, searchFilters?: SearchFilters) => {
            if (!isSupabaseConfigured()) {
                setError("Supabase 未配置");
                return { success: false, error: "Supabase 未配置" };
            }

            if (searchQuery.length < minQueryLength) {
                clearResults();
                return { success: false, error: "查询太短" };
            }

            setLoading(true);
            setError(null);

            try {
                const currentFilters = searchFilters || filters;

                // Build query params
                const params = new URLSearchParams();
                params.set("q", searchQuery);
                if (currentFilters.types.length > 0) {
                    params.set("types", currentFilters.types.join(","));
                }
                params.set("limit", String(currentFilters.limit));

                const response = await fetch(
                    `/api/search?${params.toString()}`,
                );
                const result: ApiResponse<SearchResponse> =
                    await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.error || "搜索失败");
                }

                if (result.data) {
                    setResults(result.data.results);
                }

                return { success: true, data: result.data };
            } catch (err) {
                const message = err instanceof Error ? err.message : "搜索失败";
                setError(message);
                return { success: false, error: message };
            } finally {
                setLoading(false);
            }
        },
        [
            filters,
            minQueryLength,
            setResults,
            clearResults,
            setLoading,
            setError,
        ],
    );

    /**
     * Handle query change with debounce
     */
    const handleQueryChange = useCallback(
        (newQuery: string) => {
            setQuery(newQuery);

            // Clear existing timer
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }

            // Clear results if query is empty
            if (newQuery.length === 0) {
                setDebouncedQuery("");
                clearResults();
                return;
            }

            // Debounce the search
            debounceTimer.current = setTimeout(() => {
                setDebouncedQuery(newQuery);
                if (newQuery.length >= minQueryLength) {
                    executeSearch(newQuery);
                }
            }, debounceMs);
        },
        [
            debounceMs,
            minQueryLength,
            setQuery,
            setDebouncedQuery,
            clearResults,
            executeSearch,
        ],
    );

    /**
     * Immediate search without debounce
     */
    const searchNow = useCallback(
        (searchQuery?: string) => {
            const q = searchQuery ?? query;
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
            setDebouncedQuery(q);
            return executeSearch(q);
        },
        [query, setDebouncedQuery, executeSearch],
    );

    /**
     * Get selected result
     */
    const getSelectedResult = useCallback((): SearchResult | null => {
        if (
            results.length === 0 ||
            selectedIndex < 0 ||
            selectedIndex >= results.length
        ) {
            return null;
        }
        return results[selectedIndex];
    }, [results, selectedIndex]);

    /**
     * Handle keyboard navigation
     */
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent | KeyboardEvent) => {
            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    selectNext();
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    selectPrevious();
                    break;
                case "Enter":
                    e.preventDefault();
                    return getSelectedResult();
                case "Escape":
                    e.preventDefault();
                    close();
                    break;
                case "Home":
                    e.preventDefault();
                    selectFirst();
                    break;
                default:
                    break;
            }
            return null;
        },
        [selectNext, selectPrevious, selectFirst, close, getSelectedResult],
    );

    /**
     * Open search with optional initial query
     */
    const openSearch = useCallback(
        (initialQuery?: string) => {
            open();
            if (initialQuery) {
                handleQueryChange(initialQuery);
            }
        },
        [open, handleQueryChange],
    );

    /**
     * Close and reset search
     */
    const closeSearch = useCallback(() => {
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }
        close();
    }, [close]);

    /**
     * Toggle search open/close
     */
    const toggleSearch = useCallback(() => {
        storeToggle();
    }, [storeToggle]);

    /**
     * Update filters and re-search
     */
    const updateFilters = useCallback(
        async (newFilters: Partial<SearchFilters>) => {
            setFilters(newFilters);
            if (debouncedQuery.length >= minQueryLength) {
                return executeSearch(debouncedQuery, {
                    ...filters,
                    ...newFilters,
                });
            }
            return { success: false };
        },
        [filters, debouncedQuery, minQueryLength, setFilters, executeSearch],
    );

    /**
     * Toggle a result type filter
     */
    const toggleTypeFilter = useCallback(
        async (type: SearchResultType) => {
            toggleType(type);
            // Get updated types after toggle
            const currentTypes = filters.types.includes(type)
                ? filters.types.filter((t) => t !== type)
                : [...filters.types, type];

            if (
                currentTypes.length > 0 &&
                debouncedQuery.length >= minQueryLength
            ) {
                return executeSearch(debouncedQuery, {
                    ...filters,
                    types: currentTypes,
                });
            }
            return { success: false };
        },
        [filters, debouncedQuery, minQueryLength, toggleType, executeSearch],
    );

    /**
     * Reset filters and re-search
     */
    const resetAndSearch = useCallback(async () => {
        resetFilters();
        if (debouncedQuery.length >= minQueryLength) {
            return executeSearch(debouncedQuery);
        }
        return { success: false };
    }, [debouncedQuery, minQueryLength, resetFilters, executeSearch]);

    // Cleanup debounce timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, []);

    // Global keyboard shortcut (Cmd+K / Ctrl+K)
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                toggleSearch();
            }
        };

        document.addEventListener("keydown", handleGlobalKeyDown);
        return () => {
            document.removeEventListener("keydown", handleGlobalKeyDown);
        };
    }, [toggleSearch]);

    return {
        // State
        query,
        debouncedQuery,
        results,
        selectedIndex,
        filters,
        isOpen,
        isLoading,
        hasSearched,
        error,

        // Computed
        selectedResult: getSelectedResult(),
        hasResults: results.length > 0,
        showEmptyState:
            hasSearched &&
            !isLoading &&
            results.length === 0 &&
            debouncedQuery.length >= minQueryLength,
        resultCounts: {
            file: results.filter((r) => r.result_type === "file").length,
            chat: results.filter((r) => r.result_type === "chat").length,
            idea: results.filter((r) => r.result_type === "idea").length,
            total: results.length,
        },

        // Query Actions
        handleQueryChange,
        setQuery,
        clearQuery,
        searchNow,

        // Navigation Actions
        selectNext,
        selectPrevious,
        selectFirst,
        setSelectedIndex,
        handleKeyDown,
        getSelectedResult,

        // Filter Actions
        updateFilters,
        toggleTypeFilter,
        resetFilters: resetAndSearch,

        // UI Actions
        open: openSearch,
        close: closeSearch,
        toggle: toggleSearch,

        // Utils
        isConfigured: isSupabaseConfigured(),
    };
}

/**
 * Hook for search keyboard navigation only
 */
export function useSearchKeyboard() {
    const selectNext = useSearchStore((state) => state.selectNext);
    const selectPrevious = useSearchStore((state) => state.selectPrevious);
    const selectFirst = useSearchStore((state) => state.selectFirst);
    const close = useSearchStore((state) => state.close);
    const results = useSearchStore((state) => state.results);
    const selectedIndex = useSearchStore((state) => state.selectedIndex);

    const getSelectedResult = useCallback((): SearchResult | null => {
        if (
            results.length === 0 ||
            selectedIndex < 0 ||
            selectedIndex >= results.length
        ) {
            return null;
        }
        return results[selectedIndex];
    }, [results, selectedIndex]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent | KeyboardEvent): SearchResult | null => {
            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    selectNext();
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    selectPrevious();
                    break;
                case "Enter":
                    e.preventDefault();
                    return getSelectedResult();
                case "Escape":
                    e.preventDefault();
                    close();
                    break;
                case "Home":
                    e.preventDefault();
                    selectFirst();
                    break;
                default:
                    break;
            }
            return null;
        },
        [selectNext, selectPrevious, selectFirst, close, getSelectedResult],
    );

    return {
        handleKeyDown,
        selectNext,
        selectPrevious,
        selectFirst,
        getSelectedResult,
    };
}

/**
 * Hook for search results by type
 */
export function useSearchResultsByType(type: SearchResultType) {
    return useSearchStore((state) =>
        state.results.filter((r) => r.result_type === type),
    );
}

/**
 * Hook to check if search is configured
 */
export function useSearchConfigured() {
    return isSupabaseConfigured();
}
