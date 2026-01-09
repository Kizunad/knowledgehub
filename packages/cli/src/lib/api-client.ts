import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

/**
 * Hub API Client for CLI
 * Handles communication with the Hub backend API
 */

// Types
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface SyncFilePayload {
    path: string;
    name: string;
    content: string;
    size: number;
    mime_type?: string;
    file_hash: string;
}

export interface SyncRequestBody {
    source_id: string;
    files: SyncFilePayload[];
    deleted_paths?: string[];
    dry_run?: boolean;
}

export interface HealthCheckResult {
    status: "healthy" | "degraded" | "unhealthy";
    timestamp: string;
    checks: {
        supabase: {
            configured: boolean;
            connected: boolean;
            latency_ms?: number;
            error?: string;
        };
        database: {
            connected: boolean;
            latency_ms?: number;
            tables_accessible?: boolean;
            error?: string;
        };
        realtime: {
            available: boolean;
            error?: string;
        };
    };
    version: string;
}

export interface DatabaseTestResult {
    success: boolean;
    total_latency_ms: number;
    tests: Record<
        string,
        {
            success: boolean;
            latency_ms: number;
            error?: string;
        }
    >;
    timestamp: string;
}

export interface SyncResult {
    source_id: string;
    files_added: number;
    files_updated: number;
    files_deleted: number;
    files_unchanged: number;
    errors: string[];
    synced_at: string;
    dry_run?: boolean;
}

export interface IdeaPayload {
    content: string;
    status?: "inbox" | "active" | "archive";
    tags?: string[];
    refs?: string[];
    source_ref?: string;
}

export interface Idea {
    id: string;
    content: string;
    status: "inbox" | "active" | "archive";
    done: boolean;
    tags: string[] | null;
    refs: string[] | null;
    created_at: string;
    updated_at: string;
}

export interface SourceInfo {
    id: string;
    name: string;
    path: string;
    mode: string;
    synced_at: string | null;
}

export interface ApiClientConfig {
    apiUrl: string;
    apiKey?: string;
}

/**
 * Calculate SHA-256 hash of file content
 */
export function calculateFileHash(content: string): string {
    return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Determine MIME type from file extension
 */
export function getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
        ".ts": "text/typescript",
        ".tsx": "text/typescript",
        ".js": "text/javascript",
        ".jsx": "text/javascript",
        ".json": "application/json",
        ".md": "text/markdown",
        ".txt": "text/plain",
        ".html": "text/html",
        ".css": "text/css",
        ".scss": "text/scss",
        ".yaml": "text/yaml",
        ".yml": "text/yaml",
        ".toml": "text/toml",
        ".xml": "text/xml",
        ".sql": "text/sql",
        ".py": "text/python",
        ".rs": "text/rust",
        ".go": "text/go",
        ".java": "text/java",
        ".c": "text/c",
        ".cpp": "text/cpp",
        ".h": "text/c",
        ".sh": "text/shell",
        ".bash": "text/shell",
        ".zsh": "text/shell",
    };

    return mimeTypes[ext] || "text/plain";
}

/**
 * Hub API Client
 */
export class HubApiClient {
    private apiUrl: string;
    private apiKey?: string;

    constructor(config: ApiClientConfig) {
        this.apiUrl = config.apiUrl.replace(/\/$/, ""); // Remove trailing slash
        this.apiKey = config.apiKey;
    }

