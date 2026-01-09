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
    GitBranch,
    ExternalLink,
    Hash,
    WrapText,
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
    mode: "github" | "link" | "local_sync";
    path: string;
    branch: string | null;
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
        fileName.match(/\.(js|ts|jsx|tsx|py|rb|go|rs|java|c|cpp|h|css|html|xml|yaml|yml|toml)$/)
    ) {
        return <FileCode className="w-5 h-5 text-blue-400" />;
    }
    if (mimeType?.startsWith("text/") || fileName.match(/\.(txt|md|markdown)$/)) {
        return <FileText className="w-5 h-5 text-green-400" />;
    }
    return <File className="w-5 h-5 text-stone-400" />;
}

function getLanguageFromFileName(fileName: string): string {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    const langMap: Record<string, string> = {
        js: "JavaScript",
        jsx: "JavaScript (JSX)",
        ts: "TypeScript",
        tsx: "TypeScript (TSX)",
        py: "Python",
        rb: "Ruby",
        go: "Go",
        rs: "Rust",
        java: "Java",
        c: "C",
        cpp: "C++",
        h: "C Header",
        hpp: "C++ Header",
        css: "CSS",
        scss: "SCSS",
        less: "Less",
        html: "HTML",
        htm: "HTML",
        xml: "XML",
        svg: "SVG",
        json: "JSON",
        yaml: "YAML",
        yml: "YAML",
        toml: "TOML",
        md: "Markdown",
        markdown: "Markdown",
        sql: "SQL",
        sh: "Shell",
        bash: "Bash",
        zsh: "Zsh",
        ps1: "PowerShell",
        dockerfile: "Dockerfile",
        makefile: "Makefile",
        txt: "Plain Text",
    };
    return langMap[ext] || ext.toUpperCase() || "Plain Text";
}

function getLanguageColor(fileName: string): string {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    const colors: Record<string, string> = {
        js: "bg-yellow-500",
        jsx: "bg-yellow-500",
        ts: "bg-blue-500",
        tsx: "bg-blue-500",
        py: "bg-green-500",
        rb: "bg-red-500",
        go: "bg-cyan-500",
        rs: "bg-orange-500",
        java: "bg-red-600",
        css: "bg-purple-500",
        scss: "bg-pink-500",
        html: "bg-orange-600",
        json: "bg-yellow-600",
        md: "bg-stone-500",
        sql: "bg-blue-600",
        sh: "bg-green-600",
    };
    return colors[ext] || "bg-stone-600";
}

