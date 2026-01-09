"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Home,
    BookOpen,
    Code,
    MessageSquare,
    Lightbulb,
    Search,
    Menu,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    ThemeToggle,
    ThemeDropdown,
} from "@/components/providers/ThemeProvider";

interface SidebarProps {
    onSearchClick?: () => void;
}

export function Sidebar({ onSearchClick }: SidebarProps) {
    const pathname = usePathname();
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileOpen(false);
    }, [pathname]);

    // Close mobile menu on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setIsMobileOpen(false);
            }
        };

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, []);

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (isMobileOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }

        return () => {
            document.body.style.overflow = "";
        };
    }, [isMobileOpen]);

    const navItems = [
        { name: "Home", href: "/", icon: Home },
        { name: "Study", href: "/study", icon: BookOpen, color: "text-study" },
        { name: "Code", href: "/code", icon: Code, color: "text-code" },
        {
            name: "ChatLog",
            href: "/chat",
            icon: MessageSquare,
            color: "text-chat",
        },
        { name: "Ideas", href: "/ideas", icon: Lightbulb, color: "text-ideas" },
    ];

    const SidebarContent = () => (
        <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="flex h-16 items-center justify-between gap-2 border-b border-border px-6">
                <Link href="/" className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
                        H
                    </div>
                    <span className="text-lg font-semibold tracking-tight">
                        Hub
                    </span>
                </Link>
                {/* Mobile close button */}
                <button
                    onClick={() => setIsMobileOpen(false)}
                    className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
                    aria-label="关闭菜单"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 p-4">
                {navItems.map((item) => {
                    const isActive =
                        pathname === item.href ||
                        (item.href !== "/" && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn("nav-item", isActive && "active")}
                        >
                            <item.icon className={cn("h-5 w-5", item.color)} />
                            <span>{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Section: Theme Toggle & Search */}
            <div className="border-t border-border p-4 space-y-2">
                {/* Theme Toggle */}
                <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm text-muted-foreground">主题</span>
                    <ThemeDropdown />
                </div>

                {/* Search */}
                <button
                    onClick={() => {
                        setIsMobileOpen(false);
                        onSearchClick?.();
                    }}
                    className="nav-item w-full group"
                >
                    <Search className="h-5 w-5 group-hover:text-primary transition-colors" />
                    <span>全局搜索</span>
                    <kbd className="ml-auto text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border hidden sm:inline-block">
                        ⌘K
                    </kbd>
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile Header */}
            <header className="mobile-header fixed top-0 left-0 right-0 z-30 h-16 items-center justify-between border-b border-border bg-background/95 backdrop-blur px-4 md:hidden">
                <button
                    onClick={() => setIsMobileOpen(true)}
                    className="p-2 rounded-lg hover:bg-accent transition-colors"
                    aria-label="打开菜单"
                >
                    <Menu className="h-5 w-5" />
                </button>

                <Link href="/" className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                        H
                    </div>
                    <span className="font-semibold">Hub</span>
                </Link>

                <div className="flex items-center gap-1">
                    <ThemeToggle />
                    <button
                        onClick={() => {
                            onSearchClick?.();
                        }}
                        className="p-2 rounded-lg hover:bg-accent transition-colors"
                        aria-label="搜索"
                    >
                        <Search className="h-5 w-5" />
                    </button>
                </div>
            </header>

            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="mobile-nav-overlay md:hidden"
                    onClick={() => setIsMobileOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Mobile Sidebar */}
            {isMobileOpen && (
                <aside className="mobile-sidebar md:hidden">
                    <SidebarContent />
                </aside>
            )}

            {/* Desktop Sidebar */}
            <aside className="desktop-sidebar fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card hidden md:block">
                <SidebarContent />
            </aside>
        </>
    );
}
