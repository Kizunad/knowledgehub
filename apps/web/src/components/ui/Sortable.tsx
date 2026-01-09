"use client";

import React, { forwardRef, createContext, useContext, useMemo } from "react";
import {
    DndContext,
    DragOverlay,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    UniqueIdentifier,
    MeasuringStrategy,
} from "@dnd-kit/core";
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
    horizontalListSortingStrategy,
    rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { GripVertical } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export type SortingStrategy = "vertical" | "horizontal" | "grid";

export interface SortableContainerProps {
    /** Items to sort (must have id property or use getId) */
    items: string[];
    /** Callback when items are reordered */
    onReorder: (activeId: string, overId: string) => void;
    /** Callback when drag starts */
    onDragStart?: (activeId: string) => void;
    /** Callback when drag ends */
    onDragEnd?: () => void;
    /** Sorting strategy */
    strategy?: SortingStrategy;
    /** Children to render */
    children: React.ReactNode;
    /** Overlay content when dragging */
    overlay?: React.ReactNode;
    /** CSS class name */
    className?: string;
    /** Disable dragging */
    disabled?: boolean;
}

export interface SortableItemProps {
    /** Unique identifier */
    id: string;
    /** Whether this item is disabled */
    disabled?: boolean;
    /** Children to render */
    children: React.ReactNode;
    /** CSS class name */
    className?: string;
    /** Handle position */
    handlePosition?: "start" | "end" | "none";
    /** Custom handle component */
    handle?: React.ReactNode;
    /** Show visual feedback when dragging over */
    showDropIndicator?: boolean;
}

export interface SortableHandleProps {
    /** CSS class name */
    className?: string;
    /** Size of the handle */
    size?: "sm" | "md" | "lg";
    /** Children (icon) */
    children?: React.ReactNode;
}

// ============================================================================
// Context
// ============================================================================

interface SortableContextValue {
    activeId: UniqueIdentifier | null;
    disabled: boolean;
}

const SortableCtx = createContext<SortableContextValue>({
    activeId: null,
    disabled: false,
});

export const useSortableContext = () => useContext(SortableCtx);

// ============================================================================
// Sortable Container
// ============================================================================

export function SortableContainer({
    items,
    onReorder,
    onDragStart,
    onDragEnd,
    strategy = "vertical",
    children,
    overlay,
    className,
    disabled = false,
}: SortableContainerProps) {
    const [activeId, setActiveId] = React.useState<UniqueIdentifier | null>(
        null,
    );

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    const sortingStrategy = useMemo(() => {
        switch (strategy) {
            case "horizontal":
                return horizontalListSortingStrategy;
            case "grid":
                return rectSortingStrategy;
            case "vertical":
            default:
                return verticalListSortingStrategy;
        }
    }, [strategy]);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id);
        onDragStart?.(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            onReorder(active.id as string, over.id as string);
        }

        setActiveId(null);
        onDragEnd?.();
    };

    const handleDragCancel = () => {
        setActiveId(null);
        onDragEnd?.();
    };

    const contextValue = useMemo(
        () => ({ activeId, disabled }),
        [activeId, disabled],
    );

    if (disabled) {
        return <div className={className}>{children}</div>;
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
            measuring={{
                droppable: {
                    strategy: MeasuringStrategy.Always,
                },
            }}
        >
            <SortableCtx.Provider value={contextValue}>
                <SortableContext items={items} strategy={sortingStrategy}>
                    <div className={className}>{children}</div>
                </SortableContext>
                <DragOverlay dropAnimation={null}>
                    {activeId && overlay ? overlay : null}
                </DragOverlay>
            </SortableCtx.Provider>
        </DndContext>
    );
}

// ============================================================================
// Sortable Item
// ============================================================================

