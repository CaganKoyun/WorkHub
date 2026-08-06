import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RelatedObjectsPanel } from "@/components/graph/RelatedObjectsPanel";
import { useDecision, useUpdateDecision, useCurrentSnapshot } from "@/lib/graph-hooks";
import { useAllProfiles } from "@/lib/projects-hooks";
import type { DecisionVerdict } from "@/lib/graph-types";
import {
  VERDICT_LABELS, REVERSIBILITY_LABELS, isDueForReview,
} from "@/lib/decision-utils";
import { snapshotEntries, snapshotCapturedAt } from "@/lib/snapshot-utils";
import { formatCurrency } from "@/lib/finance-types";
import {
  ArrowLeft, Camera, DoorOpen, DoorClosed, ScrollText, Target,
  RotateCcw, CheckCircle2, MinusCircle, XCircle, CalendarClock, UserCheck,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  proposed: "Taslak", decided: "Karar verildi", revisit: "Yeniden ele alınacak", revoked: "Geri çekildi",
};

const VERDICT_TONE: Record<DecisionVerdict, string> = {
  held: "bg-emerald-500/15 text-success",
  changed: "bg-amber-500/15 text-warning dark:text-warning",
  wrong: "bg-destructive/15 text-destructive",
};

function fmtDate(iso: string | null): string {
  return iso ? format(new Date(iso), "d MMMM yyyy", { locale: tr }) : "—";
}

