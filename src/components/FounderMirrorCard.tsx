import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Hourglass, TrendingDown, TrendingUp, ArrowRight, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApprovals } from "@/lib/graph-hooks";
import { founderWaitDays } from "@/lib/bottleneck-utils";
import { buildMirrorCard, downloadShareCard, shareCardFilename } from "@/lib/share-card";

/**
 * "Benim Yüzümden" sayacı: bu ay şirketin kurucuyu beklediği toplam gün,
 * geçen ayla kıyaslı. Acımasız ama adil — kurucu kendisiyle yarışır.
 */
export function FounderMirrorCard() {
  const { data: approvals } = useApprovals({ status: "all" });
  if (!approvals || approvals.length === 0) return null;

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const rows = approvals.map((a) => ({ created_at: a.created_at, decided_at: a.decided_at }));
  const current = founderWaitDays(rows, thisMonthStart, now);
  const previous = founderWaitDays(rows, prevMonthStart, thisMonthStart);
  if (current === 0 && previous === 0) return null;

  const improved = previous > 0 && current < previous;
  const pct = previous > 0 ? Math.abs(Math.round(((current - previous) / previous) * 100)) : null;

  return (
    <Card className="transition-colors hover:border-primary/50">
      <CardContent className="flex items-center gap-4 p-4">
        <Link to="/inbox" className="flex min-w-0 flex-1 items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary">
            <Hourglass className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">Benim Yüzümden</p>
              {pct !== null && (
                <Badge
                  variant="outline"
                  className={improved
                    ? "gap-1 border-success/40 text-success"
                    : "gap-1 border-destructive/40 text-destructive"}
                >
                  {improved ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                  %{pct} {improved ? "iyileşme" : "artış"}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Bu ay ekibin seni toplam{" "}
              <span className="font-medium text-foreground">{current} gün</span> bekledi
              {previous > 0 && <> — geçen ay <span className="font-medium text-foreground">{previous}</span> gündü</>}.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>
        <Button
          size="sm" variant="ghost" className="shrink-0"
          title="Sayacı görsel kart olarak indir"
          onClick={() => downloadShareCard(
            buildMirrorCard({ currentDays: current, previousDays: previous }),
            shareCardFilename("benim-yuzumden", new Date()),
          )}
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
