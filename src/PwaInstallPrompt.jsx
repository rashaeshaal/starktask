import React, { useState, useEffect } from 'react';
import { Download, Monitor, CheckCircle2, X, Smartphone } from 'lucide-react';

/**
 * PwaInstallPrompt:
 * - Detects `beforeinstallprompt` event across Desktop (Chrome/Edge/Brave) & Mobile.
 * - Detects if already running in standalone/installed mode (window.matchMedia('(display-mode: standalone)').matches).
 * - Detects if user previously installed or dismissed.
 * - If already installed, completely hides the prompt.
 */
export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed / running in standalone window
    const checkIsInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                           window.navigator.standalone === true ||
                           document.referrer.includes('android-app://');
      if (isStandalone) {
        setIsInstalled(true);
        return true;
      }
      return false;
    };

    if (checkIsInstalled()) {
      return;
    }

    // Listen for install prompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Listen for successful install event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      localStorage.setItem('salesdoor_pwa_installed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check localStorage flag
    if (localStorage.getItem('salesdoor_pwa_installed') === 'true') {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // In case browser doesn't support deferred prompt (e.g. iOS Safari), show tip
      alert("To install on iOS / Safari: Tap the Share button in your browser and select 'Add to Home Screen'.");
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setIsInstallable(false);
      localStorage.setItem('salesdoor_pwa_installed', 'true');
    }
    setDeferredPrompt(null);
  };

  // If already installed, or user dismissed, or not installable, don't show anything
  if (isInstalled || isDismissed) {
    return null;
  }

  // Render header button / banner
  return (
    <>
      {/* 1. Header Action Button (Desktop & Tablet) */}
      {isInstallable && (
        <button
          onClick={handleInstallClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#05331F] border border-emerald-300 text-xs font-bold transition shadow-2xs active:scale-95 shrink-0"
          title="Install SalesDoor App on this device"
        >
          <Download className="w-3.5 h-3.5 text-emerald-800" />
          <span className="hidden md:inline">Install App</span>
        </button>
      )}

      {/* 2. Floating Bottom Notification on Mobile/Desktop if prompt available */}
      {isInstallable && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 z-50 max-w-sm w-[calc(100%-2rem)] bg-[#05331F] text-white p-3.5 rounded-2xl shadow-2xl border border-emerald-500/30 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-400 text-[#05331F] flex items-center justify-center font-bold shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-white truncate">Install SalesDoor ERP</div>
              <div className="text-[10px] text-emerald-200/80 truncate">Fast desktop & mobile app access</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-[#05331F] font-bold text-xs shadow-xs transition"
            >
              Install
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1.5 text-white/60 hover:text-white rounded-lg transition"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

