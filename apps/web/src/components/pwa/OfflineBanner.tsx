'use client';

import { useState, useEffect } from 'react';
import { WifiOff, Wifi, X, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface OfflineBannerProps {
  /**
   * Position of the banner
   */
  position?: 'top' | 'bottom';
  /**
   * Whether the banner can be dismissed
   */
  dismissible?: boolean;
  /**
   * Auto-dismiss when back online (ms)
   */
  autoDismissOnOnline?: number;
  /**
   * Custom class name
   */
  className?: string;
}

export function OfflineBanner({
  position = 'top',
  dismissible = true,
  autoDismissOnOnline = 3000,
  className,
}: OfflineBannerProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Set initial state
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        setShowReconnected(true);
        // Auto-dismiss the reconnected message
        if (autoDismissOnOnline > 0) {
          setTimeout(() => {
            setShowReconnected(false);
            setWasOffline(false);
          }, autoDismissOnOnline);
        }
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      setIsDismissed(false); // Reset dismiss state when going offline
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline, autoDismissOnOnline]);

  // Don't show anything if online and never was offline
  if (isOnline && !showReconnected) {
    return null;
  }

  // Don't show if dismissed
  if (isDismissed && isOnline) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    setShowReconnected(false);
  };

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div
      className={cn(
        'fixed left-0 right-0 z-50 px-4 py-2',
        position === 'top' ? 'top-0' : 'bottom-0',
        className
      )}
    >
      <div
        className={cn(
          'mx-auto max-w-lg flex items-center justify-between gap-3 px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm border',
          isOnline
            ? 'bg-green-950/90 border-green-800 text-green-100'
            : 'bg-amber-950/90 border-amber-800 text-amber-100'
        )}
      >
        {/* Status Icon */}
        <div className="flex items-center gap-3">
          {isOnline ? (
            <Wifi className="w-5 h-5 text-green-400 flex-shrink-0" />
          ) : (
            <WifiOff className="w-5 h-5 text-amber-400 flex-shrink-0" />
          )}

          {/* Message */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              {isOnline
                ? 'Connection restored'
                : "You're offline"}
            </p>
            <p className="text-xs opacity-75">
              {isOnline
                ? 'All features are now available'
                : 'Some features may be limited'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {!isOnline && (
            <button
              onClick={handleRetry}
              className="p-1.5 rounded-md hover:bg-amber-800/50 transition-colors"
              title="Retry connection"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          {dismissible && (
            <button
              onClick={handleDismiss}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                isOnline
                  ? 'hover:bg-green-800/50'
                  : 'hover:bg-amber-800/50'
              )}
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Minimal inline offline indicator
 */
export function OfflineIndicator({ className }: { className?: string }) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-950 border border-amber-800 text-amber-300 text-xs',
        className
      )}
    >
      <WifiOff className="w-3 h-3" />
      <span>Offline</span>
    </div>
  );
}

export default OfflineBanner;
