import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

// Check for required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Helper to check if Supabase is configured
export function isSupabaseConfigured(): boolean {
    return Boolean(supabaseUrl && supabaseAnonKey);
}

export function createClient() {
    if (!supabaseUrl || !supabaseAnonKey) {
        console.error("⚠️ Supabase environment variables not configured");
        return null;
    }

    const cookieStore = cookies();

    return createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            get(name: string) {
                return cookieStore.get(name)?.value;
            },
            set(name: string, value: string, options: CookieOptions) {
                try {
                    cookieStore.set({ name, value, ...options });
                } catch (error) {
                    // The `set` method was called from a Server Component.
                    // This can be ignored if you have middleware refreshing
                    // user sessions.
                }
            },
            remove(name: string, options: CookieOptions) {
                try {
                    cookieStore.set({ name, value: "", ...options });
                } catch (error) {
                    // The `delete` method was called from a Server Component.
                    // This can be ignored if you have middleware refreshing
                    // user sessions.
                }
            },
        },
    });
}

// Create a client with service role for admin operations
export function createServiceClient() {
    if (!supabaseUrl || !supabaseServiceKey) {
        console.error(
            "⚠️ Supabase service role key not configured. Admin operations will not work.",
        );
        return null;
    }

    return createServerClient(supabaseUrl, supabaseServiceKey, {
        cookies: {
            get() {
                return undefined;
            },
            set() {},
            remove() {},
        },
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}

// ============================================================
// USER AUTHENTICATION HELPERS
// ============================================================

/**
 * Get the current authenticated user
 * @returns User object if authenticated, null otherwise
 */
export async function getCurrentUser(): Promise<User | null> {
    const supabase = createClient();
    if (!supabase) {
        return null;
    }

    try {
        const {
            data: { user },
            error,
        } = await supabase.auth.getUser();
        if (error) {
            console.error("Error getting current user:", error.message);
            return null;
        }
        return user;
    } catch (error) {
        console.error("Unexpected error getting current user:", error);
        return null;
    }
}

/**
 * Get the current user's ID
 * @returns User ID string if authenticated, null otherwise
 */
export async function getCurrentUserId(): Promise<string | null> {
    const user = await getCurrentUser();
    return user?.id ?? null;
}

/**
 * Result type for requireAuth function
 */
export interface AuthResult {
    user: User;
    userId: string;
}

/**
 * Require authentication for an API route
 * Returns the user if authenticated, or throws an error response
 *
 * @example
 * ```ts
 * export async function POST(request: NextRequest) {
 *     const authResult = await requireAuth();
 *     if (authResult instanceof NextResponse) {
 *         return authResult; // Return 401 error
 *     }
 *     const { user, userId } = authResult;
 *     // Continue with authenticated request...
 * }
 * ```
 */
export async function requireAuth(): Promise<AuthResult | NextResponse> {
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
        const {
            data: { user },
            error,
        } = await supabase.auth.getUser();

        if (error) {
            console.error("Auth error:", error.message);
            return NextResponse.json(
                errorResponse("Authentication failed", error.message),
                { status: 401 },
            );
        }

        if (!user) {
            return NextResponse.json(
                errorResponse(
                    "Authentication required",
                    "Please log in to access this resource",
                ),
                { status: 401 },
            );
        }

        return {
            user,
            userId: user.id,
        };
    } catch (error) {
        console.error("Unexpected auth error:", error);
        return NextResponse.json(errorResponse("Authentication error"), {
            status: 500,
        });
    }
}

/**
 * Check if the auth result is an error response
 */
export function isAuthError(
    result: AuthResult | NextResponse,
): result is NextResponse {
    return result instanceof NextResponse;
}

/**
 * Require authentication with optional user ID validation
 * Use this when you need to verify the user owns a specific resource
 *
 * @param resourceUserId - The user_id from the resource being accessed
 */
export async function requireAuthAndOwnership(
    resourceUserId: string | null,
): Promise<AuthResult | NextResponse> {
    const authResult = await requireAuth();

    if (isAuthError(authResult)) {
        return authResult;
    }

    if (resourceUserId && resourceUserId !== authResult.userId) {
        return NextResponse.json(
            errorResponse(
                "Access denied",
                "You don't have permission to access this resource",
            ),
            { status: 403 },
        );
    }

    return authResult;
}

// ============================================================
// API RESPONSE HELPERS
// ============================================================

// Helper type for API responses
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// Helper function to create success response
export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
    return {
        success: true,
        data,
        message,
    };
}

// Helper function to create error response
export function errorResponse(error: string, message?: string): ApiResponse {
    return {
        success: false,
        error,
        message,
    };
}

// ============================================================
// DEVELOPMENT MODE HELPERS
// ============================================================

/**
 * Check if we're in development mode with auth bypass enabled
 * This allows unauthenticated access during local development
 */
export function isDevModeAuthBypass(): boolean {
    return (
        process.env.NODE_ENV === "development" &&
        process.env.DEV_AUTH_BYPASS === "true"
    );
}

/**
 * Require authentication with development mode bypass option
 * In development with DEV_AUTH_BYPASS=true, returns a mock user
 */
export async function requireAuthWithDevBypass(): Promise<
    AuthResult | NextResponse
> {
    // In development mode with bypass enabled, return mock user
    if (isDevModeAuthBypass()) {
        console.warn("⚠️ DEV MODE: Auth bypass enabled - using mock user");
        return {
            user: {
                id: "dev-user-00000000-0000-0000-0000-000000000000",
                email: "dev@localhost",
                created_at: new Date().toISOString(),
                app_metadata: {},
                user_metadata: {},
                aud: "authenticated",
            } as User,
            userId: "dev-user-00000000-0000-0000-0000-000000000000",
        };
    }

    return requireAuth();
}
