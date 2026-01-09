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
interface SearchResult {
    result_type: "file" | "chat" | "idea";
    id: string;
    title: string;
    snippet: string;
    path: string | null;
    rank: number;
}

interface SearchResponse {
    results: SearchResult[];
    query: string;
    total: number;
    limit: number;
}

// GET /api/search - Global search across files, chats, and ideas
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
        const query = searchParams.get("q");
        const type = searchParams.get("type"); // file, chat, idea, or null for all
        const limit = Math.min(
            parseInt(searchParams.get("limit") || "20"),
            100,
        );

        // Validate query
        if (!query || query.trim().length === 0) {
            return NextResponse.json(
                errorResponse("Search query is required (use ?q=your+query)"),
                { status: 400 },
            );
        }

        const trimmedQuery = query.trim();

        // If query is too short, return empty results
        if (trimmedQuery.length < 2) {
            return NextResponse.json(
                successResponse<SearchResponse>({
                    results: [],
                    query: trimmedQuery,
                    total: 0,
                    limit,
                }),
            );
        }

        // Use the global_search function from database
        // The function now filters by user_id automatically using auth.uid()
        const { data, error } = await supabase.rpc("global_search", {
            search_query: trimmedQuery,
            max_results: limit,
        });

        if (error) {
            console.error("Search error:", error);

            // Fallback to simple search if RPC fails
            const fallbackResults = await performFallbackSearch(
                supabase,
                trimmedQuery,
                type,
                limit,
                userId,
            );

            return NextResponse.json(
                successResponse<SearchResponse>({
                    results: fallbackResults,
                    query: trimmedQuery,
                    total: fallbackResults.length,
                    limit,
                }),
            );
        }

        // Filter by type if specified
        let results = (data as SearchResult[]) || [];
        if (type && ["file", "chat", "idea"].includes(type)) {
            results = results.filter((r) => r.result_type === type);
        }

        return NextResponse.json(
            successResponse<SearchResponse>({
                results,
                query: trimmedQuery,
                total: results.length,
                limit,
            }),
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Unexpected error occurred"), {
            status: 500,
        });
    }
}

// POST /api/search - Search with more options (body parameters)
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
        const body = await request.json();
        const {
            query,
            types = ["file", "chat", "idea"],
            limit = 20,
        }: {
            query: string;
            types?: ("file" | "chat" | "idea")[];
            limit?: number;
        } = body;

        // Validate query
        if (!query || typeof query !== "string" || query.trim().length === 0) {
            return NextResponse.json(
                errorResponse("Search query is required"),
                {
                    status: 400,
                },
            );
        }

        const trimmedQuery = query.trim();

        // If query is too short, return empty results
        if (trimmedQuery.length < 2) {
            return NextResponse.json(
                successResponse<SearchResponse>({
                    results: [],
                    query: trimmedQuery,
                    total: 0,
                    limit: Math.min(limit, 100),
                }),
            );
        }

        // Use the global_search function from database
        // The function now filters by user_id automatically using auth.uid()
        const { data, error } = await supabase.rpc("global_search", {
            search_query: trimmedQuery,
            max_results: Math.min(limit, 100),
        });

        if (error) {
            console.error("Search error:", error);

            // Fallback to simple search
            const fallbackResults = await performFallbackSearch(
                supabase,
                trimmedQuery,
                types.length === 1 ? types[0] : null,
                Math.min(limit, 100),
                userId,
            );

            return NextResponse.json(
                successResponse<SearchResponse>({
                    results: fallbackResults,
                    query: trimmedQuery,
                    total: fallbackResults.length,
                    limit: Math.min(limit, 100),
                }),
            );
        }

        // Filter by types
        let results = (data as SearchResult[]) || [];
        if (types && types.length > 0 && types.length < 3) {
            results = results.filter((r) => types.includes(r.result_type));
        }

        return NextResponse.json(
            successResponse<SearchResponse>({
                results,
                query: trimmedQuery,
                total: results.length,
                limit: Math.min(limit, 100),
            }),
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(errorResponse("Invalid request body"), {
            status: 400,
        });
    }
}

// Fallback search when RPC is not available
async function performFallbackSearch(
    supabase: ReturnType<typeof createClient>,
    query: string,
    type: string | null,
    limit: number,
    userId: string,
): Promise<SearchResult[]> {
    if (!supabase) return [];

    const results: SearchResult[] = [];
    const searchPattern = `%${query}%`;

    try {
        // Search in ideas (always available) - filtered by user_id
        if (!type || type === "idea") {
            const { data: ideas } = await supabase
                .from("ideas")
                .select("id, content")
                .eq("user_id", userId)
                .ilike("content", searchPattern)
                .limit(Math.floor(limit / 3));

            if (ideas) {
                results.push(
                    ...ideas.map((idea) => ({
                        result_type: "idea" as const,
                        id: idea.id,
                        title: idea.content.substring(0, 50),
                        snippet: idea.content.substring(0, 200),
                        path: null,
                        rank: 1,
                    })),
                );
            }
        }

        // Search in files - filtered by user_id
        if (!type || type === "file") {
            const { data: files } = await supabase
                .from("files")
                .select("id, name, path, content")
                .eq("user_id", userId)
                .or(
                    `name.ilike.${searchPattern},content.ilike.${searchPattern}`,
                )
                .limit(Math.floor(limit / 3));

            if (files) {
                results.push(
                    ...files.map((file) => ({
                        result_type: "file" as const,
                        id: file.id,
                        title: file.name,
                        snippet: file.content?.substring(0, 200) || "",
                        path: file.path,
                        rank: 1,
                    })),
                );
            }
        }

        // Search in chats (via chat_messages) - filtered by user_id
        if (!type || type === "chat") {
            const { data: messages } = await supabase
                .from("chat_messages")
                .select("chat_id, content, chats(title)")
                .eq("user_id", userId)
                .ilike("content", searchPattern)
                .limit(Math.floor(limit / 3));

            if (messages) {
                // Deduplicate by chat_id
                const seenChats = new Set<string>();
                for (const msg of messages) {
                    if (!seenChats.has(msg.chat_id)) {
                        seenChats.add(msg.chat_id);
                        const chatData = msg.chats as unknown as {
                            title: string;
                        } | null;
                        results.push({
                            result_type: "chat" as const,
                            id: msg.chat_id,
                            title: chatData?.title || "Untitled Chat",
                            snippet: msg.content.substring(0, 200),
                            path: null,
                            rank: 1,
                        });
                    }
                }
            }
        }
    } catch (error) {
        console.error("Fallback search error:", error);
    }

    return results.slice(0, limit);
}
