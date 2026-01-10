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

interface CreateNoteBody {
    source_id?: string;
    title?: string;
    content: string;
    content_type?: NoteContentType;
    language?: string;
    tags?: string[];
    is_pinned?: boolean;
}

interface UpdateNoteBody {
    title?: string;
    content?: string;
    content_type?: NoteContentType;
    language?: string;
    tags?: string[];
    is_pinned?: boolean;
}

// GET /api/notes - List all notes for the current user
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
        const contentType = searchParams.get("content_type") as NoteContentType | null;
        const isPinned = searchParams.get("is_pinned");
        const search = searchParams.get("search");
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = parseInt(searchParams.get("offset") || "0");

        // Build query
        let query = supabase
            .from("notes")
            .select("*", { count: "exact" })
            .eq("user_id", userId)
            .order("is_pinned", { ascending: false })
            .order("updated_at", { ascending: false })
            .range(offset, offset + limit - 1);

        // Apply filters
        if (sourceId) {
            query = query.eq("source_id", sourceId);
        }

        if (contentType) {
            query = query.eq("content_type", contentType);
        }

        if (isPinned !== null) {
            query = query.eq("is_pinned", isPinned === "true");
        }

        if (search) {
            query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error("Error fetching notes:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to fetch notes"),
                { status: 500 },
            );
        }

        return NextResponse.json(
            successResponse({
                notes: data as Note[],
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

// POST /api/notes - Create a new note
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
        const body: CreateNoteBody = await request.json();

        // Validate content_type if provided
        if (
            body.content_type &&
            !["markdown", "plaintext", "code"].includes(body.content_type)
        ) {
            return NextResponse.json(
                errorResponse("Content type must be 'markdown', 'plaintext', or 'code'"),
                { status: 400 },
            );
        }

        // If source_id is provided, verify it belongs to the user
        if (body.source_id) {
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

        const { data, error } = await supabase
            .from("notes")
            .insert({
                source_id: body.source_id || null,
                title: body.title?.trim() || null,
                content: body.content || "",
                content_type: body.content_type || "markdown",
                language: body.language?.trim() || null,
                tags: body.tags || null,
                is_pinned: body.is_pinned || false,
                user_id: userId,
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating note:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to create note"),
                { status: 500 },
            );
        }

        return NextResponse.json(
            successResponse(data as Note, "Note created successfully"),
            { status: 201 },
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Invalid request body"), {
            status: 400,
        });
    }
}

// PATCH /api/notes - Bulk update notes
export async function PATCH(request: NextRequest) {
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
        const body: { ids: string[]; updates: UpdateNoteBody } = await request.json();

        if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
            return NextResponse.json(errorResponse("IDs array is required"), {
                status: 400,
            });
        }

        if (!body.updates || Object.keys(body.updates).length === 0) {
            return NextResponse.json(
                errorResponse("Updates object is required"),
                { status: 400 },
            );
        }

        // Validate content_type if provided
        if (
            body.updates.content_type &&
            !["markdown", "plaintext", "code"].includes(body.updates.content_type)
        ) {
            return NextResponse.json(
                errorResponse("Content type must be 'markdown', 'plaintext', or 'code'"),
                { status: 400 },
            );
        }

        // Build update object with only allowed fields
        const updateData: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };
        if (body.updates.title !== undefined) {
            updateData.title = body.updates.title?.trim() || null;
        }
        if (body.updates.content !== undefined) {
            updateData.content = body.updates.content;
        }
        if (body.updates.content_type !== undefined) {
            updateData.content_type = body.updates.content_type;
        }
        if (body.updates.language !== undefined) {
            updateData.language = body.updates.language?.trim() || null;
        }
        if (body.updates.tags !== undefined) {
            updateData.tags = body.updates.tags;
        }
        if (body.updates.is_pinned !== undefined) {
            updateData.is_pinned = body.updates.is_pinned;
        }

        const { data, error } = await supabase
            .from("notes")
            .update(updateData)
            .eq("user_id", userId)
            .in("id", body.ids)
            .select();

        if (error) {
            console.error("Error updating notes:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to update notes"),
                { status: 500 },
            );
        }

        return NextResponse.json(
            successResponse(
                data as Note[],
                `Updated ${data?.length || 0} notes`,
            ),
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Invalid request body"), {
            status: 400,
        });
    }
}

// DELETE /api/notes - Bulk delete notes
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

        const { error, count } = await supabase
            .from("notes")
            .delete()
            .eq("user_id", userId)
            .in("id", ids);

        if (error) {
            console.error("Error deleting notes:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to delete notes"),
                { status: 500 },
            );
        }

        return NextResponse.json(
            successResponse(
                { deleted: count || ids.length },
                "Notes deleted successfully",
            ),
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Unexpected error occurred"), {
            status: 500,
        });
    }
}