export const SortableItem = forwardRef<HTMLDivElement, SortableItemProps>(
    (
        {
            id,
            disabled = false,
            children,
            className,
            handlePosition = "start",
            handle,
            showDropIndicator = true,
        },
        ref,
    ) => {
        const {
            attributes,
            listeners,
            setNodeRef,
            transform,
            transition,
            isDragging,
            isOver,
        } = useSortable({
            id,
            disabled,
        });

        const { disabled: containerDisabled } = useSortableContext();

        const style: React.CSSProperties = {
            transform: CSS.Transform.toString(transform),
            transition,
            opacity: isDragging ? 0.5 : 1,
            position: "relative",
        };

        const combinedRef = (node: HTMLDivElement | null) => {
            setNodeRef(node);
            if (typeof ref === "function") {
                ref(node);
            } else if (ref) {
                ref.current = node;
            }
        };

        const isDisabled = disabled || containerDisabled;

        const handleElement = handlePosition !== "none" && !isDisabled && (
            <div
                {...attributes}
                {...listeners}
                className={cn(
                    "flex items-center justify-center cursor-grab active:cursor-grabbing touch-none",
                    "text-muted-foreground hover:text-foreground transition-colors",
                    "p-1 rounded hover:bg-accent",
                )}
            >
                {handle || <GripVertical className="h-4 w-4" />}
            </div>
        );

        return (
            <div
                ref={combinedRef}
                style={style}
                className={cn(
                    "group relative",
                    isDragging && "z-50",
                    isOver &&
                        showDropIndicator &&
                        "ring-2 ring-primary ring-offset-2",
                    className,
                )}
            >
                {handlePosition === "start" && handleElement}
                <div className="flex-1">{children}</div>
                {handlePosition === "end" && handleElement}
            </div>
        );
    },
);

SortableItem.displayName = "SortableItem";

// ============================================================================
// Standalone Sortable Handle
// ============================================================================

export function SortableHandle({
    className,
    size = "md",
    children,
}: SortableHandleProps) {
    const sizeClasses = {
        sm: "p-0.5",
        md: "p-1",
        lg: "p-1.5",
    };

    const iconSizes = {
        sm: "h-3 w-3",
        md: "h-4 w-4",
        lg: "h-5 w-5",
    };

    return (
        <div
            className={cn(
                "flex items-center justify-center cursor-grab active:cursor-grabbing touch-none",
                "text-muted-foreground hover:text-foreground transition-colors",
                "rounded hover:bg-accent",
                sizeClasses[size],
                className,
            )}
        >
            {children || <GripVertical className={iconSizes[size]} />}
        </div>
    );
}

// ============================================================================
// Sortable List (Convenience Component)
// ============================================================================

export interface SortableListItem {
    id: string;
    [key: string]: unknown;
}

export interface SortableListProps<T extends SortableListItem> {
    /** Items to render */
    items: T[];
    /** Render function for each item */
    renderItem: (
        item: T,
        index: number,
        isDragging: boolean,
    ) => React.ReactNode;
    /** Callback when items are reordered */
    onReorder: (items: T[]) => void;
    /** CSS class name for the container */
    className?: string;
    /** CSS class name for each item wrapper */
    itemClassName?: string;
    /** Sorting strategy */
    strategy?: SortingStrategy;
    /** Whether to show handles */
    showHandle?: boolean;
    /** Disable sorting */
    disabled?: boolean;
    /** Empty state content */
    emptyState?: React.ReactNode;
}

