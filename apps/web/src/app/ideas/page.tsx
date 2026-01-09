"use client";

import { useState, useCallback, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
    Lightbulb,
    Plus,
    Search,
    Hash,
    Archive,
    CheckCircle2,
    Inbox,
    MoreVertical,
    Filter,
    Trash2,
    ArrowRight,
    Loader2,
    AlertCircle,
    RefreshCw,
    Download,
    CheckSquare,
    Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIdeas, useBatchSelection, useExport } from "@/hooks";
import { type IdeaStatus, type Idea } from "@/store";
import { SortableContainer, SortableItem } from "@/components/ui/Sortable";
import {
    BatchActionBar,
    createDeleteAction,
    createArchiveAction,
    createExportAction,
} from "@/components/ui/BatchActionBar";
import { ExportDialog } from "@/components/ui/ExportDialog";
import type { ExportFormat } from "@/hooks/useExport";

// Helper to format relative time
function formatRelativeTime(dateString: string): string {
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
}

// Context Menu Props
interface ContextMenuProps {
    idea: Idea;
    onMove: (id: string, status: IdeaStatus) => void;
    onDelete: (id: string) => void;
    isDeleting: boolean;
}

function IdeaContextMenu({
    idea,
    onMove,
    onDelete,
    isDeleting,
}: ContextMenuProps) {
    const [isOpen, setIsOpen] = useState(false);

    const handleMove = (status: IdeaStatus) => {
        onMove(idea.id, status);
        setIsOpen(false);
    };

    const handleDelete = () => {
        onDelete(idea.id);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "p-1.5 rounded-md transition-colors",
                    isOpen
                        ? "bg-accent text-foreground"
                        : "hover:bg-accent text-muted-foreground hover:text-foreground",
                )}
            >
                <MoreVertical className="h-4 w-4" />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-lg border border-border bg-popover p-1 shadow-lg">
                        {idea.status !== "inbox" && (
                            <button
                                onClick={() => handleMove("inbox")}
                                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
                            >
                                <Inbox className="h-4 w-4" />
                                Move to Inbox
                            </button>
                        )}
                        {idea.status !== "active" && (
                            <button
                                onClick={() => handleMove("active")}
                                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
                            >
                                <ArrowRight className="h-4 w-4" />
                                Make Active
                            </button>
                        )}
                        {idea.status !== "archive" && (
                            <button
                                onClick={() => handleMove("archive")}
                                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
                            >
                                <Archive className="h-4 w-4" />
                                Archive
                            </button>
                        )}
                        <div className="my-1 h-px bg-border" />
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

