import { useCallback, useEffect, useRef } from "react";
import {
    useNotesStore,
    Note,
    NotesFilter,
    NoteContentType,
} from "@/store/notesStore";

// API Response types
interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

interface NotesListResponse {
    notes: Note[];
    total: number;
    limit: number;
    offset: number;
}

// Input types
interface CreateNoteInput {
    source_id?: string;
    title?: string;
    content: string;
    content_type?: NoteContentType;
    language?: string;
    tags?: string[];
    is_pinned?: boolean;
}

interface UpdateNoteInput {
    title?: string;
    content?: string;
    content_type?: NoteContentType;
    language?: string;
    tags?: string[];
    is_pinned?: boolean;
    source_id?: string | null;
}

interface UseNotesOptions {
    autoFetch?: boolean;
    sourceId?: string;
}

export function useNotes(options: UseNotesOptions = {}) {
    const { autoFetch = false, sourceId } = options;

    // Get state from store
    const notes = useNotesStore((state) => state.notes);
    const filter = useNotesStore((state) => state.filter);
    const activeNoteId = useNotesStore((state) => state.activeNoteId);
    const isLoading = useNotesStore((state) => state.isLoading);
    const isCreating = useNotesStore((state) => state.isCreating);
    const isUpdating = useNotesStore((state) => state.isUpdating);
    const isDeleting = useNotesStore((state) => state.isDeleting);
    const isSaving = useNotesStore((state) => state.isSaving);
    const error = useNotesStore((state) => state.error);
    const total = useNotesStore((state) => state.total);
    const limit = useNotesStore((state) => state.limit);
    const offset = useNotesStore((state) => state.offset);
    const hasMore = useNotesStore((state) => state.hasMore);

    // Get actions from store
    const setNotes = useNotesStore((state) => state.setNotes);
    const addNote = useNotesStore((state) => state.addNote);
    const updateNoteInStore = useNotesStore((state) => state.updateNote);
    const removeNote = useNotesStore((state) => state.removeNote);
    const removeNotes = useNotesStore((state) => state.removeNotes);
    const setLoading = useNotesStore((state) => state.setLoading);
    const setCreating = useNotesStore((state) => state.setCreating);
    const setUpdating = useNotesStore((state) => state.setUpdating);
    const setDeleting = useNotesStore((state) => state.setDeleting);
    const setSaving = useNotesStore((state) => state.setSaving);
    const setError = useNotesStore((state) => state.setError);
    const setPagination = useNotesStore((state) => state.setPagination);
    const setFilter = useNotesStore((state) => state.setFilter);
    const setActiveNote = useNotesStore((state) => state.setActiveNote);

    // Track if we've fetched
    const hasFetched = useRef(false);

    // Fetch notes from API
    const fetchNotes = useCallback(
        async (
            customFilter?: NotesFilter
        ): Promise<{ success: boolean; error?: string }> => {
            setLoading(true);
            setError(null);

            try {
                const currentFilter = customFilter || filter;
                const currentOffset = useNotesStore.getState().offset;

                // Build query params
                const params = new URLSearchParams();
                if (sourceId || currentFilter.source_id) {
                    params.set("source_id", sourceId || currentFilter.source_id || "");
                }
                if (currentFilter.content_type) {
                    params.set("content_type", currentFilter.content_type);
                }
                if (currentFilter.is_pinned !== undefined) {
                    params.set("is_pinned", String(currentFilter.is_pinned));
                }
                if (currentFilter.search) {
                    params.set("search", currentFilter.search);
                }
                params.set("limit", String(limit));
                params.set("offset", String(currentOffset));

                const response = await fetch(`/api/notes?${params.toString()}`);
                const result: ApiResponse<NotesListResponse> =
                    await response.json();

                if (result.success && result.data) {
                    setNotes(result.data.notes);
                    setPagination({
                        total: result.data.total,
                        limit: result.data.limit,
                        offset: result.data.offset,
                    });
                    return { success: true };
                } else {
                    const message = result.error || "Failed to fetch notes";
                    setError(message);
                    return { success: false, error: message };
                }
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Failed to fetch notes";
                setError(message);
                return { success: false, error: message };
            } finally {
                setLoading(false);
            }
        },
        [
            filter,
            sourceId,
            limit,
            setNotes,
            setPagination,
            setLoading,
            setError,
        ]
    );

    // Create a new note
    const createNote = useCallback(
        async (
            input: CreateNoteInput
        ): Promise<{ success: boolean; data?: Note; error?: string }> => {
            setCreating(true);
            setError(null);

            try {
                const response = await fetch("/api/notes", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(input),
                });

                const result: ApiResponse<Note> = await response.json();

                if (result.success && result.data) {
                    addNote(result.data);
                    return { success: true, data: result.data };
                } else {
                    const message = result.error || "Failed to create note";
                    setError(message);
                    return { success: false, error: message };
                }
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Failed to create note";
                setError(message);
                return { success: false, error: message };
            } finally {
                setCreating(false);
            }
        },
        [addNote, setCreating, setError]
    );

    // Update a single note
    const updateNote = useCallback(
        async (
            id: string,
            input: UpdateNoteInput
        ): Promise<{ success: boolean; data?: Note; error?: string }> => {
            setUpdating(true);
            setError(null);

            try {
                const response = await fetch(`/api/notes/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(input),
                });

                const result: ApiResponse<Note> = await response.json();

                if (result.success && result.data) {
                    updateNoteInStore(id, result.data);
                    return { success: true, data: result.data };
                } else {
                    const message = result.error || "Failed to update note";
                    setError(message);
                    return { success: false, error: message };
                }
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Failed to update note";
                setError(message);
                return { success: false, error: message };
            } finally {
                setUpdating(false);
            }
        },
        [updateNoteInStore, setUpdating, setError]
    );

    // Auto-save note (debounced save)
    const saveNote = useCallback(
        async (
            id: string,
            input: UpdateNoteInput
        ): Promise<{ success: boolean; data?: Note; error?: string }> => {
            setSaving(true);

            try {
                const response = await fetch(`/api/notes/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(input),
                });

                const result: ApiResponse<Note> = await response.json();

                if (result.success && result.data) {
                    updateNoteInStore(id, result.data);
                    return { success: true, data: result.data };
                } else {
                    return { success: false, error: result.error };
                }
            } catch (err) {
                return {
                    success: false,
                    error: err instanceof Error ? err.message : "Failed to save",
                };
            } finally {
                setSaving(false);
            }
        },
        [updateNoteInStore, setSaving]
    );

    // Delete a single note
    const deleteNote = useCallback(
        async (
            id: string
        ): Promise<{ success: boolean; error?: string }> => {
            setDeleting(true);
            setError(null);

            try {
                const response = await fetch(`/api/notes/${id}`, {
                    method: "DELETE",
                });

                const result: ApiResponse<{ deleted: boolean }> =
                    await response.json();

                if (result.success) {
                    removeNote(id);
                    if (activeNoteId === id) {
                        setActiveNote(null);
                    }
                    return { success: true };
                } else {
                    const message = result.error || "Failed to delete note";
                    setError(message);
                    return { success: false, error: message };
                }
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Failed to delete note";
                setError(message);
                return { success: false, error: message };
            } finally {
                setDeleting(false);
            }
        },
        [removeNote, activeNoteId, setActiveNote, setDeleting, setError]
    );

    // Delete multiple notes
    const deleteNotes = useCallback(
        async (
            ids: string[]
        ): Promise<{ success: boolean; error?: string }> => {
            if (ids.length === 0) {
                return { success: false, error: "No notes selected" };
            }

            setDeleting(true);
            setError(null);

            try {
                const response = await fetch(
                    `/api/notes?ids=${ids.join(",")}`,
                    { method: "DELETE" }
                );

                const result: ApiResponse<{ deleted: number }> =
                    await response.json();

                if (result.success) {
                    removeNotes(ids);
                    if (activeNoteId && ids.includes(activeNoteId)) {
                        setActiveNote(null);
                    }
                    return { success: true };
                } else {
                    const message = result.error || "Failed to delete notes";
                    setError(message);
                    return { success: false, error: message };
                }
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Failed to delete notes";
                setError(message);
                return { success: false, error: message };
            } finally {
                setDeleting(false);
            }
        },
        [removeNotes, activeNoteId, setActiveNote, setDeleting, setError]
    );

    // Toggle pinned status
    const togglePinned = useCallback(
        async (
            id: string
        ): Promise<{ success: boolean; error?: string }> => {
            const note = notes.find((n) => n.id === id);
            if (!note) {
                return { success: false, error: "Note not found" };
            }

            const result = await updateNote(id, { is_pinned: !note.is_pinned });
            return { success: result.success, error: result.error };
        },
        [notes, updateNote]
    );

    // Refresh notes
    const refresh = useCallback(() => {
        return fetchNotes();
    }, [fetchNotes]);

    // Load more notes (pagination)
    const loadMore = useCallback(async () => {
        if (!hasMore || isLoading) return { success: false };
        useNotesStore.getState().nextPage();
        return fetchNotes();
    }, [hasMore, isLoading, fetchNotes]);

    // Change filter
    const changeFilter = useCallback(
        (newFilter: NotesFilter) => {
            setFilter(newFilter);
            // Reset pagination and fetch with new filter
            useNotesStore.getState().setPagination({ offset: 0 });
            fetchNotes(newFilter);
        },
        [setFilter, fetchNotes]
    );

    // Auto-fetch on mount
    useEffect(() => {
        if (autoFetch && !hasFetched.current) {
            hasFetched.current = true;
            fetchNotes();
        }
    }, [autoFetch, fetchNotes]);

    // Get active note
    const activeNote = notes.find((n) => n.id === activeNoteId);

    // Get notes for current source
    const sourceNotes = sourceId
        ? notes.filter((n) => n.source_id === sourceId)
        : notes;

    return {
        // Data
        notes: sourceNotes,
        allNotes: notes,
        activeNote,
        activeNoteId,

        // Loading states
        isLoading,
        isCreating,
        isUpdating,
        isDeleting,
        isSaving,

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
        fetchNotes,
        createNote,
        updateNote,
        saveNote,
        deleteNote,
        deleteNotes,
        togglePinned,
        refresh,
        loadMore,
        setActiveNote,

        // Check if API is configured
        isConfigured: true, // Notes API is always available if authenticated
    };
}

// Hook to get notes for a specific source
export function useNotesBySource(sourceId: string) {
    return useNotes({ autoFetch: true, sourceId });
}

// Hook to get pinned notes
export function usePinnedNotes() {
    const notes = useNotesStore((state) => state.notes);
    return notes.filter((note) => note.is_pinned);
}

// Hook to get notes count
export function useNotesCount() {
    const notes = useNotesStore((state) => state.notes);
    return {
        total: notes.length,
        pinned: notes.filter((n) => n.is_pinned).length,
        markdown: notes.filter((n) => n.content_type === "markdown").length,
        code: notes.filter((n) => n.content_type === "code").length,
        plaintext: notes.filter((n) => n.content_type === "plaintext").length,
    };
}
