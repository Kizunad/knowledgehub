import chalk from "chalk";
import ora from "ora";
import fs from "node:fs/promises";
import path from "node:path";
import { glob } from "glob";
import ignore from "ignore";
import { isReadableFile } from "@hub/shared";
import {
    HubApiClient,
    loadConfig,
    calculateFileHash,
    getMimeType,
    SyncFilePayload,
} from "../lib/api-client.js";

interface SyncOptions {
    all?: boolean;
    dryRun?: boolean;
    force?: boolean;
}

interface FileToSync {
    path: string;
    relativePath: string;
    size: number;
    content: string;
    hash: string;
    mimeType: string;
}

interface SourceConfig {
    id: string;
    localPath: string;
    include?: string[];
    exclude?: string[];
    _name?: string;
    _description?: string;
    _remoteId?: string; // Remote source ID in Hub
    _lastSyncHashes?: Record<string, string>; // Path -> hash mapping from last sync
}

interface ConfigFile {
    apiUrl: string;
    apiKey?: string;
    sources: SourceConfig[];
    _meta?: {
        version: string;
        createdAt: string;
    };
}

// Cache file for storing file hashes
const SYNC_CACHE_FILE = ".hub-sync-cache.json";

interface SyncCache {
    version: string;
    sources: Record<
        string,
        {
            remoteId?: string;
            lastSync?: string;
            hashes: Record<string, string>;
        }
    >;
}

export async function syncCommand(
    source: string | undefined,
    options: SyncOptions,
): Promise<void> {
    const spinner = ora();

    console.log(chalk.cyan("\n📤 Hub Sync\n"));

    // Load configuration
    const configPath = path.join(process.cwd(), ".hubrc");
    let config: ConfigFile;

    try {
        const configContent = await fs.readFile(configPath, "utf-8");
        config = JSON.parse(configContent);
    } catch {
        console.log(chalk.red("✗ No .hubrc configuration found."));
        console.log(chalk.dim("  Run `hub init` to initialize Hub CLI."));
        return;
    }

    // Load API client
    const apiConfig = await loadConfig(process.cwd());
    if (!apiConfig) {
        console.log(chalk.red("✗ Failed to load API configuration."));
        return;
    }

    const apiClient = new HubApiClient(apiConfig);

    // Test API connection
    spinner.start("Testing API connection...");
    const connectionTest = await apiClient.testConnection();

    if (!connectionTest.ok) {
        spinner.fail("API connection failed");
        console.log(chalk.red(`  Error: ${connectionTest.message}`));

        if (connectionTest.message.includes("Authentication")) {
            console.log(chalk.dim("\n  To fix this:"));
            console.log(
                chalk.dim("  1. Generate an API key at your Hub dashboard"),
            );
            console.log(
                chalk.dim("  2. Update the apiKey in your .hubrc file"),
            );
        }

        return;
    }

    spinner.succeed("Connected to Hub API");

    // Load sync cache
    const cache = await loadSyncCache(process.cwd());

    // Determine which sources to sync
    const sourcesToSync = options.all
        ? config.sources
        : source
          ? config.sources.filter(
                (s: SourceConfig) => s.id === source || s._name === source,
            )
          : config.sources.slice(0, 1); // Default to first source

    if (sourcesToSync.length === 0) {
        console.log(chalk.yellow("⚠ No sources found to sync."));
        if (source) {
            console.log(
                chalk.dim(`  Source "${source}" not found in configuration.`),
            );
        }
        return;
    }

    console.log(chalk.dim(`Syncing ${sourcesToSync.length} source(s)...`));
    console.log("");

    let totalAdded = 0;
    let totalUpdated = 0;
    let totalUnchanged = 0;
    let totalErrors = 0;

    for (const sourceConfig of sourcesToSync) {
        const result = await syncSource(
            sourceConfig,
            options,
            spinner,
            apiClient,
            cache,
        );

        totalAdded += result.added;
        totalUpdated += result.updated;
        totalUnchanged += result.unchanged;
        totalErrors += result.errors;
    }

    // Save updated cache
    await saveSyncCache(process.cwd(), cache);

    console.log("");
    console.log(chalk.green("✓ Sync complete!"));
    console.log(chalk.dim(`  Added: ${totalAdded}`));
    console.log(chalk.dim(`  Updated: ${totalUpdated}`));
    console.log(chalk.dim(`  Unchanged: ${totalUnchanged}`));

    if (totalErrors > 0) {
        console.log(chalk.yellow(`  Errors: ${totalErrors}`));
    }
}

