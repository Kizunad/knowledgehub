import { NextRequest, NextResponse } from "next/server";
import {
    createClient,
    createServiceClient,
    isSupabaseConfigured,
    successResponse,
    errorResponse,
} from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/api-key";

// Types
interface SyncFilePayload {
    path: string;
    name: string;
    content: string;
    size: number;
    mime_type?: string;
    file_hash: string;
}

interface SyncRequestBody {
    source_id: string;
    files: SyncFilePayload[];
    deleted_paths?: string[];
    dry_run?: boolean;
}

interface SyncResult {
    source_id: string;
    files_added: number;
    files_updated: number;
    files_deleted: number;
    files_unchanged: number;
    errors: string[];
    synced_at: string;
}

// GET /api/sync - Get sync status for a source
export async function GET(request: NextRequest) {
    if (!isSupabaseConfigured()) {
        return NextResponse.json(errorResponse("Supabase not configured"), {
            status: 503,
        });
    }

    // Authenticate request using API key
    const { auth, shouldContinue } = await requireAuth(request);
    if (!shouldContinue) {
        return NextResponse.json(
            errorResponse(auth.error || "Authentication required"),
            { status: 401 },
        );
    }

    // Get user ID from API key auth, or use anonymous access in dev mode
    const userId = auth.userId;

    const supabase = createClient();
    if (!supabase) {
        return NextResponse.json(
            errorResponse("Failed to create Supabase client"),
            { status: 500 },
        );
    }

    try {
        const { searchParams } = new URL(request.url);
        const sourceId = searchParams.get("source_id");

        if (!sourceId) {
            return NextResponse.json(errorResponse("source_id is required"), {
                status: 400,
            });
        }

        // Build query for source info
        let sourceQuery = supabase
            .from("directory_sources")
            .select("id, name, path, mode, synced_at, user_id")
            .eq("id", sourceId);

        // Filter by user_id if authenticated
        if (userId) {
            sourceQuery = sourceQuery.eq("user_id", userId);
        }

        const { data: source, error: sourceError } = await sourceQuery.single();

        if (sourceError || !source) {
            return NextResponse.json(errorResponse("Source not found"), {
                status: 404,
            });
        }

        // Build file count query
        let fileCountQuery = supabase
            .from("files")
            .select("*", { count: "exact", head: true })
            .eq("source_id", sourceId);

        // Filter by user_id if authenticated
        if (userId) {
            fileCountQuery = fileCountQuery.eq("user_id", userId);
        }

        const { count: fileCount } = await fileCountQuery;

        // Build sync logs query
        let syncLogsQuery = supabase
            .from("sync_logs")
            .select("*")
            .eq("source_id", sourceId)
            .order("started_at", { ascending: false })
            .limit(5);

        const { data: syncLogs } = await syncLogsQuery;

        return NextResponse.json(
            successResponse({
                source,
                file_count: fileCount || 0,
                recent_syncs: syncLogs || [],
            }),
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Unexpected error occurred"), {
            status: 500,
        });
    }
}

