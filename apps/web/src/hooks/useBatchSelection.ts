"use client";

import { useState, useCallback, useMemo, useEffect } from "react";

export interface BatchSelectionOptions<T> {
    /** All available items */
    items: T[];
    /** Function to get unique ID from item */
    getId: (item: T) => string;
    /** Maximum number of items that can be selected (optional) */
    maxSelection?: number;
    /** Callback when selection changes */
    onSelectionChange?: (selectedIds: string[], selectedItems: T[]) => void;
    /** Initial selected IDs */
    initialSelection?: string[];
}

export interface BatchSelectionResult<T> {
    /** Set of selected item IDs */
    selectedIds: Set<string>;
    /** Array of selected items */
    selectedItems: T[];
    /** Number of selected items */
    selectionCount: number;
    /** Whether batch mode is active */
    isBatchMode: boolean;
    /** Whether all items are selected */
    isAllSelected: boolean;
    /** Whether some but not all items are selected */
    isPartiallySelected: boolean;
    /** Toggle batch mode on/off */
    toggleBatchMode: () => void;
    /** Enable batch mode */
    enableBatchMode: () => void;
    /** Disable batch mode and clear selection */
    disableBatchMode: () => void;
    /** Select a single item */
    select: (id: string) => void;
    /** Deselect a single item */
    deselect: (id: string) => void;
    /** Toggle selection of a single item */
    toggle: (id: string) => void;
    /** Select all items */
    selectAll: () => void;
    /** Deselect all items */
    deselectAll: () => void;
    /** Toggle select all */
    toggleSelectAll: () => void;
    /** Select range from last selected to target (Shift+Click behavior) */
    selectRange: (toId: string) => void;
    /** Check if an item is selected */
    isSelected: (id: string) => boolean;
    /** Clear all selections */
    clearSelection: () => void;
    /** Set selection to specific IDs */
    setSelection: (ids: string[]) => void;
    /** Get checkbox props for an item */
    getCheckboxProps: (id: string) => {
        checked: boolean;
        onChange: () => void;
        "aria-checked": boolean;
    };
    /** Get select all checkbox props */
    getSelectAllProps: () => {
        checked: boolean;
        indeterminate: boolean;
        onChange: () => void;
        "aria-checked": boolean | "mixed";
    };
}

export function useBatchSelection<T>({
    items,
    getId,
    maxSelection,
    onSelectionChange,
    initialSelection = [],
}: BatchSelectionOptions<T>): BatchSelectionResult<T> {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(
        new Set(initialSelection),
    );
    const [isBatchMode, setIsBatchMode] = useState(false);
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

    // Memoize item IDs for range selection
    const itemIds = useMemo(
        () => items.map((item) => getId(item)),
        [items, getId],
    );

    // Get selected items
    const selectedItems = useMemo(() => {
        return items.filter((item) => selectedIds.has(getId(item)));
    }, [items, selectedIds, getId]);

    // Notify on selection change
    useEffect(() => {
        if (onSelectionChange) {
            onSelectionChange(Array.from(selectedIds), selectedItems);
        }
    }, [selectedIds, selectedItems, onSelectionChange]);

    // Check if item is selected
    const isSelected = useCallback(
        (id: string) => selectedIds.has(id),
        [selectedIds],
    );

    // Select a single item
    const select = useCallback(
        (id: string) => {
            setSelectedIds((prev) => {
                if (maxSelection && prev.size >= maxSelection) {
                    return prev;
                }
                const next = new Set(prev);
                next.add(id);
                return next;
            });
            setLastSelectedId(id);
        },
        [maxSelection],
    );

    // Deselect a single item
    const deselect = useCallback((id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    }, []);

    // Toggle selection
    const toggle = useCallback(
        (id: string) => {
            if (selectedIds.has(id)) {
                deselect(id);
            } else {
                select(id);
            }
        },
        [selectedIds, select, deselect],
    );

    // Select range (Shift+Click behavior)
    const selectRange = useCallback(
        (toId: string) => {
            if (!lastSelectedId) {
                select(toId);
                return;
            }

            const fromIndex = itemIds.indexOf(lastSelectedId);
            const toIndex = itemIds.indexOf(toId);

            if (fromIndex === -1 || toIndex === -1) {
                select(toId);
                return;
            }

            const start = Math.min(fromIndex, toIndex);
            const end = Math.max(fromIndex, toIndex);
            const rangeIds = itemIds.slice(start, end + 1);

            setSelectedIds((prev) => {
                const next = new Set(prev);
                for (const id of rangeIds) {
                    if (maxSelection && next.size >= maxSelection) break;
                    next.add(id);
                }
                return next;
            });
            setLastSelectedId(toId);
        },
        [lastSelectedId, itemIds, select, maxSelection],
    );

    // Select all
    const selectAll = useCallback(() => {
        const allIds = maxSelection ? itemIds.slice(0, maxSelection) : itemIds;
        setSelectedIds(new Set(allIds));
    }, [itemIds, maxSelection]);

    // Deselect all
    const deselectAll = useCallback(() => {
        setSelectedIds(new Set());
        setLastSelectedId(null);
    }, []);

    // Toggle select all
    const toggleSelectAll = useCallback(() => {
        if (selectedIds.size === itemIds.length) {
            deselectAll();
        } else {
            selectAll();
        }
    }, [selectedIds.size, itemIds.length, selectAll, deselectAll]);

    // Clear selection
    const clearSelection = useCallback(() => {
        setSelectedIds(new Set());
        setLastSelectedId(null);
    }, []);

    // Set selection to specific IDs
    const setSelection = useCallback((ids: string[]) => {
        setSelectedIds(new Set(ids));
        if (ids.length > 0) {
            setLastSelectedId(ids[ids.length - 1]);
        }
    }, []);

    // Toggle batch mode
    const toggleBatchMode = useCallback(() => {
        setIsBatchMode((prev) => {
            if (prev) {
                // Clearing selection when exiting batch mode
                clearSelection();
            }
            return !prev;
        });
    }, [clearSelection]);

    // Enable batch mode
    const enableBatchMode = useCallback(() => {
        setIsBatchMode(true);
    }, []);

    // Disable batch mode
    const disableBatchMode = useCallback(() => {
        setIsBatchMode(false);
        clearSelection();
    }, [clearSelection]);

    // Computed values
    const selectionCount = selectedIds.size;
    const isAllSelected = items.length > 0 && selectedIds.size === items.length;
    const isPartiallySelected =
        selectedIds.size > 0 && selectedIds.size < items.length;

    // Get checkbox props for individual items
    const getCheckboxProps = useCallback(
        (id: string) => ({
            checked: selectedIds.has(id),
            onChange: () => toggle(id),
            "aria-checked": selectedIds.has(id),
        }),
        [selectedIds, toggle],
    );

    // Get select all checkbox props
    const getSelectAllProps = useCallback(
        () => ({
            checked: isAllSelected,
            indeterminate: isPartiallySelected,
            onChange: toggleSelectAll,
            "aria-checked": isPartiallySelected
                ? ("mixed" as const)
                : isAllSelected,
        }),
        [isAllSelected, isPartiallySelected, toggleSelectAll],
    );

    return {
        selectedIds,
        selectedItems,
        selectionCount,
        isBatchMode,
        isAllSelected,
        isPartiallySelected,
        toggleBatchMode,
        enableBatchMode,
        disableBatchMode,
        select,
        deselect,
        toggle,
        selectAll,
        deselectAll,
        toggleSelectAll,
        selectRange,
        isSelected,
        clearSelection,
        setSelection,
        getCheckboxProps,
        getSelectAllProps,
    };
}

