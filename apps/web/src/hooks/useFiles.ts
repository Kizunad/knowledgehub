"use client";

import { useCallback, useEffect, useRef } from "react";
import { useFilesStore, type File, type FilesFilter } from "@/store";
import { isSupabaseConfigured } from "@/lib/supabase/client";

// API Response types
interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

interface FilesListResponse {
    files: File[];
    total: number;
    limit: number;
    offset: number;
}

// Create file input
export interface CreateFileInput {
    source_id: string;
    path: string;
    name: string;
    content?: string;
    size?: number;
    mime_type?: string;
    file_hash?: string;
}

// Update file input
export interface UpdateFileInput {
    name?: string;
    content?: string;
    size?: number;
    mime_type?: string;
    file_hash?: string;
}

// Hook options
interface UseFilesOptions {
    autoFetch?: boolean;
    initialFilter?: FilesFilter;
}

/**
 * Custom hook for managing files with API integration
 */
export function useFiles(options: UseFilesOptions = {}) {
    const { autoFetch = false, initialFilter } = options;

    // Store state
    const files = useFilesStore((state) => state.files);
    const currentFile = useFilesStore((state) => state.currentFile);
    const selectedIds = useFilesStore((state) => state.selectedIds);
    const filter = useFilesStore((state) => state.filter);
    const isLoading = useFilesStore((state) => state.isLoading);
    const isLoadingFile = useFilesStore((state) => state.isLoadingFile);
    const isCreating = useFilesStore((state) => state.isCreating);
    const isUpdating = useFilesStore((state) => state.isUpdating);
    const isDeleting = useFilesStore((state) => state.isDeleting);
    const error = useFilesStore((state) => state.error);
    const total = useFilesStore((state) => state.total);
    const limit = useFilesStore((state) => state.limit);
    const offset = useFilesStore((state) => state.offset);
    const hasMore = useFilesStore((state) => state.hasMore);

    // Store actions
    const setFiles = useFilesStore((state) => state.setFiles);
    const addFile = useFilesStore((state) => state.addFile);
    const updateFileInStore = useFilesStore((state) => state.updateFile);
    const removeFile = useFilesStore((state) => state.removeFile);
    const removeFiles = useFilesStore((state) => state.removeFiles);
    const upsertFile = useFilesStore((state) => state.upsertFile);
    const setCurrentFile = useFilesStore((state) => state.setCurrentFile);
    const setLoading = useFilesStore((state) => state.setLoading);
    const setLoadingFile = useFilesStore((state) => state.setLoadingFile);
    const setCreating = useFilesStore((state) => state.setCreating);
    const setUpdating = useFilesStore((state) => state.setUpdating);
    const setDeleting = useFilesStore((state) => state.setDeleting);
    const setError = useFilesStore((state) => state.setError);
    const setPagination = useFilesStore((state) => state.setPagination);
    const setFilter = useFilesStore((state) => state.setFilter);

    // Track if initial fetch has been done
    const hasFetched = useRef(false);

    /**
     * Fetch files from API
     */
    const fetchFiles = useCallback(
        async (customFilter?: FilesFilter, customOffset?: number) => {
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
                if (currentFilter.source_id)
                    params.set("source_id", currentFilter.source_id);
                if (currentFilter.path) params.set("path", currentFilter.path);
                if (currentFilter.search)
                    params.set("search", currentFilter.search);
                if (currentFilter.mime_type)
                    params.set("mime_type", currentFilter.mime_type);
                params.set("limit", String(limit));
                params.set("offset", String(currentOffset));

                const response = await fetch(
                    `/api/files?${params.toString()}`,
                );
                const result: ApiResponse<FilesListResponse> =
                    await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.error || "获取文件列表失败");
                }

                if (result.data) {
                    setFiles(result.data.files);
                    setPagination({
                        total: result.data.total,
                        limit: result.data.limit,
                        offset: result.data.offset,
                    });
                }

                return { success: true, data: result.data };
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "获取文件列表失败";
                setError(message);
                return { success: false, error: message };
            } finally {
                setLoading(false);
            }
        },
        [filter, offset, limit, setFiles, setPagination, setLoading, setError],
    );

    /**
     * Fetch a single file by ID
     */
    const fetchFile = useCallback(
        async (id: string) => {
            if (!isSupabaseConfigured()) {
                setError("Supabase 未配置");
                return { success: false, error: "Supabase 未配置" };
            }

            setLoadingFile(true);
            setError(null);

            try {
                const response = await fetch(`/api/files/${id}`);
                const result: ApiResponse<File> = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.error || "获取文件详情失败");
                }

                if (result.data) {
                    setCurrentFile(result.data);
                }

                return { success: true, data: result.data };
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "获取文件详情失败";
                setError(message);
                return { success: false, error: message };
            } finally {
                setLoadingFile(false);
            }
        },
        [setCurrentFile, setLoadingFile, setError],
    );

    /**
     * Create or upsert a file
     */
    const createFile = useCallback(
        async (input: CreateFileInput) => {
            if (!isSupabaseConfigured()) {
                setError("Supabase 未配置");
                return { success: false, error: "Supabase 未配置" };
            }

            setCreating(true);
            setError(null);

            try {
                const response = await fetch("/api/files", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(input),
                });

                const result: ApiResponse<File> = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.error || "创建文件失败");
                }

                if (result.data) {
                    upsertFile(result.data);
                }

                return { success: true, data: result.data };
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "创建文件失败";
                setError(message);
                return { success: false, error: message };
            } finally {
                setCreating(false);
            }
        },
        [upsertFile, setCreating, setError],
    );

    /**
     * Update a file
     */
    const updateFile = useCallback(
        async (id: string, updates: UpdateFileInput) => {
            if (!isSupabaseConfigured()) {
                setError("Supabase 未配置");
                return { success: false, error: "Supabase 未配置" };
            }

            setUpdating(true);
            setError(null);

            try {
                const response = await fetch(`/api/files/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(updates),
                });

                const result: ApiResponse<File> = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.error || "更新文件失败");
                }

                if (result.data) {
                    updateFileInStore(id, result.data);
                }

                return { success: true, data: result.data };
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "更新文件失败";
                setError(message);
                return { success: false, error: message };
            } finally {
                setUpdating(false);
            }
        },
        [updateFileInStore, setUpdating, setError],
    );

    /**
     * Delete a file
     */
    const deleteFile = useCallback(
        async (id: string) => {
            if (!isSupabaseConfigured()) {
                setError("Supabase 未配置");
                return { success: false, error: "Supabase 未配置" };
            }

            setDeleting(true);
            setError(null);

            // Store current file for rollback
            const file = files.find((f) => f.id === id);

            // Optimistic delete
            removeFile(id);

            try {
                const response = await fetch(`/api/files/${id}`, {
                    method: "DELETE",
                });

                const result: ApiResponse<{ id: string }> =
                    await response.json();

                if (!response.ok || !result.success) {
                    // Rollback on failure
                    if (file) {
                        addFile(file);
                    }
                    throw new Error(result.error || "删除文件失败");
                }

                return { success: true };
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "删除文件失败";
                setError(message);
                return { success: false, error: message };
            } finally {
                setDeleting(false);
            }
        },
        [files, addFile, removeFile, setDeleting, setError],
    );

    /**
     * Bulk delete files
     */
    const deleteFiles = useCallback(
        async (ids: string[]) => {
            if (!isSupabaseConfigured()) {
                setError("Supabase 未配置");
                return { success: false, error: "Supabase 未配置" };
            }

            if (ids.length === 0) {
                return { success: false, error: "没有选中任何文件" };
            }

            setDeleting(true);
            setError(null);

            // Store current files for rollback
            const deletedFiles = files.filter((f) => ids.includes(f.id));

            // Optimistic delete
            removeFiles(ids);

            try {
                const response = await fetch(
                    `/api/files?ids=${ids.join(",")}`,
                    {
                        method: "DELETE",
                    },
                );

                const result: ApiResponse<{ deleted: number }> =
                    await response.json();

                if (!response.ok || !result.success) {
                    // Rollback on failure
                    deletedFiles.forEach((file) => addFile(file));
                    throw new Error(result.error || "批量删除文件失败");
                }

                return { success: true, data: result.data };
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "批量删除文件失败";
                setError(message);
                return { success: false, error: message };
            } finally {
                setDeleting(false);
            }
        },
        [files, addFile, removeFiles, setDeleting, setError],
    );

    /**
     * Delete all files for a source
     */
    const deleteFilesBySource = useCallback(
        async (sourceId: string) => {
            if (!isSupabaseConfigured()) {
                setError("Supabase 未配置");
                return { success: false, error: "Supabase 未配置" };
            }

            setDeleting(true);
            setError(null);

            try {
                const response = await fetch(
                    `/api/files?source_id=${sourceId}`,
                    {
                        method: "DELETE",
                    },
                );

                const result: ApiResponse<{ deleted: number }> =
                    await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.error || "删除源文件失败");
                }

                // Remove files from store
                const sourceFiles = files.filter(
                    (f) => f.source_id === sourceId,
                );
                removeFiles(sourceFiles.map((f) => f.id));

                return { success: true, data: result.data };
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "删除源文件失败";
                setError(message);
                return { success: false, error: message };
            } finally {
                setDeleting(false);
            }
        },
        [files, removeFiles, setDeleting, setError],
    );

    /**
     * Refresh files
     */
    const refresh = useCallback(() => {
        return fetchFiles(filter, 0);
    }, [fetchFiles, filter]);

    /**
     * Load next page
     */
    const loadMore = useCallback(() => {
        if (!hasMore || isLoading) return Promise.resolve({ success: false });
        return fetchFiles(filter, offset + limit);
    }, [fetchFiles, filter, offset, limit, hasMore, isLoading]);

    /**
     * Change filter
     */
    const changeFilter = useCallback(
        (newFilter: FilesFilter) => {
            setFilter(newFilter);
            return fetchFiles(newFilter, 0);
        },
        [setFilter, fetchFiles],
    );

    /**
     * Fetch files by source
     */
    const fetchFilesBySource = useCallback(
        (sourceId: string) => {
            return fetchFiles({ source_id: sourceId }, 0);
        },
        [fetchFiles],
    );

    // Auto-fetch on mount
    useEffect(() => {
        if (autoFetch && !hasFetched.current) {
            hasFetched.current = true;
            if (initialFilter) {
                setFilter(initialFilter);
                fetchFiles(initialFilter, 0);
            } else {
                fetchFiles();
            }
        }
    }, [autoFetch, initialFilter, setFilter, fetchFiles]);

    return {
        // State
        files,
        currentFile,
        selectedIds: [...selectedIds],
        filter,
        isLoading,
        isLoadingFile,
        isCreating,
        isUpdating,
        isDeleting,
        error,
        total,
        hasMore,
        pagination: { total, limit, offset, hasMore },

        // Actions
        fetchFiles,
        fetchFile,
        createFile,
        updateFile,
        deleteFile,
        deleteFiles,
        deleteFilesBySource,
        refresh,
        loadMore,
        changeFilter,
        fetchFilesBySource,

        // Utils
        isConfigured: isSupabaseConfigured(),
    };
}

/**
 * Hook for files by source
 */
export function useFilesBySource(sourceId: string) {
    const files = useFilesStore((state) =>
        state.files.filter((file) => file.source_id === sourceId),
    );
    return files;
}

/**
 * Hook for current file
 */
export function useCurrentFile() {
    const currentFile = useFilesStore((state) => state.currentFile);
    const isLoading = useFilesStore((state) => state.isLoadingFile);
    return { currentFile, isLoading };
}

/**
 * Hook for selected files
 */
export function useSelectedFiles() {
    return useFilesStore((state) =>
        state.files.filter((file) => state.selectedIds.has(file.id)),
    );
}
