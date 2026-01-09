import { NextRequest, NextResponse } from "next/server";
import {
    createClient,
    createServiceClient,
    isSupabaseConfigured,
    successResponse,
    errorResponse,
    requireAuthWithDevBypass,
    isAuthError,
} from "@/lib/supabase/server";

// Types
interface GitHubTreeItem {
    path: string;
    mode: string;
    type: "blob" | "tree";
    sha: string;
    size?: number;
    url: string;
}

interface GitHubTreeResponse {
    sha: string;
    url: string;
    tree: GitHubTreeItem[];
    truncated: boolean;
}

interface GitHubBlobResponse {
    sha: string;
    node_id: string;
    size: number;
    url: string;
    content: string;
    encoding: "base64" | "utf-8";
}

interface SyncResult {
    source_id: string;
    files_added: number;
    files_updated: number;
    files_unchanged: number;
    files_skipped: number;
    errors: string[];
    synced_at: string;
}

// File extensions to sync (text-based files)
const ALLOWED_EXTENSIONS = new Set([
    // Code
    "js",
    "jsx",
    "ts",
    "tsx",
    "mjs",
    "cjs",
    "py",
    "pyi",
    "pyw",
    "rb",
    "rake",
    "gemspec",
    "go",
    "mod",
    "sum",
    "rs",
    "toml",
    "java",
    "kt",
    "kts",
    "scala",
    "c",
    "h",
    "cpp",
    "hpp",
    "cc",
    "cxx",
    "hxx",
    "cs",
    "fs",
    "fsx",
    "swift",
    "m",
    "mm",
    "php",
    "phtml",
    "lua",
    "r",
    "R",
    "jl",
    "ex",
    "exs",
    "erl",
    "hrl",
    "clj",
    "cljs",
    "cljc",
    "edn",
    "hs",
    "lhs",
    "ml",
    "mli",
    "v",
    "sv",
    "svh",
    "vhd",
    "vhdl",
    "asm",
    "s",
    "pl",
    "pm",
    "t",
    "dart",
    "zig",
    "nim",
    "cr",
    "d",
    // Web
    "html",
    "htm",
    "xhtml",
    "css",
    "scss",
    "sass",
    "less",
    "styl",
    "vue",
    "svelte",
    "astro",
    // Data/Config
    "json",
    "jsonc",
    "json5",
    "yaml",
    "yml",
    "xml",
    "xsl",
    "xslt",
    "ini",
    "cfg",
    "conf",
    "env",
    "env.example",
    "env.local",
    "properties",
    "lock",
    // Documentation
    "md",
    "markdown",
    "mdx",
    "rst",
    "txt",
    "text",
    "adoc",
    "asciidoc",
    // Shell/Scripts
    "sh",
    "bash",
    "zsh",
    "fish",
    "ps1",
    "psm1",
    "psd1",
    "bat",
    "cmd",
    // Build/Make
    "makefile",
    "cmake",
    "dockerfile",
    "gradle",
    "gradle.kts",
    // Other
    "sql",
    "graphql",
    "gql",
    "proto",
    "tf",
    "tfvars",
    "prisma",
    "gitignore",
    "gitattributes",
    "editorconfig",
    "eslintrc",
    "prettierrc",
]);

// Max file size to sync (100KB)
const MAX_FILE_SIZE = 100 * 1024;

// GitHub API rate limit friendly delay
const FETCH_DELAY_MS = 50;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldSyncFile(path: string, size?: number): boolean {
    // Skip files that are too large
    if (size && size > MAX_FILE_SIZE) {
        return false;
    }

    // Get file extension
    const fileName = path.split("/").pop() || "";
    const ext = fileName.includes(".")
        ? fileName.split(".").pop()?.toLowerCase() || ""
        : fileName.toLowerCase(); // For files like "Makefile", "Dockerfile"

    // Check if extension is allowed
    return ALLOWED_EXTENSIONS.has(ext);
}

