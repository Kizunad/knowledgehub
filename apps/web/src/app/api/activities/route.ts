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
type ActivityType = "view" | "edit" | "create" | "sync";
type ViewType = "study" | "code" | "chatlog" | "ideas";

interface Activity {
    id: string;
    activity_type: ActivityType;
    view_type: ViewType;
    target_id: string;
    target_name: string;
    target_path: string | null;
    user_id: string;
    timestamp: string;
}

interface CreateActivityBody {
    activity_type: ActivityType;
    view_type: ViewType;
    target_id: string;
    target_name: string;
    target_path?: string;
}

// GET /api/activities - List recent activities for the current user
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
        const viewType = searchParams.get("view_type") as ViewType | null;
        const activityType = searchParams.get(
            "activity_type",
        ) as ActivityType | null;
        const limit = parseInt(searchParams.get("limit") || "20");
        const offset = parseInt(searchParams.get("offset") || "0");

        // Build query - RLS will automatically filter by user_id
        // But we explicitly filter as well for clarity and defense in depth
        let query = supabase
            .from("activities")
            .select("*", { count: "exact" })
            .eq("user_id", userId)
            .order("timestamp", { ascending: false })
            .range(offset, offset + limit - 1);

        // Apply filters
        if (viewType) {
            if (!["study", "code", "chatlog", "ideas"].includes(viewType)) {
                return NextResponse.json(errorResponse("Invalid view_type"), {
                    status: 400,
                });
            }
            query = query.eq("view_type", viewType);
        }

        if (activityType) {
            if (!["view", "edit", "create", "sync"].includes(activityType)) {
                return NextResponse.json(
                    errorResponse("Invalid activity_type"),
                    { status: 400 },
                );
            }
            query = query.eq("activity_type", activityType);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error("Error fetching activities:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to fetch activities"),
                { status: 500 },
            );
        }

        return NextResponse.json(
            successResponse({
                activities: data as Activity[],
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

// POST /api/activities - Record a new activity
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
        const body: CreateActivityBody = await request.json();

        // Validate required fields
        if (
            !body.activity_type ||
            !["view", "edit", "create", "sync"].includes(body.activity_type)
        ) {
            return NextResponse.json(
                errorResponse(
                    "activity_type must be 'view', 'edit', 'create', or 'sync'",
                ),
                { status: 400 },
            );
        }

        if (
            !body.view_type ||
            !["study", "code", "chatlog", "ideas"].includes(body.view_type)
        ) {
            return NextResponse.json(
                errorResponse(
                    "view_type must be 'study', 'code', 'chatlog', or 'ideas'",
                ),
                { status: 400 },
            );
        }

        if (!body.target_id) {
            return NextResponse.json(errorResponse("target_id is required"), {
                status: 400,
            });
        }

        if (!body.target_name || typeof body.target_name !== "string") {
            return NextResponse.json(errorResponse("target_name is required"), {
                status: 400,
            });
        }

        const { data, error } = await supabase
            .from("activities")
            .insert({
                activity_type: body.activity_type,
                view_type: body.view_type,
                target_id: body.target_id,
                target_name: body.target_name.trim(),
                target_path: body.target_path?.trim() || null,
                timestamp: new Date().toISOString(),
                user_id: userId, // Explicitly set user_id
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating activity:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to create activity"),
                { status: 500 },
            );
        }

        return NextResponse.json(
            successResponse(data as Activity, "Activity recorded successfully"),
            { status: 201 },
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Invalid request body"), {
            status: 400,
        });
    }
}

// DELETE /api/activities - Clear activities (only user's own activities)
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
        const viewType = searchParams.get("view_type") as ViewType | null;
        const olderThan = searchParams.get("older_than"); // ISO date string

        // Build delete query - always filter by user_id
        let query = supabase.from("activities").delete().eq("user_id", userId);

        // Apply filters
        if (viewType) {
            if (!["study", "code", "chatlog", "ideas"].includes(viewType)) {
                return NextResponse.json(errorResponse("Invalid view_type"), {
                    status: 400,
                });
            }
            query = query.eq("view_type", viewType);
        }

        if (olderThan) {
            const date = new Date(olderThan);
            if (isNaN(date.getTime())) {
                return NextResponse.json(
                    errorResponse("Invalid older_than date format"),
                    { status: 400 },
                );
            }
            query = query.lt("timestamp", olderThan);
        }

        // If no filters, require explicit confirmation
        if (!viewType && !olderThan) {
            return NextResponse.json(
                errorResponse(
                    "Specify 'view_type' or 'older_than' to delete activities",
                ),
                { status: 400 },
            );
        }

        const { error, count } = await query;

        if (error) {
            console.error("Error deleting activities:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to delete activities"),
                { status: 500 },
            );
        }

        return NextResponse.json(
            successResponse(
                { deleted: count || 0 },
                "Activities deleted successfully",
            ),
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Unexpected error occurred"), {
            status: 500,
        });
    }
}
