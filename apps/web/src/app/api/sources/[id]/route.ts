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

interface DirectorySource {
    id: string;
    name: string;
    mode: DirectorySourceMode;
    path: string;
    branch: string | null;
    description: string | null;
    synced_at: string | null;
    user_id: string;
    created_at: string;
    updated_at: string;
}

interface UpdateSourceBody {
    name?: string;
    description?: string;
    branch?: string;
    path?: string;
}

interface RouteContext {
    params: Promise<{ id: string }>;
}

// GET /api/sources/[id] - Get a single source
export async function GET(_request: NextRequest, context: RouteContext) {
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
        const { id } = await context.params;

        if (!id) {
            return NextResponse.json(errorResponse("Source ID is required"), {
                status: 400,
            });
        }

        // Get source with file count - RLS will filter by user_id, but we explicitly check too
        const { data, error } = await supabase
            .from("directory_sources")
            .select(
                `
                *,
                files:files(count)
            `,
            )
            .eq("id", id)
            .eq("user_id", userId)
            .single();

        if (error) {
            if (error.code === "PGRST116") {
                return NextResponse.json(errorResponse("Source not found"), {
                    status: 404,
                });
            }
            console.error("Error fetching source:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to fetch source"),
                { status: 500 },
            );
        }

        // Transform the response to include file_count
        const source = {
            ...data,
            file_count: data.files?.[0]?.count || 0,
        };
        delete (source as Record<string, unknown>).files;

        return NextResponse.json(
            successResponse(source as DirectorySource & { file_count: number }),
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Unexpected error occurred"), {
            status: 500,
        });
    }
}

// PATCH /api/sources/[id] - Update a single source
export async function PATCH(request: NextRequest, context: RouteContext) {
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
        const { id } = await context.params;

        if (!id) {
            return NextResponse.json(errorResponse("Source ID is required"), {
                status: 400,
            });
        }

        const body: UpdateSourceBody = await request.json();

        // Build update object with only allowed fields
        const updateData: Record<string, unknown> = {};

        if (body.name !== undefined) {
            if (
                typeof body.name !== "string" ||
                body.name.trim().length === 0
            ) {
                return NextResponse.json(
                    errorResponse("Name must be a non-empty string"),
                    { status: 400 },
                );
            }
            updateData.name = body.name.trim();
        }

        if (body.description !== undefined) {
            updateData.description =
                typeof body.description === "string"
                    ? body.description.trim() || null
                    : null;
        }

        if (body.branch !== undefined) {
            updateData.branch =
                typeof body.branch === "string"
                    ? body.branch.trim() || null
                    : null;
        }

        if (body.path !== undefined) {
            if (
                typeof body.path !== "string" ||
                body.path.trim().length === 0
            ) {
                return NextResponse.json(
                    errorResponse("Path must be a non-empty string"),
                    { status: 400 },
                );
            }
            updateData.path = body.path.trim();
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                errorResponse("No valid fields to update"),
                { status: 400 },
            );
        }

        // Add updated_at timestamp
        updateData.updated_at = new Date().toISOString();

        // RLS will ensure only user's own sources are updated
        // But we explicitly filter as well for defense in depth
        const { data, error } = await supabase
            .from("directory_sources")
            .update(updateData)
            .eq("id", id)
            .eq("user_id", userId)
            .select()
            .single();

        if (error) {
            if (error.code === "PGRST116") {
                return NextResponse.json(errorResponse("Source not found"), {
                    status: 404,
                });
            }
            console.error("Error updating source:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to update source"),
                { status: 500 },
            );
        }

        return NextResponse.json(
            successResponse(
                data as DirectorySource,
                "Source updated successfully",
            ),
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Invalid request body"), {
            status: 400,
        });
    }
}

// DELETE /api/sources/[id] - Delete a single source
export async function DELETE(_request: NextRequest, context: RouteContext) {
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
        const { id } = await context.params;

        if (!id) {
            return NextResponse.json(errorResponse("Source ID is required"), {
                status: 400,
            });
        }

        // Check if source exists and belongs to the user
        const { data: existing, error: checkError } = await supabase
            .from("directory_sources")
            .select("id, name")
            .eq("id", id)
            .eq("user_id", userId)
            .single();

        if (checkError || !existing) {
            return NextResponse.json(errorResponse("Source not found"), {
                status: 404,
            });
        }

        // Delete associated files first (cascade should handle this, but being explicit)
        // RLS will ensure only user's own files are deleted
        await supabase
            .from("files")
            .delete()
            .eq("source_id", id)
            .eq("user_id", userId);

        // Delete the source - RLS will ensure only user's own sources are deleted
        const { error } = await supabase
            .from("directory_sources")
            .delete()
            .eq("id", id)
            .eq("user_id", userId);

        if (error) {
            console.error("Error deleting source:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to delete source"),
                { status: 500 },
            );
        }

        return NextResponse.json(
            successResponse(
                { id, name: existing.name },
                "Source deleted successfully",
            ),
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Unexpected error occurred"), {
            status: 500,
        });
    }
}
