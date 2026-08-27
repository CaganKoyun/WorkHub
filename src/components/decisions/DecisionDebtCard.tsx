import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useDecisionDebt } from "@/lib/decision-contract-hooks";
import { debtBand } from "@/lib/decision-contract";
import { Gauge } from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n);

export function DecisionDebtCard({ compact = false }: { compact?: boolean }) {
  const { debt, isLoading } = useDecisionDebt();

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  const band = debtBand(debt.score);
  const rows = [
    { label: "karar gecikmiş", value: debt.overdue.length },
    { label: "kararın sahibi yok", value: debt.ownerless.length },
    { label: "karar uygulamaya dönüşmemiş", value: debt.unexecuted.length },
    { label: "kararın sonuç incelemesi geçmiş", value: debt.reviewOverdue.length },
    { label: "kararın varsayımı bozulmuş", value: debt.breachedAssumptions },
  ].filter((r) => !compact || r.value > 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Gauge className="h-4 w-4" />
          Karar Borcu
          <span className={`ml-auto text-lg font-semibold ${band.tone}`}>
            {debt.score}/100 · {band.label}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={debt.score} />
        <ul className="space-y-1 text-sm text-muted-foreground">
          {rows.length === 0 ? (
            <li>Karar borcu yok — döngüler kapalı.</li>
          ) : (
            rows.map((r) => (
              <li key={r.label}>
                <span className="font-medium text-foreground">{r.value}</span> {r.label}
              </li>
            ))
          )}
        </ul>
        {debt.blockedAmount > 0 && (
          <p className="rounded-md bg-warning/10 p-2 text-xs text-warning">
            Bekleyen kararlar tahmini {fmt(debt.blockedAmount)} değerinde iş blokluyor.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
