import { create } from "zustand";
import { devtools } from "zustand/middleware";

// Types
export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
    id: string;
    chat_id: string;
    role: MessageRole;
    content: string;
    created_at: string;
}

export interface Chat {
    id: string;
    source_id: string | null;
    title: string | null;
    started_at: string;
    ended_at: string | null;
    created_at: string;
    messages_count?: number;
    last_message?: string;
}

export interface ChatsFilter {
    source_id?: string;
    search?: string;
}

interface ChatsState {
    // Data
    chats: Chat[];
    selectedChatId: string | null;
    currentChat: Chat | null;
    messages: ChatMessage[];
    filter: ChatsFilter;

    // Loading states
    isLoading: boolean;
    isLoadingChat: boolean;
    isCreating: boolean;
    isSending: boolean;
    isDeleting: boolean;

    // Pagination
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;

    // Error state
    error: string | null;

    // Actions - Data Management
    setChats: (chats: Chat[]) => void;
    addChat: (chat: Chat) => void;
    updateChat: (id: string, updates: Partial<Chat>) => void;
    removeChat: (id: string) => void;
    removeChats: (ids: string[]) => void;

    // Actions - Current Chat
    setCurrentChat: (chat: Chat | null) => void;
    setSelectedChatId: (id: string | null) => void;

    // Actions - Messages
    setMessages: (messages: ChatMessage[]) => void;
    addMessage: (message: ChatMessage) => void;
    updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
    removeMessage: (id: string) => void;
    clearMessages: () => void;

    // Actions - Filter
    setFilter: (filter: ChatsFilter) => void;
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
    setLoadingChat: (isLoadingChat: boolean) => void;
    setCreating: (isCreating: boolean) => void;
    setSending: (isSending: boolean) => void;
    setDeleting: (isDeleting: boolean) => void;
    setError: (error: string | null) => void;

    // Actions - Reset
    reset: () => void;
    resetCurrentChat: () => void;
}

const initialState = {
    chats: [],
    selectedChatId: null,
    currentChat: null,
    messages: [],
    filter: {},
    isLoading: false,
    isLoadingChat: false,
    isCreating: false,
    isSending: false,
    isDeleting: false,
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false,
    error: null,
};

