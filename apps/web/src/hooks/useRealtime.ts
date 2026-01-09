import { useEffect, useRef, useCallback, useState } from "react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

// ============================================================
// Types
// ============================================================

export type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

export interface RealtimePayload<T> {
    eventType: "INSERT" | "UPDATE" | "DELETE";
    new: T;
    old: T;
    schema: string;
    table: string;
    commit_timestamp: string;
}

export interface RealtimeSubscription<
    T extends Record<string, unknown> = Record<string, unknown>,
> {
    table: string;
    schema?: string;
    event?: RealtimeEvent;
    filter?: string;
    onInsert?: (payload: T) => void;
    onUpdate?: (payload: { old: T; new: T }) => void;
    onDelete?: (payload: T) => void;
    onChange?: (payload: RealtimePayload<T>) => void;
}

export interface UseRealtimeOptions {
    enabled?: boolean;
    debugLog?: boolean;
}

export interface RealtimeStatus {
    connected: boolean;
    subscribedTables: string[];
    error: string | null;
}

// ============================================================
// Single Table Subscription Hook
// ============================================================

/**
 * Subscribe to realtime changes on a single table
 *
 * @example
 * ```tsx
 * useRealtimeSubscription({
 *   table: "ideas",
 *   onInsert: (idea) => console.log("New idea:", idea),
 *   onUpdate: ({ old, new: updated }) => console.log("Updated:", updated),
 *   onDelete: (idea) => console.log("Deleted:", idea),
 * });
 * ```
 */
export function useRealtimeSubscription<
    T extends Record<string, unknown> = Record<string, unknown>,
