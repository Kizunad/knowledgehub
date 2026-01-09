"use client";

import { cn } from "@/lib/utils";

// ============================================================
// Base Skeleton Component
// ============================================================

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Animation type */
    animation?: "pulse" | "shimmer" | "none";
}

export function Skeleton({
    className,
    animation = "pulse",
    ...props
}: SkeletonProps) {
    return (
        <div
            className={cn(
                "rounded-md bg-muted",
                animation === "pulse" && "animate-pulse",
                animation === "shimmer" &&
                    "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
                className
            )}
            {...props}
        />
    );
}

// ============================================================
// Preset Skeleton Components
// ============================================================

/** Text line skeleton */
export function SkeletonText({
    lines = 1,
    className,
}: {
    lines?: number;
    className?: string;
}) {
    return (
        <div className={cn("space-y-2", className)}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    className={cn(
                        "h-4",
                        i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"
                    )}
                />
            ))}
        </div>
    );
}

/** Avatar/Icon skeleton */
export function SkeletonAvatar({
    size = "md",
    className,
}: {
    size?: "sm" | "md" | "lg" | "xl";
    className?: string;
}) {
    const sizeClasses = {
        sm: "h-8 w-8",
        md: "h-10 w-10",
        lg: "h-12 w-12",
        xl: "h-16 w-16",
    };

    return (
        <Skeleton
            className={cn("rounded-full", sizeClasses[size], className)}
        />
    );
}

/** Button skeleton */
export function SkeletonButton({
    size = "md",
    className,
}: {
    size?: "sm" | "md" | "lg";
    className?: string;
}) {
    const sizeClasses = {
        sm: "h-8 w-20",
        md: "h-10 w-24",
        lg: "h-12 w-32",
    };

    return (
        <Skeleton
            className={cn("rounded-md", sizeClasses[size], className)}
        />
    );
}

/** Card skeleton */
export function SkeletonCard({ className }: { className?: string }) {
    return (
        <div
            className={cn(
                "rounded-lg border border-border bg-card p-4 space-y-4",
                className
            )}
        >
            <div className="flex items-center gap-3">
                <SkeletonAvatar size="md" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                </div>
            </div>
            <SkeletonText lines={3} />
            <div className="flex gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
            </div>
        </div>
    );
}

/** List item skeleton */
export function SkeletonListItem({ className }: { className?: string }) {
    return (
        <div
            className={cn(
                "flex items-center gap-3 p-3 rounded-lg",
                className
            )}
        >
            <Skeleton className="h-5 w-5 rounded" />
            <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-4 w-12" />
        </div>
    );
}

/** Table row skeleton */
export function SkeletonTableRow({
    columns = 4,
    className,
}: {
    columns?: number;
    className?: string;
}) {
    return (
        <div className={cn("flex items-center gap-4 py-3 px-4", className)}>
            {Array.from({ length: columns }).map((_, i) => (
                <Skeleton
                    key={i}
                    className={cn(
                        "h-4",
                        i === 0 ? "w-1/4" : i === columns - 1 ? "w-16" : "flex-1"
                    )}
                />
            ))}
        </div>
    );
}

// ============================================================
// Page-Specific Skeleton Components
// ============================================================

/** Ideas page skeleton */
export function SkeletonIdeasPage() {
    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-10 w-28 rounded-md" />
            </div>

            {/* Quick Capture */}
            <Skeleton className="h-12 w-full rounded-lg" />

            {/* Tabs */}
            <div className="flex gap-2">
                <Skeleton className="h-9 w-20 rounded-md" />
                <Skeleton className="h-9 w-20 rounded-md" />
                <Skeleton className="h-9 w-20 rounded-md" />
            </div>

            {/* Ideas List */}
            <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonListItem key={i} />
                ))}
            </div>
        </div>
    );
}

/** Study page skeleton */
export function SkeletonStudyPage() {
    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-40" />
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-10 rounded-md" />
                    <Skeleton className="h-10 w-28 rounded-md" />
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonCard key={i} />
                ))}
            </div>
        </div>
    );
}

/** Code page skeleton */
export function SkeletonCodePage() {
    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-36" />
                <Skeleton className="h-10 w-32 rounded-md" />
            </div>

            {/* Pinned */}
            <div className="space-y-3">
                <Skeleton className="h-5 w-24" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton
                            key={i}
                            className="h-24 rounded-lg"
                        />
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="border border-border rounded-lg">
                <div className="border-b border-border px-4 py-3">
                    <Skeleton className="h-4 w-32" />
                </div>
                {Array.from({ length: 8 }).map((_, i) => (
                    <SkeletonTableRow key={i} columns={5} />
                ))}
            </div>
        </div>
    );
}

/** Chat page skeleton */
export function SkeletonChatPage() {
    return (
        <div className="flex h-full">
            {/* Sidebar */}
            <div className="w-80 border-r border-border p-4 space-y-4 hidden md:block">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                </div>
                <Skeleton className="h-10 w-full rounded-md" />
                <div className="space-y-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-2">
                            <SkeletonAvatar size="sm" />
                            <div className="flex-1 space-y-1">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="border-b border-border p-4 flex items-center gap-3">
                    <SkeletonAvatar size="md" />
                    <div className="space-y-1">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 p-4 space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div
                            key={i}
                            className={cn(
                                "flex gap-3",
                                i % 2 === 1 && "flex-row-reverse"
                            )}
                        >
                            <SkeletonAvatar size="sm" />
                            <Skeleton
                                className={cn(
                                    "h-20 rounded-lg",
                                    i % 2 === 0 ? "w-2/3" : "w-1/2"
                                )}
                            />
                        </div>
                    ))}
                </div>

                {/* Input */}
                <div className="border-t border-border p-4">
                    <Skeleton className="h-12 w-full rounded-lg" />
                </div>
            </div>
        </div>
    );
}

/** Home page skeleton */
export function SkeletonHomePage() {
    return (
        <div className="space-y-6 p-6">
            {/* Welcome */}
            <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-5 w-64" />
            </div>

            {/* Quick Capture */}
            <Skeleton className="h-14 w-full rounded-lg" />

            {/* Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Ideas Inbox */}
                <div className="space-y-3">
                    <Skeleton className="h-6 w-32" />
                    <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <SkeletonListItem key={i} />
                        ))}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="space-y-3">
                    <Skeleton className="h-6 w-36" />
                    <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <SkeletonListItem key={i} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Pinned Projects */}
            <div className="space-y-3">
                <Skeleton className="h-6 w-40" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-28 rounded-lg" />
                    ))}
                </div>
            </div>
        </div>
    );
}

// ============================================================
// Loading Spinner
// ============================================================

export function Spinner({
    size = "md",
    className,
}: {
    size?: "sm" | "md" | "lg";
    className?: string;
}) {
    const sizeClasses = {
        sm: "h-4 w-4",
        md: "h-6 w-6",
        lg: "h-8 w-8",
    };

    return (
        <svg
            className={cn(
                "animate-spin text-muted-foreground",
                sizeClasses[size],
                className
            )}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
        >
            <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
            />
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
        </svg>
    );
}

/** Full page loading state */
export function LoadingPage({ message = "加载中..." }: { message?: string }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
            <Spinner size="lg" />
            <p className="text-muted-foreground text-sm">{message}</p>
        </div>
    );
}

/** Inline loading state */
export function LoadingInline({
    message = "加载中...",
    className,
}: {
    message?: string;
    className?: string;
}) {
    return (
        <div className={cn("flex items-center gap-2", className)}>
            <Spinner size="sm" />
            <span className="text-muted-foreground text-sm">{message}</span>
        </div>
    );
}
