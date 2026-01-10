import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

// Types
export type DraftContentType = "markdown" | "plaintext" | "code";

export interface Draft {
    id: string;
    title: string | null;
    content: string;
    content_type: DraftContentType;
    language: string | null;
    target_source_id: string | null;
    is_auto_saved: boolean;
    user_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface DraftsFilter {
    search?: string;
    content_type?: DraftContentType;
    target_source_id?: string;
    is_auto_saved?: boolean;
}

interface DraftsState {
    // Data
    drafts: Draft[];
    selectedIds: Set<string>;
    filter: DraftsFilter;
    activeDraftId: string | null;

    // Local drafts (for auto-save before sync to server)
    localDrafts: Draft[];

    // Loading states
    isLoading: boolean;
    isCreating: boolean;
    isUpdating: boolean;
    isDeleting: boolean;
    isSaving: boolean;
    isSyncing: boolean;

    // Pagination
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;

    // Error state
    error: string | null;

    // Actions - Data Management
    setDrafts: (drafts: Draft[]) => void;
    addDraft: (draft: Draft) => void;
    updateDraft: (id: string, updates: Partial<Draft>) => void;
    removeDraft: (id: string) => void;
    removeDrafts: (ids: string[]) => void;

    // Actions - Local Drafts (for auto-save)
    addLocalDraft: (draft: Draft) => void;
    updateLocalDraft: (id: string, updates: Partial<Draft>) => void;
    removeLocalDraft: (id: string) => void;
    clearLocalDrafts: () => void;
    syncLocalDraft: (localId: string, serverDraft: Draft) => void;

    // Actions - Active Draft
    setActiveDraft: (id: string | null) => void;

    // Actions - Selection
    selectDraft: (id: string) => void;
    deselectDraft: (id: string) => void;
    toggleSelectDraft: (id: string) => void;
    selectAll: () => void;
    deselectAll: () => void;

    // Actions - Filter
    setFilter: (filter: DraftsFilter) => void;
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
    setSyncing: (isSyncing: boolean) => void;
    setError: (error: string | null) => void;

