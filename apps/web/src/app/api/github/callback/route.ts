import { NextRequest, NextResponse } from "next/server";

// ============================================================
// GitHub OAuth Configuration
// ============================================================

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface GitHubTokenResponse {
    access_token: string;
    token_type: string;
    scope: string;
    error?: string;
    error_description?: string;
}

interface GitHubUser {
    login: string;
    id: number;
    avatar_url: string;
    name: string | null;
    email: string | null;
}

// ============================================================
// GET /api/github/callback
// Handle OAuth callback from GitHub
// ============================================================

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Handle OAuth errors
    if (error) {
        console.error("[GitHub OAuth] Error:", error, errorDescription);
        return NextResponse.redirect(
            `${APP_URL}/settings?error=${encodeURIComponent(errorDescription || error)}`,
        );
    }

    // Validate required parameters
    if (!code) {
        return NextResponse.redirect(
            `${APP_URL}/settings?error=${encodeURIComponent("No authorization code received")}`,
        );
    }

    // Validate configuration
    if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
        console.error("[GitHub OAuth] Missing client ID or secret");
        return NextResponse.redirect(
            `${APP_URL}/settings?error=${encodeURIComponent("GitHub OAuth not configured")}`,
        );
    }

    try {
        // Exchange code for access token
        const tokenResponse = await fetch(
            "https://github.com/login/oauth/access_token",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({
                    client_id: GITHUB_CLIENT_ID,
                    client_secret: GITHUB_CLIENT_SECRET,
                    code,
                    redirect_uri: `${APP_URL}/api/github/callback`,
                }),
            },
        );

        if (!tokenResponse.ok) {
            throw new Error(`Token exchange failed: ${tokenResponse.status}`);
        }

        const tokenData: GitHubTokenResponse = await tokenResponse.json();

        if (tokenData.error) {
            throw new Error(tokenData.error_description || tokenData.error);
        }

        const accessToken = tokenData.access_token;

        // Fetch user info to validate token
        const userResponse = await fetch("https://api.github.com/user", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/vnd.github.v3+json",
                "User-Agent": "Hub-App",
            },
        });

        if (!userResponse.ok) {
            throw new Error(`Failed to fetch user info: ${userResponse.status}`);
        }

        const userData: GitHubUser = await userResponse.json();

        // Create response with success redirect
        // Store the token in a secure HTTP-only cookie
        const response = NextResponse.redirect(
            `${APP_URL}/settings?github_connected=true&github_user=${encodeURIComponent(userData.login)}`,
        );

        // Set the GitHub token as a secure, HTTP-only cookie
        // In production, consider using a more secure token storage mechanism
        response.cookies.set("github_token", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 30, // 30 days
        });

        // Store user info in a separate cookie (can be read by client)
        response.cookies.set(
            "github_user",
            JSON.stringify({
                login: userData.login,
                id: userData.id,
                avatar_url: userData.avatar_url,
                name: userData.name,
            }),
            {
                httpOnly: false,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                path: "/",
                maxAge: 60 * 60 * 24 * 30, // 30 days
            },
        );

        // If state contains a redirect path, use it
        if (state) {
            try {
                const stateData = JSON.parse(decodeURIComponent(state));
                if (stateData.redirect) {
                    return NextResponse.redirect(`${APP_URL}${stateData.redirect}`);
                }
            } catch {
                // Invalid state, ignore
            }
        }

        return response;
    } catch (err) {
        console.error("[GitHub OAuth] Error:", err);
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.redirect(
            `${APP_URL}/settings?error=${encodeURIComponent(errorMessage)}`,
        );
    }
}

// ============================================================
// POST /api/github/callback
// Alternative: Handle token exchange via API call
// ============================================================

export async function POST(request: NextRequest) {
    // Validate configuration
    if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
        return NextResponse.json(
            { error: "GitHub OAuth not configured" },
            { status: 503 },
        );
    }

    try {
        const body = await request.json();
        const { code, redirect_uri } = body;

        if (!code) {
            return NextResponse.json(
                { error: "Authorization code required" },
                { status: 400 },
            );
        }

        // Exchange code for access token
        const tokenResponse = await fetch(
            "https://github.com/login/oauth/access_token",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({
                    client_id: GITHUB_CLIENT_ID,
                    client_secret: GITHUB_CLIENT_SECRET,
                    code,
                    redirect_uri: redirect_uri || `${APP_URL}/api/github/callback`,
                }),
            },
        );

        if (!tokenResponse.ok) {
            throw new Error(`Token exchange failed: ${tokenResponse.status}`);
        }

        const tokenData: GitHubTokenResponse = await tokenResponse.json();

        if (tokenData.error) {
            return NextResponse.json(
                { error: tokenData.error_description || tokenData.error },
                { status: 400 },
            );
        }

        // Fetch user info
        const userResponse = await fetch("https://api.github.com/user", {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
                Accept: "application/vnd.github.v3+json",
                "User-Agent": "Hub-App",
            },
        });

        if (!userResponse.ok) {
            throw new Error(`Failed to fetch user info: ${userResponse.status}`);
        }

        const userData: GitHubUser = await userResponse.json();

        return NextResponse.json({
            success: true,
            data: {
                access_token: tokenData.access_token,
                token_type: tokenData.token_type,
                scope: tokenData.scope,
                user: {
                    login: userData.login,
                    id: userData.id,
                    avatar_url: userData.avatar_url,
                    name: userData.name,
                    email: userData.email,
                },
            },
        });
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
