// ============================================================
// Hub Stores - Zustand State Management
// ============================================================

// Auth Store
export {
    useAuthStore,
    useUser,
    useIsAuthenticated,
    useIsLoading as useAuthIsLoading,
} from "./authStore";

// Ideas Store
export {
    useIdeasStore,
    useIdeas,
    useIdeasByStatus,
    useSelectedIdeas,
    useIdeasLoading,
    useIdeasError,
    useIdeasFilter,
    useIdeasPagination,
    useIdeaById,
    useIdeasCount,
    type Idea,
    type IdeaStatus,
    type IdeasFilter,
} from "./ideasStore";

// Sources Store
export {
    useSourcesStore,
    useSources,
    useSourcesByMode,
    useSelectedSources,
    useSourcesLoading,
    useSourcesError,
    useSourcesFilter,
    useSourcesPagination,
    useSourceById,
    useSyncStatus,
    useSourcesCount,
    useSourcesNeedingSync,
    type DirectorySource,
    type DirectorySourceMode,
    type DirectorySourceType,
    type SourcesFilter,
} from "./sourcesStore";

// Search Store
export {
    useSearchStore,
    useSearchQuery,
    useSearchResults,
    useSearchIsOpen,
    useSearchIsLoading,
    useSearchError,
    useSearchFilters,
    useSearchSelectedIndex,
    useSelectedResult,
    useResultsByType,
    useResultCounts,
    useHasResults,
    useShowEmptyState,
    type SearchResult,
    type SearchResultType,
    type SearchFilters,
} from "./searchStore";

// Chats Store
export {
    useChatsStore,
    useChats,
    useCurrentChat,
    useMessages,
    useSelectedChatId,
    useChatsLoading,
    useChatsError,
    useChatsFilter,
    useChatsPagination,
    useChatById,
    useMessagesByRole,
    useUserMessages,
    useAssistantMessages,
    type Chat,
    type ChatMessage,
    type MessageRole,
    type ChatsFilter,
} from "./chatsStore";

// Files Store
export {
    useFilesStore,
    useFiles,
    useCurrentFile,
    useSelectedFiles,
    useFilesLoading,
    useFilesError,
    useFilesFilter,
    useFilesPagination,
    useFileById,
    useFilesBySource,
    useFilesByPath,
    useFilesCountBySource,
    useFilesByExtension,
    type File,
    type FilesFilter,
} from "./filesStore";

// Notes Store
export {
    useNotesStore,
    useNotes,
    useNotesBySource,
    usePinnedNotes,
    useActiveNote,
    useSelectedNotes,
    useNotesLoading,
    useNotesError,
    useNotesFilter,
    useNotesPagination,
    useNoteById,
    useNotesCount,
    type Note,
    type NoteContentType,
    type NotesFilter,
} from "./notesStore";

// Drafts Store
export {
    useDraftsStore,
    useDrafts,
    useLocalDrafts,
    useAllDrafts,
    useDraftsByTargetSource,
    useActiveDraft,
    useSelectedDrafts,
    useDraftsLoading,
    useDraftsError,
    useDraftsFilter,
    useDraftsPagination,
    useDraftById,
    useDraftsCount,
    useHasUnsavedDrafts,
    type Draft,
    type DraftContentType,
    type DraftsFilter,
} from "./draftsStore";
