"use client";

import { useCallback, useEffect, useRef } from "react";
import {
    useSourcesStore,
    type DirectorySource,
    type DirectorySourceMode,
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
}

/**
 * Custom hook for managing directory sources with API integration
 */
export function useSources(options: UseSourcesOptions = {}) {
    const { autoFetch = true, initialFilter } = options;

    // Store state
    const sources = useSourcesStore((state) => state.sources);
    const filter = useSourcesStore((state) => state.filter);
    const syncStatuses = useSourcesStore((state) => state.syncStatuses);
    const isLoading = useSourcesStore((state) => state.isLoading);
    const isCreating = useSourcesStore((state) => state.isCreating);
    const isUpdating = useSourcesStore((state) => state.isUpdating);
    const isDeleting = useSourcesStore((state) => state.isDeleting);
    const isSyncing = useSourcesStore((state) => state.isSyncing);
    const error = useSourcesStore((state) => state.error);
    const total = useSourcesStore((state) => state.total);
    const limit = useSourcesStore((state) => state.limit);
    const offset = useSourcesStore((state) => state.offset);
    const hasMore = useSourcesStore((state) => state.hasMore);

    // Store actions
    const setSources = useSourcesStore((state) => state.setSources);
    const addSource = useSourcesStore((state) => state.addSource);
    const updateSourceInStore = useSourcesStore((state) => state.updateSource);
    const removeSource = useSourcesStore((state) => state.removeSource);
    const removeSources = useSourcesStore((state) => state.removeSources);
    const setLoading = useSourcesStore((state) => state.setLoading);
    const setCreating = useSourcesStore((state) => state.setCreating);
    const setUpdating = useSourcesStore((state) => state.setUpdating);
    const setDeleting = useSourcesStore((state) => state.setDeleting);
    const setSyncing = useSourcesStore((state) => state.setSyncing);
    const setError = useSourcesStore((state) => state.setError);
    const setPagination = useSourcesStore((state) => state.setPagination);
    const setFilter = useSourcesStore((state) => state.setFilter);
    const setSyncStatus = useSourcesStore((state) => state.setSyncStatus);
    const clearSyncStatus = useSourcesStore((state) => state.clearSyncStatus);

    // Track if initial fetch has been done
    const hasFetched = useRef(false);

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
                const currentFilter = customFilter || filter;
                const currentOffset = customOffset ?? offset;

                // Build query params
                const params = new URLSearchParams();
                if (currentFilter.mode) params.set("mode", currentFilter.mode);
                if (currentFilter.search) params.set("search", currentFilter.search);
                params.set("limit", String(limit));
                params.set("offset", String(currentOffset));

                const response = await fetch(`/api/sources?${params.toString()}`);
                const result: ApiResponse<SourcesListResponse> = await response.json();

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
                const message = err instanceof Error ? err.message : "获取目录源失败";
                setError(message);
                return { success: false, error: message };
            } finally {
                setLoading(false);
            }
        },
        [filter, offset, limit, setSources, setPagination, setLoading, setError]
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

                const result: ApiResponse<DirectorySource> = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.error || "创建目录源失败");
                }

                if (result.data) {
                    addSource(result.data);
                }

                return { success: true, data: result.data };
            } catch (err) {
                const message = err instanceof Error ? err.message : "创建目录源失败";
                setError(message);
                return { success: false, error: message };
            } finally {
                setCreating(false);
            }
        },
        [addSource, setCreating, setError]
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

                const result: ApiResponse<DirectorySource> = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.error || "更新目录源失败");
                }

                if (result.data) {
                    updateSourceInStore(id, result.data);
                }

                return { success: true, data: result.data };
            } catch (err) {
                const message = err instanceof Error ? err.message : "更新目录源失败";
                setError(message);
                return { success: false, error: message };
            } finally {
                setUpdating(false);
            }
        },
        [updateSourceInStore, setUpdating, setError]
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

                const result: ApiResponse<{ deleted: boolean }> = await response.json();

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
                const message = err instanceof Error ? err.message : "删除目录源失败";
                setError(message);
                return { success: false, error: message };
            } finally {
                setDeleting(false);
            }
        },
        [sources, addSource, removeSource, clearSyncStatus, setDeleting, setError]
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
                const response = await fetch(`/api/sources?ids=${ids.join(",")}`, {
                    method: "DELETE",
                });

                const result: ApiResponse<{ deleted: number }> = await response.json();

                if (!response.ok || !result.success) {
                    // Rollback on failure
                    deletedSources.forEach((source) => addSource(source));
                    throw new Error(result.error || "批量删除目录源失败");
                }

                // Clear sync statuses
                ids.forEach((id) => clearSyncStatus(id));

                return { success: true, data: result.data };
            } catch (err) {
                const message = err instanceof Error ? err.message : "批量删除目录源失败";
                setError(message);
                return { success: false, error: message };
            } finally {
                setDeleting(false);
            }
        },
        [sources, addSource, removeSources, clearSyncStatus, setDeleting, setError]
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
        [setSyncStatus, updateSourceInStore, setSyncing, setError]
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
        [setFilter, fetchSources]
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
        state.sources.filter((source) => source.mode === mode)
    );
    return sources;
}

/**
 * Hook for sources that need sync
 */
export function useSourcesNeedingSync() {
    return useSourcesStore((state) =>
        state.sources.filter(
            (source) => source.mode === "local_sync" && source.synced_at === null
        )
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
