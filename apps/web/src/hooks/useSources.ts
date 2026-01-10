"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
    useSourcesStore,
    type DirectorySource,
    type DirectorySourceMode,
    type DirectorySourceType,
    type SourcesFilter,
} from "@/store";
import { isSupabaseConfigured } from "@/lib/supabase/client";

// API Response types
interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

interface SourcesListResponse {
    sources: DirectorySource[];
    total: number;
    limit: number;
    offset: number;
}

// Create source input
export interface CreateSourceInput {
    name: string;
    mode: DirectorySourceMode;
    path: string;
    branch?: string;
    description?: string;
    source_type?: DirectorySourceType;
}

// Update source input
export interface UpdateSourceInput {
    name?: string;
    path?: string;
    branch?: string;
    description?: string;
}

// Sync result
interface SyncResult {
    source_id: string;
    files_synced: number;
    status: "success" | "error";
    message?: string;
}

// Hook options
interface UseSourcesOptions {
    autoFetch?: boolean;
    initialFilter?: SourcesFilter;
    /** Use local state instead of global store - useful when multiple components need different filtered data */
    useLocalState?: boolean;
}

/**
 * Custom hook for managing directory sources with API integration
 */
export function useSources(options: UseSourcesOptions = {}) {
    const { autoFetch = true, initialFilter, useLocalState = false } = options;

    // Local state for isolated data (when useLocalState is true)
    const [localSources, setLocalSources] = useState<DirectorySource[]>([]);
    const [localFilter, setLocalFilter] = useState<SourcesFilter>(
        initialFilter || {},
    );
    const [localIsLoading, setLocalIsLoading] = useState(false);
    const [localIsCreating, setLocalIsCreating] = useState(false);
    const [localIsUpdating, setLocalIsUpdating] = useState(false);
    const [localIsDeleting, setLocalIsDeleting] = useState(false);
    const [localIsSyncing, setLocalIsSyncing] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const [localTotal, setLocalTotal] = useState(0);
    const [localLimit] = useState(50);
    const [localOffset, setLocalOffset] = useState(0);
    const [localHasMore, setLocalHasMore] = useState(false);
    const [localSyncStatuses, setLocalSyncStatuses] = useState<
        Map<
            string,
            {
                source_id: string;
                status: string;
                message?: string;
                last_synced?: string;
            }
        >
    >(new Map());

    // Store state (used when useLocalState is false)
    const storeSources = useSourcesStore((state) => state.sources);
    const storeFilter = useSourcesStore((state) => state.filter);
    const storeSyncStatuses = useSourcesStore((state) => state.syncStatuses);
    const storeIsLoading = useSourcesStore((state) => state.isLoading);
    const storeIsCreating = useSourcesStore((state) => state.isCreating);
    const storeIsUpdating = useSourcesStore((state) => state.isUpdating);
    const storeIsDeleting = useSourcesStore((state) => state.isDeleting);
    const storeIsSyncing = useSourcesStore((state) => state.isSyncing);
    const storeError = useSourcesStore((state) => state.error);
    const storeTotal = useSourcesStore((state) => state.total);
    const storeLimit = useSourcesStore((state) => state.limit);
    const storeOffset = useSourcesStore((state) => state.offset);
    const storeHasMore = useSourcesStore((state) => state.hasMore);

    // Store actions
    const setStoreSources = useSourcesStore((state) => state.setSources);
    const addStoreSource = useSourcesStore((state) => state.addSource);
    const updateSourceInStore = useSourcesStore((state) => state.updateSource);
    const removeStoreSource = useSourcesStore((state) => state.removeSource);
    const removeStoreSources = useSourcesStore((state) => state.removeSources);
    const setStoreLoading = useSourcesStore((state) => state.setLoading);
    const setStoreCreating = useSourcesStore((state) => state.setCreating);
    const setStoreUpdating = useSourcesStore((state) => state.setUpdating);
    const setStoreDeleting = useSourcesStore((state) => state.setDeleting);
    const setStoreSyncing = useSourcesStore((state) => state.setSyncing);
    const setStoreError = useSourcesStore((state) => state.setError);
    const setStorePagination = useSourcesStore((state) => state.setPagination);
    const setStoreFilter = useSourcesStore((state) => state.setFilter);
    const setStoreSyncStatus = useSourcesStore((state) => state.setSyncStatus);
    const clearStoreSyncStatus = useSourcesStore(
        (state) => state.clearSyncStatus,
    );

    // Choose between local and store state
    const sources = useLocalState ? localSources : storeSources;
    const filter = useLocalState ? localFilter : storeFilter;
    const syncStatuses = useLocalState ? localSyncStatuses : storeSyncStatuses;
    const isLoading = useLocalState ? localIsLoading : storeIsLoading;
    const isCreating = useLocalState ? localIsCreating : storeIsCreating;
    const isUpdating = useLocalState ? localIsUpdating : storeIsUpdating;
    const isDeleting = useLocalState ? localIsDeleting : storeIsDeleting;
    const isSyncing = useLocalState ? localIsSyncing : storeIsSyncing;
    const error = useLocalState ? localError : storeError;
    const total = useLocalState ? localTotal : storeTotal;
    const limit = useLocalState ? localLimit : storeLimit;
    const offset = useLocalState ? localOffset : storeOffset;
    const hasMore = useLocalState ? localHasMore : storeHasMore;

    // Create unified setters
    const setSources = useCallback(
        (sources: DirectorySource[]) => {
            if (useLocalState) {
                setLocalSources(sources);
                setLocalHasMore(sources.length >= localLimit);
            } else {
                setStoreSources(sources);
            }
        },
        [useLocalState, localLimit, setStoreSources],
    );

    const addSource = useCallback(
        (source: DirectorySource) => {
            if (useLocalState) {
                setLocalSources((prev) => [source, ...prev]);
                setLocalTotal((prev) => prev + 1);
            } else {
                addStoreSource(source);
            }
        },
        [useLocalState, addStoreSource],
    );

    const removeSource = useCallback(
        (id: string) => {
            if (useLocalState) {
                setLocalSources((prev) => prev.filter((s) => s.id !== id));
                setLocalTotal((prev) => Math.max(0, prev - 1));
                setLocalSyncStatuses((prev) => {
                    const next = new Map(prev);
                    next.delete(id);
                    return next;
                });
            } else {
                removeStoreSource(id);
            }
        },
        [useLocalState, removeStoreSource],
    );

    const removeSources = useCallback(
        (ids: string[]) => {
            if (useLocalState) {
                setLocalSources((prev) =>
                    prev.filter((s) => !ids.includes(s.id)),
                );
                setLocalTotal((prev) => Math.max(0, prev - ids.length));
                setLocalSyncStatuses((prev) => {
                    const next = new Map(prev);
                    ids.forEach((id) => next.delete(id));
                    return next;
                });
            } else {
                removeStoreSources(ids);
            }
        },
        [useLocalState, removeStoreSources],
    );

    const setLoading = useCallback(
        (loading: boolean) => {
            if (useLocalState) {
                setLocalIsLoading(loading);
            } else {
                setStoreLoading(loading);
            }
        },
        [useLocalState, setStoreLoading],
    );

    const setCreating = useCallback(
        (creating: boolean) => {
            if (useLocalState) {
                setLocalIsCreating(creating);
            } else {
                setStoreCreating(creating);
            }
        },
        [useLocalState, setStoreCreating],
    );

    const setUpdating = useCallback(
        (updating: boolean) => {
            if (useLocalState) {
                setLocalIsUpdating(updating);
            } else {
                setStoreUpdating(updating);
            }
        },
        [useLocalState, setStoreUpdating],
    );

    const setDeleting = useCallback(
        (deleting: boolean) => {
            if (useLocalState) {
                setLocalIsDeleting(deleting);
            } else {
                setStoreDeleting(deleting);
            }
        },
        [useLocalState, setStoreDeleting],
    );

    const setSyncing = useCallback(
        (syncing: boolean) => {
            if (useLocalState) {
                setLocalIsSyncing(syncing);
            } else {
                setStoreSyncing(syncing);
            }
        },
        [useLocalState, setStoreSyncing],
    );

    const setError = useCallback(
        (error: string | null) => {
            if (useLocalState) {
                setLocalError(error);
            } else {
                setStoreError(error);
            }
        },
        [useLocalState, setStoreError],
    );

    const setPagination = useCallback(
        (pagination: { total?: number; limit?: number; offset?: number }) => {
            if (useLocalState) {
                if (pagination.total !== undefined)
                    setLocalTotal(pagination.total);
                if (pagination.offset !== undefined)
                    setLocalOffset(pagination.offset);
                setLocalHasMore(
                    (pagination.offset ?? localOffset) + localLimit <
                        (pagination.total ?? localTotal),
                );
            } else {
                setStorePagination(pagination);
            }
        },
        [
            useLocalState,
            localOffset,
            localLimit,
            localTotal,
            setStorePagination,
        ],
    );

    const setFilter = useCallback(
        (newFilter: SourcesFilter) => {
            if (useLocalState) {
                setLocalFilter((prev) => ({ ...prev, ...newFilter }));
                setLocalOffset(0);
            } else {
                setStoreFilter(newFilter);
            }
        },
        [useLocalState, setStoreFilter],
    );

    const setSyncStatus = useCallback(
        (
            sourceId: string,
            status: {
                source_id: string;
                status: string;
                message?: string;
                last_synced?: string;
            },
        ) => {
            if (useLocalState) {
                setLocalSyncStatuses((prev) => {
                    const next = new Map(prev);
                    next.set(sourceId, status);
                    return next;
                });
            } else {
                setStoreSyncStatus(
                    sourceId,
                    status as Parameters<typeof setStoreSyncStatus>[1],
                );
            }
        },
        [useLocalState, setStoreSyncStatus],
    );

    const clearSyncStatus = useCallback(
        (sourceId: string) => {
            if (useLocalState) {
                setLocalSyncStatuses((prev) => {
                    const next = new Map(prev);
                    next.delete(sourceId);
                    return next;
                });
            } else {
                clearStoreSyncStatus(sourceId);
            }
        },
        [useLocalState, clearStoreSyncStatus],
    );

    // Track if initial fetch has been done
    const hasFetched = useRef(false);

    // Store the initialFilter in a ref to use consistently
    const initialFilterRef = useRef(initialFilter);

    /**
     * Fetch sources from API
     */
    const fetchSources = useCallback(
        async (customFilter?: SourcesFilter, customOffset?: number) => {
            if (!isSupabaseConfigured()) {
                setError("Supabase 未配置");
                return { success: false, error: "Supabase 未配置" };
            }

            setLoading(true);
            setError(null);

            try {
                // When using local state, always use the initialFilter as base
                const baseFilter = useLocalState
                    ? initialFilterRef.current || {}
                    : filter;
                const currentFilter = customFilter
                    ? { ...baseFilter, ...customFilter }
                    : baseFilter;
                const currentOffset = customOffset ?? offset;

                // Build query params
                const params = new URLSearchParams();
                if (currentFilter.mode) params.set("mode", currentFilter.mode);
                if (currentFilter.source_type)
                    params.set("source_type", currentFilter.source_type);
                if (currentFilter.search)
                    params.set("search", currentFilter.search);
                params.set("limit", String(limit));
                params.set("offset", String(currentOffset));

                const response = await fetch(
                    `/api/sources?${params.toString()}`,
                );
                const result: ApiResponse<SourcesListResponse> =
                    await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.error || "获取目录源失败");
                }

                if (result.data) {
                    setSources(result.data.sources);
                    setPagination({
                        total: result.data.total,
                        limit: result.data.limit,
                        offset: result.data.offset,
                    });
                }

                return { success: true, data: result.data };
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "获取目录源失败";
                setError(message);
                return { success: false, error: message };
            } finally {
                setLoading(false);
            }
        },
        [
            useLocalState,
            filter,
            offset,
            limit,
            setSources,
            setPagination,
            setLoading,
            setError,
        ],
    );

    /**
     * Create a new source
     */
    const createSource = useCallback(
        async (input: CreateSourceInput) => {
            if (!isSupabaseConfigured()) {
                setError("Supabase 未配置");
                return { success: false, error: "Supabase 未配置" };
            }

            setCreating(true);
            setError(null);

            try {
                const response = await fetch("/api/sources", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(input),
                });

                const result: ApiResponse<DirectorySource> =
                    await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.error || "创建目录源失败");
                }

                if (result.data) {
                    addSource(result.data);
                }

                return { success: true, data: result.data };
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "创建目录源失败";
                setError(message);
                return { success: false, error: message };
            } finally {
                setCreating(false);
            }
        },
        [addSource, setCreating, setError],
    );

    /**
     * Update an existing source
     */
    const updateSource = useCallback(
        async (id: string, updates: UpdateSourceInput) => {
            if (!isSupabaseConfigured()) {
                setError("Supabase 未配置");
                return { success: false, error: "Supabase 未配置" };
            }

            setUpdating(true);
            setError(null);

            try {
                const response = await fetch(`/api/sources/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(updates),
                });

                const result: ApiResponse<DirectorySource> =
                    await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.error || "更新目录源失败");
                }

                if (result.data) {
                    updateSourceInStore(id, result.data);
                }

                return { success: true, data: result.data };
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "更新目录源失败";
                setError(message);
                return { success: false, error: message };
            } finally {
                setUpdating(false);
            }
        },
        [updateSourceInStore, setUpdating, setError],
    );

    /**
     * Delete a source
     */
    const deleteSource = useCallback(
        async (id: string) => {
            if (!isSupabaseConfigured()) {
                setError("Supabase 未配置");
                return { success: false, error: "Supabase 未配置" };
            }

            setDeleting(true);
            setError(null);

            // Store current source for rollback
            const source = sources.find((s) => s.id === id);

            // Optimistic delete
            removeSource(id);

            try {
                const response = await fetch(`/api/sources/${id}`, {
                    method: "DELETE",
                });

                const result: ApiResponse<{ deleted: boolean }> =
                    await response.json();

                if (!response.ok || !result.success) {
                    // Rollback on failure
                    if (source) {
                        addSource(source);
                    }
                    throw new Error(result.error || "删除目录源失败");
                }

                // Clear sync status
                clearSyncStatus(id);

                return { success: true };
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "删除目录源失败";
                setError(message);
                return { success: false, error: message };
            } finally {
                setDeleting(false);
            }
        },
        [
            sources,
            addSource,
            removeSource,
            clearSyncStatus,
            setDeleting,
            setError,
        ],
    );

    /**
     * Bulk delete sources
     */
    const deleteSources = useCallback(
        async (ids: string[]) => {
            if (!isSupabaseConfigured()) {
                setError("Supabase 未配置");
                return { success: false, error: "Supabase 未配置" };
            }

            if (ids.length === 0) {
                return { success: false, error: "没有选中任何目录源" };
            }

            setDeleting(true);
            setError(null);

            // Store current sources for rollback
            const deletedSources = sources.filter((s) => ids.includes(s.id));

            // Optimistic delete
            removeSources(ids);

            try {
                const response = await fetch(
                    `/api/sources?ids=${ids.join(",")}`,
                    {
                        method: "DELETE",
                    },
                );

                const result: ApiResponse<{ deleted: number }> =
                    await response.json();

                if (!response.ok || !result.success) {
                    // Rollback on failure
                    deletedSources.forEach((source) => addSource(source));
                    throw new Error(result.error || "批量删除目录源失败");
                }

                // Clear sync statuses
                ids.forEach((id) => clearSyncStatus(id));

                return { success: true, data: result.data };
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "批量删除目录源失败";
                setError(message);
                return { success: false, error: message };
            } finally {
                setDeleting(false);
            }
        },
        [
            sources,
            addSource,
            removeSources,
            clearSyncStatus,
            setDeleting,
            setError,
        ],
    );

    /**
     * Sync a source
     */
    const syncSource = useCallback(
        async (id: string) => {
            if (!isSupabaseConfigured()) {
                setError("Supabase 未配置");
                return { success: false, error: "Supabase 未配置" };
            }

            // Update sync status to syncing
            setSyncStatus(id, {
                source_id: id,
                status: "syncing",
                message: "正在同步...",
            });

            setSyncing(true);
            setError(null);

            try {
                const response = await fetch("/api/sync", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ source_id: id }),
                });

                const result: ApiResponse<SyncResult> = await response.json();

                if (!response.ok || !result.success) {
                    setSyncStatus(id, {
                        source_id: id,
                        status: "error",
                        message: result.error || "同步失败",
                    });
                    throw new Error(result.error || "同步失败");
                }

                // Update sync status to success
                const syncedAt = new Date().toISOString();
                setSyncStatus(id, {
                    source_id: id,
                    status: "success",
                    message: `已同步 ${result.data?.files_synced || 0} 个文件`,
                    last_synced: syncedAt,
                });

                // Update source synced_at
                updateSourceInStore(id, { synced_at: syncedAt });

                return { success: true, data: result.data };
            } catch (err) {
                const message = err instanceof Error ? err.message : "同步失败";
                setError(message);
                return { success: false, error: message };
            } finally {
                setSyncing(false);
            }
        },
        [setSyncStatus, updateSourceInStore, setSyncing, setError],
    );

    /**
     * Sync all sources
     */
    const syncAllSources = useCallback(async () => {
        if (!isSupabaseConfigured()) {
            setError("Supabase 未配置");
            return { success: false, error: "Supabase 未配置" };
        }

        const localSyncSources = sources.filter((s) => s.mode === "local_sync");
        if (localSyncSources.length === 0) {
            return { success: false, error: "没有需要同步的本地目录源" };
        }

        setSyncing(true);
        setError(null);

        const results: SyncResult[] = [];
        const errors: string[] = [];

        for (const source of localSyncSources) {
            const result = await syncSource(source.id);
            if (result.success && result.data) {
                results.push(result.data);
            } else if (result.error) {
                errors.push(`${source.name}: ${result.error}`);
            }
        }

        setSyncing(false);

        if (errors.length > 0) {
            setError(`部分同步失败: ${errors.join(", ")}`);
            return {
                success: false,
                error: errors.join(", "),
                data: { results, errors },
            };
        }

        return { success: true, data: { results, errors: [] } };
    }, [sources, syncSource, setSyncing, setError]);

    /**
     * Refresh sources
     */
    const refresh = useCallback(() => {
        return fetchSources(filter, 0);
    }, [fetchSources, filter]);

    /**
     * Load next page
     */
    const loadMore = useCallback(() => {
        if (!hasMore || isLoading) return Promise.resolve({ success: false });
        return fetchSources(filter, offset + limit);
    }, [fetchSources, filter, offset, limit, hasMore, isLoading]);

    /**
     * Change filter
     */
    const changeFilter = useCallback(
        (newFilter: SourcesFilter) => {
            setFilter(newFilter);
            return fetchSources(newFilter, 0);
        },
        [setFilter, fetchSources],
    );

    // Auto-fetch on mount
    useEffect(() => {
        if (autoFetch && !hasFetched.current) {
            hasFetched.current = true;
            if (initialFilter) {
                setFilter(initialFilter);
                fetchSources(initialFilter, 0);
            } else {
                fetchSources();
            }
        }
    }, [autoFetch, initialFilter, setFilter, fetchSources]);

    return {
        // State
        sources,
        filter,
        syncStatuses,
        isLoading,
        isCreating,
        isUpdating,
        isDeleting,
        isSyncing,
        error,
        total,
        hasMore,
        pagination: { total, limit, offset, hasMore },

        // Actions
        fetchSources,
        createSource,
        updateSource,
        deleteSource,
        deleteSources,
        syncSource,
        syncAllSources,
        refresh,
        loadMore,
        changeFilter,

        // Utils
        isConfigured: isSupabaseConfigured(),
    };
}

/**
 * Hook for filtered sources by mode
 */
export function useSourcesByMode(mode: DirectorySourceMode) {
    const sources = useSourcesStore((state) =>
        state.sources.filter((source) => source.mode === mode),
    );
    return sources;
}

/**
 * Hook for sources that need sync
 */
export function useSourcesNeedingSync() {
    return useSourcesStore((state) =>
        state.sources.filter(
            (source) =>
                source.mode === "local_sync" && source.synced_at === null,
        ),
    );
}

/**
 * Hook for sources count by mode
 */
export function useSourcesCounts() {
    return useSourcesStore((state) => ({
        github: state.sources.filter((s) => s.mode === "github").length,
        link: state.sources.filter((s) => s.mode === "link").length,
        local_sync: state.sources.filter((s) => s.mode === "local_sync").length,
        total: state.sources.length,
        synced: state.sources.filter((s) => s.synced_at !== null).length,
    }));
}
