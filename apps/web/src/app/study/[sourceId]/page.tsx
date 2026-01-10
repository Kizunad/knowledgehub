"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    FileText,
    FileCode,
    FileImage,
    File,
    Search,
    Grid3X3,
    List,
    Upload,
    MoreVertical,
    Trash2,
    Download,
    Clock,
    HardDrive,
    FolderOpen,
    RefreshCw,
    ChevronRight,
    StickyNote,
    Plus,
} from "lucide-react";
import { useNotes } from "@/hooks/useNotes";
import { NotesList, NoteEditor } from "@/components/notes";
import { Note } from "@/store/notesStore";
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
    mode: string;
    path: string;
    description: string | null;
    synced_at: string | null;
    created_at: string;
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

function getFileIcon(mimeType: string | null, fileName: string) {
    if (mimeType?.startsWith("image/")) {
        return <FileImage className="w-5 h-5 text-purple-400" />;
    }
    if (
        mimeType?.includes("javascript") ||
        mimeType?.includes("typescript") ||
        mimeType?.includes("json") ||
        fileName.match(
            /\.(js|ts|jsx|tsx|py|rb|go|rs|java|c|cpp|h|css|html|xml|yaml|yml|toml|md)$/,
        )
    ) {
        return <FileCode className="w-5 h-5 text-blue-400" />;
    }
    if (
        mimeType?.startsWith("text/") ||
        fileName.match(/\.(txt|md|markdown)$/)
    ) {
        return <FileText className="w-5 h-5 text-green-400" />;
    }
    return <File className="w-5 h-5 text-stone-400" />;
}

function getFileExtension(fileName: string): string {
    const parts = fileName.split(".");
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "FILE";
}

// File Context Menu
function FileContextMenu({
    file,
    onDelete,
    onClose,
}: {
    file: FileItem;
    onDelete: (id: string) => void;
    onClose: () => void;
}) {
    const handleDownload = () => {
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
        onClose();
    };

    return (
        <div className="absolute right-0 top-full mt-1 z-50 w-48 py-1 bg-stone-800 border border-stone-700 rounded-lg shadow-xl">
            <button
                onClick={handleDownload}
                className="w-full px-3 py-2 text-left text-sm text-stone-300 hover:bg-stone-700 flex items-center gap-2"
            >
                <Download className="w-4 h-4" />
                Download
            </button>
            <button
                onClick={() => {
                    onDelete(file.id);
                    onClose();
                }}
                className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-stone-700 flex items-center gap-2"
            >
                <Trash2 className="w-4 h-4" />
                Delete
            </button>
        </div>
    );
}

// File Card Component (Grid View)
function FileCard({
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
        <div className="group relative bg-stone-900 border border-stone-800 rounded-xl p-4 hover:border-stone-700 transition-all hover:shadow-lg">
            {/* Menu Button */}
            <div className="absolute top-3 right-3">
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
                    <FileContextMenu
                        file={file}
                        onDelete={onDelete}
                        onClose={() => setShowMenu(false)}
                    />
                )}
            </div>

            <Link href={`/study/${sourceId}/${file.id}`} className="block">
                {/* Icon */}
                <div className="w-12 h-12 rounded-lg bg-stone-800 flex items-center justify-center mb-3">
                    {getFileIcon(file.mime_type, file.name)}
                </div>

                {/* Name */}
                <h3
                    className="font-medium text-stone-100 truncate mb-1"
                    title={file.name}
                >
                    {file.name}
                </h3>

                {/* Meta */}
                <div className="flex items-center gap-2 text-xs text-stone-500">
                    <span className="px-1.5 py-0.5 bg-stone-800 rounded">
                        {getFileExtension(file.name)}
                    </span>
                    <span>{formatFileSize(file.size)}</span>
                </div>

                {/* Updated time */}
                <p className="text-xs text-stone-600 mt-2">
                    {formatRelativeTime(file.updated_at)}
                </p>
            </Link>
        </div>
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
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
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
                    <FileContextMenu
                        file={file}
                        onDelete={onDelete}
                        onClose={() => setShowMenu(false)}
                    />
                )}
            </div>

            <Link
                href={`/study/${sourceId}/${file.id}`}
                className="flex items-center gap-4 flex-1 min-w-0"
            >
                {/* Icon */}
                <div className="w-10 h-10 rounded-lg bg-stone-800 flex items-center justify-center shrink-0">
                    {getFileIcon(file.mime_type, file.name)}
                </div>

                {/* Name & Path */}
                <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-stone-100 truncate">
                        {file.name}
                    </h3>
                    <p className="text-xs text-stone-500 truncate">
                        {file.path}
                    </p>
                </div>

                {/* Extension */}
                <span className="hidden sm:block px-2 py-0.5 text-xs bg-stone-800 text-stone-400 rounded">
                    {getFileExtension(file.name)}
                </span>

                {/* Size */}
                <span className="hidden md:block text-sm text-stone-500 w-20 text-right">
                    {formatFileSize(file.size)}
                </span>

                {/* Updated */}
                <span className="hidden lg:block text-sm text-stone-500 w-24 text-right">
                    {formatRelativeTime(file.updated_at)}
                </span>

                {/* Arrow */}
                <ChevronRight className="w-4 h-4 text-stone-600 shrink-0 mr-8" />
            </Link>
        </div>
    );
}

