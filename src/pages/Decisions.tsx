import { useState } from "react";
import { Link } from "react-router-dom";
import { DomainWorkspace } from "@/components/DomainWorkspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  useDecisions, useCreateDecision, useUpdateDecision, useReviewQueue,
  useSimilarDecisions,
} from "@/lib/graph-hooks";
import { summarizePrecedents } from "@/lib/precedent-utils";
import type { Decision, DecisionStatus, DecisionVerdict } from "@/lib/graph-types";
import {
  decisionFormSchema, validateWager, VERDICT_LABELS, REVERSIBILITY_LABELS,
  calibrationGap, calibrationBias, calibrationVerdict,
} from "@/lib/decision-utils";
import { Plus, ScrollText, Camera, RotateCcw, DoorOpen, DoorClosed, Gauge, Share2, Download } from "lucide-react";
import { buildCalibrationCard, downloadShareCard, shareCardFilename } from "@/lib/share-card";
import { DecisionReplay } from "@/components/decisions/DecisionReplay";
import { PreMortemDialog } from "@/components/decisions/PreMortemDialog";
import { DecisionContractPanel } from "@/components/decisions/DecisionContractPanel";
import { DecisionDebtCard } from "@/components/decisions/DecisionDebtCard";
import { AssumptionLedger } from "@/components/decisions/AssumptionLedger";
import { SilentDecisionRadar } from "@/components/decisions/SilentDecisionRadar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LIFECYCLE_LABELS, LIFECYCLE_TONE, type DecisionLifecycle } from "@/lib/decision-contract";
import { exportToCsv } from "@/lib/csv-utils";
import { formatDistanceToNow, format } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";

const STATUS_LABELS: Record<DecisionStatus, string> = {
  proposed: "Öneri", decided: "Karar Verildi", revisit: "Tekrar Görüşülecek", revoked: "İptal",
};
const STATUS_TONE: Record<DecisionStatus, string> = {
  proposed: "bg-blue-500/20 text-blue-300",
  decided: "bg-emerald-500/20 text-emerald-300",
  revisit: "bg-amber-500/20 text-warning",
  revoked: "bg-destructive/20 text-destructive-foreground",
};
const VERDICT_TONE: Record<DecisionVerdict, string> = {
  held: "bg-emerald-500/20 text-emerald-300",
  changed: "bg-amber-500/20 text-warning",
  wrong: "bg-destructive/20 text-destructive-foreground",
};

interface FormState {
  title: string;
  context: string;
  decision: string;
  rationale: string;
  status: DecisionStatus;
  expected_outcome: string;
  confidence: number;
  reversibility: "one_way" | "two_way" | "";
}

const EMPTY_FORM: FormState = {
  title: "", context: "", decision: "", rationale: "",
  status: "proposed", expected_outcome: "", confidence: 70, reversibility: "",
};

