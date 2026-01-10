"use client";

import { useState, useCallback } from "react";
import {
    BookOpen,
    Code,
    Lightbulb,
    Plus,
    Clock,
    Pin,
    ArrowRight,
    Sparkles,
    Loader2,
    AlertCircle,
    Github,
    Terminal,
    Link2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useIdeas, useSources } from "@/hooks";
import {
    type Idea,
    type DirectorySource,
    type DirectorySourceMode,
} from "@/store";
import { cn } from "@/lib/utils";

// Helper to format relative time
function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "刚刚";
    if (diffMins < 60) return `${diffMins} 分钟前`;
    if (diffHours < 24) return `${diffHours} 小时前`;
    if (diffDays === 1) return "昨天";
    if (diffDays < 7) return `${diffDays} 天前`;
    return date.toLocaleDateString();
}

// Mock Ideas for fallback
const mockIdeas: Idea[] = [
    {
        id: "1",
        content: "研究 Zustand 的 persist 中间件",
        status: "inbox",
        done: false,
        tags: ["tech"],
        refs: null,
        source_ref: null,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: "2",
        content: "写一个 CLI 工具用于本地同步",
        status: "inbox",
        done: false,
        tags: ["hub", "feature"],
        refs: null,
        source_ref: null,
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: "3",
        content: "看看 pgvector 怎么集成",
        status: "inbox",
        done: true,
        tags: ["search"],
        refs: null,
        source_ref: null,
        created_at: new Date(
            Date.now() - 3 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        updated_at: new Date(
            Date.now() - 3 * 24 * 60 * 60 * 1000,
        ).toISOString(),
    },
    {
        id: "4",
        content: "设计 ChatLog 的数据结构",
        status: "inbox",
        done: false,
        tags: ["design"],
        refs: null,
        source_ref: null,
        created_at: new Date(
            Date.now() - 5 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        updated_at: new Date(
            Date.now() - 5 * 24 * 60 * 60 * 1000,
        ).toISOString(),
    },
    {
        id: "5",
        content: "KISS 原则要贯彻到底",
        status: "inbox",
        done: false,
        tags: null,
        refs: null,
        source_ref: null,
        created_at: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        updated_at: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
    },
];

// Mock Sources for fallback
const mockSources: DirectorySource[] = [
    {
        id: "1",
        name: "hub",
        mode: "local_sync",
        source_type: "code",
        path: "~/Code/webProj/hub",
        branch: "main",
        description: "Personal knowledge hub",
        synced_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: "2",
        name: "dotfiles",
        mode: "github",
        source_type: "code",
        path: "username/dotfiles",
        branch: "main",
        description: "System configuration",
        synced_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        updated_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: "3",
        name: "blog",
        mode: "github",
        source_type: "code",
        path: "username/blog",
        branch: "main",
        description: "Personal blog",
        synced_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(
            Date.now() - 60 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        updated_at: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
    },
];

// Get icon for source mode
function getModeIcon(mode: DirectorySourceMode, className?: string) {
    switch (mode) {
        case "github":
            return <Github className={className} />;
        case "link":
            return <Link2 className={className} />;
        case "local_sync":
        default:
            return <Terminal className={className} />;
    }
}

// Quick Capture Component
interface QuickCaptureProps {
    onCapture: (content: string) => Promise<{ success: boolean }>;
    isCreating: boolean;
    isConfigured: boolean;
}

function QuickCapture({
    onCapture,
    isCreating,
    isConfigured,
}: QuickCaptureProps) {
    const [input, setInput] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isCreating) {
            const result = await onCapture(input.trim());
            if (result.success) {
                setInput("");
            }
        }
    };

    return (
        <div className="hub-card">
            <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-ideas" />
                <h2 className="text-lg font-semibold">Quick Capture</h2>
                {!isConfigured && (
                    <span className="text-xs text-yellow-500">(Demo Mode)</span>
                )}
            </div>
            <form className="flex gap-2" onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="记录一个想法... 按 Enter 保存到 Inbox"
                    className="quick-capture-input flex-1"
                    autoComplete="off"
                    disabled={isCreating}
                />
                <button
                    type="submit"
                    disabled={isCreating || !input.trim()}
                    className="inline-flex items-center justify-center rounded-lg bg-ideas px-4 py-2 text-white font-medium hover:bg-ideas-dark transition-colors disabled:opacity-50"
                >
                    {isCreating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Plus className="h-4 w-4" />
                    )}
                </button>
            </form>
        </div>
    );
}

