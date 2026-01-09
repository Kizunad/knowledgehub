import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import crypto from "crypto";

// API Key header name
export const API_KEY_HEADER = "x-hub-api-key";

// API Key prefix for easy identification
export const API_KEY_PREFIX = "hub_";

/**
 * Authentication result
 */
export interface AuthResult {
    authenticated: boolean;
    userId?: string;
    keyId?: string;
    error?: string;
}

/**
 * Generate a new API key
 * Format: hub_<32 random hex characters>
 */
export function generateApiKey(): string {
    const randomBytes = crypto.randomBytes(16).toString("hex");
    return `${API_KEY_PREFIX}${randomBytes}`;
}

/**
 * Hash an API key for storage
 * We store only the hash, never the plain key
 */
export function hashApiKey(apiKey: string): string {
    return crypto.createHash("sha256").update(apiKey).digest("hex");
}

/**
 * Validate API key format
 */
export function isValidApiKeyFormat(apiKey: string): boolean {
    // Must start with prefix and be 36 characters total (4 prefix + 32 hex)
    if (!apiKey.startsWith(API_KEY_PREFIX)) {
        return false;
    }

    const keyPart = apiKey.slice(API_KEY_PREFIX.length);
    return /^[a-f0-9]{32}$/i.test(keyPart);
}

/**
 * Extract API key from request
 */
export function extractApiKey(request: NextRequest): string | null {
    // Check header first
    const headerKey = request.headers.get(API_KEY_HEADER);
    if (headerKey) {
        return headerKey;
    }

    // Check Authorization header (Bearer token)
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        if (token.startsWith(API_KEY_PREFIX)) {
            return token;
        }
    }

    // Check query parameter (less secure, for testing)
    const { searchParams } = new URL(request.url);
    const queryKey = searchParams.get("api_key");
    if (queryKey) {
        return queryKey;
    }

    return null;
}

/**
 * Validate API key against database
 */
export async function validateApiKey(apiKey: string): Promise<AuthResult> {
    // Check format
    if (!isValidApiKeyFormat(apiKey)) {
        return {
            authenticated: false,
            error: "Invalid API key format",
        };
    }

    // Get service client for database access
    const supabase = createServiceClient();
    if (!supabase) {
        return {
            authenticated: false,
            error: "Database not configured",
        };
    }

    try {
        // Hash the key to look up in database
        const keyHash = hashApiKey(apiKey);

        // Look up key in database
        const { data: apiKeyRecord, error } = await supabase
            .from("api_keys")
            .select("id, user_id, name, scopes, expires_at, last_used_at")
            .eq("key_hash", keyHash)
            .eq("revoked", false)
            .single();

        if (error || !apiKeyRecord) {
            return {
                authenticated: false,
                error: "Invalid or revoked API key",
            };
        }

        // Check expiration
        if (apiKeyRecord.expires_at) {
            const expiresAt = new Date(apiKeyRecord.expires_at);
            if (expiresAt < new Date()) {
                return {
                    authenticated: false,
                    error: "API key has expired",
                };
            }
        }

        // Update last used timestamp (fire and forget)
        supabase
            .from("api_keys")
            .update({ last_used_at: new Date().toISOString() })
            .eq("id", apiKeyRecord.id)
            .then(() => {});

        return {
            authenticated: true,
            userId: apiKeyRecord.user_id,
            keyId: apiKeyRecord.id,
        };
    } catch (error) {
        console.error("Error validating API key:", error);
        return {
            authenticated: false,
            error: "Failed to validate API key",
        };
    }
}

/**
 * Authenticate request using API key
 * Returns AuthResult with authentication status
 */
export async function authenticateRequest(
    request: NextRequest
): Promise<AuthResult> {
    const apiKey = extractApiKey(request);

    if (!apiKey) {
        return {
            authenticated: false,
            error: "No API key provided",
        };
    }

    return validateApiKey(apiKey);
}

/**
 * Check if API key authentication is optional
 * When no API key is provided but Supabase is configured with anonymous access
 */
export function isAuthOptional(): boolean {
    // In development or when explicitly configured, allow anonymous access
    const allowAnonymous = process.env.HUB_ALLOW_ANONYMOUS_SYNC === "true";
    const isDev = process.env.NODE_ENV === "development";

    return allowAnonymous || isDev;
}

/**
 * Middleware helper for API routes that require authentication
 */
export async function requireAuth(
    request: NextRequest
): Promise<{ auth: AuthResult; shouldContinue: boolean }> {
    const auth = await authenticateRequest(request);

    // If authenticated, continue
    if (auth.authenticated) {
        return { auth, shouldContinue: true };
    }

    // If auth is optional (dev mode or configured), continue without auth
    if (isAuthOptional()) {
        return {
            auth: { authenticated: false, error: undefined },
            shouldContinue: true,
        };
    }

    // Otherwise, block the request
    return { auth, shouldContinue: false };
}
