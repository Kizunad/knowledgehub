"use client";

import { useState, useCallback } from "react";

// ============================================================================
// Types
// ============================================================================

export type ExportFormat = "markdown" | "json" | "csv" | "text";

export interface ExportOptions {
    /** Export format */
    format: ExportFormat;
    /** Custom filename (without extension) */
    filename?: string;
    /** Include metadata in export */
    includeMetadata?: boolean;
    /** Pretty print JSON (default: true) */
    prettyPrint?: boolean;
    /** Custom date format for filenames */
    dateFormat?: string;
    /** Fields to include (for selective export) */
    includeFields?: string[];
    /** Fields to exclude */
    excludeFields?: string[];
}

export interface ExportResult {
    /** Whether export was successful */
    success: boolean;
    /** Filename that was exported */
    filename: string;
    /** Size of exported content in bytes */
    size: number;
    /** Error message if failed */
    error?: string;
}

export interface UseExportOptions {
    /** Default filename prefix */
    defaultFilename?: string;
    /** Callback on successful export */
    onExportSuccess?: (result: ExportResult) => void;
    /** Callback on export error */
    onExportError?: (error: Error) => void;
}

export interface UseExportResult<T> {
    /** Export items to file */
    exportItems: (items: T[], options: ExportOptions) => Promise<ExportResult>;
    /** Export to clipboard */
    exportToClipboard: (
        items: T[],
        options: Omit<ExportOptions, "filename">,
    ) => Promise<boolean>;
    /** Get export content without downloading */
    getExportContent: (
        items: T[],
        options: Omit<ExportOptions, "filename">,
    ) => string;
    /** Whether export is in progress */
    isExporting: boolean;
    /** Last export result */
    lastResult: ExportResult | null;
}

// ============================================================================
// Markdown Formatters
// ============================================================================

export interface MarkdownFormatter<T> {
    /** Format a single item as markdown */
    formatItem: (item: T, index: number) => string;
    /** Format header (optional) */
    formatHeader?: () => string;
    /** Format footer (optional) */
    formatFooter?: (items: T[]) => string;
}

function defaultMarkdownFormatter<T>(item: T, _index: number): string {
    if (typeof item === "object" && item !== null) {
        const obj = item as Record<string, unknown>;
        const lines: string[] = [];

        // Try to find a title/name field
        const titleField = obj.title || obj.name || obj.content || obj.id;
        if (titleField) {
            lines.push(`## ${String(titleField)}`);
            lines.push("");
        }

        // Add other fields
        for (const [key, value] of Object.entries(obj)) {
            if (
                key === "title" ||
                key === "name" ||
                key === "content" ||
                key === "id"
            )
                continue;
            if (value === null || value === undefined) continue;

            if (Array.isArray(value)) {
                lines.push(`**${key}:** ${value.join(", ")}`);
            } else if (typeof value === "object") {
                lines.push(`**${key}:** ${JSON.stringify(value)}`);
            } else {
                lines.push(`**${key}:** ${String(value)}`);
            }
        }

        lines.push("");
        lines.push("---");
        lines.push("");

        return lines.join("\n");
    }

    return `- ${String(item)}\n`;
}

// ============================================================================
// Specific Export Formatters
// ============================================================================

export interface Idea {
    id: string;
    content: string;
    status: string;
    done: boolean;
    tags?: string[] | null;
    refs?: string[] | null;
    source_ref?: string | null;
    created_at: string;
    updated_at: string;
}

export interface Source {
    id: string;
    title: string;
    type: string;
    url?: string | null;
    authors?: string[] | null;
    notes?: string | null;
    rating?: number | null;
    created_at: string;
}

export interface Chat {
    id: string;
    title: string;
    model?: string | null;
    messages?: Array<{ role: string; content: string }>;
    created_at: string;
}

