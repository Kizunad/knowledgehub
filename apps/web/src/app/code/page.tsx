"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import {
    Code,
    Terminal,
    Github,
    Pin,
    Search,
    Plus,
    MoreHorizontal,
    GitBranch,
    ArrowUpRight,
    Loader2,
    AlertCircle,
    RefreshCw,
    Link2,
    Trash2,
    Edit,
    ExternalLink,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSources } from "@/hooks";
import { type DirectorySource, type DirectorySourceMode } from "@/store";

// Mock Data for fallback when Supabase is not configured
const mockPinnedProjects: DirectorySource[] = [
    {
        id: "1",
        name: "hub",
        mode: "local_sync",
        source_type: "code",
        path: "~/Code/webProj/hub",
        branch: "main",
        description: "Personal knowledge hub monorepo",
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
        description: "System configuration and scripts",
        synced_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        updated_at: new Date(
            Date.now() - 2 * 24 * 60 * 60 * 1000,
        ).toISOString(),
    },
];

const mockAllProjects: DirectorySource[] = [
    {
        id: "3",
        name: "blog-v3",
        mode: "local_sync",
        source_type: "code",
        path: "~/Code/personal/blog",
        branch: "main",
        description: "Personal blog built with Next.js",
        synced_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(
            Date.now() - 60 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        updated_at: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
    },
    {
        id: "4",
        name: "rust-cli-utils",
        mode: "local_sync",
        source_type: "code",
        path: "~/Code/playground/rust-cli",
        branch: "dev",
        description: "CLI utilities written in Rust",
        synced_at: new Date(
            Date.now() - 21 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        created_at: new Date(
            Date.now() - 90 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        updated_at: new Date(
            Date.now() - 21 * 24 * 60 * 60 * 1000,
        ).toISOString(),
    },
    {
        id: "5",
        name: "shadcn-ui",
        mode: "github",
        source_type: "code",
        path: "shadcn-ui/ui",
        branch: "main",
        description: "Beautifully designed components",
        synced_at: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        created_at: new Date(
            Date.now() - 120 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        updated_at: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
    },
    {
        id: "6",
        name: "obsidian-plugin",
        mode: "link",
        source_type: "code",
        path: "https://github.com/denolehov/obsidian-git",
        branch: null,
        description: "Obsidian Git integration plugin",
        synced_at: null,
        created_at: new Date(
            Date.now() - 180 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        updated_at: new Date(
            Date.now() - 60 * 24 * 60 * 60 * 1000,
        ).toISOString(),
    },
];

// Helper to format relative time
function formatRelativeTime(dateString: string | null): string {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffWeeks === 1) return "1 week ago";
    if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
    if (diffMonths === 1) return "1 month ago";
    if (diffMonths < 12) return `${diffMonths} months ago`;
    return date.toLocaleDateString();
}

// Get icon for source mode
function getModeIcon(mode: DirectorySourceMode) {
    switch (mode) {
        case "github":
            return <Github className="h-5 w-5 md:h-6 md:w-6" />;
        case "link":
            return <Link2 className="h-5 w-5 md:h-6 md:w-6" />;
        case "local_sync":
        default:
            return <Terminal className="h-5 w-5 md:h-6 md:w-6" />;
    }
}

// Get language color based on path/name heuristics
function getLanguageInfo(source: DirectorySource): {
    name: string;
    color: string;
} {
    const path = source.path.toLowerCase();
    const name = source.name.toLowerCase();

    if (path.includes("rust") || name.includes("rust")) {
        return { name: "Rust", color: "bg-orange-400" };
    }
    if (
        path.includes("next") ||
        name.includes("next") ||
        path.includes("typescript") ||
        name.includes("ts")
    ) {
        return { name: "TypeScript", color: "bg-blue-400" };
    }
    if (path.includes("react") || name.includes("react")) {
        return { name: "TypeScript", color: "bg-blue-400" };
    }
    if (path.includes("python") || name.includes("py")) {
        return { name: "Python", color: "bg-yellow-500" };
    }
    if (path.includes("go") || name.includes("golang")) {
        return { name: "Go", color: "bg-cyan-400" };
    }
    if (
        path.includes("shell") ||
        name.includes("dotfile") ||
        name.includes("config")
    ) {
        return { name: "Shell", color: "bg-green-400" };
    }
    if (
        path.includes("lua") ||
        name.includes("nvim") ||
        name.includes("neovim")
    ) {
        return { name: "Lua", color: "bg-indigo-400" };
    }
    if (path.includes("javascript") || name.includes("js")) {
        return { name: "JavaScript", color: "bg-yellow-400" };
    }
    return { name: "Unknown", color: "bg-gray-400" };
}

// Context menu component
interface SourceContextMenuProps {
    source: DirectorySource;
    onDelete: (id: string) => void;
    onSync: (id: string) => void;
    isDeleting: boolean;
    isSyncing: boolean;
}

function SourceContextMenu({
    source,
    onDelete,
    onSync,
    isDeleting,
    isSyncing,
}: SourceContextMenuProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="p-1 hover:bg-background rounded text-muted-foreground hover:text-foreground transition-all"
            >
                <MoreHorizontal className="h-4 w-4" />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 z-50 w-40 rounded-lg border border-border bg-card shadow-lg py-1">
                        {source.mode === "local_sync" && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSync(source.id);
                                    setIsOpen(false);
                                }}
                                disabled={isSyncing}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent transition-colors disabled:opacity-50"
                            >
                                {isSyncing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="h-4 w-4" />
                                )}
                                Sync Now
                            </button>
                        )}
                        {source.mode === "github" && (
                            <a
                                href={`https://github.com/${source.path}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent transition-colors"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <ExternalLink className="h-4 w-4" />
                                View on GitHub
                            </a>
                        )}
                        {source.mode === "link" && (
                            <a
                                href={source.path}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent transition-colors"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <ExternalLink className="h-4 w-4" />
                                Open Link
                            </a>
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent transition-colors"
                        >
                            <Edit className="h-4 w-4" />
                            Edit
                        </button>
                        <div className="border-t border-border my-1" />
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(source.id);
                                setIsOpen(false);
                            }}
                            disabled={isDeleting}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        >
                            {isDeleting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Trash2 className="h-4 w-4" />
                            )}
                            Delete
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

// Add Project Modal
interface AddProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (input: {
        name: string;
        mode: DirectorySourceMode;
        path: string;
        branch?: string;
        description?: string;
    }) => Promise<{ success: boolean }>;
    isCreating: boolean;
}

function AddProjectModal({
    isOpen,
    onClose,
    onCreate,
    isCreating,
}: AddProjectModalProps) {
    const [name, setName] = useState("");
    const [mode, setMode] = useState<DirectorySourceMode>("local_sync");
    const [path, setPath] = useState("");
    const [branch, setBranch] = useState("");
    const [description, setDescription] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const result = await onCreate({
            name: name.trim(),
            mode,
            path: path.trim(),
            branch: branch.trim() || undefined,
            description: description.trim() || undefined,
        });
        if (result.success) {
            setName("");
            setPath("");
            setBranch("");
            setDescription("");
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold">Add Project</h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-accent rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1.5">
                            Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="my-project"
                            required
                            className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:border-code focus:ring-1 focus:ring-code/20 outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1.5">
                            Source Type
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {(
                                [
                                    {
                                        value: "local_sync",
                                        label: "Local",
                                        icon: Terminal,
                                    },
                                    {
                                        value: "github",
                                        label: "GitHub",
                                        icon: Github,
                                    },
                                    {
                                        value: "link",
                                        label: "Link",
                                        icon: Link2,
                                    },
                                ] as const
                            ).map(({ value, label, icon: Icon }) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setMode(value)}
                                    className={cn(
                                        "flex flex-col items-center gap-1 p-3 rounded-lg border transition-all",
                                        mode === value
                                            ? "border-code bg-code/10 text-code"
                                            : "border-border hover:bg-accent",
                                    )}
                                >
                                    <Icon className="h-5 w-5" />
                                    <span className="text-xs">{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1.5">
                            {mode === "github"
                                ? "Repository (owner/repo)"
                                : mode === "link"
                                  ? "URL"
                                  : "Path"}
                        </label>
                        <input
                            type="text"
                            value={path}
                            onChange={(e) => setPath(e.target.value)}
                            placeholder={
                                mode === "github"
                                    ? "username/repo"
                                    : mode === "link"
                                      ? "https://github.com/..."
                                      : "~/Code/my-project"
                            }
                            required
                            className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm font-mono focus:border-code focus:ring-1 focus:ring-code/20 outline-none transition-all"
                        />
                    </div>

                    {mode !== "link" && (
                        <div>
                            <label className="block text-sm font-medium mb-1.5">
                                Branch (optional)
                            </label>
                            <input
                                type="text"
                                value={branch}
                                onChange={(e) => setBranch(e.target.value)}
                                placeholder="main"
                                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:border-code focus:ring-1 focus:ring-code/20 outline-none transition-all"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium mb-1.5">
                            Description (optional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief description of this project"
                            rows={2}
                            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:border-code focus:ring-1 focus:ring-code/20 outline-none transition-all resize-none"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 h-10 rounded-lg border border-border hover:bg-accent transition-colors text-sm font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={
                                isCreating || !name.trim() || !path.trim()
                            }
                            className="flex-1 h-10 rounded-lg bg-code text-white hover:bg-code-dark transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isCreating && (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            )}
                            Add Project
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function CodePage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<"updated" | "name">("updated");
    const [showAddModal, setShowAddModal] = useState(false);
    const [localSources, setLocalSources] = useState<DirectorySource[]>([
        ...mockPinnedProjects,
        ...mockAllProjects,
    ]);

    // Use the sources hook
    const {
        sources: apiSources,
        isLoading,
        isCreating,
        isDeleting,
        isSyncing,
        error,
        isConfigured,
        createSource,
        deleteSource,
        syncSource,
        refresh,
    } = useSources({
        autoFetch: true,
        initialFilter: { source_type: "code" },
        useLocalState: true,
    });

    // Use API sources if configured, otherwise use local mock data
    const sources = isConfigured ? apiSources : localSources;

    // Separate pinned (first 2 most recent local_sync) and all projects
    const pinnedProjects = sources
        .filter((s) => s.mode === "local_sync" || s.mode === "github")
        .slice(0, 2);

    const allProjects = sources.filter(
        (s) => !pinnedProjects.find((p) => p.id === s.id),
    );

    // Filter and sort projects
    const filteredProjects = allProjects.filter((source) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            source.name.toLowerCase().includes(query) ||
            source.path.toLowerCase().includes(query) ||
            source.description?.toLowerCase().includes(query)
        );
    });

    const sortedProjects = [...filteredProjects].sort((a, b) => {
        if (sortBy === "name") {
            return a.name.localeCompare(b.name);
        }
        return (
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
    });

    // Handle create source
    const handleCreate = useCallback(
        async (input: {
            name: string;
            mode: DirectorySourceMode;
            path: string;
            branch?: string;
            description?: string;
        }) => {
            if (isConfigured) {
                return await createSource({ ...input, source_type: "code" });
            } else {
                // Local mock mode
                const newSource: DirectorySource = {
                    id: Date.now().toString(),
                    name: input.name,
                    mode: input.mode,
                    source_type: "code",
                    path: input.path,
                    branch: input.branch || null,
                    description: input.description || null,
                    synced_at: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };
                setLocalSources([newSource, ...localSources]);
                return { success: true };
            }
        },
        [isConfigured, createSource, localSources],
    );

    // Handle delete source
    const handleDelete = useCallback(
        async (id: string) => {
            if (isConfigured) {
                await deleteSource(id);
            } else {
                setLocalSources(localSources.filter((s) => s.id !== id));
            }
        },
        [isConfigured, deleteSource, localSources],
    );

    // Handle sync source
    const handleSync = useCallback(
        async (id: string) => {
            if (isConfigured) {
                await syncSource(id);
            } else {
                // Mock sync - update synced_at
                setLocalSources(
                    localSources.map((s) =>
                        s.id === id
                            ? { ...s, synced_at: new Date().toISOString() }
                            : s,
                    ),
                );
            }
        },
        [isConfigured, syncSource, localSources],
    );

    return (
        <AppShell>
            <div className="max-w-7xl mx-auto space-y-6 md:space-y-10">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-code/10 text-code">
                            <Code className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold">
                                Code
                            </h1>
                            <p className="text-xs md:text-sm text-muted-foreground">
                                Projects & Repositories
                                {!isConfigured && (
                                    <span className="ml-2 text-yellow-500">
                                        (Demo Mode)
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        {isConfigured && (
                            <button
                                onClick={refresh}
                                disabled={isLoading}
                                className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                                title="Refresh"
                            >
                                <RefreshCw
                                    className={cn(
                                        "h-4 w-4",
                                        isLoading && "animate-spin",
                                    )}
                                />
                            </button>
                        )}
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search projects..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-9 w-full sm:w-64 rounded-md border border-input bg-background pl-9 pr-4 text-sm outline-none focus:border-code focus:ring-1 focus:ring-code/20 transition-all"
                            />
                        </div>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-code text-white hover:bg-code-dark transition-colors text-sm font-medium"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Add Project</span>
                        </button>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Loading State */}
                {isLoading && sources.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <Loader2 className="h-10 w-10 animate-spin mb-4 opacity-50" />
                        <p>Loading projects...</p>
                    </div>
                ) : (
                    <>
                        {/* Pinned Projects */}
                        {pinnedProjects.length > 0 && (
                            <section>
                                <div className="flex items-center gap-2 mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                    <Pin className="h-4 w-4" />
                                    Pinned Projects
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {pinnedProjects.map((project) => (
                                        <Link
                                            key={project.id}
                                            href={`/code/${project.id}`}
                                            className="group relative flex flex-col p-4 md:p-5 rounded-xl border border-border bg-card hover:border-code/50 transition-all duration-200"
                                        >
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="p-2 rounded-lg bg-secondary group-hover:bg-code/10 group-hover:text-code transition-colors flex-shrink-0">
                                                        {getModeIcon(
                                                            project.mode,
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="font-semibold text-base md:text-lg truncate">
                                                            {project.name}
                                                        </h3>
                                                        <p className="text-xs text-muted-foreground font-mono truncate">
                                                            {project.path}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                    <ArrowUpRight className="h-5 w-5" />
                                                </div>
                                            </div>

                                            <p className="text-sm text-muted-foreground mb-4 flex-1">
                                                {project.description ||
                                                    "No description"}
                                            </p>

                                            <div className="flex items-center justify-between pt-4 border-t border-border">
                                                <div className="flex gap-2 flex-wrap">
                                                    <span className="px-2 py-0.5 rounded-full bg-secondary text-xs font-medium text-muted-foreground">
                                                        {
                                                            getLanguageInfo(
                                                                project,
                                                            ).name
                                                        }
                                                    </span>
                                                    {project.branch && (
                                                        <span className="px-2 py-0.5 rounded-full bg-secondary text-xs font-medium text-muted-foreground flex items-center gap-1">
                                                            <GitBranch className="h-3 w-3" />
                                                            {project.branch}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-xs text-muted-foreground flex-shrink-0">
                                                    {formatRelativeTime(
                                                        project.updated_at,
                                                    )}
                                                </span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* All Projects */}
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                    <Terminal className="h-4 w-4" />
                                    All Projects ({sortedProjects.length})
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>Sort by:</span>
                                    <select
                                        value={sortBy}
                                        onChange={(e) =>
                                            setSortBy(
                                                e.target.value as
                                                    | "updated"
                                                    | "name",
                                            )
                                        }
                                        className="bg-transparent border-none outline-none font-medium text-foreground cursor-pointer"
                                    >
                                        <option value="updated">
                                            Last Active
                                        </option>
                                        <option value="name">Name</option>
                                    </select>
                                </div>
                            </div>

                            {sortedProjects.length === 0 ? (
                                <div className="p-8 md:p-12 text-center text-muted-foreground rounded-xl border border-border bg-card">
                                    <Terminal className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-4 opacity-20" />
                                    <p>
                                        {searchQuery
                                            ? `No projects matching "${searchQuery}"`
                                            : "No projects yet"}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* Desktop Table View */}
                                    <div className="hidden md:block rounded-xl border border-border bg-card overflow-visible">
                                        <div className="grid grid-cols-12 gap-4 p-4 border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground rounded-t-xl">
                                            <div className="col-span-4">
                                                Project Name
                                            </div>
                                            <div className="col-span-4">
                                                Path
                                            </div>
                                            <div className="col-span-2">
                                                Branch
                                            </div>
                                            <div className="col-span-2 text-right">
                                                Last Active
                                            </div>
                                        </div>
                                        <div className="divide-y divide-border">
                                            {sortedProjects.map((project) => {
                                                const langInfo =
                                                    getLanguageInfo(project);
                                                return (
                                                    <div
                                                        key={project.id}
                                                        className={cn(
                                                            "grid grid-cols-12 gap-4 p-4 items-center hover:bg-accent/50 transition-colors group cursor-pointer relative",
                                                            (isDeleting ||
                                                                isSyncing) &&
                                                                "opacity-50 pointer-events-none",
                                                        )}
                                                    >
                                                        <Link
                                                            href={`/code/${project.id}`}
                                                            className="absolute inset-0 z-0"
                                                            aria-label={`Browse ${project.name}`}
                                                        />
                                                        <div className="col-span-4 flex items-center gap-3 relative z-10">
                                                            <div
                                                                className={cn(
                                                                    "w-2 h-2 rounded-full flex-shrink-0",
                                                                    langInfo.color,
                                                                )}
                                                            />
                                                            <span className="font-medium group-hover:text-code transition-colors truncate">
                                                                {project.name}
                                                            </span>
                                                        </div>
                                                        <div className="col-span-4 text-sm text-muted-foreground font-mono truncate relative z-10">
                                                            {project.path}
                                                        </div>
                                                        <div className="col-span-2 flex items-center gap-1.5 text-sm text-muted-foreground relative z-10">
                                                            {project.branch ? (
                                                                <>
                                                                    <GitBranch className="h-3.5 w-3.5 flex-shrink-0" />
                                                                    <span className="truncate">
                                                                        {
                                                                            project.branch
                                                                        }
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <span className="text-muted-foreground/50">
                                                                    —
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="col-span-2 flex items-center justify-end gap-3 relative z-20">
                                                            <span className="text-sm text-muted-foreground">
                                                                {formatRelativeTime(
                                                                    project.updated_at,
                                                                )}
                                                            </span>
                                                            <div className="opacity-0 group-hover:opacity-100 transition-all">
                                                                <SourceContextMenu
                                                                    source={
                                                                        project
                                                                    }
                                                                    onDelete={
                                                                        handleDelete
                                                                    }
                                                                    onSync={
                                                                        handleSync
                                                                    }
                                                                    isDeleting={
                                                                        isDeleting
                                                                    }
                                                                    isSyncing={
                                                                        isSyncing
                                                                    }
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Mobile Card View */}
                                    <div className="md:hidden space-y-3">
                                        {sortedProjects.map((project) => {
                                            const langInfo =
                                                getLanguageInfo(project);
                                            return (
                                                <div
                                                    key={project.id}
                                                    className={cn(
                                                        "p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer relative",
                                                        (isDeleting ||
                                                            isSyncing) &&
                                                            "opacity-50 pointer-events-none",
                                                    )}
                                                >
                                                    <Link
                                                        href={`/code/${project.id}`}
                                                        className="absolute inset-0 z-0"
                                                        aria-label={`Browse ${project.name}`}
                                                    />
                                                    <div className="flex items-start justify-between mb-2 relative z-10">
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className={cn(
                                                                    "w-2 h-2 rounded-full flex-shrink-0",
                                                                    langInfo.color,
                                                                )}
                                                            />
                                                            <span className="font-medium">
                                                                {project.name}
                                                            </span>
                                                        </div>
                                                        <span className="text-xs text-muted-foreground">
                                                            {formatRelativeTime(
                                                                project.updated_at,
                                                            )}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground font-mono truncate mb-2 relative z-10">
                                                        {project.path}
                                                    </p>
                                                    <div className="flex items-center justify-between relative z-20">
                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            {project.branch ? (
                                                                <>
                                                                    <GitBranch className="h-3 w-3" />
                                                                    <span>
                                                                        {
                                                                            project.branch
                                                                        }
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <span className="text-muted-foreground/50">
                                                                    No branch
                                                                </span>
                                                            )}
                                                        </div>
                                                        <SourceContextMenu
                                                            source={project}
                                                            onDelete={
                                                                handleDelete
                                                            }
                                                            onSync={handleSync}
                                                            isDeleting={
                                                                isDeleting
                                                            }
                                                            isSyncing={
                                                                isSyncing
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </section>
                    </>
                )}
            </div>

            {/* Add Project Modal */}
            <AddProjectModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onCreate={handleCreate}
                isCreating={isCreating}
            />
        </AppShell>
    );
}
