import { NextResponse } from "next/server";
import {
    createServiceClient,
    isSupabaseConfigured,
} from "@/lib/supabase/server";

export interface HealthCheckResult {
    status: "healthy" | "degraded" | "unhealthy";
    timestamp: string;
    checks: {
        supabase: {
            configured: boolean;
            connected: boolean;
            latency_ms?: number;
            error?: string;
        };
        database: {
            connected: boolean;
            latency_ms?: number;
            tables_accessible?: boolean;
            error?: string;
        };
        realtime: {
            available: boolean;
            error?: string;
        };
    };
    version: string;
}

/**
 * Health check endpoint for monitoring Supabase connectivity
 * GET /api/health
 */
export async function GET() {
    const startTime = Date.now();
    const result: HealthCheckResult = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        checks: {
            supabase: {
                configured: false,
                connected: false,
            },
            database: {
                connected: false,
            },
            realtime: {
                available: false,
            },
        },
        version: process.env.npm_package_version || "0.1.0",
    };

    // Check 1: Supabase configuration
    result.checks.supabase.configured = isSupabaseConfigured();

    if (!result.checks.supabase.configured) {
        result.status = "unhealthy";
        result.checks.supabase.error =
            "Supabase environment variables not configured";
        return NextResponse.json(result, { status: 503 });
    }

    // Check 2: Supabase connection and database access
    const supabase = createServiceClient();
    if (!supabase) {
        result.status = "unhealthy";
        result.checks.supabase.error = "Failed to create Supabase client";
        return NextResponse.json(result, { status: 503 });
    }

    try {
        // Test basic connectivity with a simple query
        const dbStart = Date.now();
        const { error } = await supabase.from("ideas").select("id").limit(1);
        const dbLatency = Date.now() - dbStart;

        if (error) {
            result.checks.database.connected = false;
            result.checks.database.error = error.message;
            result.status = "degraded";
        } else {
            result.checks.supabase.connected = true;
            result.checks.supabase.latency_ms = Date.now() - startTime;
            result.checks.database.connected = true;
            result.checks.database.latency_ms = dbLatency;
            result.checks.database.tables_accessible = true;
        }
    } catch (err) {
        result.checks.database.error =
            err instanceof Error ? err.message : "Unknown error";
        result.status = "degraded";
    }

    // Check 3: Test multiple critical tables accessibility
    if (result.checks.database.connected) {
        const tables = ["ideas", "files", "directory_sources", "chats"];
        const tableResults: Record<string, boolean> = {};

        for (const table of tables) {
            try {
                const { error } = await supabase
                    .from(table)
                    .select("id")
                    .limit(1);
                tableResults[table] = !error;
            } catch {
                tableResults[table] = false;
            }
        }

        const allTablesAccessible = Object.values(tableResults).every(Boolean);
        result.checks.database.tables_accessible = allTablesAccessible;

        if (!allTablesAccessible) {
            result.status = "degraded";
        }
    }

    // Check 4: Realtime availability (check if realtime is enabled)
    try {
        // We can't fully test realtime without subscribing, but we can check the channel creation
        const channel = supabase.channel("health-check");
        if (channel) {
            result.checks.realtime.available = true;
            // Clean up the channel
            await supabase.removeChannel(channel);
        }
    } catch (err) {
        result.checks.realtime.error =
            err instanceof Error ? err.message : "Unknown error";
    }

    // Determine final status
    if (
        !result.checks.supabase.connected ||
        !result.checks.database.connected
    ) {
        result.status = "unhealthy";
    } else if (
        !result.checks.database.tables_accessible ||
        !result.checks.realtime.available
    ) {
        result.status = "degraded";
    }

    const statusCode =
        result.status === "healthy"
            ? 200
            : result.status === "degraded"
              ? 200
              : 503;
    return NextResponse.json(result, { status: statusCode });
}

/**
 * POST /api/health
 * Run a more comprehensive database test
 */
export async function POST() {
    if (!isSupabaseConfigured()) {
        return NextResponse.json(
            { error: "Supabase not configured" },
            { status: 503 },
        );
    }

    const supabase = createServiceClient();
    if (!supabase) {
        return NextResponse.json(
            { error: "Failed to create Supabase client" },
            { status: 503 },
        );
    }

    const testResults: Record<
        string,
        { success: boolean; latency_ms: number; error?: string }
    > = {};

    // Test CRUD operations on ideas table
    const testId = crypto.randomUUID();
    const testContent = `[Health Check Test] ${new Date().toISOString()}`;

    // Create
    try {
        const start = Date.now();
        const { error } = await supabase.from("ideas").insert({
            id: testId,
            content: testContent,
            status: "inbox",
            done: false,
            tags: ["_health_check"],
        });
        testResults.create = {
            success: !error,
            latency_ms: Date.now() - start,
            error: error?.message,
        };
    } catch (err) {
        testResults.create = {
            success: false,
            latency_ms: 0,
            error: err instanceof Error ? err.message : "Unknown error",
        };
    }

    // Read
    try {
        const start = Date.now();
        const { data, error } = await supabase
            .from("ideas")
            .select("*")
            .eq("id", testId)
            .single();
        testResults.read = {
            success: !error && data?.content === testContent,
            latency_ms: Date.now() - start,
            error: error?.message,
        };
    } catch (err) {
        testResults.read = {
            success: false,
            latency_ms: 0,
            error: err instanceof Error ? err.message : "Unknown error",
        };
    }

    // Update
    try {
        const start = Date.now();
        const { error } = await supabase
            .from("ideas")
            .update({ done: true })
            .eq("id", testId);
        testResults.update = {
            success: !error,
            latency_ms: Date.now() - start,
            error: error?.message,
        };
    } catch (err) {
        testResults.update = {
            success: false,
            latency_ms: 0,
            error: err instanceof Error ? err.message : "Unknown error",
        };
    }

    // Delete (cleanup)
    try {
        const start = Date.now();
        const { error } = await supabase
            .from("ideas")
            .delete()
            .eq("id", testId);
        testResults.delete = {
            success: !error,
            latency_ms: Date.now() - start,
            error: error?.message,
        };
    } catch (err) {
        testResults.delete = {
            success: false,
            latency_ms: 0,
            error: err instanceof Error ? err.message : "Unknown error",
        };
    }

    // Test global search function
    try {
        const start = Date.now();
        const { error } = await supabase.rpc("global_search", {
            search_query: "test",
            result_limit: 1,
        });
        testResults.search_function = {
            success: !error,
            latency_ms: Date.now() - start,
            error: error?.message,
        };
    } catch (err) {
        testResults.search_function = {
            success: false,
            latency_ms: 0,
            error: err instanceof Error ? err.message : "Unknown error",
        };
    }

    const allPassed = Object.values(testResults).every((r) => r.success);
    const totalLatency = Object.values(testResults).reduce(
        (sum, r) => sum + r.latency_ms,
        0,
    );

    return NextResponse.json({
        success: allPassed,
        total_latency_ms: totalLatency,
        tests: testResults,
        timestamp: new Date().toISOString(),
    });
}
