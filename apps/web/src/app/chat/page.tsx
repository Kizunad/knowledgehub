"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
    MessageSquare,
    Search,
    Plus,
    MoreVertical,
    Send,
    Bot,
    User,
    Calendar,
    Sparkles,
    ChevronLeft,
    X,
    Loader2,
    Trash2,
    AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useChats } from "@/hooks/useChats";
import { useChatsStore, type Chat, type ChatMessage } from "@/store/chatsStore";

// Mock data for demo mode (when Supabase is not configured)
const mockChatHistory = [
    {
        label: "Today",
        items: [
            {
                id: "1",
                title: "Supabase Schema Design",
                preview: "How to structure the many-to-many relationship...",
                time: "10:30 AM",
                active: true,
            },
            {
                id: "2",
                title: "Rust Error Handling",
                preview: "Explain the ? operator in Rust...",
                time: "09:15 AM",
                active: false,
            },
        ],
    },
    {
        label: "Yesterday",
        items: [
            {
                id: "3",
                title: "Next.js 14 Server Actions",
                preview: "What is the best practice for form validation...",
                time: "Yesterday",
                active: false,
            },
            {
                id: "4",
                title: "Tailwind CSS Grid",
                preview: "Center a div using grid...",
                time: "Yesterday",
                active: false,
            },
        ],
    },
    {
        label: "Previous 7 Days",
        items: [
            {
                id: "5",
                title: "Docker Compose Setup",
                preview: "Setting up Postgres and Redis...",
                time: "Mon",
                active: false,
            },
            {
                id: "6",
                title: "Zustand State Management",
                preview: "Comparing Redux and Zustand...",
                time: "Sun",
                active: false,
            },
        ],
    },
];

const mockMessages: ChatMessage[] = [
    {
        id: "m1",
        chat_id: "1",
        role: "user",
        content:
            "I'm designing a database schema for a personal knowledge hub. It needs to store 'Files', 'Chats', and 'Ideas'. What's the best way to link them all together efficiently? I want to be able to reference a file in a chat, or turn a chat message into an idea.",
        created_at: new Date().toISOString(),
    },
    {
        id: "m2",
        chat_id: "1",
        role: "assistant",
        content:
            "For a personal knowledge hub with those requirements, I recommend a **polymorphic relationship** or a centralized **References** table approach to keep things flexible (KISS principle).\n\nHere is a simple schema design using PostgreSQL:\n\n1. **Core Tables**: `files`, `chats`, `ideas`\n2. **Links Table**: A unified many-to-many join table.\n\n```sql\nCREATE TABLE refs (\n  source_id UUID,  -- The origin (e.g. an Idea ID)\n  target_id UUID,  -- The target (e.g. a File ID)\n  type VARCHAR     -- 'mention', 'source', 'related'\n);\n```\n\nAlternatively, simply storing references as text tags (e.g., `@file:123`) in the content itself is the most portable and readable way (\"Everything readable\" principle).",
        created_at: new Date().toISOString(),
    },
    {
        id: "m3",
        chat_id: "1",
        role: "user",
        content:
            "I like the text tag approach. `@file:path/to/file`. It feels more portable. How would I implement a search that finds these references?",
        created_at: new Date().toISOString(),
    },
];

// Helper: Group chats by date
function groupChatsByDate(chats: Chat[]) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const groups: { label: string; items: Chat[] }[] = [
        { label: "Today", items: [] },
        { label: "Yesterday", items: [] },
        { label: "Previous 7 Days", items: [] },
        { label: "Older", items: [] },
    ];

    chats.forEach((chat) => {
        const chatDate = new Date(chat.started_at || chat.created_at);
        if (chatDate >= today) {
            groups[0].items.push(chat);
        } else if (chatDate >= yesterday) {
            groups[1].items.push(chat);
        } else if (chatDate >= weekAgo) {
            groups[2].items.push(chat);
        } else {
            groups[3].items.push(chat);
        }
    });

    return groups.filter((g) => g.items.length > 0);
}

// Helper: Format time for display
function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const chatDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
    );

    if (chatDate.getTime() === today.getTime()) {
        return date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
    } else if (chatDate.getTime() === today.getTime() - 24 * 60 * 60 * 1000) {
        return "Yesterday";
    } else {
        return date.toLocaleDateString([], { weekday: "short" });
    }
}

