import { useState, useCallback, useEffect } from "react";

// ============================================================
// Types
// ============================================================

export interface GitHubUser {
    login: string;
    id: number;
    avatar_url: string;
    name: string | null;
}

export interface GitHubRepo {
    id: number;
    name: string;
    full_name: string;
    description: string | null;
    html_url: string;
    default_branch: string;
    private: boolean;
    language: string | null;
    stars: number;
    updated_at: string;
    owner: string;
    owner_avatar: string;
}

export interface GitHubFile {
    path: string;
    sha: string;
    size?: number;
}

export interface GitHubTreeData {
    sha: string;
    files: GitHubFile[];
    truncated: boolean;
}

export interface GitHubImportResult {
    source_id: string;
    repo: string;
    branch: string;
    files_synced: number;
}

export interface UseGitHubState {
    isConnected: boolean;
    isLoading: boolean;
    error: string | null;
    user: GitHubUser | null;
    token: string | null;
}

// ============================================================
// GitHub Hook
// ============================================================

export function useGitHub() {
    const [state, setState] = useState<UseGitHubState>({
        isConnected: false,
        isLoading: true,
        error: null,
        user: null,
        token: null,
    });

    // Load user info from cookie on mount
    useEffect(() => {
        const loadUser = () => {
            try {
                // Try to parse the github_user cookie
                const cookies = document.cookie.split(";");
                const userCookie = cookies.find((c) =>
                    c.trim().startsWith("github_user="),
                );

                if (userCookie) {
                    const userJson = decodeURIComponent(
                        userCookie.split("=")[1],
                    );
                    const user = JSON.parse(userJson) as GitHubUser;
                    setState((prev) => ({
                        ...prev,
                        isConnected: true,
                        isLoading: false,
                        user,
                    }));
                } else {
                    setState((prev) => ({
                        ...prev,
                        isLoading: false,
                    }));
                }
            } catch {
                setState((prev) => ({
                    ...prev,
                    isLoading: false,
                }));
            }
        };

        loadUser();
    }, []);

    // Connect to GitHub (redirect to OAuth)
    const connect = useCallback((redirectPath?: string) => {
        const params = redirectPath
            ? `?redirect=${encodeURIComponent(redirectPath)}`
            : "";
        window.location.href = `/api/github/authorize${params}`;
    }, []);

    // Disconnect from GitHub (clear cookies)
    const disconnect = useCallback(() => {
        // Clear cookies
        document.cookie =
            "github_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie =
            "github_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

        setState({
            isConnected: false,
            isLoading: false,
            error: null,
            user: null,
            token: null,
        });
    }, []);

    // Fetch user's repositories
    const fetchRepos = useCallback(async (): Promise<GitHubRepo[]> => {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        try {
            const response = await fetch("/api/github?action=repos", {
                credentials: "include",
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to fetch repositories");
            }

            const result = await response.json();
            setState((prev) => ({ ...prev, isLoading: false }));
            return result.data || [];
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : "Unknown error";
            setState((prev) => ({
                ...prev,
                isLoading: false,
                error: errorMessage,
            }));
            return [];
        }
    }, []);

    // Get repository tree (file list)
    const fetchRepoTree = useCallback(
        async (repo: string, branch?: string): Promise<GitHubTreeData | null> => {
            setState((prev) => ({ ...prev, isLoading: true, error: null }));

            try {
                const params = new URLSearchParams({
                    action: "tree",
                    repo,
                });
                if (branch) {
                    params.set("branch", branch);
                }

                const response = await fetch(`/api/github?${params.toString()}`, {
                    credentials: "include",
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || "Failed to fetch repository tree");
                }

                const result = await response.json();
                setState((prev) => ({ ...prev, isLoading: false }));
                return result.data || null;
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : "Unknown error";
                setState((prev) => ({
                    ...prev,
                    isLoading: false,
                    error: errorMessage,
                }));
                return null;
            }
        },
        [],
    );

    // Import a repository into Hub
    const importRepo = useCallback(
        async (
            repo: string,
            options?: {
                branch?: string;
                syncFiles?: boolean;
                maxFiles?: number;
            },
        ): Promise<GitHubImportResult | null> => {
            setState((prev) => ({ ...prev, isLoading: true, error: null }));

            try {
                const response = await fetch("/api/github", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        repo,
                        ...options,
                    }),
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || "Failed to import repository");
                }

                const result = await response.json();
                setState((prev) => ({ ...prev, isLoading: false }));
                return result.data || null;
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : "Unknown error";
                setState((prev) => ({
                    ...prev,
                    isLoading: false,
                    error: errorMessage,
                }));
                return null;
            }
        },
        [],
    );

    // Remove an imported repository
    const removeRepo = useCallback(
        async (repoOrSourceId: string, isSourceId = false): Promise<boolean> => {
            setState((prev) => ({ ...prev, isLoading: true, error: null }));

            try {
                const params = isSourceId
                    ? `source_id=${encodeURIComponent(repoOrSourceId)}`
                    : `repo=${encodeURIComponent(repoOrSourceId)}`;

                const response = await fetch(`/api/github?${params}`, {
                    method: "DELETE",
                    credentials: "include",
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || "Failed to remove repository");
                }

                setState((prev) => ({ ...prev, isLoading: false }));
                return true;
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : "Unknown error";
                setState((prev) => ({
                    ...prev,
                    isLoading: false,
                    error: errorMessage,
                }));
                return false;
            }
        },
        [],
    );

    // Clear error
    const clearError = useCallback(() => {
        setState((prev) => ({ ...prev, error: null }));
    }, []);

    return {
        ...state,
        connect,
        disconnect,
        fetchRepos,
        fetchRepoTree,
        importRepo,
        removeRepo,
        clearError,
    };
}

// ============================================================
// Helper Hook for Single Repo Operations
// ============================================================

export interface UseGitHubRepoOptions {
    repo: string;
    branch?: string;
    autoFetch?: boolean;
}

export function useGitHubRepo(options: UseGitHubRepoOptions) {
    const { repo, branch, autoFetch = false } = options;
    const [tree, setTree] = useState<GitHubTreeData | null>(null);
    const [isLoading, setIsLoading] = useState(autoFetch);
    const [error, setError] = useState<string | null>(null);

    const fetchTree = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                action: "tree",
                repo,
            });
            if (branch) {
                params.set("branch", branch);
            }

            const response = await fetch(`/api/github?${params.toString()}`, {
                credentials: "include",
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to fetch repository tree");
            }

            const result = await response.json();
            setTree(result.data || null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setIsLoading(false);
        }
    }, [repo, branch]);

    useEffect(() => {
        if (autoFetch) {
            fetchTree();
        }
    }, [autoFetch, fetchTree]);

    return {
        tree,
        isLoading,
        error,
        refetch: fetchTree,
    };
}
