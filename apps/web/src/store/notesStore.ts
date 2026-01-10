import { create } from "zustand";
import { devtools } from "zustand/middleware";

// Types
export type NoteContentType = "markdown" | "plaintext" | "code";

export interface Note {
    id: string;
    source_id: string | null;
    title: string | null;
    content: string;
    content_type: NoteContentType;
    language: string | null;
    tags: string[] | null;
    is_pinned: boolean;
    user_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface NotesFilter {
    source_id?: string;
    search?: string;
    content_type?: NoteContentType;
    is_pinned?: boolean;
    tags?: string[];
}

interface NotesState {
    // Data
    notes: Note[];
    selectedIds: Set<string>;
    filter: NotesFilter;
    activeNoteId: string | null;

    // Loading states
    isLoading: boolean;
    isCreating: boolean;
    isUpdating: boolean;
    isDeleting: boolean;
    isSaving: boolean;

    // Pagination
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;

    // Error state
    error: string | null;

    // Actions - Data Management
    setNotes: (notes: Note[]) => void;
    addNote: (note: Note) => void;
    updateNote: (id: string, updates: Partial<Note>) => void;
    removeNote: (id: string) => void;
    removeNotes: (ids: string[]) => void;

    // Actions - Active Note
    setActiveNote: (id: string | null) => void;

    // Actions - Selection
    selectNote: (id: string) => void;
    deselectNote: (id: string) => void;
    toggleSelectNote: (id: string) => void;
    selectAll: () => void;
    deselectAll: () => void;

    // Actions - Filter
    setFilter: (filter: NotesFilter) => void;
    clearFilter: () => void;

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
    setSaving: (isSaving: boolean) => void;
    setError: (error: string | null) => void;

    // Actions - Reset
    reset: () => void;
}

const initialState = {
    notes: [],
    selectedIds: new Set<string>(),
    filter: {},
    activeNoteId: null,
    isLoading: false,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    isSaving: false,
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false,
    error: null,
};

export const useNotesStore = create<NotesState>()(
    devtools(
        (set, get) => ({
            ...initialState,

            // Data Management
            setNotes: (notes) =>
                set(
                    { notes, hasMore: notes.length >= get().limit },
                    false,
                    "setNotes",
                ),

            addNote: (note) =>
                set(
                    (state) => ({
                        notes: [note, ...state.notes],
                        total: state.total + 1,
                    }),
                    false,
                    "addNote",
                ),

            updateNote: (id, updates) =>
                set(
                    (state) => ({
                        notes: state.notes.map((note) =>
                            note.id === id
                                ? {
                                      ...note,
                                      ...updates,
                                      updated_at: new Date().toISOString(),
                                  }
                                : note,
                        ),
                    }),
                    false,
                    "updateNote",
                ),

            removeNote: (id) =>
                set(
                    (state) => ({
                        notes: state.notes.filter((note) => note.id !== id),
                        selectedIds: new Set(
                            [...state.selectedIds].filter((sid) => sid !== id),
                        ),
                        activeNoteId:
                            state.activeNoteId === id
                                ? null
                                : state.activeNoteId,
                        total: Math.max(0, state.total - 1),
                    }),
                    false,
                    "removeNote",
                ),

            removeNotes: (ids) =>
                set(
                    (state) => ({
                        notes: state.notes.filter(
                            (note) => !ids.includes(note.id),
                        ),
                        selectedIds: new Set(
                            [...state.selectedIds].filter(
                                (sid) => !ids.includes(sid),
                            ),
                        ),
                        activeNoteId:
                            state.activeNoteId &&
                            ids.includes(state.activeNoteId)
                                ? null
                                : state.activeNoteId,
                        total: Math.max(0, state.total - ids.length),
                    }),
                    false,
                    "removeNotes",
                ),

            // Active Note
            setActiveNote: (id) =>
                set({ activeNoteId: id }, false, "setActiveNote"),

            // Selection
            selectNote: (id) =>
                set(
                    (state) => ({
                        selectedIds: new Set([...state.selectedIds, id]),
                    }),
                    false,
                    "selectNote",
                ),

            deselectNote: (id) =>
                set(
                    (state) => ({
                        selectedIds: new Set(
                            [...state.selectedIds].filter((sid) => sid !== id),
                        ),
                    }),
                    false,
                    "deselectNote",
                ),

            toggleSelectNote: (id) =>
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
                    "toggleSelectNote",
                ),

            selectAll: () =>
                set(
                    (state) => ({
                        selectedIds: new Set(
                            state.notes.map((note) => note.id),
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
            setLoading: (isLoading) =>
                set({ isLoading }, false, "setLoading"),
            setCreating: (isCreating) =>
                set({ isCreating }, false, "setCreating"),
            setUpdating: (isUpdating) =>
                set({ isUpdating }, false, "setUpdating"),
            setDeleting: (isDeleting) =>
                set({ isDeleting }, false, "setDeleting"),
            setSaving: (isSaving) => set({ isSaving }, false, "setSaving"),
            setError: (error) => set({ error }, false, "setError"),

            // Reset
            reset: () => set(initialState, false, "reset"),
        }),
        { name: "notes-store" },
    ),
);

// Selector hooks for common patterns
export const useNotes = () => useNotesStore((state) => state.notes);

export const useNotesBySource = (sourceId: string) =>
    useNotesStore((state) =>
        state.notes.filter((note) => note.source_id === sourceId),
    );

export const usePinnedNotes = () =>
    useNotesStore((state) => state.notes.filter((note) => note.is_pinned));

export const useActiveNote = () =>
    useNotesStore((state) =>
        state.notes.find((note) => note.id === state.activeNoteId),
    );

export const useSelectedNotes = () =>
    useNotesStore((state) =>
        state.notes.filter((note) => state.selectedIds.has(note.id)),
    );

export const useNotesLoading = () =>
    useNotesStore((state) => state.isLoading);

export const useNotesError = () => useNotesStore((state) => state.error);

export const useNotesFilter = () => useNotesStore((state) => state.filter);

export const useNotesPagination = () =>
    useNotesStore((state) => ({
        total: state.total,
        limit: state.limit,
        offset: state.offset,
        hasMore: state.hasMore,
    }));

// Helper to get note by ID
export const useNoteById = (id: string) =>
    useNotesStore((state) => state.notes.find((note) => note.id === id));

// Helper to count notes
export const useNotesCount = () =>
    useNotesStore((state) => ({
        total: state.notes.length,
        pinned: state.notes.filter((n) => n.is_pinned).length,
        markdown: state.notes.filter((n) => n.content_type === "markdown")
            .length,
        code: state.notes.filter((n) => n.content_type === "code").length,
        plaintext: state.notes.filter((n) => n.content_type === "plaintext")
            .length,
    }));