export const useChatsStore = create<ChatsState>()(
    devtools(
        (set, get) => ({
            ...initialState,

            // Data Management
            setChats: (chats) =>
                set(
                    { chats, hasMore: chats.length >= get().limit },
                    false,
                    "setChats",
                ),

            addChat: (chat) =>
                set(
                    (state) => ({
                        chats: [chat, ...state.chats],
                        total: state.total + 1,
                    }),
                    false,
                    "addChat",
                ),

            updateChat: (id, updates) =>
                set(
                    (state) => ({
                        chats: state.chats.map((chat) =>
                            chat.id === id ? { ...chat, ...updates } : chat,
                        ),
                        currentChat:
                            state.currentChat?.id === id
                                ? { ...state.currentChat, ...updates }
                                : state.currentChat,
                    }),
                    false,
                    "updateChat",
                ),

            removeChat: (id) =>
                set(
                    (state) => ({
                        chats: state.chats.filter((chat) => chat.id !== id),
                        selectedChatId:
                            state.selectedChatId === id
                                ? null
                                : state.selectedChatId,
                        currentChat:
                            state.currentChat?.id === id
                                ? null
                                : state.currentChat,
                        messages:
                            state.currentChat?.id === id ? [] : state.messages,
                        total: Math.max(0, state.total - 1),
                    }),
                    false,
                    "removeChat",
                ),

            removeChats: (ids) =>
                set(
                    (state) => ({
                        chats: state.chats.filter(
                            (chat) => !ids.includes(chat.id),
                        ),
                        selectedChatId:
                            state.selectedChatId &&
                            ids.includes(state.selectedChatId)
                                ? null
                                : state.selectedChatId,
                        currentChat:
                            state.currentChat &&
                            ids.includes(state.currentChat.id)
                                ? null
                                : state.currentChat,
                        messages:
                            state.currentChat &&
                            ids.includes(state.currentChat.id)
                                ? []
                                : state.messages,
                        total: Math.max(0, state.total - ids.length),
                    }),
                    false,
                    "removeChats",
                ),

            // Current Chat
            setCurrentChat: (chat) =>
                set(
                    { currentChat: chat, selectedChatId: chat?.id || null },
                    false,
                    "setCurrentChat",
                ),

            setSelectedChatId: (id) =>
                set({ selectedChatId: id }, false, "setSelectedChatId"),

            // Messages
            setMessages: (messages) =>
                set({ messages }, false, "setMessages"),

            addMessage: (message) =>
                set(
                    (state) => ({
                        messages: [...state.messages, message],
                        // Update chat's last message
                        chats: state.chats.map((chat) =>
                            chat.id === message.chat_id
                                ? {
                                      ...chat,
                                      messages_count:
                                          (chat.messages_count || 0) + 1,
                                      last_message: message.content.substring(
                                          0,
                                          100,
                                      ),
                                  }
                                : chat,
                        ),
                    }),
                    false,
                    "addMessage",
                ),

            updateMessage: (id, updates) =>
                set(
                    (state) => ({
                        messages: state.messages.map((msg) =>
                            msg.id === id ? { ...msg, ...updates } : msg,
                        ),
                    }),
                    false,
                    "updateMessage",
                ),

            removeMessage: (id) =>
                set(
                    (state) => ({
                        messages: state.messages.filter((msg) => msg.id !== id),
                    }),
                    false,
                    "removeMessage",
                ),

            clearMessages: () => set({ messages: [] }, false, "clearMessages"),

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
            setLoadingChat: (isLoadingChat) =>
                set({ isLoadingChat }, false, "setLoadingChat"),
            setCreating: (isCreating) =>
                set({ isCreating }, false, "setCreating"),
            setSending: (isSending) =>
                set({ isSending }, false, "setSending"),
            setDeleting: (isDeleting) =>
                set({ isDeleting }, false, "setDeleting"),
            setError: (error) => set({ error }, false, "setError"),

            // Reset
            reset: () => set(initialState, false, "reset"),
            resetCurrentChat: () =>
                set(
                    {
                        currentChat: null,
                        selectedChatId: null,
                        messages: [],
                        isLoadingChat: false,
                    },
                    false,
                    "resetCurrentChat",
                ),
        }),
        { name: "chats-store" },
    ),
);

// Selector hooks for common patterns
export const useChats = () => useChatsStore((state) => state.chats);

export const useCurrentChat = () =>
    useChatsStore((state) => state.currentChat);

export const useMessages = () => useChatsStore((state) => state.messages);

export const useSelectedChatId = () =>
    useChatsStore((state) => state.selectedChatId);

export const useChatsLoading = () =>
    useChatsStore((state) => state.isLoading);

export const useChatsError = () => useChatsStore((state) => state.error);

export const useChatsFilter = () => useChatsStore((state) => state.filter);

export const useChatsPagination = () =>
    useChatsStore((state) => ({
        total: state.total,
        limit: state.limit,
        offset: state.offset,
        hasMore: state.hasMore,
    }));

// Helper to get chat by ID
export const useChatById = (id: string) =>
    useChatsStore((state) => state.chats.find((chat) => chat.id === id));

// Helper to get messages by role
export const useMessagesByRole = (role: MessageRole) =>
    useChatsStore((state) =>
        state.messages.filter((msg) => msg.role === role),
    );

// Helper to get user messages
export const useUserMessages = () =>
    useChatsStore((state) =>
        state.messages.filter((msg) => msg.role === "user"),
    );

// Helper to get assistant messages
export const useAssistantMessages = () =>
    useChatsStore((state) =>
        state.messages.filter((msg) => msg.role === "assistant"),
    );
