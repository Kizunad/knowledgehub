"use client";

import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
} from "react";
import { Moon, Sun, Monitor } from "lucide-react";

// ============================================================
// Types
// ============================================================

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
    theme: Theme;
    resolvedTheme: "light" | "dark";
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

// ============================================================
// Context
// ============================================================

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// ============================================================
// Hook
// ============================================================

export function useTheme(): ThemeContextValue {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}

// ============================================================
// Provider
// ============================================================

interface ThemeProviderProps {
    children: React.ReactNode;
    defaultTheme?: Theme;
    storageKey?: string;
}

export function ThemeProvider({
    children,
    defaultTheme = "system",
    storageKey = "hub-theme",
}: ThemeProviderProps) {
    const [theme, setThemeState] = useState<Theme>(defaultTheme);
    const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(
        "dark",
    );
    const [mounted, setMounted] = useState(false);

    // Get system preference
    const getSystemTheme = useCallback((): "light" | "dark" => {
        if (typeof window === "undefined") return "dark";
        return window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
    }, []);

    // Resolve theme based on setting
    const resolveTheme = useCallback(
        (t: Theme): "light" | "dark" => {
            return t === "system" ? getSystemTheme() : t;
        },
        [getSystemTheme],
    );

    // Apply theme to document
    const applyTheme = useCallback((resolved: "light" | "dark") => {
        const root = document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(resolved);

        // Update meta theme-color
        const metaThemeColor = document.querySelector(
            'meta[name="theme-color"]',
        );
        if (metaThemeColor) {
            metaThemeColor.setAttribute(
                "content",
                resolved === "dark" ? "#0c0a09" : "#ffffff",
            );
        }
    }, []);

    // Initialize theme from storage
    useEffect(() => {
        const stored = localStorage.getItem(storageKey) as Theme | null;
        const initialTheme = stored || defaultTheme;
        setThemeState(initialTheme);
        const resolved = resolveTheme(initialTheme);
        setResolvedTheme(resolved);
        applyTheme(resolved);
        setMounted(true);
    }, [storageKey, defaultTheme, resolveTheme, applyTheme]);

    // Listen for system theme changes
    useEffect(() => {
        if (!mounted) return;

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

        const handleChange = () => {
            if (theme === "system") {
                const resolved = getSystemTheme();
                setResolvedTheme(resolved);
                applyTheme(resolved);
            }
        };

        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, [mounted, theme, getSystemTheme, applyTheme]);

    // Set theme
    const setTheme = useCallback(
        (newTheme: Theme) => {
            setThemeState(newTheme);
            localStorage.setItem(storageKey, newTheme);
            const resolved = resolveTheme(newTheme);
            setResolvedTheme(resolved);
            applyTheme(resolved);
        },
        [storageKey, resolveTheme, applyTheme],
    );

    // Toggle between light/dark (skips system)
    const toggleTheme = useCallback(() => {
        const newTheme = resolvedTheme === "dark" ? "light" : "dark";
        setTheme(newTheme);
    }, [resolvedTheme, setTheme]);

    // Prevent hydration mismatch
    if (!mounted) {
        return (
            <ThemeContext.Provider
                value={{
                    theme: defaultTheme,
                    resolvedTheme: "dark",
                    setTheme: () => {},
                    toggleTheme: () => {},
                }}
            >
                {children}
            </ThemeContext.Provider>
        );
    }

    return (
        <ThemeContext.Provider
            value={{ theme, resolvedTheme, setTheme, toggleTheme }}
        >
            {children}
        </ThemeContext.Provider>
    );
}

// ============================================================
// Theme Toggle Button
// ============================================================

interface ThemeToggleProps {
    className?: string;
    showLabel?: boolean;
}

export function ThemeToggle({
    className = "",
    showLabel = false,
}: ThemeToggleProps) {
    const { resolvedTheme, toggleTheme } = useTheme();

    const Icon = resolvedTheme === "dark" ? Moon : Sun;
    const label = resolvedTheme === "dark" ? "深色模式" : "浅色模式";

    return (
        <button
            onClick={toggleTheme}
            className={`inline-flex items-center gap-2 p-2 rounded-md hover:bg-accent transition-colors ${className}`}
            title={`切换到${resolvedTheme === "dark" ? "浅色" : "深色"}模式`}
            aria-label={`当前: ${label}, 点击切换`}
        >
            <Icon className="h-5 w-5 text-muted-foreground" />
            {showLabel && (
                <span className="text-sm text-muted-foreground">{label}</span>
            )}
        </button>
    );
}

// ============================================================
// Theme Selector (with System option)
// ============================================================

interface ThemeSelectorProps {
    className?: string;
}

export function ThemeSelector({ className = "" }: ThemeSelectorProps) {
    const { theme, setTheme } = useTheme();

    const options: { value: Theme; label: string; icon: typeof Sun }[] = [
        { value: "light", label: "浅色", icon: Sun },
        { value: "dark", label: "深色", icon: Moon },
        { value: "system", label: "跟随系统", icon: Monitor },
    ];

    return (
        <div
            className={`flex items-center gap-1 p-1 rounded-lg bg-muted ${className}`}
        >
            {options.map(({ value, label, icon: Icon }) => (
                <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        theme === value
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                    title={label}
                >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{label}</span>
                </button>
            ))}
        </div>
    );
}

// ============================================================
// Theme Dropdown (for compact spaces)
// ============================================================

interface ThemeDropdownProps {
    className?: string;
}

export function ThemeDropdown({ className = "" }: ThemeDropdownProps) {
    const { theme, resolvedTheme, setTheme } = useTheme();
    const [open, setOpen] = useState(false);

    const Icon = resolvedTheme === "dark" ? Moon : Sun;

    const options: { value: Theme; label: string; icon: typeof Sun }[] = [
        { value: "light", label: "浅色模式", icon: Sun },
        { value: "dark", label: "深色模式", icon: Moon },
        { value: "system", label: "跟随系统", icon: Monitor },
    ];

    return (
        <div className={`relative ${className}`}>
            <button
                onClick={() => setOpen(!open)}
                className="inline-flex items-center gap-2 p-2 rounded-md hover:bg-accent transition-colors"
                aria-label="选择主题"
            >
                <Icon className="h-5 w-5 text-muted-foreground" />
            </button>

            {open && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setOpen(false)}
                    />

                    {/* Dropdown */}
                    <div className="absolute right-0 top-full mt-2 z-50 w-40 rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
                        {options.map(({ value, label, icon: OptionIcon }) => (
                            <button
                                key={value}
                                onClick={() => {
                                    setTheme(value);
                                    setOpen(false);
                                }}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                                    theme === value
                                        ? "bg-accent text-foreground"
                                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                }`}
                            >
                                <OptionIcon className="h-4 w-4" />
                                {label}
                                {theme === value && (
                                    <svg
                                        className="h-4 w-4 ml-auto"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
