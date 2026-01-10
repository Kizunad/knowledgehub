import { useCallback, useEffect, useRef } from "react";
import {
    useDraftsStore,
    Draft,
    DraftsFilter,
    DraftContentType,
} from "@/store/draftsStore";

// API Response types
interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

interface DraftsListResponse {
    drafts: Draft[];
    total: number;
    limit: number;
    offset: number;
}

// Input types
interface CreateDraftInput {
    title?: string;
    content: string;
    content_type?: DraftContentType;
    language?: string;
    target_source_id?: string;
    is_auto_saved?: boolean;
}

interface UpdateDraftInput {
    title?: string;
    content?: string;
    content_type?: DraftContentType;
    language?: string;
    target_source_id?: string | null;
    is_auto_saved?: boolean;
}

interface UseDraftsOptions {
    autoFetch?: boolean;
    targetSourceId?: string;
}

// Generate a local draft ID
function generateLocalId(): string {
    return `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function useDrafts(options: UseDraftsOptions = {}) {
    const { autoFetch = false, targetSourceId } = options;

    // Get state from store
    const drafts = useDraftsStore((state) => state.drafts);
    const localDrafts = useDraftsStore((state) => state.localDrafts);
    const filter = useDraftsStore((state) => state.filter);
    const activeDraftId = useDraftsStore((state) => state.activeDraftId);
    const isLoading = useDraftsStore((state) => state.isLoading);
    const isCreating = useDraftsStore((state) => state.isCreating);
    const isUpdating = useDraftsStore((state) => state.isUpdating);
    const isDeleting = useDraftsStore((state) => state.isDeleting);
    const isSaving = useDraftsStore((state) => state.isSaving);
    const isSyncing = useDraftsStore((state) => state.isSyncing);
    const error = useDraftsStore((state) => state.error);
    const total = useDraftsStore((state) => state.total);
    const limit = useDraftsStore((state) => state.limit);
    const offset = useDraftsStore((state) => state.offset);
    const hasMore = useDraftsStore((state) => state.hasMore);

    // Get actions from store
    const setDrafts = useDraftsStore((state) => state.setDrafts);
    const addDraft = useDraftsStore((state) => state.addDraft);
    const updateDraftInStore = useDraftsStore((state) => state.updateDraft);
    const removeDraft = useDraftsStore((state) => state.removeDraft);
    const removeDrafts = useDraftsStore((state) => state.removeDrafts);
    const addLocalDraft = useDraftsStore((state) => state.addLocalDraft);
    const updateLocalDraft = useDraftsStore((state) => state.updateLocalDraft);
    const removeLocalDraft = useDraftsStore((state) => state.removeLocalDraft);
    const clearLocalDrafts = useDraftsStore((state) => state.clearLocalDrafts);
    const syncLocalDraftToServer = useDraftsStore((state) => state.syncLocalDraft);
    const setLoading = useDraftsStore((state) => state.setLoading);
    const setCreating = useDraftsStore((state) => state.setCreating);
    const setUpdating = useDraftsStore((state) => state.setUpdating);
    const setDeleting = useDraftsStore((state) => state.setDeleting);
    const setSaving = useDraftsStore((state) => state.setSaving);
    const setSyncing = useDraftsStore((state) => state.setSyncing);
    const setError = useDraftsStore((state) => state.setError);
    const setPagination = useDraftsStore((state) => state.setPagination);
    const setFilter = useDraftsStore((state) => state.setFilter);
    const setActiveDraft = useDraftsStore((state) => state.setActiveDraft);

    // Track if we've fetched
    const hasFetched = useRef(false);

    // Auto-save timer refs
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
    const pendingAutoSaveRef = useRef<{ id: string; content: string } | null>(null);

    // Fetch drafts from API
    const fetchDrafts = useCallback(
        async (
            customFilter?: DraftsFilter
        ): Promise<{ success: boolean; error?: string }> => {
            setLoading(true);
            setError(null);

            try {
                const currentFilter = customFilter || filter;
                const currentOffset = useDraftsStore.getState().offset;

                // Build query params
                const params = new URLSearchParams();
                if (targetSourceId || currentFilter.target_source_id) {
                    params.set(
                        "target_source_id",
                        targetSourceId || currentFilter.target_source_id || ""
                    );
                }
                if (currentFilter.content_type) {
                    params.set("content_type", currentFilter.content_type);
                }
                if (currentFilter.is_auto_saved !== undefined) {
                    params.set("is_auto_saved", String(currentFilter.is_auto_saved));
                }
                if (currentFilter.search) {
                    params.set("search", currentFilter.search);
                }
                params.set("limit", String(limit));
                params.set("offset", String(currentOffset));

                const response = await fetch(`/api/drafts?${params.toString()}`);
                const result: ApiResponse<DraftsListResponse> =
                    await response.json();

                if (result.success && result.data) {
                    setDrafts(result.data.drafts);
                    setPagination({
                        total: result.data.total,
                        limit: result.data.limit,
                        offset: result.data.offset,
                    });
                    return { success: true };
                } else {
                    const message = result.error || "Failed to fetch drafts";
                    setError(message);
                    return { success: false, error: message };
                }
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Failed to fetch drafts";
                setError(message);
                return { success: false, error: message };
            } finally {
                setLoading(false);
            }
        },
        [
            filter,
            targetSourceId,
            limit,
            setDrafts,
            setPagination,
            setLoading,
            setError,
        ]
    );

    // Create a new draft (saves to server immediately)
    const createDraft = useCallback(
        async (
            input: CreateDraftInput
        ): Promise<{ success: boolean; data?: Draft; error?: string }> => {
            setCreating(true);
            setError(null);

            try {
                const response = await fetch("/api/drafts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        ...input,
                        is_auto_saved: input.is_auto_saved ?? false,
                    }),
                });

                const result: ApiResponse<Draft> = await response.json();

                if (result.success && result.data) {
                    addDraft(result.data);
                    return { success: true, data: result.data };
                } else {
                    const message = result.error || "Failed to create draft";
                    setError(message);
                    return { success: false, error: message };
                }
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Failed to create draft";
                setError(message);
                return { success: false, error: message };
            } finally {
                setCreating(false);
            }
        },
        [addDraft, setCreating, setError]
    );

    // Create a local draft (stored in localStorage, for auto-save)
    const createLocalDraft = useCallback(
        (input: Omit<CreateDraftInput, "is_auto_saved">): Draft => {
            const now = new Date().toISOString();
            const localDraft: Draft = {
                id: generateLocalId(),
                title: input.title || null,
                content: input.content || "",
                content_type: input.content_type || "markdown",
                language: input.language || null,
                target_source_id: input.target_source_id || null,
                is_auto_saved: true,
                user_id: null,
                created_at: now,
                updated_at: now,
            };

            addLocalDraft(localDraft);
            setActiveDraft(localDraft.id);
            return localDraft;
        },
        [addLocalDraft, setActiveDraft]
    );

    // Update a draft (server-side)
    const updateDraft = useCallback(
        async (
            id: string,
            input: UpdateDraftInput
        ): Promise<{ success: boolean; data?: Draft; error?: string }> => {
            // Check if it's a local draft
            if (id.startsWith("local_")) {
                updateLocalDraft(id, input);
                const allDrafts = [...useDraftsStore.getState().localDrafts];
                const updated = allDrafts.find((d) => d.id === id);
                return { success: true, data: updated };
            }

            setUpdating(true);
            setError(null);

            try {
                const response = await fetch(`/api/drafts/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(input),
                });

                const result: ApiResponse<Draft> = await response.json();

                if (result.success && result.data) {
                    updateDraftInStore(id, result.data);
                    return { success: true, data: result.data };
                } else {
                    const message = result.error || "Failed to update draft";
                    setError(message);
                    return { success: false, error: message };
                }
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Failed to update draft";
                setError(message);
                return { success: false, error: message };
            } finally {
                setUpdating(false);
            }
        },
        [updateLocalDraft, updateDraftInStore, setUpdating, setError]
    );

    // Auto-save draft content (debounced)
    const autoSaveDraft = useCallback(
        (id: string, content: string, delay: number = 1000) => {
            // Store pending save
            pendingAutoSaveRef.current = { id, content };

            // Clear existing timer
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }

            // Set new timer
            autoSaveTimerRef.current = setTimeout(async () => {
                const pending = pendingAutoSaveRef.current;
                if (!pending) return;

                pendingAutoSaveRef.current = null;

                if (pending.id.startsWith("local_")) {
                    // Update local draft
                    updateLocalDraft(pending.id, { content: pending.content });
                } else {
                    // Save to server silently
                    setSaving(true);
                    try {
                        await fetch(`/api/drafts/${pending.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ content: pending.content }),
                        });
                    } catch {
                        // Silent fail for auto-save
                    } finally {
                        setSaving(false);
                    }
                }
            }, delay);
        },
        [updateLocalDraft, setSaving]
    );

    // Save a local draft to the server (sync)
    const syncLocalDraft = useCallback(
        async (
            localId: string,
            targetSourceId?: string
        ): Promise<{ success: boolean; data?: Draft; error?: string }> => {
            const localDraft = localDrafts.find((d) => d.id === localId);
            if (!localDraft) {
                return { success: false, error: "Local draft not found" };
            }

            setSyncing(true);
            setError(null);

            try {
                const response = await fetch("/api/drafts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title: localDraft.title,
                        content: localDraft.content,
                        content_type: localDraft.content_type,
                        language: localDraft.language,
                        target_source_id: targetSourceId || localDraft.target_source_id,
                        is_auto_saved: false,
                    }),
                });

                const result: ApiResponse<Draft> = await response.json();

                if (result.success && result.data) {
                    syncLocalDraftToServer(localId, result.data);
                    return { success: true, data: result.data };
                } else {
                    const message = result.error || "Failed to sync draft";
                    setError(message);
                    return { success: false, error: message };
                }
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Failed to sync draft";
                setError(message);
                return { success: false, error: message };
            } finally {
                setSyncing(false);
            }
        },
        [localDrafts, syncLocalDraftToServer, setSyncing, setError]
    );

    // Save draft to a specific location (as a note)
    const saveDraftAsNote = useCallback(
        async (
            draftId: string,
            sourceId: string
        ): Promise<{ success: boolean; error?: string }> => {
            const allDrafts = [...localDrafts, ...drafts];
            const draft = allDrafts.find((d) => d.id === draftId);
            if (!draft) {
                return { success: false, error: "Draft not found" };
            }

            setSaving(true);
            setError(null);

            try {
                // Create a note from the draft
                const response = await fetch("/api/notes", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        source_id: sourceId,
                        title: draft.title,
                        content: draft.content,
                        content_type: draft.content_type,
                        language: draft.language,
                    }),
                });

                const result = await response.json();

                if (result.success) {
                    // Delete the draft after saving as note
                    if (draftId.startsWith("local_")) {
                        removeLocalDraft(draftId);
                    } else {
                        await fetch(`/api/drafts/${draftId}`, { method: "DELETE" });
                        removeDraft(draftId);
                    }

                    if (activeDraftId === draftId) {
                        setActiveDraft(null);
                    }

                    return { success: true };
                } else {
                    const message = result.error || "Failed to save draft as note";
                    setError(message);
                    return { success: false, error: message };
                }
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Failed to save draft as note";
                setError(message);
                return { success: false, error: message };
            } finally {
                setSaving(false);
            }
        },
        [
            localDrafts,
            drafts,
            activeDraftId,
            removeLocalDraft,
            removeDraft,
            setActiveDraft,
            setSaving,
            setError,
        ]
    );

    // Delete a single draft
    const deleteDraft = useCallback(
        async (id: string): Promise<{ success: boolean; error?: string }> => {
            // Check if it's a local draft
            if (id.startsWith("local_")) {
                removeLocalDraft(id);
                if (activeDraftId === id) {
                    setActiveDraft(null);
                }
                return { success: true };
            }

            setDeleting(true);
            setError(null);

            try {
                const response = await fetch(`/api/drafts/${id}`, {
                    method: "DELETE",
                });

                const result: ApiResponse<{ deleted: boolean }> =
                    await response.json();

                if (result.success) {
                    removeDraft(id);
                    if (activeDraftId === id) {
                        setActiveDraft(null);
                    }
                    return { success: true };
                } else {
                    const message = result.error || "Failed to delete draft";
                    setError(message);
                    return { success: false, error: message };
                }
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Failed to delete draft";
                setError(message);
                return { success: false, error: message };
            } finally {
                setDeleting(false);
            }
        },
        [
            removeLocalDraft,
            removeDraft,
            activeDraftId,
            setActiveDraft,
            setDeleting,
            setError,
        ]
    );

    // Delete multiple drafts
    const deleteDrafts = useCallback(
        async (ids: string[]): Promise<{ success: boolean; error?: string }> => {
            if (ids.length === 0) {
                return { success: false, error: "No drafts selected" };
            }

            setDeleting(true);
            setError(null);

            try {
                // Separate local and server drafts
                const localIds = ids.filter((id) => id.startsWith("local_"));
                const serverIds = ids.filter((id) => !id.startsWith("local_"));

                // Delete local drafts
                localIds.forEach((id) => removeLocalDraft(id));

                // Delete server drafts
                if (serverIds.length > 0) {
                    const response = await fetch(
                        `/api/drafts?ids=${serverIds.join(",")}`,
                        { method: "DELETE" }
                    );

                    const result: ApiResponse<{ deleted: number }> =
                        await response.json();

                    if (!result.success) {
                        const message = result.error || "Failed to delete drafts";
                        setError(message);
                        return { success: false, error: message };
                    }

                    removeDrafts(serverIds);
                }

                if (activeDraftId && ids.includes(activeDraftId)) {
                    setActiveDraft(null);
                }

                return { success: true };
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Failed to delete drafts";
                setError(message);
                return { success: false, error: message };
            } finally {
                setDeleting(false);
            }
        },
        [
            removeLocalDraft,
            removeDrafts,
            activeDraftId,
            setActiveDraft,
            setDeleting,
            setError,
        ]
    );

    // Refresh drafts
    const refresh = useCallback(() => {
        return fetchDrafts();
    }, [fetchDrafts]);

    // Load more drafts (pagination)
    const loadMore = useCallback(async () => {
        if (!hasMore || isLoading) return { success: false };
        useDraftsStore.getState().nextPage();
        return fetchDrafts();
    }, [hasMore, isLoading, fetchDrafts]);

    // Change filter
    const changeFilter = useCallback(
        (newFilter: DraftsFilter) => {
            setFilter(newFilter);
            // Reset pagination and fetch with new filter
            useDraftsStore.getState().setPagination({ offset: 0 });
            fetchDrafts(newFilter);
        },
        [setFilter, fetchDrafts]
    );

    // Auto-fetch on mount
    useEffect(() => {
        if (autoFetch && !hasFetched.current) {
            hasFetched.current = true;
            fetchDrafts();
        }
    }, [autoFetch, fetchDrafts]);

    // Cleanup auto-save timer on unmount
    useEffect(() => {
        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }
        };
    }, []);

    // Get all drafts (local + server)
    const allDrafts = [...localDrafts, ...drafts];

    // Get active draft
    const activeDraft = allDrafts.find((d) => d.id === activeDraftId);

    // Get drafts for current target source
    const targetDrafts = targetSourceId
        ? allDrafts.filter((d) => d.target_source_id === targetSourceId)
        : allDrafts;

    return {
        // Data
        drafts: targetDrafts,
        allDrafts,
        localDrafts,
        serverDrafts: drafts,
        activeDraft,
        activeDraftId,

        // Loading states
        isLoading,
        isCreating,
        isUpdating,
        isDeleting,
        isSaving,
        isSyncing,

        // Error
        error,

        // Pagination
        pagination: {
            total,
            limit,
            offset,
            hasMore,
        },

        // Filter
        filter,
        changeFilter,

        // Actions
        fetchDrafts,
        createDraft,
        createLocalDraft,
        updateDraft,
        autoSaveDraft,
        syncLocalDraft,
        saveDraftAsNote,
        deleteDraft,
        deleteDrafts,
        clearLocalDrafts,
        refresh,
        loadMore,
        setActiveDraft,

        // Helpers
        hasUnsavedDrafts: localDrafts.length > 0,

        // Check if API is configured
        isConfigured: true, // Drafts API is always available if authenticated
    };
}

// Hook to get drafts for a specific target source
export function useDraftsByTargetSource(sourceId: string) {
    return useDrafts({ autoFetch: true, targetSourceId: sourceId });
}

// Hook to check if there are unsaved drafts
export function useHasUnsavedDrafts() {
    const localDrafts = useDraftsStore((state) => state.localDrafts);
    return localDrafts.length > 0;
}

// Hook to get drafts count
export function useDraftsCount() {
    const drafts = useDraftsStore((state) => state.drafts);
    const localDrafts = useDraftsStore((state) => state.localDrafts);
    return {
        total: drafts.length,
        local: localDrafts.length,
        all: drafts.length + localDrafts.length,
        markdown: drafts.filter((d) => d.content_type === "markdown").length,
        code: drafts.filter((d) => d.content_type === "code").length,
        plaintext: drafts.filter((d) => d.content_type === "plaintext").length,
    };
}
