"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
    X,
    CheckSquare,
    Trash2,
    Archive,
    Download,
    Copy,
    MoreHorizontal,
    Loader2,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface BatchAction {
    /** Unique identifier for the action */
    id: string;
    /** Display label */
    label: string;
    /** Icon component */
    icon?: React.ComponentType<{ className?: string }>;
    /** Action handler */
    onClick: () => void;
    /** Whether action is currently loading */
    isLoading?: boolean;
    /** Disable the action */
    disabled?: boolean;
    /** Style variant */
    variant?: "default" | "primary" | "destructive";
    /** Show in overflow menu instead of main bar */
    overflow?: boolean;
}

export interface BatchActionBarProps {
    /** Number of selected items */
    selectedCount: number;
    /** Total number of items available */
    totalCount?: number;
    /** Actions to display */
    actions: BatchAction[];
    /** Callback to clear selection */
    onClearSelection: () => void;
    /** Callback to select all */
    onSelectAll?: () => void;
    /** Whether the bar is visible */
    visible?: boolean;
    /** Position of the bar */
    position?: "top" | "bottom" | "floating";
    /** CSS class name */
    className?: string;
    /** Custom content to show */
    children?: React.ReactNode;
}

// ============================================================================
// Action Button Component
// ============================================================================

interface ActionButtonProps {
    action: BatchAction;
    size?: "sm" | "md";
}

function ActionButton({ action, size = "md" }: ActionButtonProps) {
    const Icon = action.icon;

    const baseClasses = cn(
        "inline-flex items-center gap-1.5 font-medium transition-all",
        "rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2",
        size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm",
        action.disabled || action.isLoading
            ? "opacity-50 cursor-not-allowed"
            : "cursor-pointer",
    );

    const variantClasses = {
        default: cn(
            "bg-secondary text-secondary-foreground hover:bg-secondary/80",
            "focus:ring-secondary",
        ),
        primary: cn(
            "bg-primary text-primary-foreground hover:bg-primary/90",
            "focus:ring-primary",
        ),
        destructive: cn(
            "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            "focus:ring-destructive",
        ),
    };

    return (
        <button
            onClick={action.onClick}
            disabled={action.disabled || action.isLoading}
            className={cn(
                baseClasses,
                variantClasses[action.variant || "default"],
            )}
            title={action.label}
        >
            {action.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : Icon ? (
                <Icon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
            ) : null}
            <span className="hidden sm:inline">{action.label}</span>
        </button>
    );
}

// ============================================================================
// Overflow Menu Component
// ============================================================================

interface OverflowMenuProps {
    actions: BatchAction[];
}

