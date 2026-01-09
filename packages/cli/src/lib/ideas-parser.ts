import fs from "node:fs/promises";
import path from "node:path";

/**
 * Ideas.md Parser
 * Parses the ideas.md file format and converts to/from API format
 *
 * File Format:
 * # Ideas
 *
 * ## Inbox
 * - [ ] Some idea #tag1 #tag2 @file:path/to/file
 * - [x] Completed idea
 *
 * ## Active
 * - [ ] Working on this
 *
 * ## Archive
 * - [x] Done with this
 */

// Types
export interface ParsedIdea {
    content: string;
    status: "inbox" | "active" | "archive";
    done: boolean;
    tags: string[];
    refs: string[];
    lineNumber: number;
}

export interface IdeasFile {
    inbox: ParsedIdea[];
    active: ParsedIdea[];
    archive: ParsedIdea[];
    rawContent: string;
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

// Section headers
const SECTION_HEADERS = {
    inbox: /^##\s*inbox/i,
    active: /^##\s*active/i,
    archive: /^##\s*archive/i,
};

// Regex patterns
const CHECKBOX_PATTERN = /^-\s*\[([ xX])\]\s*/;
const TAG_PATTERN = /#[\w\u4e00-\u9fa5]+/g;
const REF_PATTERN = /@[\w]+:[^\s]+/g;

/**
 * Parse a single line into a ParsedIdea
 */
function parseLine(line: string, status: "inbox" | "active" | "archive", lineNumber: number): ParsedIdea | null {
    const trimmed = line.trim();

    // Check if it's a checkbox item
    const checkboxMatch = trimmed.match(CHECKBOX_PATTERN);
    if (!checkboxMatch) {
        return null;
    }

    // Extract done status
    const done = checkboxMatch[1].toLowerCase() === "x";

    // Get content after checkbox
    let content = trimmed.replace(CHECKBOX_PATTERN, "").trim();

    // Extract tags
    const tagMatches = content.match(TAG_PATTERN);
    const tags = tagMatches ? [...new Set(tagMatches.map((t) => t.slice(1)))] : [];

    // Extract refs
    const refMatches = content.match(REF_PATTERN);
    const refs = refMatches ? [...new Set(refMatches)] : [];

    return {
        content,
        status,
        done,
        tags,
        refs,
        lineNumber,
    };
}

/**
 * Detect current section from line
 */
function detectSection(line: string): "inbox" | "active" | "archive" | null {
    const trimmed = line.trim();

    if (SECTION_HEADERS.inbox.test(trimmed)) return "inbox";
    if (SECTION_HEADERS.active.test(trimmed)) return "active";
    if (SECTION_HEADERS.archive.test(trimmed)) return "archive";

    return null;
}

/**
 * Parse ideas.md file content
 */
export function parseIdeasContent(content: string): IdeasFile {
    const lines = content.split("\n");
    const result: IdeasFile = {
        inbox: [],
        active: [],
        archive: [],
        rawContent: content,
    };

    let currentSection: "inbox" | "active" | "archive" = "inbox"; // Default to inbox

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;

        // Check for section header
        const section = detectSection(line);
        if (section) {
            currentSection = section;
            continue;
        }

        // Try to parse as idea
        const idea = parseLine(line, currentSection, lineNumber);
        if (idea) {
            result[currentSection].push(idea);
        }
    }

    return result;
}

/**
 * Parse ideas.md file from disk
 */
export async function parseIdeasFile(filePath: string): Promise<IdeasFile> {
    try {
        const content = await fs.readFile(filePath, "utf-8");
        return parseIdeasContent(content);
    } catch (error) {
        // Return empty if file doesn't exist
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            return {
                inbox: [],
                active: [],
                archive: [],
                rawContent: "",
            };
        }
        throw error;
    }
}

/**
 * Format a single idea as markdown line
 */
function formatIdea(idea: ParsedIdea | Idea): string {
    const checkbox = "done" in idea && idea.done ? "[x]" : "[ ]";
    return `- ${checkbox} ${idea.content}`;
}

/**
 * Generate ideas.md content from ideas
 */
