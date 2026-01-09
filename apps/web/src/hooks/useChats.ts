"use client";

import { useCallback, useEffect, useRef } from "react";
import {
    useChatsStore,
    type Chat,
    type ChatMessage,
    type MessageRole,
    type ChatsFilter,
} from "@/store";
import { isSupabaseConfigured } from "@/lib/supabase/client";

// API Response types
interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

interface ChatsListResponse {
    chats: Chat[];
    total: number;
    limit: number;
    offset: number;
}

interface ChatDetailResponse {
    chat: Chat;
    messages: ChatMessage[];
}

// Create chat input
export interface CreateChatInput {
    title?: string;
    source_id?: string;
}

// Update chat input
export interface UpdateChatInput {
    title?: string;
    ended_at?: string;
}

// Create message input
export interface CreateMessageInput {
    role: MessageRole;
    content: string;
}

// Hook options
interface UseChatsOptions {
    autoFetch?: boolean;
    initialFilter?: ChatsFilter;
}

/**
 * Custom hook for managing chats with API integration
 */
export function useChats(options: UseChatsOptions = {}) {
    const { autoFetch = true, initialFilter } = options;

    // Store state
    const chats = useChatsStore((state) => state.chats);
    const currentChat = useChatsStore((state) => state.currentChat);
    const messages = useChatsStore((state) => state.messages);
    const selectedChatId = useChatsStore((state) => state.selectedChatId);
    const filter = useChatsStore((state) => state.filter);
    const isLoading = useChatsStore((state) => state.isLoading);
    const isLoadingChat = useChatsStore((state) => state.isLoadingChat);
    const isCreating = useChatsStore((state) => state.isCreating);
    const isSending = useChatsStore((state) => state.isSending);
    const isDeleting = useChatsStore((state) => state.isDeleting);
    const error = useChatsStore((state) => state.error);
    const total = useChatsStore((state) => state.total);
    const limit = useChatsStore((state) => state.limit);
    const offset = useChatsStore((state) => state.offset);
    const hasMore = useChatsStore((state) => state.hasMore);

    // Store actions
    const setChats = useChatsStore((state) => state.setChats);
    const addChat = useChatsStore((state) => state.addChat);
    const updateChatInStore = useChatsStore((state) => state.updateChat);
    const removeChat = useChatsStore((state) => state.removeChat);
    const removeChats = useChatsStore((state) => state.removeChats);
    const setCurrentChat = useChatsStore((state) => state.setCurrentChat);
    const setMessages = useChatsStore((state) => state.setMessages);
    const addMessage = useChatsStore((state) => state.addMessage);
    const setLoading = useChatsStore((state) => state.setLoading);
    const setLoadingChat = useChatsStore((state) => state.setLoadingChat);
    const setCreating = useChatsStore((state) => state.setCreating);
    const setSending = useChatsStore((state) => state.setSending);
    const setDeleting = useChatsStore((state) => state.setDeleting);
    const setError = useChatsStore((state) => state.setError);
    const setPagination = useChatsStore((state) => state.setPagination);
    const setFilter = useChatsStore((state) => state.setFilter);
    const resetCurrentChat = useChatsStore((state) => state.resetCurrentChat);

    // Track if initial fetch has been done
    const hasFetched = useRef(false);

    /**
     * Fetch chats from API
     */
    const fetchChats = useCallback(
        async (customFilter?: ChatsFilter, customOffset?: number) => {
            if (!isSupabaseConfigured()) {
                setError("Supabase 未配置");
                return { success: false, error: "Supabase 未配置" };
            }

            setLoading(true);
            setError(null);

            try {
                const currentFilter = customFilter || filter;
                const currentOffset = customOffset ?? offset;

                // Build query params
                const params = new URLSearchParams();
                if (currentFilter.source_id)
                    params.set("source_id", currentFilter.source_id);
                if (currentFilter.search)
                    params.set("search", currentFilter.search);
                params.set("limit", String(limit));
                params.set("offset", String(currentOffset));

                const response = await fetch(
                    `/api/chats?${params.toString()}`,
                );
                const result: ApiResponse<ChatsListResponse> =
                    await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.error || "获取对话列表失败");
                }

                if (result.data) {
                    setChats(result.data.chats);
                    setPagination({
                        total: result.data.total,
                        limit: result.data.limit,
                        offset: result.data.offset,
                    });
                }

                return { success: true, data: result.data };
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "获取对话列表失败";
                setError(message);
                return { success: false, error: message };
            } finally {
                setLoading(false);
            }
        },
        [filter, offset, limit, setChats, setPagination, setLoading, setError],
    );

    /**
     * Fetch a single chat with messages
     */
    const fetchChat = useCallback(
        async (id: string) => {
            if (!isSupabaseConfigured()) {
                setError("Supabase 未配置");
                return { success: false, error: "Supabase 未配置" };
            }

            setLoadingChat(true);
            setError(null);

            try {
                const response = await fetch(`/api/chats/${id}`);
                const result: ApiResponse<ChatDetailResponse> =
                    await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.error || "获取对话详情失败");
                }

                if (result.data) {
                    setCurrentChat(result.data.chat);
                    setMessages(result.data.messages);
                }

                return { success: true, data: result.data };
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "获取对话详情失败";
                setError(message);
                return { success: false, error: message };
            } finally {
                setLoadingChat(false);
            }
        },
        [setCurrentChat, setMessages, setLoadingChat, setError],
    );

    /**
     * Create a new chat
     */
    const createChat = useCallback(
        async (input: CreateChatInput = {}) => {
            if (!isSupabaseConfigured()) {
                setError("Supabase 未配置");
                return { success: false, error: "Supabase 未配置" };
            }

            setCreating(true);
            setError(null);

            try {
                const response = await fetch("/api/chats", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(input),
                });

                const result: ApiResponse<Chat> = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.error || "创建对话失败");
                }

                if (result.data) {
                    addChat(result.data);
                    setCurrentChat(result.data);
                    setMessages([]);
                }

                return { success: true, data: result.data };
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "创建对话失败";
                setError(message);
                return { success: false, error: message };
            } finally {
                setCreating(false);
            }
        },
        [addChat, setCurrentChat, setMessages, setCreating, setError],
    );

    /**
     * Update a chat
     */
    const updateChat = useCallback(
        async (id: string, updates: UpdateChatInput) => {
            if (!isSupabaseConfigured()) {
                setError("Supabase 未配置");
                return { success: false, error: "Supabase 未配置" };
            }

            try {
                const response = await fetch(`/api/chats/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(updates),
                });

                const result: ApiResponse<Chat> = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.error || "更新对话失败");
                }

                if (result.data) {
                    updateChatInStore(id, result.data);
                }

                return { success: true, data: result.data };
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "更新对话失败";
                setError(message);
                return { success: false, error: message };
            }
        },
        [updateChatInStore, setError],
    );

    /**
     * Send a message to a chat
     */
    const sendMessage = useCallback(
        async (chatId: string, input: CreateMessageInput) => {
            if (!isSupabaseConfigured()) {
                setError("Supabase 未配置");
                return { success: false, error: "Supabase 未配置" };
            }

            setSending(true);
            setError(null);

            try {
                const response = await fetch(`/api/chats/${chatId}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(input),
                });

                const result: ApiResponse<ChatMessage> = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.error || "发送消息失败");
                }

                if (result.data) {
                    addMessage(result.data);
                }

                return { success: true, data: result.data };
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "发送消息失败";
                setError(message);
                return { success: false, error: message };
            } finally {
                setSending(false);
            }
        },
        [addMessage, setSending, setError],
    );

    /**
     * Delete a chat
     */
    const deleteChat = useCallback(
        async (id: string) => {
            if (!isSupabaseConfigured()) {
                setError("Supabase 未配置");
                return { success: false, error: "Supabase 未配置" };
            }

            setDeleting(true);
            setError(null);

            // Store current chat for rollback
            const chat = chats.find((c) => c.id === id);

            // Optimistic delete
            removeChat(id);

            try {
                const response = await fetch(`/api/chats/${id}`, {
                    method: "DELETE",
                });

                const result: ApiResponse<{ id: string }> =
                    await response.json();

                if (!response.ok || !result.success) {
                    // Rollback on failure
                    if (chat) {
                        addChat(chat);
                    }
                    throw new Error(result.error || "删除对话失败");
                }

                // Clear current chat if it was deleted
                if (currentChat?.id === id) {
                    resetCurrentChat();
                }

                return { success: true };
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "删除对话失败";
                setError(message);
                return { success: false, error: message };
            } finally {
                setDeleting(false);
            }
        },
        [
            chats,
            currentChat,
            addChat,
            removeChat,
            resetCurrentChat,
            setDeleting,
            setError,
        ],
    );

    /**
     * Bulk delete chats
     */
    const deleteChats = useCallback(
        async (ids: string[]) => {
            if (!isSupabaseConfigured()) {
                setError("Supabase 未配置");
                return { success: false, error: "Supabase 未配置" };
            }

            if (ids.length === 0) {
                return { success: false, error: "没有选中任何对话" };
            }

            setDeleting(true);
            setError(null);

            // Store current chats for rollback
            const deletedChats = chats.filter((c) => ids.includes(c.id));

            // Optimistic delete
            removeChats(ids);

            try {
                const response = await fetch(
                    `/api/chats?ids=${ids.join(",")}`,
                    {
                        method: "DELETE",
                    },
                );

                const result: ApiResponse<{ deleted: number }> =
                    await response.json();

                if (!response.ok || !result.success) {
                    // Rollback on failure
                    deletedChats.forEach((chat) => addChat(chat));
                    throw new Error(result.error || "批量删除对话失败");
                }

                // Clear current chat if it was deleted
                if (currentChat && ids.includes(currentChat.id)) {
                    resetCurrentChat();
                }

                return { success: true, data: result.data };
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "批量删除对话失败";
                setError(message);
                return { success: false, error: message };
            } finally {
                setDeleting(false);
            }
        },
        [
            chats,
            currentChat,
            addChat,
            removeChats,
            resetCurrentChat,
            setDeleting,
            setError,
        ],
    );

    /**
     * Select a chat and load its messages
     */
    const selectChat = useCallback(
        async (id: string) => {
            return await fetchChat(id);
        },
        [fetchChat],
    );

    /**
     * Refresh chats
     */
    const refresh = useCallback(() => {
        return fetchChats(filter, 0);
    }, [fetchChats, filter]);

    /**
     * Load next page
     */
    const loadMore = useCallback(() => {
        if (!hasMore || isLoading) return Promise.resolve({ success: false });
        return fetchChats(filter, offset + limit);
    }, [fetchChats, filter, offset, limit, hasMore, isLoading]);

    /**
     * Change filter
     */
    const changeFilter = useCallback(
        (newFilter: ChatsFilter) => {
            setFilter(newFilter);
            return fetchChats(newFilter, 0);
        },
        [setFilter, fetchChats],
    );

    // Auto-fetch on mount
    useEffect(() => {
        if (autoFetch && !hasFetched.current) {
            hasFetched.current = true;
            if (initialFilter) {
                setFilter(initialFilter);
                fetchChats(initialFilter, 0);
            } else {
                fetchChats();
            }
        }
    }, [autoFetch, initialFilter, setFilter, fetchChats]);

    return {
        // State
        chats,
        currentChat,
        messages,
        selectedChatId,
        filter,
        isLoading,
        isLoadingChat,
        isCreating,
        isSending,
        isDeleting,
        error,
        total,
        hasMore,
        pagination: { total, limit, offset, hasMore },

        // Actions
        fetchChats,
        fetchChat,
        createChat,
        updateChat,
        sendMessage,
        deleteChat,
        deleteChats,
        selectChat,
        refresh,
        loadMore,
        changeFilter,

        // Utils
        isConfigured: isSupabaseConfigured(),
    };
}

/**
 * Hook for sending messages to current chat
 */
export function useChatMessages() {
    const messages = useChatsStore((state) => state.messages);
    const currentChat = useChatsStore((state) => state.currentChat);
    const isSending = useChatsStore((state) => state.isSending);

    return {
        messages,
        currentChat,
        isSending,
        userMessages: messages.filter((m) => m.role === "user"),
        assistantMessages: messages.filter((m) => m.role === "assistant"),
    };
}
