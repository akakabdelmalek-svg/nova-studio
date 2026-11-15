import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type DetectedPlatform = 'ios' | 'android' | 'desktop';

declare global {
  interface Window {
    __novaDeferredInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() =>
    typeof window !== 'undefined' ? window.__novaDeferredInstallPrompt ?? null : null
  );
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<DetectedPlatform>('desktop');
  const [inIframe, setInIframe] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    try {
      setInIframe(window.self !== window.top);
    } catch {
      setInIframe(true);
    }

    const ua = window.navigator.userAgent.toLowerCase();
    const isIPadOS =
      navigator.platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1;
    if (/iphone|ipad|ipod/.test(ua) || isIPadOS) {
      setPlatform('ios');
    } else if (/android/.test(ua)) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }

    const syncEarlyPrompt = () => {
      if (window.__novaDeferredInstallPrompt) {
        setDeferredPrompt(window.__novaDeferredInstallPrompt);
      }
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvt = e as BeforeInstallPromptEvent;
      window.__novaDeferredInstallPrompt = promptEvt;
      setDeferredPrompt(promptEvt);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      window.__novaDeferredInstallPrompt = null;
      setDeferredPrompt(null);
      try {
        window.localStorage.setItem('nova_studio_app_installed', '1');
      } catch {
        // ignore storage restrictions
      }
    };

    syncEarlyPrompt();
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('nova-pwa-installable', syncEarlyPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('nova-pwa-installed', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('nova-pwa-installable', syncEarlyPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('nova-pwa-installed', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    const promptEvt = deferredPrompt || window.__novaDeferredInstallPrompt;
    if (!promptEvt) return false;
    await promptEvt.prompt();
    const { outcome } = await promptEvt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      window.__novaDeferredInstallPrompt = null;
      setDeferredPrompt(null);
      try {
        window.localStorage.setItem('nova_studio_app_installed', '1');
      } catch {
        // ignore
      }
      return true;
    }
    return false;
  }, [deferredPrompt]);

  const cacheOfflineBundle = useCallback(async () => {
    if (typeof window === 'undefined' || !('caches' in window)) return false;
    try {
      const cache = await caches.open('nova-studio-program-v1');
      await cache.addAll([
        '/',
        '/manifest.webmanifest',
        '/pwa-192x192.png',
        '/pwa-512x512.png',
        '/pwa-maskable-512x512.png',
        '/apple-touch-icon.png',
        '/icon.svg',
      ]);
      try {
        window.localStorage.setItem('nova_studio_offline_ready', '1');
      } catch {
        // ignore
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS: platform === 'ios',
    isAndroid: platform === 'android',
    platform,
    inIframe,
    install,
    cacheOfflineBundle,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
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