// Main Ideas Page
export default function IdeasPage() {
    const [activeTab, setActiveTab] = useState<IdeaStatus>("inbox");
    const [input, setInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    const [isBatchMode, setIsBatchMode] = useState(false);
    const [showExportDialog, setShowExportDialog] = useState(false);
    const [orderedIds, setOrderedIds] = useState<string[]>([]);

    // Use the ideas hook
    const {
        ideas: apiIdeas,
        isLoading,
        isCreating,
        isUpdating,
        isDeleting,
        error,
        createIdea,
        toggleDone,
        moveIdea,
        deleteIdea,
        refresh,
    } = useIdeas({ autoFetch: true });

    // Use API ideas directly
    const ideas = apiIdeas;

    // Get counts for tabs
    const inboxCount = ideas.filter((i) => i.status === "inbox").length;
    const activeCount = ideas.filter((i) => i.status === "active").length;
    const archiveCount = ideas.filter((i) => i.status === "archive").length;

    // Filter ideas by status and search query
    const filteredIdeas = useMemo(() => {
        return ideas.filter((idea) => {
            const matchesStatus = idea.status === activeTab;
            const matchesSearch =
                searchQuery === "" ||
                idea.content
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()) ||
                (idea.tags &&
                    idea.tags.some((tag) =>
                        tag.toLowerCase().includes(searchQuery.toLowerCase()),
                    ));
            return matchesStatus && matchesSearch;
        });
    }, [ideas, activeTab, searchQuery]);

    // Sort by order if available
    const sortedIdeas = useMemo(() => {
        if (orderedIds.length === 0) return filteredIdeas;
        return [...filteredIdeas].sort((a, b) => {
            const aIndex = orderedIds.indexOf(a.id);
            const bIndex = orderedIds.indexOf(b.id);
            if (aIndex === -1 && bIndex === -1) return 0;
            if (aIndex === -1) return 1;
            if (bIndex === -1) return -1;
            return aIndex - bIndex;
        });
    }, [filteredIdeas, orderedIds]);

    // Batch selection
    const batchSelection = useBatchSelection({
        items: sortedIdeas,
        getId: (idea) => idea.id,
    });

    // Export hook
    const exportHook = useExport<Idea>({
        defaultFilename: "ideas",
        onExportSuccess: (result) => {
            console.log("Export successful:", result.filename);
        },
    });

    // Handle creating a new idea
    const handleCreate = useCallback(async () => {
        if (!input.trim()) return;

        const result = await createIdea({
            content: input.trim(),
            status: "inbox",
        });
        if (result.success) {
            setInput("");
        }
    }, [input, createIdea]);

    // Handle toggle done
    const handleToggleDone = useCallback(
        async (id: string) => {
            await toggleDone(id);
        },
        [toggleDone],
    );

    // Handle move idea
    const handleMoveIdea = useCallback(
        async (id: string, status: IdeaStatus) => {
            await moveIdea(id, status);
        },
        [moveIdea],
    );

    // Handle delete idea
    const handleDeleteIdea = useCallback(
        async (id: string) => {
            await deleteIdea(id);
        },
        [deleteIdea],
    );

    // Handle batch delete
    const handleBatchDelete = useCallback(async () => {
        const selectedIds = Array.from(batchSelection.selectedIds);
        for (const id of selectedIds) {
            await handleDeleteIdea(id);
        }
        batchSelection.clearSelection();
        setIsBatchMode(false);
    }, [batchSelection, handleDeleteIdea]);

    // Handle batch archive
    const handleBatchArchive = useCallback(async () => {
        const selectedIds = Array.from(batchSelection.selectedIds);
        for (const id of selectedIds) {
            await handleMoveIdea(id, "archive");
        }
        batchSelection.clearSelection();
        setIsBatchMode(false);
    }, [batchSelection, handleMoveIdea]);

    // Handle export
    const handleExport = useCallback(
        async (format: ExportFormat) => {
            const itemsToExport =
                batchSelection.selectedItems.length > 0
                    ? batchSelection.selectedItems
                    : sortedIdeas;

            await exportHook.exportItems(itemsToExport, { format });
            setShowExportDialog(false);
        },
        [batchSelection.selectedItems, sortedIdeas, exportHook],
    );

    // Handle copy to clipboard
    const handleCopyToClipboard = useCallback(
        async (format: ExportFormat) => {
            const itemsToExport =
                batchSelection.selectedItems.length > 0
                    ? batchSelection.selectedItems
                    : sortedIdeas;

            await exportHook.exportToClipboard(itemsToExport, { format });
        },
        [batchSelection.selectedItems, sortedIdeas, exportHook],
    );

    // Handle reorder
    const handleReorder = useCallback(
        (activeId: string, overId: string) => {
            setOrderedIds((prev) => {
                const currentIds =
                    prev.length > 0 ? prev : sortedIdeas.map((i) => i.id);
                const oldIndex = currentIds.indexOf(activeId);
                const newIndex = currentIds.indexOf(overId);

                if (oldIndex === -1 || newIndex === -1) return prev;

                const newIds = [...currentIds];
                newIds.splice(oldIndex, 1);
                newIds.splice(newIndex, 0, activeId);

                return newIds;
            });
        },
        [sortedIdeas],
    );

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && input.trim()) {
            e.preventDefault();
            handleCreate();
        }
    };

    // Toggle batch mode
    const toggleBatchMode = () => {
        if (isBatchMode) {
            batchSelection.clearSelection();
        }
        setIsBatchMode(!isBatchMode);
    };

    const TabButton = ({
        status,
        label,
        icon: Icon,
        count,
    }: {
        status: IdeaStatus;
        label: string;
        icon: React.ComponentType<{ className?: string }>;
        count: number;
    }) => (
        <button
            onClick={() => setActiveTab(status)}
            className={cn(
                "flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all",
                activeTab === status
                    ? "bg-ideas text-white shadow-md shadow-ideas/20"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
        >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
            <span
                className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full",
                    activeTab === status
                        ? "bg-white/20 text-white"
                        : "bg-muted text-muted-foreground",
                )}
            >
                {count}
            </span>
        </button>
    );

    // Batch actions
    const batchActions = [
        createArchiveAction(handleBatchArchive, isUpdating),
        createDeleteAction(handleBatchDelete, isDeleting),
        createExportAction(
            () => setShowExportDialog(true),
            exportHook.isExporting,
        ),
    ];

    // Item IDs for sortable context
    const itemIds = useMemo(() => sortedIdeas.map((i) => i.id), [sortedIdeas]);

    return (
        <AppShell>
            <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-ideas/10 text-ideas">
                            <Lightbulb className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold">
                                Ideas
                            </h1>
                            <p className="text-xs md:text-sm text-muted-foreground">
                                Capture & Organize
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Batch Mode Toggle */}
                        <button
                            onClick={toggleBatchMode}
                            className={cn(
                                "p-2 rounded-lg transition-colors",
                                isBatchMode
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-accent text-muted-foreground hover:text-foreground",
                            )}
                            title={
                                isBatchMode
                                    ? "Exit batch mode"
                                    : "Enter batch mode"
                            }
                        >
                            <CheckSquare className="h-4 w-4" />
                        </button>

                        {/* Export Button */}
                        <button
                            onClick={() => setShowExportDialog(true)}
                            className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                            title="Export ideas"
                        >
                            <Download className="h-4 w-4" />
                        </button>

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
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search ideas..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-9 rounded-md border border-input bg-background pl-9 pr-4 text-sm outline-none focus:border-ideas focus:ring-1 focus:ring-ideas/20 transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Quick Capture */}
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        {isCreating ? (
                            <Loader2 className="h-5 w-5 text-ideas animate-spin" />
                        ) : (
                            <Plus className="h-5 w-5 text-muted-foreground group-focus-within:text-ideas transition-colors" />
                        )}
                    </div>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isCreating}
                        placeholder="Capture a new idea... (Press Enter to save)"
                        className="w-full h-12 md:h-14 pl-12 pr-4 rounded-xl border border-border bg-card shadow-sm text-base md:text-lg outline-none focus:border-ideas focus:ring-4 focus:ring-ideas/10 transition-all placeholder:text-muted-foreground/50 disabled:opacity-50"
                    />
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity">
                        <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded border border-border bg-muted px-2 font-mono text-[10px] font-medium text-muted-foreground">
                            <span className="text-xs">↵</span> Enter
                        </kbd>
                    </div>
                </div>

                {/* Tabs & Content */}
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border">
                            <TabButton
                                status="inbox"
                                label="Inbox"
                                icon={Inbox}
                                count={inboxCount}
                            />
                            <TabButton
                                status="active"
                                label="Active"
                                icon={CheckCircle2}
                                count={activeCount}
                            />
                            <TabButton
                                status="archive"
                                label="Archive"
                                icon={Archive}
                                count={archiveCount}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            {isBatchMode && sortedIdeas.length > 0 && (
                                <button
                                    onClick={batchSelection.toggleSelectAll}
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {batchSelection.isAllSelected ? (
                                        <>
                                            <CheckSquare className="h-4 w-4" />
                                            Deselect all
                                        </>
                                    ) : (
                                        <>
                                            <Square className="h-4 w-4" />
                                            Select all
                                        </>
                                    )}
                                </button>
                            )}
                            <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                                <Filter className="h-4 w-4" />
                                <span>Filter</span>
                            </button>
                        </div>
                    </div>

                    <div className="rounded-xl border border-border bg-card overflow-visible shadow-sm">
                        {isLoading && ideas.length === 0 ? (
                            <div className="p-8 md:p-12 text-center text-muted-foreground">
                                <Loader2 className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-4 animate-spin opacity-50" />
                                <p>Loading ideas...</p>
                            </div>
                        ) : sortedIdeas.length === 0 ? (
                            <div className="p-8 md:p-12 text-center text-muted-foreground">
                                <Lightbulb className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-4 opacity-20" />
                                <p>
                                    {searchQuery
                                        ? `No ideas matching "${searchQuery}" in ${activeTab}`
                                        : `No ideas found in ${activeTab}`}
                                </p>
                            </div>
                        ) : (
                            <SortableContainer
                                items={itemIds}
                                onReorder={handleReorder}
                                disabled={isBatchMode}
                            >
                                <ul className="divide-y divide-border">
                                    {sortedIdeas.map((idea) => (
                                        <SortableItem
                                            key={idea.id}
                                            id={idea.id}
                                            handlePosition={
                                                isBatchMode ? "none" : "start"
                                            }
                                            className={cn(
                                                "flex items-start gap-2",
                                            )}
                                        >
                                            <li
                                                className={cn(
                                                    "group flex items-start gap-3 md:gap-4 p-3 md:p-4 hover:bg-accent/30 transition-colors flex-1",
                                                    (isUpdating ||
                                                        isDeleting) &&
                                                        "opacity-50 pointer-events-none",
                                                    batchSelection.isSelected(
                                                        idea.id,
                                                    ) && "bg-primary/5",
                                                )}
                                            >
                                                {/* Batch Selection Checkbox */}
                                                {isBatchMode ? (
                                                    <div className="pt-0.5 md:pt-1 flex-shrink-0">
                                                        <button
                                                            onClick={() =>
                                                                batchSelection.toggle(
                                                                    idea.id,
                                                                )
                                                            }
                                                            className={cn(
                                                                "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                                                                batchSelection.isSelected(
                                                                    idea.id,
                                                                )
                                                                    ? "bg-primary border-primary text-primary-foreground"
                                                                    : "border-muted-foreground/30 hover:border-primary",
                                                            )}
                                                        >
                                                            {batchSelection.isSelected(
                                                                idea.id,
                                                            ) && (
                                                                <CheckCircle2 className="h-3 w-3" />
                                                            )}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="pt-0.5 md:pt-1 flex-shrink-0">
                                                        <input
                                                            type="checkbox"
                                                            checked={idea.done}
                                                            onChange={() =>
                                                                handleToggleDone(
                                                                    idea.id,
                                                                )
                                                            }
                                                            className="idea-checkbox"
                                                        />
                                                    </div>
                                                )}

                                                <div className="flex-1 min-w-0 space-y-1">
                                                    <div
                                                        className={cn(
                                                            "text-sm md:text-base transition-colors break-words",
                                                            idea.done
                                                                ? "text-muted-foreground line-through decoration-muted-foreground/50"
                                                                : "text-foreground",
                                                        )}
                                                    >
                                                        {idea.content}
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {idea.tags &&
                                                            idea.tags.map(
                                                                (tag) => (
                                                                    <span
                                                                        key={
                                                                            tag
                                                                        }
                                                                        className="idea-tag text-xs inline-flex items-center"
                                                                    >
                                                                        <Hash className="h-3 w-3 mr-0.5 opacity-50" />
                                                                        {tag}
                                                                    </span>
                                                                ),
                                                            )}
                                                        {idea.refs &&
                                                            idea.refs.map(
                                                                (ref) => (
                                                                    <span
                                                                        key={
                                                                            ref
                                                                        }
                                                                        className="inline-flex items-center text-xs text-primary hover:underline cursor-pointer"
                                                                    >
                                                                        {ref}
                                                                    </span>
                                                                ),
                                                            )}
                                                        <span className="text-xs text-muted-foreground ml-auto group-hover:opacity-100 opacity-60 transition-opacity">
                                                            {formatRelativeTime(
                                                                idea.created_at,
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>

                                                {!isBatchMode && (
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center flex-shrink-0">
                                                        <IdeaContextMenu
                                                            idea={idea}
                                                            onMove={
                                                                handleMoveIdea
                                                            }
                                                            onDelete={
                                                                handleDeleteIdea
                                                            }
                                                            isDeleting={
                                                                isDeleting
                                                            }
                                                        />
                                                    </div>
                                                )}
                                            </li>
                                        </SortableItem>
                                    ))}
                                </ul>
                            </SortableContainer>
                        )}
                    </div>
                </div>
            </div>

            {/* Batch Action Bar */}
            <BatchActionBar
                selectedCount={batchSelection.selectionCount}
                totalCount={sortedIdeas.length}
                actions={batchActions}
                onClearSelection={batchSelection.clearSelection}
                onSelectAll={batchSelection.selectAll}
                visible={isBatchMode && batchSelection.selectionCount > 0}
            />

            {/* Export Dialog */}
            <ExportDialog
                isOpen={showExportDialog}
                onClose={() => setShowExportDialog(false)}
                onExport={handleExport}
                onCopy={handleCopyToClipboard}
                title="Export Ideas"
                description="Export your ideas to a file"
                itemCount={
                    batchSelection.selectedItems.length > 0
                        ? batchSelection.selectedItems.length
                        : sortedIdeas.length
                }
                itemType="ideas"
                isExporting={exportHook.isExporting}
                filenamePrefix="ideas"
            />
        </AppShell>
    );
}
