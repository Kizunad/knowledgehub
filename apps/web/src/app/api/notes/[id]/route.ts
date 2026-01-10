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
type NoteContentType = "markdown" | "plaintext" | "code";

interface Note {
    id: string;
    source_id: string | null;
    title: string | null;
    content: string;
    content_type: NoteContentType;
    language: string | null;
    tags: string[] | null;
    is_pinned: boolean;
    user_id: string;
    created_at: string;
    updated_at: string;
}

interface UpdateNoteBody {
    title?: string;
    content?: string;
    content_type?: NoteContentType;
    language?: string;
    tags?: string[];
    is_pinned?: boolean;
    source_id?: string | null;
}

// GET /api/notes/[id] - Get a single note
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
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
        const { id } = await params;

        const { data, error } = await supabase
            .from("notes")
            .select("*")
            .eq("id", id)
            .eq("user_id", userId)
            .single();

        if (error) {
            if (error.code === "PGRST116") {
                return NextResponse.json(errorResponse("Note not found"), {
                    status: 404,
                });
            }
            console.error("Error fetching note:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to fetch note"),
                { status: 500 },
            );
        }

        return NextResponse.json(successResponse(data as Note));
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Unexpected error occurred"), {
            status: 500,
        });
    }
}

// PATCH /api/notes/[id] - Update a single note
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
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
        const { id } = await params;
        const body: UpdateNoteBody = await request.json();

        // Validate content_type if provided
        if (
            body.content_type &&
            !["markdown", "plaintext", "code"].includes(body.content_type)
        ) {
            return NextResponse.json(
                errorResponse(
                    "Content type must be 'markdown', 'plaintext', or 'code'",
                ),
                { status: 400 },
            );
        }

        // If changing source_id, verify it belongs to the user
        if (body.source_id !== undefined && body.source_id !== null) {
            const { data: sourceData, error: sourceError } = await supabase
                .from("directory_sources")
                .select("id")
                .eq("id", body.source_id)
                .eq("user_id", userId)
                .single();

            if (sourceError || !sourceData) {
                return NextResponse.json(
                    errorResponse("Source not found or access denied"),
                    { status: 404 },
                );
            }
        }

        // Build update object with only allowed fields
        const updateData: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };
        if (body.title !== undefined) {
            updateData.title = body.title?.trim() || null;
        }
        if (body.content !== undefined) {
            updateData.content = body.content;
        }
        if (body.content_type !== undefined) {
            updateData.content_type = body.content_type;
        }
        if (body.language !== undefined) {
            updateData.language = body.language?.trim() || null;
        }
        if (body.tags !== undefined) {
            updateData.tags = body.tags;
        }
        if (body.is_pinned !== undefined) {
            updateData.is_pinned = body.is_pinned;
        }
        if (body.source_id !== undefined) {
            updateData.source_id = body.source_id;
        }

        const { data, error } = await supabase
            .from("notes")
            .update(updateData)
            .eq("id", id)
            .eq("user_id", userId)
            .select()
            .single();

        if (error) {
            if (error.code === "PGRST116") {
                return NextResponse.json(errorResponse("Note not found"), {
                    status: 404,
                });
            }
            console.error("Error updating note:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to update note"),
                { status: 500 },
            );
        }

        return NextResponse.json(
            successResponse(data as Note, "Note updated successfully"),
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Invalid request body"), {
            status: 400,
        });
    }
}

// DELETE /api/notes/[id] - Delete a single note
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
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
        const { id } = await params;

        // First check if the note exists and belongs to the user
        const { data: existingNote, error: checkError } = await supabase
            .from("notes")
            .select("id")
            .eq("id", id)
            .eq("user_id", userId)
            .single();

        if (checkError || !existingNote) {
            return NextResponse.json(errorResponse("Note not found"), {
                status: 404,
            });
        }

        const { error } = await supabase
            .from("notes")
            .delete()
            .eq("id", id)
            .eq("user_id", userId);

        if (error) {
            console.error("Error deleting note:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to delete note"),
                { status: 500 },
            );
        }

        return NextResponse.json(
            successResponse({ deleted: true }, "Note deleted successfully"),
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Unexpected error occurred"), {
            status: 500,
        });
    }
}
