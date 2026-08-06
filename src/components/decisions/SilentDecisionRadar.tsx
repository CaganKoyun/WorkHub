import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSilentDecisions } from "@/lib/decision-capture-hooks";
import { CAPTURE_SOURCE_LABELS, type CaptureCandidate } from "@/lib/decision-capture";
import { useCreateDecision } from "@/lib/graph-hooks";
import { Radar, Check, X } from "lucide-react";
import { toast } from "sonner";

const SEVERITY_TONE: Record<CaptureCandidate["severity"], string> = {
  high: "bg-destructive/15 text-destructive",
  medium: "bg-amber-500/20 text-warning",
  low: "bg-muted text-muted-foreground",
};

export function SilentDecisionRadar({ limit }: { limit?: number }) {
  const { candidates, isLoading, refetch } = useSilentDecisions();
  const create = useCreateDecision();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  const visible = candidates.filter((c) => !dismissed.has(c.key)).slice(0, limit ?? candidates.length);

  if (!visible.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <Radar className="h-9 w-9 text-muted-foreground" />
          <p className="font-medium">Sessiz karar görünmüyor</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Onaylar, fırsatlar, riskler ve hedefler taranıyor. Kayda geçmemiş bir karar
            oluştuğunda burada belirir.
          </p>
        </CardContent>
      </Card>
    );
  }

  const capture = async (c: CaptureCandidate) => {
    setBusy(c.key);
    try {
      await create.mutateAsync({
        title: c.title,
        context: c.reason,
        decision: c.suggestedDecision,
        status: "proposed",
        source_approval_id: c.sourceApprovalId,
        ...({ lifecycle_state: "detected" } as Record<string, unknown>),
      });
      setDismissed((s) => new Set(s).add(c.key));
      toast.success("Karar taslağı oluşturuldu — çerçeveleyip sahibini ata");
      refetch();
    } catch (e) {
      toast.error("Oluşturulamadı: " + (e instanceof Error ? e.message : ""));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3 text-sm">
        <Radar className="h-4 w-4 text-primary" />
        {visible.length} sessiz karar tespit edildi — fiilen karar verildi, kayda geçmedi.
      </div>
      {visible.map((c) => (
        <Card key={c.key}>
          <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">{c.title}</p>
                <Badge variant="outline">{CAPTURE_SOURCE_LABELS[c.source]}</Badge>
                <Badge className={SEVERITY_TONE[c.severity]}>
                  {c.severity === "high" ? "Yüksek" : c.severity === "medium" ? "Orta" : "Düşük"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{c.reason}</p>
              <p className="text-xs text-muted-foreground">
                Taslak: {c.suggestedDecision}
                {c.amount != null && c.amount > 0 &&
                  ` · ${c.amount.toLocaleString("tr-TR")} ${c.currency ?? ""}`}
                {c.ageDays > 0 && ` · ${c.ageDays} gün`}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" disabled={busy === c.key} onClick={() => capture(c)}>
                <Check className="mr-1 h-3.5 w-3.5" /> Karara dönüştür
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDismissed((s) => new Set(s).add(c.key))}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
