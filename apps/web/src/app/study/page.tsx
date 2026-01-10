"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import {
    BookOpen,
    Folder,
    MoreVertical,
    Plus,
    Loader2,
    AlertCircle,
    RefreshCw,
    Trash2,
    Check,
    X,
    Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSources } from "@/hooks/useSources";

// Helper to format relative time
function formatRelativeTime(dateString: string | null): string {
    if (!dateString) return "Never";
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        const diffWeeks = Math.floor(diffDays / 7);

        if (diffMins < 1) return "just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        if (diffWeeks < 4) return `${diffWeeks}w ago`;
        return date.toLocaleDateString();
    } catch {
        return "Unknown";
    }
}

// File Upload Modal Component
function FileUploadModal({
    isOpen,
    onClose,
    sourceId,
    sourceName,
    onUploadComplete,
}: {
    isOpen: boolean;
    onClose: () => void;
    sourceId: string;
    sourceName: string;
    onUploadComplete: () => void;
}) {
    const [isUploading, setIsUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [uploadResult, setUploadResult] = useState<{
        uploaded: string[];
        errors: { file: string; error: string }[];
    } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (files: FileList | File[]) => {
        if (!files || files.length === 0) return;

        setIsUploading(true);
        setUploadResult(null);

        try {
            const formData = new FormData();
            formData.append("source_id", sourceId);

            Array.from(files).forEach((file) => {
                formData.append("files", file);
            });

            const response = await fetch("/api/files/upload", {
                method: "POST",
                body: formData,
            });

            const result = await response.json();

            if (result.success) {
                setUploadResult(result.data);
                onUploadComplete();
            } else {
                setUploadResult({
                    uploaded: [],
                    errors: [
                        {
                            file: "Upload",
                            error: result.error || "Upload failed",
                        },
                    ],
                });
            }
        } catch {
            setUploadResult({
                uploaded: [],
                errors: [{ file: "Upload", error: "Network error" }],
            });
        } finally {
            setIsUploading(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        handleUpload(e.dataTransfer.files);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            handleUpload(e.target.files);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative z-10 w-full max-w-lg bg-card border border-border rounded-xl shadow-xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-semibold">Upload Files</h2>
                        <p className="text-sm text-muted-foreground">
                            to {sourceName}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-accent rounded-md transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Drop Zone */}
                <div
                    className={cn(
                        "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                        dragOver
                            ? "border-study bg-study/5"
                            : "border-border hover:border-study/50",
                        isUploading && "opacity-50 pointer-events-none",
                    )}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                        accept=".md,.txt,.pdf,.json,.html,.css,.js,.ts,.tsx,.jsx"
                    />

                    {isUploading ? (
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-10 w-10 text-study animate-spin" />
                            <p className="text-sm text-muted-foreground">
                                Uploading...
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2">
                            <Upload className="h-10 w-10 text-muted-foreground" />
                            <p className="text-sm font-medium">
                                Drop files here or click to browse
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Supports: .md, .txt, .pdf, .json, .html, .css,
                                .js, .ts
                            </p>
                        </div>
                    )}
                </div>

                {/* Upload Results */}
                {uploadResult && (
                    <div className="mt-4 space-y-2">
                        {uploadResult.uploaded.length > 0 && (
                            <div className="flex items-center gap-2 text-sm text-green-600">
                                <Check className="h-4 w-4" />
                                <span>
                                    Uploaded {uploadResult.uploaded.length}{" "}
                                    file(s)
                                </span>
                            </div>
                        )}
                        {uploadResult.errors.length > 0 && (
                            <div className="space-y-1">
                                {uploadResult.errors.map((err, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-2 text-sm text-red-500"
                                    >
                                        <AlertCircle className="h-4 w-4" />
                                        <span>
                                            {err.file}: {err.error}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="flex justify-end mt-4">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-md bg-accent hover:bg-accent/80 text-sm font-medium transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

// Add Space Modal Component
function AddSpaceModal({
    isOpen,
    onClose,
    onSubmit,
    isLoading,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: {
        name: string;
        path: string;
        description?: string;
    }) => Promise<void>;
    isLoading: boolean;
}) {
    const [name, setName] = useState("");
    const [path, setPath] = useState("");
    const [description, setDescription] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        await onSubmit({
            name: name.trim(),
            path:
                path.trim() ||
                `/study/${name.trim().toLowerCase().replace(/\s+/g, "-")}`,
            description: description.trim() || undefined,
        });
        setName("");
        setPath("");
        setDescription("");
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative z-10 w-full max-w-md bg-card border border-border rounded-xl shadow-xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Add Study Space</h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-accent rounded-md transition-colors"
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
                            placeholder="e.g. Frontend Mastery"
                            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:border-study focus:ring-1 focus:ring-study/20 outline-none transition-all"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1.5">
                            Path (optional)
                        </label>
                        <input
                            type="text"
                            value={path}
                            onChange={(e) => setPath(e.target.value)}
                            placeholder="Auto-generated if empty"
                            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-mono focus:border-study focus:ring-1 focus:ring-study/20 outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1.5">
                            Description (optional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What are you learning here?"
                            rows={2}
                            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:border-study focus:ring-1 focus:ring-study/20 outline-none transition-all resize-none"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 h-10 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim() || isLoading}
                            className="flex-1 h-10 rounded-md bg-study text-white text-sm font-medium hover:bg-study/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Adding...
                                </>
                            ) : (
                                <>
                                    <Plus className="h-4 w-4" />
                                    Add Space
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Delete Confirmation Modal
function DeleteConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    spaceName,
    isLoading,
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    spaceName: string;
    isLoading: boolean;
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative z-10 w-full max-w-sm bg-card border border-border rounded-xl shadow-xl p-6">
                <h2 className="text-lg font-semibold mb-2">
                    Delete Study Space?
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                    Are you sure you want to delete "{spaceName}"? This will
                    also delete all uploaded files.
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 h-10 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="flex-1 h-10 rounded-md bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Trash2 className="h-4 w-4" />
                        )}
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function StudyPage() {
    const [showAddModal, setShowAddModal] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<{
        id: string;
        name: string;
    } | null>(null);
    const [contextMenuId, setContextMenuId] = useState<string | null>(null);
    const [uploadModal, setUploadModal] = useState<{
        id: string;
        name: string;
    } | null>(null);

    const {
        sources,
        isLoading,
        isCreating,
        isDeleting,
        error,
        createSource,
        deleteSource,
        refresh,
    } = useSources({
        autoFetch: true,
        initialFilter: { source_type: "study" },
        useLocalState: true,
    });

    // Study spaces are already filtered by source_type: 'study' from the API
    const studySpaces = sources;

    // Handle add space
    const handleAddSpace = useCallback(
        async (data: { name: string; path: string; description?: string }) => {
            const result = await createSource({
                name: data.name,
                mode: "local_sync",
                path: data.path,
                description: data.description,
                source_type: "study",
            });
            if (result.success) {
                setShowAddModal(false);
            }
        },
        [createSource],
    );

    // Handle delete space
    const handleDeleteSpace = useCallback(async () => {
        if (!deleteConfirm) return;
        const result = await deleteSource(deleteConfirm.id);
        if (result.success) {
            setDeleteConfirm(null);
            setContextMenuId(null);
        }
    }, [deleteConfirm, deleteSource]);

    // Handle upload click
    const handleUploadClick = useCallback((id: string, name: string) => {
        setContextMenuId(null);
        setUploadModal({ id, name });
    }, []);

    return (
        <AppShell>
            <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-study/10 text-study">
                            <BookOpen className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold">
                                Study
                            </h1>
                            <p className="text-xs md:text-sm text-muted-foreground">
                                Learn & Review
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
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
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-study text-white text-sm font-medium hover:bg-study/90 transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            <span className="hidden sm:inline">Add Space</span>
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

                {/* Study Spaces Grid */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold">Study Spaces</h2>

                    {isLoading && studySpaces.length === 0 ? (
                        <div className="p-12 text-center text-muted-foreground">
                            <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin opacity-50" />
                            <p>Loading study spaces...</p>
                        </div>
                    ) : studySpaces.length === 0 ? (
                        <div className="p-12 text-center border border-dashed border-border rounded-xl">
                            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                            <p className="text-muted-foreground mb-4">
                                No study spaces yet
                            </p>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-study text-white text-sm font-medium hover:bg-study/90 transition-colors"
                            >
                                <Plus className="h-4 w-4" />
                                Create your first space
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {studySpaces.map((space) => (
                                <div
                                    key={space.id}
                                    className="group relative p-4 rounded-xl border border-border bg-card hover:border-study/50 transition-colors cursor-pointer"
                                >
                                    {/* Clickable overlay for browsing */}
                                    <Link
                                        href={`/study/${space.id}`}
                                        className="absolute inset-0 z-0"
                                        aria-label={`Browse ${space.name}`}
                                    />
                                    <div className="flex items-start justify-between relative z-10">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-study/10 text-study">
                                                <Folder className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-medium">
                                                    {space.name}
                                                </h3>
                                                <p className="text-xs text-muted-foreground font-mono truncate max-w-[150px]">
                                                    {space.path || "No path"}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Context Menu */}
                                        <div className="relative z-20">
                                            <button
                                                onClick={() =>
                                                    setContextMenuId(
                                                        contextMenuId ===
                                                            space.id
                                                            ? null
                                                            : space.id,
                                                    )
                                                }
                                                className="p-1 rounded hover:bg-accent transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <MoreVertical className="h-4 w-4" />
                                            </button>

                                            {contextMenuId === space.id && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-40"
                                                        onClick={() =>
                                                            setContextMenuId(
                                                                null,
                                                            )
                                                        }
                                                    />
                                                    <div className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded-lg border border-border bg-popover p-1 shadow-lg">
                                                        <button
                                                            onClick={() =>
                                                                handleUploadClick(
                                                                    space.id,
                                                                    space.name,
                                                                )
                                                            }
                                                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
                                                        >
                                                            <Upload className="h-4 w-4" />
                                                            Upload Files
                                                        </button>
                                                        <div className="my-1 h-px bg-border" />
                                                        <button
                                                            onClick={() => {
                                                                setDeleteConfirm(
                                                                    {
                                                                        id: space.id,
                                                                        name: space.name,
                                                                    },
                                                                );
                                                                setContextMenuId(
                                                                    null,
                                                                );
                                                            }}
                                                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                            Delete
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Description */}
                                    {space.description && (
                                        <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                                            {space.description}
                                        </p>
                                    )}

                                    {/* Footer */}
                                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground relative z-10">
                                        <span>
                                            Last sync:{" "}
                                            {formatRelativeTime(
                                                space.synced_at,
                                            )}
                                        </span>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleUploadClick(
                                                        space.id,
                                                        space.name,
                                                    );
                                                }}
                                                className="flex items-center gap-1 text-study hover:underline"
                                            >
                                                <Upload className="h-3 w-3" />
                                                Upload
                                            </button>
                                            <Link
                                                href={`/study/${space.id}`}
                                                className="flex items-center gap-1 text-study hover:underline font-medium"
                                            >
                                                Browse Files →
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Info Card */}
                <div className="p-4 rounded-xl border border-border bg-muted/30">
                    <h3 className="font-medium mb-2">
                        How to use Study Spaces
                    </h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>
                            1. Create a study space for a topic you're learning
                        </li>
                        <li>
                            2. Upload your notes, articles, and reference
                            materials
                        </li>
                        <li>
                            3. Or use the CLI to sync local directories:{" "}
                            <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                hub sync
                            </code>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Modals */}
            <AddSpaceModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSubmit={handleAddSpace}
                isLoading={isCreating}
            />

            <DeleteConfirmModal
                isOpen={deleteConfirm !== null}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={handleDeleteSpace}
                spaceName={deleteConfirm?.name || ""}
                isLoading={isDeleting}
            />

            {uploadModal && (
                <FileUploadModal
                    isOpen={true}
                    onClose={() => setUploadModal(null)}
                    sourceId={uploadModal.id}
                    sourceName={uploadModal.name}
                    onUploadComplete={refresh}
                />
            )}
        </AppShell>
    );
}
