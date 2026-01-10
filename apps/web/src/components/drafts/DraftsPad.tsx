"use client";

import { useState, useEffect, useCallback } from "react";
import {
    FileText,
    Code,
    AlignLeft,
    Plus,
    Trash2,
    Save,
    Upload,
    X,
    Loader2,
    ChevronDown,
    Clock,
    FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Draft, DraftContentType } from "@/store/draftsStore";
import { DirectorySource } from "@/store/sourcesStore";

interface DraftsPadProps {
    drafts: Draft[];
    activeDraft: Draft | null;
    onDraftSelect: (draft: Draft) => void;
    onDraftCreate: (contentType?: DraftContentType) => void;
    onDraftUpdate: (id: string, updates: Partial<Draft>) => void;
    onDraftDelete: (id: string) => Promise<{ success: boolean; error?: string }>;
    onAutoSave: (id: string, content: string) => void;
    onSaveAsNote?: (draftId: string, sourceId: string) => Promise<{ success: boolean; error?: string }>;
    sources?: DirectorySource[];
    isSaving?: boolean;
    className?: string;
}

const CONTENT_TYPE_OPTIONS: { value: DraftContentType; label: string; icon: React.ReactNode }[] = [
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

function getPreview(content: string, maxLength: number = 50): string {
    if (!content) return "Empty draft";
    const cleaned = content.replace(/\s+/g, " ").trim();
    if (cleaned.length <= maxLength) return cleaned;
    return cleaned.substring(0, maxLength) + "...";
}

export function DraftsPad({
    drafts,
    activeDraft,
    onDraftSelect,
    onDraftCreate,
    onDraftUpdate,
    onDraftDelete,
    onAutoSave,
    onSaveAsNote,
    sources = [],
    isSaving = false,
    className,
}: DraftsPadProps) {
    const [title, setTitle] = useState(activeDraft?.title || "");
    const [content, setContent] = useState(activeDraft?.content || "");
    const [contentType, setContentType] = useState<DraftContentType>(
        activeDraft?.content_type || "markdown"
    );
    const [language, setLanguage] = useState(activeDraft?.language || "");
    const [showContentTypeMenu, setShowContentTypeMenu] = useState(false);
    const [showLanguageMenu, setShowLanguageMenu] = useState(false);
    const [showSaveToModal, setShowSaveToModal] = useState(false);
    const [showNewDraftMenu, setShowNewDraftMenu] = useState(false);
    const [selectedSourceId, setSelectedSourceId] = useState<string>("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSavingToNote, setIsSavingToNote] = useState(false);

    // Update local state when active draft changes
    useEffect(() => {
        if (activeDraft) {
            setTitle(activeDraft.title || "");
            setContent(activeDraft.content || "");
            setContentType(activeDraft.content_type);
            setLanguage(activeDraft.language || "");
        } else {
            setTitle("");
            setContent("");
            setContentType("markdown");
            setLanguage("");
        }
    }, [activeDraft?.id]);

    // Handle content change with auto-save
    const handleContentChange = useCallback(
        (value: string) => {
            setContent(value);
            if (activeDraft) {
                onAutoSave(activeDraft.id, value);
            }
        },
        [activeDraft, onAutoSave]
    );

    // Handle title change
    const handleTitleChange = useCallback(
        (value: string) => {
            setTitle(value);
            if (activeDraft) {
                onDraftUpdate(activeDraft.id, { title: value });
            }
        },
        [activeDraft, onDraftUpdate]
    );

    // Handle content type change
    const handleContentTypeChange = useCallback(
        (type: DraftContentType) => {
            setContentType(type);
            setShowContentTypeMenu(false);
            if (activeDraft) {
                onDraftUpdate(activeDraft.id, { content_type: type });
            }
        },
        [activeDraft, onDraftUpdate]
    );

    // Handle language change
    const handleLanguageChange = useCallback(
        (lang: string) => {
            setLanguage(lang);
            setShowLanguageMenu(false);
            if (activeDraft) {
                onDraftUpdate(activeDraft.id, { language: lang });
            }
        },
        [activeDraft, onDraftUpdate]
    );

    // Handle delete
    const handleDelete = async () => {
        if (!activeDraft) return;

        const confirmed = window.confirm(
            "Are you sure you want to delete this draft?"
        );
        if (!confirmed) return;

        setIsDeleting(true);
        await onDraftDelete(activeDraft.id);
        setIsDeleting(false);
    };

    // Handle save to space as note
    const handleSaveToSpace = async () => {
        if (!activeDraft || !selectedSourceId || !onSaveAsNote) return;

        setIsSavingToNote(true);
        const result = await onSaveAsNote(activeDraft.id, selectedSourceId);
        setIsSavingToNote(false);

        if (result.success) {
            setShowSaveToModal(false);
            setSelectedSourceId("");
        }
    };

    const selectedContentType = CONTENT_TYPE_OPTIONS.find(
        (opt) => opt.value === contentType
    );

    const studySpaces = sources.filter((s) => s.mode === "local_sync");

    return (
        <div className={cn("flex h-full", className)}>
            {/* Drafts List Sidebar */}
            <div className="w-64 flex-shrink-0 border-r border-border flex flex-col bg-muted/30">
                {/* Header */}
                <div className="flex items-center justify-between gap-2 px-3 py-3 border-b border-border">
                    <h2 className="font-semibold text-sm">Drafts</h2>
                    <div className="relative">
                        <button
                            onClick={() => setShowNewDraftMenu(!showNewDraftMenu)}
                            className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                        >
                            <Plus className="h-3 w-3" />
                            New
                        </button>

                        {showNewDraftMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowNewDraftMenu(false)}
                                />
                                <div className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded-lg border border-border bg-popover p-1 shadow-lg">
                                    {CONTENT_TYPE_OPTIONS.map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => {
                                                onDraftCreate(option.value);
                                                setShowNewDraftMenu(false);
                                            }}
                                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
                                        >
                                            {option.icon}
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Drafts List */}
                <div className="flex-1 overflow-y-auto">
                    {drafts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                            <FileText className="h-6 w-6 text-muted-foreground opacity-50 mb-2" />
                            <p className="text-xs text-muted-foreground">
                                No drafts yet
                            </p>
                            <button
                                onClick={() => onDraftCreate()}
                                className="mt-2 text-xs text-primary hover:underline"
                            >
                                Create a draft
                            </button>
                        </div>
                    ) : (
                        <div className="p-2 space-y-1">
                            {drafts.map((draft) => (
                                <button
                                    key={draft.id}
                                    onClick={() => onDraftSelect(draft)}
                                    className={cn(
                                        "w-full text-left p-2 rounded-lg transition-colors",
                                        activeDraft?.id === draft.id
                                            ? "bg-primary/10 border border-primary/30"
                                            : "hover:bg-accent"
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        {draft.content_type === "code" ? (
                                            <Code className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                        ) : draft.content_type === "plaintext" ? (
                                            <AlignLeft className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                        ) : (
                                            <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                        )}
                                        <span
                                            className={cn(
                                                "text-sm font-medium truncate",
                                                !draft.title && "text-muted-foreground italic"
                                            )}
                                        >
                                            {draft.title || "Untitled"}
                                        </span>
                                        {draft.id.startsWith("local_") && (
                                            <span className="flex-shrink-0 text-[10px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-500">
                                                local
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                                        {getPreview(draft.content)}
                                    </p>
                                    <div className="flex items-center gap-1 mt-1">
                                        <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                                        <span className="text-[10px] text-muted-foreground">
                                            {formatRelativeTime(draft.updated_at)}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {activeDraft ? (
                    <>
                        {/* Editor Header */}
                        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => handleTitleChange(e.target.value)}
                                placeholder="Untitled Draft"
                                className="flex-1 min-w-0 bg-transparent text-lg font-medium focus:outline-none placeholder:text-muted-foreground"
                            />

                            <div className="flex items-center gap-2">
                                {/* Save Status */}
                                {isSaving && (
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Saving...
                                    </span>
                                )}

                                {/* Save to Space Button */}
                                {onSaveAsNote && studySpaces.length > 0 && (
                                    <button
                                        onClick={() => setShowSaveToModal(true)}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-accent transition-colors"
                                    >
                                        <Save className="h-4 w-4" />
                                        Save to Space
                                    </button>
                                )}

                                {/* Delete Button */}
                                <button
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                                    title="Delete draft"
                                >
                                    {isDeleting ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Toolbar */}
                        <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-muted/30">
                            {/* Content Type Selector */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowContentTypeMenu(!showContentTypeMenu)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-accent text-sm transition-colors"
                                >
                                    {selectedContentType?.icon}
                                    <span>{selectedContentType?.label}</span>
                                    <ChevronDown className="h-3 w-3" />
                                </button>

                                {showContentTypeMenu && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setShowContentTypeMenu(false)}
                                        />
                                        <div className="absolute left-0 top-full mt-1 z-50 min-w-[140px] rounded-lg border border-border bg-popover p-1 shadow-lg">
                                            {CONTENT_TYPE_OPTIONS.map((option) => (
                                                <button
                                                    key={option.value}
                                                    onClick={() =>
                                                        handleContentTypeChange(option.value)
                                                    }
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
                                    </>
                                )}
                            </div>

                            {/* Language Selector (for code) */}
                            {contentType === "code" && (
                                <div className="relative">
                                    <button
                                        onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-accent text-sm transition-colors"
                                    >
                                        <span>{language || "Select language"}</span>
                                        <ChevronDown className="h-3 w-3" />
                                    </button>

                                    {showLanguageMenu && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-40"
                                                onClick={() => setShowLanguageMenu(false)}
                                            />
                                            <div className="absolute left-0 top-full mt-1 z-50 min-w-[140px] max-h-[300px] overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg">
                                                {LANGUAGE_OPTIONS.map((lang) => (
                                                    <button
                                                        key={lang}
                                                        onClick={() => handleLanguageChange(lang)}
                                                        className={cn(
                                                            "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors capitalize",
                                                            language === lang && "bg-accent"
                                                        )}
                                                    >
                                                        {lang}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            <div className="flex-1" />

                            {/* Auto-save indicator */}
                            <span className="text-xs text-muted-foreground">
                                Auto-saved {formatRelativeTime(activeDraft.updated_at)}
                            </span>
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
                                        ? "Write in Markdown..."
                                        : "Write here..."
                                }
                                className={cn(
                                    "w-full h-full p-4 resize-none bg-background focus:outline-none",
                                    contentType === "code" && "font-mono text-sm"
                                )}
                                spellCheck={contentType !== "code"}
                            />
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                        <FileText className="h-12 w-12 text-muted-foreground opacity-30 mb-4" />
                        <h3 className="text-lg font-medium mb-2">No draft selected</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Select a draft from the sidebar or create a new one
                        </p>
                        <button
                            onClick={() => onDraftCreate()}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            New Draft
                        </button>
                    </div>
                )}
            </div>

            {/* Save to Space Modal */}
            {showSaveToModal && (
                <>
                    <div
                        className="fixed inset-0 z-50 bg-black/50"
                        onClick={() => setShowSaveToModal(false)}
                    />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="w-full max-w-md rounded-xl border border-border bg-background shadow-xl">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                                <h3 className="font-semibold">Save to Space</h3>
                                <button
                                    onClick={() => setShowSaveToModal(false)}
                                    className="p-1 rounded hover:bg-accent transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="p-4 space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    Choose a study space to save this draft as a note.
                                    The draft will be deleted after saving.
                                </p>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        Select Space
                                    </label>
                                    <div className="grid gap-2">
                                        {studySpaces.map((space) => (
                                            <button
                                                key={space.id}
                                                onClick={() => setSelectedSourceId(space.id)}
                                                className={cn(
                                                    "flex items-center gap-3 p-3 rounded-lg border text-left transition-colors",
                                                    selectedSourceId === space.id
                                                        ? "border-primary bg-primary/5"
                                                        : "border-border hover:bg-accent"
                                                )}
                                            >
                                                <FolderOpen className="h-5 w-5 text-muted-foreground" />
                                                <div>
                                                    <div className="font-medium">{space.name}</div>
                                                    {space.description && (
                                                        <div className="text-xs text-muted-foreground">
                                                            {space.description}
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
                                <button
                                    onClick={() => setShowSaveToModal(false)}
                                    className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveToSpace}
                                    disabled={!selectedSourceId || isSavingToNote}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isSavingToNote ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-4 w-4" />
                                            Save as Note
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default DraftsPad;
