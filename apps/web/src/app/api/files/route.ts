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

interface CreateFileBody {
    source_id: string;
    path: string;
    name: string;
    content?: string;
    size?: number;
    mime_type?: string;
    file_hash?: string;
}

interface UpdateFileBody {
    content?: string;
    size?: number;
    mime_type?: string;
    file_hash?: string;
}

// GET /api/files - List files with optional filters
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
        const path = searchParams.get("path");
        const mimeType = searchParams.get("mime_type");
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = parseInt(searchParams.get("offset") || "0");

        // Build query - RLS will automatically filter by user_id
        // But we explicitly filter as well for clarity and defense in depth
        let query = supabase
            .from("files")
            .select("*", { count: "exact" })
            .eq("user_id", userId)
            .order("updated_at", { ascending: false })
            .range(offset, offset + limit - 1);

        // Apply filters
        if (sourceId) {
            query = query.eq("source_id", sourceId);
        }

        if (path) {
            query = query.ilike("path", `${path}%`);
        }

        if (mimeType) {
            query = query.eq("mime_type", mimeType);
        }

        if (search) {
            query = query.or(`name.ilike.%${search}%,path.ilike.%${search}%`);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error("Error fetching files:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to fetch files"),
                { status: 500 },
            );
        }

        return NextResponse.json(
            successResponse({
                files: data as File[],
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

// POST /api/files - Create or upsert a file
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
        const body: CreateFileBody = await request.json();

        // Validate required fields
        if (!body.source_id) {
            return NextResponse.json(errorResponse("source_id is required"), {
                status: 400,
            });
        }

        if (!body.path || typeof body.path !== "string") {
            return NextResponse.json(errorResponse("path is required"), {
                status: 400,
            });
        }

        if (!body.name || typeof body.name !== "string") {
            return NextResponse.json(errorResponse("name is required"), {
                status: 400,
            });
        }

        // Check if source exists and belongs to the user
        const { data: source, error: sourceError } = await supabase
            .from("directory_sources")
            .select("id")
            .eq("id", body.source_id)
            .eq("user_id", userId)
            .single();

        if (sourceError || !source) {
            return NextResponse.json(errorResponse("Source not found"), {
                status: 404,
            });
        }

        // Upsert file (update if exists, insert if not)
        // Include user_id in the upsert
        const { data, error } = await supabase
            .from("files")
            .upsert(
                {
                    source_id: body.source_id,
                    path: body.path.trim(),
                    name: body.name.trim(),
                    content: body.content || null,
                    size: body.size || null,
                    mime_type: body.mime_type || null,
                    file_hash: body.file_hash || null,
                    user_id: userId,
                },
                {
                    onConflict: "source_id,path",
                },
            )
            .select()
            .single();

        if (error) {
            console.error("Error creating/updating file:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to create/update file"),
                { status: 500 },
            );
        }

        return NextResponse.json(
            successResponse(data as File, "File saved successfully"),
            { status: 201 },
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Invalid request body"), {
            status: 400,
        });
    }
}

// PATCH /api/files - Bulk update files
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
        const body: { ids: string[]; updates: UpdateFileBody } =
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

        // Build update object
        const updateData: Record<string, unknown> = {};

        if (body.updates.content !== undefined) {
            updateData.content = body.updates.content;
        }
        if (body.updates.size !== undefined) {
            updateData.size = body.updates.size;
        }
        if (body.updates.mime_type !== undefined) {
            updateData.mime_type = body.updates.mime_type;
        }
        if (body.updates.file_hash !== undefined) {
            updateData.file_hash = body.updates.file_hash;
        }

        // RLS will ensure only user's own files are updated
        // But we explicitly filter as well for defense in depth
        const { data, error } = await supabase
            .from("files")
            .update(updateData)
            .eq("user_id", userId)
            .in("id", body.ids)
            .select();

        if (error) {
            console.error("Error updating files:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to update files"),
                { status: 500 },
            );
        }

        return NextResponse.json(
            successResponse(
                data as File[],
                `Updated ${data?.length || 0} files`,
            ),
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Invalid request body"), {
            status: 400,
        });
    }
}

// DELETE /api/files - Bulk delete files
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
        const sourceId = searchParams.get("source_id");

        // Option 1: Delete by IDs
        if (idsParam) {
            const ids = idsParam.split(",").filter(Boolean);

            if (ids.length === 0) {
                return NextResponse.json(
                    errorResponse("At least one ID is required"),
                    { status: 400 },
                );
            }

            // RLS will ensure only user's own files are deleted
            // But we explicitly filter as well for defense in depth
            const { error, count } = await supabase
                .from("files")
                .delete()
                .eq("user_id", userId)
                .in("id", ids);

            if (error) {
                console.error("Error deleting files:", error);
                return NextResponse.json(
                    errorResponse(error.message, "Failed to delete files"),
                    { status: 500 },
                );
            }

            return NextResponse.json(
                successResponse(
                    { deleted: count || ids.length },
                    "Files deleted successfully",
                ),
            );
        }

        // Option 2: Delete all files for a source
        if (sourceId) {
            // First verify the source belongs to the user
            const { data: source } = await supabase
                .from("directory_sources")
                .select("id")
                .eq("id", sourceId)
                .eq("user_id", userId)
                .single();

            if (!source) {
                return NextResponse.json(errorResponse("Source not found"), {
                    status: 404,
                });
            }

            // RLS will ensure only user's own files are deleted
            const { error, count } = await supabase
                .from("files")
                .delete()
                .eq("user_id", userId)
                .eq("source_id", sourceId);

            if (error) {
                console.error("Error deleting source files:", error);
                return NextResponse.json(
                    errorResponse(
                        error.message,
                        "Failed to delete source files",
                    ),
                    { status: 500 },
                );
            }

            return NextResponse.json(
                successResponse(
                    { deleted: count || 0 },
                    "Source files deleted successfully",
                ),
            );
        }

        return NextResponse.json(
            errorResponse("Either 'ids' or 'source_id' parameter is required"),
            { status: 400 },
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Unexpected error occurred"), {
            status: 500,
        });
    }
}
