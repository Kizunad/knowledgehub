import { create } from "zustand";
import { devtools } from "zustand/middleware";

// Types
export type DirectorySourceMode = "github" | "link" | "local_sync";
export type DirectorySourceType = "code" | "study";

export interface DirectorySource {
    id: string;
    name: string;
    mode: DirectorySourceMode;
    source_type: DirectorySourceType;
    path: string;
    branch: string | null;
    description: string | null;
    synced_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface SourcesFilter {
    mode?: DirectorySourceMode;
    source_type?: DirectorySourceType;
    search?: string;
}

interface SyncStatus {
    source_id: string;
    status: "idle" | "syncing" | "success" | "error";
    message?: string;
    last_synced?: string;
}

interface SourcesState {
    // Data
    sources: DirectorySource[];
    selectedIds: Set<string>;
    filter: SourcesFilter;
    syncStatuses: Map<string, SyncStatus>;

    // Loading states
    isLoading: boolean;
    isCreating: boolean;
    isUpdating: boolean;
    isDeleting: boolean;
    isSyncing: boolean;

    // Pagination
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;

    // Error state
    error: string | null;

    // Actions - Data Management
    setSources: (sources: DirectorySource[]) => void;
    addSource: (source: DirectorySource) => void;
    updateSource: (id: string, updates: Partial<DirectorySource>) => void;
    removeSource: (id: string) => void;
    removeSources: (ids: string[]) => void;

    // Actions - Selection
    selectSource: (id: string) => void;
    deselectSource: (id: string) => void;
    toggleSelectSource: (id: string) => void;
    selectAll: () => void;
    deselectAll: () => void;

    // Actions - Filter
    setFilter: (filter: SourcesFilter) => void;
    clearFilter: () => void;

    // Actions - Sync Status
    setSyncStatus: (sourceId: string, status: SyncStatus) => void;
    clearSyncStatus: (sourceId: string) => void;

    // Actions - Pagination
    setPagination: (pagination: {
        total?: number;
        limit?: number;
        offset?: number;
    }) => void;
    nextPage: () => void;
    prevPage: () => void;

    // Actions - Loading States
    setLoading: (isLoading: boolean) => void;
    setCreating: (isCreating: boolean) => void;
    setUpdating: (isUpdating: boolean) => void;
    setDeleting: (isDeleting: boolean) => void;
    setSyncing: (isSyncing: boolean) => void;
    setError: (error: string | null) => void;

