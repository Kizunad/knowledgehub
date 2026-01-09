import { NextRequest, NextResponse } from "next/server";
import {
    createServiceClient,
    isSupabaseConfigured,
    successResponse,
    errorResponse,
} from "@/lib/supabase/server";
import {
    generateApiKey,
    hashApiKey,
    API_KEY_PREFIX,
} from "@/lib/auth/api-key";

// Types
interface CreateApiKeyBody {
    name: string;
    scopes?: string[];
    expires_in_days?: number;
}

interface ApiKeyResponse {
    id: string;
    name: string;
    key_prefix: string;
    scopes: string[];
    expires_at: string | null;
    last_used_at: string | null;
    created_at: string;
}

// GET /api/auth/api-keys - List all API keys (without the actual key values)
export async function GET(_request: NextRequest) {
    if (!isSupabaseConfigured()) {
        return NextResponse.json(errorResponse("Supabase not configured"), {
            status: 503,
        });
    }

    const supabase = createServiceClient();
    if (!supabase) {
        return NextResponse.json(
            errorResponse("Failed to create Supabase client"),
            { status: 500 }
        );
    }

    try {
        const { data, error } = await supabase
            .from("api_keys")
            .select(
                "id, name, key_prefix, scopes, expires_at, last_used_at, created_at, revoked"
            )
            .eq("revoked", false)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching API keys:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to fetch API keys"),
                { status: 500 }
            );
        }

        return NextResponse.json(
            successResponse({
                keys: data as ApiKeyResponse[],
            })
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Unexpected error occurred"), {
            status: 500,
        });
    }
}

// POST /api/auth/api-keys - Generate a new API key
export async function POST(request: NextRequest) {
    if (!isSupabaseConfigured()) {
        return NextResponse.json(errorResponse("Supabase not configured"), {
            status: 503,
        });
    }

    const supabase = createServiceClient();
    if (!supabase) {
        return NextResponse.json(
            errorResponse("Failed to create Supabase client"),
            { status: 500 }
        );
    }

    try {
        const body: CreateApiKeyBody = await request.json();

        // Validate required fields
        if (!body.name || typeof body.name !== "string") {
            return NextResponse.json(errorResponse("Name is required"), {
                status: 400,
            });
        }

        // Generate new API key
        const apiKey = generateApiKey();
        const keyHash = hashApiKey(apiKey);
        const keyPrefix = apiKey.slice(0, API_KEY_PREFIX.length + 4); // "hub_" + first 4 chars

        // Calculate expiration if provided
        let expiresAt: string | null = null;
        if (body.expires_in_days && body.expires_in_days > 0) {
            const expireDate = new Date();
            expireDate.setDate(expireDate.getDate() + body.expires_in_days);
            expiresAt = expireDate.toISOString();
        }

        // Default scopes
        const scopes = body.scopes || ["sync"];

        // Insert into database
        const { data, error } = await supabase
            .from("api_keys")
            .insert({
                name: body.name.trim(),
                key_hash: keyHash,
                key_prefix: keyPrefix,
                scopes: scopes,
                expires_at: expiresAt,
            })
            .select("id, name, key_prefix, scopes, expires_at, created_at")
            .single();

        if (error) {
            console.error("Error creating API key:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to create API key"),
                { status: 500 }
            );
        }

        // Return the key ONLY ONCE - this is the only time the plain key is shown
        return NextResponse.json(
            successResponse(
                {
                    ...data,
                    key: apiKey, // Only returned on creation
                },
                "API key created successfully. Save this key - it won't be shown again!"
            ),
            { status: 201 }
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Invalid request body"), {
            status: 400,
        });
    }
}

// DELETE /api/auth/api-keys - Revoke an API key
export async function DELETE(request: NextRequest) {
    if (!isSupabaseConfigured()) {
        return NextResponse.json(errorResponse("Supabase not configured"), {
            status: 503,
        });
    }

    const supabase = createServiceClient();
    if (!supabase) {
        return NextResponse.json(
            errorResponse("Failed to create Supabase client"),
            { status: 500 }
        );
    }

    try {
        const { searchParams } = new URL(request.url);
        const keyId = searchParams.get("id");

        if (!keyId) {
            return NextResponse.json(errorResponse("Key ID is required"), {
                status: 400,
            });
        }

        // Revoke the key (soft delete)
        const { data, error } = await supabase
            .from("api_keys")
            .update({
                revoked: true,
                revoked_at: new Date().toISOString(),
            })
            .eq("id", keyId)
            .eq("revoked", false)
            .select("id, name")
            .single();

        if (error) {
            console.error("Error revoking API key:", error);
            return NextResponse.json(
                errorResponse(error.message, "Failed to revoke API key"),
                { status: 500 }
            );
        }

        if (!data) {
            return NextResponse.json(
                errorResponse("API key not found or already revoked"),
                { status: 404 }
            );
        }

        return NextResponse.json(
            successResponse(
                { id: data.id, name: data.name },
                "API key revoked successfully"
            )
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Unexpected error occurred"), {
            status: 500,
        });
    }
}
