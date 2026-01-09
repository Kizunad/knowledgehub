'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, X, Download, Sparkles } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

export interface UpdatePromptProps {
  /**
   * Auto-show when update is available
   */
  autoShow?: boolean;
  /**
   * Position of the prompt
   */
  position?: 'top' | 'bottom' | 'top-right' | 'bottom-right';
  /**
   * Callback when update is applied
   */
  onUpdate?: () => void;
  /**
   * Callback when prompt is dismissed
   */
  onDismiss?: () => void;
}

export function UpdatePrompt({
  autoShow = true,
  position = 'bottom-right',
  onUpdate,
  onDismiss,
}: UpdatePromptProps) {
  const { isUpdateAvailable, isUpdating, update } = usePWA();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Show prompt when update is available
  useEffect(() => {
    if (autoShow && isUpdateAvailable && !isDismissed) {
      setIsVisible(true);
    }
  }, [autoShow, isUpdateAvailable, isDismissed]);

  // Handle update
  const handleUpdate = async () => {
    onUpdate?.();
    await update();
  };

  // Handle dismiss
  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    onDismiss?.();
  };

  if (!isVisible) return null;

  // Position classes
  const positionClasses = {
    'top': 'top-4 left-1/2 -translate-x-1/2',
    'bottom': 'bottom-4 left-1/2 -translate-x-1/2',
    'top-right': 'top-4 right-4',
    'bottom-right': 'bottom-4 right-4',
  };

  return (
    <div
      className={`fixed ${positionClasses[position]} z-50 animate-in slide-in-from-bottom-4 fade-in duration-300`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-4 px-4 py-3 bg-stone-900 border border-stone-700 rounded-xl shadow-xl max-w-sm">
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-blue-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-stone-100">
            Update Available
          </h3>
          <p className="text-xs text-stone-400 mt-0.5">
            A new version of Hub is ready
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Update Button */}
          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {isUpdating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Update</span>
              </>
            )}
          </button>

          {/* Dismiss Button */}
          <button
            onClick={handleDismiss}
            className="p-1.5 text-stone-400 hover:text-stone-300 hover:bg-stone-800 rounded-lg transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Minimal update indicator that shows in the corner
 */
export function UpdateIndicator({
  onClick,
}: {
  onClick?: () => void;
}) {
  const { isUpdateAvailable } = usePWA();

  if (!isUpdateAvailable) return null;

  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 right-4 z-40 p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg transition-all hover:scale-105"
      aria-label="Update available"
    >
      <Download className="w-5 h-5" />
      <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
    </button>
  );
}

export default UpdatePrompt;
