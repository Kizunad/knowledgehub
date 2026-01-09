import chalk from "chalk";
import ora from "ora";
import path from "node:path";
import { HubApiClient, loadConfig } from "../lib/api-client.js";
import {
    parseIdeasFile,
    computeIdeasDiff,
    ensureIdeasFile,
    ParsedIdea,
} from "../lib/ideas-parser.js";

interface PushIdeasOptions {
    create?: boolean;
    deleteRemote?: boolean;
    dryRun?: boolean;
}

export async function pushIdeasCommand(
    file: string = "ideas.md",
    options: PushIdeasOptions,
): Promise<void> {
    const spinner = ora();

    console.log(chalk.cyan("\n📤 Push Ideas\n"));

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

    // Create file if it doesn't exist and --create flag is set
    if (options.create) {
        const created = await ensureIdeasFile(filePath);
        if (created) {
            console.log(chalk.green("✓ Created new ideas.md file"));
        }
    }

    // Parse local ideas file
    spinner.start("Parsing local ideas.md...");

    let localIdeas;
    try {
        localIdeas = await parseIdeasFile(filePath);
    } catch (error) {
        spinner.fail("Failed to parse ideas.md");
        console.log(chalk.red(`  Error: ${error}`));
        return;
    }

    const localCount =
        localIdeas.inbox.length +
        localIdeas.active.length +
        localIdeas.archive.length;

    spinner.succeed(`Parsed ${localCount} local ideas`);
    console.log(chalk.dim(`  Inbox: ${localIdeas.inbox.length}`));
    console.log(chalk.dim(`  Active: ${localIdeas.active.length}`));
    console.log(chalk.dim(`  Archive: ${localIdeas.archive.length}`));

    // Fetch remote ideas
    spinner.start("Fetching remote ideas...");

    const remoteResponse = await apiClient.getIdeas({ limit: 1000 });

    if (!remoteResponse.success || !remoteResponse.data) {
        spinner.fail("Failed to fetch remote ideas");
        console.log(chalk.red(`  Error: ${remoteResponse.error}`));
        return;
    }

    const remoteIdeas = remoteResponse.data.ideas;
    spinner.succeed(`Fetched ${remoteIdeas.length} remote ideas`);

    // Compute diff
    spinner.start("Computing differences...");

    const diff = computeIdeasDiff(localIdeas, remoteIdeas);

    spinner.succeed("Diff computed");
    console.log("");
    console.log(chalk.bold("Changes:"));
    console.log(chalk.green(`  + ${diff.toCreate.length} to create`));
    console.log(chalk.yellow(`  ~ ${diff.toUpdate.length} to update`));
    console.log(chalk.dim(`  = ${diff.unchanged} unchanged`));

    if (options.deleteRemote) {
        console.log(chalk.red(`  - ${diff.toDelete.length} to delete`));
    } else if (diff.toDelete.length > 0) {
        console.log(
            chalk.dim(`  (${diff.toDelete.length} remote-only ideas will be kept)`),
        );
    }

    // Nothing to do
    if (
        diff.toCreate.length === 0 &&
        diff.toUpdate.length === 0 &&
        (!options.deleteRemote || diff.toDelete.length === 0)
    ) {
        console.log("");
        console.log(chalk.green("✓ Everything is up to date!"));
        return;
    }

    // Dry run
    if (options.dryRun) {
        console.log("");
        console.log(chalk.yellow("Dry run - no changes made"));

        if (diff.toCreate.length > 0) {
            console.log(chalk.dim("\nIdeas to create:"));
            for (const idea of diff.toCreate.slice(0, 5)) {
                console.log(
                    chalk.dim(`  + ${truncate(idea.content, 60)} [${idea.status}]`),
                );
            }
            if (diff.toCreate.length > 5) {
                console.log(
                    chalk.dim(`  ... and ${diff.toCreate.length - 5} more`),
                );
            }
        }

        if (diff.toUpdate.length > 0) {
            console.log(chalk.dim("\nIdeas to update:"));
            for (const update of diff.toUpdate.slice(0, 5)) {
                console.log(
                    chalk.dim(
                        `  ~ ${update.id.slice(0, 8)}... → ${JSON.stringify(update.updates)}`,
                    ),
                );
            }
            if (diff.toUpdate.length > 5) {
                console.log(
                    chalk.dim(`  ... and ${diff.toUpdate.length - 5} more`),
                );
            }
        }

        return;
    }

    // Apply changes
    console.log("");

    let createdCount = 0;
    let updatedCount = 0;
    let deletedCount = 0;
    let errorCount = 0;

    // Create new ideas
    if (diff.toCreate.length > 0) {
        spinner.start(`Creating ${diff.toCreate.length} ideas...`);

        for (const idea of diff.toCreate) {
            const response = await apiClient.createIdea({
                content: idea.content,
                status: idea.status,
                tags: idea.tags.length > 0 ? idea.tags : undefined,
                refs: idea.refs.length > 0 ? idea.refs : undefined,
                source_ref: "cli:push-ideas",
            });

            if (response.success) {
                createdCount++;
            } else {
                errorCount++;
            }
        }

        spinner.succeed(`Created ${createdCount} ideas`);
    }

    // Update existing ideas
    if (diff.toUpdate.length > 0) {
        spinner.start(`Updating ${diff.toUpdate.length} ideas...`);

        // Group updates by similar changes for batch operation
        for (const update of diff.toUpdate) {
            const response = await apiClient.updateIdeas([update.id], update.updates);

            if (response.success) {
                updatedCount++;
            } else {
                errorCount++;
            }
        }

        spinner.succeed(`Updated ${updatedCount} ideas`);
    }

    // Delete remote-only ideas (if flag is set)
    if (options.deleteRemote && diff.toDelete.length > 0) {
        spinner.start(`Deleting ${diff.toDelete.length} remote-only ideas...`);

        const response = await apiClient.deleteIdeas(diff.toDelete);

        if (response.success) {
            deletedCount = diff.toDelete.length;
            spinner.succeed(`Deleted ${deletedCount} ideas`);
        } else {
            spinner.fail("Failed to delete ideas");
            console.log(chalk.red(`  Error: ${response.error}`));
            errorCount += diff.toDelete.length;
        }
    }

    // Summary
    console.log("");
    console.log(chalk.green("✓ Push complete!"));
    console.log(chalk.dim(`  Created: ${createdCount}`));
    console.log(chalk.dim(`  Updated: ${updatedCount}`));
    if (options.deleteRemote) {
        console.log(chalk.dim(`  Deleted: ${deletedCount}`));
    }

    if (errorCount > 0) {
        console.log(chalk.yellow(`  Errors: ${errorCount}`));
    }
}

/**
 * Truncate string to max length
 */
function truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + "...";
}
