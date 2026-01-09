import { create } from "zustand";
import { devtools } from "zustand/middleware";

// Types
export type SearchResultType = "file" | "chat" | "idea";

export interface SearchResult {
    result_type: SearchResultType;
    id: string;
    title: string;
    snippet: string;
    path: string | null;
    rank: number;
}

export interface SearchFilters {
    types: SearchResultType[];
    limit: number;
}

interface SearchState {
    // Query
    query: string;
    debouncedQuery: string;

    // Results
    results: SearchResult[];
    selectedIndex: number;

    // Filters
    filters: SearchFilters;

    // UI State
    isOpen: boolean;
    isLoading: boolean;
    hasSearched: boolean;

    // Error state
    error: string | null;

    // Actions - Query
    setQuery: (query: string) => void;
    setDebouncedQuery: (query: string) => void;
    clearQuery: () => void;

    // Actions - Results
    setResults: (results: SearchResult[]) => void;
    clearResults: () => void;

    // Actions - Selection
    setSelectedIndex: (index: number) => void;
    selectNext: () => void;
    selectPrevious: () => void;
    selectFirst: () => void;

    // Actions - Filters
    setFilters: (filters: Partial<SearchFilters>) => void;
    toggleType: (type: SearchResultType) => void;
    resetFilters: () => void;

    // Actions - UI State
    open: () => void;
    close: () => void;
    toggle: () => void;
    setLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;

    // Actions - Reset
    reset: () => void;
}

const defaultFilters: SearchFilters = {
    types: ["file", "chat", "idea"],
    limit: 20,
};

const initialState = {
    query: "",
    debouncedQuery: "",
    results: [],
    selectedIndex: 0,
    filters: defaultFilters,
    isOpen: false,
    isLoading: false,
    hasSearched: false,
    error: null,
};

export const useSearchStore = create<SearchState>()(
    devtools(
        (set) => ({
            ...initialState,

            // Query Actions
            setQuery: (query) =>
                set({ query, selectedIndex: 0 }, false, "setQuery"),

            setDebouncedQuery: (debouncedQuery) =>
                set({ debouncedQuery }, false, "setDebouncedQuery"),

            clearQuery: () =>
                set(
                    {
                        query: "",
                        debouncedQuery: "",
                        results: [],
                        selectedIndex: 0,
                        hasSearched: false,
                        error: null,
                    },
                    false,
                    "clearQuery",
                ),

            // Results Actions
            setResults: (results) =>
                set(
                    {
                        results,
                        selectedIndex: 0,
                        hasSearched: true,
                        error: null,
                    },
                    false,
                    "setResults",
                ),

            clearResults: () =>
                set(
                    { results: [], selectedIndex: 0, hasSearched: false },
                    false,
                    "clearResults",
                ),

            // Selection Actions
            setSelectedIndex: (index) =>
                set(
                    (state) => ({
                        selectedIndex: Math.max(
                            0,
                            Math.min(index, state.results.length - 1),
                        ),
                    }),
                    false,
                    "setSelectedIndex",
                ),

            selectNext: () =>
                set(
                    (state) => ({
                        selectedIndex:
                            state.selectedIndex < state.results.length - 1
                                ? state.selectedIndex + 1
                                : state.selectedIndex,
                    }),
                    false,
                    "selectNext",
                ),

            selectPrevious: () =>
                set(
                    (state) => ({
                        selectedIndex:
                            state.selectedIndex > 0
                                ? state.selectedIndex - 1
                                : 0,
                    }),
                    false,
                    "selectPrevious",
                ),

            selectFirst: () => set({ selectedIndex: 0 }, false, "selectFirst"),

            // Filter Actions
            setFilters: (filters) =>
                set(
                    (state) => ({
                        filters: { ...state.filters, ...filters },
                    }),
                    false,
                    "setFilters",
                ),

            toggleType: (type) =>
                set(
                    (state) => {
                        const currentTypes = state.filters.types;
                        const newTypes = currentTypes.includes(type)
                            ? currentTypes.filter((t) => t !== type)
                            : [...currentTypes, type];
                        // Ensure at least one type is selected
                        if (newTypes.length === 0) {
                            return state;
                        }
                        return {
                            filters: { ...state.filters, types: newTypes },
                        };
                    },
                    false,
                    "toggleType",
                ),

            resetFilters: () =>
                set({ filters: defaultFilters }, false, "resetFilters"),

            // UI State Actions
            open: () =>
                set(
                    {
                        isOpen: true,
                        query: "",
                        debouncedQuery: "",
                        results: [],
                        selectedIndex: 0,
                        hasSearched: false,
                        error: null,
                    },
                    false,
                    "open",
                ),

            close: () =>
                set(
                    {
                        isOpen: false,
                        query: "",
                        debouncedQuery: "",
                        results: [],
                        selectedIndex: 0,
                        hasSearched: false,
                        error: null,
                    },
                    false,
                    "close",
                ),

            toggle: () =>
                set(
                    (state) => {
                        if (state.isOpen) {
                            return {
                                isOpen: false,
                                query: "",
                                debouncedQuery: "",
                                results: [],
                                selectedIndex: 0,
                                hasSearched: false,
                                error: null,
                            };
                        }
                        return { isOpen: true };
                    },
                    false,
                    "toggle",
                ),

            setLoading: (isLoading) => set({ isLoading }, false, "setLoading"),

            setError: (error) =>
                set({ error, isLoading: false }, false, "setError"),

            // Reset
            reset: () => set(initialState, false, "reset"),
        }),
        { name: "search-store" },
    ),
);

// Selector hooks for common patterns
export const useSearchQuery = () => useSearchStore((state) => state.query);
export const useSearchResults = () => useSearchStore((state) => state.results);
export const useSearchIsOpen = () => useSearchStore((state) => state.isOpen);
export const useSearchIsLoading = () =>
    useSearchStore((state) => state.isLoading);
export const useSearchError = () => useSearchStore((state) => state.error);
export const useSearchFilters = () => useSearchStore((state) => state.filters);
export const useSearchSelectedIndex = () =>
    useSearchStore((state) => state.selectedIndex);

// Get currently selected result
export const useSelectedResult = () =>
    useSearchStore((state) =>
        state.results.length > 0 ? state.results[state.selectedIndex] : null,
    );

// Get results filtered by type
export const useResultsByType = (type: SearchResultType) =>
    useSearchStore((state) =>
        state.results.filter((r) => r.result_type === type),
    );

// Get result counts by type
export const useResultCounts = () =>
    useSearchStore((state) => ({
        file: state.results.filter((r) => r.result_type === "file").length,
        chat: state.results.filter((r) => r.result_type === "chat").length,
        idea: state.results.filter((r) => r.result_type === "idea").length,
        total: state.results.length,
    }));

// Check if has results
export const useHasResults = () =>
    useSearchStore((state) => state.results.length > 0);

// Check if should show empty state
export const useShowEmptyState = () =>
    useSearchStore(
        (state) =>
            state.hasSearched &&
            !state.isLoading &&
            state.results.length === 0 &&
            state.debouncedQuery.length >= 2,
    );
