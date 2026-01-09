'use client';

import { useState, useEffect, useCallback } from 'react';

export interface OfflineState {
  isOnline: boolean;
  isOffline: boolean;
  wasOffline: boolean;
  lastOnlineAt: Date | null;
  connectionType: string | null;
  effectiveType: string | null;
}

export interface UseOfflineOptions {
  /**
   * Callback when connection is restored
   */
  onOnline?: () => void;
  /**
   * Callback when connection is lost
   */
  onOffline?: () => void;
  /**
   * Enable ping check to verify real connectivity
   */
  enablePingCheck?: boolean;
  /**
   * URL to ping for connectivity check
   */
  pingUrl?: string;
  /**
   * Interval for ping check in ms
   */
  pingInterval?: number;
}

interface NetworkInformation extends EventTarget {
  type?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  addEventListener(type: 'change', listener: () => void): void;
  removeEventListener(type: 'change', listener: () => void): void;
}

declare global {
  interface Navigator {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  }
}

/**
 * Hook to detect and manage offline state
 *
 * @example
 * ```tsx
 * const { isOnline, isOffline, wasOffline } = useOffline({
 *   onOnline: () => console.log('Back online!'),
 *   onOffline: () => console.log('Went offline'),
 * });
 *
 * return (
 *   <div>
 *     {isOffline && <Banner>You are offline</Banner>}
 *     {wasOffline && isOnline && <Banner>Back online!</Banner>}
 *   </div>
 * );
 * ```
 */
export function useOffline(options: UseOfflineOptions = {}): OfflineState {
  const {
    onOnline,
    onOffline,
    enablePingCheck = false,
    pingUrl = '/api/health',
    pingInterval = 30000,
  } = options;

  const [state, setState] = useState<OfflineState>(() => ({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
    wasOffline: false,
    lastOnlineAt: null,
    connectionType: null,
    effectiveType: null,
  }));

  // Get network information
  const getNetworkInfo = useCallback(() => {
    if (typeof navigator === 'undefined') return { type: null, effectiveType: null };

    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    return {
      type: connection?.type || null,
      effectiveType: connection?.effectiveType || null,
    };
  }, []);

  // Handle online event
  const handleOnline = useCallback(() => {
    const networkInfo = getNetworkInfo();
    setState(prev => ({
      ...prev,
      isOnline: true,
      isOffline: false,
      wasOffline: prev.isOffline,
      lastOnlineAt: new Date(),
      connectionType: networkInfo.type,
      effectiveType: networkInfo.effectiveType,
    }));
    onOnline?.();
  }, [onOnline, getNetworkInfo]);

  // Handle offline event
  const handleOffline = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOnline: false,
      isOffline: true,
      connectionType: null,
      effectiveType: null,
    }));
    onOffline?.();
  }, [onOffline]);

  // Ping check for real connectivity
  const checkConnectivity = useCallback(async () => {
    if (!enablePingCheck) return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(pingUrl, {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok && !state.isOnline) {
        handleOnline();
      }
    } catch {
      if (state.isOnline) {
        handleOffline();
      }
    }
  }, [enablePingCheck, pingUrl, state.isOnline, handleOnline, handleOffline]);

  // Set up event listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initial network info
    const networkInfo = getNetworkInfo();
    setState(prev => ({
      ...prev,
      connectionType: networkInfo.type,
      effectiveType: networkInfo.effectiveType,
    }));

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection changes
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const handleConnectionChange = () => {
      const info = getNetworkInfo();
      setState(prev => ({
        ...prev,
        connectionType: info.type,
        effectiveType: info.effectiveType,
      }));
    };

    connection?.addEventListener('change', handleConnectionChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      connection?.removeEventListener('change', handleConnectionChange);
    };
  }, [handleOnline, handleOffline, getNetworkInfo]);

  // Ping check interval
  useEffect(() => {
    if (!enablePingCheck) return;

    // Initial check
    checkConnectivity();

    const intervalId = setInterval(checkConnectivity, pingInterval);

    return () => clearInterval(intervalId);
  }, [enablePingCheck, pingInterval, checkConnectivity]);

  return state;
}

/**
 * Simple hook that just returns online status
 */
export function useIsOnline(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export default useOffline;