>(subscription: RealtimeSubscription<T>, options: UseRealtimeOptions = {}) {
    const { enabled = true, debugLog = false } = options;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channelRef = useRef<any>(null);
    const [status, setStatus] = useState<RealtimeStatus>({
        connected: false,
        subscribedTables: [],
        error: null,
    });

    useEffect(() => {
        if (!enabled || !isSupabaseConfigured()) {
            return;
        }

        const supabase = getSupabaseClient();
        if (!supabase) {
            setStatus((prev) => ({
                ...prev,
                error: "Supabase client not available",
            }));
            return;
        }

        const {
            table,
            schema = "public",
            event = "*",
            filter,
            onInsert,
            onUpdate,
            onDelete,
            onChange,
        } = subscription;

        const channelName = `realtime-${table}-${Date.now()}`;

        if (debugLog) {
            console.log(`[Realtime] Subscribing to ${table}...`);
        }

        // Build the channel configuration
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const config: any = {
            event,
            schema,
            table,
        };

        if (filter) {
            config.filter = filter;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const channel = (supabase.channel(channelName) as any)
            .on("postgres_changes", config, (payload: RealtimePayload<T>) => {
                if (debugLog) {
                    console.log(`[Realtime] ${table} event:`, payload);
                }

                // Call the generic onChange handler
                onChange?.(payload);

                // Call specific handlers based on event type
                switch (payload.eventType) {
                    case "INSERT":
                        onInsert?.(payload.new as T);
                        break;
                    case "UPDATE":
                        onUpdate?.({
                            old: payload.old as T,
                            new: payload.new as T,
                        });
                        break;
                    case "DELETE":
                        onDelete?.(payload.old as T);
                        break;
                }
            })
            .subscribe((status: string) => {
                if (debugLog) {
                    console.log(`[Realtime] ${table} status:`, status);
                }

                setStatus((prev) => ({
                    ...prev,
                    connected: status === "SUBSCRIBED",
                    subscribedTables:
                        status === "SUBSCRIBED"
                            ? [...prev.subscribedTables, table]
                            : prev.subscribedTables.filter((t) => t !== table),
                    error: status === "CHANNEL_ERROR" ? "Channel error" : null,
                }));
            });

        channelRef.current = channel;

        return () => {
            if (debugLog) {
                console.log(`[Realtime] Unsubscribing from ${table}...`);
            }
            channel.unsubscribe();
            channelRef.current = null;
        };
    }, [subscription, enabled, debugLog]);

    return status;
}

// ============================================================
// Multi-Table Subscription Hook
// ============================================================

/**
 * Subscribe to realtime changes on multiple tables at once
 *
 * @example
 * ```tsx
 * useMultiRealtimeSubscription([
 *   {
 *     table: "ideas",
 *     onInsert: (idea) => refetchIdeas(),
 *   },
 *   {
 *     table: "files",
 *     onUpdate: () => refetchFiles(),
 *   },
 * ]);
 * ```
 */
export function useMultiRealtimeSubscription<
    T extends Record<string, unknown> = Record<string, unknown>,
>(subscriptions: RealtimeSubscription<T>[], options: UseRealtimeOptions = {}) {
    const { enabled = true, debugLog = false } = options;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channelRef = useRef<any>(null);
    const [status, setStatus] = useState<RealtimeStatus>({
        connected: false,
        subscribedTables: [],
        error: null,
    });

    useEffect(() => {
        if (!enabled || !isSupabaseConfigured() || subscriptions.length === 0) {
            return;
        }

        const supabase = getSupabaseClient();
        if (!supabase) {
            setStatus((prev) => ({
                ...prev,
                error: "Supabase client not available",
            }));
            return;
        }

        const tableNames = subscriptions.map((s) => s.table);
        const channelName = `realtime-multi-${tableNames.join("-")}-${Date.now()}`;

        if (debugLog) {
            console.log(`[Realtime] Subscribing to tables:`, tableNames);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let channel: any = supabase.channel(channelName);

        // Add each subscription to the channel
        for (const subscription of subscriptions) {
            const {
                table,
                schema = "public",
                event = "*",
                filter,
                onInsert,
                onUpdate,
                onDelete,
                onChange,
            } = subscription;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const config: any = {
                event,
                schema,
                table,
            };

            if (filter) {
                config.filter = filter;
            }

            channel = channel.on(
                "postgres_changes",
                config,
                (payload: RealtimePayload<T>) => {
                    if (debugLog) {
                        console.log(`[Realtime] ${table} event:`, payload);
                    }

                    onChange?.(payload);

                    switch (payload.eventType) {
                        case "INSERT":
                            onInsert?.(payload.new as T);
                            break;
                        case "UPDATE":
                            onUpdate?.({
                                old: payload.old as T,
                                new: payload.new as T,
                            });
                            break;
                        case "DELETE":
                            onDelete?.(payload.old as T);
                            break;
                    }
                },
            );
        }

        channel.subscribe((status: string) => {
            if (debugLog) {
                console.log(`[Realtime] Multi-table status:`, status);
            }

            setStatus({
                connected: status === "SUBSCRIBED",
                subscribedTables: status === "SUBSCRIBED" ? tableNames : [],
                error: status === "CHANNEL_ERROR" ? "Channel error" : null,
            });
        });

        channelRef.current = channel;

        return () => {
            if (debugLog) {
                console.log(
                    `[Realtime] Unsubscribing from tables:`,
                    tableNames,
                );
            }
            channel.unsubscribe();
            channelRef.current = null;
        };
    }, [subscriptions, enabled, debugLog]);

    return status;
}

// ============================================================
// Presence Hook (for tracking online users)
// ============================================================

export interface PresenceState {
    [key: string]: {
        online_at: string;
        [key: string]: unknown;
    }[];
}

export interface UsePresenceOptions {
    channelName: string;
    userMeta?: Record<string, unknown>;
    enabled?: boolean;
    debugLog?: boolean;
}

/**
 * Track presence of users in a channel
 *
 * @example
 * ```tsx
 * const { presenceState, track } = usePresence({
 *   channelName: "document-123",
 *   userMeta: { userId: "user-1", name: "John" },
 * });
 * ```
 */
export function usePresence(options: UsePresenceOptions) {
    const {
        channelName,
        userMeta = {},
        enabled = true,
        debugLog = false,
    } = options;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channelRef = useRef<any>(null);
    const [presenceState, setPresenceState] = useState<PresenceState>({});
    const [isTracking, setIsTracking] = useState(false);

    const track = useCallback(
        async (newMeta?: Record<string, unknown>) => {
            if (!channelRef.current) return;

            const trackData = {
                ...userMeta,
                ...newMeta,
                online_at: new Date().toISOString(),
            };

            if (debugLog) {
                console.log(`[Presence] Tracking:`, trackData);
            }

            await channelRef.current.track(trackData);
            setIsTracking(true);
        },
        [userMeta, debugLog],
    );

    const untrack = useCallback(async () => {
        if (!channelRef.current) return;

        if (debugLog) {
            console.log(`[Presence] Untracking`);
        }

        await channelRef.current.untrack();
        setIsTracking(false);
    }, [debugLog]);

    useEffect(() => {
        if (!enabled || !isSupabaseConfigured()) {
            return;
        }

        const supabase = getSupabaseClient();
        if (!supabase) return;

        if (debugLog) {
            console.log(`[Presence] Joining channel: ${channelName}`);
        }

        const channel = supabase.channel(channelName, {
            config: {
                presence: {
                    key: crypto.randomUUID(),
                },
            },
        });

        channel
            .on("presence", { event: "sync" }, () => {
                const state = channel.presenceState();
                if (debugLog) {
                    console.log(`[Presence] Sync:`, state);
                }
                setPresenceState(state as unknown as PresenceState);
            })
            .on(
                "presence",
                { event: "join" },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ({ key, newPresences }: any) => {
                    if (debugLog) {
                        console.log(`[Presence] Join:`, key, newPresences);
                    }
                },
            )
            .on(
                "presence",
                { event: "leave" },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ({ key, leftPresences }: any) => {
                    if (debugLog) {
                        console.log(`[Presence] Leave:`, key, leftPresences);
                    }
                },
            )
            .subscribe(async (status: string) => {
                if (status === "SUBSCRIBED") {
                    // Auto-track when subscribed
                    await track();
                }
            });

        channelRef.current = channel;

        return () => {
            if (debugLog) {
                console.log(`[Presence] Leaving channel: ${channelName}`);
            }
            channel.unsubscribe();
            channelRef.current = null;
        };
    }, [channelName, enabled, debugLog, track]);

    return {
        presenceState,
        isTracking,
        track,
        untrack,
        onlineCount: Object.keys(presenceState).length,
    };
}

// ============================================================
// Broadcast Hook (for sending messages to channel)
// ============================================================

export interface UseBroadcastOptions {
    channelName: string;
    enabled?: boolean;
    debugLog?: boolean;
}

/**
 * Send and receive broadcast messages on a channel
 *
 * @example
 * ```tsx
 * const { broadcast, onMessage } = useBroadcast({
 *   channelName: "chat-room-1",
 * });
 *
 * // Send a message
 * broadcast("typing", { userId: "user-1" });
 *
 * // Listen for messages
 * onMessage("typing", (payload) => {
 *   console.log("User typing:", payload.userId);
 * });
 * ```
 */
export function useBroadcast(options: UseBroadcastOptions) {
    const { channelName, enabled = true, debugLog = false } = options;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channelRef = useRef<any>(null);
    const listenersRef = useRef<Map<string, Set<(payload: unknown) => void>>>(
        new Map(),
    );
    const [isConnected, setIsConnected] = useState(false);

    const broadcast = useCallback(
        async (event: string, payload: Record<string, unknown>) => {
            if (!channelRef.current) {
                console.warn("[Broadcast] Channel not connected");
                return;
            }

            if (debugLog) {
                console.log(`[Broadcast] Sending ${event}:`, payload);
            }

            await channelRef.current.send({
                type: "broadcast",
                event,
                payload,
            });
        },
        [debugLog],
    );

    const onMessage = useCallback(
        (event: string, callback: (payload: unknown) => void) => {
            if (!listenersRef.current.has(event)) {
                listenersRef.current.set(event, new Set());
            }
            listenersRef.current.get(event)!.add(callback);

            // Return cleanup function
            return () => {
                listenersRef.current.get(event)?.delete(callback);
            };
        },
        [],
    );

    useEffect(() => {
        if (!enabled || !isSupabaseConfigured()) {
            return;
        }

        const supabase = getSupabaseClient();
        if (!supabase) return;

        if (debugLog) {
            console.log(`[Broadcast] Joining channel: ${channelName}`);
        }

        const channel = supabase
            .channel(channelName)
            .on(
                "broadcast",
                { event: "*" },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ({ event, payload }: any) => {
                    if (debugLog) {
                        console.log(`[Broadcast] Received ${event}:`, payload);
                    }

                    // Call registered listeners
                    listenersRef.current.get(event)?.forEach((callback) => {
                        callback(payload);
                    });
                },
            )
            .subscribe((status: string) => {
                setIsConnected(status === "SUBSCRIBED");
            });

        channelRef.current = channel;

        return () => {
            if (debugLog) {
                console.log(`[Broadcast] Leaving channel: ${channelName}`);
            }
            channel.unsubscribe();
            channelRef.current = null;
            listenersRef.current.clear();
        };
    }, [channelName, enabled, debugLog]);

    return {
        isConnected,
        broadcast,
        onMessage,
    };
}

// ============================================================
// Pre-built Hooks for Common Tables
// ============================================================

export interface Idea extends Record<string, unknown> {
    id: string;
    content: string;
    status: "inbox" | "active" | "archive";
    done: boolean;
    tags: string[] | null;
    refs: string[] | null;
    source_ref: string | null;
    created_at: string;
    updated_at: string;
}

export interface FileRecord extends Record<string, unknown> {
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

export interface DirectorySource extends Record<string, unknown> {
    id: string;
    name: string;
    mode: "github" | "link" | "local_sync";
    path: string;
    branch: string | null;
    description: string | null;
    synced_at: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * Subscribe to ideas table changes
 */
export function useRealtimeIdeas(
    handlers: {
        onInsert?: (idea: Idea) => void;
        onUpdate?: (payload: { old: Idea; new: Idea }) => void;
        onDelete?: (idea: Idea) => void;
    },
    options?: UseRealtimeOptions,
) {
    return useRealtimeSubscription<Idea>(
        {
            table: "ideas",
            ...handlers,
        },
        options,
    );
}

/**
 * Subscribe to files table changes
 */
export function useRealtimeFiles(
    handlers: {
        onInsert?: (file: FileRecord) => void;
        onUpdate?: (payload: { old: FileRecord; new: FileRecord }) => void;
        onDelete?: (file: FileRecord) => void;
        sourceId?: string; // Optional filter by source_id
    },
    options?: UseRealtimeOptions,
) {
    const { sourceId, ...callbacks } = handlers;

    return useRealtimeSubscription<FileRecord>(
        {
            table: "files",
            filter: sourceId ? `source_id=eq.${sourceId}` : undefined,
            ...callbacks,
        },
        options,
    );
}

/**
 * Subscribe to directory_sources table changes
 */
export function useRealtimeSources(
    handlers: {
        onInsert?: (source: DirectorySource) => void;
        onUpdate?: (payload: {
            old: DirectorySource;
            new: DirectorySource;
        }) => void;
        onDelete?: (source: DirectorySource) => void;
    },
    options?: UseRealtimeOptions,
) {
    return useRealtimeSubscription<DirectorySource>(
        {
            table: "directory_sources",
            ...handlers,
        },
        options,
    );
}
