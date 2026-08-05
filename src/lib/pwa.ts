/**
 * PWA runtime helpers — SW registration and install-prompt capture.
 * Kept tiny; UI belongs in components/InstallPrompt.
 */

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<(available: boolean) => void>();

export function registerServiceWorker() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  // Dev'de service worker'ı devre dışı bırak: HMR ile çatışıyor.
  if (import.meta.env.DEV) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(err => {
      // SW registration failures shouldn't take the app down.
      console.warn('[pwa] sw register failed', err);
    });
  });

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    // Chrome/Edge — sakla, kendi UI'mızdan tetikleyelim.
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    promptListeners.forEach(l => l(true));
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    promptListeners.forEach(l => l(false));
  });
}

export function subscribeToInstallPromptAvailable(cb: (available: boolean) => void): () => void {
  promptListeners.add(cb);
  cb(!!deferredPrompt);
  return () => promptListeners.delete(cb);
}

export async function triggerInstallPrompt(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable';
  await deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  promptListeners.forEach(l => l(false));
  return choice.outcome;
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  // iOS Safari
  if ((window.navigator as { standalone?: boolean }).standalone) return true;
  return window.matchMedia('(display-mode: standalone)').matches;
}