export function generateIdeasContent(ideas: Idea[]): string {
    const inbox = ideas.filter((i) => i.status === "inbox");
    const active = ideas.filter((i) => i.status === "active");
    const archive = ideas.filter((i) => i.status === "archive");

    const lines: string[] = ["# Ideas", ""];

    // Inbox section
    lines.push("## Inbox", "");
    if (inbox.length === 0) {
        lines.push("_No ideas in inbox_", "");
    } else {
        for (const idea of inbox) {
            lines.push(formatIdea(idea));
        }
        lines.push("");
    }

    // Active section
    lines.push("## Active", "");
    if (active.length === 0) {
        lines.push("_No active ideas_", "");
    } else {
        for (const idea of active) {
            lines.push(formatIdea(idea));
        }
        lines.push("");
    }

    // Archive section
    lines.push("## Archive", "");
    if (archive.length === 0) {
        lines.push("_No archived ideas_", "");
    } else {
        // Show only recent archived items
        const recentArchive = archive.slice(0, 20);
        for (const idea of recentArchive) {
            lines.push(formatIdea(idea));
        }
        if (archive.length > 20) {
            lines.push(`_... and ${archive.length - 20} more archived ideas_`);
        }
        lines.push("");
    }

    return lines.join("\n");
}

/**
 * Write ideas to file
 */
export async function writeIdeasFile(filePath: string, ideas: Idea[]): Promise<void> {
    const content = generateIdeasContent(ideas);
    const dir = path.dirname(filePath);

    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(filePath, content, "utf-8");
}

/**
 * Compare parsed ideas with API ideas to find differences
 */
export interface IdeaDiff {
    toCreate: ParsedIdea[];
    toUpdate: Array<{ id: string; updates: Partial<Idea> }>;
    toDelete: string[];
    unchanged: number;
}

/**
 * Compute diff between local ideas and remote ideas
 */
export function computeIdeasDiff(local: IdeasFile, remote: Idea[]): IdeaDiff {
    const diff: IdeaDiff = {
        toCreate: [],
        toUpdate: [],
        toDelete: [],
        unchanged: 0,
    };

    // Create a map of remote ideas by content for matching
    const remoteByContent = new Map<string, Idea>();
    for (const idea of remote) {
        remoteByContent.set(normalizeContent(idea.content), idea);
    }

    // Track which remote ideas were matched
    const matchedIds = new Set<string>();

    // Process all local ideas
    const allLocal = [...local.inbox, ...local.active, ...local.archive];

    for (const localIdea of allLocal) {
        const normalizedContent = normalizeContent(localIdea.content);
        const remoteIdea = remoteByContent.get(normalizedContent);

        if (remoteIdea) {
            matchedIds.add(remoteIdea.id);

            // Check if update needed
            const needsUpdate =
                remoteIdea.status !== localIdea.status ||
                remoteIdea.done !== localIdea.done ||
                !arraysEqual(remoteIdea.tags || [], localIdea.tags);

            if (needsUpdate) {
                diff.toUpdate.push({
                    id: remoteIdea.id,
                    updates: {
                        status: localIdea.status,
                        done: localIdea.done,
                        tags: localIdea.tags,
                    },
                });
            } else {
                diff.unchanged++;
            }
        } else {
            // New idea to create
            diff.toCreate.push(localIdea);
        }
    }

    // Find remote ideas not in local (to potentially delete)
    for (const remoteIdea of remote) {
        if (!matchedIds.has(remoteIdea.id)) {
            diff.toDelete.push(remoteIdea.id);
        }
    }

    return diff;
}

/**
 * Normalize content for comparison
 */
function normalizeContent(content: string): string {
    return content.trim().toLowerCase();
}

/**
 * Compare two arrays for equality
 */
function arraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, idx) => val === sortedB[idx]);
}

/**
 * Default ideas.md template
 */
export const DEFAULT_IDEAS_TEMPLATE = `# Ideas

## Inbox

- [ ] First idea goes here #example
- [ ] Another idea

## Active

_No active ideas_

## Archive

_No archived ideas_
`;

/**
 * Create default ideas.md file if it doesn't exist
 */
export async function ensureIdeasFile(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return false; // File already exists
    } catch {
        await fs.writeFile(filePath, DEFAULT_IDEAS_TEMPLATE, "utf-8");
        return true; // Created new file
    }
}