// Syntax keyword highlighting (basic)
function highlightLine(line: string, language: string): React.ReactNode {
    // Keywords by language
    const keywords: Record<string, string[]> = {
        javascript: ["const", "let", "var", "function", "return", "if", "else", "for", "while", "class", "import", "export", "from", "default", "async", "await", "try", "catch", "throw", "new", "this", "typeof", "instanceof", "null", "undefined", "true", "false"],
        typescript: ["const", "let", "var", "function", "return", "if", "else", "for", "while", "class", "import", "export", "from", "default", "async", "await", "try", "catch", "throw", "new", "this", "typeof", "instanceof", "null", "undefined", "true", "false", "interface", "type", "extends", "implements", "public", "private", "protected", "readonly", "as", "is"],
        python: ["def", "class", "import", "from", "return", "if", "elif", "else", "for", "while", "try", "except", "finally", "with", "as", "lambda", "yield", "pass", "break", "continue", "and", "or", "not", "in", "is", "None", "True", "False", "self"],
        go: ["func", "package", "import", "return", "if", "else", "for", "range", "switch", "case", "default", "struct", "interface", "type", "var", "const", "defer", "go", "chan", "make", "new", "nil", "true", "false"],
        rust: ["fn", "let", "mut", "const", "if", "else", "for", "while", "loop", "match", "impl", "struct", "enum", "trait", "pub", "use", "mod", "self", "super", "crate", "return", "true", "false", "Some", "None", "Ok", "Err"],
    };

    const lang = language.toLowerCase().replace(/\s*\(.*\)/, "");
    const langKeywords = keywords[lang] || keywords.javascript || [];

    // Simple tokenization
    const tokens: React.ReactNode[] = [];
    let remaining = line;
    let key = 0;

    while (remaining.length > 0) {
        // String literals
        const stringMatch = remaining.match(/^(["'`])((?:\\.|(?!\1)[^\\])*)\1/);
        if (stringMatch) {
            tokens.push(
                <span key={key++} className="text-green-400">
                    {stringMatch[0]}
                </span>
            );
            remaining = remaining.slice(stringMatch[0].length);
            continue;
        }

        // Comments
        const commentMatch = remaining.match(/^(\/\/.*|#.*|\/\*[\s\S]*?\*\/)/);
        if (commentMatch) {
            tokens.push(
                <span key={key++} className="text-stone-500 italic">
                    {commentMatch[0]}
                </span>
            );
            remaining = remaining.slice(commentMatch[0].length);
            continue;
        }

        // Numbers
        const numberMatch = remaining.match(/^\b(\d+\.?\d*)\b/);
        if (numberMatch) {
            tokens.push(
                <span key={key++} className="text-amber-400">
                    {numberMatch[0]}
                </span>
            );
            remaining = remaining.slice(numberMatch[0].length);
            continue;
        }

        // Keywords
        const wordMatch = remaining.match(/^\b([a-zA-Z_][a-zA-Z0-9_]*)\b/);
        if (wordMatch) {
            const word = wordMatch[0];
            if (langKeywords.includes(word)) {
                tokens.push(
                    <span key={key++} className="text-purple-400 font-medium">
                        {word}
                    </span>
                );
            } else if (word.match(/^[A-Z][a-zA-Z0-9]*$/)) {
                // Types/Classes (PascalCase)
                tokens.push(
                    <span key={key++} className="text-cyan-400">
                        {word}
                    </span>
                );
            } else {
                tokens.push(<span key={key++}>{word}</span>);
            }
            remaining = remaining.slice(word.length);
            continue;
        }

        // Operators and punctuation
        const opMatch = remaining.match(/^[{}()\[\];:,.<>+\-*/%=!&|?@#^~\\]+/);
        if (opMatch) {
            tokens.push(
                <span key={key++} className="text-stone-400">
                    {opMatch[0]}
                </span>
            );
            remaining = remaining.slice(opMatch[0].length);
            continue;
        }

        // Whitespace and other
        tokens.push(<span key={key++}>{remaining[0]}</span>);
        remaining = remaining.slice(1);
    }

    return tokens;
}

// Code Viewer Component
function CodeViewer({
    content,
    language,
    showLineNumbers,
    wrapLines,
}: {
    content: string;
    language: string;
    showLineNumbers: boolean;
    wrapLines: boolean;
}) {
    const lines = content.split("\n");

    return (
        <div className="relative font-mono text-sm">
            <div className={cn("overflow-x-auto", wrapLines && "overflow-x-hidden")}>
                <table className="w-full">
                    <tbody>
                        {lines.map((line, index) => (
                            <tr
                                key={index}
                                className="hover:bg-stone-800/50 transition-colors"
                            >
                                {showLineNumbers && (
                                    <td className="select-none text-right pr-4 py-0.5 text-stone-600 w-12 align-top sticky left-0 bg-stone-900">
                                        {index + 1}
                                    </td>
                                )}
                                <td
                                    className={cn(
                                        "py-0.5 text-stone-300",
                                        wrapLines ? "whitespace-pre-wrap break-all" : "whitespace-pre"
                                    )}
                                >
                                    {highlightLine(line, language) || " "}
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
export default function CodeFileViewerPage() {
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
    const [showLineNumbers, setShowLineNumbers] = useState(true);
    const [wrapLines, setWrapLines] = useState(false);

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
            const response = await fetch(`/api/files?source_id=${sourceId}&limit=500`);
            const result = await response.json();
            if (result.success && result.data?.files) {
                // Sort by path for consistent navigation
                const sorted = result.data.files.sort((a: FileItem, b: FileItem) =>
                    a.path.localeCompare(b.path)
                );
                setSiblingFiles(sorted);
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
    const nextFile = currentIndex < siblingFiles.length - 1 ? siblingFiles[currentIndex + 1] : null;

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
            const blob = new Blob([file.content], { type: file.mime_type || "text/plain" });
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
                router.push(`/code/${sourceId}/${prevFile.id}`);
            } else if (e.key === "ArrowRight" && nextFile) {
                router.push(`/code/${sourceId}/${nextFile.id}`);
            } else if (e.key === "Escape" && isFullscreen) {
                setIsFullscreen(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [prevFile, nextFile, sourceId, router, isFullscreen]);

    // Language info
    const language = file ? getLanguageFromFileName(file.name) : "Plain Text";
    const lineCount = file?.content?.split("\n").length || 0;

    // GitHub link
    const githubFileUrl = useMemo(() => {
        if (source?.mode === "github" && file) {
            return `https://github.com/${source.path}/blob/${source.branch || "main"}/${file.path}`;
        }
        return null;
    }, [source, file]);

    if (error) {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-400 mb-4">{error}</p>
                    <button
                        onClick={() => router.push(`/code/${sourceId}`)}
                        className="text-stone-400 hover:text-stone-300"
                    >
                        ← Back to files
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={cn("min-h-screen bg-stone-950", isFullscreen && "fixed inset-0 z-50")}>
            {/* Header */}
            <header className="sticky top-0 z-40 bg-stone-950/80 backdrop-blur-sm border-b border-stone-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-14">
                        {/* Back & Breadcrumb */}
                        <div className="flex items-center gap-3 min-w-0">
                            <button
                                onClick={() => router.push(`/code/${sourceId}`)}
                                className="p-2 hover:bg-stone-800 rounded-lg transition-colors shrink-0"
                            >
                                <ArrowLeft className="w-5 h-5 text-stone-400" />
                            </button>

                            {/* Breadcrumb */}
                            <div className="flex items-center gap-2 text-sm min-w-0">
                                <Link href="/code" className="text-stone-500 hover:text-stone-300 shrink-0">
                                    Code
                                </Link>
                                <span className="text-stone-600">/</span>
                                <Link
                                    href={`/code/${sourceId}`}
                                    className="text-stone-500 hover:text-stone-300 truncate max-w-[100px] sm:max-w-[150px]"
                                >
                                    {source?.name || "..."}
                                </Link>
                                <span className="text-stone-600">/</span>
                                <span className="text-stone-100 truncate">{file?.name || "Loading..."}</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                            {/* Line numbers toggle */}
                            <button
                                onClick={() => setShowLineNumbers(!showLineNumbers)}
                                className={cn(
                                    "hidden sm:block p-2 rounded-lg transition-colors",
                                    showLineNumbers
                                        ? "bg-stone-800 text-stone-100"
                                        : "text-stone-500 hover:text-stone-300 hover:bg-stone-800"
                                )}
                                title="Toggle line numbers"
                            >
                                <Hash className="w-4 h-4" />
                            </button>

                            {/* Wrap lines toggle */}
                            <button
                                onClick={() => setWrapLines(!wrapLines)}
                                className={cn(
                                    "hidden sm:block p-2 rounded-lg transition-colors",
                                    wrapLines
                                        ? "bg-stone-800 text-stone-100"
                                        : "text-stone-500 hover:text-stone-300 hover:bg-stone-800"
                                )}
                                title="Toggle line wrap"
                            >
                                <WrapText className="w-4 h-4" />
                            </button>

                            <div className="w-px h-6 bg-stone-800 mx-1 hidden sm:block" />

                            {githubFileUrl && (
                                <a
                                    href={githubFileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 hover:bg-stone-800 rounded-lg transition-colors"
                                    title="View on GitHub"
                                >
                                    <ExternalLink className="w-4 h-4 text-stone-400" />
                                </a>
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
                                title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
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
                                onClick={() => prevFile && router.push(`/code/${sourceId}/${prevFile.id}`)}
                                disabled={!prevFile}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors",
                                    prevFile
                                        ? "text-stone-300 hover:bg-stone-800"
                                        : "text-stone-600 cursor-not-allowed"
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
                                onClick={() => nextFile && router.push(`/code/${sourceId}/${nextFile.id}`)}
                                disabled={!nextFile}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors",
                                    nextFile
                                        ? "text-stone-300 hover:bg-stone-800"
                                        : "text-stone-600 cursor-not-allowed"
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
            <main className={cn("max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6", isFullscreen && "max-w-none")}>
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-pulse flex items-center gap-3">
                            <div className="w-8 h-8 bg-stone-800 rounded" />
                            <div className="h-4 w-32 bg-stone-800 rounded" />
                        </div>
                    </div>
                ) : file ? (
                    <div className="space-y-4">
                        {/* File Info Bar */}
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                            <div className="flex items-center gap-2 text-stone-300">
                                {getFileIcon(file.mime_type, file.name)}
                                <span className="font-medium">{file.path}</span>
                            </div>
                            <div className="flex items-center gap-4 text-stone-500">
                                <span className="flex items-center gap-1">
                                    <span className={cn("w-2 h-2 rounded-full", getLanguageColor(file.name))} />
                                    {language}
                                </span>
                                <span>{lineCount} lines</span>
                                <span className="flex items-center gap-1">
                                    <HardDrive className="w-3 h-3" />
                                    {formatFileSize(file.size)}
                                </span>
                                <span className="hidden sm:flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatDate(file.updated_at)}
                                </span>
                                {source?.branch && (
                                    <span className="hidden sm:flex items-center gap-1">
                                        <GitBranch className="w-3 h-3" />
                                        {source.branch}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Code Content */}
                        <div
                            className={cn(
                                "bg-stone-900 border border-stone-800 rounded-xl overflow-hidden",
                                isFullscreen && "flex-1"
                            )}
                        >
                            <div className="p-4">
                                <CodeViewer
                                    content={file.content || ""}
                                    language={language}
                                    showLineNumbers={showLineNumbers}
                                    wrapLines={wrapLines}
                                />
                            </div>
                        </div>

                        {/* Keyboard shortcut hint */}
                        <div className="flex items-center gap-2 text-xs text-stone-600">
                            <span>Use ← → arrow keys to navigate between files</span>
                        </div>
                    </div>
                ) : null}
            </main>
        </div>
    );
}
