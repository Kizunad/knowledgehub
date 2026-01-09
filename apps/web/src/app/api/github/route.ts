import { NextRequest, NextResponse } from "next/server";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";

// ============================================================
// Types
// ============================================================

export interface GitHubRepo {
    id: number;
    name: string;
    full_name: string;
    description: string | null;
    html_url: string;
    clone_url: string;
    default_branch: string;
    private: boolean;
    language: string | null;
    stargazers_count: number;
    updated_at: string;
    owner: {
        login: string;
        avatar_url: string;
    };
}

export interface GitHubContent {
    name: string;
    path: string;
    sha: string;
    size: number;
    type: "file" | "dir" | "symlink" | "submodule";
    download_url: string | null;
    content?: string;
    encoding?: string;
}

export interface GitHubTree {
    sha: string;
    url: string;
    tree: {
        path: string;
        mode: string;
        type: "blob" | "tree";
        sha: string;
        size?: number;
    }[];
    truncated: boolean;
}

// ============================================================
// GitHub API Helpers
// ============================================================

const GITHUB_API_BASE = "https://api.github.com";

async function githubFetch<T>(
    endpoint: string,
    token: string,
    options?: RequestInit,
): Promise<{ data: T | null; error: string | null; status: number }> {
    try {
        const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
            ...options,
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github.v3+json",
                "User-Agent": "Hub-App",
                ...options?.headers,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                data: null,
                error: errorData.message || `GitHub API error: ${response.status}`,
                status: response.status,
            };
        }

        const data = await response.json();
        return { data, error: null, status: response.status };
    } catch (err) {
        return {
            data: null,
            error: err instanceof Error ? err.message : "Unknown error",
            status: 500,
        };
    }
}

// ============================================================
// GET /api/github
// List user's repositories or get repo contents
// ============================================================

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "repos";
    const repo = searchParams.get("repo"); // format: owner/repo
    const path = searchParams.get("path") || "";
    const branch = searchParams.get("branch");

    // Get GitHub token from authorization header or query param
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "") || searchParams.get("token");

    if (!token) {
        return NextResponse.json(
            { error: "GitHub token required. Use Authorization: Bearer <token>" },
            { status: 401 },
        );
    }

    switch (action) {
        case "repos":
            return await listRepositories(token);
        case "contents":
            if (!repo) {
                return NextResponse.json(
                    { error: "Repository (owner/repo) required" },
                    { status: 400 },
                );
            }
            return await getRepoContents(token, repo, path, branch);
        case "tree":
            if (!repo) {
                return NextResponse.json(
                    { error: "Repository (owner/repo) required" },
                    { status: 400 },
                );
            }
            return await getRepoTree(token, repo, branch);
        case "user":
            return await getUserInfo(token);
        default:
            return NextResponse.json(
                { error: `Unknown action: ${action}` },
                { status: 400 },
            );
    }
}

async function listRepositories(token: string) {
    // Get user's repos (including private if token has access)
    const { data, error, status } = await githubFetch<GitHubRepo[]>(
        "/user/repos?sort=updated&per_page=100",
        token,
    );

    if (error) {
        return NextResponse.json({ error }, { status });
    }

    // Map to simplified format
    const repos = data?.map((repo) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        html_url: repo.html_url,
        default_branch: repo.default_branch,
        private: repo.private,
        language: repo.language,
        stars: repo.stargazers_count,
        updated_at: repo.updated_at,
        owner: repo.owner.login,
        owner_avatar: repo.owner.avatar_url,
    }));

    return NextResponse.json({
        success: true,
        data: repos,
        count: repos?.length || 0,
    });
}

async function getRepoContents(
    token: string,
    repo: string,
    path: string,
    branch?: string | null,
) {
    const branchQuery = branch ? `?ref=${branch}` : "";
    const { data, error, status } = await githubFetch<GitHubContent | GitHubContent[]>(
        `/repos/${repo}/contents/${path}${branchQuery}`,
        token,
    );

    if (error) {
        return NextResponse.json({ error }, { status });
    }

    return NextResponse.json({
        success: true,
        data,
        repo,
        path,
    });
}

