import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import type { Decision } from "@/lib/graph-types";
import { buildSnapshotDeltas } from "@/lib/founder-metrics";
import { useCurrentSnapshot } from "@/lib/replay-hooks";
import { VERDICT_LABELS } from "@/lib/decision-utils";

function fmt(n: number) {
  return Math.abs(n) >= 1000 ? n.toLocaleString("tr-TR", { maximumFractionDigits: 0 }) : String(n);
}

/** §1.2 Karar Tekrarı — o günkü dünya vs bugün, bahis vs gerçekleşen. */
export function DecisionReplay({ decision }: { decision: Decision }) {
  const { data: today } = useCurrentSnapshot();
  const snapshot = decision.state_snapshot as unknown as Record<string, unknown> | null;
  const deltas = buildSnapshotDeltas(snapshot, today ?? null);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <History className="h-3.5 w-3.5" /> O günü tekrar yaşa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="pr-6">{decision.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Bahis — {decision.decided_at
                  ? format(new Date(decision.decided_at), "d MMMM yyyy", { locale: tr })
                  : "karar günü"}
              </p>
              <p className="mt-1 text-sm">{decision.expected_outcome ?? "Beklenti kaydedilmemiş"}</p>
              {decision.confidence != null && (
                <Badge variant="outline" className="mt-2">Güven %{decision.confidence}</Badge>
              )}
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Gerçekleşen</p>
              <p className="mt-1 text-sm">
                {decision.actual_outcome ?? "Henüz hesap günü gelmedi"}
              </p>
              {decision.verdict && (
                <Badge variant="outline" className="mt-2">{VERDICT_LABELS[decision.verdict]}</Badge>
              )}
            </div>
          </div>

          {deltas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Bu karar için donmuş bir şirket anı yok — bu tarihten sonra verilen kararlarda otomatik oluşur.
            </p>
          ) : (
            <div className="rounded-lg border border-border">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-border px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground">
                <span>O gün</span><span /><span className="text-right">Bugün</span>
              </div>
              <ul className="divide-y divide-border">
                {deltas.map((d) => {
                  const diff = d.now - d.then;
                  const good = d.higherIsBetter ? diff > 0 : diff < 0;
                  const Icon = diff === 0 ? Minus : good ? TrendingUp : TrendingDown;
                  const tone = diff === 0
                    ? "text-muted-foreground"
                    : good ? "text-success" : "text-destructive";
                  return (
                    <li key={d.key} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-2 text-sm">
                      <span className="tabular-nums">{fmt(d.then)}</span>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {d.label}
                        <ArrowRight className="h-3 w-3" />
                      </span>
                      <span className={`flex items-center justify-end gap-1 tabular-nums ${tone}`}>
                        <Icon className="h-3.5 w-3.5" />
                        {fmt(d.now)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {decision.context && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Bağlam</p>
              <p className="mt-1 text-sm">{decision.context}</p>
            </div>
          )}
          {decision.rationale && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Gerekçe</p>
              <p className="mt-1 text-sm">{decision.rationale}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
