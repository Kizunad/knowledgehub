"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from "react";
import { usePWA, type PWAState } from "@/hooks/usePWA";
import { useOffline, type OfflineState } from "@/hooks/useOffline";
import { OfflineBanner } from "./OfflineBanner";
import { InstallPrompt } from "./InstallPrompt";
import { UpdatePrompt } from "./UpdatePrompt";

// Combined context type
interface PWAContextType extends PWAState {
    offline: OfflineState;
    showInstallPrompt: () => void;
    hideInstallPrompt: () => void;
}

const PWAContext = createContext<PWAContextType | null>(null);

export interface PWAProviderProps {
    children: ReactNode;
    /**
     * Show offline banner when connection is lost
     */
    showOfflineBanner?: boolean;
    /**
     * Show install prompt after delay (0 to disable)
     */
    installPromptDelay?: number;
    /**
     * Show update prompt when new version is available
     */
    showUpdatePrompt?: boolean;
    /**
     * Position of the offline banner
     */
    offlineBannerPosition?: "top" | "bottom";
    /**
     * Variant of the install prompt
     */
    installPromptVariant?: "banner" | "modal" | "minimal";
}

export function PWAProvider({
    children,
    showOfflineBanner = true,
    installPromptDelay = 10000,
    showUpdatePrompt = true,
    offlineBannerPosition = "top",
    installPromptVariant = "banner",
}: PWAProviderProps) {
    const pwa = usePWA();
    const offline = useOffline({
        onOnline: () => {
            console.log("[PWA] Connection restored");
        },
        onOffline: () => {
            console.log("[PWA] Connection lost");
        },
    });

    const [installPromptVisible, setInstallPromptVisible] = useState(false);

    // Show install prompt after delay
    useEffect(() => {
        if (installPromptDelay > 0 && pwa.isInstallable && !pwa.isInstalled) {
            const timer = setTimeout(() => {
                setInstallPromptVisible(true);
            }, installPromptDelay);

            return () => clearTimeout(timer);
        }
        return undefined;
    }, [installPromptDelay, pwa.isInstallable, pwa.isInstalled]);

    const showInstallPrompt = () => setInstallPromptVisible(true);
    const hideInstallPrompt = () => setInstallPromptVisible(false);

    const contextValue: PWAContextType = {
        ...pwa,
        offline,
        showInstallPrompt,
        hideInstallPrompt,
    };

    return (
        <PWAContext.Provider value={contextValue}>
            {children}

            {/* Offline Banner */}
            {showOfflineBanner && (
                <OfflineBanner
                    position={offlineBannerPosition}
                    dismissible
                    autoDismissOnOnline={3000}
                />
            )}

            {/* Install Prompt */}
            {installPromptVisible && pwa.isInstallable && !pwa.isInstalled && (
                <InstallPrompt
                    variant={installPromptVariant}
                    showAfterDelay={0}
                    onDismiss={hideInstallPrompt}
                />
            )}

            {/* Update Prompt */}
            {showUpdatePrompt && <UpdatePrompt position="bottom-right" />}
        </PWAContext.Provider>
    );
}

/**
 * Hook to access PWA context
 */
export function usePWAContext(): PWAContextType {
    const context = useContext(PWAContext);

    if (!context) {
        throw new Error("usePWAContext must be used within a PWAProvider");
    }

    return context;
}

/**
 * Hook to check if running in standalone mode (installed PWA)
 */
export function useIsStandalone(): boolean {
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;

        // Check various ways to detect standalone mode
        const checkStandalone = () => {
            return (
                window.matchMedia("(display-mode: standalone)").matches ||
                (window.navigator as any).standalone === true ||
                document.referrer.includes("android-app://")
            );
        };

        setIsStandalone(checkStandalone());

        // Listen for display mode changes
        const mediaQuery = window.matchMedia("(display-mode: standalone)");
        const handler = (e: MediaQueryListEvent) => {
            setIsStandalone(e.matches);
        };

        mediaQuery.addEventListener("change", handler);

        return () => {
            mediaQuery.removeEventListener("change", handler);
        };
    }, []);

    return isStandalone;
}

export default PWAProvider;
