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
interface File {
    id: string;
    source_id: string;
    path: string;
    name: string;
    content: string | null;
    size: number | null;
    mime_type: string | null;
    file_hash: string | null;
    user_id: string;
    created_at: string;
    updated_at: string;
}

interface UpdateFileBody {
    name?: string;
    content?: string;
    size?: number;
    mime_type?: string;
    file_hash?: string;
}

interface RouteContext {
    params: Promise<{ id: string }>;
}

// GET /api/files/[id] - Get a single file by ID
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
            return NextResponse.json(errorResponse("ID is required"), {
                status: 400,
            });
        }

        // RLS will filter by user_id, but we explicitly check too for defense in depth
        const { data, error } = await supabase
            .from("files")
            .select("*")
            .eq("id", id)
            .eq("user_id", userId)
            .single();

        if (error) {
            if (error.code === "PGRST116") {
                return NextResponse.json(errorResponse("File not found"), {
                    status: 404,
                });
            }
            console.error("Error fetching file:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to fetch file"),
                { status: 500 },
            );
        }

        return NextResponse.json(successResponse(data as File));
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Unexpected error occurred"), {
            status: 500,
        });
    }
}

// PUT /api/files/[id] - Update a file
export async function PUT(request: NextRequest, context: RouteContext) {
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
            return NextResponse.json(errorResponse("ID is required"), {
                status: 400,
            });
        }

        const body: UpdateFileBody = await request.json();

        // Validate that at least one field is being updated
        if (Object.keys(body).length === 0) {
            return NextResponse.json(
                errorResponse("At least one field to update is required"),
                { status: 400 },
            );
        }

        // Build update object with only provided fields
        const updateData: Record<string, unknown> = {};

        if (body.name !== undefined) {
            updateData.name = body.name.trim();
        }
        if (body.content !== undefined) {
            updateData.content = body.content;
        }
        if (body.size !== undefined) {
            updateData.size = body.size;
        }
        if (body.mime_type !== undefined) {
            updateData.mime_type = body.mime_type;
        }
        if (body.file_hash !== undefined) {
            updateData.file_hash = body.file_hash;
        }

        // RLS will ensure only user's own files are updated
        // But we explicitly filter as well for defense in depth
        const { data, error } = await supabase
            .from("files")
            .update(updateData)
            .eq("id", id)
            .eq("user_id", userId)
            .select()
            .single();

        if (error) {
            if (error.code === "PGRST116") {
                return NextResponse.json(errorResponse("File not found"), {
                    status: 404,
                });
            }
            console.error("Error updating file:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to update file"),
                { status: 500 },
            );
        }

        return NextResponse.json(
            successResponse(data as File, "File updated successfully"),
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Invalid request body"), {
            status: 400,
        });
    }
}

// PATCH /api/files/[id] - Partial update a file
export async function PATCH(request: NextRequest, context: RouteContext) {
    // Same implementation as PUT for partial updates
    return PUT(request, context);
}

// DELETE /api/files/[id] - Delete a file
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
            return NextResponse.json(errorResponse("ID is required"), {
                status: 400,
            });
        }

        // Check if file exists and belongs to the user
        const { data: existingFile } = await supabase
            .from("files")
            .select("id")
            .eq("id", id)
            .eq("user_id", userId)
            .single();

        if (!existingFile) {
            return NextResponse.json(errorResponse("File not found"), {
                status: 404,
            });
        }

        // RLS will ensure only user's own files are deleted
        const { error } = await supabase
            .from("files")
            .delete()
            .eq("id", id)
            .eq("user_id", userId);

        if (error) {
            console.error("Error deleting file:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to delete file"),
                { status: 500 },
            );
        }

        return NextResponse.json(
            successResponse({ id }, "File deleted successfully"),
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Unexpected error occurred"), {
            status: 500,
        });
    }
}
