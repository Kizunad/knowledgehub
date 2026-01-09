import chalk from "chalk";
import ora from "ora";
import fs from "node:fs/promises";
import path from "node:path";
import inquirer from "inquirer";
import { HubApiClient, loadConfig, Idea } from "../lib/api-client.js";
import {
    parseIdeasFile,
    writeIdeasFile,
    generateIdeasContent,
} from "../lib/ideas-parser.js";

interface PullIdeasOptions {
    force?: boolean;
    merge?: boolean;
    backup?: boolean;
}

export async function pullIdeasCommand(
    file: string = "ideas.md",
    options: PullIdeasOptions,
): Promise<void> {
    const spinner = ora();

    console.log(chalk.cyan("\n📥 Pull Ideas\n"));

    // Resolve file path
    const filePath = path.resolve(process.cwd(), file);
    console.log(chalk.dim(`File: ${filePath}`));
    console.log("");

    // Load API client
    const apiConfig = await loadConfig(process.cwd());
    if (!apiConfig) {
        console.log(chalk.red("✗ No .hubrc configuration found."));
        console.log(chalk.dim("  Run `hub init` to initialize Hub CLI."));
        return;
    }

    const apiClient = new HubApiClient(apiConfig);

    // Test connection
    spinner.start("Connecting to Hub...");
    const connectionTest = await apiClient.testConnection();

    if (!connectionTest.ok) {
        spinner.fail("Connection failed");
        console.log(chalk.red(`  Error: ${connectionTest.message}`));
        return;
    }

    spinner.succeed("Connected to Hub");

    // Fetch remote ideas
    spinner.start("Fetching ideas from Hub...");

    const remoteResponse = await apiClient.getIdeas({ limit: 1000 });

    if (!remoteResponse.success || !remoteResponse.data) {
        spinner.fail("Failed to fetch ideas");
        console.log(chalk.red(`  Error: ${remoteResponse.error}`));
        return;
    }

    const remoteIdeas = remoteResponse.data.ideas;
    spinner.succeed(`Fetched ${remoteIdeas.length} ideas from Hub`);

    // Count by status
    const inboxCount = remoteIdeas.filter((i) => i.status === "inbox").length;
    const activeCount = remoteIdeas.filter((i) => i.status === "active").length;
    const archiveCount = remoteIdeas.filter((i) => i.status === "archive").length;

    console.log(chalk.dim(`  Inbox: ${inboxCount}`));
    console.log(chalk.dim(`  Active: ${activeCount}`));
    console.log(chalk.dim(`  Archive: ${archiveCount}`));

    // Check if local file exists
    let localExists = false;
    let localIdeas;

    try {
        await fs.access(filePath);
        localExists = true;
        localIdeas = await parseIdeasFile(filePath);
    } catch {
        // File doesn't exist
    }

    // Handle existing file
    if (localExists && !options.force && !options.merge) {
        console.log("");
        console.log(chalk.yellow("⚠ Local ideas.md already exists."));

        const localCount =
            (localIdeas?.inbox.length || 0) +
            (localIdeas?.active.length || 0) +
            (localIdeas?.archive.length || 0);

        console.log(chalk.dim(`  Local file has ${localCount} ideas.`));

        const { action } = await inquirer.prompt([
            {
                type: "list",
                name: "action",
                message: "What would you like to do?",
                choices: [
                    { name: "Overwrite local file with remote ideas", value: "overwrite" },
                    { name: "Merge remote ideas into local file", value: "merge" },
                    { name: "Cancel", value: "cancel" },
                ],
            },
        ]);

        if (action === "cancel") {
            console.log(chalk.dim("Cancelled."));
            return;
        }

        if (action === "merge") {
            options.merge = true;
        } else {
            options.force = true;
        }
    }

    // Create backup if requested or merging
    if (localExists && (options.backup || options.merge)) {
        const backupPath = `${filePath}.backup.${Date.now()}`;

        try {
            await fs.copyFile(filePath, backupPath);
            console.log(chalk.dim(`  Backup created: ${path.basename(backupPath)}`));
        } catch (error) {
            console.log(chalk.yellow(`  Warning: Could not create backup: ${error}`));
        }
    }

    // Merge logic
    let finalIdeas: Idea[] = remoteIdeas;

    if (options.merge && localIdeas) {
        spinner.start("Merging ideas...");

        // Create a map of remote ideas by normalized content
        const remoteByContent = new Map<string, Idea>();
        for (const idea of remoteIdeas) {
            remoteByContent.set(normalizeContent(idea.content), idea);
        }

        // Find local ideas not in remote
        const localOnlyIdeas: Idea[] = [];
        const allLocal = [...localIdeas.inbox, ...localIdeas.active, ...localIdeas.archive];

        for (const localIdea of allLocal) {
            const normalizedContent = normalizeContent(localIdea.content);
            if (!remoteByContent.has(normalizedContent)) {
                // Convert ParsedIdea to Idea format
                localOnlyIdeas.push({
                    id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    content: localIdea.content,
                    status: localIdea.status,
                    done: localIdea.done,
                    tags: localIdea.tags.length > 0 ? localIdea.tags : null,
                    refs: localIdea.refs.length > 0 ? localIdea.refs : null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });
            }
        }

        // Merge: remote ideas + local-only ideas
        finalIdeas = [...remoteIdeas, ...localOnlyIdeas];

        spinner.succeed(
            `Merged: ${remoteIdeas.length} remote + ${localOnlyIdeas.length} local-only`,
        );
    }

    // Write to file
    spinner.start("Writing ideas.md...");

    try {
        await writeIdeasFile(filePath, finalIdeas);
        spinner.succeed(`Wrote ${finalIdeas.length} ideas to ${file}`);
    } catch (error) {
        spinner.fail("Failed to write ideas.md");
        console.log(chalk.red(`  Error: ${error}`));
        return;
    }

    // Summary
    console.log("");
    console.log(chalk.green("✓ Pull complete!"));

    // Show preview
    console.log("");
    console.log(chalk.dim("Preview of ideas.md:"));
    console.log(chalk.dim("─".repeat(40)));

    const preview = generateIdeasContent(finalIdeas);
    const previewLines = preview.split("\n").slice(0, 15);
    for (const line of previewLines) {
        console.log(chalk.dim(line));
    }

    if (preview.split("\n").length > 15) {
        console.log(chalk.dim("..."));
    }

    console.log(chalk.dim("─".repeat(40)));
}

/**
 * Normalize content for comparison
 */
function normalizeContent(content: string): string {
    return content.trim().toLowerCase();
}
