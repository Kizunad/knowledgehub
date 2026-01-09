"use client";

import { Sidebar } from "./Sidebar";
import {
    CommandPalette,
    useCommandPalette,
} from "@/components/ui/CommandPalette";
import { AuthModal, useAuthModal } from "@/components/ui/AuthModal";
import { UserMenu } from "@/components/ui/UserMenu";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { Search } from "lucide-react";

interface AppShellProps {
    children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    const commandPalette = useCommandPalette();
    const authModal = useAuthModal();

    return (
        <div className="flex min-h-screen">
            {/* Sidebar */}
            <Sidebar onSearchClick={commandPalette.open} />

            {/* Main Content */}
            <main className="main-content flex-1 md:ml-64">
                {/* Header */}
                <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/95 backdrop-blur px-4 md:px-8 mt-16 md:mt-0">
                    <div className="flex-1">
                        {/* Page title can be passed via context or props */}
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Search Button (Desktop) */}
                        <button
                            onClick={commandPalette.open}
                            className="hidden md:inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        >
                            <Search className="h-4 w-4" />
                            <span>搜索...</span>
                            <kbd className="text-xs bg-muted px-1.5 py-0.5 rounded border border-border">
                                ⌘K
                            </kbd>
                        </button>

                        {/* User Menu */}
                        <UserMenu onLoginClick={authModal.open} />
                    </div>
                </header>

                {/* Page Content with Error Boundary */}
                <ErrorBoundary level="page">
                    <div className="p-4 md:p-8">{children}</div>
                </ErrorBoundary>
            </main>

            {/* Modals */}
            <CommandPalette
                isOpen={commandPalette.isOpen}
                onClose={commandPalette.close}
            />
            <AuthModal isOpen={authModal.isOpen} onClose={authModal.close} />
        </div>
    );
}
