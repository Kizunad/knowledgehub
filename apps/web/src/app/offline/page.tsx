'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  WifiOff,
  RefreshCw,
  Home,
  CloudOff,
  Database,
  Lightbulb,
  BookOpen,
  Code,
  MessageSquare
} from 'lucide-react';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Check online status
  const checkConnection = useCallback(async () => {
    setIsChecking(true);

    try {
      // Try to fetch a small resource
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
      });

      if (response.ok) {
        setIsOnline(true);
        // Redirect to home after a short delay
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      } else {
        setIsOnline(false);
      }
    } catch {
      setIsOnline(false);
    } finally {
      setIsChecking(false);
      setLastChecked(new Date());
    }
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      checkConnection();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    // Set initial state
    setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnection]);

  // Auto-retry every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isOnline && !isChecking) {
        checkConnection();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isOnline, isChecking, checkConnection]);

  const quickLinks = [
    { name: 'Study', icon: BookOpen, href: '/study', color: 'text-blue-400' },
    { name: 'Ideas', icon: Lightbulb, href: '/ideas', color: 'text-yellow-400' },
    { name: 'Code', icon: Code, href: '/code', color: 'text-green-400' },
    { name: 'Chat', icon: MessageSquare, href: '/chat', color: 'text-purple-400' },
  ];

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-6">
      {/* Main Content */}
      <div className="max-w-md w-full text-center space-y-8">
        {/* Icon */}
        <div className="relative">
          <div className="w-24 h-24 mx-auto rounded-full bg-stone-900 flex items-center justify-center border border-stone-800">
            {isOnline ? (
              <CloudOff className="w-12 h-12 text-green-400 animate-pulse" />
            ) : (
              <WifiOff className="w-12 h-12 text-stone-500" />
            )}
          </div>
          {isChecking && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-28 h-28 border-2 border-stone-700 border-t-stone-400 rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Status Text */}
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold text-stone-100">
            {isOnline ? 'Connection Restored!' : 'You\'re Offline'}
          </h1>
          <p className="text-stone-400">
            {isOnline
              ? 'Reconnecting to Hub...'
              : 'Check your internet connection and try again.'}
          </p>
          {lastChecked && !isOnline && (
            <p className="text-sm text-stone-500">
              Last checked: {lastChecked.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Retry Button */}
        {!isOnline && (
          <button
            onClick={checkConnection}
            disabled={isChecking}
            className="inline-flex items-center gap-2 px-6 py-3 bg-stone-800 hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed text-stone-100 rounded-lg transition-colors border border-stone-700"
          >
            <RefreshCw className={`w-5 h-5 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Checking...' : 'Retry Connection'}
          </button>
        )}

        {/* Offline Features */}
        {!isOnline && (
          <div className="pt-8 border-t border-stone-800">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Database className="w-4 h-4 text-stone-500" />
              <p className="text-sm text-stone-500">Cached content may be available</p>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-4 gap-3">
              {quickLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg bg-stone-900 hover:bg-stone-800 transition-colors border border-stone-800"
                >
                  <link.icon className={`w-6 h-6 ${link.color}`} />
                  <span className="text-xs text-stone-400">{link.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Home Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-stone-400 hover:text-stone-300 transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Go to Home</span>
        </Link>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-center">
        <p className="text-xs text-stone-600">
          Hub PWA • Offline Mode
        </p>
      </div>
    </div>
  );
}