export default function ChatPage() {
    const [input, setInput] = useState("");
    const [showSidebar, setShowSidebar] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
        null,
    );
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const {
        chats,
        currentChat,
        messages,
        selectedChatId,
        isLoading,
        isLoadingChat,
        isCreating,
        isSending,
        isDeleting,
        error,
        isConfigured,
        fetchChat,
        createChat,
        sendMessage,
        deleteChat,
        selectChat,
    } = useChats({ autoFetch: true });

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Auto-resize textarea
    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            setInput(e.target.value);
            if (textareaRef.current) {
                textareaRef.current.style.height = "auto";
                textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
            }
        },
        [],
    );

    // Handle sending message
    const handleSendMessage = useCallback(async () => {
        if (!input.trim() || isSending) return;

        const content = input.trim();
        setInput("");
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }

        if (!selectedChatId) {
            // Create a new chat first
            const result = await createChat({
                title:
                    content.substring(0, 50) +
                    (content.length > 50 ? "..." : ""),
            });
            if (result.success && result.data) {
                // Send the message to the new chat
                await sendMessage(result.data.id, { content, role: "user" });
            }
        } else {
            // Send to existing chat
            await sendMessage(selectedChatId, { content, role: "user" });
        }
    }, [input, isSending, selectedChatId, createChat, sendMessage]);

    // Handle key press (Enter to send, Shift+Enter for newline)
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        },
        [handleSendMessage],
    );

    // Get resetCurrentChat directly from store
    const resetCurrentChat = useChatsStore((state) => state.resetCurrentChat);

    // Handle new chat
    const handleNewChat = useCallback(() => {
        // Reset to new chat state
        resetCurrentChat();
    }, [resetCurrentChat]);

    // Handle chat selection
    const handleSelectChat = useCallback(
        async (chatId: string) => {
            setShowSidebar(false);
            selectChat(chatId);
            await fetchChat(chatId);
        },
        [selectChat, fetchChat],
    );

    // Handle delete chat
    const handleDeleteChat = useCallback(
        async (chatId: string) => {
            const result = await deleteChat(chatId);
            if (result.success) {
                setShowDeleteConfirm(null);
            }
        },
        [deleteChat],
    );

    // Filter chats by search query
    const filteredChats = searchQuery
        ? chats.filter(
              (chat) =>
                  chat.title
                      ?.toLowerCase()
                      .includes(searchQuery.toLowerCase()) ||
                  chat.last_message
                      ?.toLowerCase()
                      .includes(searchQuery.toLowerCase()),
          )
        : chats;

    // Group chats for display
    const groupedChats = isConfigured
        ? groupChatsByDate(filteredChats)
        : mockChatHistory;

    // Current messages for display
    const displayMessages = isConfigured ? messages : mockMessages;

    // Current chat info
    const displayChat = isConfigured
        ? currentChat
        : {
              id: "1",
              title: "Supabase Schema Design",
              started_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              source_id: null,
              ended_at: null,
          };

    return (
        <AppShell>
            <div className="flex h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] -mx-4 md:-mx-8 -mt-4 md:-mt-8">
                {/* Mobile Sidebar Overlay */}
                {showSidebar && (
                    <div
                        className="fixed inset-0 bg-black/50 z-30 md:hidden"
                        onClick={() => setShowSidebar(false)}
                    />
                )}

                {/* Chat History Sidebar */}
                <div
                    className={cn(
                        "fixed md:relative inset-y-0 left-0 z-40 md:z-auto w-80 border-r border-border bg-card flex flex-col transition-transform duration-200 md:translate-x-0",
                        showSidebar
                            ? "translate-x-0"
                            : "-translate-x-full md:translate-x-0",
                    )}
                >
                    {/* Header */}
                    <div className="h-16 border-b border-border flex items-center justify-between px-4">
                        <h1 className="font-semibold flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-chat" />
                            ChatLog
                        </h1>
                        <div className="flex items-center gap-1">
                            <button
                                className="p-2 hover:bg-accent rounded-md transition-colors"
                                onClick={handleNewChat}
                                disabled={isCreating}
                            >
                                {isCreating ? (
                                    <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                                ) : (
                                    <Plus className="h-5 w-5 text-muted-foreground" />
                                )}
                            </button>
                            <button
                                className="p-2 hover:bg-accent rounded-md transition-colors md:hidden"
                                onClick={() => setShowSidebar(false)}
                            >
                                <X className="h-5 w-5 text-muted-foreground" />
                            </button>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="p-4 border-b border-border">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search conversations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-9 rounded-md border border-input bg-background pl-9 pr-4 text-sm outline-none focus:border-chat focus:ring-1 focus:ring-chat/20 transition-all"
                            />
                        </div>
                    </div>

                    {/* History List */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-6">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                                <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                                <p className="text-sm text-muted-foreground">
                                    {error}
                                </p>
                            </div>
                        ) : groupedChats.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                                <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">
                                    No conversations yet
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Start a new chat to begin
                                </p>
                            </div>
                        ) : (
                            groupedChats.map((group) => (
                                <div key={group.label}>
                                    <h3 className="text-xs font-semibold text-muted-foreground px-2 mb-2 uppercase tracking-wider">
                                        {group.label}
                                    </h3>
                                    <div className="space-y-1">
                                        {group.items.map((chat) => {
                                            const chatId =
                                                "id" in chat
                                                    ? chat.id
                                                    : (chat as Chat).id;
                                            const chatTitle =
                                                "title" in chat
                                                    ? chat.title
                                                    : (chat as Chat).title;
                                            const chatPreview =
                                                "preview" in chat
                                                    ? (
                                                          chat as {
                                                              preview: string;
                                                          }
                                                      ).preview
                                                    : (chat as Chat)
                                                          .last_message;
                                            const chatTime =
                                                "time" in chat
                                                    ? (chat as { time: string })
                                                          .time
                                                    : formatTime(
                                                          (chat as Chat)
                                                              .started_at ||
                                                              (chat as Chat)
                                                                  .created_at,
                                                      );
                                            const isActive =
                                                "active" in chat
                                                    ? (
                                                          chat as {
                                                              active: boolean;
                                                          }
                                                      ).active
                                                    : selectedChatId === chatId;

                                            return (
                                                <div
                                                    key={chatId}
                                                    className="relative group"
                                                >
                                                    <button
                                                        onClick={() =>
                                                            handleSelectChat(
                                                                chatId,
                                                            )
                                                        }
                                                        className={cn(
                                                            "w-full text-left p-3 rounded-lg transition-all",
                                                            isActive
                                                                ? "bg-chat/10 border border-chat/20"
                                                                : "hover:bg-accent border border-transparent",
                                                        )}
                                                    >
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span
                                                                className={cn(
                                                                    "font-medium truncate pr-2 text-sm",
                                                                    isActive
                                                                        ? "text-chat-dark dark:text-chat"
                                                                        : "text-foreground",
                                                                )}
                                                            >
                                                                {chatTitle ||
                                                                    "New Chat"}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                                {chatTime}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground truncate">
                                                            {chatPreview ||
                                                                "No messages yet"}
                                                        </p>
                                                    </button>

                                                    {/* Delete button (on hover) */}
                                                    {isConfigured && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setShowDeleteConfirm(
                                                                    chatId,
                                                                );
                                                            }}
                                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}

                                                    {/* Delete confirmation */}
                                                    {showDeleteConfirm ===
                                                        chatId && (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-card/95 rounded-lg border border-destructive/50 z-10">
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() =>
                                                                        handleDeleteChat(
                                                                            chatId,
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        isDeleting
                                                                    }
                                                                    className="px-3 py-1.5 text-xs font-medium bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50"
                                                                >
                                                                    {isDeleting
                                                                        ? "Deleting..."
                                                                        : "Delete"}
                                                                </button>
                                                                <button
                                                                    onClick={() =>
                                                                        setShowDeleteConfirm(
                                                                            null,
                                                                        )
                                                                    }
                                                                    className="px-3 py-1.5 text-xs font-medium bg-secondary rounded-md hover:bg-secondary/80"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Demo mode indicator */}
                    {!isConfigured && (
                        <div className="p-3 border-t border-border">
                            <div className="px-3 py-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-md text-xs text-center">
                                Demo mode - Configure Supabase to save chats
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col bg-background/50 backdrop-blur-sm min-w-0">
                    {/* Chat Header */}
                    <div className="h-16 border-b border-border flex items-center justify-between px-4 md:px-6 bg-background/80 backdrop-blur sticky top-0 z-10">
                        <div className="flex items-center gap-3 min-w-0">
                            <button
                                className="p-2 hover:bg-accent rounded-md transition-colors md:hidden flex-shrink-0"
                                onClick={() => setShowSidebar(true)}
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <div className="min-w-0">
                                {isLoadingChat ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span className="text-sm text-muted-foreground">
                                            Loading...
                                        </span>
                                    </div>
                                ) : displayChat ? (
                                    <>
                                        <h2 className="font-semibold text-base md:text-lg truncate">
                                            {displayChat.title || "New Chat"}
                                        </h2>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Calendar className="h-3 w-3 flex-shrink-0" />
                                            <span>
                                                {formatTime(
                                                    displayChat.started_at ||
                                                        displayChat.created_at,
                                                )}
                                            </span>
                                            <span className="hidden sm:inline">
                                                •
                                            </span>
                                            <span className="hidden sm:inline">
                                                {displayMessages.length}{" "}
                                                messages
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <h2 className="font-semibold text-base md:text-lg">
                                        New Conversation
                                    </h2>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                            <button className="p-2 hover:bg-accent rounded-md transition-colors text-muted-foreground hover:text-foreground">
                                <Search className="h-4 w-4" />
                            </button>
                            <button className="p-2 hover:bg-accent rounded-md transition-colors text-muted-foreground hover:text-foreground">
                                <MoreVertical className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 md:space-y-8">
                        {isLoadingChat ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                            </div>
                        ) : displayMessages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center px-4">
                                <div className="p-4 rounded-full bg-chat/10 mb-4">
                                    <MessageSquare className="h-8 w-8 text-chat" />
                                </div>
                                <h3 className="font-semibold text-lg mb-2">
                                    Start a conversation
                                </h3>
                                <p className="text-sm text-muted-foreground max-w-md">
                                    Ask questions, brainstorm ideas, or discuss
                                    your projects. All conversations are saved
                                    for future reference.
                                </p>
                            </div>
                        ) : (
                            displayMessages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={cn(
                                        "flex gap-3 md:gap-4 max-w-4xl mx-auto",
                                        msg.role === "user"
                                            ? "justify-end"
                                            : "justify-start",
                                    )}
                                >
                                    {/* Avatar */}
                                    {msg.role === "assistant" && (
                                        <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-chat/10 flex items-center justify-center flex-shrink-0 mt-1">
                                            <Bot className="h-4 w-4 md:h-5 md:w-5 text-chat" />
                                        </div>
                                    )}

                                    <div
                                        className={cn(
                                            "flex flex-col gap-1 max-w-[85%] md:max-w-[80%]",
                                            msg.role === "user"
                                                ? "items-end"
                                                : "items-start",
                                        )}
                                    >
                                        {/* Name & Time */}
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                                            <span className="font-medium">
                                                {msg.role === "user"
                                                    ? "You"
                                                    : "Assistant"}
                                            </span>
                                            <span>
                                                {formatTime(msg.created_at)}
                                            </span>
                                        </div>

                                        {/* Bubble */}
                                        <div
                                            className={cn(
                                                "rounded-2xl px-4 py-3 md:px-5 md:py-3 text-sm leading-relaxed shadow-sm",
                                                msg.role === "user"
                                                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                                                    : "bg-card border border-border rounded-tl-sm",
                                            )}
                                        >
                                            <div className="whitespace-pre-wrap break-words">
                                                {msg.content}
                                            </div>
                                        </div>

                                        {/* Actions (Only for assistant) */}
                                        {msg.role === "assistant" && (
                                            <div className="flex items-center gap-2 mt-1 px-1">
                                                <button className="text-xs flex items-center gap-1 text-muted-foreground hover:text-ideas transition-colors">
                                                    <Sparkles className="h-3 w-3" />
                                                    <span>Save to Ideas</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Avatar (User) */}
                                    {msg.role === "user" && (
                                        <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                                            <User className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 md:p-6 bg-background border-t border-border">
                        <div className="max-w-4xl mx-auto">
                            <div className="relative flex items-end gap-2 p-2 rounded-xl border border-border bg-card shadow-sm focus-within:ring-2 focus-within:ring-chat/20 focus-within:border-chat transition-all">
                                <textarea
                                    ref={textareaRef}
                                    value={input}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Type a message..."
                                    className="flex-1 min-h-[44px] max-h-[200px] bg-transparent border-none focus:ring-0 resize-none py-2.5 px-3 text-sm scrollbar-hide outline-none"
                                    rows={1}
                                    disabled={isSending}
                                />
                                <button
                                    className={cn(
                                        "p-2 rounded-lg mb-0.5 transition-colors flex-shrink-0",
                                        input.trim() && !isSending
                                            ? "bg-chat text-white hover:bg-chat-dark"
                                            : "bg-muted text-muted-foreground cursor-not-allowed",
                                    )}
                                    disabled={!input.trim() || isSending}
                                    onClick={handleSendMessage}
                                >
                                    {isSending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                            <p className="text-center text-xs text-muted-foreground mt-3">
                                Current mode:{" "}
                                <span className="font-medium text-foreground">
                                    Timeline
                                </span>{" "}
                                •{" "}
                                {isConfigured
                                    ? "Conversations are saved to Supabase"
                                    : "Demo mode - data not persisted"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </AppShell>
    );
}
