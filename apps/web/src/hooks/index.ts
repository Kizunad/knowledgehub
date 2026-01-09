// ============================================================
// Hub Hooks - API Integration with Zustand Stores
// ============================================================

// Ideas Hooks
export {
    useIdeas,
    useIdeasByStatus,
    useIdeasCounts,
    type CreateIdeaInput,
    type UpdateIdeaInput,
} from "./useIdeas";

// Sources Hooks
export {
    useSources,
    useSourcesByMode,
    useSourcesNeedingSync,
    useSourcesCounts,
    type CreateSourceInput,
    type UpdateSourceInput,
} from "./useSources";

// Search Hooks
export {
    useSearch,
    useSearchKeyboard,
    useSearchResultsByType,
    useSearchConfigured,
} from "./useSearch";

// Debounce Hooks
export {
    useDebounce,
    useDebouncedCallback,
    useDebouncedState,
    useDebouncedFetch,
} from "./useDebounce";

// Realtime Hooks
export {
    useRealtimeSubscription,
    useMultiRealtimeSubscription,
    usePresence,
    useBroadcast,
    useRealtimeIdeas,
    useRealtimeFiles,
    useRealtimeSources,
    type RealtimeEvent,
    type RealtimeSubscription,
    type UseRealtimeOptions,
    type RealtimeStatus,
    type PresenceState,
    type UsePresenceOptions,
    type UseBroadcastOptions,
    type Idea,
    type FileRecord,
    type DirectorySource,
} from "./useRealtime";

// GitHub Hooks
export {
    useGitHub,
    useGitHubRepo,
    type GitHubUser,
    type GitHubRepo,
    type GitHubFile,
    type GitHubTreeData,
    type GitHubImportResult,
    type UseGitHubState,
    type UseGitHubRepoOptions,
} from "./useGitHub";

// ============================================================
// Enhancement Hooks
// ============================================================

// Drag and Drop Hooks
export {
    useDragAndDrop,
    useMultiContainerDragAndDrop,
    generateOrderValue,
    normalizeOrderValues,
    type DragAndDropOptions,
    type DragAndDropResult,
    type SortableItemProps,
    type DragOverlayProps,
    type ContainerItem,
    type MultiContainerOptions,
    type MultiContainerResult,
} from "./useDragAndDrop";

// Batch Selection Hooks
export {
    useBatchSelection,
    useBatchActions,
    useBatchKeyboardShortcuts,
    type BatchSelectionOptions,
    type BatchSelectionResult,
    type BatchAction,
    type UseBatchActionsOptions,
    type UseBatchActionsResult,
} from "./useBatchSelection";

// Export Hooks
export {
    useExport,
    useIdeasExport,
    useSourcesExport,
    useChatsExport,
    bulkExport,
    ideaMarkdownFormatter,
    sourceMarkdownFormatter,
    chatMarkdownFormatter,
    type ExportFormat,
    type ExportOptions,
    type ExportResult,
    type UseExportOptions,
    type UseExportResult,
    type MarkdownFormatter,
    type Idea as ExportIdea,
    type Source as ExportSource,
    type Chat as ExportChat,
    type BulkExportItem,
} from "./useExport";

// ============================================================
// PWA & Offline Hooks
// ============================================================

// Offline Status Hooks
export {
    useOffline,
    useIsOnline,
    type OfflineState,
    type UseOfflineOptions,
} from "./useOffline";

// PWA Hooks
export {
    usePWA,
    useOfflineData,
    type PWAState,
    type OfflineData,
} from "./usePWA";
