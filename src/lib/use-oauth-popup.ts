import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

/**
 * Opens the OAuth authorization URL in a popup, listens for the
 * postMessage from the callback edge function, and refreshes
 * connections/tools when auth completes.
 */
export function useOAuthPopup() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const popupRef = useRef<Window | null>(null);

  useEffect(() => {
    function onMsg(ev: MessageEvent) {
      const data: any = ev.data;
      if (!data || data.source !== "mcp-oauth") return;
      qc.invalidateQueries({ queryKey: ["integrations", "connections"] });
      qc.invalidateQueries({ queryKey: ["integrations", "tools"] });
      if (data.kind === "ok") {
        toast({ title: "Integration connected", description: data.message });
      } else {
        toast({ title: "Auth failed", description: data.message, variant: "destructive" });
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [qc, toast]);

  function open(url: string) {
    // Reuse popup if still open, else open a new one
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.location.href = url;
      popupRef.current.focus();
      return;
    }
    popupRef.current = window.open(
      url,
      "mcp-oauth",
      "noopener=no,width=520,height=680,left=" + (window.screenX + 120) + ",top=" + (window.screenY + 120),
    );
  }

  return { open };
}
