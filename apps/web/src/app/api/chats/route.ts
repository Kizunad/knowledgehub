import { NextRequest, NextResponse } from "next/server";
import {
    createClient,
    isSupabaseConfigured,
    successResponse,
    errorResponse,
    requireAuthWithDevBypass,
    isAuthError,
} from "@/lib/supabase/server";

// Types
interface Chat {
    id: string;
    source_id: string | null;
    title: string | null;
    started_at: string;
    ended_at: string | null;
    created_at: string;
    user_id: string;
}

interface ChatWithMessages extends Chat {
    messages_count?: number;
    last_message?: string;
}

interface CreateChatBody {
    title?: string;
    source_id?: string;
}

// GET /api/chats - List all chats for the current user
export async function GET(request: NextRequest) {
    // Require authentication
    const authResult = await requireAuthWithDevBypass();
    if (isAuthError(authResult)) {
        return authResult;
    }
    const { userId } = authResult;

    if (!isSupabaseConfigured()) {
        return NextResponse.json(errorResponse("Supabase not configured"), {
            status: 503,
        });
    }

    const supabase = createClient();
    if (!supabase) {
        return NextResponse.json(
            errorResponse("Failed to create Supabase client"),
            { status: 500 },
        );
    }

    try {
        // Parse query parameters
        const { searchParams } = new URL(request.url);
        const sourceId = searchParams.get("source_id");
        const search = searchParams.get("search");
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = parseInt(searchParams.get("offset") || "0");

        // Build query - RLS will automatically filter by user_id
        // But we explicitly filter as well for clarity and defense in depth
        let query = supabase
            .from("chats")
            .select("*", { count: "exact" })
            .eq("user_id", userId)
            .order("started_at", { ascending: false })
            .range(offset, offset + limit - 1);

        // Apply filters
        if (sourceId) {
            query = query.eq("source_id", sourceId);
        }

        if (search) {
            query = query.ilike("title", `%${search}%`);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error("Error fetching chats:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to fetch chats"),
                { status: 500 },
            );
        }

        // Fetch message counts and last messages for each chat
        const chatsWithDetails: ChatWithMessages[] = await Promise.all(
            (data as Chat[]).map(async (chat) => {
                // Get message count
                const { count: messagesCount } = await supabase
                    .from("chat_messages")
                    .select("*", { count: "exact", head: true })
                    .eq("chat_id", chat.id)
                    .eq("user_id", userId);

                // Get last message
                const { data: lastMessageData } = await supabase
                    .from("chat_messages")
                    .select("content")
                    .eq("chat_id", chat.id)
                    .eq("user_id", userId)
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .single();

                return {
                    ...chat,
                    messages_count: messagesCount || 0,
                    last_message: lastMessageData?.content
                        ? lastMessageData.content.substring(0, 100)
                        : undefined,
                };
            }),
        );

        return NextResponse.json(
            successResponse({
                chats: chatsWithDetails,
                total: count || 0,
                limit,
                offset,
            }),
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Unexpected error occurred"), {
            status: 500,
        });
    }
}

// POST /api/chats - Create a new chat
export async function POST(request: NextRequest) {
    // Require authentication
    const authResult = await requireAuthWithDevBypass();
    if (isAuthError(authResult)) {
        return authResult;
    }
    const { userId } = authResult;

    if (!isSupabaseConfigured()) {
        return NextResponse.json(errorResponse("Supabase not configured"), {
            status: 503,
        });
    }

    const supabase = createClient();
    if (!supabase) {
        return NextResponse.json(
            errorResponse("Failed to create Supabase client"),
            { status: 500 },
        );
    }

    try {
        const body: CreateChatBody = await request.json();

        const { data, error } = await supabase
            .from("chats")
            .insert({
                title: body.title?.trim() || null,
                source_id: body.source_id || null,
                started_at: new Date().toISOString(),
                user_id: userId, // Explicitly set user_id
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating chat:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to create chat"),
                { status: 500 },
            );
        }

        return NextResponse.json(
            successResponse(data as Chat, "Chat created successfully"),
            { status: 201 },
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Invalid request body"), {
            status: 400,
        });
    }
}

// DELETE /api/chats - Bulk delete chats (only user's own chats)
export async function DELETE(request: NextRequest) {
    // Require authentication
    const authResult = await requireAuthWithDevBypass();
    if (isAuthError(authResult)) {
        return authResult;
    }
    const { userId } = authResult;

    if (!isSupabaseConfigured()) {
        return NextResponse.json(errorResponse("Supabase not configured"), {
            status: 503,
        });
    }

    const supabase = createClient();
    if (!supabase) {
        return NextResponse.json(
            errorResponse("Failed to create Supabase client"),
            { status: 500 },
        );
    }

    try {
        const { searchParams } = new URL(request.url);
        const idsParam = searchParams.get("ids");

        if (!idsParam) {
            return NextResponse.json(
                errorResponse("IDs parameter is required"),
                { status: 400 },
            );
        }

        const ids = idsParam.split(",").filter(Boolean);

        if (ids.length === 0) {
            return NextResponse.json(
                errorResponse("At least one ID is required"),
                { status: 400 },
            );
        }

        // RLS will ensure only user's own chats are deleted
        // But we explicitly filter as well for defense in depth
        const { error, count } = await supabase
            .from("chats")
            .delete()
            .eq("user_id", userId)
            .in("id", ids);

        if (error) {
            console.error("Error deleting chats:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to delete chats"),
                { status: 500 },
            );
        }

        return NextResponse.json(
            successResponse(
                { deleted: count || ids.length },
                "Chats deleted successfully",
            ),
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Unexpected error occurred"), {
            status: 500,
        });
    }
}
