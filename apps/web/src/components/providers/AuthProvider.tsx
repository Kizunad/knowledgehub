"use client";

import { useEffect } from "react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/authStore";

interface AuthProviderProps {
    children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const { setUser, setSession, setLoading, setInitialized } = useAuthStore();

    useEffect(() => {
        // Check if Supabase is configured
        if (!isSupabaseConfigured()) {
            console.warn(
                "⚠️ Supabase not configured. Auth features will be disabled.",
            );
            setLoading(false);
            setInitialized(true);
            return;
        }

        const supabase = getSupabaseClient();

        // Handle case where supabase client is null
        if (!supabase) {
            setLoading(false);
            setInitialized(true);
            return;
        }

        // Get initial session
        const initializeAuth = async () => {
            try {
                const {
                    data: { session },
                } = await supabase.auth.getSession();

                setSession(session);
                setUser(session?.user ?? null);
            } catch (error) {
                console.error("Error getting session:", error);
            } finally {
                setLoading(false);
                setInitialized(true);
            }
        };

        initializeAuth();

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);

            // Handle specific auth events
            switch (event) {
                case "SIGNED_IN":
                    console.log("User signed in:", session?.user?.email);
                    break;
                case "SIGNED_OUT":
                    console.log("User signed out");
                    break;
                case "TOKEN_REFRESHED":
                    console.log("Token refreshed");
                    break;
                case "USER_UPDATED":
                    console.log("User updated:", session?.user?.email);
                    break;
            }
        });

        // Cleanup subscription on unmount
        return () => {
            subscription.unsubscribe();
        };
    }, [setUser, setSession, setLoading, setInitialized]);

    return <>{children}</>;
}
