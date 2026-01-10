"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
    FileText,
    Code,
    AlignLeft,
    Pin,
    PinOff,
    Save,
    Trash2,
    X,
    Check,
    Loader2,
    ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Note, NoteContentType } from "@/store/notesStore";

interface NoteEditorProps {
    note: Note | null;
    isNew?: boolean;
    onSave: (data: {
        title?: string;
        content: string;
        content_type: NoteContentType;
        language?: string;
        tags?: string[];
    }) => Promise<{ success: boolean; error?: string }>;
    onDelete?: () => Promise<{ success: boolean; error?: string }>;
    onTogglePinned?: () => Promise<{ success: boolean; error?: string }>;
    onClose?: () => void;
    onContentChange?: (content: string) => void;
    isSaving?: boolean;
    autoSaveDelay?: number;
    className?: string;
}

const CONTENT_TYPE_OPTIONS: { value: NoteContentType; label: string; icon: React.ReactNode }[] = [
    { value: "markdown", label: "Markdown", icon: <FileText className="h-4 w-4" /> },
    { value: "code", label: "Code", icon: <Code className="h-4 w-4" /> },
    { value: "plaintext", label: "Plain Text", icon: <AlignLeft className="h-4 w-4" /> },
];

const LANGUAGE_OPTIONS = [
    "javascript",
    "typescript",
    "python",
    "rust",
    "go",
    "java",
    "c",
    "cpp",
    "csharp",
    "ruby",
    "php",
    "swift",
    "kotlin",
    "sql",
    "html",
    "css",
    "json",
    "yaml",
    "markdown",
    "shell",
    "other",
];

