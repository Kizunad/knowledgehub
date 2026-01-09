"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    FileText,
    FileCode,
    FileImage,
    File,
    Download,
    Copy,
    Check,
    Clock,
    HardDrive,
    ChevronLeft,
    ChevronRight,
    Maximize2,
    Minimize2,
    BookOpen,
    Code,
    Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types
interface FileItem {
    id: string;
    source_id: string;
    path: string;
    name: string;
    content: string | null;
    size: number | null;
    mime_type: string | null;
    file_hash: string | null;
    created_at: string;
    updated_at: string;
}

interface SourceInfo {
    id: string;
    name: string;
    mode: string;
    path: string;
    description: string | null;
}

// Helper functions
function formatFileSize(bytes: number | null): string {
    if (bytes === null || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
}

function getFileIcon(mimeType: string | null, fileName: string) {
    if (mimeType?.startsWith("image/")) {
        return <FileImage className="w-5 h-5 text-purple-400" />;
    }
    if (
        mimeType?.includes("javascript") ||
        mimeType?.includes("typescript") ||
        mimeType?.includes("json") ||
        fileName.match(
            /\.(js|ts|jsx|tsx|py|rb|go|rs|java|c|cpp|h|css|html|xml|yaml|yml|toml)$/,
        )
    ) {
        return <FileCode className="w-5 h-5 text-blue-400" />;
    }
    if (
        mimeType?.startsWith("text/") ||
        fileName.match(/\.(txt|md|markdown)$/)
    ) {
        return <FileText className="w-5 h-5 text-green-400" />;
    }
    return <File className="w-5 h-5 text-stone-400" />;
}

function getLanguageFromFileName(fileName: string): string {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    const langMap: Record<string, string> = {
        js: "javascript",
        jsx: "javascript",
        ts: "typescript",
        tsx: "typescript",
        py: "python",
        rb: "ruby",
        go: "go",
        rs: "rust",
        java: "java",
        c: "c",
        cpp: "cpp",
        h: "c",
        hpp: "cpp",
        css: "css",
        scss: "scss",
        less: "less",
        html: "html",
        htm: "html",
        xml: "xml",
        svg: "xml",
        json: "json",
        yaml: "yaml",
        yml: "yaml",
        toml: "toml",
        md: "markdown",
        markdown: "markdown",
        sql: "sql",
        sh: "bash",
        bash: "bash",
        zsh: "bash",
        ps1: "powershell",
        dockerfile: "dockerfile",
        makefile: "makefile",
    };
    return langMap[ext] || "plaintext";
}

function isMarkdownFile(fileName: string): boolean {
    return /\.(md|markdown)$/i.test(fileName);
}

function isImageFile(mimeType: string | null): boolean {
    return mimeType?.startsWith("image/") || false;
}

// Simple Markdown Renderer
function MarkdownRenderer({ content }: { content: string }) {
    const rendered = useMemo(() => {
        let html = content;

        // Escape HTML
        html = html
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // Code blocks
        html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, _lang, code) => {
            return `<pre class="bg-stone-900 border border-stone-800 rounded-lg p-4 overflow-x-auto my-4"><code class="text-sm text-stone-300">${code.trim()}</code></pre>`;
        });

        // Inline code
        html = html.replace(
            /`([^`]+)`/g,
            '<code class="bg-stone-800 px-1.5 py-0.5 rounded text-sm text-amber-300">$1</code>',
        );

        // Headers
        html = html.replace(
            /^### (.+)$/gm,
            '<h3 class="text-lg font-semibold text-stone-100 mt-6 mb-2">$1</h3>',
        );
        html = html.replace(
            /^## (.+)$/gm,
            '<h2 class="text-xl font-semibold text-stone-100 mt-8 mb-3">$1</h2>',
        );
        html = html.replace(
            /^# (.+)$/gm,
            '<h1 class="text-2xl font-bold text-stone-100 mt-8 mb-4">$1</h1>',
        );

        // Bold and italic
        html = html.replace(
            /\*\*\*(.+?)\*\*\*/g,
            "<strong><em>$1</em></strong>",
        );
        html = html.replace(
            /\*\*(.+?)\*\*/g,
            '<strong class="font-semibold text-stone-100">$1</strong>',
        );
        html = html.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');
        html = html.replace(
            /~~(.+?)~~/g,
            '<del class="line-through text-stone-500">$1</del>',
        );

        // Links
        html = html.replace(
            /\[([^\]]+)\]\(([^)]+)\)/g,
            '<a href="$2" class="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener">$1</a>',
        );

        // Images
        html = html.replace(
            /!\[([^\]]*)\]\(([^)]+)\)/g,
            '<img src="$2" alt="$1" class="max-w-full rounded-lg my-4" />',
        );

        // Blockquotes
        html = html.replace(
            /^> (.+)$/gm,
            '<blockquote class="border-l-4 border-stone-600 pl-4 py-1 my-4 text-stone-400 italic">$1</blockquote>',
        );

        // Horizontal rule
        html = html.replace(/^---$/gm, '<hr class="border-stone-700 my-8" />');

        // Unordered lists
        html = html.replace(
            /^[\-\*] (.+)$/gm,
            '<li class="ml-4 list-disc text-stone-300">$1</li>',
        );

        // Ordered lists
        html = html.replace(
            /^\d+\. (.+)$/gm,
            '<li class="ml-4 list-decimal text-stone-300">$1</li>',
        );

        // Wrap consecutive li elements
        html = html.replace(
            /(<li[^>]*>.*<\/li>\n?)+/g,
            '<ul class="my-4 space-y-1">$&</ul>',
        );

        // Paragraphs
        html = html.replace(
            /\n\n/g,
            '</p><p class="my-4 text-stone-300 leading-relaxed">',
        );
        html = `<p class="my-4 text-stone-300 leading-relaxed">${html}</p>`;

        // Clean up empty paragraphs
        html = html.replace(/<p[^>]*>\s*<\/p>/g, "");

        return html;
    }, [content]);

    return (
        <div
            className="prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: rendered }}
        />
    );
}

// Code Viewer with line numbers
function CodeViewer({
    content,
    language,
}: {
    content: string;
    language: string;
}) {
    const lines = content.split("\n");

    return (
        <div className="relative">
            <div className="absolute top-2 right-2 px-2 py-1 text-xs text-stone-500 bg-stone-800 rounded">
                {language}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm font-mono">
                    <tbody>
                        {lines.map((line, index) => (
                            <tr key={index} className="hover:bg-stone-800/50">
                                <td className="select-none text-right pr-4 py-0.5 text-stone-600 w-12 align-top">
                                    {index + 1}
                                </td>
                                <td className="py-0.5 text-stone-300 whitespace-pre">
                                    {line || " "}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// Main Page Component
export default function StudyFileViewerPage() {
    const params = useParams();
    const router = useRouter();
    const sourceId = params.sourceId as string;
    const fileId = params.fileId as string;

    const [file, setFile] = useState<FileItem | null>(null);
    const [source, setSource] = useState<SourceInfo | null>(null);
    const [siblingFiles, setSiblingFiles] = useState<FileItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [viewMode, setViewMode] = useState<"rendered" | "source">("rendered");

    // Fetch file
    const fetchFile = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/files/${fileId}`);
            const result = await response.json();
            if (result.success && result.data) {
                setFile(result.data);
            } else {
                setError(result.error || "Failed to load file");
            }
        } catch (err) {
            setError("Failed to load file");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [fileId]);

    // Fetch source info
    const fetchSource = useCallback(async () => {
        try {
            const response = await fetch(`/api/sources/${sourceId}`);
            const result = await response.json();
            if (result.success && result.data) {
                setSource(result.data);
            }
        } catch (err) {
            console.error("Failed to fetch source:", err);
        }
    }, [sourceId]);

    // Fetch sibling files for navigation
    const fetchSiblingFiles = useCallback(async () => {
        try {
            const response = await fetch(
                `/api/files?source_id=${sourceId}&limit=100`,
            );
            const result = await response.json();
            if (result.success && result.data?.files) {
                setSiblingFiles(result.data.files);
            }
        } catch (err) {
            console.error("Failed to fetch sibling files:", err);
        }
    }, [sourceId]);

    // Initial fetch
    useEffect(() => {
        if (fileId && sourceId) {
            fetchFile();
            fetchSource();
            fetchSiblingFiles();
        }
    }, [fileId, sourceId, fetchFile, fetchSource, fetchSiblingFiles]);

    // Navigation
    const currentIndex = siblingFiles.findIndex((f) => f.id === fileId);
    const prevFile = currentIndex > 0 ? siblingFiles[currentIndex - 1] : null;
    const nextFile =
        currentIndex < siblingFiles.length - 1
            ? siblingFiles[currentIndex + 1]
            : null;

    // Copy content
    const handleCopy = async () => {
        if (file?.content) {
            await navigator.clipboard.writeText(file.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Download
    const handleDownload = () => {
        if (file?.content) {
            const blob = new Blob([file.content], {
                type: file.mime_type || "text/plain",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = file.name;
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft" && prevFile) {
                router.push(`/study/${sourceId}/${prevFile.id}`);
            } else if (e.key === "ArrowRight" && nextFile) {
                router.push(`/study/${sourceId}/${nextFile.id}`);
            } else if (e.key === "Escape" && isFullscreen) {
                setIsFullscreen(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [prevFile, nextFile, sourceId, router, isFullscreen]);

    // Determine view type
    const isMarkdown = file ? isMarkdownFile(file.name) : false;
    const isImage = file ? isImageFile(file.mime_type) : false;
    const language = file ? getLanguageFromFileName(file.name) : "plaintext";

    if (error) {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-400 mb-4">{error}</p>
                    <button
                        onClick={() => router.push(`/study/${sourceId}`)}
                        className="text-stone-400 hover:text-stone-300"
                    >
                        ← Back to files
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            className={cn(
                "min-h-screen bg-stone-950",
                isFullscreen && "fixed inset-0 z-50",
            )}
        >
            {/* Header */}
            <header className="sticky top-0 z-40 bg-stone-950/80 backdrop-blur-sm border-b border-stone-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-14">
                        {/* Back & Breadcrumb */}
                        <div className="flex items-center gap-3 min-w-0">
                            <button
                                onClick={() =>
                                    router.push(`/study/${sourceId}`)
                                }
                                className="p-2 hover:bg-stone-800 rounded-lg transition-colors shrink-0"
                            >
                                <ArrowLeft className="w-5 h-5 text-stone-400" />
                            </button>

                            {/* Breadcrumb */}
                            <div className="flex items-center gap-2 text-sm min-w-0">
                                <Link
                                    href="/study"
                                    className="text-stone-500 hover:text-stone-300 shrink-0"
                                >
                                    Study
                                </Link>
                                <span className="text-stone-600">/</span>
                                <Link
                                    href={`/study/${sourceId}`}
                                    className="text-stone-500 hover:text-stone-300 truncate max-w-[100px] sm:max-w-[150px]"
                                >
                                    {source?.name || "..."}
                                </Link>
                                <span className="text-stone-600">/</span>
                                <span className="text-stone-100 truncate">
                                    {file?.name || "Loading..."}
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                            {/* View toggle for markdown */}
                            {isMarkdown && (
                                <div className="hidden sm:flex bg-stone-900 border border-stone-800 rounded-lg p-0.5 mr-2">
                                    <button
                                        onClick={() => setViewMode("rendered")}
                                        className={cn(
                                            "p-1.5 rounded-md transition-colors",
                                            viewMode === "rendered"
                                                ? "bg-stone-700 text-stone-100"
                                                : "text-stone-500 hover:text-stone-300",
                                        )}
                                        title="Rendered"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode("source")}
                                        className={cn(
                                            "p-1.5 rounded-md transition-colors",
                                            viewMode === "source"
                                                ? "bg-stone-700 text-stone-100"
                                                : "text-stone-500 hover:text-stone-300",
                                        )}
                                        title="Source"
                                    >
                                        <Code className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            <button
                                onClick={handleCopy}
                                className="p-2 hover:bg-stone-800 rounded-lg transition-colors"
                                title="Copy content"
                            >
                                {copied ? (
                                    <Check className="w-4 h-4 text-green-400" />
                                ) : (
                                    <Copy className="w-4 h-4 text-stone-400" />
                                )}
                            </button>
                            <button
                                onClick={handleDownload}
                                className="p-2 hover:bg-stone-800 rounded-lg transition-colors"
                                title="Download"
                            >
                                <Download className="w-4 h-4 text-stone-400" />
                            </button>
                            <button
                                onClick={() => setIsFullscreen(!isFullscreen)}
                                className="hidden sm:block p-2 hover:bg-stone-800 rounded-lg transition-colors"
                                title={
                                    isFullscreen
                                        ? "Exit fullscreen"
                                        : "Fullscreen"
                                }
                            >
                                {isFullscreen ? (
                                    <Minimize2 className="w-4 h-4 text-stone-400" />
                                ) : (
                                    <Maximize2 className="w-4 h-4 text-stone-400" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* File Navigation */}
            {siblingFiles.length > 1 && (
                <div className="border-b border-stone-800 bg-stone-900/50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-2">
                            <button
                                onClick={() =>
                                    prevFile &&
                                    router.push(
                                        `/study/${sourceId}/${prevFile.id}`,
                                    )
                                }
                                disabled={!prevFile}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors",
                                    prevFile
                                        ? "text-stone-300 hover:bg-stone-800"
                                        : "text-stone-600 cursor-not-allowed",
                                )}
                            >
                                <ChevronLeft className="w-4 h-4" />
                                <span className="hidden sm:inline truncate max-w-[150px]">
                                    {prevFile?.name || "Previous"}
                                </span>
                            </button>

                            <span className="text-xs text-stone-500">
                                {currentIndex + 1} / {siblingFiles.length}
                            </span>

                            <button
                                onClick={() =>
                                    nextFile &&
                                    router.push(
                                        `/study/${sourceId}/${nextFile.id}`,
                                    )
                                }
                                disabled={!nextFile}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors",
                                    nextFile
                                        ? "text-stone-300 hover:bg-stone-800"
                                        : "text-stone-600 cursor-not-allowed",
                                )}
                            >
                                <span className="hidden sm:inline truncate max-w-[150px]">
                                    {nextFile?.name || "Next"}
                                </span>
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-pulse flex items-center gap-3">
                            <div className="w-8 h-8 bg-stone-800 rounded" />
                            <div className="h-4 w-32 bg-stone-800 rounded" />
                        </div>
                    </div>
                ) : file ? (
                    <div className="space-y-6">
                        {/* File Info */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-stone-400">
                            <div className="flex items-center gap-2">
                                {getFileIcon(file.mime_type, file.name)}
                                <span className="font-medium text-stone-200">
                                    {file.name}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <HardDrive className="w-4 h-4" />
                                <span>{formatFileSize(file.size)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span>{formatDate(file.updated_at)}</span>
                            </div>
                        </div>

                        {/* Content */}
                        <div
                            className={cn(
                                "bg-stone-900 border border-stone-800 rounded-xl overflow-hidden",
                                isFullscreen && "flex-1",
                            )}
                        >
                            {isImage ? (
                                <div className="p-4 flex items-center justify-center min-h-[300px]">
                                    {file.content ? (
                                        <img
                                            src={`data:${file.mime_type};base64,${file.content}`}
                                            alt={file.name}
                                            className="max-w-full max-h-[70vh] rounded-lg"
                                        />
                                    ) : (
                                        <p className="text-stone-500">
                                            Image preview not available
                                        </p>
                                    )}
                                </div>
                            ) : isMarkdown && viewMode === "rendered" ? (
                                <div className="p-6 sm:p-8 max-w-4xl">
                                    <MarkdownRenderer
                                        content={file.content || ""}
                                    />
                                </div>
                            ) : (
                                <div className="p-4">
                                    <CodeViewer
                                        content={file.content || ""}
                                        language={language}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Reading tip for markdown */}
                        {isMarkdown && (
                            <div className="flex items-center gap-2 text-xs text-stone-500">
                                <BookOpen className="w-4 h-4" />
                                <span>
                                    Use ← → arrow keys to navigate between files
                                </span>
                            </div>
                        )}
                    </div>
                ) : null}
            </main>
        </div>
    );
}