    // Actions - Reset
    reset: () => void;
}

const initialState = {
    sources: [],
    selectedIds: new Set<string>(),
    filter: {},
    syncStatuses: new Map<string, SyncStatus>(),
    isLoading: false,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    isSyncing: false,
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false,
    error: null,
};

export const useSourcesStore = create<SourcesState>()(
    devtools(
        (set, get) => ({
            ...initialState,

            // Data Management
            setSources: (sources) =>
                set(
                    { sources, hasMore: sources.length >= get().limit },
                    false,
                    "setSources",
                ),

            addSource: (source) =>
                set(
                    (state) => ({
                        sources: [source, ...state.sources],
                        total: state.total + 1,
                    }),
                    false,
                    "addSource",
                ),

            updateSource: (id, updates) =>
                set(
                    (state) => ({
                        sources: state.sources.map((source) =>
                            source.id === id
                                ? {
                                      ...source,
                                      ...updates,
                                      updated_at: new Date().toISOString(),
                                  }
                                : source,
                        ),
                    }),
                    false,
                    "updateSource",
                ),

            removeSource: (id) =>
                set(
                    (state) => {
                        const newSyncStatuses = new Map(state.syncStatuses);
                        newSyncStatuses.delete(id);
                        return {
                            sources: state.sources.filter(
                                (source) => source.id !== id,
                            ),
                            selectedIds: new Set(
                                [...state.selectedIds].filter(
                                    (sid) => sid !== id,
                                ),
                            ),
                            syncStatuses: newSyncStatuses,
                            total: Math.max(0, state.total - 1),
                        };
                    },
                    false,
                    "removeSource",
                ),

            removeSources: (ids) =>
                set(
                    (state) => {
                        const newSyncStatuses = new Map(state.syncStatuses);
                        ids.forEach((id) => newSyncStatuses.delete(id));
                        return {
                            sources: state.sources.filter(
                                (source) => !ids.includes(source.id),
                            ),
                            selectedIds: new Set(
                                [...state.selectedIds].filter(
                                    (sid) => !ids.includes(sid),
                                ),
                            ),
                            syncStatuses: newSyncStatuses,
                            total: Math.max(0, state.total - ids.length),
                        };
                    },
                    false,
                    "removeSources",
                ),

            // Selection
            selectSource: (id) =>
                set(
                    (state) => ({
                        selectedIds: new Set([...state.selectedIds, id]),
                    }),
                    false,
                    "selectSource",
                ),

            deselectSource: (id) =>
                set(
                    (state) => ({
                        selectedIds: new Set(
                            [...state.selectedIds].filter((sid) => sid !== id),
                        ),
                    }),
                    false,
                    "deselectSource",
                ),

            toggleSelectSource: (id) =>
                set(
                    (state) => {
                        const newSelected = new Set(state.selectedIds);
                        if (newSelected.has(id)) {
                            newSelected.delete(id);
                        } else {
                            newSelected.add(id);
                        }
                        return { selectedIds: newSelected };
                    },
                    false,
                    "toggleSelectSource",
                ),

            selectAll: () =>
                set(
                    (state) => ({
                        selectedIds: new Set(
                            state.sources.map((source) => source.id),
                        ),
                    }),
                    false,
                    "selectAll",
                ),

            deselectAll: () =>
                set({ selectedIds: new Set() }, false, "deselectAll"),

            // Filter
            setFilter: (filter) =>
                set(
                    (state) => ({
                        filter: { ...state.filter, ...filter },
                        offset: 0,
                    }),
                    false,
                    "setFilter",
                ),

            clearFilter: () =>
                set({ filter: {}, offset: 0 }, false, "clearFilter"),

            // Sync Status
            setSyncStatus: (sourceId, status) =>
                set(
                    (state) => {
                        const newStatuses = new Map(state.syncStatuses);
                        newStatuses.set(sourceId, status);
                        return { syncStatuses: newStatuses };
                    },
                    false,
                    "setSyncStatus",
                ),

            clearSyncStatus: (sourceId) =>
                set(
                    (state) => {
                        const newStatuses = new Map(state.syncStatuses);
                        newStatuses.delete(sourceId);
                        return { syncStatuses: newStatuses };
                    },
                    false,
                    "clearSyncStatus",
                ),

            // Pagination
            setPagination: (pagination) =>
                set(
                    (state) => ({
                        total: pagination.total ?? state.total,
                        limit: pagination.limit ?? state.limit,
                        offset: pagination.offset ?? state.offset,
                        hasMore:
                            (pagination.offset ?? state.offset) +
                                (pagination.limit ?? state.limit) <
                            (pagination.total ?? state.total),
                    }),
                    false,
                    "setPagination",
                ),

            nextPage: () =>
                set(
                    (state) => ({
                        offset: state.hasMore
                            ? state.offset + state.limit
                            : state.offset,
                    }),
                    false,
                    "nextPage",
                ),

            prevPage: () =>
                set(
                    (state) => ({
                        offset: Math.max(0, state.offset - state.limit),
                    }),
                    false,
                    "prevPage",
                ),

            // Loading States
            setLoading: (isLoading) => set({ isLoading }, false, "setLoading"),
            setCreating: (isCreating) =>
                set({ isCreating }, false, "setCreating"),
            setUpdating: (isUpdating) =>
                set({ isUpdating }, false, "setUpdating"),
            setDeleting: (isDeleting) =>
                set({ isDeleting }, false, "setDeleting"),
            setSyncing: (isSyncing) => set({ isSyncing }, false, "setSyncing"),
            setError: (error) => set({ error }, false, "setError"),

            // Reset
            reset: () => set(initialState, false, "reset"),
        }),
        { name: "sources-store" },
    ),
);

// Selector hooks for common patterns
export const useSources = () => useSourcesStore((state) => state.sources);

export const useSourcesByMode = (mode: DirectorySourceMode) =>
    useSourcesStore((state) =>
        state.sources.filter((source) => source.mode === mode),
    );

export const useSelectedSources = () =>
    useSourcesStore((state) =>
        state.sources.filter((source) => state.selectedIds.has(source.id)),
    );

export const useSourcesLoading = () =>
    useSourcesStore((state) => state.isLoading);

export const useSourcesError = () => useSourcesStore((state) => state.error);

export const useSourcesFilter = () => useSourcesStore((state) => state.filter);

export const useSourcesPagination = () =>
    useSourcesStore((state) => ({
        total: state.total,
        limit: state.limit,
        offset: state.offset,
        hasMore: state.hasMore,
    }));

// Helper to get source by ID
export const useSourceById = (id: string) =>
    useSourcesStore((state) =>
        state.sources.find((source) => source.id === id),
    );

// Helper to get sync status for a source
export const useSyncStatus = (sourceId: string) =>
    useSourcesStore((state) => state.syncStatuses.get(sourceId));

// Helper to count sources by mode
export const useSourcesCount = () =>
    useSourcesStore((state) => ({
        github: state.sources.filter((s) => s.mode === "github").length,
        link: state.sources.filter((s) => s.mode === "link").length,
        local_sync: state.sources.filter((s) => s.mode === "local_sync").length,
        total: state.sources.length,
        synced: state.sources.filter((s) => s.synced_at !== null).length,
    }));

// Helper to get sources that need sync
export const useSourcesNeedingSync = () =>
    useSourcesStore((state) =>
        state.sources.filter(
            (source) =>
                source.mode === "local_sync" && source.synced_at === null,
        ),
    );