export function NoteEditor({
    note,
    isNew = false,
    onSave,
    onDelete,
    onTogglePinned,
    onClose,
    onContentChange,
    isSaving = false,
    autoSaveDelay = 2000,
    className,
}: NoteEditorProps) {
    const [title, setTitle] = useState(note?.title || "");
    const [content, setContent] = useState(note?.content || "");
    const [contentType, setContentType] = useState<NoteContentType>(
        note?.content_type || "markdown"
    );
    const [language, setLanguage] = useState(note?.language || "");
    const [tagsInput, setTagsInput] = useState(note?.tags?.join(", ") || "");
    const [showContentTypeMenu, setShowContentTypeMenu] = useState(false);
    const [showLanguageMenu, setShowLanguageMenu] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);

    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
    const contentTypeMenuRef = useRef<HTMLDivElement>(null);
    const languageMenuRef = useRef<HTMLDivElement>(null);

    // Update state when note changes
    useEffect(() => {
        if (note) {
            setTitle(note.title || "");
            setContent(note.content || "");
            setContentType(note.content_type);
            setLanguage(note.language || "");
            setTagsInput(note.tags?.join(", ") || "");
            setHasChanges(false);
        }
    }, [note?.id]);

    // Close menus when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                contentTypeMenuRef.current &&
                !contentTypeMenuRef.current.contains(event.target as Node)
            ) {
                setShowContentTypeMenu(false);
            }
            if (
                languageMenuRef.current &&
                !languageMenuRef.current.contains(event.target as Node)
            ) {
                setShowLanguageMenu(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Auto-save functionality
    const handleAutoSave = useCallback(async () => {
        if (!hasChanges || isNew) return;

        const tags = tagsInput
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);

        const result = await onSave({
            title: title || undefined,
            content,
            content_type: contentType,
            language: contentType === "code" ? language : undefined,
            tags: tags.length > 0 ? tags : undefined,
        });

        if (result.success) {
            setHasChanges(false);
            setLastSaved(new Date());
            setSaveError(null);
        } else {
            setSaveError(result.error || "Failed to save");
        }
    }, [hasChanges, isNew, title, content, contentType, language, tagsInput, onSave]);

    // Debounced auto-save
    useEffect(() => {
        if (!hasChanges || isNew) return;

        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
        }

        autoSaveTimerRef.current = setTimeout(handleAutoSave, autoSaveDelay);

        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }
        };
    }, [hasChanges, isNew, handleAutoSave, autoSaveDelay]);

    // Handle content change
    const handleContentChange = (value: string) => {
        setContent(value);
        setHasChanges(true);
        onContentChange?.(value);
    };

    // Handle manual save
    const handleManualSave = async () => {
        const tags = tagsInput
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);

        const result = await onSave({
            title: title || undefined,
            content,
            content_type: contentType,
            language: contentType === "code" ? language : undefined,
            tags: tags.length > 0 ? tags : undefined,
        });

        if (result.success) {
            setHasChanges(false);
            setLastSaved(new Date());
            setSaveError(null);
        } else {
            setSaveError(result.error || "Failed to save");
        }
    };

    // Handle delete
    const handleDelete = async () => {
        if (!onDelete) return;

        const confirmed = window.confirm(
            "Are you sure you want to delete this note? This action cannot be undone."
        );
        if (!confirmed) return;

        const result = await onDelete();
        if (result.success) {
            onClose?.();
        }
    };

    const selectedContentType = CONTENT_TYPE_OPTIONS.find((opt) => opt.value === contentType);

    return (
        <div className={cn("flex flex-col h-full bg-background", className)}>
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    {/* Title Input */}
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => {
                            setTitle(e.target.value);
                            setHasChanges(true);
                        }}
                        placeholder="Untitled Note"
                        className="flex-1 min-w-0 bg-transparent text-lg font-medium focus:outline-none placeholder:text-muted-foreground"
                    />
                </div>

                <div className="flex items-center gap-2">
                    {/* Save Status */}
                    {isSaving ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Saving...
                        </span>
                    ) : lastSaved ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Check className="h-3 w-3 text-green-500" />
                            Saved
                        </span>
                    ) : hasChanges ? (
                        <span className="text-xs text-amber-500">Unsaved changes</span>
                    ) : null}

                    {saveError && (
                        <span className="text-xs text-red-500">{saveError}</span>
                    )}

                    {/* Pin Button */}
                    {note && onTogglePinned && (
                        <button
                            onClick={onTogglePinned}
                            className={cn(
                                "p-2 rounded-lg hover:bg-accent transition-colors",
                                note.is_pinned
                                    ? "text-amber-500"
                                    : "text-muted-foreground"
                            )}
                            title={note.is_pinned ? "Unpin" : "Pin"}
                        >
                            {note.is_pinned ? (
                                <PinOff className="h-4 w-4" />
                            ) : (
                                <Pin className="h-4 w-4" />
                            )}
                        </button>
                    )}

                    {/* Save Button */}
                    <button
                        onClick={handleManualSave}
                        disabled={isSaving || (!hasChanges && !isNew)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Save className="h-4 w-4" />
                        Save
                    </button>

                    {/* Delete Button */}
                    {note && onDelete && (
                        <button
                            onClick={handleDelete}
                            className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                            title="Delete note"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    )}

                    {/* Close Button */}
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors"
                            title="Close"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-muted/30">
                {/* Content Type Selector */}
                <div className="relative" ref={contentTypeMenuRef}>
                    <button
                        onClick={() => setShowContentTypeMenu(!showContentTypeMenu)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-accent text-sm transition-colors"
                    >
                        {selectedContentType?.icon}
                        <span>{selectedContentType?.label}</span>
                        <ChevronDown className="h-3 w-3" />
                    </button>

                    {showContentTypeMenu && (
                        <div className="absolute top-full left-0 mt-1 z-50 min-w-[140px] rounded-lg border border-border bg-popover p-1 shadow-lg">
                            {CONTENT_TYPE_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => {
                                        setContentType(option.value);
                                        setHasChanges(true);
                                        setShowContentTypeMenu(false);
                                    }}
                                    className={cn(
                                        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors",
                                        contentType === option.value && "bg-accent"
                                    )}
                                >
                                    {option.icon}
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Language Selector (for code) */}
                {contentType === "code" && (
                    <div className="relative" ref={languageMenuRef}>
                        <button
                            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-accent text-sm transition-colors"
                        >
                            <span>{language || "Select language"}</span>
                            <ChevronDown className="h-3 w-3" />
                        </button>

                        {showLanguageMenu && (
                            <div className="absolute top-full left-0 mt-1 z-50 min-w-[140px] max-h-[300px] overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg">
                                {LANGUAGE_OPTIONS.map((lang) => (
                                    <button
                                        key={lang}
                                        onClick={() => {
                                            setLanguage(lang);
                                            setHasChanges(true);
                                            setShowLanguageMenu(false);
                                        }}
                                        className={cn(
                                            "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors capitalize",
                                            language === lang && "bg-accent"
                                        )}
                                    >
                                        {lang}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Tags Input */}
                <div className="flex-1">
                    <input
                        type="text"
                        value={tagsInput}
                        onChange={(e) => {
                            setTagsInput(e.target.value);
                            setHasChanges(true);
                        }}
                        placeholder="Tags (comma separated)"
                        className="w-full bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
                    />
                </div>
            </div>

            {/* Editor */}
            <div className="flex-1 overflow-hidden">
                <textarea
                    value={content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder={
                        contentType === "code"
                            ? "Write your code here..."
                            : contentType === "markdown"
                            ? "Write your note in Markdown..."
                            : "Write your note..."
                    }
                    className={cn(
                        "w-full h-full p-4 resize-none bg-background focus:outline-none",
                        contentType === "code" && "font-mono text-sm"
                    )}
                    spellCheck={contentType !== "code"}
                />
            </div>
        </div>
    );
}

export default NoteEditor;
