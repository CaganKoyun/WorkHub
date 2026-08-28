import { useEffect, useState } from "react";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function OfflineIndicator() {
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      if (wasOffline) {
        setShowReconnected(true);
        setTimeout(() => setShowReconnected(false), 3000);
      }
    };
    const onOffline = () => {
      setOnline(false);
      setWasOffline(true);
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [wasOffline]);

  if (online && !showReconnected) return null;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 py-1.5 px-4 text-[12px] font-medium transition-all",
        online
          ? "bg-success/90 text-success-foreground"
          : "bg-destructive/90 text-destructive-foreground",
      )}
    >
      {online ? (
        <>
          <Wifi className="h-3 w-3" />
          <span>Baglanti geri geldi</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          <span>Cevrimdisi — degisiklikler baglanti gelince senkronlanacak</span>
        </>
      )}
    </div>
  );
}

export function AppUpdateNotification() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    if (import.meta.env.DEV) return;

    const checkForUpdate = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) return;

        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        });
      } catch {
        // ignore
      }
    };
    void checkForUpdate();
  }, []);

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-sm rounded-lg border border-primary/30 bg-surface shadow-2xl animate-in slide-in-from-bottom-2">
      <div className="flex items-center gap-3 p-3">
        <RefreshCw className="h-4 w-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium">Yeni sürüm mevcut</p>
          <p className="text-[11px] text-muted-foreground">Sayfayı yenileyerek güncelle.</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Güncelle
        </button>
      </div>
    </div>
  );
}