async function getRepoTree(
    token: string,
    repo: string,
    branch?: string | null,
) {
    // First get the default branch if not specified
    let treeBranch = branch;
    if (!treeBranch) {
        const { data: repoData } = await githubFetch<GitHubRepo>(
            `/repos/${repo}`,
            token,
        );
        treeBranch = repoData?.default_branch || "main";
    }

    // Get the full tree recursively
    const { data, error, status } = await githubFetch<GitHubTree>(
        `/repos/${repo}/git/trees/${treeBranch}?recursive=1`,
        token,
    );

    if (error) {
        return NextResponse.json({ error }, { status });
    }

    // Filter to only include files (blobs)
    const files = data?.tree
        .filter((item) => item.type === "blob")
        .map((item) => ({
            path: item.path,
            sha: item.sha,
            size: item.size,
        }));

    return NextResponse.json({
        success: true,
        data: {
            sha: data?.sha,
            files,
            truncated: data?.truncated,
        },
        repo,
        branch: treeBranch,
    });
}

async function getUserInfo(token: string) {
    const { data, error, status } = await githubFetch<{
        login: string;
        id: number;
        avatar_url: string;
        name: string;
        email: string;
    }>("/user", token);

    if (error) {
        return NextResponse.json({ error }, { status });
    }

    return NextResponse.json({
        success: true,
        data: {
            login: data?.login,
            id: data?.id,
            avatar_url: data?.avatar_url,
            name: data?.name,
            email: data?.email,
        },
    });
}

// ============================================================
// POST /api/github
// Import a GitHub repository as a directory source
// ============================================================

export async function POST(request: NextRequest) {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
        return NextResponse.json(
            { error: "GitHub token required" },
            { status: 401 },
        );
    }

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
            { status: 500 },
        );
    }

    try {
        const body = await request.json();
        const { repo, branch, syncFiles = true, maxFiles = 500 } = body;

        if (!repo) {
            return NextResponse.json(
                { error: "Repository (owner/repo) required" },
                { status: 400 },
            );
        }

        // Get repository info
        const { data: repoData, error: repoError } = await githubFetch<GitHubRepo>(
            `/repos/${repo}`,
            token,
        );

        if (repoError) {
            return NextResponse.json(
                { error: `Failed to fetch repository: ${repoError}` },
                { status: 400 },
            );
        }

        if (!repoData) {
            return NextResponse.json(
                { error: "Repository not found" },
                { status: 404 },
            );
        }

        const targetBranch = branch || repoData.default_branch;

        // Create or update directory source
        const { data: existingSource } = await supabase
            .from("directory_sources")
            .select("id")
            .eq("path", repo)
            .eq("mode", "github")
            .single();

        let sourceId: string;

        if (existingSource) {
            sourceId = existingSource.id;
            // Update existing source
            await supabase
                .from("directory_sources")
                .update({
                    name: repoData.name,
                    branch: targetBranch,
                    description: repoData.description,
                    synced_at: new Date().toISOString(),
                })
                .eq("id", sourceId);
        } else {
            // Create new source
            const { data: newSource, error: insertError } = await supabase
                .from("directory_sources")
                .insert({
                    name: repoData.name,
                    mode: "github",
                    path: repo,
                    branch: targetBranch,
                    description: repoData.description,
                    synced_at: new Date().toISOString(),
                })
                .select("id")
                .single();

            if (insertError || !newSource) {
                return NextResponse.json(
                    { error: `Failed to create directory source: ${insertError?.message}` },
                    { status: 500 },
                );
            }

            sourceId = newSource.id;
        }

        // Create sync log entry
        const { data: syncLog } = await supabase
            .from("sync_logs")
            .insert({
                source_id: sourceId,
                status: "syncing",
            })
            .select("id")
            .single();

        // Sync files if requested
        let filesSynced = 0;

        if (syncFiles) {
            // Get the full tree
            const { data: treeData } = await githubFetch<GitHubTree>(
                `/repos/${repo}/git/trees/${targetBranch}?recursive=1`,
                token,
            );

            if (treeData && !treeData.truncated) {
                // Filter to only syncable files
                const syncableExtensions = [
                    ".md", ".txt", ".json", ".js", ".ts", ".tsx", ".jsx",
                    ".py", ".rs", ".go", ".java", ".c", ".cpp", ".h",
                    ".css", ".scss", ".html", ".xml", ".yaml", ".yml",
                    ".toml", ".ini", ".sh", ".bash", ".zsh",
                ];

                const filesToSync = treeData.tree
                    .filter((item) => {
                        if (item.type !== "blob") return false;
                        if (!item.size || item.size > 500000) return false; // Skip large files
                        const ext = "." + item.path.split(".").pop()?.toLowerCase();
                        return syncableExtensions.includes(ext);
                    })
                    .slice(0, maxFiles);

                // Fetch and store file contents in batches
                const batchSize = 10;
                for (let i = 0; i < filesToSync.length; i += batchSize) {
                    const batch = filesToSync.slice(i, i + batchSize);

                    await Promise.all(
                        batch.map(async (file) => {
                            try {
                                const { data: fileData } = await githubFetch<GitHubContent>(
                                    `/repos/${repo}/contents/${file.path}?ref=${targetBranch}`,
                                    token,
                                );

                                if (fileData && fileData.content && fileData.encoding === "base64") {
                                    const content = Buffer.from(fileData.content, "base64").toString("utf-8");
                                    const fileName = file.path.split("/").pop() || file.path;

                                    // Upsert file record
                                    await supabase.from("files").upsert(
                                        {
                                            source_id: sourceId,
                                            path: file.path,
                                            name: fileName,
                                            content,
                                            size: file.size,
                                            file_hash: file.sha,
                                            mime_type: getMimeType(file.path),
                                        },
                                        {
                                            onConflict: "source_id,path",
                                        },
                                    );

                                    filesSynced++;
                                }
                            } catch {
                                // Skip files that fail to fetch
                            }
                        }),
                    );
                }
            }
        }

        // Update sync log
        if (syncLog) {
            await supabase
                .from("sync_logs")
                .update({
                    status: "success",
                    files_added: filesSynced,
                    completed_at: new Date().toISOString(),
                })
                .eq("id", syncLog.id);
        }

        return NextResponse.json({
            success: true,
            data: {
                source_id: sourceId,
                repo: repo,
                branch: targetBranch,
                files_synced: filesSynced,
            },
        });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Unknown error" },
            { status: 500 },
        );
    }
}

