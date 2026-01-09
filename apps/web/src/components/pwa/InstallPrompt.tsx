'use client';

import { useState, useEffect } from 'react';
import {
  Download,
  X,
  Smartphone,
  Monitor,
  CheckCircle2,
  Sparkles,
  Wifi,
  Bell,
  Zap,
} from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

interface InstallPromptProps {
  variant?: 'banner' | 'modal' | 'minimal';
  onDismiss?: () => void;
  showAfterDelay?: number;
}

export function InstallPrompt({
  variant = 'banner',
  onDismiss,
  showAfterDelay = 5000,
}: InstallPromptProps) {
  const { isInstallable, isInstalled, isStandalone, install, dismissInstall } = usePWA();
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Show prompt after delay
  useEffect(() => {
    if (!isInstallable || isInstalled || isStandalone) {
      setIsVisible(false);
      return;
    }

    // Check if user dismissed before
    const dismissed = sessionStorage.getItem('hub-pwa-dismissed');
    if (dismissed === 'true') {
      setIsVisible(false);
      return;
    }

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, showAfterDelay);

    return () => clearTimeout(timer);
  }, [isInstallable, isInstalled, isStandalone, showAfterDelay]);

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const success = await install();
      if (success) {
        setIsVisible(false);
      }
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    dismissInstall();
    setIsVisible(false);
    setShowModal(false);
    onDismiss?.();
  };

  const handleLearnMore = () => {
    setShowModal(true);
  };

  if (!isVisible) {
    return null;
  }

  const features = [
    { icon: Wifi, text: 'Works offline', description: 'Access your data without internet' },
    { icon: Zap, text: 'Faster loading', description: 'Native-like performance' },
    { icon: Bell, text: 'Push notifications', description: 'Stay updated with alerts' },
    { icon: Sparkles, text: 'Full screen', description: 'Distraction-free experience' },
  ];

  // Minimal variant - small floating button
  if (variant === 'minimal') {
    return (
      <button
        onClick={handleInstall}
        disabled={isInstalling}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-100 rounded-full shadow-lg border border-stone-700 transition-all hover:scale-105"
      >
        <Download className={`w-4 h-4 ${isInstalling ? 'animate-bounce' : ''}`} />
        <span className="text-sm font-medium">Install App</span>
      </button>
    );
  }

  // Banner variant - top/bottom banner
  if (variant === 'banner') {
    return (
      <>
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-stone-900 border-t border-stone-800 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* App Icon */}
              <div className="hidden sm:flex w-12 h-12 rounded-xl bg-gradient-to-br from-stone-700 to-stone-800 items-center justify-center border border-stone-600">
                <Sparkles className="w-6 h-6 text-yellow-400" />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-stone-100">Install Hub for the best experience</p>
                <p className="text-sm text-stone-400 hidden sm:block">
                  Add to home screen for offline access and faster loading
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleLearnMore}
                className="hidden sm:block px-3 py-2 text-sm text-stone-400 hover:text-stone-300 transition-colors"
              >
                Learn more
              </button>
              <button
                onClick={handleInstall}
                disabled={isInstalling}
                className="flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-white disabled:opacity-50 text-stone-900 rounded-lg font-medium transition-colors"
              >
                <Download className={`w-4 h-4 ${isInstalling ? 'animate-bounce' : ''}`} />
                <span className="hidden sm:inline">{isInstalling ? 'Installing...' : 'Install'}</span>
              </button>
              <button
                onClick={handleDismiss}
                className="p-2 text-stone-500 hover:text-stone-400 transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Learn More Modal */}
        {showModal && (
          <InstallModal
            features={features}
            onInstall={handleInstall}
            onDismiss={() => setShowModal(false)}
            isInstalling={isInstalling}
          />
        )}
      </>
    );
  }

  // Modal variant - centered modal
  return (
    <InstallModal
      features={features}
      onInstall={handleInstall}
      onDismiss={handleDismiss}
      isInstalling={isInstalling}
    />
  );
}

// Internal modal component
interface InstallModalProps {
  features: { icon: React.ElementType; text: string; description: string }[];
  onInstall: () => void;
  onDismiss: () => void;
  isInstalling: boolean;
}

function InstallModal({ features, onInstall, onDismiss, isInstalling }: InstallModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-stone-900 rounded-2xl border border-stone-800 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="relative p-6 pb-4 bg-gradient-to-b from-stone-800 to-stone-900">
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 p-1 text-stone-500 hover:text-stone-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            {/* App Icon */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-stone-600 to-stone-700 flex items-center justify-center border border-stone-500 shadow-lg">
              <Sparkles className="w-8 h-8 text-yellow-400" />
            </div>

            <div>
              <h2 className="text-xl font-semibold text-stone-100">Install Hub</h2>
              <p className="text-sm text-stone-400">Personal Knowledge Management</p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-stone-400">
            Install Hub as an app for the best experience:
          </p>

          <div className="grid grid-cols-2 gap-3">
            {features.map((feature) => (
              <div
                key={feature.text}
                className="flex items-start gap-3 p-3 rounded-lg bg-stone-800/50 border border-stone-800"
              >
                <feature.icon className="w-5 h-5 text-stone-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-stone-200">{feature.text}</p>
                  <p className="text-xs text-stone-500">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Platform Info */}
          <div className="flex items-center justify-center gap-6 py-4 text-stone-500">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              <span className="text-xs">Desktop</span>
            </div>
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              <span className="text-xs">Mobile</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 flex gap-3">
          <button
            onClick={onDismiss}
            className="flex-1 px-4 py-3 text-stone-400 hover:text-stone-300 rounded-lg border border-stone-700 hover:border-stone-600 transition-colors"
          >
            Maybe Later
          </button>
          <button
            onClick={onInstall}
            disabled={isInstalling}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-stone-100 hover:bg-white disabled:opacity-50 text-stone-900 rounded-lg font-medium transition-colors"
          >
            {isInstalling ? (
              <>
                <CheckCircle2 className="w-5 h-5 animate-pulse" />
                Installing...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Install App
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Update notification component
export function UpdatePrompt() {
  const { isUpdateAvailable, isUpdating, update } = usePWA();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isUpdateAvailable) {
      setIsVisible(true);
    }
  }, [isUpdateAvailable]);

  if (!isVisible || !isUpdateAvailable) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-sm p-4 bg-stone-900 border border-stone-700 rounded-xl shadow-lg">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-blue-400" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-stone-100">Update Available</p>
          <p className="text-sm text-stone-400 mt-1">
            A new version of Hub is available. Refresh to update.
          </p>

          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setIsVisible(false)}
              className="px-3 py-1.5 text-sm text-stone-400 hover:text-stone-300 transition-colors"
            >
              Later
            </button>
            <button
              onClick={update}
              disabled={isUpdating}
              className="px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white rounded-md font-medium transition-colors"
            >
              {isUpdating ? 'Updating...' : 'Refresh Now'}
            </button>
          </div>
        </div>

        <button
          onClick={() => setIsVisible(false)}
          className="p-1 text-stone-500 hover:text-stone-400 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default InstallPrompt;
