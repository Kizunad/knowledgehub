"use client";

import { useState, useCallback, useMemo } from "react";
import {
    DragEndEvent,
    DragStartEvent,
    DragOverEvent,
    UniqueIdentifier,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";

export interface DragAndDropOptions<T> {
    /** Initial items array */
    items: T[];
    /** Function to get unique ID from item */
    getId: (item: T) => string;
    /** Callback when items are reordered */
    onReorder?: (items: T[], oldIndex: number, newIndex: number) => void;
    /** Callback when drag starts */
    onDragStart?: (item: T) => void;
    /** Callback when drag ends */
    onDragEnd?: (item: T | null, newItems: T[]) => void;
    /** Enable keyboard navigation */
    enableKeyboard?: boolean;
}

export interface DragAndDropResult<T> {
    /** Current sorted items */
    items: T[];
    /** Currently dragging item ID */
    activeId: UniqueIdentifier | null;
    /** Currently dragging item */
    activeItem: T | null;
    /** DnD sensors for DndContext */
    sensors: ReturnType<typeof useSensors>;
    /** Handler for drag start event */
    handleDragStart: (event: DragStartEvent) => void;
    /** Handler for drag over event */
    handleDragOver: (event: DragOverEvent) => void;
    /** Handler for drag end event */
    handleDragEnd: (event: DragEndEvent) => void;
    /** Reset items to new array */
    setItems: (items: T[]) => void;
    /** Check if an item is being dragged */
    isDragging: (id: string) => boolean;
    /** Get item index */
    getIndex: (id: string) => number;
}

export function useDragAndDrop<T>({
    items: initialItems,
    getId,
    onReorder,
    onDragStart,
    onDragEnd,
    enableKeyboard = true,
}: DragAndDropOptions<T>): DragAndDropResult<T> {
    const [items, setItems] = useState<T[]>(initialItems);
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

    // Update items when initialItems change
    const updateItems = useCallback((newItems: T[]) => {
        setItems(newItems);
    }, []);

    // Memoize item IDs for sortable context
    const itemIds = useMemo(
        () => items.map((item) => getId(item)),
        [items, getId],
    );

    // Get the active item being dragged
    const activeItem = useMemo(() => {
        if (!activeId) return null;
        return items.find((item) => getId(item) === activeId) || null;
    }, [activeId, items, getId]);

    // Set up sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Require 8px movement before drag starts
            },
        }),
        ...(enableKeyboard
            ? [
                  useSensor(KeyboardSensor, {
                      coordinateGetter: sortableKeyboardCoordinates,
                  }),
              ]
            : []),
    );

    // Handle drag start
    const handleDragStart = useCallback(
        (event: DragStartEvent) => {
            setActiveId(event.active.id);
            const item = items.find((i) => getId(i) === event.active.id);
            if (item && onDragStart) {
                onDragStart(item);
            }
        },
        [items, getId, onDragStart],
    );

    // Handle drag over (for container changes if needed)
    const handleDragOver = useCallback((_event: DragOverEvent) => {
        // Can be extended for multi-container drag
    }, []);

    // Handle drag end
    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            const { active, over } = event;
            setActiveId(null);

            if (!over || active.id === over.id) {
                if (onDragEnd) {
                    onDragEnd(null, items);
                }
                return;
            }

            const oldIndex = itemIds.indexOf(active.id as string);
            const newIndex = itemIds.indexOf(over.id as string);

            if (oldIndex !== -1 && newIndex !== -1) {
                const newItems = arrayMove(items, oldIndex, newIndex);
                setItems(newItems);

                if (onReorder) {
                    onReorder(newItems, oldIndex, newIndex);
                }

                if (onDragEnd) {
                    const movedItem = items[oldIndex];
                    onDragEnd(movedItem, newItems);
                }
            }
        },
        [items, itemIds, onReorder, onDragEnd],
    );

    // Check if an item is being dragged
    const isDragging = useCallback((id: string) => activeId === id, [activeId]);

    // Get item index
    const getIndex = useCallback(
        (id: string) => itemIds.indexOf(id),
        [itemIds],
    );

    return {
        items,
        activeId,
        activeItem,
        sensors,
        handleDragStart,
        handleDragOver,
        handleDragEnd,
        setItems: updateItems,
        isDragging,
        getIndex,
    };
}

// ============================================================================
// Utility Types and Helpers
// ============================================================================

export interface SortableItemProps {
    id: string;
    isDragging: boolean;
    isOver?: boolean;
}

export interface DragOverlayProps<T> {
    item: T | null;
}

// Helper to generate order values for database persistence
export function generateOrderValue(
    items: { order?: number }[],
    targetIndex: number,
): number {
    if (items.length === 0) return 1000;

    // If inserting at the beginning
    if (targetIndex === 0) {
        const firstOrder = items[0]?.order ?? 1000;
        return firstOrder - 1000;
    }

    // If inserting at the end
    if (targetIndex >= items.length) {
        const lastOrder = items[items.length - 1]?.order ?? 1000;
        return lastOrder + 1000;
    }

    // Insert between two items
    const prevOrder = items[targetIndex - 1]?.order ?? 0;
    const nextOrder = items[targetIndex]?.order ?? prevOrder + 2000;
    return Math.floor((prevOrder + nextOrder) / 2);
}

// Helper to normalize order values (call periodically to prevent precision issues)
export function normalizeOrderValues<T extends { order?: number }>(
    items: T[],
    gap: number = 1000,
): T[] {
    return items.map((item, index) => ({
        ...item,
        order: (index + 1) * gap,
    }));
}

// ============================================================================
// Multi-container Drag and Drop
// ============================================================================

export interface ContainerItem<T> {
    id: string;
    items: T[];
}

