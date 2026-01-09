"use client";

import { useState, useRef, useEffect } from "react";
import { User, LogOut, Settings, ChevronDown } from "lucide-react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuthStore, useUser, useIsAuthenticated } from "@/store/authStore";

interface UserMenuProps {
    onLoginClick: () => void;
}

export function UserMenu({ onLoginClick }: UserMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const user = useUser();
    const isAuthenticated = useIsAuthenticated();
    const { reset } = useAuthStore();

    const supabaseConfigured = isSupabaseConfigured();
    const supabase = supabaseConfigured ? getSupabaseClient() : null;

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = async () => {
        try {
            if (supabase) {
                await supabase.auth.signOut();
            }
            reset();
            setIsOpen(false);
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    // Get user display name or email
    const displayName =
        user?.user_metadata?.name || user?.email?.split("@")[0] || "用户";

    const avatarUrl = user?.user_metadata?.avatar_url;

    if (!isAuthenticated) {
        return (
            <button
                onClick={onLoginClick}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
                <User className="h-4 w-4" />
                <span>登录</span>
            </button>
        );
    }

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
                {avatarUrl ? (
                    <img
                        src={avatarUrl}
                        alt={displayName}
                        className="h-6 w-6 rounded-full"
                    />
                ) : (
                    <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        {displayName.charAt(0).toUpperCase()}
                    </div>
                )}
                <span className="hidden sm:inline max-w-[100px] truncate">
                    {displayName}
                </span>
                <ChevronDown
                    className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-card shadow-lg z-50 animate-fade-in">
                    {/* User Info */}
                    <div className="p-3 border-b border-border">
                        <p className="text-sm font-medium truncate">
                            {displayName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                            {user?.email}
                        </p>
                    </div>

                    {/* Menu Items */}
                    <div className="p-1">
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                // TODO: Navigate to settings
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                        >
                            <Settings className="h-4 w-4" />
                            <span>设置</span>
                        </button>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors text-destructive"
                        >
                            <LogOut className="h-4 w-4" />
                            <span>退出登录</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
