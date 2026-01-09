import { Command } from "commander";
import chalk from "chalk";
import { syncCommand } from "./commands/sync.js";
import { initCommand } from "./commands/init.js";
import { statusCommand } from "./commands/status.js";
import { addCommand } from "./commands/add.js";
import { pushIdeasCommand } from "./commands/push-ideas.js";
import { pullIdeasCommand } from "./commands/pull-ideas.js";
import { healthCommand } from "./commands/health.js";
import { HubApiClient, loadConfig } from "./lib/api-client.js";

const VERSION = "0.1.0";

// ASCII Art Logo
const logo = `
  ╦ ╦╦ ╦╔╗
  ╠═╣║ ║╠╩╗
  ╩ ╩╚═╝╚═╝
`;

// Create CLI program
const program = new Command();

program
    .name("hub")
    .description(chalk.cyan("Hub CLI - Local sync tool for your personal Hub"))
    .version(VERSION, "-v, --version", "Display version number")
    .addHelpText("beforeAll", chalk.cyan(logo));

// Init command - Initialize Hub CLI in a directory
program
    .command("init")
    .description("Initialize Hub CLI configuration in the current directory")
    .option("-f, --force", "Overwrite existing configuration")
    .action(initCommand);

// Add command - Add a directory source
program
    .command("add <path>")
    .description("Add a local directory as a source")
    .option("-n, --name <name>", "Name for the source")
    .option("-d, --description <desc>", "Description for the source")
    .option("--include <patterns...>", "Glob patterns to include")
    .option("--exclude <patterns...>", "Glob patterns to exclude")
    .action(addCommand);

// Sync command - Sync local content to Hub
program
    .command("sync [source]")
    .description("Sync local content to Hub")
    .option("-a, --all", "Sync all configured sources")
    .option("--dry-run", "Show what would be synced without actually syncing")
    .option("-f, --force", "Force sync, ignoring cache")
    .action(syncCommand);

// Status command - Show sync status
program
    .command("status")
    .description("Show status of configured sources")
    .option("-v, --verbose", "Show detailed status")
    .action(statusCommand);

// Idea command - Quick capture an idea
program
    .command("idea <content...>")
    .description("Quick capture an idea to your Hub inbox")
    .option("-t, --tags <tags...>", "Add tags to the idea")
    .action(async (content: string[], options: { tags?: string[] }) => {
        const ideaContent = content.join(" ");
        const tags = options.tags || [];

        // Try to send to API
        const config = await loadConfig(process.cwd());

        if (config) {
            const apiClient = new HubApiClient(config);
            const connectionTest = await apiClient.testConnection();

            if (connectionTest.ok) {
                // Build content with tags
                let fullContent = ideaContent;
                if (tags.length > 0) {
                    fullContent += " " + tags.map((t) => `#${t}`).join(" ");
                }

                const response = await apiClient.createIdea({
                    content: fullContent,
                    status: "inbox",
                    tags: tags.length > 0 ? tags : undefined,
                    source_ref: "cli:idea",
                });

                if (response.success) {
                    console.log(
                        chalk.green("✓") + " Idea captured and synced to Hub:",
                    );
                    console.log(chalk.dim("  > ") + ideaContent);
                    if (tags.length > 0) {
                        console.log(
                            chalk.dim("  Tags: ") +
                                tags.map((t) => chalk.cyan(`#${t}`)).join(" "),
                        );
                    }
                    return;
                }

                console.log(
                    chalk.yellow("⚠ Could not sync to Hub:"),
                    response.error,
                );
            }
        }

        // Fallback: just show the idea locally
        console.log(chalk.green("✓") + " Idea captured:");
        console.log(chalk.dim("  > ") + ideaContent);
        if (tags.length > 0) {
            console.log(
                chalk.dim("  Tags: ") +
                    tags.map((t) => chalk.cyan(`#${t}`)).join(" "),
            );
        }

        console.log(
            chalk.yellow(
                "\n⚠ Note: Idea saved locally only. Configure Hub API to sync.",
            ),
        );
    });

// Push command - Push ideas.md to Hub
program
    .command("push-ideas [file]")
    .description("Push local ideas.md to Hub")
    .option("--create", "Create ideas.md if it doesn't exist")
    .option("--delete-remote", "Delete remote ideas not in local file")
    .option("--dry-run", "Show what would be synced without actually syncing")
    .action(pushIdeasCommand);

// Pull command - Pull ideas.md from Hub
program
    .command("pull-ideas [file]")
    .description("Pull ideas from Hub to local ideas.md")
    .option("-f, --force", "Overwrite local file without prompting")
    .option("--merge", "Merge remote ideas with local ideas")
    .option("--backup", "Create backup before overwriting")
    .action(pullIdeasCommand);

// Health command - Test Supabase database connectivity
program
    .command("health")
    .description("Check Hub API and database connectivity")
    .option("--full", "Run comprehensive database tests")
    .option("--json", "Output as JSON")
    .action(healthCommand);

// Login command - Configure API key
program
    .command("login")
    .description("Configure Hub API connection")
    .action(async () => {
        console.log(chalk.cyan("\n🔑 Hub Login\n"));

        const inquirer = await import("inquirer");

        const answers = await inquirer.default.prompt([
            {
                type: "input",
                name: "apiUrl",
                message: "Hub API URL:",
                default: "http://localhost:3000/api",
            },
            {
                type: "password",
                name: "apiKey",
                message: "API Key:",
                mask: "*",
            },
        ]);

        // Test connection
        const apiClient = new HubApiClient({
            apiUrl: answers.apiUrl,
            apiKey: answers.apiKey,
        });

        console.log(chalk.dim("\nTesting connection..."));

        const connectionTest = await apiClient.testConnection();

        if (!connectionTest.ok) {
            console.log(
                chalk.red("✗ Connection failed:"),
                connectionTest.message,
            );
            return;
        }

        console.log(chalk.green("✓ Connection successful!"));

        // Update .hubrc
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const configPath = path.default.join(process.cwd(), ".hubrc");

        let config: Record<string, unknown> = {};

        try {
            const existing = await fs.default.readFile(configPath, "utf-8");
            config = JSON.parse(existing);
        } catch {
            // No existing config
        }

        config.apiUrl = answers.apiUrl;
        config.apiKey = answers.apiKey;

        await fs.default.writeFile(
            configPath,
            JSON.stringify(config, null, 2),
            "utf-8",
        );

        console.log(chalk.green("✓ Credentials saved to .hubrc"));
        console.log(
            chalk.yellow("\n⚠ Remember to add .hubrc to your .gitignore"),
        );
    });

// Test command - Test API connection
program
    .command("test")
    .description("Test connection to Hub API")
    .action(async () => {
        console.log(chalk.cyan("\n🔌 Testing Hub Connection\n"));

        const config = await loadConfig(process.cwd());

        if (!config) {
            console.log(chalk.red("✗ No .hubrc configuration found."));
            console.log(chalk.dim("  Run `hub init` or `hub login` first."));
            return;
        }

        console.log(chalk.dim(`API URL: ${config.apiUrl}`));
        console.log(
            chalk.dim(`API Key: ${config.apiKey ? "configured" : "not set"}`),
        );
        console.log("");

        const apiClient = new HubApiClient(config);
        const connectionTest = await apiClient.testConnection();

        if (connectionTest.ok) {
            console.log(chalk.green("✓ ") + connectionTest.message);
        } else {
            console.log(chalk.red("✗ ") + connectionTest.message);
        }
    });

// Error handling
program.showHelpAfterError(true);

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
