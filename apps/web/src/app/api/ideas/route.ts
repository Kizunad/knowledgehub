import { NextRequest, NextResponse } from "next/server";
import {
    createClient,
    isSupabaseConfigured,
    successResponse,
    errorResponse,
    requireAuth,
    requireAuthWithDevBypass,
    isAuthError,
} from "@/lib/supabase/server";

// Types
interface Idea {
    id: string;
    content: string;
    status: "inbox" | "active" | "archive";
    done: boolean;
    tags: string[] | null;
    refs: string[] | null;
    source_ref: string | null;
    user_id: string;
    created_at: string;
    updated_at: string;
}

interface CreateIdeaBody {
    content: string;
    status?: "inbox" | "active" | "archive";
    tags?: string[];
    refs?: string[];
    source_ref?: string;
}

interface UpdateIdeaBody {
    content?: string;
    status?: "inbox" | "active" | "archive";
    done?: boolean;
    tags?: string[];
    refs?: string[];
}

// GET /api/ideas - List all ideas for the current user
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
        const status = searchParams.get("status"); // inbox, active, archive
        const done = searchParams.get("done"); // true, false
        const tag = searchParams.get("tag"); // filter by tag
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = parseInt(searchParams.get("offset") || "0");

        // Build query - RLS will automatically filter by user_id
        // But we explicitly filter as well for clarity and defense in depth
        let query = supabase
            .from("ideas")
            .select("*", { count: "exact" })
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        // Apply filters
        if (status) {
            query = query.eq("status", status);
        }

        if (done !== null) {
            query = query.eq("done", done === "true");
        }

        if (tag) {
            query = query.contains("tags", [tag]);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error("Error fetching ideas:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to fetch ideas"),
                { status: 500 },
            );
        }

        return NextResponse.json(
            successResponse({
                ideas: data as Idea[],
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

// POST /api/ideas - Create a new idea
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
        const body: CreateIdeaBody = await request.json();

        // Validate required fields
        if (!body.content || typeof body.content !== "string") {
            return NextResponse.json(errorResponse("Content is required"), {
                status: 400,
            });
        }

        // Parse tags and refs from content if not provided
        const tags = body.tags || parseTagsFromContent(body.content);
        const refs = body.refs || parseRefsFromContent(body.content);

        const { data, error } = await supabase
            .from("ideas")
            .insert({
                content: body.content.trim(),
                status: body.status || "inbox",
                done: false,
                tags: tags.length > 0 ? tags : null,
                refs: refs.length > 0 ? refs : null,
                source_ref: body.source_ref || null,
                user_id: userId, // Explicitly set user_id
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating idea:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to create idea"),
                { status: 500 },
            );
        }

        return NextResponse.json(
            successResponse(data as Idea, "Idea created successfully"),
            { status: 201 },
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Invalid request body"), {
            status: 400,
        });
    }
}

// PATCH /api/ideas - Bulk update ideas (only user's own ideas)
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
        const body: { ids: string[]; updates: UpdateIdeaBody } =
            await request.json();

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

        // RLS will ensure only user's own ideas are updated
        // But we explicitly filter as well for defense in depth
        const { data, error } = await supabase
            .from("ideas")
            .update({ ...body.updates, updated_at: new Date().toISOString() })
            .eq("user_id", userId)
            .in("id", body.ids)
            .select();

        if (error) {
            console.error("Error updating ideas:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to update ideas"),
                { status: 500 },
            );
        }

        return NextResponse.json(
            successResponse(
                data as Idea[],
                `Updated ${data?.length || 0} ideas`,
            ),
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Invalid request body"), {
            status: 400,
        });
    }
}

// DELETE /api/ideas - Bulk delete ideas (only user's own ideas)
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

        // RLS will ensure only user's own ideas are deleted
        // But we explicitly filter as well for defense in depth
        const { error, count } = await supabase
            .from("ideas")
            .delete()
            .eq("user_id", userId)
            .in("id", ids);

        if (error) {
            console.error("Error deleting ideas:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to delete ideas"),
                { status: 500 },
            );
        }

        return NextResponse.json(
            successResponse(
                { deleted: count || ids.length },
                "Ideas deleted successfully",
            ),
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Unexpected error occurred"), {
            status: 500,
        });
    }
}

// Helper: Parse #tags from content
function parseTagsFromContent(content: string): string[] {
    const tagRegex = /#[\w\u4e00-\u9fa5]+/g;
    const matches = content.match(tagRegex);
    if (!matches) return [];
    return [...new Set(matches.map((t) => t.slice(1)))];
}

// Helper: Parse @refs from content
function parseRefsFromContent(content: string): string[] {
    const refRegex = /@[\w]+:[^\s]+/g;
    const matches = content.match(refRegex);
    if (!matches) return [];
    return [...new Set(matches)];
}
