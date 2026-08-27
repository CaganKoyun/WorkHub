import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Hourglass, ArrowRight } from "lucide-react";
import { useApprovals } from "@/lib/graph-hooks";
import { APPROVAL_KIND_LABELS } from "@/lib/graph-types";
import { computeBottleneck } from "@/lib/bottleneck-utils";

/**
 * §3.1 Founder Bottleneck Radar — "kaç iş kaç gündür sende bekliyor".
 * Pending onaylar üzerinden türer. Pending yoksa kart görünmez.
 */
export function FounderBottleneckRadar() {
  const { data: pending } = useApprovals({ status: "pending" });
  const summary = computeBottleneck(pending ?? [], Date.now());
  if (!summary) return null;

  const { count, totalDays, oldest } = summary;
  const oldestLabel = APPROVAL_KIND_LABELS[oldest.item.kind] ?? "Onay";

  return (
    <Link to="/inbox" className="block">
      <Card className="border-warning/40 hover:border-warning/70 transition-colors">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-md bg-warning/10 flex items-center justify-center shrink-0">
            <Hourglass className="h-5 w-5 text-warning" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">Founder Bottleneck</p>
              <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                {count} iş
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              <span className="text-foreground font-medium">{count}</span> iş toplam{" "}
              <span className="text-foreground font-medium">{totalDays}</span> gündür sende bekliyor.
              En eskisi: <span className="text-foreground font-medium">{oldest.item.title}</span>{" "}
              <span className="text-xs">({oldestLabel} · {oldest.days} gün)</span>
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </CardContent>
      </Card>
    </Link>
  );
}