// Tab type
type TabType = "files" | "notes";

// Main Page Component
export default function StudySourcePage() {
    const params = useParams();
    const router = useRouter();
    const sourceId = params.sourceId as string;

    const [source, setSource] = useState<SourceInfo | null>(null);
    const [files, setFiles] = useState<FileItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [sortBy, setSortBy] = useState<"name" | "updated" | "size">(
        "updated",
    );
    const [activeTab, setActiveTab] = useState<TabType>("files");
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [isCreatingNote, setIsCreatingNote] = useState(false);

    // Notes hook
    const {
        notes,
        isLoading: notesLoading,
        isSaving: notesSaving,
        createNote,
        updateNote,
        deleteNote,
        togglePinned,
        refresh: refreshNotes,
    } = useNotes({ autoFetch: true, sourceId });

    // Fetch source info
    const fetchSource = useCallback(async () => {
        try {
            const response = await fetch(`/api/sources/${sourceId}`);
            const result = await response.json();
            if (result.success && result.data) {
                setSource(result.data);
            } else {
                setError(result.error || "Failed to load source");
            }
        } catch (err) {
            setError("Failed to load source");
            console.error(err);
        }
    }, [sourceId]);

    // Fetch files
    const fetchFiles = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(
                `/api/files?source_id=${sourceId}&limit=200`,
            );
            const result = await response.json();
            if (result.success && result.data) {
                setFiles(result.data.files || []);
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

    // Initial fetch
    useEffect(() => {
        if (sourceId) {
            fetchSource();
            fetchFiles();
        }
    }, [sourceId, fetchSource, fetchFiles]);

    // Filter and sort files
    const filteredFiles = files.filter((file) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            file.name.toLowerCase().includes(query) ||
            file.path.toLowerCase().includes(query)
        );
    });

    const sortedFiles = [...filteredFiles].sort((a, b) => {
        switch (sortBy) {
            case "name":
                return a.name.localeCompare(b.name);
            case "size":
                return (b.size || 0) - (a.size || 0);
            case "updated":
            default:
                return (
                    new Date(b.updated_at).getTime() -
                    new Date(a.updated_at).getTime()
                );
        }
    });

    // Stats
    const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);

    // Note handlers
    const handleCreateNote = useCallback(() => {
        setSelectedNote(null);
        setIsCreatingNote(true);
    }, []);

    const handleSelectNote = useCallback((note: Note) => {
        setSelectedNote(note);
        setIsCreatingNote(false);
    }, []);

    const handleSaveNote = useCallback(
        async (data: {
            title?: string;
            content: string;
            content_type: "markdown" | "plaintext" | "code";
            language?: string;
            tags?: string[];
        }) => {
            if (isCreatingNote) {
                const result = await createNote({
                    source_id: sourceId,
                    ...data,
                });
                if (result.success && result.data) {
                    setSelectedNote(result.data);
                    setIsCreatingNote(false);
                }
                return result;
            } else if (selectedNote) {
                return updateNote(selectedNote.id, data);
            }
            return { success: false, error: "No note selected" };
        },
        [isCreatingNote, selectedNote, sourceId, createNote, updateNote],
    );

    const handleDeleteNote = useCallback(async () => {
        if (!selectedNote) return { success: false, error: "No note selected" };
        const result = await deleteNote(selectedNote.id);
        if (result.success) {
            setSelectedNote(null);
        }
        return result;
    }, [selectedNote, deleteNote]);

    const handleTogglePinned = useCallback(async () => {
        if (!selectedNote) return { success: false, error: "No note selected" };
        return togglePinned(selectedNote.id);
    }, [selectedNote, togglePinned]);

    const handleCloseEditor = useCallback(() => {
        setSelectedNote(null);
        setIsCreatingNote(false);
    }, []);

    if (error && !source) {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-400 mb-4">{error}</p>
                    <button
                        onClick={() => router.push("/study")}
                        className="text-stone-400 hover:text-stone-300"
                    >
                        ← Back to Study
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
                                onClick={() => router.push("/study")}
                                className="p-2 hover:bg-stone-800 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-stone-400" />
                            </button>
                            <div>
                                <h1 className="text-lg font-semibold text-stone-100">
                                    {source?.name || "Loading..."}
                                </h1>
                                {source?.description && (
                                    <p className="text-sm text-stone-500">
                                        {source.description}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    if (activeTab === "files") {
                                        fetchFiles();
                                    } else {
                                        refreshNotes();
                                    }
                                }}
                                className="p-2 hover:bg-stone-800 rounded-lg transition-colors"
                                title="Refresh"
                            >
                                <RefreshCw
                                    className={cn(
                                        "w-5 h-5 text-stone-400",
                                        (isLoading || notesLoading) &&
                                            "animate-spin",
                                    )}
                                />
                            </button>
                            {activeTab === "notes" && (
                                <button
                                    onClick={handleCreateNote}
                                    className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    New Note
                                </button>
                            )}
                            {activeTab === "files" && (
                                <Link
                                    href="/study"
                                    className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm text-stone-300 hover:bg-stone-800 rounded-lg transition-colors"
                                >
                                    <Upload className="w-4 h-4" />
                                    Upload
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Tabs */}
                <div className="flex items-center gap-1 mb-6 border-b border-stone-800">
                    <button
                        onClick={() => setActiveTab("files")}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                            activeTab === "files"
                                ? "border-blue-500 text-blue-400"
                                : "border-transparent text-stone-400 hover:text-stone-300",
                        )}
                    >
                        <FolderOpen className="w-4 h-4" />
                        Files
                        <span className="text-xs px-1.5 py-0.5 rounded bg-stone-800">
                            {files.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab("notes")}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                            activeTab === "notes"
                                ? "border-blue-500 text-blue-400"
                                : "border-transparent text-stone-400 hover:text-stone-300",
                        )}
                    >
                        <StickyNote className="w-4 h-4" />
                        Notes
                        <span className="text-xs px-1.5 py-0.5 rounded bg-stone-800">
                            {notes.length}
                        </span>
                    </button>
                </div>

                {activeTab === "files" ? (
                    <>
                        {/* Stats Bar */}
                        <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-stone-400">
                            <div className="flex items-center gap-2">
                                <FolderOpen className="w-4 h-4" />
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
                                        Synced{" "}
                                        {formatRelativeTime(source.synced_at)}
                                    </span>
                                </div>
                            )}
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
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                    className="w-full pl-10 pr-4 py-2 bg-stone-900 border border-stone-800 rounded-lg text-stone-100 placeholder-stone-500 focus:outline-none focus:border-stone-700"
                                />
                            </div>

                            {/* Sort */}
                            <select
                                value={sortBy}
                                onChange={(e) =>
                                    setSortBy(
                                        e.target.value as
                                            | "name"
                                            | "updated"
                                            | "size",
                                    )
                                }
                                className="px-3 py-2 bg-stone-900 border border-stone-800 rounded-lg text-stone-300 focus:outline-none focus:border-stone-700"
                            >
                                <option value="updated">
                                    Recently Updated
                                </option>
                                <option value="name">Name</option>
                                <option value="size">Size</option>
                            </select>

                            {/* View Toggle */}
                            <div className="flex bg-stone-900 border border-stone-800 rounded-lg p-1">
                                <button
                                    onClick={() => setViewMode("grid")}
                                    className={cn(
                                        "p-2 rounded-md transition-colors",
                                        viewMode === "grid"
                                            ? "bg-stone-800 text-stone-100"
                                            : "text-stone-500 hover:text-stone-300",
                                    )}
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
                        ) : sortedFiles.length === 0 ? (
                            <div className="text-center py-20">
                                <FolderOpen className="w-16 h-16 text-stone-700 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-stone-400 mb-2">
                                    {searchQuery
                                        ? "No files match your search"
                                        : "No files yet"}
                                </h3>
                                <p className="text-stone-500 mb-6">
                                    {searchQuery
                                        ? "Try a different search term"
                                        : "Upload files to this study space to get started"}
                                </p>
                                {!searchQuery && (
                                    <Link
                                        href="/study"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-100 rounded-lg transition-colors"
                                    >
                                        <Upload className="w-4 h-4" />
                                        Upload Files
                                    </Link>
                                )}
                            </div>
                        ) : viewMode === "grid" ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {sortedFiles.map((file) => (
                                    <FileCard
                                        key={file.id}
                                        file={file}
                                        sourceId={sourceId}
                                        onDelete={handleDeleteFile}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
                                {/* List Header */}
                                <div className="hidden sm:flex items-center gap-4 px-4 py-2 bg-stone-800/50 text-xs text-stone-500 uppercase tracking-wider">
                                    <div className="w-10" />
                                    <div className="flex-1">Name</div>
                                    <div className="w-16 text-center">Type</div>
                                    <div className="hidden md:block w-20 text-right">
                                        Size
                                    </div>
                                    <div className="hidden lg:block w-24 text-right">
                                        Updated
                                    </div>
                                    <div className="w-12" />
                                </div>
                                {sortedFiles.map((file) => (
                                    <FileRow
                                        key={file.id}
                                        file={file}
                                        sourceId={sourceId}
                                        onDelete={handleDeleteFile}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    /* Notes Tab Content */
                    <div className="flex gap-6 h-[calc(100vh-280px)]">
                        {/* Notes List */}
                        <div className="w-80 flex-shrink-0 bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
                            <NotesList
                                notes={notes}
                                activeNoteId={
                                    selectedNote?.id ||
                                    (isCreatingNote ? "new" : null)
                                }
                                onNoteSelect={handleSelectNote}
                                onNoteCreate={handleCreateNote}
                                onNoteDelete={deleteNote}
                                onTogglePinned={togglePinned}
                                isLoading={notesLoading}
                                className="h-full"
                            />
                        </div>

                        {/* Note Editor */}
                        <div className="flex-1 bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
                            {selectedNote || isCreatingNote ? (
                                <NoteEditor
                                    note={selectedNote}
                                    isNew={isCreatingNote}
                                    onSave={handleSaveNote}
                                    onDelete={
                                        selectedNote
                                            ? handleDeleteNote
                                            : undefined
                                    }
                                    onTogglePinned={
                                        selectedNote
                                            ? handleTogglePinned
                                            : undefined
                                    }
                                    onClose={handleCloseEditor}
                                    isSaving={notesSaving}
                                    className="h-full"
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                    <StickyNote className="w-16 h-16 text-stone-700 mb-4" />
                                    <h3 className="text-lg font-medium text-stone-400 mb-2">
                                        No note selected
                                    </h3>
                                    <p className="text-stone-500 mb-6">
                                        Select a note from the list or create a
                                        new one
                                    </p>
                                    <button
                                        onClick={handleCreateNote}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Create Note
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
