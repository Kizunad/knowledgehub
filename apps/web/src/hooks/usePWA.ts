"use client";

import { useState, useEffect, useCallback } from "react";

// BeforeInstallPromptEvent interface for PWA installation
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Service Worker update state
interface ServiceWorkerState {
  isInstalled: boolean;
  isUpdateAvailable: boolean;
  isUpdating: boolean;
  registration: ServiceWorkerRegistration | null;
}

// PWA install state
interface PWAInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
}

// Combined PWA state
export interface PWAState {
  // Installation
  isInstallable: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  // Service Worker
  isServiceWorkerInstalled: boolean;
  isUpdateAvailable: boolean;
  isUpdating: boolean;
  // Network
  isOnline: boolean;
  // Actions
  install: () => Promise<boolean>;
  update: () => Promise<void>;
  dismissInstall: () => void;
}

// Check if running in standalone mode (installed PWA)
function isRunningStandalone(): boolean {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes("android-app://")
  );
}

// Check if PWA is installed (heuristic)
function checkIsInstalled(): boolean {
  if (typeof window === "undefined") return false;

  // Check localStorage for installation flag
  const installed = localStorage.getItem("hub-pwa-installed");
  return installed === "true" || isRunningStandalone();
}

export function usePWA(): PWAState {
  // Network state
  const [isOnline, setIsOnline] = useState(true);

  // Install state
  const [installState, setInstallState] = useState<PWAInstallState>({
    isInstallable: false,
    isInstalled: checkIsInstalled(),
    isStandalone: isRunningStandalone(),
    deferredPrompt: null,
  });

  // Service Worker state
  const [swState, setSwState] = useState<ServiceWorkerState>({
    isInstalled: false,
    isUpdateAvailable: false,
    isUpdating: false,
    registration: null,
  });

  // Handle online/offline events
  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    // Set initial state
    updateOnlineStatus();

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  // Handle beforeinstallprompt event
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();

      // Stash the event so it can be triggered later
      setInstallState((prev) => ({
        ...prev,
        isInstallable: true,
        deferredPrompt: e as BeforeInstallPromptEvent,
      }));
    };

    const handleAppInstalled = () => {
      // Update state when app is installed
      setInstallState((prev) => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
        deferredPrompt: null,
      }));

      // Persist installation flag
      localStorage.setItem("hub-pwa-installed", "true");

      // Track installation
      console.log("[PWA] App installed successfully");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Register Service Worker
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        setSwState((prev) => ({
          ...prev,
          isInstalled: true,
          registration,
        }));

        console.log("[PWA] Service Worker registered:", registration.scope);

        // Check for updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // New update available
              setSwState((prev) => ({
                ...prev,
                isUpdateAvailable: true,
              }));
              console.log("[PWA] New update available");
            }
          });
        });

        // Handle controller change (when skipWaiting is called)
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          setSwState((prev) => ({
            ...prev,
            isUpdating: false,
            isUpdateAvailable: false,
          }));
        });
      } catch (error) {
        console.error("[PWA] Service Worker registration failed:", error);
      }
    };

    registerServiceWorker();
  }, []);

  // Install PWA
  const install = useCallback(async (): Promise<boolean> => {
    const { deferredPrompt } = installState;

    if (!deferredPrompt) {
      console.log("[PWA] No installation prompt available");
      return false;
    }

    try {
      // Show the install prompt
      await deferredPrompt.prompt();

      // Wait for the user's response
      const { outcome } = await deferredPrompt.userChoice;

      // Clear the deferred prompt
      setInstallState((prev) => ({
        ...prev,
        deferredPrompt: null,
        isInstallable: false,
      }));

      if (outcome === "accepted") {
        console.log("[PWA] User accepted installation");
        return true;
      } else {
        console.log("[PWA] User dismissed installation");
        return false;
      }
    } catch (error) {
      console.error("[PWA] Installation failed:", error);
      return false;
    }
  }, [installState.deferredPrompt]);

  // Update Service Worker
  const update = useCallback(async (): Promise<void> => {
    const { registration } = swState;

    if (!registration?.waiting) {
      console.log("[PWA] No waiting service worker");
      return;
    }

    setSwState((prev) => ({
      ...prev,
      isUpdating: true,
    }));

    // Tell the waiting service worker to skip waiting
    registration.waiting.postMessage({ type: "SKIP_WAITING" });

    // Reload the page to use the new version
    window.location.reload();
  }, [swState.registration]);

  // Dismiss install prompt
  const dismissInstall = useCallback(() => {
    setInstallState((prev) => ({
      ...prev,
      isInstallable: false,
      deferredPrompt: null,
    }));

    // Optionally persist dismissal
    sessionStorage.setItem("hub-pwa-dismissed", "true");
  }, []);

  return {
    // Installation
    isInstallable: installState.isInstallable,
    isInstalled: installState.isInstalled,
    isStandalone: installState.isStandalone,
    // Service Worker
    isServiceWorkerInstalled: swState.isInstalled,
    isUpdateAvailable: swState.isUpdateAvailable,
    isUpdating: swState.isUpdating,
    // Network
    isOnline,
    // Actions
    install,
    update,
    dismissInstall,
  };
}