function getMimeType(fileName: string): string {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    const mimeTypes: Record<string, string> = {
        js: "application/javascript",
        jsx: "application/javascript",
        ts: "application/typescript",
        tsx: "application/typescript",
        json: "application/json",
        html: "text/html",
        css: "text/css",
        md: "text/markdown",
        py: "text/x-python",
        go: "text/x-go",
        rs: "text/x-rust",
        java: "text/x-java",
        c: "text/x-c",
        cpp: "text/x-c++",
        h: "text/x-c",
        hpp: "text/x-c++",
        yaml: "text/yaml",
        yml: "text/yaml",
        xml: "text/xml",
        sql: "text/x-sql",
        sh: "text/x-shellscript",
        txt: "text/plain",
    };
    return mimeTypes[ext] || "text/plain";
}

function hashContent(content: string): string {
    // Simple hash for content comparison
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
}

// POST /api/sync/github - Sync files from a GitHub repository
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

    const supabase = createServiceClient() || createClient();
    if (!supabase) {
        return NextResponse.json(
            errorResponse("Failed to create Supabase client"),
            { status: 500 },
        );
    }

    try {
        const body = await request.json();
        const { source_id } = body;

        if (!source_id) {
            return NextResponse.json(errorResponse("source_id is required"), {
                status: 400,
            });
        }

        // Get source info - verify it belongs to the user
        const { data: source, error: sourceError } = await supabase
            .from("directory_sources")
            .select("*")
            .eq("id", source_id)
            .eq("user_id", userId)
            .single();

        if (sourceError || !source) {
            return NextResponse.json(errorResponse("Source not found"), {
                status: 404,
            });
        }

        if (source.mode !== "github") {
            return NextResponse.json(
                errorResponse("Source is not a GitHub repository"),
                { status: 400 },
            );
        }

        // Parse owner/repo from path
        const [owner, repo] = source.path.split("/");
        if (!owner || !repo) {
            return NextResponse.json(
                errorResponse(
                    "Invalid GitHub path format. Expected: owner/repo",
                ),
                { status: 400 },
            );
        }

        // Auto-detect default branch if not specified
        let branch = source.branch;
        if (!branch) {
            try {
                const repoResponse = await fetch(
                    `https://api.github.com/repos/${owner}/${repo}`,
                    {
                        headers: {
                            Accept: "application/vnd.github.v3+json",
                            "User-Agent": "Hub-App",
                            ...(process.env.GITHUB_TOKEN && {
                                Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
                            }),
                        },
                    },
                );
                if (repoResponse.ok) {
                    const repoData = await repoResponse.json();
                    branch = repoData.default_branch || "main";
                } else {
                    branch = "main";
                }
            } catch {
                branch = "main";
            }
        }

        // Create sync log entry
        const { data: syncLog } = await supabase
            .from("sync_logs")
            .insert({
                source_id,
                status: "syncing",
            })
            .select()
            .single();

        const result: SyncResult = {
            source_id,
            files_added: 0,
            files_updated: 0,
            files_unchanged: 0,
            files_skipped: 0,
            errors: [],
            synced_at: new Date().toISOString(),
        };

        try {
            // Get repository tree from GitHub API
            const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
            const headers: HeadersInit = {
                Accept: "application/vnd.github.v3+json",
                "User-Agent": "Hub-App",
            };

            // Add GitHub token if available
            const githubToken = process.env.GITHUB_TOKEN;
            if (githubToken) {
                headers["Authorization"] = `Bearer ${githubToken}`;
            }

            const treeResponse = await fetch(treeUrl, { headers });

            if (!treeResponse.ok) {
                const errorText = await treeResponse.text();
                throw new Error(
                    `GitHub API error: ${treeResponse.status} - ${errorText}`,
                );
            }

            const treeData: GitHubTreeResponse = await treeResponse.json();

            if (treeData.truncated) {
                result.errors.push(
                    "Repository tree was truncated - some files may be missing",
                );
            }

            // Filter to only blob (file) items that we want to sync
            const filesToSync = treeData.tree.filter(
                (item) =>
                    item.type === "blob" &&
                    shouldSyncFile(item.path, item.size),
            );

            // Get existing files for comparison - filtered by user_id
            const { data: existingFiles } = await supabase
                .from("files")
                .select("path, file_hash")
                .eq("source_id", source_id)
                .eq("user_id", userId);

            const existingMap = new Map(
                (existingFiles || []).map((f) => [f.path, f.file_hash]),
            );

            // Process files in batches
            for (const item of filesToSync) {
                try {
                    // Fetch file content
                    const blobResponse = await fetch(item.url, { headers });

                    if (!blobResponse.ok) {
                        result.errors.push(
                            `Failed to fetch ${item.path}: ${blobResponse.status}`,
                        );
                        result.files_skipped++;
                        continue;
                    }

                    const blobData: GitHubBlobResponse =
                        await blobResponse.json();

                    // Decode content
                    let content: string;
                    if (blobData.encoding === "base64") {
                        content = Buffer.from(
                            blobData.content,
                            "base64",
                        ).toString("utf-8");
                    } else {
                        content = blobData.content;
                    }

                    const fileName = item.path.split("/").pop() || item.path;
                    const fileHash = hashContent(content);
                    const existingHash = existingMap.get(item.path);

                    if (!existingHash) {
                        // New file - insert with user_id
                        const { error: insertError } = await supabase
                            .from("files")
                            .insert({
                                source_id,
                                path: item.path,
                                name: fileName,
                                content,
                                size: blobData.size,
                                mime_type: getMimeType(fileName),
                                file_hash: fileHash,
                                user_id: userId,
                            });

                        if (insertError) {
                            result.errors.push(
                                `Insert error for ${item.path}: ${insertError.message}`,
                            );
                        } else {
                            result.files_added++;
                        }
                    } else if (existingHash !== fileHash) {
                        // File changed - update (filtered by user_id)
                        const { error: updateError } = await supabase
                            .from("files")
                            .update({
                                content,
                                size: blobData.size,
                                mime_type: getMimeType(fileName),
                                file_hash: fileHash,
                            })
                            .eq("source_id", source_id)
                            .eq("path", item.path)
                            .eq("user_id", userId);

                        if (updateError) {
                            result.errors.push(
                                `Update error for ${item.path}: ${updateError.message}`,
                            );
                        } else {
                            result.files_updated++;
                        }
                    } else {
                        // File unchanged
                        result.files_unchanged++;
                    }

                    // Rate limit friendly delay
                    await sleep(FETCH_DELAY_MS);
                } catch (fileError) {
                    result.errors.push(
                        `Error processing ${item.path}: ${String(fileError)}`,
                    );
                    result.files_skipped++;
                }
            }

            // Update source synced_at (filtered by user_id)
            await supabase
                .from("directory_sources")
                .update({ synced_at: result.synced_at })
                .eq("id", source_id)
                .eq("user_id", userId);

            // Update sync log
            if (syncLog) {
                await supabase
                    .from("sync_logs")
                    .update({
                        status:
                            result.errors.length > 0 ? "partial" : "success",
                        files_added: result.files_added,
                        files_updated: result.files_updated,
                        files_deleted: 0,
                        error_message:
                            result.errors.length > 0
                                ? result.errors.slice(0, 10).join("; ") // Limit error message length
                                : null,
                        completed_at: result.synced_at,
                    })
                    .eq("id", syncLog.id);
            }

            return NextResponse.json(
                successResponse(
                    result,
                    `GitHub sync completed: ${result.files_added} added, ${result.files_updated} updated, ${result.files_unchanged} unchanged`,
                ),
            );
        } catch (syncError) {
            // Update sync log with error
            if (syncLog) {
                await supabase
                    .from("sync_logs")
                    .update({
                        status: "error",
                        error_message: String(syncError),
                        completed_at: new Date().toISOString(),
                    })
                    .eq("id", syncLog.id);
            }

            throw syncError;
        }
    } catch (error) {
        console.error("GitHub sync error:", error);
        return NextResponse.json(
            errorResponse(String(error), "GitHub sync failed"),
            { status: 500 },
        );
    }
}
