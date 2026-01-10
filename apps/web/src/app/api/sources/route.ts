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
type DirectorySourceMode = "github" | "link" | "local_sync";
type DirectorySourceType = "code" | "study";

interface DirectorySource {
    id: string;
    name: string;
    mode: DirectorySourceMode;
    source_type: DirectorySourceType;
    path: string;
    branch: string | null;
    description: string | null;
    synced_at: string | null;
    user_id: string;
    created_at: string;
    updated_at: string;
}

interface CreateSourceBody {
    name: string;
    mode: DirectorySourceMode;
    path: string;
    branch?: string;
    description?: string;
    source_type?: DirectorySourceType;
}

interface UpdateSourceBody {
    name?: string;
    description?: string;
    branch?: string;
}

// GET /api/sources - List all directory sources for the current user
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
        const mode = searchParams.get("mode"); // github, link, local_sync
        const source_type = searchParams.get("source_type"); // code, study
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = parseInt(searchParams.get("offset") || "0");

        // Build query - RLS will automatically filter by user_id
        // But we explicitly filter as well for clarity and defense in depth
        let query = supabase
            .from("directory_sources")
            .select("*", { count: "exact" })
            .eq("user_id", userId)
            .order("updated_at", { ascending: false })
            .range(offset, offset + limit - 1);

        // Apply filters
        if (mode) {
            query = query.eq("mode", mode);
        }
        if (source_type) {
            query = query.eq("source_type", source_type);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error("Error fetching sources:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to fetch sources"),
                { status: 500 },
            );
        }

        return NextResponse.json(
            successResponse({
                sources: data as DirectorySource[],
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

// POST /api/sources - Create a new directory source
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
        const body: CreateSourceBody = await request.json();

        // Validate required fields
        if (!body.name || typeof body.name !== "string") {
            return NextResponse.json(errorResponse("Name is required"), {
                status: 400,
            });
        }

        if (
            !body.mode ||
            !["github", "link", "local_sync"].includes(body.mode)
        ) {
            return NextResponse.json(
                errorResponse("Mode must be 'github', 'link', or 'local_sync'"),
                { status: 400 },
            );
        }

        if (!body.path || typeof body.path !== "string") {
            return NextResponse.json(errorResponse("Path is required"), {
                status: 400,
            });
        }

        // Validate mode-specific requirements
        if (body.mode === "github" && !body.path.includes("/")) {
            return NextResponse.json(
                errorResponse("GitHub path must be in format 'owner/repo'"),
                { status: 400 },
            );
        }

        if (body.mode === "link" && !isValidUrl(body.path)) {
            return NextResponse.json(
                errorResponse("Link mode requires a valid URL"),
                { status: 400 },
            );
        }

        // Validate source_type if provided
        if (body.source_type && !["code", "study"].includes(body.source_type)) {
            return NextResponse.json(
                errorResponse("source_type must be 'code' or 'study'"),
                { status: 400 },
            );
        }

        const { data, error } = await supabase
            .from("directory_sources")
            .insert({
                name: body.name.trim(),
                mode: body.mode,
                path: body.path.trim(),
                branch: body.branch?.trim() || null,
                description: body.description?.trim() || null,
                source_type: body.source_type || "code", // Default to 'code'
                user_id: userId, // Explicitly set user_id
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating source:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to create source"),
                { status: 500 },
            );
        }

        return NextResponse.json(
            successResponse(
                data as DirectorySource,
                "Source created successfully",
            ),
            { status: 201 },
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Invalid request body"), {
            status: 400,
        });
    }
}

// PATCH /api/sources - Bulk update sources (only user's own sources)
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
        const body: { ids: string[]; updates: UpdateSourceBody } =
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

        // Build update object with only allowed fields
        const updateData: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };
        if (body.updates.name !== undefined) {
            updateData.name = body.updates.name.trim();
        }
        if (body.updates.description !== undefined) {
            updateData.description = body.updates.description.trim() || null;
        }
        if (body.updates.branch !== undefined) {
            updateData.branch = body.updates.branch.trim() || null;
        }

        // RLS will ensure only user's own sources are updated
        // But we explicitly filter as well for defense in depth
        const { data, error } = await supabase
            .from("directory_sources")
            .update(updateData)
            .eq("user_id", userId)
            .in("id", body.ids)
            .select();

        if (error) {
            console.error("Error updating sources:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to update sources"),
                { status: 500 },
            );
        }

        return NextResponse.json(
            successResponse(
                data as DirectorySource[],
                `Updated ${data?.length || 0} sources`,
            ),
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Invalid request body"), {
            status: 400,
        });
    }
}

// DELETE /api/sources - Bulk delete sources (only user's own sources)
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

        // RLS will ensure only user's own sources are deleted
        // But we explicitly filter as well for defense in depth
        const { error, count } = await supabase
            .from("directory_sources")
            .delete()
            .eq("user_id", userId)
            .in("id", ids);

        if (error) {
            console.error("Error deleting sources:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to delete sources"),
                { status: 500 },
            );
        }

        return NextResponse.json(
            successResponse(
                { deleted: count || ids.length },
                "Sources deleted successfully",
            ),
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Unexpected error occurred"), {
            status: 500,
        });
    }
}

// Helper: Validate URL
function isValidUrl(string: string): boolean {
    try {
        new URL(string);
        return true;
    } catch {
        return false;
    }
}