// Hook for offline-first data
export interface OfflineData<T> {
  data: T | null;
  isFromCache: boolean;
  isStale: boolean;
  lastUpdated: Date | null;
}

export function useOfflineData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    staleTime?: number; // ms before data is considered stale
    enabled?: boolean;
  } = {}
): {
  data: T | null;
  isLoading: boolean;
  isFromCache: boolean;
  isStale: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const { staleTime = 5 * 60 * 1000, enabled = true } = options; // Default 5 minutes

  const [state, setState] = useState<{
    data: T | null;
    isLoading: boolean;
    isFromCache: boolean;
    isStale: boolean;
    error: Error | null;
  }>({
    data: null,
    isLoading: true,
    isFromCache: false,
    isStale: false,
    error: null,
  });

  const [isOnline, setIsOnline] = useState(true);

  // Track online status
  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Load cached data
  const loadFromCache = useCallback((): {
    data: T | null;
    timestamp: number | null;
  } => {
    if (typeof window === "undefined") {
      return { data: null, timestamp: null };
    }

    try {
      const cached = localStorage.getItem(`hub-cache-${key}`);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        return { data, timestamp };
      }
    } catch (error) {
      console.error("[OfflineData] Failed to load from cache:", error);
    }

    return { data: null, timestamp: null };
  }, [key]);

  // Save to cache
  const saveToCache = useCallback(
    (data: T) => {
      if (typeof window === "undefined") return;

      try {
        localStorage.setItem(
          `hub-cache-${key}`,
          JSON.stringify({
            data,
            timestamp: Date.now(),
          })
        );
      } catch (error) {
        console.error("[OfflineData] Failed to save to cache:", error);
      }
    },
    [key]
  );

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    // First, try to load from cache
    const { data: cachedData, timestamp } = loadFromCache();
    const isStale = timestamp ? Date.now() - timestamp > staleTime : true;

    if (cachedData) {
      setState((prev) => ({
        ...prev,
        data: cachedData,
        isFromCache: true,
        isStale,
        isLoading: isOnline, // Keep loading if online to get fresh data
      }));
    }

    // If online, fetch fresh data
    if (isOnline) {
      try {
        const freshData = await fetcher();
        saveToCache(freshData);

        setState({
          data: freshData,
          isLoading: false,
          isFromCache: false,
          isStale: false,
          error: null,
        });
      } catch (error) {
        // If fetch fails but we have cached data, use it
        if (cachedData) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            isStale: true,
            error: error as Error,
          }));
        } else {
          setState({
            data: null,
            isLoading: false,
            isFromCache: false,
            isStale: false,
            error: error as Error,
          });
        }
      }
    } else {
      // Offline - use cached data
      setState((prev) => ({
        ...prev,
        isLoading: false,
      }));
    }
  }, [enabled, isOnline, fetcher, loadFromCache, saveToCache, staleTime]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refetch when coming back online
  useEffect(() => {
    if (isOnline && state.isStale) {
      fetchData();
    }
  }, [isOnline, state.isStale, fetchData]);

  return {
    ...state,
    refetch: fetchData,
  };
}