    /**
     * Build headers for API requests
     */
    private getHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            "User-Agent": "Hub-CLI/0.1.0",
        };

        if (this.apiKey) {
            headers["x-hub-api-key"] = this.apiKey;
        }

        return headers;
    }

    /**
     * Make HTTP request to API
     */
    private async request<T>(
        method: string,
        endpoint: string,
        body?: unknown,
    ): Promise<ApiResponse<T>> {
        const url = `${this.apiUrl}${endpoint}`;
        const headers = this.getHeaders();

        try {
            const response = await fetch(url, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined,
            });

            const data = (await response.json()) as Record<string, unknown>;

            if (!response.ok) {
                return {
                    success: false,
                    error: (data.error as string) || `HTTP ${response.status}`,
                    message: data.message as string | undefined,
                };
            }

            return data as unknown as ApiResponse<T>;
        } catch (error) {
            return {
                success: false,
                error: `Network error: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    }

    /**
     * Test API connection
     */
    async testConnection(): Promise<{ ok: boolean; message: string }> {
        try {
            // Try to fetch ideas as a simple health check
            const response = await this.request<{ ideas: Idea[] }>(
                "GET",
                "/ideas?limit=1",
            );

            if (response.success) {
                return { ok: true, message: "Connected to Hub API" };
            }

            // Check for auth errors
            if (
                response.error?.includes("401") ||
                response.error?.includes("Authentication")
            ) {
                return {
                    ok: false,
                    message: "Authentication failed - check your API key",
                };
            }

            return { ok: false, message: response.error || "Unknown error" };
        } catch (error) {
            return {
                ok: false,
                message: `Connection failed: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    }

    /**
     * Get health check status (Supabase connection test)
     */
    async getHealth(): Promise<ApiResponse<HealthCheckResult>> {
        return this.request("GET", "/health");
    }

    /**
     * Run comprehensive database tests
     */
    async runDatabaseTests(): Promise<ApiResponse<DatabaseTestResult>> {
        return this.request("POST", "/health");
    }

    /**
     * Full connectivity check including database
     */
    async checkConnectivity(): Promise<{
        api: { ok: boolean; message: string };
        database: { ok: boolean; message: string; latency_ms?: number };
        realtime: { ok: boolean; message: string };
    }> {
        const result = {
            api: { ok: false, message: "Not checked" },
            database: { ok: false, message: "Not checked" } as {
                ok: boolean;
                message: string;
                latency_ms?: number;
            },
            realtime: { ok: false, message: "Not checked" },
        };

        // Check API connection
        const apiCheck = await this.testConnection();
        result.api = apiCheck;

        if (!apiCheck.ok) {
            return result;
        }

        // Check database via health endpoint
        const healthResponse = await this.getHealth();

        if (healthResponse.success && healthResponse.data) {
            const health = healthResponse.data;

            // Database check
            if (health.checks.database.connected) {
                result.database = {
                    ok: true,
                    message: "Database connected",
                    latency_ms: health.checks.database.latency_ms,
                };
            } else {
                result.database = {
                    ok: false,
                    message:
                        health.checks.database.error ||
                        "Database not connected",
                };
            }

            // Realtime check
            if (health.checks.realtime.available) {
                result.realtime = { ok: true, message: "Realtime available" };
            } else {
                result.realtime = {
                    ok: false,
                    message:
                        health.checks.realtime.error ||
                        "Realtime not available",
                };
            }
        } else {
            result.database = {
                ok: false,
                message: healthResponse.error || "Health check failed",
            };
        }

        return result;
    }

    /**
     * Get sync status for a source
     */
    async getSyncStatus(
        sourceId: string,
    ): Promise<ApiResponse<{ source: SourceInfo; file_count: number }>> {
        return this.request(
            "GET",
            `/sync?source_id=${encodeURIComponent(sourceId)}`,
        );
    }

    /**
     * Sync files to Hub
     */
    async syncFiles(
        payload: SyncRequestBody,
    ): Promise<ApiResponse<SyncResult>> {
        return this.request("POST", "/sync", payload);
    }

    /**
     * Clear all synced files for a source
     */
    async clearSyncedFiles(
        sourceId: string,
    ): Promise<ApiResponse<{ deleted: number }>> {
        return this.request(
            "DELETE",
            `/sync?source_id=${encodeURIComponent(sourceId)}`,
        );
    }

    /**
     * Get all ideas
     */
    async getIdeas(options?: {
        status?: string;
        limit?: number;
        offset?: number;
    }): Promise<ApiResponse<{ ideas: Idea[]; total: number }>> {
        const params = new URLSearchParams();
        if (options?.status) params.set("status", options.status);
        if (options?.limit) params.set("limit", String(options.limit));
        if (options?.offset) params.set("offset", String(options.offset));

        const query = params.toString() ? `?${params.toString()}` : "";
        return this.request("GET", `/ideas${query}`);
    }

    /**
     * Create a new idea
     */
    async createIdea(idea: IdeaPayload): Promise<ApiResponse<Idea>> {
        return this.request("POST", "/ideas", idea);
    }

    /**
     * Update ideas in bulk
     */
    async updateIdeas(
        ids: string[],
        updates: Partial<Idea>,
    ): Promise<ApiResponse<Idea[]>> {
        return this.request("PATCH", "/ideas", { ids, updates });
    }

    /**
     * Delete ideas
     */
    async deleteIdeas(
        ids: string[],
    ): Promise<ApiResponse<{ deleted: number }>> {
        return this.request("DELETE", `/ideas?ids=${ids.join(",")}`);
    }

    /**
     * Get or create a source by name
     */
    async getOrCreateSource(
        name: string,
        localPath: string,
    ): Promise<ApiResponse<SourceInfo>> {
        // First try to find existing source
        const searchResponse = await this.request<{ sources: SourceInfo[] }>(
            "GET",
            `/sources?mode=local_sync`,
        );

        if (searchResponse.success && searchResponse.data?.sources) {
            const existing = searchResponse.data.sources.find(
                (s) => s.name === name || s.path === localPath,
            );
            if (existing) {
                return { success: true, data: existing };
            }
        }

        // Create new source
        return this.request("POST", "/sources", {
            name,
            path: localPath,
            mode: "local_sync",
        });
    }
}

/**
 * Load CLI configuration from .hubrc file
 */
export async function loadConfig(
    cwd: string = process.cwd(),
): Promise<ApiClientConfig | null> {
    const configPath = path.join(cwd, ".hubrc");

    try {
        const content = await fs.readFile(configPath, "utf-8");
        const config = JSON.parse(content);

        return {
            apiUrl: config.apiUrl || "http://localhost:3000/api",
            apiKey: config.apiKey,
        };
    } catch {
        return null;
    }
}

/**
 * Create API client from configuration file
 */
export async function createApiClient(
    cwd: string = process.cwd(),
): Promise<HubApiClient | null> {
    const config = await loadConfig(cwd);
    if (!config) {
        return null;
    }

    return new HubApiClient(config);
}