// Ideas Inbox Preview
interface IdeasInboxProps {
    ideas: Idea[];
    onToggleDone: (id: string) => void;
    isLoading: boolean;
    error: string | null;
}

function IdeasInbox({
    ideas,
    onToggleDone,
    isLoading,
    error,
}: IdeasInboxProps) {
    // Only show inbox ideas, limit to 5
    const inboxIdeas = ideas.filter((i) => i.status === "inbox").slice(0, 5);

    return (
        <div className="hub-card">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-ideas" />
                    <h2 className="text-lg font-semibold">Ideas Inbox</h2>
                </div>
                <a
                    href="/ideas"
                    className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                    查看全部 <ArrowRight className="h-3 w-3" />
                </a>
            </div>

            {error && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 text-red-500 text-sm mb-3">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                </div>
            )}

            {isLoading && ideas.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    <span>加载中...</span>
                </div>
            ) : inboxIdeas.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                    <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Inbox 是空的</p>
                </div>
            ) : (
                <ul className="space-y-2">
                    {inboxIdeas.map((idea) => (
                        <li
                            key={idea.id}
                            className="flex items-start gap-3 py-1.5 group"
                        >
                            <input
                                type="checkbox"
                                checked={idea.done}
                                onChange={() => onToggleDone(idea.id)}
                                className="idea-checkbox mt-0.5"
                            />
                            <span
                                className={cn(
                                    "flex-1 text-sm",
                                    idea.done &&
                                        "line-through text-muted-foreground",
                                )}
                            >
                                {idea.content}
                            </span>
                            {idea.tags && idea.tags.length > 0 && (
                                <div className="flex gap-1 flex-wrap">
                                    {idea.tags.map((tag) => (
                                        <span key={tag} className="idea-tag">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

// Recent Section Component
interface RecentItem {
    id: string;
    name: string;
    path?: string;
    time: string;
}

function RecentSection({
    title,
    icon: Icon,
    iconColor,
    items,
    viewAllHref,
    baseHref,
    isLoading,
}: {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    iconColor: string;
    items: RecentItem[];
    viewAllHref: string;
    baseHref: string;
    isLoading?: boolean;
}) {
    return (
        <div className="hub-card">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${iconColor}`} />
                    <h2 className="text-lg font-semibold">{title}</h2>
                </div>
                <a
                    href={viewAllHref}
                    className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                    查看全部 <ArrowRight className="h-3 w-3" />
                </a>
            </div>

            {isLoading && items.length === 0 ? (
                <div className="flex items-center justify-center py-6 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                </div>
            ) : items.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                    暂无数据
                </div>
            ) : (
                <ul className="space-y-2">
                    {items.map((item) => (
                        <li key={item.id}>
                            <a
                                href={`${baseHref}/${item.id}`}
                                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent transition-colors group"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium group-hover:text-primary transition-colors truncate">
                                            {item.name}
                                        </p>
                                        {item.path && (
                                            <p className="text-xs text-muted-foreground truncate">
                                                {item.path}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                    {item.time}
                                </span>
                            </a>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

// Pinned Projects Component
interface PinnedProjectsProps {
    sources: DirectorySource[];
    isLoading: boolean;
}

function PinnedProjects({ sources, isLoading }: PinnedProjectsProps) {
    // Get first 4 projects as pinned
    const pinnedSources = sources.slice(0, 4);

    return (
        <div className="hub-card">
            <div className="flex items-center gap-2 mb-4">
                <Pin className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Pinned Projects</h2>
            </div>

            {isLoading && sources.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                </div>
            ) : pinnedSources.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    <Code className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">没有固定的项目</p>
                    <a
                        href="/code"
                        className="text-sm text-primary hover:underline mt-1 inline-block"
                    >
                        添加项目
                    </a>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
                    {pinnedSources.map((source) => (
                        <a
                            key={source.id}
                            href="/code"
                            className="flex flex-col items-center justify-center p-4 rounded-lg border border-border hover:border-primary hover:bg-accent transition-colors group"
                        >
                            <div className="mb-2 group-hover:scale-110 transition-transform">
                                {getModeIcon(
                                    source.mode,
                                    "h-6 w-6 md:h-8 md:w-8 text-code",
                                )}
                            </div>
                            <span className="text-sm font-medium text-center truncate max-w-full">
                                {source.name}
                            </span>
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}

// Main Home Page
export default function HomePage() {
    const [localIdeas, setLocalIdeas] = useState<Idea[]>(mockIdeas);
    const [localSources] = useState<DirectorySource[]>(mockSources);

    // Use Ideas hook
    const {
        ideas: apiIdeas,
        isLoading: ideasLoading,
        isCreating: ideasCreating,
        error: ideasError,
        isConfigured: ideasConfigured,
        createIdea,
        toggleDone,
    } = useIdeas({ autoFetch: true });

    // Use Sources hook
    const {
        sources: apiSources,
        isLoading: sourcesLoading,
        isConfigured: sourcesConfigured,
    } = useSources({
        autoFetch: true,
        initialFilter: { source_type: "code" },
        useLocalState: true,
    });

    // Use API data if configured, otherwise use mock data
    const ideas = ideasConfigured ? apiIdeas : localIdeas;
    const sources = sourcesConfigured ? apiSources : localSources;
    const isConfigured = ideasConfigured || sourcesConfigured;

    // Handle quick capture
    const handleQuickCapture = useCallback(
        async (content: string) => {
            if (ideasConfigured) {
                return await createIdea({ content, status: "inbox" });
            } else {
                // Local mock mode
                const newIdea: Idea = {
                    id: Date.now().toString(),
                    content,
                    status: "inbox",
                    done: false,
                    tags: parseTagsFromContent(content),
                    refs: null,
                    source_ref: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };
                setLocalIdeas([newIdea, ...localIdeas]);
                return { success: true };
            }
        },
        [ideasConfigured, createIdea, localIdeas],
    );

    // Handle toggle done
    const handleToggleDone = useCallback(
        async (id: string) => {
            if (ideasConfigured) {
                await toggleDone(id);
            } else {
                setLocalIdeas(
                    localIdeas.map((idea) =>
                        idea.id === id ? { ...idea, done: !idea.done } : idea,
                    ),
                );
            }
        },
        [ideasConfigured, toggleDone, localIdeas],
    );

    // Transform sources to recent items format
    const codeRecents: RecentItem[] = sources.slice(0, 3).map((source) => ({
        id: source.id,
        name: source.name,
        path: source.path,
        time: formatRelativeTime(source.updated_at),
    }));

    // Filter study spaces (local_sync mode) and transform to recent items
    const studyRecents: RecentItem[] = sources
        .filter((source) => source.mode === "local_sync")
        .slice(0, 3)
        .map((source) => ({
            id: source.id,
            name: source.name,
            path: source.path,
            time: formatRelativeTime(source.updated_at),
        }));

    return (
        <AppShell>
            <div className="max-w-5xl mx-auto space-y-6 md:space-y-8">
                {/* Welcome Header */}
                <div className="mb-6">
                    <h1 className="text-2xl md:text-3xl font-bold">
                        Welcome back
                    </h1>
                    <p className="text-sm md:text-base text-muted-foreground mt-1">
                        你的个人知识中心
                        {!isConfigured && (
                            <span className="ml-2 text-yellow-500">
                                (Demo Mode)
                            </span>
                        )}
                    </p>
                </div>

                {/* Quick Capture */}
                <QuickCapture
                    onCapture={handleQuickCapture}
                    isCreating={ideasCreating}
                    isConfigured={ideasConfigured}
                />

                {/* Ideas Inbox */}
                <IdeasInbox
                    ideas={ideas}
                    onToggleDone={handleToggleDone}
                    isLoading={ideasLoading}
                    error={ideasError}
                />

                {/* Recents Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                    <RecentSection
                        title="Study Recents"
                        icon={BookOpen}
                        iconColor="text-study"
                        items={studyRecents}
                        viewAllHref="/study"
                        baseHref="/study"
                    />
                    <RecentSection
                        title="Code Recents"
                        icon={Code}
                        iconColor="text-code"
                        items={codeRecents}
                        viewAllHref="/code"
                        baseHref="/code"
                        isLoading={sourcesLoading}
                    />
                </div>

                {/* Pinned Projects */}
                <PinnedProjects sources={sources} isLoading={sourcesLoading} />
            </div>
        </AppShell>
    );
}

// Helper: Parse #tags from content
function parseTagsFromContent(content: string): string[] | null {
    const tagRegex = /#[\w\u4e00-\u9fa5]+/g;
    const matches = content.match(tagRegex);
    if (!matches) return null;
    const tags = [...new Set(matches.map((t) => t.slice(1)))];
    return tags.length > 0 ? tags : null;
}
