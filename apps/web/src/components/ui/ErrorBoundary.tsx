"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, Bug, ChevronDown, ChevronUp } from "lucide-react";

// ============================================================
// Types
// ============================================================

interface ErrorBoundaryProps {
    children: ReactNode;
    /** Custom fallback component */
    fallback?: ReactNode;
    /** Called when an error is caught */
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    /** Show reset button */
    showReset?: boolean;
    /** Custom reset handler */
    onReset?: () => void;
    /** Error boundary level for styling */
    level?: "page" | "section" | "component";
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
    showDetails: boolean;
}

// ============================================================
// Error Boundary Class Component
// ============================================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            showDetails: false,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        this.setState({ errorInfo });

        // Log error to console in development
        if (process.env.NODE_ENV === "development") {
            console.error("Error Boundary caught an error:", error, errorInfo);
        }

        // Call optional error handler
        this.props.onError?.(error, errorInfo);
    }

    handleReset = (): void => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
            showDetails: false,
        });
        this.props.onReset?.();
    };

    toggleDetails = (): void => {
        this.setState((prev) => ({ showDetails: !prev.showDetails }));
    };

    render(): ReactNode {
        if (this.state.hasError) {
            // Custom fallback
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default error UI based on level
            const { level = "page" } = this.props;

            return (
                <ErrorFallback
                    error={this.state.error}
                    errorInfo={this.state.errorInfo}
                    level={level}
                    showReset={this.props.showReset !== false}
                    onReset={this.handleReset}
                    showDetails={this.state.showDetails}
                    onToggleDetails={this.toggleDetails}
                />
            );
        }

        return this.props.children;
    }
}

// ============================================================
// Error Fallback Component
// ============================================================

interface ErrorFallbackProps {
    error: Error | null;
    errorInfo: ErrorInfo | null;
    level: "page" | "section" | "component";
    showReset: boolean;
    onReset: () => void;
    showDetails: boolean;
    onToggleDetails: () => void;
}

function ErrorFallback({
    error,
    errorInfo,
    level,
    showReset,
    onReset,
    showDetails,
    onToggleDetails,
}: ErrorFallbackProps) {
    const isPage = level === "page";
    const isSection = level === "section";

    const containerClasses = isPage
        ? "min-h-[60vh] flex items-center justify-center p-6"
        : isSection
          ? "p-6 rounded-lg border border-border bg-card"
          : "p-4 rounded-md border border-border bg-card";

    const iconSize = isPage ? "h-12 w-12" : isSection ? "h-8 w-8" : "h-6 w-6";
    const titleSize = isPage ? "text-2xl" : isSection ? "text-lg" : "text-base";
    const descSize = isPage ? "text-base" : "text-sm";

    return (
        <div className={containerClasses}>
            <div className={`${isPage ? "max-w-md text-center" : ""} space-y-4`}>
                {/* Icon */}
                <div
                    className={`${isPage ? "mx-auto" : ""} flex items-center justify-center ${iconSize} rounded-full bg-destructive/10 text-destructive`}
                >
                    <AlertTriangle className={isPage ? "h-6 w-6" : "h-4 w-4"} />
                </div>

                {/* Title & Description */}
                <div className="space-y-2">
                    <h3 className={`font-semibold text-foreground ${titleSize}`}>
                        {isPage ? "出错了" : "加载失败"}
                    </h3>
                    <p className={`text-muted-foreground ${descSize}`}>
                        {isPage
                            ? "页面遇到了一些问题，请尝试刷新页面或返回首页。"
                            : "此部分加载失败，请尝试重新加载。"}
                    </p>
                </div>

                {/* Actions */}
                <div
                    className={`flex ${isPage ? "justify-center" : ""} gap-2 flex-wrap`}
                >
                    {showReset && (
                        <button
                            onClick={onReset}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                        >
                            <RefreshCw className="h-4 w-4" />
                            重试
                        </button>
                    )}

                    {isPage && (
                        <a
                            href="/"
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                        >
                            <Home className="h-4 w-4" />
                            返回首页
                        </a>
                    )}

                    {process.env.NODE_ENV === "development" && error && (
                        <button
                            onClick={onToggleDetails}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-accent transition-colors"
                        >
                            <Bug className="h-4 w-4" />
                            详情
                            {showDetails ? (
                                <ChevronUp className="h-3 w-3" />
                            ) : (
                                <ChevronDown className="h-3 w-3" />
                            )}
                        </button>
                    )}
                </div>

                {/* Error Details (Development Only) */}
                {process.env.NODE_ENV === "development" &&
                    showDetails &&
                    error && (
                        <div className="mt-4 p-4 rounded-md bg-muted text-left overflow-auto max-h-60">
                            <p className="font-mono text-sm text-destructive mb-2">
                                {error.name}: {error.message}
                            </p>
                            {errorInfo?.componentStack && (
                                <pre className="font-mono text-xs text-muted-foreground whitespace-pre-wrap">
                                    {errorInfo.componentStack}
                                </pre>
                            )}
                        </div>
                    )}
            </div>
        </div>
    );
}

// ============================================================
// Functional Error Display Components
// ============================================================

interface ErrorMessageProps {
    title?: string;
    message?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

/** Simple inline error message */
export function ErrorMessage({
    title = "出错了",
    message = "请稍后重试",
    action,
    className = "",
}: ErrorMessageProps) {
    return (
        <div
            className={`flex items-center gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5 ${className}`}
        >
            <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{title}</p>
                <p className="text-sm text-muted-foreground">{message}</p>
            </div>
            {action && (
                <button
                    onClick={action.onClick}
                    className="flex-shrink-0 text-sm font-medium text-primary hover:underline"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
}

/** Empty state with optional action */
export function EmptyState({
    icon: Icon = AlertTriangle,
    title = "暂无数据",
    description,
    action,
    className = "",
}: {
    icon?: React.ComponentType<{ className?: string }>;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}) {
    return (
        <div
            className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
        >
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Icon className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">{title}</h3>
            {description && (
                <p className="text-sm text-muted-foreground max-w-sm mb-4">
                    {description}
                </p>
            )}
            {action && (
                <button
                    onClick={action.onClick}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
}

/** Network error state */
export function NetworkError({ onRetry }: { onRetry?: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <svg
                    className="h-6 w-6 text-destructive"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
                    />
                </svg>
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">网络连接失败</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-4">
                请检查您的网络连接后重试
            </p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                    <RefreshCw className="h-4 w-4" />
                    重试
                </button>
            )}
        </div>
    );
}

/** 404 Not Found state */
export function NotFound({
    title = "页面不存在",
    description = "您访问的页面可能已被删除或移动",
}: {
    title?: string;
    description?: string;
}) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
            <div className="text-8xl font-bold text-muted-foreground/20 mb-4">
                404
            </div>
            <h1 className="text-2xl font-semibold text-foreground mb-2">{title}</h1>
            <p className="text-muted-foreground max-w-md mb-6">{description}</p>
            <a
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
                <Home className="h-4 w-4" />
                返回首页
            </a>
        </div>
    );
}
