import { NextRequest, NextResponse } from "next/server";

// ============================================================
// GitHub OAuth Configuration
// ============================================================

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// GitHub OAuth scopes
// https://docs.github.com/en/developers/apps/building-oauth-apps/scopes-for-oauth-apps
const DEFAULT_SCOPES = [
    "read:user",      // Read user profile
    "user:email",     // Read user email
    "repo",           // Full control of private repositories
    "read:org",       // Read organization membership
];

// ============================================================
// GET /api/github/authorize
// Redirect to GitHub OAuth authorization page
// ============================================================

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);

    // Optional: custom redirect path after OAuth completes
    const redirectPath = searchParams.get("redirect") || "/settings";

    // Optional: override scopes
    const scopeParam = searchParams.get("scopes");
    const scopes = scopeParam
        ? scopeParam.split(",").map(s => s.trim())
        : DEFAULT_SCOPES;

    // Validate configuration
    if (!GITHUB_CLIENT_ID) {
        console.error("[GitHub OAuth] Missing GITHUB_CLIENT_ID");
        return NextResponse.json(
            {
                error: "GitHub OAuth not configured",
                message: "Please set GITHUB_CLIENT_ID environment variable",
            },
            { status: 503 },
        );
    }

    // Build state parameter for security and redirect info
    const state = encodeURIComponent(
        JSON.stringify({
            redirect: redirectPath,
            timestamp: Date.now(),
            nonce: crypto.randomUUID(),
        }),
    );

    // Build GitHub authorization URL
    const authParams = new URLSearchParams({
        client_id: GITHUB_CLIENT_ID,
        redirect_uri: `${APP_URL}/api/github/callback`,
        scope: scopes.join(" "),
        state,
        allow_signup: "true",
    });

    const githubAuthUrl = `https://github.com/login/oauth/authorize?${authParams.toString()}`;

    // Redirect to GitHub
    return NextResponse.redirect(githubAuthUrl);
}

// ============================================================
// POST /api/github/authorize
// Return authorization URL for client-side redirect
// ============================================================

export async function POST(request: NextRequest) {
    // Validate configuration
    if (!GITHUB_CLIENT_ID) {
        return NextResponse.json(
            {
                error: "GitHub OAuth not configured",
                message: "Please set GITHUB_CLIENT_ID environment variable",
            },
            { status: 503 },
        );
    }

    try {
        const body = await request.json().catch(() => ({}));
        const { redirect = "/settings", scopes = DEFAULT_SCOPES } = body;

        // Build state parameter
        const state = encodeURIComponent(
            JSON.stringify({
                redirect,
                timestamp: Date.now(),
                nonce: crypto.randomUUID(),
            }),
        );

        // Build GitHub authorization URL
        const authParams = new URLSearchParams({
            client_id: GITHUB_CLIENT_ID,
            redirect_uri: `${APP_URL}/api/github/callback`,
            scope: Array.isArray(scopes) ? scopes.join(" ") : scopes,
            state,
            allow_signup: "true",
        });

        const authUrl = `https://github.com/login/oauth/authorize?${authParams.toString()}`;

        return NextResponse.json({
            success: true,
            data: {
                authorization_url: authUrl,
                scopes: Array.isArray(scopes) ? scopes : scopes.split(" "),
            },
        });
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
