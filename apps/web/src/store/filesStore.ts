import { create } from "zustand";
import { devtools } from "zustand/middleware";

// Types
export interface File {
    id: string;
    source_id: string;
    path: string;
    name: string;
    content: string | null;
    size: number | null;
    mime_type: string | null;
    file_hash: string | null;
    created_at: string;
    updated_at: string;
}

export interface FilesFilter {
    source_id?: string;
    path?: string;
    search?: string;
    mime_type?: string;
}

interface FilesState {
    // Data
    files: File[];
    selectedIds: Set<string>;
    currentFile: File | null;
    filter: FilesFilter;

    // Loading states
    isLoading: boolean;
    isLoadingFile: boolean;
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
    setFiles: (files: File[]) => void;
    addFile: (file: File) => void;
    updateFile: (id: string, updates: Partial<File>) => void;
    removeFile: (id: string) => void;
    removeFiles: (ids: string[]) => void;
    upsertFile: (file: File) => void;

    // Actions - Current File
    setCurrentFile: (file: File | null) => void;

    // Actions - Selection
    selectFile: (id: string) => void;
    deselectFile: (id: string) => void;
    toggleSelectFile: (id: string) => void;
    selectAll: () => void;
    deselectAll: () => void;

    // Actions - Filter
    setFilter: (filter: FilesFilter) => void;
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
    setLoadingFile: (isLoadingFile: boolean) => void;
    setCreating: (isCreating: boolean) => void;
    setUpdating: (isUpdating: boolean) => void;
    setDeleting: (isDeleting: boolean) => void;
    setError: (error: string | null) => void;

    // Actions - Reset
    reset: () => void;
    resetCurrentFile: () => void;
}

const initialState = {
    files: [],
    selectedIds: new Set<string>(),
    currentFile: null,
    filter: {},
    isLoading: false,
    isLoadingFile: false,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false,
    error: null,
};

export const useFilesStore = create<FilesState>()(
    devtools(
        (set, get) => ({
            ...initialState,

            // Data Management
            setFiles: (files) =>
                set(
                    { files, hasMore: files.length >= get().limit },
                    false,
                    "setFiles",
                ),

            addFile: (file) =>
                set(
                    (state) => ({
                        files: [file, ...state.files],
                        total: state.total + 1,
                    }),
                    false,
                    "addFile",
                ),

            updateFile: (id, updates) =>
                set(
                    (state) => ({
                        files: state.files.map((file) =>
                            file.id === id
                                ? {
                                      ...file,
                                      ...updates,
                                      updated_at: new Date().toISOString(),
                                  }
                                : file,
                        ),
                        currentFile:
                            state.currentFile?.id === id
                                ? { ...state.currentFile, ...updates }
                                : state.currentFile,
                    }),
                    false,
                    "updateFile",
                ),

            removeFile: (id) =>
                set(
                    (state) => ({
                        files: state.files.filter((file) => file.id !== id),
                        selectedIds: new Set(
                            [...state.selectedIds].filter((sid) => sid !== id),
                        ),
                        currentFile:
                            state.currentFile?.id === id
                                ? null
                                : state.currentFile,
                        total: Math.max(0, state.total - 1),
                    }),
                    false,
                    "removeFile",
                ),

            removeFiles: (ids) =>
                set(
                    (state) => ({
                        files: state.files.filter(
                            (file) => !ids.includes(file.id),
                        ),
                        selectedIds: new Set(
                            [...state.selectedIds].filter(
                                (sid) => !ids.includes(sid),
                            ),
                        ),
                        currentFile:
                            state.currentFile &&
                            ids.includes(state.currentFile.id)
                                ? null
                                : state.currentFile,
                        total: Math.max(0, state.total - ids.length),
                    }),
                    false,
                    "removeFiles",
                ),

            upsertFile: (file) =>
                set(
                    (state) => {
                        const existingIndex = state.files.findIndex(
                            (f) =>
                                f.id === file.id ||
                                (f.source_id === file.source_id &&
                                    f.path === file.path),
                        );

                        if (existingIndex >= 0) {
                            const newFiles = [...state.files];
                            newFiles[existingIndex] = file;
                            return { files: newFiles };
                        }

                        return {
                            files: [file, ...state.files],
                            total: state.total + 1,
                        };
                    },
                    false,
                    "upsertFile",
                ),

            // Current File
            setCurrentFile: (file) =>
                set({ currentFile: file }, false, "setCurrentFile"),

            // Selection
            selectFile: (id) =>
                set(
                    (state) => ({
                        selectedIds: new Set([...state.selectedIds, id]),
                    }),
                    false,
                    "selectFile",
                ),

            deselectFile: (id) =>
                set(
                    (state) => ({
                        selectedIds: new Set(
                            [...state.selectedIds].filter((sid) => sid !== id),
                        ),
                    }),
                    false,
                    "deselectFile",
                ),

            toggleSelectFile: (id) =>
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
                    "toggleSelectFile",
                ),

            selectAll: () =>
                set(
                    (state) => ({
                        selectedIds: new Set(state.files.map((file) => file.id)),
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
            setLoadingFile: (isLoadingFile) =>
                set({ isLoadingFile }, false, "setLoadingFile"),
            setCreating: (isCreating) =>
                set({ isCreating }, false, "setCreating"),
            setUpdating: (isUpdating) =>
                set({ isUpdating }, false, "setUpdating"),
            setDeleting: (isDeleting) =>
                set({ isDeleting }, false, "setDeleting"),
            setError: (error) => set({ error }, false, "setError"),

            // Reset
            reset: () => set(initialState, false, "reset"),
            resetCurrentFile: () =>
                set(
                    { currentFile: null, isLoadingFile: false },
                    false,
                    "resetCurrentFile",
                ),
        }),
        { name: "files-store" },
    ),
);

// Selector hooks for common patterns
export const useFiles = () => useFilesStore((state) => state.files);

export const useCurrentFile = () =>
    useFilesStore((state) => state.currentFile);

export const useSelectedFiles = () =>
    useFilesStore((state) =>
        state.files.filter((file) => state.selectedIds.has(file.id)),
    );

export const useFilesLoading = () =>
    useFilesStore((state) => state.isLoading);

export const useFilesError = () => useFilesStore((state) => state.error);

export const useFilesFilter = () => useFilesStore((state) => state.filter);

export const useFilesPagination = () =>
    useFilesStore((state) => ({
        total: state.total,
        limit: state.limit,
        offset: state.offset,
        hasMore: state.hasMore,
    }));

// Helper to get file by ID
export const useFileById = (id: string) =>
    useFilesStore((state) => state.files.find((file) => file.id === id));

// Helper to get files by source
export const useFilesBySource = (sourceId: string) =>
    useFilesStore((state) =>
        state.files.filter((file) => file.source_id === sourceId),
    );

// Helper to get files by path prefix
export const useFilesByPath = (pathPrefix: string) =>
    useFilesStore((state) =>
        state.files.filter((file) => file.path.startsWith(pathPrefix)),
    );

// Helper to count files by source
export const useFilesCountBySource = () =>
    useFilesStore((state) => {
        const counts: Record<string, number> = {};
        state.files.forEach((file) => {
            counts[file.source_id] = (counts[file.source_id] || 0) + 1;
        });
        return counts;
    });

// Helper to get file extensions
export const useFilesByExtension = (extension: string) =>
    useFilesStore((state) =>
        state.files.filter((file) => file.name.endsWith(`.${extension}`)),
    );