// POST /api/sync - Sync files from CLI
export async function POST(request: NextRequest) {
    if (!isSupabaseConfigured()) {
        return NextResponse.json(errorResponse("Supabase not configured"), {
            status: 503,
        });
    }

    // Authenticate request using API key
    const { auth, shouldContinue } = await requireAuth(request);
    if (!shouldContinue) {
        return NextResponse.json(
            errorResponse(auth.error || "Authentication required"),
            { status: 401 },
        );
    }

    // Get user ID from API key auth
    const userId = auth.userId;

    // Log authentication status for debugging
    if (auth.authenticated) {
        console.log(`Sync request authenticated with key: ${auth.keyId}`);
    }

    // Use service client for sync operations (requires service role key)
    const supabase = createServiceClient() || createClient();
    if (!supabase) {
        return NextResponse.json(
            errorResponse("Failed to create Supabase client"),
            { status: 500 },
        );
    }

    try {
        const body: SyncRequestBody = await request.json();

        // Validate required fields
        if (!body.source_id) {
            return NextResponse.json(errorResponse("source_id is required"), {
                status: 400,
            });
        }

        if (!body.files || !Array.isArray(body.files)) {
            return NextResponse.json(errorResponse("files array is required"), {
                status: 400,
            });
        }

        // Build source query - verify source exists and is local_sync mode
        let sourceQuery = supabase
            .from("directory_sources")
            .select("id, mode, user_id")
            .eq("id", body.source_id);

        // Filter by user_id if authenticated
        if (userId) {
            sourceQuery = sourceQuery.eq("user_id", userId);
        }

        const { data: source, error: sourceError } = await sourceQuery.single();

        if (sourceError || !source) {
            return NextResponse.json(errorResponse("Source not found"), {
                status: 404,
            });
        }

        if (source.mode !== "local_sync") {
            return NextResponse.json(
                errorResponse("Source is not configured for local_sync mode"),
                { status: 400 },
            );
        }

        // Use the source's user_id for data operations
        const sourceUserId = source.user_id;

        // Create sync log entry with optional API key tracking
        const syncLogData: {
            source_id: string;
            status: string;
            api_key_id?: string;
        } = {
            source_id: body.source_id,
            status: "syncing",
        };

        if (auth.keyId) {
            syncLogData.api_key_id = auth.keyId;
        }

        const { data: syncLog, error: logError } = await supabase
            .from("sync_logs")
            .insert(syncLogData)
            .select()
            .single();

        if (logError) {
            console.error("Error creating sync log:", logError);
        }

        // Track results
        const result: SyncResult = {
            source_id: body.source_id,
            files_added: 0,
            files_updated: 0,
            files_deleted: 0,
            files_unchanged: 0,
            errors: [],
            synced_at: new Date().toISOString(),
        };

        // Build existing files query
        let existingFilesQuery = supabase
            .from("files")
            .select("path, file_hash")
            .eq("source_id", body.source_id);

        // Filter by user_id if available
        if (sourceUserId) {
            existingFilesQuery = existingFilesQuery.eq("user_id", sourceUserId);
        }

        // Dry run mode - just return what would happen
        if (body.dry_run) {
            const { data: existingFiles } = await existingFilesQuery;

            const existingMap = new Map(
                (existingFiles || []).map((f) => [f.path, f.file_hash]),
            );

            for (const file of body.files) {
                const existingHash = existingMap.get(file.path);
                if (!existingHash) {
                    result.files_added++;
                } else if (existingHash !== file.file_hash) {
                    result.files_updated++;
                } else {
                    result.files_unchanged++;
                }
            }

            if (body.deleted_paths) {
                result.files_deleted = body.deleted_paths.length;
            }

            return NextResponse.json(
                successResponse(
                    { ...result, dry_run: true },
                    "Dry run completed",
                ),
            );
        }

        // Get existing files for comparison
        const { data: existingFiles } = await existingFilesQuery;

        const existingMap = new Map(
            (existingFiles || []).map((f) => [f.path, f.file_hash]),
        );

        // Process files
        for (const file of body.files) {
            try {
                const existingHash = existingMap.get(file.path);

                if (!existingHash) {
                    // New file - insert with user_id
                    const insertData: Record<string, unknown> = {
                        source_id: body.source_id,
                        path: file.path,
                        name: file.name,
                        content: file.content,
                        size: file.size,
                        mime_type: file.mime_type || null,
                        file_hash: file.file_hash,
                    };

                    // Include user_id if available
                    if (sourceUserId) {
                        insertData.user_id = sourceUserId;
                    }

                    const { error: insertError } = await supabase
                        .from("files")
                        .insert(insertData);

                    if (insertError) {
                        result.errors.push(
                            `Insert error for ${file.path}: ${insertError.message}`,
                        );
                    } else {
                        result.files_added++;
                    }
                } else if (existingHash !== file.file_hash) {
                    // File changed - update
                    let updateQuery = supabase
                        .from("files")
                        .update({
                            content: file.content,
                            size: file.size,
                            mime_type: file.mime_type || null,
                            file_hash: file.file_hash,
                        })
                        .eq("source_id", body.source_id)
                        .eq("path", file.path);

                    // Filter by user_id if available
                    if (sourceUserId) {
                        updateQuery = updateQuery.eq("user_id", sourceUserId);
                    }

                    const { error: updateError } = await updateQuery;

                    if (updateError) {
                        result.errors.push(
                            `Update error for ${file.path}: ${updateError.message}`,
                        );
                    } else {
                        result.files_updated++;
                    }
                } else {
                    // File unchanged
                    result.files_unchanged++;
                }
            } catch (fileError) {
                result.errors.push(
                    `Error processing ${file.path}: ${String(fileError)}`,
                );
            }
        }

        // Handle deleted files
        if (body.deleted_paths && body.deleted_paths.length > 0) {
            let deleteQuery = supabase
                .from("files")
                .delete()
                .eq("source_id", body.source_id)
                .in("path", body.deleted_paths);

            // Filter by user_id if available
            if (sourceUserId) {
                deleteQuery = deleteQuery.eq("user_id", sourceUserId);
            }

            const { error: deleteError, count } = await deleteQuery;

            if (deleteError) {
                result.errors.push(`Delete error: ${deleteError.message}`);
            } else {
                result.files_deleted = count || body.deleted_paths.length;
            }
        }

        // Update source synced_at
        await supabase
            .from("directory_sources")
            .update({ synced_at: result.synced_at })
            .eq("id", body.source_id);

        // Update sync log
        if (syncLog) {
            await supabase
                .from("sync_logs")
                .update({
                    status: result.errors.length > 0 ? "error" : "success",
                    files_added: result.files_added,
                    files_updated: result.files_updated,
                    files_deleted: result.files_deleted,
                    error_message:
                        result.errors.length > 0
                            ? result.errors.join("; ")
                            : null,
                    completed_at: result.synced_at,
                })
                .eq("id", syncLog.id);
        }

        return NextResponse.json(
            successResponse(
                result,
                `Sync completed: ${result.files_added} added, ${result.files_updated} updated, ${result.files_deleted} deleted`,
            ),
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Invalid request body"), {
            status: 400,
        });
    }
}