export const ideaMarkdownFormatter: MarkdownFormatter<Idea> = {
    formatHeader: () =>
        `# Ideas Export\n\nExported at: ${new Date().toLocaleString()}\n\n---\n\n`,
    formatItem: (idea, _index) => {
        const lines: string[] = [];
        const checkbox = idea.done ? "[x]" : "[ ]";

        lines.push(`## ${checkbox} ${idea.content}`);
        lines.push("");

        if (idea.tags && idea.tags.length > 0) {
            lines.push(`**Tags:** ${idea.tags.map((t) => `#${t}`).join(" ")}`);
        }

        if (idea.refs && idea.refs.length > 0) {
            lines.push(`**References:** ${idea.refs.join(", ")}`);
        }

        lines.push(`**Status:** ${idea.status}`);
        lines.push(
            `**Created:** ${new Date(idea.created_at).toLocaleString()}`,
        );
        lines.push("");
        lines.push("---");
        lines.push("");

        return lines.join("\n");
    },
    formatFooter: (items) => `\n\n**Total Ideas:** ${items.length}\n`,
};

export const sourceMarkdownFormatter: MarkdownFormatter<Source> = {
    formatHeader: () =>
        `# Sources Export\n\nExported at: ${new Date().toLocaleString()}\n\n---\n\n`,
    formatItem: (source, _index) => {
        const lines: string[] = [];

        lines.push(`## ${source.title}`);
        lines.push("");
        lines.push(`**Type:** ${source.type}`);

        if (source.url) {
            lines.push(`**URL:** [${source.url}](${source.url})`);
        }

        if (source.authors && source.authors.length > 0) {
            lines.push(`**Authors:** ${source.authors.join(", ")}`);
        }

        if (source.rating) {
            lines.push(`**Rating:** ${"⭐".repeat(source.rating)}`);
        }

        if (source.notes) {
            lines.push("");
            lines.push("### Notes");
            lines.push(source.notes);
        }

        lines.push("");
        lines.push("---");
        lines.push("");

        return lines.join("\n");
    },
    formatFooter: (items) => `\n\n**Total Sources:** ${items.length}\n`,
};

export const chatMarkdownFormatter: MarkdownFormatter<Chat> = {
    formatHeader: () =>
        `# Chat Export\n\nExported at: ${new Date().toLocaleString()}\n\n`,
    formatItem: (chat, _index) => {
        const lines: string[] = [];

        lines.push(`## ${chat.title}`);
        lines.push("");

        if (chat.model) {
            lines.push(`**Model:** ${chat.model}`);
        }

        lines.push(
            `**Created:** ${new Date(chat.created_at).toLocaleString()}`,
        );
        lines.push("");

        if (chat.messages && chat.messages.length > 0) {
            lines.push("### Messages");
            lines.push("");

            for (const msg of chat.messages) {
                const roleLabel =
                    msg.role === "user" ? "👤 **User**" : "🤖 **Assistant**";
                lines.push(`${roleLabel}:`);
                lines.push("");
                lines.push(msg.content);
                lines.push("");
            }
        }

        lines.push("---");
        lines.push("");

        return lines.join("\n");
    },
};

// ============================================================================
// CSV Formatter
// ============================================================================

function formatCsv<T>(items: T[], options: ExportOptions): string {
    if (items.length === 0) return "";

    const firstItem = items[0];
    if (typeof firstItem !== "object" || firstItem === null) {
        return items.map(String).join("\n");
    }

    // Get all unique keys
    const allKeys = new Set<string>();
    for (const item of items) {
        for (const key of Object.keys(item as object)) {
            allKeys.add(key);
        }
    }

    // Filter keys based on options
    let keys = Array.from(allKeys);
    if (options.includeFields) {
        keys = keys.filter((k) => options.includeFields!.includes(k));
    }
    if (options.excludeFields) {
        keys = keys.filter((k) => !options.excludeFields!.includes(k));
    }

    // Format header
    const header = keys.map((k) => `"${k}"`).join(",");

    // Format rows
    const rows = items.map((item) => {
        const obj = item as Record<string, unknown>;
        return keys
            .map((key) => {
                const value = obj[key];
                if (value === null || value === undefined) return '""';
                if (Array.isArray(value)) return `"${value.join("; ")}"`;
                if (typeof value === "object")
                    return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
                return `"${String(value).replace(/"/g, '""')}"`;
            })
            .join(",");
    });

    return [header, ...rows].join("\n");
}

// ============================================================================
// Main Hook
// ============================================================================

export function useExport<T>({
    defaultFilename = "export",
    onExportSuccess,
    onExportError,
}: UseExportOptions = {}): UseExportResult<T> {
    const [isExporting, setIsExporting] = useState(false);
    const [lastResult, setLastResult] = useState<ExportResult | null>(null);

    // Get file extension for format
    const getExtension = useCallback((format: ExportFormat): string => {
        switch (format) {
            case "markdown":
                return "md";
            case "json":
                return "json";
            case "csv":
                return "csv";
            case "text":
                return "txt";
            default:
                return "txt";
        }
    }, []);

    // Get MIME type for format
    const getMimeType = useCallback((format: ExportFormat): string => {
        switch (format) {
            case "markdown":
                return "text/markdown";
            case "json":
                return "application/json";
            case "csv":
                return "text/csv";
            case "text":
                return "text/plain";
            default:
                return "text/plain";
        }
    }, []);

    // Generate filename
    const generateFilename = useCallback(
        (options: ExportOptions): string => {
            const base = options.filename || defaultFilename;
            const date = new Date().toISOString().split("T")[0];
            const ext = getExtension(options.format);
            return `${base}_${date}.${ext}`;
        },
        [defaultFilename, getExtension],
    );

    // Filter item fields based on options
    const filterFields = useCallback((item: T, options: ExportOptions): T => {
        if (typeof item !== "object" || item === null) return item;

        const obj = item as Record<string, unknown>;
        const filtered: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(obj)) {
            if (options.excludeFields?.includes(key)) continue;
            if (options.includeFields && !options.includeFields.includes(key))
                continue;
            filtered[key] = value;
        }

        return filtered as T;
    }, []);

    // Get export content without downloading
    const getExportContent = useCallback(
        (
            items: T[],
            options: Omit<ExportOptions, "filename">,
            formatter?: MarkdownFormatter<T>,
        ): string => {
            const filteredItems = items.map((item) =>
                filterFields(item, options as ExportOptions),
            );

            switch (options.format) {
                case "json": {
                    const data = options.includeMetadata
                        ? {
                              exportedAt: new Date().toISOString(),
                              count: filteredItems.length,
                              items: filteredItems,
                          }
                        : filteredItems;
                    return options.prettyPrint !== false
                        ? JSON.stringify(data, null, 2)
                        : JSON.stringify(data);
                }

                case "csv":
                    return formatCsv(filteredItems, options as ExportOptions);

                case "markdown": {
                    const fmt = formatter || {
                        formatItem: defaultMarkdownFormatter,
                    };
                    let content = "";

                    if (fmt.formatHeader) {
                        content += fmt.formatHeader();
                    }

                    content += filteredItems
                        .map((item, i) => fmt.formatItem(item, i))
                        .join("\n");

                    if (fmt.formatFooter) {
                        content += fmt.formatFooter(filteredItems);
                    }

                    return content;
                }

                case "text":
                default:
                    return filteredItems
                        .map((item) =>
                            typeof item === "object"
                                ? JSON.stringify(item)
                                : String(item),
                        )
                        .join("\n");
            }
        },
        [filterFields],
    );

    // Export items to file
    const exportItems = useCallback(
        async (items: T[], options: ExportOptions): Promise<ExportResult> => {
            setIsExporting(true);

            try {
                const content = getExportContent(items, options);
                const filename = generateFilename(options);
                const mimeType = getMimeType(options.format);

                // Create blob and download
                const blob = new Blob([content], { type: mimeType });
                const url = URL.createObjectURL(blob);

                const link = document.createElement("a");
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                URL.revokeObjectURL(url);

                const result: ExportResult = {
                    success: true,
                    filename,
                    size: blob.size,
                };

                setLastResult(result);

                if (onExportSuccess) {
                    onExportSuccess(result);
                }

                return result;
            } catch (error) {
                const result: ExportResult = {
                    success: false,
                    filename: "",
                    size: 0,
                    error:
                        error instanceof Error
                            ? error.message
                            : "Export failed",
                };

                setLastResult(result);

                if (onExportError) {
                    onExportError(
                        error instanceof Error
                            ? error
                            : new Error("Export failed"),
                    );
                }

                return result;
            } finally {
                setIsExporting(false);
            }
        },
        [
            getExportContent,
            generateFilename,
            getMimeType,
            onExportSuccess,
            onExportError,
        ],
    );

    // Export to clipboard
    const exportToClipboard = useCallback(
        async (
            items: T[],
            options: Omit<ExportOptions, "filename">,
        ): Promise<boolean> => {
            try {
                const content = getExportContent(items, options);
                await navigator.clipboard.writeText(content);
                return true;
            } catch (error) {
                if (onExportError) {
                    onExportError(
                        error instanceof Error
                            ? error
                            : new Error("Clipboard export failed"),
                    );
                }
                return false;
            }
        },
        [getExportContent, onExportError],
    );

    return {
        exportItems,
        exportToClipboard,
        getExportContent,
        isExporting,
        lastResult,
    };
}

