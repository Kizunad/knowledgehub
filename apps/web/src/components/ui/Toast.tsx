"use client";

import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
} from "react";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================
// Types
// ============================================================

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
}

interface ToastContextValue {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, "id">) => string;
    removeToast: (id: string) => void;
    clearToasts: () => void;
    // Shorthand methods
    success: (title: string, message?: string) => string;
    error: (title: string, message?: string) => string;
    warning: (title: string, message?: string) => string;
    info: (title: string, message?: string) => string;
}

// ============================================================
// Context
// ============================================================

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// ============================================================
// Hook
// ============================================================

export function useToast(): ToastContextValue {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}

// ============================================================
// Provider
// ============================================================

interface ToastProviderProps {
    children: React.ReactNode;
    /** Maximum number of toasts to show at once */
    maxToasts?: number;
    /** Default duration in milliseconds */
    defaultDuration?: number;
    /** Position of toasts */
    position?: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center";
}

export function ToastProvider({
    children,
    maxToasts = 5,
    defaultDuration = 5000,
    position = "bottom-right",
}: ToastProviderProps) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    // Add a toast
    const addToast = useCallback(
        (toast: Omit<Toast, "id">) => {
            const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const newToast: Toast = {
                ...toast,
                id,
                duration: toast.duration ?? defaultDuration,
            };

            setToasts((prev) => {
                const updated = [...prev, newToast];
                // Limit number of toasts
                if (updated.length > maxToasts) {
                    return updated.slice(-maxToasts);
                }
                return updated;
            });

            return id;
        },
        [defaultDuration, maxToasts]
    );

    // Remove a toast
    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    // Clear all toasts
    const clearToasts = useCallback(() => {
        setToasts([]);
    }, []);

    // Shorthand methods
    const success = useCallback(
        (title: string, message?: string) =>
            addToast({ type: "success", title, message }),
        [addToast]
    );

    const error = useCallback(
        (title: string, message?: string) =>
            addToast({ type: "error", title, message, duration: 8000 }),
        [addToast]
    );

    const warning = useCallback(
        (title: string, message?: string) =>
            addToast({ type: "warning", title, message }),
        [addToast]
    );

    const info = useCallback(
        (title: string, message?: string) =>
            addToast({ type: "info", title, message }),
        [addToast]
    );

    // Position classes
    const positionClasses: Record<string, string> = {
        "top-right": "top-4 right-4",
        "top-left": "top-4 left-4",
        "bottom-right": "bottom-4 right-4",
        "bottom-left": "bottom-4 left-4",
        "top-center": "top-4 left-1/2 -translate-x-1/2",
        "bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
    };

    return (
        <ToastContext.Provider
            value={{
                toasts,
                addToast,
                removeToast,
                clearToasts,
                success,
                error,
                warning,
                info,
            }}
        >
            {children}

            {/* Toast Container */}
            <div
                className={cn(
                    "fixed z-[100] flex flex-col gap-2 pointer-events-none",
                    positionClasses[position]
                )}
                aria-live="polite"
                aria-label="通知"
            >
                {toasts.map((toast) => (
                    <ToastItem
                        key={toast.id}
                        toast={toast}
                        onClose={() => removeToast(toast.id)}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

// ============================================================
// Toast Item Component
// ============================================================

interface ToastItemProps {
    toast: Toast;
    onClose: () => void;
}

function ToastItem({ toast, onClose }: ToastItemProps) {
    const [isLeaving, setIsLeaving] = useState(false);

    // Auto dismiss
    useEffect(() => {
        if (toast.duration && toast.duration > 0) {
            const timer = setTimeout(() => {
                setIsLeaving(true);
            }, toast.duration);

            return () => clearTimeout(timer);
        }
    }, [toast.duration]);

    // Handle animation end
    useEffect(() => {
        if (isLeaving) {
            const timer = setTimeout(onClose, 200);
            return () => clearTimeout(timer);
        }
    }, [isLeaving, onClose]);

    // Icon and colors based on type
    const config: Record<
        ToastType,
        {
            icon: typeof CheckCircle;
            iconClass: string;
            bgClass: string;
            borderClass: string;
        }
    > = {
        success: {
            icon: CheckCircle,
            iconClass: "text-green-500",
            bgClass: "bg-green-500/10",
            borderClass: "border-green-500/20",
        },
        error: {
            icon: AlertCircle,
            iconClass: "text-destructive",
            bgClass: "bg-destructive/10",
            borderClass: "border-destructive/20",
        },
        warning: {
            icon: AlertTriangle,
            iconClass: "text-yellow-500",
            bgClass: "bg-yellow-500/10",
            borderClass: "border-yellow-500/20",
        },
        info: {
            icon: Info,
            iconClass: "text-blue-500",
            bgClass: "bg-blue-500/10",
            borderClass: "border-blue-500/20",
        },
    };

    const { icon: Icon, iconClass, bgClass, borderClass } = config[toast.type];

    return (
        <div
            className={cn(
                "pointer-events-auto w-80 max-w-[calc(100vw-2rem)] rounded-lg border shadow-lg",
                "bg-popover text-popover-foreground",
                borderClass,
                isLeaving
                    ? "animate-[slideOut_0.2s_ease-in_forwards]"
                    : "animate-[slideIn_0.2s_ease-out]"
            )}
            role="alert"
        >
            <div className="flex items-start gap-3 p-4">
                {/* Icon */}
                <div
                    className={cn(
                        "flex-shrink-0 p-1 rounded-full",
                        bgClass
                    )}
                >
                    <Icon className={cn("h-4 w-4", iconClass)} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                        {toast.title}
                    </p>
                    {toast.message && (
                        <p className="mt-1 text-sm text-muted-foreground">
                            {toast.message}
                        </p>
                    )}
                    {toast.action && (
                        <button
                            onClick={() => {
                                toast.action?.onClick();
                                onClose();
                            }}
                            className="mt-2 text-sm font-medium text-primary hover:underline"
                        >
                            {toast.action.label}
                        </button>
                    )}
                </div>

                {/* Close Button */}
                <button
                    onClick={() => setIsLeaving(true)}
                    className="flex-shrink-0 p-1 rounded-md hover:bg-accent transition-colors"
                    aria-label="关闭通知"
                >
                    <X className="h-4 w-4 text-muted-foreground" />
                </button>
            </div>

            {/* Progress Bar (for auto-dismiss) */}
            {toast.duration && toast.duration > 0 && !isLeaving && (
                <div className="h-1 w-full bg-muted overflow-hidden rounded-b-lg">
                    <div
                        className={cn(
                            "h-full",
                            toast.type === "success" && "bg-green-500",
                            toast.type === "error" && "bg-destructive",
                            toast.type === "warning" && "bg-yellow-500",
                            toast.type === "info" && "bg-blue-500"
                        )}
                        style={{
                            animation: `shrink ${toast.duration}ms linear forwards`,
                        }}
                    />
                </div>
            )}

            <style jsx>{`
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateX(100%);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                @keyframes slideOut {
                    from {
                        opacity: 1;
                        transform: translateX(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateX(100%);
                    }
                }
                @keyframes shrink {
                    from {
                        width: 100%;
                    }
                    to {
                        width: 0%;
                    }
                }
            `}</style>
        </div>
    );
}

// ============================================================
// Standalone Toast Function (for use outside React)
// ============================================================

let toastFn: ToastContextValue | null = null;

export function setToastContext(context: ToastContextValue) {
    toastFn = context;
}

export const toast = {
    success: (title: string, message?: string) => toastFn?.success(title, message),
    error: (title: string, message?: string) => toastFn?.error(title, message),
    warning: (title: string, message?: string) => toastFn?.warning(title, message),
    info: (title: string, message?: string) => toastFn?.info(title, message),
};
