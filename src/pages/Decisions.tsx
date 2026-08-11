import { useState, useMemo } from "react";
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
  useSimilarDecisions, useObjectLinks,
} from "@/lib/graph-hooks";
import { summarizePrecedents } from "@/lib/precedent-utils";
import type { Decision, DecisionStatus, DecisionVerdict, ObjectLink, LinkableType } from "@/lib/graph-types";
import { LINKABLE_LABELS } from "@/lib/graph-types";
import {
  decisionFormSchema, validateWager, VERDICT_LABELS, REVERSIBILITY_LABELS,
  calibrationGap, calibrationBias, calibrationVerdict,
} from "@/lib/decision-utils";
import {
  Plus, ScrollText, Camera, RotateCcw, DoorOpen, DoorClosed, Gauge, Share2,
  Download, Network, TrendingUp, TrendingDown, Users, Target,
} from "lucide-react";
import { buildCalibrationCard, downloadShareCard, shareCardFilename } from "@/lib/share-card";
import { DecisionReplay } from "@/components/decisions/DecisionReplay";
import { PreMortemDialog } from "@/components/decisions/PreMortemDialog";
import { DecisionContractPanel } from "@/components/decisions/DecisionContractPanel";
import { DecisionDebtCard } from "@/components/decisions/DecisionDebtCard";
import { AssumptionLedger } from "@/components/decisions/AssumptionLedger";
import { SilentDecisionRadar } from "@/components/decisions/SilentDecisionRadar";
import { RelatedObjectsPanel } from "@/components/graph/RelatedObjectsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LIFECYCLE_LABELS, LIFECYCLE_TONE, type DecisionLifecycle } from "@/lib/decision-contract";
import { exportToCsv } from "@/lib/csv-utils";
import { formatDistanceToNow, format } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";

