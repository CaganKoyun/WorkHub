import { useEffect, useState } from 'react';
import { subscribeToInstallPromptAvailable, triggerInstallPrompt, isStandalone } from '@/lib/pwa';
import { Button } from '@/components/ui/button';
import { Download, X, Smartphone } from 'lucide-react';

const DISMISS_KEY = 'workhub.install.dismissed_at';
const REMIND_MS = 7 * 86_400_000; // 7 gün

/**
 * Küçük sağ-alt PWA install çubuğu. Chrome/Edge beforeinstallprompt yayınlarsa
 * gösterilir; iOS/Safari için yönerge ile gösterilir. Kullanıcı X'e basınca
 * 7 gün susar.
 */
export function InstallPrompt() {
  const [available, setAvailable] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    const dismissed = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    if (dismissed && Date.now() - dismissed < REMIND_MS) return;
    return subscribeToInstallPromptAvailable((v) => {
      setAvailable(v);
      if (v) setVisible(true);
    });
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    const outcome = await triggerInstallPrompt();
    if (outcome !== 'unavailable') setVisible(false);
  };

  if (!visible || !available) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-border/60 bg-surface shadow-2xl animate-in slide-in-from-bottom-2">
      <div className="flex items-start gap-3 p-3">
        <div className="h-8 w-8 rounded-md bg-primary/15 grid place-items-center shrink-0">
          <Smartphone className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium">WorkHub'ı yükle</div>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">
            Uygulama olarak ekle: masaüstünde ayrı pencere, telefonda anasayfa ikonu, offline shell.
          </p>
          <div className="mt-2 flex gap-1.5">
            <Button size="sm" className="h-7 gap-1.5" onClick={install}>
              <Download className="h-3 w-3" /> Yükle
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-[11.5px]" onClick={dismiss}>Sonra</Button>
          </div>
        </div>
        <button
          onClick={dismiss}
          className="h-6 w-6 grid place-items-center rounded hover:bg-secondary/60 text-muted-foreground shrink-0"
          title="Kapat (7 gün sonra tekrar sor)"
        ><X className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}