    // Actions - Reset
    reset: () => void;
}

const initialState = {
    drafts: [],
    selectedIds: new Set<string>(),
    filter: {},
    activeDraftId: null,
    localDrafts: [],
    isLoading: false,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    isSaving: false,
    isSyncing: false,
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false,
    error: null,
};

export const useDraftsStore = create<DraftsState>()(
    devtools(
        persist(
            (set, get) => ({
                ...initialState,

                // Data Management
                setDrafts: (drafts) =>
                    set(
                        { drafts, hasMore: drafts.length >= get().limit },
                        false,
                        "setDrafts",
                    ),

                addDraft: (draft) =>
                    set(
                        (state) => ({
                            drafts: [draft, ...state.drafts],
                            total: state.total + 1,
                        }),
                        false,
                        "addDraft",
                    ),

                updateDraft: (id, updates) =>
                    set(
                        (state) => ({
                            drafts: state.drafts.map((draft) =>
                                draft.id === id
                                    ? {
                                          ...draft,
                                          ...updates,
                                          updated_at: new Date().toISOString(),
                                      }
                                    : draft,
                            ),
                        }),
                        false,
                        "updateDraft",
                    ),

                removeDraft: (id) =>
                    set(
                        (state) => ({
                            drafts: state.drafts.filter(
                                (draft) => draft.id !== id,
                            ),
                            selectedIds: new Set(
                                [...state.selectedIds].filter(
                                    (sid) => sid !== id,
                                ),
                            ),
                            activeDraftId:
                                state.activeDraftId === id
                                    ? null
                                    : state.activeDraftId,
                            total: Math.max(0, state.total - 1),
                        }),
                        false,
                        "removeDraft",
                    ),

                removeDrafts: (ids) =>
                    set(
                        (state) => ({
                            drafts: state.drafts.filter(
                                (draft) => !ids.includes(draft.id),
                            ),
                            selectedIds: new Set(
                                [...state.selectedIds].filter(
                                    (sid) => !ids.includes(sid),
                                ),
                            ),
                            activeDraftId:
                                state.activeDraftId &&
                                ids.includes(state.activeDraftId)
                                    ? null
                                    : state.activeDraftId,
                            total: Math.max(0, state.total - ids.length),
                        }),
                        false,
                        "removeDrafts",
                    ),

                // Local Drafts for auto-save
                addLocalDraft: (draft) =>
                    set(
                        (state) => ({
                            localDrafts: [draft, ...state.localDrafts],
                        }),
                        false,
                        "addLocalDraft",
                    ),

                updateLocalDraft: (id, updates) =>
                    set(
                        (state) => ({
                            localDrafts: state.localDrafts.map((draft) =>
                                draft.id === id
                                    ? {
                                          ...draft,
                                          ...updates,
                                          updated_at: new Date().toISOString(),
                                      }
                                    : draft,
                            ),
                        }),
                        false,
                        "updateLocalDraft",
                    ),

                removeLocalDraft: (id) =>
                    set(
                        (state) => ({
                            localDrafts: state.localDrafts.filter(
                                (draft) => draft.id !== id,
                            ),
                        }),
                        false,
                        "removeLocalDraft",
                    ),

                clearLocalDrafts: () =>
                    set({ localDrafts: [] }, false, "clearLocalDrafts"),

                syncLocalDraft: (localId, serverDraft) =>
                    set(
                        (state) => ({
                            localDrafts: state.localDrafts.filter(
                                (draft) => draft.id !== localId,
                            ),
                            drafts: [serverDraft, ...state.drafts],
                            activeDraftId:
                                state.activeDraftId === localId
                                    ? serverDraft.id
                                    : state.activeDraftId,
                        }),
                        false,
                        "syncLocalDraft",
                    ),

                // Active Draft
                setActiveDraft: (id) =>
                    set({ activeDraftId: id }, false, "setActiveDraft"),

                // Selection
                selectDraft: (id) =>
                    set(
                        (state) => ({
                            selectedIds: new Set([...state.selectedIds, id]),
                        }),
                        false,
                        "selectDraft",
                    ),

                deselectDraft: (id) =>
                    set(
                        (state) => ({
                            selectedIds: new Set(
                                [...state.selectedIds].filter(
                                    (sid) => sid !== id,
                                ),
                            ),
                        }),
                        false,
                        "deselectDraft",
                    ),

                toggleSelectDraft: (id) =>
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
                        "toggleSelectDraft",
                    ),

                selectAll: () =>
                    set(
                        (state) => ({
                            selectedIds: new Set(
                                state.drafts.map((draft) => draft.id),
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
                setSyncing: (isSyncing) =>
                    set({ isSyncing }, false, "setSyncing"),
                setError: (error) => set({ error }, false, "setError"),

                // Reset
                reset: () => set(initialState, false, "reset"),
            }),
            {
                name: "drafts-storage",
                // Only persist local drafts to localStorage
                partialize: (state) => ({
                    localDrafts: state.localDrafts,
                    activeDraftId: state.activeDraftId,
                }),
            },
        ),
        { name: "drafts-store" },
    ),
);

// Selector hooks for common patterns
export const useDrafts = () => useDraftsStore((state) => state.drafts);

export const useLocalDrafts = () =>
    useDraftsStore((state) => state.localDrafts);

export const useAllDrafts = () =>
    useDraftsStore((state) => [...state.localDrafts, ...state.drafts]);

export const useDraftsByTargetSource = (sourceId: string) =>
    useDraftsStore((state) =>
        state.drafts.filter((draft) => draft.target_source_id === sourceId),
    );

export const useActiveDraft = () =>
    useDraftsStore((state) => {
        const allDrafts = [...state.localDrafts, ...state.drafts];
        return allDrafts.find((draft) => draft.id === state.activeDraftId);
    });

export const useSelectedDrafts = () =>
    useDraftsStore((state) =>
        state.drafts.filter((draft) => state.selectedIds.has(draft.id)),
    );

export const useDraftsLoading = () =>
    useDraftsStore((state) => state.isLoading);

export const useDraftsError = () => useDraftsStore((state) => state.error);

export const useDraftsFilter = () => useDraftsStore((state) => state.filter);

export const useDraftsPagination = () =>
    useDraftsStore((state) => ({
        total: state.total,
        limit: state.limit,
        offset: state.offset,
        hasMore: state.hasMore,
    }));

// Helper to get draft by ID
export const useDraftById = (id: string) =>
    useDraftsStore((state) => {
        const allDrafts = [...state.localDrafts, ...state.drafts];
        return allDrafts.find((draft) => draft.id === id);
    });

// Helper to count drafts
export const useDraftsCount = () =>
    useDraftsStore((state) => ({
        total: state.drafts.length,
        local: state.localDrafts.length,
        all: state.drafts.length + state.localDrafts.length,
        markdown: state.drafts.filter((d) => d.content_type === "markdown")
            .length,
        code: state.drafts.filter((d) => d.content_type === "code").length,
        plaintext: state.drafts.filter((d) => d.content_type === "plaintext")
            .length,
        autoSaved: state.drafts.filter((d) => d.is_auto_saved).length,
    }));

// Helper to check if there are unsaved local drafts
export const useHasUnsavedDrafts = () =>
    useDraftsStore((state) => state.localDrafts.length > 0);
