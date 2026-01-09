import { create } from "zustand";
import { devtools } from "zustand/middleware";

// Types
export type IdeaStatus = "inbox" | "active" | "archive";

export interface Idea {
    id: string;
    content: string;
    status: IdeaStatus;
    done: boolean;
    tags: string[] | null;
    refs: string[] | null;
    source_ref: string | null;
    created_at: string;
    updated_at: string;
}

export interface IdeasFilter {
    status?: IdeaStatus;
    done?: boolean;
    tag?: string;
}

interface IdeasState {
    // Data
    ideas: Idea[];
    selectedIds: Set<string>;
    filter: IdeasFilter;

    // Loading states
    isLoading: boolean;
    isCreating: boolean;
    isUpdating: boolean;
    isDeleting: boolean;

    // Pagination
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;

    // Error state
    error: string | null;

    // Actions - Data Management
    setIdeas: (ideas: Idea[]) => void;
    addIdea: (idea: Idea) => void;
    updateIdea: (id: string, updates: Partial<Idea>) => void;
    removeIdea: (id: string) => void;
    removeIdeas: (ids: string[]) => void;
    toggleIdeaDone: (id: string) => void;

    // Actions - Selection
    selectIdea: (id: string) => void;
    deselectIdea: (id: string) => void;
    toggleSelectIdea: (id: string) => void;
    selectAll: () => void;
    deselectAll: () => void;

    // Actions - Filter
    setFilter: (filter: IdeasFilter) => void;
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
    setError: (error: string | null) => void;

    // Actions - Reset
    reset: () => void;
}

const initialState = {
    ideas: [],
    selectedIds: new Set<string>(),
    filter: {},
    isLoading: false,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false,
    error: null,
};

export const useIdeasStore = create<IdeasState>()(
    devtools(
        (set, get) => ({
            ...initialState,

            // Data Management
            setIdeas: (ideas) =>
                set(
                    { ideas, hasMore: ideas.length >= get().limit },
                    false,
                    "setIdeas",
                ),

            addIdea: (idea) =>
                set(
                    (state) => ({
                        ideas: [idea, ...state.ideas],
                        total: state.total + 1,
                    }),
                    false,
                    "addIdea",
                ),

            updateIdea: (id, updates) =>
                set(
                    (state) => ({
                        ideas: state.ideas.map((idea) =>
                            idea.id === id
                                ? { ...idea, ...updates, updated_at: new Date().toISOString() }
                                : idea,
                        ),
                    }),
                    false,
                    "updateIdea",
                ),

            removeIdea: (id) =>
                set(
                    (state) => ({
                        ideas: state.ideas.filter((idea) => idea.id !== id),
                        selectedIds: new Set(
                            [...state.selectedIds].filter((sid) => sid !== id),
                        ),
                        total: Math.max(0, state.total - 1),
                    }),
                    false,
                    "removeIdea",
                ),

            removeIdeas: (ids) =>
                set(
                    (state) => ({
                        ideas: state.ideas.filter(
                            (idea) => !ids.includes(idea.id),
                        ),
                        selectedIds: new Set(
                            [...state.selectedIds].filter(
                                (sid) => !ids.includes(sid),
                            ),
                        ),
                        total: Math.max(0, state.total - ids.length),
                    }),
                    false,
                    "removeIdeas",
                ),

            toggleIdeaDone: (id) =>
                set(
                    (state) => ({
                        ideas: state.ideas.map((idea) =>
                            idea.id === id
                                ? { ...idea, done: !idea.done, updated_at: new Date().toISOString() }
                                : idea,
                        ),
                    }),
                    false,
                    "toggleIdeaDone",
                ),

            // Selection
            selectIdea: (id) =>
                set(
                    (state) => ({
                        selectedIds: new Set([...state.selectedIds, id]),
                    }),
                    false,
                    "selectIdea",
                ),

            deselectIdea: (id) =>
                set(
                    (state) => ({
                        selectedIds: new Set(
                            [...state.selectedIds].filter((sid) => sid !== id),
                        ),
                    }),
                    false,
                    "deselectIdea",
                ),

            toggleSelectIdea: (id) =>
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
                    "toggleSelectIdea",
                ),

            selectAll: () =>
                set(
                    (state) => ({
                        selectedIds: new Set(state.ideas.map((idea) => idea.id)),
                    }),
                    false,
                    "selectAll",
                ),

            deselectAll: () => set({ selectedIds: new Set() }, false, "deselectAll"),

            // Filter
            setFilter: (filter) =>
                set(
                    (state) => ({ filter: { ...state.filter, ...filter }, offset: 0 }),
                    false,
                    "setFilter",
                ),

            clearFilter: () => set({ filter: {}, offset: 0 }, false, "clearFilter"),

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
            setCreating: (isCreating) => set({ isCreating }, false, "setCreating"),
            setUpdating: (isUpdating) => set({ isUpdating }, false, "setUpdating"),
            setDeleting: (isDeleting) => set({ isDeleting }, false, "setDeleting"),
            setError: (error) => set({ error }, false, "setError"),

            // Reset
            reset: () => set(initialState, false, "reset"),
        }),
        { name: "ideas-store" },
    ),
);

// Selector hooks for common patterns
export const useIdeas = () => useIdeasStore((state) => state.ideas);
export const useIdeasByStatus = (status: IdeaStatus) =>
    useIdeasStore((state) => state.ideas.filter((idea) => idea.status === status));
export const useSelectedIdeas = () =>
    useIdeasStore((state) =>
        state.ideas.filter((idea) => state.selectedIds.has(idea.id)),
    );
export const useIdeasLoading = () => useIdeasStore((state) => state.isLoading);
export const useIdeasError = () => useIdeasStore((state) => state.error);
export const useIdeasFilter = () => useIdeasStore((state) => state.filter);
export const useIdeasPagination = () =>
    useIdeasStore((state) => ({
        total: state.total,
        limit: state.limit,
        offset: state.offset,
        hasMore: state.hasMore,
    }));

// Helper to get idea by ID
export const useIdeaById = (id: string) =>
    useIdeasStore((state) => state.ideas.find((idea) => idea.id === id));

// Helper to count ideas by status
export const useIdeasCount = () =>
    useIdeasStore((state) => ({
        inbox: state.ideas.filter((i) => i.status === "inbox").length,
        active: state.ideas.filter((i) => i.status === "active").length,
        archive: state.ideas.filter((i) => i.status === "archive").length,
        total: state.ideas.length,
        done: state.ideas.filter((i) => i.done).length,
    }));
