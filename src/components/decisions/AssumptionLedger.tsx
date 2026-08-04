import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAssumptionLedger } from "@/lib/decision-contract-hooks";
import { useDecisions } from "@/lib/graph-hooks";
import { ASSUMPTION_LABELS, ASSUMPTION_TONE, OPERATOR_LABELS, type AssumptionOperator } from "@/lib/decision-contract";
import { AlertTriangle, ListChecks } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export function AssumptionLedger() {
  const { data: items, isLoading } = useAssumptionLedger();
  const { data: decisions } = useDecisions();

  const titleById = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of decisions ?? []) m.set(d.id, d.title);
    return m;
  }, [decisions]);

  const sorted = useMemo(() => {
    const rank = { breached: 0, at_risk: 1, unknown: 2, holding: 3 } as const;
    return [...(items ?? [])].sort((a, b) => rank[a.status] - rank[b.status]);
  }, [items]);

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  if (!sorted.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
          <ListChecks className="h-10 w-10 text-muted-foreground" />
          <p className="font-medium">Varsayım defteri boş</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Kararların çoğu yanlış olduğu için değil, dayandıkları varsayımlar değiştiği için
            bozulur. Bir karara varsayım ekle — eşik bozulduğunda karar önüne geri gelir.
          </p>
        </CardContent>
      </Card>
    );
  }

  const breached = sorted.filter((a) => a.status === "breached").length;

  return (
    <div className="space-y-3">
      {breached > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          {breached} varsayım bozuldu — ilgili kararlar "kontrol zamanı"na alındı.
        </div>
      )}
      {sorted.map((a) => (
        <Card key={a.id}>
          <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">{a.statement}</p>
              <p className="text-xs text-muted-foreground">
                {titleById.get(a.decision_id) ?? "Karar"} · {a.metric_key ?? "metrik yok"}{" "}
                {OPERATOR_LABELS[a.operator as AssumptionOperator] ?? a.operator} {a.threshold ?? "—"}{" "}
                {a.unit ?? ""}
                {a.current_value != null && ` · güncel: ${a.current_value.toLocaleString("tr-TR")}`}
                {a.source && ` · kaynak: ${a.source}`}
              </p>
              {a.last_checked_at && (
                <p className="text-xs text-muted-foreground">
                  son kontrol: {format(new Date(a.last_checked_at), "d MMM yyyy HH:mm", { locale: tr })}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {a.is_critical && <Badge variant="outline">Kritik</Badge>}
              <Badge className={ASSUMPTION_TONE[a.status]}>{ASSUMPTION_LABELS[a.status]}</Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
