import { useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skull, Loader2, Inbox } from "lucide-react";
import { toast } from "sonner";
import type { Decision } from "@/lib/graph-types";
import { askAgent } from "@/lib/ai-stream";
import { useCreateApproval } from "@/lib/graph-hooks";

/** §1.3 Pre-Mortem — "bu karar 6 ay sonra kötü bitti, neden?" */
export function PreMortemDialog({ decision }: { decision: Decision }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const [signal, setSignal] = useState("");
  const createApproval = useCreateApproval();

  const run = async () => {
    setLoading(true);
    setAnswer("");
    const prompt = [
      `Bu karar 6 ay sonra kötü bitti. Neden? Şirketin gerçek verisini kullanarak yanıtla.`,
      ``,
      `Karar: ${decision.title}`,
      decision.decision ? `Ne yapılacak: ${decision.decision}` : "",
      decision.context ? `Bağlam: ${decision.context}` : "",
      decision.rationale ? `Gerekçe: ${decision.rationale}` : "",
      decision.expected_outcome ? `Beklenti: ${decision.expected_outcome}` : "",
      ``,
      `Tam olarak 3 başarısızlık senaryosu yaz. Her senaryo için: (1) tek cümlelik başlık,`,
      `(2) nasıl gerçekleşir, (3) erken uyarı sinyali — ölçülebilir tek bir metrik ya da olay.`,
      `Kısa, acımasız ve somut ol. Genel tavsiye verme.`,
    ].filter(Boolean).join("\n");

    try {
      await askAgent({ message: prompt, domain: "chief_of_staff", onDelta: setAnswer });
    } catch (e) {
      toast.error("Pre-mortem üretilemedi: " + (e instanceof Error ? e.message : ""));
    } finally {
      setLoading(false);
    }
  };

  const watchSignal = async () => {
    if (!signal.trim()) return toast.error("İzleyeceğin sinyali yaz");
    try {
      await createApproval.mutateAsync({
        kind: "general",
        title: `Pre-mortem sinyali: ${signal.trim()}`,
        summary: `"${decision.title}" kararı için izlenecek erken uyarı sinyali. Bu sinyal gerçekleşirse kararı yeniden aç.`,
        priority: "normal",
        resource_type: "decision",
        resource_id: decision.id,
      });
      toast.success("Sinyal Founder Inbox'a düştü — artık canlı bir alarm");
      setSignal("");
      setOpen(false);
    } catch (e) {
      toast.error("Kaydedilemedi: " + (e instanceof Error ? e.message : ""));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Skull className="h-3.5 w-3.5" /> Pre-mortem
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bu karar 6 ay sonra kötü bitti — neden?</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{decision.title}</p>

          {!answer && !loading && (
            <Button onClick={run} className="w-full">Üç başarısızlık senaryosu üret</Button>
          )}

          {loading && !answer && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Şirket verisi okunuyor…
            </div>
          )}

          {answer && (
            <div className="prose prose-sm dark:prose-invert max-w-none rounded-lg border border-border p-3">
              <ReactMarkdown>{answer}</ReactMarkdown>
            </div>
          )}

          {answer && !loading && (
            <div className="space-y-1.5 rounded-lg border border-warning/40 bg-warning/5 p-3">
              <Label>İzleyeceğim sinyal</Label>
              <Input
                value={signal}
                onChange={(e) => setSignal(e.target.value)}
                placeholder="Örn: Haftalık aktif kullanıcı 2 hafta üst üste düşerse"
              />
              <p className="text-xs text-muted-foreground">
                Sinyal Founder Inbox'a bir izleme kaydı olarak düşer; pre-mortem doküman değil, alarm olur.
              </p>
            </div>
          )}
        </div>

        {answer && !loading && (
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={run}>Yeniden üret</Button>
            <Button onClick={watchSignal} disabled={createApproval.isPending} className="gap-1.5">
              <Inbox className="h-4 w-4" /> Sinyali izlemeye al
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
