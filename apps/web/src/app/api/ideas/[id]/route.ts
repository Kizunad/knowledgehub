import { NextRequest, NextResponse } from "next/server";
import {
    createClient,
    isSupabaseConfigured,
    successResponse,
    errorResponse,
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
    created_at: string;
    updated_at: string;
}

interface UpdateIdeaBody {
    content?: string;
    status?: "inbox" | "active" | "archive";
    done?: boolean;
    tags?: string[];
    refs?: string[];
    source_ref?: string;
}

// GET /api/ideas/[id] - Get a single idea by ID
export async function GET(
    _request: NextRequest,
    { params }: { params: { id: string } },
) {
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

        const { data, error } = await supabase
            .from("ideas")
            .select("*")
            .eq("id", id)
            .single();

        if (error) {
            if (error.code === "PGRST116") {
                return NextResponse.json(errorResponse("Idea not found"), {
                    status: 404,
                });
            }
            console.error("Error fetching idea:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to fetch idea"),
                { status: 500 },
            );
        }

        return NextResponse.json(successResponse(data as Idea));
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Unexpected error occurred"), {
            status: 500,
        });
    }
}

// PUT /api/ideas/[id] - Update a single idea
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } },
) {
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

        const body: UpdateIdeaBody = await request.json();

        // Validate that at least one field is being updated
        if (Object.keys(body).length === 0) {
            return NextResponse.json(
                errorResponse("At least one field to update is required"),
                { status: 400 },
            );
        }

        // Build update object with only provided fields
        const updateData: Record<string, unknown> = {};

        if (body.content !== undefined) {
            updateData.content = body.content.trim();
        }
        if (body.status !== undefined) {
            if (!["inbox", "active", "archive"].includes(body.status)) {
                return NextResponse.json(
                    errorResponse(
                        "Status must be 'inbox', 'active', or 'archive'",
                    ),
                    { status: 400 },
                );
            }
            updateData.status = body.status;
        }
        if (body.done !== undefined) {
            updateData.done = Boolean(body.done);
        }
        if (body.tags !== undefined) {
            updateData.tags = body.tags.length > 0 ? body.tags : null;
        }
        if (body.refs !== undefined) {
            updateData.refs = body.refs.length > 0 ? body.refs : null;
        }
        if (body.source_ref !== undefined) {
            updateData.source_ref = body.source_ref || null;
        }

        const { data, error } = await supabase
            .from("ideas")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            if (error.code === "PGRST116") {
                return NextResponse.json(errorResponse("Idea not found"), {
                    status: 404,
                });
            }
            console.error("Error updating idea:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to update idea"),
                { status: 500 },
            );
        }

        return NextResponse.json(
            successResponse(data as Idea, "Idea updated successfully"),
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Invalid request body"), {
            status: 400,
        });
    }
}

// DELETE /api/ideas/[id] - Delete a single idea
export async function DELETE(
    _request: NextRequest,
    { params }: { params: { id: string } },
) {
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

        // First check if the idea exists
        const { data: existingIdea } = await supabase
            .from("ideas")
            .select("id")
            .eq("id", id)
            .single();

        if (!existingIdea) {
            return NextResponse.json(errorResponse("Idea not found"), {
                status: 404,
            });
        }

        const { error } = await supabase.from("ideas").delete().eq("id", id);

        if (error) {
            console.error("Error deleting idea:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to delete idea"),
                { status: 500 },
            );
        }

        return NextResponse.json(
            successResponse({ id }, "Idea deleted successfully"),
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Unexpected error occurred"), {
            status: 500,
        });
    }
}

// PATCH /api/ideas/[id] - Update idea with partial data
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } },
) {
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

        const body: UpdateIdeaBody = await request.json();

        // Validate that at least one field is being updated
        if (Object.keys(body).length === 0) {
            return NextResponse.json(
                errorResponse("At least one field to update is required"),
                { status: 400 },
            );
        }

        // Build update object with only provided fields
        const updateData: Record<string, unknown> = {};

        if (body.content !== undefined) {
            updateData.content = body.content.trim();
        }
        if (body.status !== undefined) {
            if (!["inbox", "active", "archive"].includes(body.status)) {
                return NextResponse.json(
                    errorResponse(
                        "Status must be 'inbox', 'active', or 'archive'",
                    ),
                    { status: 400 },
                );
            }
            updateData.status = body.status;
        }
        if (body.done !== undefined) {
            updateData.done = Boolean(body.done);
        }
        if (body.tags !== undefined) {
            updateData.tags = body.tags.length > 0 ? body.tags : null;
        }
        if (body.refs !== undefined) {
            updateData.refs = body.refs.length > 0 ? body.refs : null;
        }
        if (body.source_ref !== undefined) {
            updateData.source_ref = body.source_ref || null;
        }

        const { data, error } = await supabase
            .from("ideas")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            if (error.code === "PGRST116") {
                return NextResponse.json(errorResponse("Idea not found"), {
                    status: 404,
                });
            }
            console.error("Error updating idea:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to update idea"),
                { status: 500 },
            );
        }

        return NextResponse.json(
            successResponse(data as Idea, "Idea updated successfully"),
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Invalid request body"), {
            status: 400,
        });
    }
}