function ReviewCard({ d }: { d: Decision }) {
  const update = useUpdateDecision();
  const [actual, setActual] = useState("");

  const close = async (verdict: DecisionVerdict) => {
    try {
      await update.mutateAsync({ id: d.id, verdict, actual_outcome: actual.trim() || null });
      toast.success("Karar kapatıldı — külliyata bir sonuç etiketi daha eklendi");
    } catch (e) {
      toast.error("Kaydedilemedi: " + (e instanceof Error ? e.message : ""));
    }
  };

  return (
    <Card className="border-warning/40">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium">{d.title}</p>
            {d.decided_at && (
              <p className="text-xs text-muted-foreground">
                {format(new Date(d.decided_at), "d MMMM yyyy", { locale: tr })} tarihinde karar verildi
              </p>
            )}
          </div>
          <Badge variant="outline" className="shrink-0">
            <RotateCcw className="mr-1 h-3 w-3" /> Vadesi geldi
          </Badge>
        </div>

        {d.expected_outcome && (
          <div className="rounded-md bg-muted/50 p-3 text-sm">
            <span className="text-muted-foreground">O gün beklentin: </span>
            {d.expected_outcome}
            {d.confidence != null && (
              <span className="text-muted-foreground"> (güven: %{d.confidence})</span>
            )}
          </div>
        )}

        <Textarea
          placeholder="Gerçekte ne oldu? (opsiyonel ama külliyatı besleyen alan bu)"
          value={actual}
          onChange={(e) => setActual(e.target.value)}
          rows={2}
        />

        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1"
            disabled={update.isPending} onClick={() => close("held")}>
            {VERDICT_LABELS.held}
          </Button>
          <Button size="sm" variant="outline" className="flex-1"
            disabled={update.isPending} onClick={() => close("changed")}>
            {VERDICT_LABELS.changed}
          </Button>
          <Button size="sm" variant="outline" className="flex-1"
            disabled={update.isPending} onClick={() => close("wrong")}>
            {VERDICT_LABELS.wrong}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Karar defterini CSV'ye çıkarır (yatırımcı/board/muhasebeci paylaşımı). */
function exportDecisionsCsv(decisions: Decision[]) {
  exportToCsv(
    `kararlar-${new Date().toISOString().slice(0, 10)}.csv`,
    ["baslik", "durum", "karar", "gerekce", "bahis", "guven", "kapi_tipi",
     "karar_tarihi", "yeniden_acilis", "sonuc", "gerceklesen", "onaydan_turedi"],
    decisions.map((d) => [
      d.title,
      STATUS_LABELS[d.status] ?? d.status,
      d.decision ?? "",
      d.rationale ?? "",
      d.expected_outcome ?? "",
      d.confidence ?? "",
      d.reversibility ? REVERSIBILITY_LABELS[d.reversibility] : "",
      d.decided_at?.slice(0, 10) ?? "",
      d.review_at?.slice(0, 10) ?? "",
      d.verdict ? VERDICT_LABELS[d.verdict] : "",
      d.actual_outcome ?? "",
      d.source_approval_id ? "evet" : "hayır",
    ]),
  );
}

/**
 * Emsal paneli (F5): yeni karar formunda, başlığa benzeyen geçmiş kararlar
 * ve sonuçları. "Şirket kendi geçmişinden öğrenir" vaadinin form içi hali.
 */
function SimilarDecisionsPanel({ title }: { title: string }) {
  const { data: similar } = useSimilarDecisions(title);
  if (!similar || similar.length === 0) return null;

  const summary = summarizePrecedents(similar.map((d) => ({ verdict: d.verdict })));

  return (
    <div className="rounded-md border border-primary/25 bg-primary/5 p-3 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
        Benzer geçmiş kararların
      </p>
      <ul className="mt-1.5 space-y-1">
        {similar.map((d) => (
          <li key={d.id} className="flex items-center gap-2 text-[13px]">
            <Link to={`/decisions/${d.id}`} className="truncate hover:underline">
              {d.title}
            </Link>
            <span className="shrink-0 text-xs text-muted-foreground">
              {d.verdict
                ? `${VERDICT_LABELS[d.verdict]}${d.confidence !== null ? ` · %${d.confidence} güvenle` : ""}`
                : STATUS_LABELS[d.status] ?? d.status}
            </span>
          </li>
        ))}
      </ul>
      {summary.sentence && (
        <p className="mt-2 text-xs text-muted-foreground">{summary.sentence}</p>
      )}
    </div>
  );
}

/**
 * Kalibrasyon karnesi (PRD Görev 4): workspace'in kapanmış (verdict'li)
 * kararları üzerinden ortalama sapma. 3'ten az kapanmış kararda görünmez.
 */
function CalibrationCard({ decisions }: { decisions: Decision[] }) {
  const closed = decisions
    .filter((d) => d.verdict && d.confidence !== null && d.confidence !== undefined)
    .map((d) => ({ confidence: d.confidence as number, verdict: d.verdict as DecisionVerdict }));

  const gap = calibrationGap(closed);
  const bias = calibrationBias(closed);
  if (gap === null || bias === null) return null;

  const verdict = calibrationVerdict(gap, bias);
  const tone = {
    good: "border-success/40",
    medium: "border-warning/40",
    extreme: "border-destructive/50",
  }[verdict.tier];

  return (
    <Card className={tone}>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <Gauge className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">Kalibrasyon Karnesi</p>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
              {closed.length} kapanmış karar
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Ortalama sapma <span className="font-medium text-foreground">{gap} puan</span> —{" "}
            <span className="font-medium text-foreground">{verdict.label}</span>. {verdict.comment}
          </p>
        </div>
        <Button
          size="sm" variant="ghost" className="shrink-0"
          title="Karneyi görsel kart olarak indir"
          onClick={() => downloadShareCard(
            buildCalibrationCard({ gap, label: verdict.label, closedCount: closed.length }),
            shareCardFilename("kalibrasyon", new Date()),
          )}
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Decisions() {
  const { data: decisions, isLoading } = useDecisions();
  const { data: reviewQueue } = useReviewQueue();
  const create = useCreateDecision();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const submit = async () => {
    const parsed = decisionFormSchema.safeParse({
      ...form,
      reversibility: form.reversibility || null,
      confidence: form.status === "decided" ? form.confidence : null,
    });
    if (!parsed.success) {
      return toast.error(parsed.error.issues[0]?.message ?? "Form geçersiz");
    }
    const wagerError = validateWager(parsed.data);
    if (wagerError) return toast.error(wagerError);

    try {
      await create.mutateAsync({
        title: parsed.data.title,
        context: parsed.data.context || null,
        decision: parsed.data.decision || null,
        rationale: parsed.data.rationale || null,
        status: parsed.data.status,
        expected_outcome: parsed.data.expected_outcome || null,
        confidence: parsed.data.confidence ?? null,
        reversibility: parsed.data.reversibility ?? null,
      });
      toast.success(
        form.status === "decided"
          ? "Karar kaydedildi — şirket durumu donduruldu, 90 gün sonra yeniden açılacak"
          : "Karar kaydedildi",
      );
      setOpen(false);
      setForm(EMPTY_FORM);
    } catch (e) {
      toast.error("Kaydedilemedi: " + (e instanceof Error ? e.message : ""));
    }
  };

  return (
    <DomainWorkspace domain="decisions" title="Karar Kaydı" subtitle="Verdiğin kararı, bağlamını ve sonucunu kayıt altına al (DSoR).">
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Kararlar</h1>
            <p className="text-sm text-muted-foreground">
              Şirketin karar defteri — her karar, verildiği andaki bağlamla birlikte
            </p>
          </div>
          <div className="flex items-center gap-2">
            {decisions && decisions.length > 0 && (
              <Button variant="outline" onClick={() => exportDecisionsCsv(decisions)}>
                <Download className="mr-2 h-4 w-4" /> CSV
              </Button>
            )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Karar Ekle</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader><DialogTitle>Yeni Karar</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Başlık *</Label>
                  <Input value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Örn: Kurumsal fiyatı %20 artır" />
                </div>
                <SimilarDecisionsPanel title={form.title} />
                <div className="space-y-1.5">
                  <Label>Bağlam</Label>
                  <Textarea value={form.context} rows={2}
                    onChange={(e) => setForm({ ...form, context: e.target.value })}
                    placeholder="Bu karar neden gündeme geldi?" />
                </div>
                <div className="space-y-1.5">
                  <Label>Karar</Label>
                  <Textarea value={form.decision} rows={2}
                    onChange={(e) => setForm({ ...form, decision: e.target.value })}
                    placeholder="Ne yapılacak?" />
                </div>
                <div className="space-y-1.5">
                  <Label>Gerekçe</Label>
                  <Textarea value={form.rationale} rows={2}
                    onChange={(e) => setForm({ ...form, rationale: e.target.value })}
                    placeholder="Neden bu yol? Hangi alternatifler elendi?" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Durum</Label>
                    <Select value={form.status}
                      onValueChange={(v) => setForm({ ...form, status: v as DecisionStatus })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(STATUS_LABELS) as DecisionStatus[]).map((s) => (
                          <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Kapı tipi</Label>
                    <Select value={form.reversibility}
                      onValueChange={(v) =>
                        setForm({ ...form, reversibility: v as FormState["reversibility"] })}>
                      <SelectTrigger><SelectValue placeholder="Seç" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="two_way">
                          {REVERSIBILITY_LABELS.two_way} — geri alınabilir
                        </SelectItem>
                        <SelectItem value="one_way">
                          {REVERSIBILITY_LABELS.one_way} — geri dönüşü yok
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {form.status === "decided" && (
                  <div className="space-y-4 rounded-md border border-emerald-500/30 bg-success/5 p-3">
                    <div className="space-y-1.5">
                      <Label>Bahis: 90 gün sonra bu nasıl görünecek? *</Label>
                      <Input value={form.expected_outcome}
                        onChange={(e) => setForm({ ...form, expected_outcome: e.target.value })}
                        placeholder="Tek cümle — örn: Churn %3 artar, gelir %15 artar" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Güven: %{form.confidence}</Label>
                      <Slider value={[form.confidence]} min={0} max={100} step={5}
                        onValueChange={([v]) => setForm({ ...form, confidence: v })} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Kaydettiğin anda şirketin o günkü durumu dondurulur ve karar
                      90 gün sonra otomatik olarak önüne gelir.
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button onClick={submit} disabled={create.isPending}>Kaydet</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active">Kararlar</TabsTrigger>
            <TabsTrigger value="radar">Sessiz Karar Radarı</TabsTrigger>
            <TabsTrigger value="assumptions">Varsayım Defteri</TabsTrigger>
            <TabsTrigger value="debt">Karar Borcu</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-6">
        {decisions && <CalibrationCard decisions={decisions} />}

        {reviewQueue && reviewQueue.length > 0 && (
          <div className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-medium text-warning">
              <RotateCcw className="h-4 w-4" />
              Yeniden Açılış — hesap günü gelen {reviewQueue.length} karar
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {reviewQueue.map((d) => <ReviewCard key={d.id} d={d} />)}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : !decisions?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <ScrollText className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">Henüz kayıtlı karar yok</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Founder Inbox'ta onayladığın her talep otomatik olarak buraya
                karar kaydı düşer. Büyük kararları ise bahisleriyle birlikte elle ekle.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {decisions.map((d) => {
              const lifecycle = ((d as unknown as { lifecycle_state?: DecisionLifecycle })
                .lifecycle_state ?? "framed") as DecisionLifecycle;
              const reopenReason = (d as unknown as { reopen_reason?: string | null }).reopen_reason;
              return (
              <Card key={d.id} className="transition-colors hover:border-primary/50">
                <CardContent className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/decisions/${d.id}`} className="font-medium hover:underline">
                      {d.title}
                    </Link>
                    <Badge className={LIFECYCLE_TONE[lifecycle]}>{LIFECYCLE_LABELS[lifecycle]}</Badge>
                    <Badge className={STATUS_TONE[d.status]}>{STATUS_LABELS[d.status]}</Badge>
                    {d.verdict && (
                      <Badge className={VERDICT_TONE[d.verdict]}>
                        {VERDICT_LABELS[d.verdict]}
                      </Badge>
                    )}
                    {d.reversibility && (
                      <Badge variant="outline" className="gap-1">
                        {d.reversibility === "one_way"
                          ? <DoorClosed className="h-3 w-3" />
                          : <DoorOpen className="h-3 w-3" />}
                        {REVERSIBILITY_LABELS[d.reversibility]}
                      </Badge>
                    )}
                    {d.state_snapshot && (
                      <Badge variant="outline" className="gap-1" title="Karar anındaki şirket durumu donduruldu">
                        <Camera className="h-3 w-3" /> An donduruldu
                      </Badge>
                    )}
                    {d.source_approval_id && (
                      <Badge variant="outline">Onaydan türedi</Badge>
                    )}
                  </div>

                  {d.decision && <p className="text-sm text-muted-foreground">{d.decision}</p>}

                  {reopenReason && (
                    <p className="rounded-md bg-warning/10 p-2 text-xs text-warning">
                      Yeniden açıldı — {reopenReason}
                    </p>
                  )}

                  {d.expected_outcome && (
                    <p className="text-xs text-muted-foreground">
                      Bahis: {d.expected_outcome}
                      {d.confidence != null && ` (güven %${d.confidence})`}
                    </p>
                  )}
                  {d.actual_outcome && (
                    <p className="text-xs text-muted-foreground">Gerçekleşen: {d.actual_outcome}</p>
                  )}

                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(d.created_at), { addSuffix: true, locale: tr })}
                    {d.review_at && !d.verdict && d.status === "decided" && (
                      <> · yeniden açılış: {format(new Date(d.review_at), "d MMM yyyy", { locale: tr })}</>
                    )}
                  </p>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <DecisionContractPanel decisionId={d.id} title={d.title} lifecycleState={lifecycle} />
                    <DecisionReplay decision={d} />
                    {d.status !== "revoked" && <PreMortemDialog decision={d} />}
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}
          </TabsContent>

          <TabsContent value="radar">
            <SilentDecisionRadar />
          </TabsContent>

          <TabsContent value="assumptions">
            <AssumptionLedger />
          </TabsContent>

          <TabsContent value="debt">
            <DecisionDebtCard />
          </TabsContent>
        </Tabs>
      </div>
    </DomainWorkspace>
  );
}