// DELETE /api/sync - Clear all synced files for a source
export async function DELETE(request: NextRequest) {
    if (!isSupabaseConfigured()) {
        return NextResponse.json(errorResponse("Supabase not configured"), {
            status: 503,
        });
    }

    // Authenticate request using API key
    const { auth, shouldContinue } = await requireAuth(request);
    if (!shouldContinue) {
        return NextResponse.json(
            errorResponse(auth.error || "Authentication required"),
            { status: 401 },
        );
    }

    // Get user ID from API key auth
    const userId = auth.userId;

    const supabase = createServiceClient() || createClient();
    if (!supabase) {
        return NextResponse.json(
            errorResponse("Failed to create Supabase client"),
            { status: 500 },
        );
    }

    try {
        const { searchParams } = new URL(request.url);
        const sourceId = searchParams.get("source_id");

        if (!sourceId) {
            return NextResponse.json(errorResponse("source_id is required"), {
                status: 400,
            });
        }

        // Build source query - verify source exists
        let sourceQuery = supabase
            .from("directory_sources")
            .select("id, user_id")
            .eq("id", sourceId);

        // Filter by user_id if authenticated
        if (userId) {
            sourceQuery = sourceQuery.eq("user_id", userId);
        }

        const { data: source } = await sourceQuery.single();

        if (!source) {
            return NextResponse.json(errorResponse("Source not found"), {
                status: 404,
            });
        }

        // Use the source's user_id for data operations
        const sourceUserId = source.user_id;

        // Build delete query for files
        let deleteQuery = supabase
            .from("files")
            .delete()
            .eq("source_id", sourceId);

        // Filter by user_id if available
        if (sourceUserId) {
            deleteQuery = deleteQuery.eq("user_id", sourceUserId);
        }

        const { error, count } = await deleteQuery;

        if (error) {
            console.error("Error clearing files:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to clear files"),
                { status: 500 },
            );
        }

        // Reset synced_at
        await supabase
            .from("directory_sources")
            .update({ synced_at: null })
            .eq("id", sourceId);

        return NextResponse.json(
            successResponse(
                { deleted: count || 0 },
                `Cleared ${count || 0} files from source`,
            ),
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Unexpected error occurred"), {
            status: 500,
        });
    }
}