function OverflowMenu({ actions }: OverflowMenuProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const menuRef = React.useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    if (actions.length === 0) return null;

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "inline-flex items-center justify-center",
                    "h-8 w-8 rounded-md",
                    "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                    "transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
                )}
                title="More actions"
            >
                <MoreHorizontal className="h-4 w-4" />
            </button>

            {isOpen && (
                <div
                    className={cn(
                        "absolute right-0 bottom-full mb-2",
                        "min-w-[160px] rounded-md shadow-lg",
                        "bg-popover border border-border",
                        "py-1 z-50",
                    )}
                >
                    {actions.map((action) => {
                        const Icon = action.icon;
                        return (
                            <button
                                key={action.id}
                                onClick={() => {
                                    action.onClick();
                                    setIsOpen(false);
                                }}
                                disabled={action.disabled || action.isLoading}
                                className={cn(
                                    "w-full flex items-center gap-2 px-3 py-2 text-sm",
                                    "hover:bg-accent transition-colors text-left",
                                    action.variant === "destructive" &&
                                        "text-destructive",
                                    (action.disabled || action.isLoading) &&
                                        "opacity-50 cursor-not-allowed",
                                )}
                            >
                                {action.isLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : Icon ? (
                                    <Icon className="h-4 w-4" />
                                ) : null}
                                {action.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Main Component
// ============================================================================

export function BatchActionBar({
    selectedCount,
    totalCount,
    actions,
    onClearSelection,
    onSelectAll,
    visible = true,
    position = "bottom",
    className,
    children,
}: BatchActionBarProps) {
    if (!visible || selectedCount === 0) return null;

    const mainActions = actions.filter((a) => !a.overflow);
    const overflowActions = actions.filter((a) => a.overflow);

    const positionClasses = {
        top: "fixed top-4 left-1/2 -translate-x-1/2 z-50",
        bottom: "fixed bottom-4 left-1/2 -translate-x-1/2 z-50",
        floating: "absolute bottom-4 left-1/2 -translate-x-1/2 z-50",
    };

    return (
        <div
            className={cn(
                positionClasses[position],
                "flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3",
                "bg-card border border-border rounded-xl shadow-xl",
                "animate-in fade-in slide-in-from-bottom-4 duration-200",
                className,
            )}
        >
            {/* Selection Count */}
            <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary text-primary-foreground">
                    <CheckSquare className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">
                    {selectedCount}
                    {totalCount && (
                        <span className="text-muted-foreground">
                            /{totalCount}
                        </span>
                    )}{" "}
                    <span className="hidden sm:inline">selected</span>
                </span>
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-border" />

            {/* Select All Button */}
            {onSelectAll && totalCount && selectedCount < totalCount && (
                <button
                    onClick={onSelectAll}
                    className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                >
                    Select all
                </button>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2">
                {mainActions.map((action) => (
                    <ActionButton key={action.id} action={action} />
                ))}
                <OverflowMenu actions={overflowActions} />
            </div>

            {/* Custom Content */}
            {children}

            {/* Divider */}
            <div className="w-px h-6 bg-border" />

            {/* Close Button */}
            <button
                onClick={onClearSelection}
                className={cn(
                    "inline-flex items-center justify-center",
                    "h-8 w-8 rounded-md",
                    "hover:bg-accent text-muted-foreground hover:text-foreground",
                    "transition-colors",
                )}
                title="Clear selection"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}

// ============================================================================
// Preset Action Builders
// ============================================================================

export function createDeleteAction(
    onDelete: () => void | Promise<void>,
    isLoading?: boolean,
): BatchAction {
    return {
        id: "delete",
        label: "Delete",
        icon: Trash2,
        onClick: onDelete,
        variant: "destructive",
        isLoading,
    };
}

export function createArchiveAction(
    onArchive: () => void | Promise<void>,
    isLoading?: boolean,
): BatchAction {
    return {
        id: "archive",
        label: "Archive",
        icon: Archive,
        onClick: onArchive,
        isLoading,
    };
}

export function createExportAction(
    onExport: () => void | Promise<void>,
    isLoading?: boolean,
): BatchAction {
    return {
        id: "export",
        label: "Export",
        icon: Download,
        onClick: onExport,
        isLoading,
    };
}

export function createCopyAction(
    onCopy: () => void | Promise<void>,
    isLoading?: boolean,
): BatchAction {
    return {
        id: "copy",
        label: "Copy",
        icon: Copy,
        onClick: onCopy,
        isLoading,
    };
}

// ============================================================================
// Inline Batch Action Bar (for tables/lists)
// ============================================================================

export interface InlineBatchActionBarProps {
    selectedCount: number;
    actions: BatchAction[];
    onClearSelection: () => void;
    className?: string;
}

export function InlineBatchActionBar({
    selectedCount,
    actions,
    onClearSelection,
    className,
}: InlineBatchActionBarProps) {
    if (selectedCount === 0) return null;

    return (
        <div
            className={cn(
                "flex items-center gap-2 px-3 py-2",
                "bg-accent/50 rounded-lg border border-border",
                className,
            )}
        >
            <span className="text-sm font-medium text-muted-foreground">
                {selectedCount} selected
            </span>

            <div className="flex-1" />

            <div className="flex items-center gap-1">
                {actions.slice(0, 3).map((action) => (
                    <ActionButton key={action.id} action={action} size="sm" />
                ))}
                {actions.length > 3 && (
                    <OverflowMenu actions={actions.slice(3)} />
                )}
            </div>

            <button
                onClick={onClearSelection}
                className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors"
                title="Clear selection"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}

export default BatchActionBar;