interface SyncResult {
    added: number;
    updated: number;
    unchanged: number;
    errors: number;
}

async function syncSource(
    sourceConfig: SourceConfig,
    options: SyncOptions,
    spinner: ReturnType<typeof ora>,
    apiClient: HubApiClient,
    cache: SyncCache,
): Promise<SyncResult> {
    const sourceName = sourceConfig._name || sourceConfig.id;
    const result: SyncResult = {
        added: 0,
        updated: 0,
        unchanged: 0,
        errors: 0,
    };

    console.log(chalk.blue("→") + ` Syncing: ${chalk.bold(sourceName)}`);
    console.log(chalk.dim(`  Path: ${sourceConfig.localPath}`));

    // Check if path exists
    try {
        await fs.access(sourceConfig.localPath);
    } catch {
        console.log(
            chalk.red(`  ✗ Path does not exist: ${sourceConfig.localPath}`),
        );
        result.errors++;
        return result;
    }

    // Initialize cache for this source
    if (!cache.sources[sourceConfig.id]) {
        cache.sources[sourceConfig.id] = {
            hashes: {},
        };
    }

    const sourceCache = cache.sources[sourceConfig.id];

    // Get or create remote source
    spinner.start("Checking remote source...");

    let remoteSourceId = sourceCache.remoteId;

    if (!remoteSourceId) {
        const sourceResponse = await apiClient.getOrCreateSource(
            sourceName,
            sourceConfig.localPath,
        );

        if (!sourceResponse.success || !sourceResponse.data) {
            spinner.fail("Failed to get/create remote source");
            console.log(chalk.red(`  Error: ${sourceResponse.error}`));
            result.errors++;
            return result;
        }

        remoteSourceId = sourceResponse.data.id;
        sourceCache.remoteId = remoteSourceId;
    }

    spinner.succeed(`Remote source: ${remoteSourceId.slice(0, 8)}...`);

    // Build ignore filter
    const ig = ignore();
    if (sourceConfig.exclude) {
        ig.add(sourceConfig.exclude);
    }

    // Find files to sync
    spinner.start("Scanning files...");

    const includePatterns = sourceConfig.include || ["**/*"];
    const files: FileToSync[] = [];
    const scannedHashes: Record<string, string> = {};

    try {
        for (const pattern of includePatterns) {
            const matches = await glob(pattern, {
                cwd: sourceConfig.localPath,
                nodir: true,
                dot: false,
                absolute: false,
            });

            for (const relativePath of matches) {
                // Check if file should be ignored
                if (ig.ignores(relativePath)) {
                    continue;
                }

                // Check if file is readable (text-based)
                if (!isReadableFile(relativePath)) {
                    continue;
                }

                const fullPath = path.join(
                    sourceConfig.localPath,
                    relativePath,
                );

                try {
                    const content = await fs.readFile(fullPath, "utf-8");
                    const stats = await fs.stat(fullPath);
                    const hash = calculateFileHash(content);

                    scannedHashes[relativePath] = hash;

                    // Check if file has changed since last sync (incremental sync)
                    const previousHash = sourceCache.hashes[relativePath];

                    if (!options.force && previousHash === hash) {
                        result.unchanged++;
                        continue;
                    }

                    files.push({
                        path: fullPath,
                        relativePath,
                        size: stats.size,
                        content,
                        hash,
                        mimeType: getMimeType(relativePath),
                    });
                } catch {
                    // Skip files we can't read
                }
            }
        }

        const totalFiles = files.length + result.unchanged;
        spinner.succeed(`Found ${totalFiles} files (${files.length} changed)`);
    } catch (error) {
        spinner.fail("Failed to scan files");
        console.log(chalk.red(`  Error: ${error}`));
        result.errors++;
        return result;
    }

    // Detect deleted files
    const deletedPaths: string[] = [];
    for (const prevPath of Object.keys(sourceCache.hashes)) {
        if (!scannedHashes[prevPath]) {
            deletedPaths.push(prevPath);
        }
    }

    if (deletedPaths.length > 0) {
        console.log(
            chalk.dim(`  Detected ${deletedPaths.length} deleted files`),
        );
    }

    // Nothing to sync
    if (files.length === 0 && deletedPaths.length === 0) {
        console.log(chalk.dim("  No changes to sync"));
        return result;
    }

    // Dry run - just show what would be synced
    if (options.dryRun) {
        console.log(chalk.dim("\n  Dry run - files that would be synced:"));
        const displayCount = Math.min(files.length, 10);
        for (let i = 0; i < displayCount; i++) {
            const file = files[i];
            const sizeStr = formatSize(file.size);
            const isNew = !sourceCache.hashes[file.relativePath];
            const badge = isNew ? chalk.green("[NEW]") : chalk.yellow("[UPD]");
            console.log(
                chalk.dim(`    ${badge} ${file.relativePath} (${sizeStr})`),
            );
        }
        if (files.length > 10) {
            console.log(
                chalk.dim(`    ... and ${files.length - 10} more files`),
            );
        }

        if (deletedPaths.length > 0) {
            console.log(chalk.dim("\n  Files that would be deleted:"));
            const delDisplayCount = Math.min(deletedPaths.length, 5);
            for (let i = 0; i < delDisplayCount; i++) {
                console.log(
                    chalk.dim(`    ${chalk.red("[DEL]")} ${deletedPaths[i]}`),
                );
            }
            if (deletedPaths.length > 5) {
                console.log(
                    chalk.dim(
                        `    ... and ${deletedPaths.length - 5} more files`,
                    ),
                );
            }
        }

        console.log("");
        return result;
    }

    // Build sync payload
    const syncPayload: SyncFilePayload[] = files.map((file) => ({
        path: file.relativePath,
        name: path.basename(file.relativePath),
        content: file.content,
        size: file.size,
        mime_type: file.mimeType,
        file_hash: file.hash,
    }));

    // Actually sync files
    spinner.start("Syncing files to Hub...");

    const syncResponse = await apiClient.syncFiles({
        source_id: remoteSourceId!,
        files: syncPayload,
        deleted_paths: deletedPaths.length > 0 ? deletedPaths : undefined,
        dry_run: false,
    });

    if (!syncResponse.success || !syncResponse.data) {
        spinner.fail("Sync failed");
        console.log(chalk.red(`  Error: ${syncResponse.error}`));
        result.errors++;
        return result;
    }

    const syncResult = syncResponse.data;

    spinner.succeed(
        `Synced: ${syncResult.files_added} added, ${syncResult.files_updated} updated, ${syncResult.files_deleted} deleted`,
    );

    // Update cache with new hashes
    sourceCache.hashes = scannedHashes;
    sourceCache.lastSync = new Date().toISOString();

    // Update result
    result.added = syncResult.files_added;
    result.updated = syncResult.files_updated;

    // Show errors if any
    if (syncResult.errors && syncResult.errors.length > 0) {
        console.log(
            chalk.yellow(`  ⚠ ${syncResult.errors.length} errors occurred:`),
        );
        for (const err of syncResult.errors.slice(0, 3)) {
            console.log(chalk.dim(`    - ${err}`));
        }
        if (syncResult.errors.length > 3) {
            console.log(
                chalk.dim(
                    `    ... and ${syncResult.errors.length - 3} more errors`,
                ),
            );
        }
        result.errors = syncResult.errors.length;
    }

    // Show summary
    const totalSize = files.reduce((acc, f) => acc + f.size, 0);
    console.log(chalk.dim(`  Total size: ${formatSize(totalSize)}`));

    return result;
}

/**
 * Load sync cache from disk
 */
async function loadSyncCache(cwd: string): Promise<SyncCache> {
    const cachePath = path.join(cwd, SYNC_CACHE_FILE);

    try {
        const content = await fs.readFile(cachePath, "utf-8");
        return JSON.parse(content);
    } catch {
        return {
            version: "1.0",
            sources: {},
        };
    }
}

/**
 * Save sync cache to disk
 */
async function saveSyncCache(cwd: string, cache: SyncCache): Promise<void> {
    const cachePath = path.join(cwd, SYNC_CACHE_FILE);

    try {
        await fs.writeFile(cachePath, JSON.stringify(cache, null, 2), "utf-8");
    } catch (error) {
        console.log(
            chalk.dim(`  Warning: Could not save sync cache: ${error}`),
        );
    }
}

function formatSize(bytes: number): string {
    if (bytes === 0) return "0 B";

    const units = ["B", "KB", "MB", "GB"];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}
