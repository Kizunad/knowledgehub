"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/client";

// Types
export type ActivityType = "view" | "edit" | "create" | "sync";
export type ViewType = "study" | "code" | "chatlog" | "ideas";

export interface Activity {
    id: string;
    activity_type: ActivityType;
    view_type: ViewType;
    target_id: string;
    target_name: string;
    target_path: string | null;
    timestamp: string;
}

interface ActivitiesFilter {
    view_type?: ViewType;
    activity_type?: ActivityType;
}

// API Response types
interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

interface ActivitiesListResponse {
    activities: Activity[];
    total: number;
    limit: number;
    offset: number;
}

// Create activity input
export interface CreateActivityInput {
    activity_type: ActivityType;
    view_type: ViewType;
    target_id: string;
    target_name: string;
    target_path?: string;
}

// Hook options
interface UseActivitiesOptions {
    autoFetch?: boolean;
    initialFilter?: ActivitiesFilter;
    limit?: number;
}

/**
 * Custom hook for managing activities with API integration
 */
export function useActivities(options: UseActivitiesOptions = {}) {
    const { autoFetch = false, initialFilter, limit: initialLimit = 20 } = options;

    // Local state
    const [activities, setActivities] = useState<Activity[]>([]);
    const [filter, setFilter] = useState<ActivitiesFilter>(initialFilter || {});
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [total, setTotal] = useState(0);
    const [limit] = useState(initialLimit);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(false);

    // Track if initial fetch has been done
    const hasFetched = useRef(false);

    /**
     * Fetch activities from API
     */
    const fetchActivities = useCallback(
        async (customFilter?: ActivitiesFilter, customOffset?: number) => {
            if (!isSupabaseConfigured()) {
                setError("Supabase 未配置");
                return { success: false, error: "Supabase 未配置" };
            }

            setIsLoading(true);
            setError(null);

            try {
                const currentFilter = customFilter || filter;
                const currentOffset = customOffset ?? offset;

                // Build query params
                const params = new URLSearchParams();
                if (currentFilter.view_type)
                    params.set("view_type", currentFilter.view_type);
                if (currentFilter.activity_type)
                    params.set("activity_type", currentFilter.activity_type);
                params.set("limit", String(limit));
                params.set("offset", String(currentOffset));

                const response = await fetch(
                    `/api/activities?${params.toString()}`,
                );
                const result: ApiResponse<ActivitiesListResponse> =
                    await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.error || "获取活动记录失败");
                }

                if (result.data) {
                    setActivities(result.data.activities);
                    setTotal(result.data.total);
                    setOffset(result.data.offset);
                    setHasMore(
                        result.data.offset + result.data.limit <
                            result.data.total,
                    );
                }

                return { success: true, data: result.data };
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "获取活动记录失败";
                setError(message);
                return { success: false, error: message };
            } finally {
                setIsLoading(false);
            }
        },
        [filter, offset, limit],
    );

    /**
     * Record a new activity
     */
    const recordActivity = useCallback(
        async (input: CreateActivityInput) => {
            if (!isSupabaseConfigured()) {
                setError("Supabase 未配置");
                return { success: false, error: "Supabase 未配置" };
            }

            setIsCreating(true);
            setError(null);

            try {
                const response = await fetch("/api/activities", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(input),
                });

                const result: ApiResponse<Activity> = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.error || "记录活动失败");
                }

                if (result.data) {
                    // Add to the beginning of activities list
                    setActivities((prev) => [result.data!, ...prev]);
                    setTotal((prev) => prev + 1);
                }

                return { success: true, data: result.data };
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "记录活动失败";
                setError(message);
                return { success: false, error: message };
            } finally {
                setIsCreating(false);
            }
        },
        [],
    );

    /**
     * Record a view activity (convenience method)
     */
    const recordView = useCallback(
        async (
            viewType: ViewType,
            targetId: string,
            targetName: string,
            targetPath?: string,
        ) => {
            return recordActivity({
                activity_type: "view",
                view_type: viewType,
                target_id: targetId,
                target_name: targetName,
                target_path: targetPath,
            });
        },
        [recordActivity],
    );

    /**
     * Record an edit activity (convenience method)
     */
    const recordEdit = useCallback(
        async (
            viewType: ViewType,
            targetId: string,
            targetName: string,
            targetPath?: string,
        ) => {
            return recordActivity({
                activity_type: "edit",
                view_type: viewType,
                target_id: targetId,
                target_name: targetName,
                target_path: targetPath,
            });
        },
        [recordActivity],
    );

    /**
     * Record a create activity (convenience method)
     */
    const recordCreate = useCallback(
        async (
            viewType: ViewType,
            targetId: string,
            targetName: string,
            targetPath?: string,
        ) => {
            return recordActivity({
                activity_type: "create",
                view_type: viewType,
                target_id: targetId,
                target_name: targetName,
                target_path: targetPath,
            });
        },
        [recordActivity],
    );

    /**
     * Record a sync activity (convenience method)
     */
    const recordSync = useCallback(
        async (targetId: string, targetName: string, targetPath?: string) => {
            return recordActivity({
                activity_type: "sync",
                view_type: "code",
                target_id: targetId,
                target_name: targetName,
                target_path: targetPath,
            });
        },
        [recordActivity],
    );

    /**
     * Clear activities by view type
     */
    const clearActivitiesByViewType = useCallback(
        async (viewType: ViewType) => {
            if (!isSupabaseConfigured()) {
                setError("Supabase 未配置");
                return { success: false, error: "Supabase 未配置" };
            }

            setIsDeleting(true);
            setError(null);

            try {
                const response = await fetch(
                    `/api/activities?view_type=${viewType}`,
                    {
                        method: "DELETE",
                    },
                );

                const result: ApiResponse<{ deleted: number }> =
                    await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.error || "清除活动记录失败");
                }

                // Remove from local state
                setActivities((prev) =>
                    prev.filter((a) => a.view_type !== viewType),
                );
                setTotal(
                    (prev) =>
                        prev -
                        activities.filter((a) => a.view_type === viewType)
                            .length,
                );

                return { success: true, data: result.data };
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "清除活动记录失败";
                setError(message);
                return { success: false, error: message };
            } finally {
                setIsDeleting(false);
            }
        },
        [activities],
    );

    /**
     * Clear old activities
     */
    const clearOldActivities = useCallback(async (olderThan: Date) => {
        if (!isSupabaseConfigured()) {
            setError("Supabase 未配置");
            return { success: false, error: "Supabase 未配置" };
        }

        setIsDeleting(true);
        setError(null);

        try {
            const response = await fetch(
                `/api/activities?older_than=${olderThan.toISOString()}`,
                {
                    method: "DELETE",
                },
            );

            const result: ApiResponse<{ deleted: number }> =
                await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || "清除旧活动记录失败");
            }

            // Remove from local state
            const olderThanTime = olderThan.getTime();
            setActivities((prev) =>
                prev.filter(
                    (a) => new Date(a.timestamp).getTime() >= olderThanTime,
                ),
            );

            return { success: true, data: result.data };
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "清除旧活动记录失败";
            setError(message);
            return { success: false, error: message };
        } finally {
            setIsDeleting(false);
        }
    }, []);

    /**
     * Refresh activities
     */
    const refresh = useCallback(() => {
        return fetchActivities(filter, 0);
    }, [fetchActivities, filter]);

    /**
     * Load next page
     */
    const loadMore = useCallback(() => {
        if (!hasMore || isLoading) return Promise.resolve({ success: false });
        return fetchActivities(filter, offset + limit);
    }, [fetchActivities, filter, offset, limit, hasMore, isLoading]);

    /**
     * Change filter
     */
    const changeFilter = useCallback(
        (newFilter: ActivitiesFilter) => {
            setFilter(newFilter);
            return fetchActivities(newFilter, 0);
        },
        [fetchActivities],
    );

    /**
     * Get activities by view type
     */
    const getActivitiesByViewType = useCallback(
        (viewType: ViewType) => {
            return activities.filter((a) => a.view_type === viewType);
        },
        [activities],
    );

    /**
     * Get recent activities (last n items)
     */
    const getRecentActivities = useCallback(
        (count: number = 5) => {
            return activities.slice(0, count);
        },
        [activities],
    );

    // Auto-fetch on mount
    useEffect(() => {
        if (autoFetch && !hasFetched.current) {
            hasFetched.current = true;
            if (initialFilter) {
                setFilter(initialFilter);
                fetchActivities(initialFilter, 0);
            } else {
                fetchActivities();
            }
        }
    }, [autoFetch, initialFilter, fetchActivities]);

    return {
        // State
        activities,
        filter,
        isLoading,
        isCreating,
        isDeleting,
        error,
        total,
        hasMore,
        pagination: { total, limit, offset, hasMore },

        // Actions
        fetchActivities,
        recordActivity,
        recordView,
        recordEdit,
        recordCreate,
        recordSync,
        clearActivitiesByViewType,
        clearOldActivities,
        refresh,
        loadMore,
        changeFilter,

        // Helpers
        getActivitiesByViewType,
        getRecentActivities,

        // Computed
        studyActivities: activities.filter((a) => a.view_type === "study"),
        codeActivities: activities.filter((a) => a.view_type === "code"),
        chatlogActivities: activities.filter((a) => a.view_type === "chatlog"),
        ideasActivities: activities.filter((a) => a.view_type === "ideas"),

        // Utils
        isConfigured: isSupabaseConfigured(),
    };
}

/**
 * Hook for recent activities by view type
 */
export function useRecentActivities(viewType: ViewType, limit: number = 5) {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchRecent = useCallback(async () => {
        if (!isSupabaseConfigured()) {
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            params.set("view_type", viewType);
            params.set("limit", String(limit));
            params.set("offset", "0");

            const response = await fetch(`/api/activities?${params.toString()}`);
            const result: ApiResponse<ActivitiesListResponse> =
                await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || "获取最近活动失败");
            }

            if (result.data) {
                setActivities(result.data.activities);
            }
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "获取最近活动失败";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, [viewType, limit]);

    useEffect(() => {
        fetchRecent();
    }, [fetchRecent]);

    return {
        activities,
        isLoading,
        error,
        refresh: fetchRecent,
    };
}