// ============================================================================
// Batch Actions Helper
// ============================================================================

export interface BatchAction<T> {
    id: string;
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
    action: (items: T[]) => void | Promise<void>;
    /** Show confirmation dialog before action */
    confirmMessage?: string;
    /** Variant for styling */
    variant?: "default" | "destructive" | "primary";
    /** Disable action based on selection */
    isDisabled?: (items: T[]) => boolean;
}

export interface UseBatchActionsOptions<T> {
    /** Available batch actions */
    actions: BatchAction<T>[];
    /** Selected items */
    selectedItems: T[];
    /** Callback after action completes */
    onActionComplete?: (actionId: string, items: T[]) => void;
    /** Callback on action error */
    onActionError?: (actionId: string, error: Error) => void;
}

export interface UseBatchActionsResult<T> {
    /** Execute an action by ID */
    executeAction: (actionId: string) => Promise<void>;
    /** Get available actions (filtered by isDisabled) */
    availableActions: BatchAction<T>[];
    /** Whether any action is currently executing */
    isExecuting: boolean;
    /** Currently executing action ID */
    executingActionId: string | null;
}

export function useBatchActions<T>({
    actions,
    selectedItems,
    onActionComplete,
    onActionError,
}: UseBatchActionsOptions<T>): UseBatchActionsResult<T> {
    const [isExecuting, setIsExecuting] = useState(false);
    const [executingActionId, setExecutingActionId] = useState<string | null>(
        null,
    );

    // Filter available actions
    const availableActions = useMemo(() => {
        return actions.filter((action) => {
            if (action.isDisabled) {
                return !action.isDisabled(selectedItems);
            }
            return true;
        });
    }, [actions, selectedItems]);

    // Execute an action
    const executeAction = useCallback(
        async (actionId: string) => {
            const action = actions.find((a) => a.id === actionId);
            if (!action) return;

            setIsExecuting(true);
            setExecutingActionId(actionId);

            try {
                await action.action(selectedItems);
                if (onActionComplete) {
                    onActionComplete(actionId, selectedItems);
                }
            } catch (error) {
                if (onActionError) {
                    onActionError(actionId, error as Error);
                }
            } finally {
                setIsExecuting(false);
                setExecutingActionId(null);
            }
        },
        [actions, selectedItems, onActionComplete, onActionError],
    );

    return {
        executeAction,
        availableActions,
        isExecuting,
        executingActionId,
    };
}

// ============================================================================
// Keyboard Shortcuts for Batch Selection
// ============================================================================

export function useBatchKeyboardShortcuts({
    isBatchMode,
    enableBatchMode,
    disableBatchMode,
    selectAll,
    deselectAll,
    selectedIds,
}: {
    isBatchMode: boolean;
    enableBatchMode: () => void;
    disableBatchMode: () => void;
    selectAll: () => void;
    deselectAll: () => void;
    selectedIds: Set<string>;
}) {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Don't trigger if typing in input
            const target = event.target as HTMLElement;
            if (
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable
            ) {
                return;
            }

            // Ctrl/Cmd + A to select all (when in batch mode)
            if (
                (event.ctrlKey || event.metaKey) &&
                event.key === "a" &&
                isBatchMode
            ) {
                event.preventDefault();
                selectAll();
                return;
            }

            // Escape to exit batch mode or clear selection
            if (event.key === "Escape") {
                if (selectedIds.size > 0) {
                    deselectAll();
                } else if (isBatchMode) {
                    disableBatchMode();
                }
                return;
            }

            // B to toggle batch mode
            if (event.key === "b" && !event.ctrlKey && !event.metaKey) {
                if (isBatchMode) {
                    disableBatchMode();
                } else {
                    enableBatchMode();
                }
                return;
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [
        isBatchMode,
        enableBatchMode,
        disableBatchMode,
        selectAll,
        deselectAll,
        selectedIds,
    ]);
}