// ============================================================
// DELETE /api/github
// Remove a GitHub repository from sources
// ============================================================

export async function DELETE(request: NextRequest) {
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
            { status: 500 },
        );
    }

    try {
        const { searchParams } = new URL(request.url);
        const sourceId = searchParams.get("source_id");
        const repo = searchParams.get("repo");

        if (!sourceId && !repo) {
            return NextResponse.json(
                { error: "Either source_id or repo required" },
                { status: 400 },
            );
        }

        let query = supabase
            .from("directory_sources")
            .delete()
            .eq("mode", "github");

        if (sourceId) {
            query = query.eq("id", sourceId);
        } else if (repo) {
            query = query.eq("path", repo);
        }

        const { error } = await query;

        if (error) {
            return NextResponse.json(
                { error: error.message },
                { status: 500 },
            );
        }

        return NextResponse.json({
            success: true,
            message: "Repository source deleted",
        });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Unknown error" },
            { status: 500 },
        );
    }
}

// ============================================================
// Helper Functions
// ============================================================

function getMimeType(path: string): string {
    const ext = path.split(".").pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
        md: "text/markdown",
        txt: "text/plain",
        json: "application/json",
        js: "text/javascript",
        ts: "text/typescript",
        tsx: "text/typescript",
        jsx: "text/javascript",
        py: "text/x-python",
        rs: "text/x-rust",
        go: "text/x-go",
        java: "text/x-java",
        c: "text/x-c",
        cpp: "text/x-c++",
        h: "text/x-c",
        css: "text/css",
        scss: "text/x-scss",
        html: "text/html",
        xml: "application/xml",
        yaml: "text/yaml",
        yml: "text/yaml",
        toml: "text/toml",
        ini: "text/plain",
        sh: "text/x-shellscript",
        bash: "text/x-shellscript",
        zsh: "text/x-shellscript",
    };
    return mimeTypes[ext || ""] || "text/plain";
}
