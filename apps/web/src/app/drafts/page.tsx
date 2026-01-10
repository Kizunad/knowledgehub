"use client";

import { useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { DraftsPad } from "@/components/drafts";
import { FileText, RefreshCw, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDrafts } from "@/hooks/useDrafts";
import { useSources } from "@/hooks/useSources";
import { DraftContentType } from "@/store/draftsStore";

export default function DraftsPage() {
    // Fetch drafts
    const {
        allDrafts,
        activeDraft,
        isLoading,
        isSaving,
        error,
        createLocalDraft,
        updateDraft,
        autoSaveDraft,
        deleteDraft,
        saveDraftAsNote,
        setActiveDraft,
        refresh,
    } = useDrafts({ autoFetch: true });

    // Fetch sources for save-to-space functionality
    const { sources } = useSources({ autoFetch: true });

    // Handle creating a new draft
    const handleCreateDraft = useCallback(
        (contentType: DraftContentType = "markdown") => {
            const newDraft = createLocalDraft({
                content: "",
                content_type: contentType,
            });
            setActiveDraft(newDraft.id);
        },
        [createLocalDraft, setActiveDraft]
    );

    // Handle selecting a draft
    const handleSelectDraft = useCallback(
        (draft: { id: string }) => {
            setActiveDraft(draft.id);
        },
        [setActiveDraft]
    );

    // Handle updating a draft
    const handleUpdateDraft = useCallback(
        (id: string, updates: Record<string, unknown>) => {
            updateDraft(id, updates);
        },
        [updateDraft]
    );

    // Handle auto-save
    const handleAutoSave = useCallback(
        (id: string, content: string) => {
            autoSaveDraft(id, content, 1000);
        },
        [autoSaveDraft]
    );

    // Handle delete
    const handleDelete = useCallback(
        async (id: string) => {
            return deleteDraft(id);
        },
        [deleteDraft]
    );

    // Handle save as note
    const handleSaveAsNote = useCallback(
        async (draftId: string, sourceId: string) => {
            return saveDraftAsNote(draftId, sourceId);
        },
        [saveDraftAsNote]
    );

    return (
        <AppShell>
            <div className="flex flex-col h-[calc(100vh-4rem)]">
                {/* Page Header */}
                <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                            <FileText className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold">
                                Drafts
                            </h1>
                            <p className="text-xs md:text-sm text-muted-foreground">
                                Scratch Pad & Quick Notes
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => refresh()}
                            disabled={isLoading}
                            className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                            title="Refresh"
                        >
                            <RefreshCw
                                className={cn(
                                    "h-4 w-4",
                                    isLoading && "animate-spin"
                                )}
                            />
                        </button>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mx-6 mt-4 flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Main Content */}
                {isLoading && allDrafts.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="flex-1 overflow-hidden">
                        <DraftsPad
                            drafts={allDrafts}
                            activeDraft={activeDraft || null}
                            onDraftSelect={handleSelectDraft}
                            onDraftCreate={handleCreateDraft}
                            onDraftUpdate={handleUpdateDraft}
                            onDraftDelete={handleDelete}
                            onAutoSave={handleAutoSave}
                            onSaveAsNote={handleSaveAsNote}
                            sources={sources}
                            isSaving={isSaving}
                            className="h-full"
                        />
                    </div>
                )}

                {/* Info Footer */}
                <div className="px-6 py-3 border-t border-border bg-muted/30">
                    <p className="text-xs text-muted-foreground text-center">
                        Drafts are auto-saved locally. Save to a Space to persist as notes.
                    </p>
                </div>
            </div>
        </AppShell>
    );
}
