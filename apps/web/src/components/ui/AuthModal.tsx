"use client";

import { useState } from "react";
import {
    X,
    Mail,
    Lock,
    User,
    Loader2,
    Github,
    AlertTriangle,
} from "lucide-react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

type AuthMode = "login" | "signup" | "forgot";

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
    const [mode, setMode] = useState<AuthMode>("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const supabaseConfigured = isSupabaseConfigured();
    const supabase = supabaseConfigured ? getSupabaseClient() : null;

    const resetForm = () => {
        setEmail("");
        setPassword("");
        setName("");
        setError(null);
        setMessage(null);
    };

    const handleClose = () => {
        resetForm();
        setMode("login");
        onClose();
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) {
            setError("Supabase 未配置，请先配置环境变量");
            return;
        }
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setError(error.message);
            } else {
                onSuccess?.();
                handleClose();
            }
        } catch (err) {
            setError("登录失败，请重试");
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) {
            setError("Supabase 未配置，请先配置环境变量");
            return;
        }
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name: name || undefined,
                    },
                },
            });

            if (error) {
                setError(error.message);
            } else {
                setMessage("注册成功！请检查邮箱确认账户。");
                setMode("login");
            }
        } catch (err) {
            setError("注册失败，请重试");
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) {
            setError("Supabase 未配置，请先配置环境变量");
            return;
        }
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/reset-password`,
            });

            if (error) {
                setError(error.message);
            } else {
                setMessage("重置链接已发送到您的邮箱！");
            }
        } catch (err) {
            setError("发送失败，请重试");
        } finally {
            setLoading(false);
        }
    };

    const handleGithubLogin = async () => {
        if (!supabase) {
            setError("Supabase 未配置，请先配置环境变量");
            return;
        }
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "github",
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (error) {
                setError(error.message);
            }
        } catch (err) {
            setError("GitHub 登录失败，请重试");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="auth-modal-overlay" onClick={handleClose}>
            <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
                {/* Supabase Not Configured Warning */}
                {!supabaseConfigured && (
                    <div className="mb-4 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-medium">Supabase 未配置</p>
                                <p className="mt-1 text-yellow-500/80">
                                    请在{" "}
                                    <code className="bg-yellow-500/20 px-1 rounded">
                                        apps/web/.env.local
                                    </code>{" "}
                                    中配置 Supabase 环境变量后重启服务器。
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold">
                            {mode === "login" && "欢迎回来"}
                            {mode === "signup" && "创建账户"}
                            {mode === "forgot" && "重置密码"}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            {mode === "login" && "登录您的 Hub 账户"}
                            {mode === "signup" && "加入 Hub，开始管理您的知识"}
                            {mode === "forgot" && "输入邮箱以重置密码"}
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-lg hover:bg-accent transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Error/Success Messages */}
                {error && (
                    <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                        {error}
                    </div>
                )}
                {message && (
                    <div className="mb-4 p-3 rounded-lg bg-code/10 border border-code/20 text-code text-sm">
                        {message}
                    </div>
                )}

                {/* Form */}
                <form
                    onSubmit={
                        mode === "login"
                            ? handleLogin
                            : mode === "signup"
                              ? handleSignup
                              : handleForgotPassword
                    }
                    className="space-y-4"
                >
                    {/* Name (signup only) */}
                    {mode === "signup" && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                名称 (可选)
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="您的名称"
                                    className="auth-input pl-10"
                                    autoComplete="name"
                                />
                            </div>
                        </div>
                    )}

                    {/* Email */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">邮箱</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                className="auth-input pl-10"
                                required
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    {/* Password (login & signup only) */}
                    {mode !== "forgot" && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">密码</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    placeholder="••••••••"
                                    className="auth-input pl-10"
                                    required
                                    minLength={6}
                                    autoComplete={
                                        mode === "login"
                                            ? "current-password"
                                            : "new-password"
                                    }
                                />
                            </div>
                        </div>
                    )}

                    {/* Forgot Password Link (login only) */}
                    {mode === "login" && (
                        <div className="text-right">
                            <button
                                type="button"
                                onClick={() => {
                                    setMode("forgot");
                                    setError(null);
                                }}
                                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                忘记密码？
                            </button>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="auth-button"
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <>
                                {mode === "login" && "登录"}
                                {mode === "signup" && "注册"}
                                {mode === "forgot" && "发送重置链接"}
                            </>
                        )}
                    </button>
                </form>

                {/* Divider */}
                {mode !== "forgot" && (
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-border"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="bg-card px-2 text-muted-foreground">
                                或者
                            </span>
                        </div>
                    </div>
                )}

                {/* OAuth Buttons */}
                {mode !== "forgot" && (
                    <button
                        type="button"
                        onClick={handleGithubLogin}
                        disabled={loading}
                        className="auth-button auth-button-secondary"
                    >
                        <Github className="h-4 w-4" />
                        <span>使用 GitHub 登录</span>
                    </button>
                )}

                {/* Mode Toggle */}
                <div className="mt-6 text-center text-sm">
                    {mode === "login" && (
                        <p className="text-muted-foreground">
                            还没有账户？{" "}
                            <button
                                type="button"
                                onClick={() => {
                                    setMode("signup");
                                    setError(null);
                                }}
                                className="text-primary hover:underline font-medium"
                            >
                                立即注册
                            </button>
                        </p>
                    )}
                    {mode === "signup" && (
                        <p className="text-muted-foreground">
                            已有账户？{" "}
                            <button
                                type="button"
                                onClick={() => {
                                    setMode("login");
                                    setError(null);
                                }}
                                className="text-primary hover:underline font-medium"
                            >
                                立即登录
                            </button>
                        </p>
                    )}
                    {mode === "forgot" && (
                        <p className="text-muted-foreground">
                            想起密码了？{" "}
                            <button
                                type="button"
                                onClick={() => {
                                    setMode("login");
                                    setError(null);
                                    setMessage(null);
                                }}
                                className="text-primary hover:underline font-medium"
                            >
                                返回登录
                            </button>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

// Hook for using auth modal
export function useAuthModal() {
    const [isOpen, setIsOpen] = useState(false);

    return {
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
    };
}