export default function DecisionDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: d, isLoading } = useDecision(id);
  const update = useUpdateDecision();
  const { data: profiles } = useAllProfiles();
  const [actual, setActual] = useState("");
  // Karar Tekrarı: o gün ↔ bugün. Yalnızca donmuş an varsa sorgulanır.
  const { data: today } = useCurrentSnapshot(!!d?.state_snapshot);

  const profileName = (uid: string | null) => {
    if (!uid || !profiles) return null;
    return profiles.find((p) => p.user_id === uid)?.full_name ?? null;
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-4xl space-y-4 p-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40" />
          <Skeleton className="h-64" />
        </div>
      </AppLayout>
    );
  }

  if (!d) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-4xl p-6">
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <ScrollText className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">Karar bulunamadı</p>
              <Button asChild variant="outline" size="sm">
                <Link to="/decisions"><ArrowLeft className="mr-1 h-3.5 w-3.5" /> Karar defterine dön</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const entries = snapshotEntries(d.state_snapshot);
  const capturedAt = snapshotCapturedAt(d.state_snapshot);
  const todayByKey = new Map(snapshotEntries(today).map((e) => [e.key, e.value]));
  const due = isDueForReview(
    { status: d.status, review_at: d.review_at, verdict: d.verdict }, new Date(),
  );

  const close = async (verdict: DecisionVerdict) => {
    try {
      await update.mutateAsync({ id: d.id, verdict, actual_outcome: actual.trim() || null });
      toast.success("Karar kapatıldı — karneye işlendi");
    } catch (e) {
      toast.error("Kapatılamadı: " + (e instanceof Error ? e.message : ""));
    }
  };

  const reviewerName = profileName(d.reviewed_by);
  const timeline: { label: string; at: string | null; icon: React.ElementType }[] = [
    { label: "Kaydedildi", at: d.created_at, icon: ScrollText },
    { label: "Karar verildi", at: d.decided_at, icon: CheckCircle2 },
    { label: "Yeniden açılış", at: d.review_at, icon: CalendarClock },
    { label: reviewerName ? `Kapatan: ${reviewerName}` : "Kapatıldı", at: d.reviewed_at, icon: RotateCcw },
  ];

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-4 p-4 lg:p-6">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2 h-7 text-muted-foreground">
            <Link to="/decisions"><ArrowLeft className="mr-1 h-3.5 w-3.5" /> Kararlar</Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{d.title}</h1>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{STATUS_LABELS[d.status] ?? d.status}</Badge>
            {d.verdict && <Badge className={VERDICT_TONE[d.verdict]}>{VERDICT_LABELS[d.verdict]}</Badge>}
            {d.reversibility && (
              <Badge variant="outline" className="gap-1">
                {d.reversibility === "one_way" ? <DoorClosed className="h-3 w-3" /> : <DoorOpen className="h-3 w-3" />}
                {REVERSIBILITY_LABELS[d.reversibility]}
              </Badge>
            )}
            {d.source_approval_id && <Badge variant="outline">Onaydan türedi</Badge>}
          </div>
        </div>

        {/* Bağlam / Karar / Gerekçe */}
        {(d.context || d.decision || d.rationale) && (
          <Card>
            <CardContent className="space-y-3 p-4">
              {d.context && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bağlam</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{d.context}</p>
                </div>
              )}
              {d.decision && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Karar</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{d.decision}</p>
                </div>
              )}
              {d.rationale && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Gerekçe</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{d.rationale}</p>
                </div>
              )}
              {d.reversibility_note && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kapı notu</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{d.reversibility_note}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Bahis */}
        {(d.expected_outcome || d.confidence !== null) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Target className="h-4 w-4 text-primary" /> Bahis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              {d.expected_outcome && <p className="text-sm">{d.expected_outcome}</p>}
              {d.confidence !== null && (
                <div className="flex items-center gap-3">
                  <Progress value={d.confidence} className="h-2 flex-1" />
                  <span className="text-sm font-medium">%{d.confidence} güven</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Donmuş An — DSoR vitrini */}
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Camera className="h-4 w-4 text-primary" /> Karar Günü Şirket Durumu
              {capturedAt && (
                <span className="font-normal text-xs text-muted-foreground">
                  · {fmtDate(capturedAt)} itibarıyla donduruldu, değiştirilemez
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Bu karar için an dondurulmadı{d.status === "proposed" ? " — taslaklar karar verilince dondurulur." : "."}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {entries.map((e) => {
                  const nowVal = todayByKey.get(e.key);
                  const delta = nowVal !== undefined ? nowVal - e.value : null;
                  // highIsBad alanlarda artış kötü; nakit/pipeline'da azalış kötü
                  const deltaBad = delta !== null && delta !== 0 && (e.highIsBad ? delta > 0 : delta < 0);
                  return (
                    <div key={e.key} className="rounded-md border border-border p-2.5">
                      <p className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">{e.label}</p>
                      <p className={cn(
                        "mt-0.5 text-lg font-semibold",
                        e.highIsBad && e.value > 0 && "text-destructive",
                      )}>
                        {e.format === "currency" ? formatCurrency(e.value, "USD") : e.value}
                      </p>
                      {delta !== null && (
                        <p className={cn(
                          "mt-0.5 text-[11px]",
                          delta === 0 ? "text-muted-foreground"
                            : deltaBad ? "text-destructive" : "text-success",
                        )}>
                          bugün: {e.format === "currency" ? formatCurrency(nowVal!, "USD") : nowVal}
                          {delta !== 0 && ` (${delta > 0 ? "+" : ""}${e.format === "currency" ? formatCurrency(delta, "USD") : delta})`}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sonuç / Yeniden Açılış */}
        <Card className={cn(due && "border-warning/40")}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <RotateCcw className="h-4 w-4 text-primary" /> Sonuç Döngüsü
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0">
            {d.verdict ? (
              <>
                <div className="flex items-center gap-2">
                  <Badge className={VERDICT_TONE[d.verdict]}>{VERDICT_LABELS[d.verdict]}</Badge>
                  {d.reviewed_at && (
                    <span className="text-xs text-muted-foreground">{fmtDate(d.reviewed_at)}</span>
                  )}
                  {d.reviewed_by && profileName(d.reviewed_by) && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <UserCheck className="h-3 w-3" /> {profileName(d.reviewed_by)}
                    </span>
                  )}
                </div>
                {d.actual_outcome && <p className="whitespace-pre-wrap text-sm">{d.actual_outcome}</p>}
              </>
            ) : due ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Hesap günü geldi. Beklentin{d.confidence !== null ? ` (%${d.confidence} güvenle)` : ""} gerçekleşti mi?
                </p>
                <div className="space-y-1.5">
                  <Label>Gerçekte ne oldu? (opsiyonel)</Label>
                  <Textarea value={actual} rows={2} onChange={(e) => setActual(e.target.value)}
                    placeholder="Kısa sonuç notu" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => close("held")} disabled={update.isPending}>
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Doğruydu
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => close("changed")} disabled={update.isPending}>
                    <MinusCircle className="mr-1 h-3.5 w-3.5" /> Değişti
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => close("wrong")} disabled={update.isPending}>
                    <XCircle className="mr-1 h-3.5 w-3.5" /> Yanlıştı
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {d.review_at
                  ? `Yeniden açılış: ${fmtDate(d.review_at)} (${formatDistanceToNow(new Date(d.review_at), { addSuffix: true, locale: tr })})`
                  : "Karar verildiğinde 90 günlük yeniden açılış otomatik planlanır."}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Zaman çizgisi */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {timeline.map((t) => (
                <div key={t.label} className="flex items-center gap-1.5 text-xs">
                  <t.icon className={cn("h-3.5 w-3.5", t.at ? "text-primary" : "text-muted-foreground/40")} />
                  <span className={t.at ? "text-foreground" : "text-muted-foreground/60"}>
                    {t.label}: {fmtDate(t.at)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bağlı kayıtlar (Company Graph) */}
        <RelatedObjectsPanel type="decision" id={d.id} />
      </div>
    </AppLayout>
  );
}
