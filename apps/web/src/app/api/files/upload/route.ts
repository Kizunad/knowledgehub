import { NextRequest, NextResponse } from "next/server";
import {
    createClient,
    isSupabaseConfigured,
    successResponse,
    errorResponse,
    requireAuthWithDevBypass,
    isAuthError,
} from "@/lib/supabase/server";
import crypto from "crypto";

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Generate hash for file content
function generateFileHash(content: string): string {
    return crypto.createHash("sha256").update(content).digest("hex");
}

// POST /api/files/upload - Upload files via web interface
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
        const formData = await request.formData();
        const sourceId = formData.get("source_id") as string;
        const files = formData.getAll("files") as File[];

        // Validate source_id
        if (!sourceId) {
            return NextResponse.json(errorResponse("source_id is required"), {
                status: 400,
            });
        }

        // Validate files
        if (!files || files.length === 0) {
            return NextResponse.json(
                errorResponse("At least one file is required"),
                { status: 400 },
            );
        }

        // Verify source exists and belongs to the user
        const { data: source, error: sourceError } = await supabase
            .from("directory_sources")
            .select("id, name, mode, user_id")
            .eq("id", sourceId)
            .eq("user_id", userId)
            .single();

        if (sourceError || !source) {
            return NextResponse.json(errorResponse("Source not found"), {
                status: 404,
            });
        }

        // Process uploaded files
        const results: {
            uploaded: string[];
            errors: { file: string; error: string }[];
        } = {
            uploaded: [],
            errors: [],
        };

        for (const file of files) {
            try {
                // Validate file size
                if (file.size > MAX_FILE_SIZE) {
                    results.errors.push({
                        file: file.name,
                        error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
                    });
                    continue;
                }

                // Read file content
                const content = await file.text();
                const fileHash = generateFileHash(content);

                // Check if file already exists (by path) - filtered by user_id
                const filePath = `uploads/${file.name}`;
                const { data: existingFile } = await supabase
                    .from("files")
                    .select("id, file_hash")
                    .eq("source_id", sourceId)
                    .eq("path", filePath)
                    .eq("user_id", userId)
                    .single();

                if (existingFile) {
                    // Update if content changed
                    if (existingFile.file_hash !== fileHash) {
                        const { error: updateError } = await supabase
                            .from("files")
                            .update({
                                content,
                                size: file.size,
                                mime_type: file.type || null,
                                file_hash: fileHash,
                                updated_at: new Date().toISOString(),
                            })
                            .eq("id", existingFile.id)
                            .eq("user_id", userId);

                        if (updateError) {
                            results.errors.push({
                                file: file.name,
                                error: updateError.message,
                            });
                        } else {
                            results.uploaded.push(file.name);
                        }
                    } else {
                        // File unchanged
                        results.uploaded.push(file.name);
                    }
                } else {
                    // Insert new file with user_id
                    const { error: insertError } = await supabase
                        .from("files")
                        .insert({
                            source_id: sourceId,
                            path: filePath,
                            name: file.name,
                            content,
                            size: file.size,
                            mime_type: file.type || null,
                            file_hash: fileHash,
                            user_id: userId,
                        });

                    if (insertError) {
                        results.errors.push({
                            file: file.name,
                            error: insertError.message,
                        });
                    } else {
                        results.uploaded.push(file.name);
                    }
                }
            } catch (fileError) {
                results.errors.push({
                    file: file.name,
                    error:
                        fileError instanceof Error
                            ? fileError.message
                            : "Unknown error",
                });
            }
        }

        // Update source synced_at
        if (results.uploaded.length > 0) {
            await supabase
                .from("directory_sources")
                .update({ synced_at: new Date().toISOString() })
                .eq("id", sourceId)
                .eq("user_id", userId);
        }

        const message =
            results.errors.length > 0
                ? `Uploaded ${results.uploaded.length} files with ${results.errors.length} errors`
                : `Successfully uploaded ${results.uploaded.length} files`;

        return NextResponse.json(
            successResponse(
                {
                    uploaded: results.uploaded,
                    errors: results.errors,
                    total: files.length,
                },
                message,
            ),
        );
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json(
            errorResponse(
                error instanceof Error ? error.message : "Upload failed",
            ),
            { status: 500 },
        );
    }
}