export interface MultiContainerOptions<T> {
    containers: ContainerItem<T>[];
    getId: (item: T) => string;
    onReorder?: (
        containerId: string,
        items: T[],
        oldIndex: number,
        newIndex: number,
    ) => void;
    onMove?: (
        item: T,
        fromContainerId: string,
        toContainerId: string,
        newIndex: number,
    ) => void;
}

export interface MultiContainerResult<T> {
    containers: ContainerItem<T>[];
    activeId: UniqueIdentifier | null;
    activeItem: T | null;
    activeContainer: string | null;
    sensors: ReturnType<typeof useSensors>;
    handleDragStart: (event: DragStartEvent) => void;
    handleDragOver: (event: DragOverEvent) => void;
    handleDragEnd: (event: DragEndEvent) => void;
    setContainers: (containers: ContainerItem<T>[]) => void;
    findContainer: (id: string) => string | null;
}

export function useMultiContainerDragAndDrop<T>({
    containers: initialContainers,
    getId,
    onReorder,
    onMove,
}: MultiContainerOptions<T>): MultiContainerResult<T> {
    const [containers, setContainers] =
        useState<ContainerItem<T>[]>(initialContainers);
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
    const [activeContainer, setActiveContainer] = useState<string | null>(null);

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

    // Find which container an item belongs to
    const findContainer = useCallback(
        (id: string): string | null => {
            // Check if it's a container ID
            const container = containers.find((c) => c.id === id);
            if (container) return id;

            // Find item in containers
            for (const c of containers) {
                if (c.items.some((item) => getId(item) === id)) {
                    return c.id;
                }
            }
            return null;
        },
        [containers, getId],
    );

    // Get active item
    const activeItem = useMemo(() => {
        if (!activeId) return null;
        for (const container of containers) {
            const item = container.items.find((i) => getId(i) === activeId);
            if (item) return item;
        }
        return null;
    }, [activeId, containers, getId]);

    const handleDragStart = useCallback(
        (event: DragStartEvent) => {
            setActiveId(event.active.id);
            const containerId = findContainer(event.active.id as string);
            setActiveContainer(containerId);
        },
        [findContainer],
    );

    const handleDragOver = useCallback(
        (event: DragOverEvent) => {
            const { active, over } = event;
            if (!over) return;

            const activeContainerId = findContainer(active.id as string);
            const overContainerId = findContainer(over.id as string);

            if (!activeContainerId || !overContainerId) return;
            if (activeContainerId === overContainerId) return;

            // Moving between containers
            setContainers((prev) => {
                const activeContainerIndex = prev.findIndex(
                    (c) => c.id === activeContainerId,
                );
                const overContainerIndex = prev.findIndex(
                    (c) => c.id === overContainerId,
                );

                const activeItems = [...prev[activeContainerIndex].items];
                const overItems = [...prev[overContainerIndex].items];

                const activeIndex = activeItems.findIndex(
                    (i) => getId(i) === active.id,
                );
                const overIndex = overItems.findIndex(
                    (i) => getId(i) === over.id,
                );

                const [movedItem] = activeItems.splice(activeIndex, 1);

                const insertIndex =
                    overIndex === -1 ? overItems.length : overIndex;
                overItems.splice(insertIndex, 0, movedItem);

                const newContainers = [...prev];
                newContainers[activeContainerIndex] = {
                    ...newContainers[activeContainerIndex],
                    items: activeItems,
                };
                newContainers[overContainerIndex] = {
                    ...newContainers[overContainerIndex],
                    items: overItems,
                };

                return newContainers;
            });
        },
        [findContainer, getId],
    );

    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            const { active, over } = event;

            if (!over) {
                setActiveId(null);
                setActiveContainer(null);
                return;
            }

            const activeContainerId = findContainer(active.id as string);
            const overContainerId = findContainer(over.id as string);

            if (!activeContainerId || !overContainerId) {
                setActiveId(null);
                setActiveContainer(null);
                return;
            }

            if (activeContainerId === overContainerId) {
                // Reorder within same container
                const containerIndex = containers.findIndex(
                    (c) => c.id === activeContainerId,
                );
                const items = containers[containerIndex].items;
                const oldIndex = items.findIndex((i) => getId(i) === active.id);
                const newIndex = items.findIndex((i) => getId(i) === over.id);

                if (oldIndex !== newIndex) {
                    const newItems = arrayMove(items, oldIndex, newIndex);
                    setContainers((prev) => {
                        const updated = [...prev];
                        updated[containerIndex] = {
                            ...updated[containerIndex],
                            items: newItems,
                        };
                        return updated;
                    });

                    if (onReorder) {
                        onReorder(
                            activeContainerId,
                            newItems,
                            oldIndex,
                            newIndex,
                        );
                    }
                }
            } else {
                // Item was moved to different container
                if (onMove && activeContainer) {
                    const item = activeItem;
                    const overContainerItems =
                        containers.find((c) => c.id === overContainerId)
                            ?.items || [];
                    const newIndex = overContainerItems.findIndex(
                        (i) => getId(i) === over.id,
                    );
                    if (item) {
                        onMove(
                            item,
                            activeContainer,
                            overContainerId,
                            newIndex === -1 ? 0 : newIndex,
                        );
                    }
                }
            }

            setActiveId(null);
            setActiveContainer(null);
        },
        [
            containers,
            findContainer,
            getId,
            onReorder,
            onMove,
            activeContainer,
            activeItem,
        ],
    );

    return {
        containers,
        activeId,
        activeItem,
        activeContainer,
        sensors,
        handleDragStart,
        handleDragOver,
        handleDragEnd,
        setContainers,
        findContainer,
    };
}