export function SortableList<T extends SortableListItem>({
    items,
    renderItem,
    onReorder,
    className,
    itemClassName,
    strategy = "vertical",
    showHandle = true,
    disabled = false,
    emptyState,
}: SortableListProps<T>) {
    const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

    const itemIds = useMemo(() => items.map((item) => item.id), [items]);

    const handleReorder = (activeId: string, overId: string) => {
        const oldIndex = items.findIndex((item) => item.id === activeId);
        const newIndex = items.findIndex((item) => item.id === overId);

        if (oldIndex === -1 || newIndex === -1) return;

        const newItems = [...items];
        const [movedItem] = newItems.splice(oldIndex, 1);
        newItems.splice(newIndex, 0, movedItem);

        onReorder(newItems);
    };

    const handleDragStart = (activeId: string) => {
        const index = items.findIndex((item) => item.id === activeId);
        setActiveIndex(index);
    };

    const handleDragEnd = () => {
        setActiveIndex(null);
    };

    if (items.length === 0 && emptyState) {
        return <>{emptyState}</>;
    }

    const activeItem = activeIndex !== null ? items[activeIndex] : null;

    return (
        <SortableContainer
            items={itemIds}
            onReorder={handleReorder}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            strategy={strategy}
            className={className}
            disabled={disabled}
            overlay={
                activeItem ? (
                    <div className="bg-card border border-border rounded-lg shadow-lg p-4 opacity-90">
                        {renderItem(activeItem, activeIndex!, true)}
                    </div>
                ) : null
            }
        >
            {items.map((item, index) => (
                <SortableItem
                    key={item.id}
                    id={item.id}
                    className={cn(
                        "flex items-center gap-2",
                        strategy === "horizontal" && "inline-flex",
                        itemClassName,
                    )}
                    handlePosition={showHandle ? "start" : "none"}
                >
                    {renderItem(item, index, false)}
                </SortableItem>
            ))}
        </SortableContainer>
    );
}

// ============================================================================
// Sortable Grid (for kanban-like layouts)
// ============================================================================

export interface SortableGridProps<T extends SortableListItem> {
    /** Items to render */
    items: T[];
    /** Render function for each item */
    renderItem: (item: T, index: number) => React.ReactNode;
    /** Callback when items are reordered */
    onReorder: (items: T[]) => void;
    /** Number of columns */
    columns?: number;
    /** Gap between items */
    gap?: "sm" | "md" | "lg";
    /** CSS class name */
    className?: string;
    /** Disable sorting */
    disabled?: boolean;
}

export function SortableGrid<T extends SortableListItem>({
    items,
    renderItem,
    onReorder,
    columns = 3,
    gap = "md",
    className,
    disabled = false,
}: SortableGridProps<T>) {
    const itemIds = useMemo(() => items.map((item) => item.id), [items]);

    const gapClasses = {
        sm: "gap-2",
        md: "gap-4",
        lg: "gap-6",
    };

    const handleReorder = (activeId: string, overId: string) => {
        const oldIndex = items.findIndex((item) => item.id === activeId);
        const newIndex = items.findIndex((item) => item.id === overId);

        if (oldIndex === -1 || newIndex === -1) return;

        const newItems = [...items];
        const [movedItem] = newItems.splice(oldIndex, 1);
        newItems.splice(newIndex, 0, movedItem);

        onReorder(newItems);
    };

    return (
        <SortableContainer
            items={itemIds}
            onReorder={handleReorder}
            strategy="grid"
            disabled={disabled}
            className={cn(
                "grid",
                `grid-cols-${columns}`,
                gapClasses[gap],
                className,
            )}
        >
            {items.map((item, index) => (
                <SortableItem
                    key={item.id}
                    id={item.id}
                    handlePosition="none"
                    className="cursor-move"
                >
                    {renderItem(item, index)}
                </SortableItem>
            ))}
        </SortableContainer>
    );
}

// ============================================================================
// Drag Indicator Component
// ============================================================================

export interface DragIndicatorProps {
    position: "top" | "bottom" | "left" | "right";
    visible?: boolean;
    className?: string;
}

export function DragIndicator({
    position,
    visible = true,
    className,
}: DragIndicatorProps) {
    if (!visible) return null;

    const positionClasses = {
        top: "absolute top-0 left-0 right-0 h-0.5",
        bottom: "absolute bottom-0 left-0 right-0 h-0.5",
        left: "absolute top-0 bottom-0 left-0 w-0.5",
        right: "absolute top-0 bottom-0 right-0 w-0.5",
    };

    return (
        <div
            className={cn(
                positionClasses[position],
                "bg-primary transition-opacity",
                className,
            )}
        />
    );
}

export default SortableContainer;
