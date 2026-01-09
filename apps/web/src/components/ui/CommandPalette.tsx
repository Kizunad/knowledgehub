"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    Search,
    Home,
    BookOpen,
    Code,
    MessageSquare,
    Lightbulb,
    FileText,
    ArrowRight,
    CornerDownLeft,
    Loader2,
    AlertCircle,
} from "lucide-react";
import { useSearch } from "@/hooks";
import { cn } from "@/lib/utils";

// Types
interface CommandItem {
    id: string;
    type: "navigation" | "file" | "idea" | "chat" | "action";
    title: string;
    subtitle?: string;
    icon: React.ReactNode;
    iconColor?: string;
    onSelect: () => void;
}

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
    const router = useRouter();
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    // Use the search hook
    const {
        query,
        results: searchResults,
        isLoading,
        hasSearched,
        error,
        isConfigured,
        handleQueryChange,
        clearQuery,
    } = useSearch({ debounceMs: 300, minQueryLength: 2 });

    // Navigation commands
    const navigationCommands: CommandItem[] = [
        {
            id: "nav-home",
            type: "navigation",
            title: "Home",
            subtitle: "返回首页",
            icon: <Home className="h-4 w-4" />,
            onSelect: () => {
                router.push("/");
                onClose();
            },
        },
        {
            id: "nav-study",
            type: "navigation",
            title: "Study",
            subtitle: "学习空间",
            icon: <BookOpen className="h-4 w-4 text-study" />,
            iconColor: "text-study",
            onSelect: () => {
                router.push("/study");
                onClose();
            },
        },
        {
            id: "nav-code",
            type: "navigation",
            title: "Code",
            subtitle: "代码项目",
            icon: <Code className="h-4 w-4 text-code" />,
            iconColor: "text-code",
            onSelect: () => {
                router.push("/code");
                onClose();
            },
        },
        {
            id: "nav-chat",
            type: "navigation",
            title: "ChatLog",
            subtitle: "对话记录",
            icon: <MessageSquare className="h-4 w-4 text-chat" />,
            iconColor: "text-chat",
            onSelect: () => {
                router.push("/chat");
                onClose();
            },
        },
        {
            id: "nav-ideas",
            type: "navigation",
            title: "Ideas",
            subtitle: "灵感记录",
            icon: <Lightbulb className="h-4 w-4 text-ideas" />,
            iconColor: "text-ideas",
            onSelect: () => {
                router.push("/ideas");
                onClose();
            },
        },
    ];

    // Mock recent items (fallback when Supabase is not configured)
    const recentItems: CommandItem[] = [
        {
            id: "recent-1",
            type: "file",
            title: "React 18 Concurrency",
            subtitle: "study/react",
            icon: <FileText className="h-4 w-4" />,
            onSelect: () => {
                router.push("/study/react-concurrency");
                onClose();
            },
        },
        {
            id: "recent-2",
            type: "idea",
            title: "研究 Zustand 的 persist 中间件",
            subtitle: "#tech",
            icon: <Lightbulb className="h-4 w-4 text-ideas" />,
            onSelect: () => {
                router.push("/ideas");
                onClose();
            },
        },
        {
            id: "recent-3",
            type: "chat",
            title: "Hub 项目初始化讨论",
            subtitle: "2024-01-15",
            icon: <MessageSquare className="h-4 w-4 text-chat" />,
            onSelect: () => {
                router.push("/chat");
                onClose();
            },
        },
    ];

    // Convert search results to command items
    const searchResultCommands: CommandItem[] = searchResults.map((result) => {
        const getIcon = () => {
            switch (result.result_type) {
                case "file":
                    return <FileText className="h-4 w-4 text-code" />;
                case "chat":
                    return <MessageSquare className="h-4 w-4 text-chat" />;
                case "idea":
                    return <Lightbulb className="h-4 w-4 text-ideas" />;
                default:
                    return <FileText className="h-4 w-4" />;
            }
        };

        const getPath = () => {
            switch (result.result_type) {
                case "file":
                    return result.path || "/code";
                case "chat":
                    return `/chat?id=${result.id}`;
                case "idea":
                    return `/ideas?id=${result.id}`;
                default:
                    return "/";
            }
        };

        return {
            id: `search-${result.id}`,
            type: result.result_type as CommandItem["type"],
            title: result.title,
            subtitle: result.snippet || result.path || undefined,
            icon: getIcon(),
            onSelect: () => {
                router.push(getPath());
                onClose();
            },
        };
    });

    // Determine which commands to show
    const getDisplayCommands = useCallback((): CommandItem[] => {
        // If user has typed a query
        if (query.trim().length > 0) {
            // If we have search results from API, show them
            if (searchResultCommands.length > 0) {
                return searchResultCommands;
            }

            // Filter navigation commands based on query
            const lowerQuery = query.toLowerCase();
            const filteredNav = navigationCommands.filter(
                (cmd) =>
                    cmd.title.toLowerCase().includes(lowerQuery) ||
                    cmd.subtitle?.toLowerCase().includes(lowerQuery),
            );

            // If API search is configured but still loading or no results, show filtered nav
            if (isConfigured && (isLoading || hasSearched)) {
                return filteredNav;
            }

            // Fallback: filter all local items
            const filteredRecent = recentItems.filter(
                (cmd) =>
                    cmd.title.toLowerCase().includes(lowerQuery) ||
                    cmd.subtitle?.toLowerCase().includes(lowerQuery),
            );

            return [...filteredNav, ...filteredRecent];
        }

        // No query: show navigation + recent items
        return [...navigationCommands, ...recentItems];
    }, [
        query,
        searchResultCommands,
        navigationCommands,
        recentItems,
        isConfigured,
        isLoading,
        hasSearched,
    ]);

    const commands = getDisplayCommands();

    // Reset selected index when query changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
            clearQuery();
            setSelectedIndex(0);
        }
    }, [isOpen, clearQuery]);

    // Keyboard navigation
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    setSelectedIndex((prev) =>
                        prev < commands.length - 1 ? prev + 1 : prev,
                    );
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
                    break;
                case "Enter":
                    e.preventDefault();
                    if (commands[selectedIndex]) {
                        commands[selectedIndex].onSelect();
                    }
                    break;
                case "Escape":
                    e.preventDefault();
                    onClose();
                    break;
            }
        },
        [commands, selectedIndex, onClose],
    );

    // Scroll selected item into view
    useEffect(() => {
        if (resultsRef.current) {
            const selectedElement = resultsRef.current.querySelector(
                `[data-index="${selectedIndex}"]`,
            );
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: "nearest" });
            }
        }
    }, [selectedIndex]);

    // Global keyboard shortcut
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                if (isOpen) {
                    onClose();
                }
            }
        };

        document.addEventListener("keydown", handleGlobalKeyDown);
        return () =>
            document.removeEventListener("keydown", handleGlobalKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // Determine section labels
    const showSearchResults =
        query.trim().length > 0 && searchResultCommands.length > 0;
    const showNavSection = !query.trim();
    const showRecentSection =
        !query.trim() && navigationCommands.length < commands.length;
    const showEmptyState =
        query.trim().length >= 2 &&
        hasSearched &&
        commands.length === 0 &&
        !isLoading;

    return (
        <div className="search-modal-overlay" onClick={onClose}>
            <div
                className="search-modal"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={handleKeyDown}
            >
                {/* Search Input */}
                <div className="search-input-wrapper">
                    {isLoading ? (
                        <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                    ) : (
                        <Search className="h-5 w-5 text-muted-foreground" />
                    )}
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => handleQueryChange(e.target.value)}
                        placeholder="搜索命令、文件、想法..."
                        className="search-input"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                    />
                    <kbd className="search-kbd">ESC</kbd>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="px-4 py-2 flex items-center gap-2 text-sm text-red-500 bg-red-500/10 border-b border-border">
                        <AlertCircle className="h-4 w-4" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Results */}
                <div className="search-results" ref={resultsRef}>
                    {showEmptyState ? (
                        <div className="p-8 text-center text-muted-foreground">
                            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>没有找到匹配的结果</p>
                            <p className="text-sm mt-1">试试其他关键词</p>
                        </div>
                    ) : (
                        <>
                            {/* Search Results Section */}
                            {showSearchResults && (
                                <div className="px-3 py-2">
                                    <p className="text-xs font-medium text-muted-foreground px-2">
                                        搜索结果
                                    </p>
                                </div>
                            )}

                            {/* Navigation Section */}
                            {showNavSection && (
                                <div className="px-3 py-2">
                                    <p className="text-xs font-medium text-muted-foreground px-2">
                                        导航
                                    </p>
                                </div>
                            )}

                            {commands.map((cmd, index) => {
                                // Insert "Recent" header at the right position
                                const showRecentHeader =
                                    showRecentSection &&
                                    index === navigationCommands.length;

                                return (
                                    <div key={cmd.id}>
                                        {showRecentHeader && (
                                            <div className="px-3 py-2 mt-2 border-t border-border">
                                                <p className="text-xs font-medium text-muted-foreground px-2 pt-2">
                                                    最近访问
                                                </p>
                                            </div>
                                        )}
                                        <div
                                            data-index={index}
                                            className={cn(
                                                "search-result-item",
                                                selectedIndex === index &&
                                                    "selected",
                                            )}
                                            onClick={() => cmd.onSelect()}
                                            onMouseEnter={() =>
                                                setSelectedIndex(index)
                                            }
                                        >
                                            <div
                                                className={cn(
                                                    "search-result-icon",
                                                    cmd.iconColor,
                                                )}
                                            >
                                                {cmd.icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">
                                                    {cmd.title}
                                                </p>
                                                {cmd.subtitle && (
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {cmd.subtitle}
                                                    </p>
                                                )}
                                            </div>
                                            {selectedIndex === index && (
                                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Loading indicator for search */}
                            {isLoading && query.trim().length >= 2 && (
                                <div className="px-4 py-3 text-center text-muted-foreground text-sm">
                                    <Loader2 className="h-4 w-4 mx-auto mb-1 animate-spin" />
                                    正在搜索...
                                </div>
                            )}

                            {/* Supabase not configured hint */}
                            {!isConfigured && query.trim().length >= 2 && (
                                <div className="px-4 py-2 text-center text-xs text-muted-foreground/50 border-t border-border">
                                    全局搜索需要配置 Supabase
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="search-footer">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                            <kbd className="search-kbd">↑</kbd>
                            <kbd className="search-kbd">↓</kbd>
                            <span className="ml-1">导航</span>
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="search-kbd">
                                <CornerDownLeft className="h-2.5 w-2.5" />
                            </kbd>
                            <span className="ml-1">选择</span>
                        </span>
                    </div>
                    <span className="flex items-center gap-1">
                        <kbd className="search-kbd">ESC</kbd>
                        <span className="ml-1">关闭</span>
                    </span>
                </div>
            </div>
        </div>
    );
}

// Hook for using command palette
export function useCommandPalette() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setIsOpen((prev) => !prev);
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    return {
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        toggle: () => setIsOpen((prev) => !prev),
    };
}
