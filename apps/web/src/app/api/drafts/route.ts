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

interface CreateDraftBody {
    title?: string;
    content: string;
    content_type?: DraftContentType;
    language?: string;
    target_source_id?: string;
    is_auto_saved?: boolean;
}

interface UpdateDraftBody {
    title?: string;
    content?: string;
    content_type?: DraftContentType;
    language?: string;
    target_source_id?: string | null;
    is_auto_saved?: boolean;
}

// GET /api/drafts - List all drafts for the current user
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
        const targetSourceId = searchParams.get("target_source_id");
        const contentType = searchParams.get("content_type") as DraftContentType | null;
        const isAutoSaved = searchParams.get("is_auto_saved");
        const search = searchParams.get("search");
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = parseInt(searchParams.get("offset") || "0");

        // Build query
        let query = supabase
            .from("drafts")
            .select("*", { count: "exact" })
            .eq("user_id", userId)
            .order("updated_at", { ascending: false })
            .range(offset, offset + limit - 1);

        // Apply filters
        if (targetSourceId) {
            query = query.eq("target_source_id", targetSourceId);
        }

        if (contentType) {
            query = query.eq("content_type", contentType);
        }

        if (isAutoSaved !== null) {
            query = query.eq("is_auto_saved", isAutoSaved === "true");
        }

        if (search) {
            query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error("Error fetching drafts:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to fetch drafts"),
                { status: 500 },
            );
        }

        return NextResponse.json(
            successResponse({
                drafts: data as Draft[],
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

// POST /api/drafts - Create a new draft
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
        const body: CreateDraftBody = await request.json();

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

        // If target_source_id is provided, verify it belongs to the user
        if (body.target_source_id) {
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

        const { data, error } = await supabase
            .from("drafts")
            .insert({
                title: body.title?.trim() || null,
                content: body.content || "",
                content_type: body.content_type || "markdown",
                language: body.language?.trim() || null,
                target_source_id: body.target_source_id || null,
                is_auto_saved: body.is_auto_saved ?? true,
                user_id: userId,
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating draft:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to create draft"),
                { status: 500 },
            );
        }

        return NextResponse.json(
            successResponse(data as Draft, "Draft created successfully"),
            { status: 201 },
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Invalid request body"), {
            status: 400,
        });
    }
}

// PATCH /api/drafts - Bulk update drafts
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
        const body: { ids: string[]; updates: UpdateDraftBody } = await request.json();

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
        if (body.updates.target_source_id !== undefined) {
            updateData.target_source_id = body.updates.target_source_id;
        }
        if (body.updates.is_auto_saved !== undefined) {
            updateData.is_auto_saved = body.updates.is_auto_saved;
        }

        const { data, error } = await supabase
            .from("drafts")
            .update(updateData)
            .eq("user_id", userId)
            .in("id", body.ids)
            .select();

        if (error) {
            console.error("Error updating drafts:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to update drafts"),
                { status: 500 },
            );
        }

        return NextResponse.json(
            successResponse(
                data as Draft[],
                `Updated ${data?.length || 0} drafts`,
            ),
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Invalid request body"), {
            status: 400,
        });
    }
}

// DELETE /api/drafts - Bulk delete drafts
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
            .from("drafts")
            .delete()
            .eq("user_id", userId)
            .in("id", ids);

        if (error) {
            console.error("Error deleting drafts:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to delete drafts"),
                { status: 500 },
            );
        }

        return NextResponse.json(
            successResponse(
                { deleted: count || ids.length },
                "Drafts deleted successfully",
            ),
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Unexpected error occurred"), {
            status: 500,
        });
    }
}
