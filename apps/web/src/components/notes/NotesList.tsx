"use client";

import { useState } from "react";
import {
    FileText,
    Code,
    AlignLeft,
    Pin,
    MoreVertical,
    Trash2,
    Edit2,
    Plus,
    Search,
    Loader2,
    StickyNote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Note, NoteContentType } from "@/store/notesStore";

interface NotesListProps {
    notes: Note[];
    activeNoteId?: string | null;
    onNoteSelect: (note: Note) => void;
    onNoteCreate?: () => void;
    onNoteDelete?: (id: string) => Promise<{ success: boolean; error?: string }>;
    onTogglePinned?: (id: string) => Promise<{ success: boolean; error?: string }>;
    isLoading?: boolean;
    className?: string;
}

function getContentTypeIcon(contentType: NoteContentType) {
    switch (contentType) {
        case "code":
            return <Code className="h-4 w-4" />;
        case "plaintext":
            return <AlignLeft className="h-4 w-4" />;
        case "markdown":
        default:
            return <FileText className="h-4 w-4" />;
    }
}

function formatRelativeTime(dateString: string | null): string {
    if (!dateString) return "Never";

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

function getPreview(content: string, maxLength: number = 80): string {
    if (!content) return "Empty note";
    const cleaned = content.replace(/\s+/g, " ").trim();
    if (cleaned.length <= maxLength) return cleaned;
    return cleaned.substring(0, maxLength) + "...";
}

interface NoteItemProps {
    note: Note;
    isActive: boolean;
    onSelect: () => void;
    onDelete?: () => Promise<{ success: boolean; error?: string }>;
    onTogglePinned?: () => Promise<{ success: boolean; error?: string }>;
}

function NoteItem({
    note,
    isActive,
    onSelect,
    onDelete,
    onTogglePinned,
}: NoteItemProps) {
    const [showMenu, setShowMenu] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onDelete) return;

        const confirmed = window.confirm(
            "Are you sure you want to delete this note?"
        );
        if (!confirmed) return;

        setIsDeleting(true);
        await onDelete();
        setIsDeleting(false);
        setShowMenu(false);
    };

    const handleTogglePinned = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onTogglePinned) return;
        await onTogglePinned();
        setShowMenu(false);
    };

    return (
        <div
            onClick={onSelect}
            className={cn(
                "group relative p-3 rounded-lg border cursor-pointer transition-all",
                isActive
                    ? "border-primary bg-primary/5"
                    : "border-transparent hover:border-border hover:bg-accent/50"
            )}
        >
            <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                    className={cn(
                        "p-1.5 rounded-md",
                        isActive
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                    )}
                >
                    {getContentTypeIcon(note.content_type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3
                            className={cn(
                                "font-medium truncate",
                                !note.title && "text-muted-foreground italic"
                            )}
                        >
                            {note.title || "Untitled"}
                        </h3>
                        {note.is_pinned && (
                            <Pin className="h-3 w-3 text-amber-500 flex-shrink-0" />
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {getPreview(note.content)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(note.updated_at)}
                        </span>
                        {note.tags && note.tags.length > 0 && (
                            <>
                                <span className="text-muted-foreground">·</span>
                                <div className="flex items-center gap-1">
                                    {note.tags.slice(0, 2).map((tag) => (
                                        <span
                                            key={tag}
                                            className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                    {note.tags.length > 2 && (
                                        <span className="text-xs text-muted-foreground">
                                            +{note.tags.length - 2}
                                        </span>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Context Menu */}
                <div className="relative">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(!showMenu);
                        }}
                        className="p-1 rounded hover:bg-accent opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </button>

                    {showMenu && (
                        <>
                            <div
                                className="fixed inset-0 z-40"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMenu(false);
                                }}
                            />
                            <div className="absolute right-0 top-full mt-1 z-50 min-w-[120px] rounded-lg border border-border bg-popover p-1 shadow-lg">
                                <button
                                    onClick={onSelect}
                                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
                                >
                                    <Edit2 className="h-4 w-4" />
                                    Edit
                                </button>
                                {onTogglePinned && (
                                    <button
                                        onClick={handleTogglePinned}
                                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
                                    >
                                        <Pin className="h-4 w-4" />
                                        {note.is_pinned ? "Unpin" : "Pin"}
                                    </button>
                                )}
                                {onDelete && (
                                    <>
                                        <div className="my-1 h-px bg-border" />
                                        <button
                                            onClick={handleDelete}
                                            disabled={isDeleting}
                                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                                        >
                                            {isDeleting ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="h-4 w-4" />
                                            )}
                                            Delete
                                        </button>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export function NotesList({
    notes,
    activeNoteId,
    onNoteSelect,
    onNoteCreate,
    onNoteDelete,
    onTogglePinned,
    isLoading = false,
    className,
}: NotesListProps) {
    const [searchQuery, setSearchQuery] = useState("");

    // Filter notes based on search
    const filteredNotes = searchQuery
        ? notes.filter(
              (note) =>
                  note.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  note.tags?.some((tag) =>
                      tag.toLowerCase().includes(searchQuery.toLowerCase())
                  )
          )
        : notes;

    // Separate pinned and unpinned notes
    const pinnedNotes = filteredNotes.filter((note) => note.is_pinned);
    const unpinnedNotes = filteredNotes.filter((note) => !note.is_pinned);

    return (
        <div className={cn("flex flex-col h-full", className)}>
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
                <h2 className="font-semibold">Notes</h2>
                {onNoteCreate && (
                    <button
                        onClick={onNoteCreate}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        New
                    </button>
                )}
            </div>

            {/* Search */}
            <div className="px-4 py-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search notes..."
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                </div>
            </div>

            {/* Notes List */}
            <div className="flex-1 overflow-y-auto px-2 py-2">
                {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : filteredNotes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-center">
                        <StickyNote className="h-8 w-8 text-muted-foreground opacity-50 mb-2" />
                        <p className="text-sm text-muted-foreground">
                            {searchQuery ? "No notes found" : "No notes yet"}
                        </p>
                        {!searchQuery && onNoteCreate && (
                            <button
                                onClick={onNoteCreate}
                                className="mt-2 text-sm text-primary hover:underline"
                            >
                                Create your first note
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-1">
                        {/* Pinned Notes */}
                        {pinnedNotes.length > 0 && (
                            <>
                                <div className="px-2 py-1">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Pinned
                                    </span>
                                </div>
                                {pinnedNotes.map((note) => (
                                    <NoteItem
                                        key={note.id}
                                        note={note}
                                        isActive={note.id === activeNoteId}
                                        onSelect={() => onNoteSelect(note)}
                                        onDelete={
                                            onNoteDelete
                                                ? () => onNoteDelete(note.id)
                                                : undefined
                                        }
                                        onTogglePinned={
                                            onTogglePinned
                                                ? () => onTogglePinned(note.id)
                                                : undefined
                                        }
                                    />
                                ))}
                            </>
                        )}

                        {/* Unpinned Notes */}
                        {unpinnedNotes.length > 0 && (
                            <>
                                {pinnedNotes.length > 0 && (
                                    <div className="px-2 py-1 mt-2">
                                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            All Notes
                                        </span>
                                    </div>
                                )}
                                {unpinnedNotes.map((note) => (
                                    <NoteItem
                                        key={note.id}
                                        note={note}
                                        isActive={note.id === activeNoteId}
                                        onSelect={() => onNoteSelect(note)}
                                        onDelete={
                                            onNoteDelete
                                                ? () => onNoteDelete(note.id)
                                                : undefined
                                        }
                                        onTogglePinned={
                                            onTogglePinned
                                                ? () => onTogglePinned(note.id)
                                                : undefined
                                        }
                                    />
                                ))}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">
                    {filteredNotes.length} note{filteredNotes.length !== 1 ? "s" : ""}
                    {searchQuery && ` matching "${searchQuery}"`}
                </p>
            </div>
        </div>
    );
}

export default NotesList;
