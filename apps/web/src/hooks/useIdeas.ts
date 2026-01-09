"use client";

import { useCallback, useEffect, useRef } from "react";
import {
    useIdeasStore,
    type Idea,
    type IdeaStatus,
    type IdeasFilter,
} from "@/store";
import { isSupabaseConfigured } from "@/lib/supabase/client";

// API Response types
interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

interface IdeasListResponse {
    ideas: Idea[];
    total: number;
    limit: number;
    offset: number;
}

// Create idea input
export interface CreateIdeaInput {
    content: string;
    status?: IdeaStatus;
    tags?: string[];
    refs?: string[];
    source_ref?: string;
}

// Update idea input
export interface UpdateIdeaInput {
    content?: string;
    status?: IdeaStatus;
    done?: boolean;
    tags?: string[];
    refs?: string[];
}

// Hook options
interface UseIdeasOptions {
    autoFetch?: boolean;
    initialFilter?: IdeasFilter;
}

/**
 * Custom hook for managing ideas with API integration
 */
export function useIdeas(options: UseIdeasOptions = {}) {
    const { autoFetch = true, initialFilter } = options;

    // Store state
    const ideas = useIdeasStore((state) => state.ideas);
    const filter = useIdeasStore((state) => state.filter);
    const isLoading = useIdeasStore((state) => state.isLoading);
    const isCreating = useIdeasStore((state) => state.isCreating);
    const isUpdating = useIdeasStore((state) => state.isUpdating);
    const isDeleting = useIdeasStore((state) => state.isDeleting);
    const error = useIdeasStore((state) => state.error);
    const total = useIdeasStore((state) => state.total);
    const limit = useIdeasStore((state) => state.limit);
    const offset = useIdeasStore((state) => state.offset);
    const hasMore = useIdeasStore((state) => state.hasMore);

    // Store actions
    const setIdeas = useIdeasStore((state) => state.setIdeas);
    const addIdea = useIdeasStore((state) => state.addIdea);
    const updateIdeaInStore = useIdeasStore((state) => state.updateIdea);
    const removeIdea = useIdeasStore((state) => state.removeIdea);
    const removeIdeas = useIdeasStore((state) => state.removeIdeas);
    const setLoading = useIdeasStore((state) => state.setLoading);
    const setCreating = useIdeasStore((state) => state.setCreating);
    const setUpdating = useIdeasStore((state) => state.setUpdating);
    const setDeleting = useIdeasStore((state) => state.setDeleting);
    const setError = useIdeasStore((state) => state.setError);
    const setPagination = useIdeasStore((state) => state.setPagination);
    const setFilter = useIdeasStore((state) => state.setFilter);

    // Track if initial fetch has been done
    const hasFetched = useRef(false);

    /**
     * Fetch ideas from API
     */
    const fetchIdeas = useCallback(
        async (customFilter?: IdeasFilter, customOffset?: number) => {
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
                if (currentFilter.status) params.set("status", currentFilter.status);
                if (currentFilter.done !== undefined) params.set("done", String(currentFilter.done));
                if (currentFilter.tag) params.set("tag", currentFilter.tag);
                params.set("limit", String(limit));
                params.set("offset", String(currentOffset));

                const response = await fetch(`/api/ideas?${params.toString()}`);
                const result: ApiResponse<IdeasListResponse> = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.error || "获取 Ideas 失败");
                }

                if (result.data) {
                    setIdeas(result.data.ideas);
                    setPagination({
                        total: result.data.total,
                        limit: result.data.limit,
                        offset: result.data.offset,
                    });
                }

                return { success: true, data: result.data };
            } catch (err) {
                const message = err instanceof Error ? err.message : "获取 Ideas 失败";
                setError(message);
                return { success: false, error: message };
            } finally {
                setLoading(false);
            }
        },
        [filter, offset, limit, setIdeas, setPagination, setLoading, setError]
    );

    /**
     * Create a new idea
     */
    const createIdea = useCallback(
        async (input: CreateIdeaInput) => {
            if (!isSupabaseConfigured()) {
                setError("Supabase 未配置");
                return { success: false, error: "Supabase 未配置" };
            }

            setCreating(true);
            setError(null);

            try {
                const response = await fetch("/api/ideas", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(input),
                });

                const result: ApiResponse<Idea> = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.error || "创建 Idea 失败");
                }

                if (result.data) {
                    addIdea(result.data);
                }

                return { success: true, data: result.data };
            } catch (err) {
                const message = err instanceof Error ? err.message : "创建 Idea 失败";
                setError(message);
                return { success: false, error: message };
            } finally {
                setCreating(false);
            }
        },
        [addIdea, setCreating, setError]
    );

    /**
     * Update an existing idea
     */
    const updateIdea = useCallback(
        async (id: string, updates: UpdateIdeaInput) => {
            if (!isSupabaseConfigured()) {
                setError("Supabase 未配置");
                return { success: false, error: "Supabase 未配置" };
            }

            setUpdating(true);
            setError(null);

            try {
                const response = await fetch(`/api/ideas/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(updates),
                });

                const result: ApiResponse<Idea> = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.error || "更新 Idea 失败");
                }

                if (result.data) {
                    updateIdeaInStore(id, result.data);
                }

                return { success: true, data: result.data };
            } catch (err) {
                const message = err instanceof Error ? err.message : "更新 Idea 失败";
                setError(message);
                return { success: false, error: message };
            } finally {
                setUpdating(false);
            }
        },
        [updateIdeaInStore, setUpdating, setError]
    );

    /**
     * Toggle idea done status
     */
    const toggleDone = useCallback(
        async (id: string) => {
            const idea = ideas.find((i) => i.id === id);
            if (!idea) return { success: false, error: "Idea 不存在" };

            // Optimistic update
            updateIdeaInStore(id, { done: !idea.done });

            const result = await updateIdea(id, { done: !idea.done });

            // Revert on failure
            if (!result.success) {
                updateIdeaInStore(id, { done: idea.done });
            }

            return result;
        },
        [ideas, updateIdea, updateIdeaInStore]
    );

    /**
     * Move idea to a different status
     */
    const moveIdea = useCallback(
        async (id: string, status: IdeaStatus) => {
            const idea = ideas.find((i) => i.id === id);
            if (!idea) return { success: false, error: "Idea 不存在" };

            // Optimistic update
            updateIdeaInStore(id, { status });

            const result = await updateIdea(id, { status });

            // Revert on failure
            if (!result.success) {
                updateIdeaInStore(id, { status: idea.status });
            }

            return result;
        },
        [ideas, updateIdea, updateIdeaInStore]
    );

    /**
     * Delete an idea
     */
    const deleteIdea = useCallback(
        async (id: string) => {
            if (!isSupabaseConfigured()) {
                setError("Supabase 未配置");
                return { success: false, error: "Supabase 未配置" };
            }

            setDeleting(true);
            setError(null);

            // Store current idea for rollback
            const idea = ideas.find((i) => i.id === id);

            // Optimistic delete
            removeIdea(id);

            try {
                const response = await fetch(`/api/ideas/${id}`, {
                    method: "DELETE",
                });

                const result: ApiResponse<{ deleted: boolean }> = await response.json();

                if (!response.ok || !result.success) {
                    // Rollback on failure
                    if (idea) {
                        addIdea(idea);
                    }
                    throw new Error(result.error || "删除 Idea 失败");
                }

                return { success: true };
            } catch (err) {
                const message = err instanceof Error ? err.message : "删除 Idea 失败";
                setError(message);
                return { success: false, error: message };
            } finally {
                setDeleting(false);
            }
        },
        [ideas, addIdea, removeIdea, setDeleting, setError]
    );

    /**
     * Bulk delete ideas
     */
    const deleteIdeas = useCallback(
        async (ids: string[]) => {
            if (!isSupabaseConfigured()) {
                setError("Supabase 未配置");
                return { success: false, error: "Supabase 未配置" };
            }

            if (ids.length === 0) {
                return { success: false, error: "没有选中任何 Idea" };
            }

            setDeleting(true);
            setError(null);

            // Store current ideas for rollback
            const deletedIdeas = ideas.filter((i) => ids.includes(i.id));

            // Optimistic delete
            removeIdeas(ids);

            try {
                const response = await fetch(`/api/ideas?ids=${ids.join(",")}`, {
                    method: "DELETE",
                });

                const result: ApiResponse<{ deleted: number }> = await response.json();

                if (!response.ok || !result.success) {
                    // Rollback on failure
                    deletedIdeas.forEach((idea) => addIdea(idea));
                    throw new Error(result.error || "批量删除 Ideas 失败");
                }

                return { success: true, data: result.data };
            } catch (err) {
                const message = err instanceof Error ? err.message : "批量删除 Ideas 失败";
                setError(message);
                return { success: false, error: message };
            } finally {
                setDeleting(false);
            }
        },
        [ideas, addIdea, removeIdeas, setDeleting, setError]
    );

    /**
     * Bulk update ideas status
     */
    const bulkUpdateStatus = useCallback(
        async (ids: string[], status: IdeaStatus) => {
            if (!isSupabaseConfigured()) {
                setError("Supabase 未配置");
                return { success: false, error: "Supabase 未配置" };
            }

            if (ids.length === 0) {
                return { success: false, error: "没有选中任何 Idea" };
            }

            setUpdating(true);
            setError(null);

            // Store current statuses for rollback
            const originalStatuses = new Map<string, IdeaStatus>();
            ids.forEach((id) => {
                const idea = ideas.find((i) => i.id === id);
                if (idea) {
                    originalStatuses.set(id, idea.status);
                }
            });

            // Optimistic update
            ids.forEach((id) => updateIdeaInStore(id, { status }));

            try {
                const response = await fetch("/api/ideas", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ids, updates: { status } }),
                });

                const result: ApiResponse<Idea[]> = await response.json();

                if (!response.ok || !result.success) {
                    // Rollback on failure
                    originalStatuses.forEach((originalStatus, id) => {
                        updateIdeaInStore(id, { status: originalStatus });
                    });
                    throw new Error(result.error || "批量更新 Ideas 失败");
                }

                return { success: true, data: result.data };
            } catch (err) {
                const message = err instanceof Error ? err.message : "批量更新 Ideas 失败";
                setError(message);
                return { success: false, error: message };
            } finally {
                setUpdating(false);
            }
        },
        [ideas, updateIdeaInStore, setUpdating, setError]
    );

    /**
     * Refresh ideas
     */
    const refresh = useCallback(() => {
        return fetchIdeas(filter, 0);
    }, [fetchIdeas, filter]);

    /**
     * Load next page
     */
    const loadMore = useCallback(() => {
        if (!hasMore || isLoading) return Promise.resolve({ success: false });
        return fetchIdeas(filter, offset + limit);
    }, [fetchIdeas, filter, offset, limit, hasMore, isLoading]);

    /**
     * Change filter
     */
    const changeFilter = useCallback(
        (newFilter: IdeasFilter) => {
            setFilter(newFilter);
            return fetchIdeas(newFilter, 0);
        },
        [setFilter, fetchIdeas]
    );

    // Auto-fetch on mount
    useEffect(() => {
        if (autoFetch && !hasFetched.current) {
            hasFetched.current = true;
            if (initialFilter) {
                setFilter(initialFilter);
                fetchIdeas(initialFilter, 0);
            } else {
                fetchIdeas();
            }
        }
    }, [autoFetch, initialFilter, setFilter, fetchIdeas]);

    return {
        // State
        ideas,
        filter,
        isLoading,
        isCreating,
        isUpdating,
        isDeleting,
        error,
        total,
        hasMore,
        pagination: { total, limit, offset, hasMore },

        // Actions
        fetchIdeas,
        createIdea,
        updateIdea,
        toggleDone,
        moveIdea,
        deleteIdea,
        deleteIdeas,
        bulkUpdateStatus,
        refresh,
        loadMore,
        changeFilter,

        // Utils
        isConfigured: isSupabaseConfigured(),
    };
}

/**
 * Hook for filtered ideas by status
 */
export function useIdeasByStatus(status: IdeaStatus) {
    const ideas = useIdeasStore((state) =>
        state.ideas.filter((idea) => idea.status === status)
    );
    return ideas;
}

/**
 * Hook for ideas count by status
 */
export function useIdeasCounts() {
    return useIdeasStore((state) => ({
        inbox: state.ideas.filter((i) => i.status === "inbox").length,
        active: state.ideas.filter((i) => i.status === "active").length,
        archive: state.ideas.filter((i) => i.status === "archive").length,
        total: state.ideas.length,
        done: state.ideas.filter((i) => i.done).length,
    }));
}