const STATUS_LABELS: Record<DecisionStatus, string> = {
  proposed: "Oneri", decided: "Karar Verildi", revisit: "Tekrar Gorusulecek", revoked: "Iptal",
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

/** Types relevant for impact analysis grouping */
const IMPACT_TYPES: LinkableType[] = [
  "project", "product.feature", "product.release", "goal", "risk", "employee",
  "finance.expense", "finance.budget", "finance.invoice",
];

const IMPACT_GROUP_LABELS: Partial<Record<LinkableType, string>> = {
  project: "Projeye Gore",
  goal: "Hedefe Gore",
  risk: "Riske Gore",
  employee: "Ekip Uyesine Gore",
  "product.feature": "Feature'a Gore",
  "finance.expense": "Gidere Gore",
  "finance.budget": "Butceye Gore",
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
  estimated_impact: string;
  affected_team: string;
}

const EMPTY_FORM: FormState = {
  title: "", context: "", decision: "", rationale: "",
  status: "proposed", expected_outcome: "", confidence: 70, reversibility: "",
  estimated_impact: "", affected_team: "",
};

/** Summarize linked object types into a short badge label like "3 proje, 2 risk" */
function buildImpactSummary(links: ObjectLink[] | undefined, selfType: LinkableType, selfId: string): string | null {
  if (!links || links.length === 0) return null;
  const counts: Partial<Record<LinkableType, number>> = {};
  for (const link of links) {
    const isFrom = link.from_type === selfType && link.from_id === selfId;
    const otherType = isFrom ? link.to_type : link.from_type;
    counts[otherType] = (counts[otherType] ?? 0) + 1;
  }
  const parts: string[] = [];
  for (const t of IMPACT_TYPES) {
    if (counts[t]) {
      parts.push(`${counts[t]} ${LINKABLE_LABELS[t]?.toLowerCase() ?? t}`);
    }
  }
  // include any remaining types not in IMPACT_TYPES
  for (const [t, c] of Object.entries(counts)) {
    if (!IMPACT_TYPES.includes(t as LinkableType)) {
      parts.push(`${c} ${LINKABLE_LABELS[t as LinkableType]?.toLowerCase() ?? t}`);
    }
  }
  return parts.length > 0 ? parts.join(", ") : null;
}

/** Impact summary badge shown inline on each decision card */
function ImpactBadge({ decisionId }: { decisionId: string }) {
  const { data: links } = useObjectLinks("decision", decisionId);
  const summary = buildImpactSummary(links, "decision", decisionId);
  if (!summary) return null;
  return (
    <Badge variant="outline" className="gap-1 text-[10px]">
      <Network className="h-3 w-3" /> {summary}
    </Badge>
  );
}

/** Expandable impact analysis section inside each decision card */
function ImpactAnalysisSection({ decision }: { decision: Decision }) {
  const [expanded, setExpanded] = useState(false);
  const d = decision as Decision & { estimated_impact?: string | null; affected_team?: string | null };

  const hasMetadata = !!(d.estimated_impact || d.affected_team);

  return (
    <div className="space-y-2">
      <Button
        variant="ghost" size="sm"
        className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setExpanded(!expanded)}
      >
        <Target className="h-3.5 w-3.5" />
        Etki Analizi
        {expanded ? " ▴" : " ▾"}
      </Button>

      {expanded && (
        <div className="space-y-3 rounded-md border border-primary/20 bg-muted/30 p-3">
          {hasMetadata && (
            <div className="space-y-1.5">
              {d.estimated_impact && (
                <div className="flex items-start gap-2 text-sm">
                  <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Tahmini Finansal Etki: </span>
                    <span className="text-sm">{d.estimated_impact}</span>
                  </div>
                </div>
              )}
              {d.affected_team && (
                <div className="flex items-start gap-2 text-sm">
                  <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-400" />
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Etkilenen Ekip: </span>
                    <span className="text-sm">{d.affected_team}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <RelatedObjectsPanel type="decision" id={decision.id} title="Etkilenen Kayitlar" />
        </div>
      )}
    </div>
  );
}

function ReviewCard({ d }: { d: Decision }) {
  const update = useUpdateDecision();
  const [actual, setActual] = useState("");

  const close = async (verdict: DecisionVerdict) => {
    try {
      await update.mutateAsync({ id: d.id, verdict, actual_outcome: actual.trim() || null });
      toast.success("Karar kapatildi -- kulliyata bir sonuc etiketi daha eklendi");
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
            <span className="text-muted-foreground">O gun beklentin: </span>
            {d.expected_outcome}
            {d.confidence != null && (
              <span className="text-muted-foreground"> (guven: %{d.confidence})</span>
            )}
          </div>
        )}

        <Textarea
          placeholder="Gercekte ne oldu? (opsiyonel ama kulliyati besleyen alan bu)"
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

/** Karar defterini CSV'ye cikarir (yatirimci/board/muhasebeci paylasimi). */
function exportDecisionsCsv(decisions: Decision[]) {
  exportToCsv(
    `kararlar-${new Date().toISOString().slice(0, 10)}.csv`,
    ["baslik", "durum", "karar", "gerekce", "bahis", "guven", "kapi_tipi",
     "karar_tarihi", "yeniden_acilis", "sonuc", "gerceklesen", "onaydan_turedi",
     "tahmini_etki", "etkilenen_ekip"],
    decisions.map((d) => {
      const ext = d as Decision & { estimated_impact?: string | null; affected_team?: string | null };
      return [
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
        d.source_approval_id ? "evet" : "hayir",
        ext.estimated_impact ?? "",
        ext.affected_team ?? "",
      ];
    }),
  );
}

/**
 * Emsal paneli (F5): yeni karar formunda, baslica benzeyen gecmis kararlar
 * ve sonuclari. "Sirket kendi gecmisinden ogrenir" vaadinin form ici hali.
 */
function SimilarDecisionsPanel({ title }: { title: string }) {
  const { data: similar } = useSimilarDecisions(title);
  if (!similar || similar.length === 0) return null;

  const summary = summarizePrecedents(similar.map((d) => ({ verdict: d.verdict })));

  return (
    <div className="rounded-md border border-primary/25 bg-primary/5 p-3 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
        Benzer gecmis kararlarin
      </p>
      <ul className="mt-1.5 space-y-1">
        {similar.map((d) => (
          <li key={d.id} className="flex items-center gap-2 text-[13px]">
            <Link to={`/decisions/${d.id}`} className="truncate hover:underline">
              {d.title}
            </Link>
            <span className="shrink-0 text-xs text-muted-foreground">
              {d.verdict
                ? `${VERDICT_LABELS[d.verdict]}${d.confidence !== null ? ` · %${d.confidence} guvenle` : ""}`
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
 * Kalibrasyon karnesi (PRD Gorev 4): workspace'in kapanmis (verdict'li)
 * kararlari uzerinden ortalama sapma. 3'ten az kapanmis kararda gorunmez.
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
              {closed.length} kapanmis karar
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Ortalama sapma <span className="font-medium text-foreground">{gap} puan</span> --{" "}
            <span className="font-medium text-foreground">{verdict.label}</span>. {verdict.comment}
          </p>
        </div>
        <Button
          size="sm" variant="ghost" className="shrink-0"
          title="Karneyi gorsel kart olarak indir"
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

/**
 * Karar Haritasi (Decision Map): decisions grouped by what they affect.
 * Uses object links to cluster decisions under projects, goals, risks, etc.
 */
function DecisionMap({ decisions }: { decisions: Decision[] }) {
  // Fetch links for all decisions -- each card fetches its own via useObjectLinks,
  // but for the map we aggregate. We use a collector component pattern.
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Kararlarin etkiledigi proje, hedef, risk ve diger kayitlara gore gruplanmis gorunumu.
        Bir karari bir kayda baglamak icin karar kartindaki "Etki Analizi" bolumunu kullanin.
      </p>
      {IMPACT_TYPES.filter((t) => IMPACT_GROUP_LABELS[t]).map((groupType) => (
        <DecisionMapGroup key={groupType} groupType={groupType} decisions={decisions} />
      ))}
    </div>
  );
}

/** A single group in the Decision Map -- shows decisions linked to objects of this type */
function DecisionMapGroup({ groupType, decisions }: { groupType: LinkableType; decisions: Decision[] }) {
  // We collect which decisions link to which target of this type.
  // Each decision card already has its links loaded via ImpactBadge / ImpactAnalysisSection,
  // but here we need a per-decision query. We render a collector for each decision.
  return (
    <DecisionMapGroupInner groupType={groupType} decisions={decisions} />
  );
}

function DecisionMapGroupInner({ groupType, decisions }: { groupType: LinkableType; decisions: Decision[] }) {
  // For each decision, we need its links. To avoid N queries in a loop (hook rules),
  // we render sub-components that each call useObjectLinks and report back via a shared map.
  // Instead, we use a simpler approach: render one collector per decision.
  const [groups, setGroups] = useState<Record<string, string[]>>({});

  const handleLinks = useMemo(() => {
    return (decisionId: string, links: ObjectLink[] | undefined) => {
      if (!links) return;
      const targetIds: string[] = [];
      for (const link of links) {
        const isFrom = link.from_type === "decision" && link.from_id === decisionId;
        const otherType = isFrom ? link.to_type : link.from_type;
        const otherId = isFrom ? link.to_id : link.from_id;
        if (otherType === groupType) {
          targetIds.push(otherId);
        }
      }
      if (targetIds.length > 0) {
        setGroups((prev) => {
          const next = { ...prev };
          for (const tid of targetIds) {
            if (!next[tid]) next[tid] = [];
            if (!next[tid].includes(decisionId)) {
              next[tid] = [...next[tid], decisionId];
            }
          }
          return next;
        });
      }
    };
  }, [groupType]);

  const decisionMap = useMemo(() => {
    const m = new Map<string, Decision>();
    for (const d of decisions) m.set(d.id, d);
    return m;
  }, [decisions]);

  const groupEntries = Object.entries(groups);

  return (
    <>
      {/* Hidden collectors that call useObjectLinks for each decision */}
      {decisions.map((d) => (
        <LinkCollector key={d.id} decisionId={d.id} onLinks={handleLinks} />
      ))}
      {groupEntries.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              {IMPACT_GROUP_LABELS[groupType]}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {groupEntries.map(([targetId, decisionIds]) => (
              <div key={targetId} className="space-y-1">
                <p className="text-xs font-mono text-muted-foreground">
                  {LINKABLE_LABELS[groupType]} {targetId.slice(0, 8)}...
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {decisionIds.map((did) => {
                    const dec = decisionMap.get(did);
                    return dec ? (
                      <Link key={did} to={`/decisions/${did}`}>
                        <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">
                          {dec.title}
                        </Badge>
                      </Link>
                    ) : null;
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </>
  );
}

/** Invisible component that fetches links for a single decision and reports them up */
function LinkCollector({
  decisionId,
  onLinks,
}: {
  decisionId: string;
  onLinks: (decisionId: string, links: ObjectLink[] | undefined) => void;
}) {
  const { data: links } = useObjectLinks("decision", decisionId);
  useMemo(() => {
    onLinks(decisionId, links);
  }, [decisionId, links, onLinks]);
  return null;
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
      return toast.error(parsed.error.issues[0]?.message ?? "Form gecersiz");
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
        estimated_impact: form.estimated_impact.trim() || null,
        affected_team: form.affected_team.trim() || null,
      } as Parameters<typeof create.mutateAsync>[0]);
      toast.success(
        form.status === "decided"
          ? "Karar kaydedildi -- sirket durumu donduruldu, 90 gun sonra yeniden acilacak"
          : "Karar kaydedildi",
      );
      setOpen(false);
      setForm(EMPTY_FORM);
    } catch (e) {
      toast.error("Kaydedilemedi: " + (e instanceof Error ? e.message : ""));
    }
  };

  return (
    <DomainWorkspace domain="decisions" title="Karar Kaydi" subtitle="Verdigin karari, baglamini ve sonucunu kayit altina al (DSoR).">
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Kararlar</h1>
            <p className="text-sm text-muted-foreground">
              Sirketin karar defteri -- her karar, verildigi andaki baglamla birlikte
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
                  <Label>Baslik *</Label>
                  <Input value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Orn: Kurumsal fiyati %20 artir" />
                </div>
                <SimilarDecisionsPanel title={form.title} />
                <div className="space-y-1.5">
                  <Label>Baglam</Label>
                  <Textarea value={form.context} rows={2}
                    onChange={(e) => setForm({ ...form, context: e.target.value })}
                    placeholder="Bu karar neden gundeme geldi?" />
                </div>
                <div className="space-y-1.5">
                  <Label>Karar</Label>
                  <Textarea value={form.decision} rows={2}
                    onChange={(e) => setForm({ ...form, decision: e.target.value })}
                    placeholder="Ne yapilacak?" />
                </div>
                <div className="space-y-1.5">
                  <Label>Gerekce</Label>
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
                    <Label>Kapi tipi</Label>
                    <Select value={form.reversibility}
                      onValueChange={(v) =>
                        setForm({ ...form, reversibility: v as FormState["reversibility"] })}>
                      <SelectTrigger><SelectValue placeholder="Sec" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="two_way">
                          {REVERSIBILITY_LABELS.two_way} -- geri alinabilir
                        </SelectItem>
                        <SelectItem value="one_way">
                          {REVERSIBILITY_LABELS.one_way} -- geri donusu yok
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Etki Analizi alanlari */}
                <div className="space-y-3 rounded-md border border-blue-500/20 bg-blue-500/5 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">
                    Etki Analizi
                  </p>
                  <div className="space-y-1.5">
                    <Label>Tahmini Finansal Etki (gelir/gider)</Label>
                    <Input value={form.estimated_impact}
                      onChange={(e) => setForm({ ...form, estimated_impact: e.target.value })}
                      placeholder="Orn: Aylik gelir +$15K, sunucu maliyeti +$2K" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Etkilenen Ekip Uyeleri</Label>
                    <Input value={form.affected_team}
                      onChange={(e) => setForm({ ...form, affected_team: e.target.value })}
                      placeholder="Orn: Backend ekibi, Satis, Ahmet K." />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Karar kaydedildikten sonra Etki Analizi bolumunden proje, hedef,
                    risk gibi kayitlari da baglayabilirsiniz.
                  </p>
                </div>

                {form.status === "decided" && (
                  <div className="space-y-4 rounded-md border border-emerald-500/30 bg-success/5 p-3">
                    <div className="space-y-1.5">
                      <Label>Bahis: 90 gun sonra bu nasil gorunecek? *</Label>
                      <Input value={form.expected_outcome}
                        onChange={(e) => setForm({ ...form, expected_outcome: e.target.value })}
                        placeholder="Tek cumle -- orn: Churn %3 artar, gelir %15 artar" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Guven: %{form.confidence}</Label>
                      <Slider value={[form.confidence]} min={0} max={100} step={5}
                        onValueChange={([v]) => setForm({ ...form, confidence: v })} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Kaydettigin anda sirketin o gunki durumu dondurulur ve karar
                      90 gun sonra otomatik olarak onune gelir.
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
            <TabsTrigger value="map">Karar Haritasi</TabsTrigger>
            <TabsTrigger value="radar">Sessiz Karar Radari</TabsTrigger>
            <TabsTrigger value="assumptions">Varsayim Defteri</TabsTrigger>
            <TabsTrigger value="debt">Karar Borcu</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-6">
        {decisions && <CalibrationCard decisions={decisions} />}

        {reviewQueue && reviewQueue.length > 0 && (
          <div className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-medium text-warning">
              <RotateCcw className="h-4 w-4" />
              Yeniden Acilis -- hesap gunu gelen {reviewQueue.length} karar
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
              <p className="font-medium">Henuz kayitli karar yok</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Founder Inbox'ta onayladigin her talep otomatik olarak buraya
                karar kaydi duser. Buyuk kararlari ise bahisleriyle birlikte elle ekle.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {decisions.map((d) => {
              const lifecycle = ((d as unknown as { lifecycle_state?: DecisionLifecycle })
                .lifecycle_state ?? "framed") as DecisionLifecycle;
              const reopenReason = (d as unknown as { reopen_reason?: string | null }).reopen_reason;
              const ext = d as Decision & { estimated_impact?: string | null; affected_team?: string | null };
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
                      <Badge variant="outline" className="gap-1" title="Karar anindaki sirket durumu donduruldu">
                        <Camera className="h-3 w-3" /> An donduruldu
                      </Badge>
                    )}
                    {d.source_approval_id && (
                      <Badge variant="outline">Onaydan turedi</Badge>
                    )}
                    <ImpactBadge decisionId={d.id} />
                  </div>

                  {d.decision && <p className="text-sm text-muted-foreground">{d.decision}</p>}

                  {reopenReason && (
                    <p className="rounded-md bg-warning/10 p-2 text-xs text-warning">
                      Yeniden acildi -- {reopenReason}
                    </p>
                  )}

                  {d.expected_outcome && (
                    <p className="text-xs text-muted-foreground">
                      Bahis: {d.expected_outcome}
                      {d.confidence != null && ` (guven %${d.confidence})`}
                    </p>
                  )}
                  {d.actual_outcome && (
                    <p className="text-xs text-muted-foreground">Gerceklesen: {d.actual_outcome}</p>
                  )}

                  {ext.estimated_impact && (
                    <p className="text-xs text-muted-foreground">
                      <TrendingUp className="mr-1 inline h-3 w-3 text-emerald-400" />
                      Finansal etki: {ext.estimated_impact}
                    </p>
                  )}
                  {ext.affected_team && (
                    <p className="text-xs text-muted-foreground">
                      <Users className="mr-1 inline h-3 w-3 text-blue-400" />
                      Ekip: {ext.affected_team}
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(d.created_at), { addSuffix: true, locale: tr })}
                    {d.review_at && !d.verdict && d.status === "decided" && (
                      <> -- yeniden acilis: {format(new Date(d.review_at), "d MMM yyyy", { locale: tr })}</>
                    )}
                  </p>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <DecisionContractPanel decisionId={d.id} title={d.title} lifecycleState={lifecycle} />
                    <DecisionReplay decision={d} />
                    {d.status !== "revoked" && <PreMortemDialog decision={d} />}
                  </div>

                  <ImpactAnalysisSection decision={d} />
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}
          </TabsContent>

          <TabsContent value="map">
            {decisions && decisions.length > 0 ? (
              <DecisionMap decisions={decisions} />
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Karar haritasini gormek icin once karar ekleyin ve kayitlarla baglanti kurun.
                </CardContent>
              </Card>
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
