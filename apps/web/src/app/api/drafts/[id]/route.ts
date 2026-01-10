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
type DraftContentType = "markdown" | "plaintext" | "code";

interface Draft {
    id: string;
    title: string | null;
    content: string;
    content_type: DraftContentType;
    language: string | null;
    target_source_id: string | null;
    is_auto_saved: boolean;
    user_id: string;
    created_at: string;
    updated_at: string;
}

interface UpdateDraftBody {
    title?: string;
    content?: string;
    content_type?: DraftContentType;
    language?: string;
    target_source_id?: string | null;
    is_auto_saved?: boolean;
}

// GET /api/drafts/[id] - Get a single draft
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
            .from("drafts")
            .select("*")
            .eq("id", id)
            .eq("user_id", userId)
            .single();

        if (error) {
            if (error.code === "PGRST116") {
                return NextResponse.json(errorResponse("Draft not found"), {
                    status: 404,
                });
            }
            console.error("Error fetching draft:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to fetch draft"),
                { status: 500 },
            );
        }

        return NextResponse.json(successResponse(data as Draft));
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Unexpected error occurred"), {
            status: 500,
        });
    }
}

// PATCH /api/drafts/[id] - Update a single draft
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
        const body: UpdateDraftBody = await request.json();

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

        // If changing target_source_id, verify it belongs to the user
        if (
            body.target_source_id !== undefined &&
            body.target_source_id !== null
        ) {
            const { data: sourceData, error: sourceError } = await supabase
                .from("directory_sources")
                .select("id")
                .eq("id", body.target_source_id)
                .eq("user_id", userId)
                .single();

            if (sourceError || !sourceData) {
                return NextResponse.json(
                    errorResponse("Target source not found or access denied"),
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
        if (body.target_source_id !== undefined) {
            updateData.target_source_id = body.target_source_id;
        }
        if (body.is_auto_saved !== undefined) {
            updateData.is_auto_saved = body.is_auto_saved;
        }

        const { data, error } = await supabase
            .from("drafts")
            .update(updateData)
            .eq("id", id)
            .eq("user_id", userId)
            .select()
            .single();

        if (error) {
            if (error.code === "PGRST116") {
                return NextResponse.json(errorResponse("Draft not found"), {
                    status: 404,
                });
            }
            console.error("Error updating draft:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to update draft"),
                { status: 500 },
            );
        }

        return NextResponse.json(
            successResponse(data as Draft, "Draft updated successfully"),
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Invalid request body"), {
            status: 400,
        });
    }
}

// DELETE /api/drafts/[id] - Delete a single draft
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

        // First check if the draft exists and belongs to the user
        const { data: existingDraft, error: checkError } = await supabase
            .from("drafts")
            .select("id")
            .eq("id", id)
            .eq("user_id", userId)
            .single();

        if (checkError || !existingDraft) {
            return NextResponse.json(errorResponse("Draft not found"), {
                status: 404,
            });
        }

        const { error } = await supabase
            .from("drafts")
            .delete()
            .eq("id", id)
            .eq("user_id", userId);

        if (error) {
            console.error("Error deleting draft:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to delete draft"),
                { status: 500 },
            );
        }

        return NextResponse.json(
            successResponse({ deleted: true }, "Draft deleted successfully"),
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Unexpected error occurred"), {
            status: 500,
        });
    }
}
