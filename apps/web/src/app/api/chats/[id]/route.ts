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
    user_id: string;
    created_at: string;
}

interface ChatMessage {
    id: string;
    chat_id: string;
    role: "user" | "assistant" | "system";
    content: string;
    user_id: string;
    created_at: string;
}

interface UpdateChatBody {
    title?: string;
    ended_at?: string;
}

interface CreateMessageBody {
    role: "user" | "assistant" | "system";
    content: string;
}

// GET /api/chats/[id] - Get a single chat with messages
export async function GET(
    _request: NextRequest,
    { params }: { params: { id: string } },
) {
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
        const { id } = params;

        if (!id) {
            return NextResponse.json(errorResponse("ID is required"), {
                status: 400,
            });
        }

        // Get chat - RLS will filter by user_id, but we explicitly check too
        const { data: chat, error: chatError } = await supabase
            .from("chats")
            .select("*")
            .eq("id", id)
            .eq("user_id", userId)
            .single();

        if (chatError) {
            if (chatError.code === "PGRST116") {
                return NextResponse.json(errorResponse("Chat not found"), {
                    status: 404,
                });
            }
            console.error("Error fetching chat:", chatError);
            return NextResponse.json(
                errorResponse(chatError.message, "Failed to fetch chat"),
                { status: 500 },
            );
        }

        // Get messages - RLS will filter by user_id
        const { data: messages, error: messagesError } = await supabase
            .from("chat_messages")
            .select("*")
            .eq("chat_id", id)
            .eq("user_id", userId)
            .order("created_at", { ascending: true });

        if (messagesError) {
            console.error("Error fetching messages:", messagesError);
            return NextResponse.json(
                errorResponse(
                    messagesError.message,
                    "Failed to fetch messages",
                ),
                { status: 500 },
            );
        }

        return NextResponse.json(
            successResponse({
                chat: chat as Chat,
                messages: messages as ChatMessage[],
            }),
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Unexpected error occurred"), {
            status: 500,
        });
    }
}

// PUT /api/chats/[id] - Update a chat
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } },
) {
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
        const { id } = params;

        if (!id) {
            return NextResponse.json(errorResponse("ID is required"), {
                status: 400,
            });
        }

        const body: UpdateChatBody = await request.json();

        // Build update object
        const updateData: Record<string, unknown> = {};

        if (body.title !== undefined) {
            updateData.title = body.title?.trim() || null;
        }
        if (body.ended_at !== undefined) {
            updateData.ended_at = body.ended_at;
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                errorResponse("At least one field to update is required"),
                { status: 400 },
            );
        }

        // RLS will ensure only user's own chats are updated
        // But we explicitly filter as well for defense in depth
        const { data, error } = await supabase
            .from("chats")
            .update(updateData)
            .eq("id", id)
            .eq("user_id", userId)
            .select()
            .single();

        if (error) {
            if (error.code === "PGRST116") {
                return NextResponse.json(errorResponse("Chat not found"), {
                    status: 404,
                });
            }
            console.error("Error updating chat:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to update chat"),
                { status: 500 },
            );
        }

        return NextResponse.json(
            successResponse(data as Chat, "Chat updated successfully"),
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Invalid request body"), {
            status: 400,
        });
    }
}

// POST /api/chats/[id] - Add a message to chat
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } },
) {
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
        const { id } = params;

        if (!id) {
            return NextResponse.json(errorResponse("Chat ID is required"), {
                status: 400,
            });
        }

        const body: CreateMessageBody = await request.json();

        // Validate required fields
        if (
            !body.role ||
            !["user", "assistant", "system"].includes(body.role)
        ) {
            return NextResponse.json(
                errorResponse("Role must be 'user', 'assistant', or 'system'"),
                { status: 400 },
            );
        }

        if (!body.content || typeof body.content !== "string") {
            return NextResponse.json(errorResponse("Content is required"), {
                status: 400,
            });
        }

        // Check if chat exists and belongs to the user
        const { data: chat, error: chatError } = await supabase
            .from("chats")
            .select("id")
            .eq("id", id)
            .eq("user_id", userId)
            .single();

        if (chatError || !chat) {
            return NextResponse.json(errorResponse("Chat not found"), {
                status: 404,
            });
        }

        // Insert message with user_id
        const { data, error } = await supabase
            .from("chat_messages")
            .insert({
                chat_id: id,
                role: body.role,
                content: body.content.trim(),
                user_id: userId,
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating message:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to create message"),
                { status: 500 },
            );
        }

        return NextResponse.json(
            successResponse(data as ChatMessage, "Message added successfully"),
            { status: 201 },
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Invalid request body"), {
            status: 400,
        });
    }
}

// DELETE /api/chats/[id] - Delete a chat
export async function DELETE(
    _request: NextRequest,
    { params }: { params: { id: string } },
) {
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
        const { id } = params;

        if (!id) {
            return NextResponse.json(errorResponse("ID is required"), {
                status: 400,
            });
        }

        // Check if chat exists and belongs to the user
        const { data: existingChat } = await supabase
            .from("chats")
            .select("id")
            .eq("id", id)
            .eq("user_id", userId)
            .single();

        if (!existingChat) {
            return NextResponse.json(errorResponse("Chat not found"), {
                status: 404,
            });
        }

        // Delete chat (messages will be cascade deleted)
        // RLS will ensure only user's own chats are deleted
        const { error } = await supabase
            .from("chats")
            .delete()
            .eq("id", id)
            .eq("user_id", userId);

        if (error) {
            console.error("Error deleting chat:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to delete chat"),
                { status: 500 },
            );
        }

        return NextResponse.json(
            successResponse({ id }, "Chat deleted successfully"),
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Unexpected error occurred"), {
            status: 500,
        });
    }
}
