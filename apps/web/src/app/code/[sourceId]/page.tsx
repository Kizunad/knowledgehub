"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    FileText,
    FileCode,
    FileImage,
    File,
    Folder,
    FolderOpen,
    Search,
    Grid3X3,
    List,
    GitBranch,
    MoreVertical,
    Trash2,
    Download,
    Clock,
    HardDrive,
    RefreshCw,
    ChevronRight,
    ChevronDown,
    ExternalLink,
    Github,
    Link as LinkIcon,
    HardDriveDownload,
    AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types
interface FileItem {
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

interface SourceInfo {
    id: string;
    name: string;
    mode: "github" | "link" | "local_sync";
    path: string;
    branch: string | null;
    description: string | null;
    synced_at: string | null;
    created_at: string;
}

interface TreeNode {
    name: string;
    path: string;
    type: "file" | "folder";
    file?: FileItem;
    children: TreeNode[];
}

// Helper functions
function formatFileSize(bytes: number | null): string {
    if (bytes === null || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

function getFileIcon(
    mimeType: string | null,
    fileName: string,
    className = "w-4 h-4",
) {
    if (mimeType?.startsWith("image/")) {
        return <FileImage className={cn(className, "text-purple-400")} />;
    }
    if (
        mimeType?.includes("javascript") ||
        mimeType?.includes("typescript") ||
        mimeType?.includes("json") ||
        fileName.match(
            /\.(js|ts|jsx|tsx|py|rb|go|rs|java|c|cpp|h|css|html|xml|yaml|yml|toml)$/,
        )
    ) {
        return <FileCode className={cn(className, "text-blue-400")} />;
    }
    if (
        mimeType?.startsWith("text/") ||
        fileName.match(/\.(txt|md|markdown)$/)
    ) {
        return <FileText className={cn(className, "text-green-400")} />;
    }
    return <File className={cn(className, "text-stone-400")} />;
}

function getModeIcon(mode: string) {
    switch (mode) {
        case "github":
            return <Github className="w-4 h-4 text-stone-400" />;
        case "link":
            return <LinkIcon className="w-4 h-4 text-stone-400" />;
        case "local_sync":
            return <HardDriveDownload className="w-4 h-4 text-stone-400" />;
        default:
            return <Folder className="w-4 h-4 text-stone-400" />;
    }
}

function getLanguageColor(fileName: string): string {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    const colors: Record<string, string> = {
        js: "bg-yellow-500",
        jsx: "bg-yellow-500",
        ts: "bg-blue-500",
        tsx: "bg-blue-500",
        py: "bg-green-500",
        rb: "bg-red-500",
        go: "bg-cyan-500",
        rs: "bg-orange-500",
        java: "bg-red-600",
        css: "bg-purple-500",
        html: "bg-orange-600",
        json: "bg-yellow-600",
        md: "bg-stone-500",
    };
    return colors[ext] || "bg-stone-600";
}

// Build file tree from flat file list
function buildFileTree(files: FileItem[]): TreeNode[] {
    const root: TreeNode[] = [];

    for (const file of files) {
        const parts = file.path.split("/").filter(Boolean);
        let currentLevel = root;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isFile = i === parts.length - 1;
            const currentPath = parts.slice(0, i + 1).join("/");

            let existing = currentLevel.find((n) => n.name === part);

            if (!existing) {
                existing = {
                    name: part,
                    path: currentPath,
                    type: isFile ? "file" : "folder",
                    file: isFile ? file : undefined,
                    children: [],
                };
                currentLevel.push(existing);
            }

            if (!isFile) {
                currentLevel = existing.children;
            }
        }
    }

    // Sort: folders first, then files, alphabetically
    const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
        return nodes
            .sort((a, b) => {
                if (a.type !== b.type) {
                    return a.type === "folder" ? -1 : 1;
                }
                return a.name.localeCompare(b.name);
            })
            .map((node) => ({
                ...node,
                children: sortNodes(node.children),
            }));
    };

    return sortNodes(root);
}

// Tree Node Component
function TreeNodeItem({
    node,
    sourceId,
    depth = 0,
    expandedPaths,
    toggleExpanded,
}: {
    node: TreeNode;
    sourceId: string;
    depth?: number;
    expandedPaths: Set<string>;
    toggleExpanded: (path: string) => void;
}) {
    const isExpanded = expandedPaths.has(node.path);
    const hasChildren = node.children.length > 0;

    if (node.type === "folder") {
        return (
            <div>
                <button
                    onClick={() => toggleExpanded(node.path)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-stone-800 rounded-md transition-colors group"
                    style={{ paddingLeft: `${depth * 16 + 8}px` }}
                >
                    <span className="text-stone-500">
                        {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                        ) : (
                            <ChevronRight className="w-4 h-4" />
                        )}
                    </span>
                    {isExpanded ? (
                        <FolderOpen className="w-4 h-4 text-amber-400" />
                    ) : (
                        <Folder className="w-4 h-4 text-amber-400" />
                    )}
                    <span className="text-sm text-stone-300 truncate">
                        {node.name}
                    </span>
                    <span className="text-xs text-stone-600 ml-auto opacity-0 group-hover:opacity-100">
                        {node.children.length}
                    </span>
                </button>
                {isExpanded && hasChildren && (
                    <div>
                        {node.children.map((child) => (
                            <TreeNodeItem
                                key={child.path}
                                node={child}
                                sourceId={sourceId}
                                depth={depth + 1}
                                expandedPaths={expandedPaths}
                                toggleExpanded={toggleExpanded}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <Link
            href={`/code/${sourceId}/${node.file?.id}`}
            className="flex items-center gap-2 px-2 py-1.5 hover:bg-stone-800 rounded-md transition-colors group"
            style={{ paddingLeft: `${depth * 16 + 28}px` }}
        >
            {getFileIcon(node.file?.mime_type || null, node.name)}
            <span className="text-sm text-stone-300 truncate flex-1">
                {node.name}
            </span>
            <span
                className={cn(
                    "w-2 h-2 rounded-full opacity-0 group-hover:opacity-100",
                    getLanguageColor(node.name),
                )}
            />
        </Link>
    );
}

// File Row Component (List View)
function FileRow({
    file,
    sourceId,
    onDelete,
}: {
    file: FileItem;
    sourceId: string;
    onDelete: (id: string) => void;
}) {
    const [showMenu, setShowMenu] = useState(false);

    return (
        <div className="group relative flex items-center gap-4 px-4 py-3 hover:bg-stone-800/50 border-b border-stone-800 last:border-b-0 transition-colors">
            {/* Menu */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowMenu(!showMenu);
                    }}
                    className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-stone-700 transition-all"
                >
                    <MoreVertical className="w-4 h-4 text-stone-400" />
                </button>
                {showMenu && (
                    <div className="absolute right-0 top-full mt-1 w-40 py-1 bg-stone-800 border border-stone-700 rounded-lg shadow-xl">
                        <button
                            onClick={() => {
                                if (file.content) {
                                    const blob = new Blob([file.content], {
                                        type: file.mime_type || "text/plain",
                                    });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = file.name;
                                    a.click();
                                    URL.revokeObjectURL(url);
                                }
                                setShowMenu(false);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-stone-300 hover:bg-stone-700 flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Download
                        </button>
                        <button
                            onClick={() => {
                                onDelete(file.id);
                                setShowMenu(false);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-stone-700 flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete
                        </button>
                    </div>
                )}
            </div>

            <Link
                href={`/code/${sourceId}/${file.id}`}
                className="flex items-center gap-4 flex-1 min-w-0"
            >
                {/* Icon */}
                <div className="w-8 h-8 rounded-lg bg-stone-800 flex items-center justify-center shrink-0">
                    {getFileIcon(file.mime_type, file.name)}
                </div>

                {/* Path & Name */}
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-stone-100 truncate">
                        {file.name}
                    </h3>
                    <p className="text-xs text-stone-500 truncate">
                        {file.path}
                    </p>
                </div>

                {/* Language indicator */}
                <span
                    className={cn(
                        "w-3 h-3 rounded-full hidden sm:block",
                        getLanguageColor(file.name),
                    )}
                />

                {/* Size */}
                <span className="hidden md:block text-xs text-stone-500 w-16 text-right">
                    {formatFileSize(file.size)}
                </span>

                {/* Updated */}
                <span className="hidden lg:block text-xs text-stone-500 w-20 text-right">
                    {formatRelativeTime(file.updated_at)}
                </span>

                {/* Arrow */}
                <ChevronRight className="w-4 h-4 text-stone-600 shrink-0 mr-8" />
            </Link>
        </div>
    );
}

// Main Page Component
export default function CodeSourcePage() {
    const params = useParams();
    const router = useRouter();
    const sourceId = params.sourceId as string;

    const [source, setSource] = useState<SourceInfo | null>(null);
    const [files, setFiles] = useState<FileItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<"tree" | "list">("tree");
    const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

    // Fetch source info
    const fetchSource = useCallback(async () => {
        try {
            const response = await fetch(`/api/sources/${sourceId}`);
            const result = await response.json();
            if (result.success && result.data) {
                setSource(result.data);
            } else {
                setError(result.error || "Failed to load project");
            }
        } catch (err) {
            setError("Failed to load project");
            console.error(err);
        }
    }, [sourceId]);

    // Fetch files
    const fetchFiles = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(
                `/api/files?source_id=${sourceId}&limit=500`,
            );
            const result = await response.json();
            if (result.success && result.data) {
                setFiles(result.data.files || []);
                // Auto-expand first level folders
                const firstLevelFolders = new Set<string>();
                result.data.files?.forEach((f: FileItem) => {
                    const firstPart = f.path.split("/")[0];
                    if (firstPart) firstLevelFolders.add(firstPart);
                });
                setExpandedPaths(firstLevelFolders);
            } else {
                setError(result.error || "Failed to load files");
            }
        } catch (err) {
            setError("Failed to load files");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [sourceId]);

    // Sync project
    const handleSync = async () => {
        if (!source || isSyncing) return;

        // Check if mode supports syncing
        if (source.mode === "link") {
            setError(
                "Link mode does not support syncing. Please use GitHub mode or Local Sync mode.",
            );
            return;
        }

        setIsSyncing(true);
        setError(null);
        try {
            // Use different sync endpoints based on source mode
            const syncEndpoint =
                source.mode === "github" ? "/api/sync/github" : "/api/sync";

            const response = await fetch(syncEndpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ source_id: sourceId }),
            });
            const result = await response.json();
            if (result.success) {
                await fetchFiles();
            } else {
                setError(result.error || "Sync failed");
            }
        } catch (err) {
            console.error("Sync failed:", err);
            setError("Sync failed: " + String(err));
        } finally {
            setIsSyncing(false);
        }
    };

    // Delete project
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteProject = async () => {
        if (!source || isDeleting) return;
        setIsDeleting(true);
        try {
            const response = await fetch(`/api/sources/${sourceId}`, {
                method: "DELETE",
            });
            const result = await response.json();
            if (result.success) {
                router.push("/code");
            } else {
                setError(result.error || "Failed to delete project");
            }
        } catch (err) {
            console.error("Delete failed:", err);
            setError("Failed to delete project: " + String(err));
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    // Delete file
    const handleDeleteFile = async (fileId: string) => {
        try {
            const response = await fetch(`/api/files/${fileId}`, {
                method: "DELETE",
            });
            const result = await response.json();
            if (result.success) {
                setFiles((prev) => prev.filter((f) => f.id !== fileId));
            }
        } catch (err) {
            console.error("Failed to delete file:", err);
        }
    };

    // Toggle folder expanded
    const toggleExpanded = (path: string) => {
        setExpandedPaths((prev) => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    };

    // Expand all / Collapse all
    const expandAll = () => {
        const allPaths = new Set<string>();
        files.forEach((f) => {
            const parts = f.path.split("/");
            for (let i = 1; i < parts.length; i++) {
                allPaths.add(parts.slice(0, i).join("/"));
            }
        });
        setExpandedPaths(allPaths);
    };

    const collapseAll = () => {
        setExpandedPaths(new Set());
    };

    // Initial fetch
    useEffect(() => {
        if (sourceId) {
            fetchSource();
            fetchFiles();
        }
    }, [sourceId, fetchSource, fetchFiles]);

    // Filter files
    const filteredFiles = useMemo(() => {
        if (!searchQuery) return files;
        const query = searchQuery.toLowerCase();
        return files.filter(
            (file) =>
                file.name.toLowerCase().includes(query) ||
                file.path.toLowerCase().includes(query),
        );
    }, [files, searchQuery]);

    // Build tree
    const fileTree = useMemo(
        () => buildFileTree(filteredFiles),
        [filteredFiles],
    );

    // Stats
    const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);
    const fileTypes = useMemo(() => {
        const types: Record<string, number> = {};
        files.forEach((f) => {
            const ext = f.name.split(".").pop()?.toLowerCase() || "other";
            types[ext] = (types[ext] || 0) + 1;
        });
        return Object.entries(types)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
    }, [files]);

    if (error && !source) {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-400 mb-4">{error}</p>
                    <button
                        onClick={() => router.push("/code")}
                        className="text-stone-400 hover:text-stone-300"
                    >
                        ← Back to Code
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-stone-950">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-stone-950/80 backdrop-blur-sm border-b border-stone-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Back & Title */}
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.push("/code")}
                                className="p-2 hover:bg-stone-800 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-stone-400" />
                            </button>
                            <div className="flex items-center gap-3">
                                {getModeIcon(source?.mode || "local_sync")}
                                <div>
                                    <h1 className="text-lg font-semibold text-stone-100">
                                        {source?.name || "Loading..."}
                                    </h1>
                                    <div className="flex items-center gap-2 text-sm text-stone-500">
                                        {source?.branch && (
                                            <span className="flex items-center gap-1">
                                                <GitBranch className="w-3 h-3" />
                                                {source.branch}
                                            </span>
                                        )}
                                        <span className="truncate max-w-[200px]">
                                            {source?.path}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            {source?.mode === "github" && (
                                <a
                                    href={`https://github.com/${source.path}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm text-stone-400 hover:text-stone-300 hover:bg-stone-800 rounded-lg transition-colors"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    GitHub
                                </a>
                            )}
                            {source?.mode !== "link" && (
                                <button
                                    onClick={handleSync}
                                    disabled={isSyncing}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-stone-300 hover:bg-stone-800 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    <RefreshCw
                                        className={cn(
                                            "w-4 h-4",
                                            isSyncing && "animate-spin",
                                        )}
                                    />
                                    <span className="hidden sm:inline">
                                        Sync
                                    </span>
                                </button>
                            )}
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                                title="Delete project"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-stone-900 border border-stone-700 rounded-xl p-6 max-w-md mx-4 shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-red-900/50 flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-stone-100">
                                    Delete Project
                                </h3>
                                <p className="text-sm text-stone-400">
                                    This action cannot be undone
                                </p>
                            </div>
                        </div>
                        <p className="text-stone-300 mb-6">
                            Are you sure you want to delete{" "}
                            <span className="font-semibold text-stone-100">
                                {source?.name}
                            </span>
                            ? All synced files will also be deleted.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={isDeleting}
                                className="px-4 py-2 text-sm text-stone-300 hover:bg-stone-800 rounded-lg transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteProject}
                                disabled={isDeleting}
                                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isDeleting ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        Delete
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Banner */}
            {error && (
                <div className="bg-red-900/50 border-b border-red-800">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-red-200">{error}</p>
                            <button
                                onClick={() => setError(null)}
                                className="text-red-400 hover:text-red-300"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Stats Bar */}
                <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-stone-400">
                    <div className="flex items-center gap-2">
                        <File className="w-4 h-4" />
                        <span>{files.length} files</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <HardDrive className="w-4 h-4" />
                        <span>{formatFileSize(totalSize)}</span>
                    </div>
                    {source?.synced_at && (
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>
                                Synced {formatRelativeTime(source.synced_at)}
                            </span>
                        </div>
                    )}
                    {/* Language breakdown */}
                    <div className="hidden md:flex items-center gap-2 ml-auto">
                        {fileTypes.map(([ext, count]) => (
                            <span
                                key={ext}
                                className="flex items-center gap-1 px-2 py-0.5 bg-stone-900 rounded text-xs"
                            >
                                <span
                                    className={cn(
                                        "w-2 h-2 rounded-full",
                                        getLanguageColor(`.${ext}`),
                                    )}
                                />
                                {ext}: {count}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                        <input
                            type="text"
                            placeholder="Search files..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-stone-900 border border-stone-800 rounded-lg text-stone-100 placeholder-stone-500 focus:outline-none focus:border-stone-700"
                        />
                    </div>

                    {/* Expand/Collapse */}
                    {viewMode === "tree" && (
                        <div className="flex gap-1">
                            <button
                                onClick={expandAll}
                                className="px-3 py-2 text-sm text-stone-400 hover:text-stone-300 hover:bg-stone-800 rounded-lg transition-colors"
                            >
                                Expand All
                            </button>
                            <button
                                onClick={collapseAll}
                                className="px-3 py-2 text-sm text-stone-400 hover:text-stone-300 hover:bg-stone-800 rounded-lg transition-colors"
                            >
                                Collapse
                            </button>
                        </div>
                    )}

                    {/* View Toggle */}
                    <div className="flex bg-stone-900 border border-stone-800 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode("tree")}
                            className={cn(
                                "p-2 rounded-md transition-colors",
                                viewMode === "tree"
                                    ? "bg-stone-800 text-stone-100"
                                    : "text-stone-500 hover:text-stone-300",
                            )}
                            title="Tree View"
                        >
                            <Grid3X3 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={cn(
                                "p-2 rounded-md transition-colors",
                                viewMode === "list"
                                    ? "bg-stone-800 text-stone-100"
                                    : "text-stone-500 hover:text-stone-300",
                            )}
                            title="List View"
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <RefreshCw className="w-8 h-8 text-stone-600 animate-spin" />
                    </div>
                ) : filteredFiles.length === 0 ? (
                    <div className="text-center py-20">
                        <Folder className="w-16 h-16 text-stone-700 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-stone-400 mb-2">
                            {searchQuery
                                ? "No files match your search"
                                : "No files yet"}
                        </h3>
                        <p className="text-stone-500 mb-6">
                            {searchQuery
                                ? "Try a different search term"
                                : source?.mode === "link"
                                  ? "Link mode does not support file syncing. Use GitHub or Local Sync mode."
                                  : "Sync this project to import files"}
                        </p>
                        {!searchQuery && source?.mode !== "link" && (
                            <button
                                onClick={handleSync}
                                disabled={isSyncing}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-100 rounded-lg transition-colors"
                            >
                                <RefreshCw
                                    className={cn(
                                        "w-4 h-4",
                                        isSyncing && "animate-spin",
                                    )}
                                />
                                Sync Now
                            </button>
                        )}
                        {!searchQuery && source?.mode === "link" && (
                            <a
                                href={source.path}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-100 rounded-lg transition-colors"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Open Link
                            </a>
                        )}
                    </div>
                ) : viewMode === "tree" ? (
                    <div className="bg-stone-900 border border-stone-800 rounded-xl p-2">
                        {fileTree.map((node) => (
                            <TreeNodeItem
                                key={node.path}
                                node={node}
                                sourceId={sourceId}
                                expandedPaths={expandedPaths}
                                toggleExpanded={toggleExpanded}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
                        {/* List Header */}
                        <div className="hidden sm:flex items-center gap-4 px-4 py-2 bg-stone-800/50 text-xs text-stone-500 uppercase tracking-wider">
                            <div className="w-8" />
                            <div className="flex-1">File</div>
                            <div className="w-4" />
                            <div className="hidden md:block w-16 text-right">
                                Size
                            </div>
                            <div className="hidden lg:block w-20 text-right">
                                Updated
                            </div>
                            <div className="w-12" />
                        </div>
                        {filteredFiles
                            .sort((a, b) => a.path.localeCompare(b.path))
                            .map((file) => (
                                <FileRow
                                    key={file.id}
                                    file={file}
                                    sourceId={sourceId}
                                    onDelete={handleDeleteFile}
                                />
                            ))}
                    </div>
                )}
            </main>
        </div>
    );
}