// ============================================================================
// Pre-configured Export Hooks
// ============================================================================

export function useIdeasExport() {
    return useExport<Idea>({
        defaultFilename: "ideas",
    });
}

export function useSourcesExport() {
    return useExport<Source>({
        defaultFilename: "sources",
    });
}

export function useChatsExport() {
    return useExport<Chat>({
        defaultFilename: "chats",
    });
}

// ============================================================================
// Bulk Export Utility
// ============================================================================

export interface BulkExportItem {
    type: string;
    items: unknown[];
    filename: string;
}

export async function bulkExport(
    exports: BulkExportItem[],
    format: ExportFormat = "json",
): Promise<void> {
    const combined: Record<string, unknown[]> = {};

    for (const exp of exports) {
        combined[exp.type] = exp.items;
    }

    const content =
        format === "json"
            ? JSON.stringify(
                  {
                      exportedAt: new Date().toISOString(),
                      data: combined,
                  },
                  null,
                  2,
              )
            : Object.entries(combined)
                  .map(
                      ([type, items]) =>
                          `# ${type}\n\n${items.map((i) => JSON.stringify(i)).join("\n")}`,
                  )
                  .join("\n\n---\n\n");

    const blob = new Blob([content], {
        type: format === "json" ? "application/json" : "text/markdown",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `hub_export_${new Date().toISOString().split("T")[0]}.${format === "json" ? "json" : "md"}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}
