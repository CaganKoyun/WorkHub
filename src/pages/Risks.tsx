import { useState, useMemo, Fragment } from "react";
import { DomainWorkspace } from "@/components/DomainWorkspace";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RelatedObjectsPanel } from "@/components/graph/RelatedObjectsPanel";
import { useRisks, useCreateRisk } from "@/lib/graph-hooks";
import {
  RISK_LEVEL_LABELS, RISK_LEVEL_COLORS,
  type RiskLevel, type RiskStatus, type Risk,
} from "@/lib/graph-types";
import {
  Plus, ShieldAlert, AlertTriangle, ShieldCheck, ShieldX,
  Activity, ChevronDown, ChevronRight, Link2, Filter, X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<RiskStatus, string> = {
  open: "Acik", mitigating: "Azaltiliyor", accepted: "Kabul", closed: "Kapali",
};

// Risk score color based on likelihood x impact
function scoreColor(score: number): string {
  if (score >= 20) return "bg-red-500/20 text-red-700 dark:text-red-400";
  if (score >= 13) return "bg-orange-500/20 text-orange-700 dark:text-orange-400";
  if (score >= 6) return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400";
  return "bg-green-500/20 text-green-700 dark:text-green-400";
}

function scoreBorder(score: number): string {
  if (score >= 20) return "border-red-500";
  if (score >= 13) return "border-orange-500";
  if (score >= 6) return "border-yellow-500";
  return "border-green-500";
}

// 5x5 matrix cell color
function matrixCellColor(likelihood: number, impact: number): string {
  const score = likelihood * impact;
  if (score >= 20) return "bg-red-500 text-white";
  if (score >= 15) return "bg-red-400 text-white";
  if (score >= 10) return "bg-orange-400 text-white";
  if (score >= 6) return "bg-yellow-400 text-yellow-950";
  if (score >= 3) return "bg-yellow-300 text-yellow-950";
  return "bg-green-400 text-green-950";
}

function RiskMatrix({ risks }: { risks: Risk[] }) {
  // Build count map: key = "likelihood-impact"
  const countMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of risks) {
      const key = `${r.likelihood}-${r.impact}`;
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return m;
  }, [risks]);

  const labels = [1, 2, 3, 4, 5];

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold text-base">Risk Matrisi</h3>
          <span className="text-xs text-muted-foreground ml-1">Olasilik x Etki</span>
        </div>

        <div className="flex gap-2">
          {/* Y-axis label */}
          <div className="flex flex-col items-center justify-center">
            <span className="text-xs text-muted-foreground [writing-mode:vertical-lr] rotate-180 tracking-widest">
              OLASILIK
            </span>
          </div>

          <div className="flex-1">
            {/* Grid rows: likelihood 5 at top, 1 at bottom */}
            <div className="space-y-1">
              {[5, 4, 3, 2, 1].map(likelihood => (
                <div key={likelihood} className="flex items-center gap-1">
                  <span className="w-5 text-xs text-muted-foreground text-right font-mono">
                    {likelihood}
                  </span>
                  {labels.map(impact => {
                    const count = countMap.get(`${likelihood}-${impact}`) ?? 0;
                    return (
                      <div
                        key={impact}
                        className={cn(
                          "flex-1 aspect-square flex items-center justify-center rounded-md text-sm font-bold transition-all min-w-[2.5rem]",
                          matrixCellColor(likelihood, impact),
                          count > 0 ? "ring-2 ring-offset-1 ring-foreground/30" : "opacity-70"
                        )}
                        title={`Olasilik: ${likelihood}, Etki: ${impact}, Skor: ${likelihood * impact}, Risk: ${count}`}
                      >
                        {count > 0 ? count : ""}
                      </div>
                    );
                  })}
                </div>
              ))}
              {/* X-axis labels */}
              <div className="flex items-center gap-1">
                <span className="w-5" />
                {labels.map(impact => (
                  <div key={impact} className="flex-1 text-center text-xs text-muted-foreground font-mono">
                    {impact}
                  </div>
                ))}
              </div>
              <div className="text-center text-xs text-muted-foreground tracking-widest mt-1">
                ETKI
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Risks() {
  const { data: risks, isLoading } = useRisks();
  const create = useCreateRisk();
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterLevel, setFilterLevel] = useState<RiskLevel | "all">("all");
  const [filterStatus, setFilterStatus] = useState<RiskStatus | "all">("all");
  const [form, setForm] = useState({
    title: "", description: "", mitigation: "",
    status: "open" as RiskStatus, level: "medium" as RiskLevel,
    likelihood: 3, impact: 3,
  });

  const stats = useMemo(() => {
    const r = risks ?? [];
    return {
      total: r.length,
      criticalHigh: r.filter(x => x.level === "critical" || x.level === "high").length,
      open: r.filter(x => x.status === "open" || x.status === "mitigating").length,
      mitigated: r.filter(x => x.status === "accepted" || x.status === "closed").length,
    };
  }, [risks]);

  const filtered = useMemo(() => {
    let r = risks ?? [];
    if (filterLevel !== "all") r = r.filter(x => x.level === filterLevel);
    if (filterStatus !== "all") r = r.filter(x => x.status === filterStatus);
    // Sort by score descending
    return [...r].sort((a, b) => (b.likelihood * b.impact) - (a.likelihood * a.impact));
  }, [risks, filterLevel, filterStatus]);

  const hasFilters = filterLevel !== "all" || filterStatus !== "all";

  const submit = async () => {
    if (!form.title.trim()) return toast.error("Baslik gerekli");
    try {
      await create.mutateAsync(form);
      toast.success("Risk kaydi olusturuldu");
      setOpen(false);
      setForm({ title: "", description: "", mitigation: "", status: "open", level: "medium", likelihood: 3, impact: 3 });
    } catch (e) {
      toast.error("Olusturulamadi: " + (e instanceof Error ? e.message : ""));
    }
  };

  const trendText = useMemo(() => {
    if (!risks?.length) return null;
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const recent = risks.filter(r => new Date(r.created_at).getTime() > thirtyDaysAgo).length;
    const closed = risks.filter(r =>
      (r.status === "closed" || r.status === "accepted") &&
      new Date(r.updated_at).getTime() > thirtyDaysAgo
    ).length;
    if (recent === 0 && closed === 0) return "Son 30 gunde degisiklik yok";
    const parts = [];
    if (recent > 0) parts.push(`+${recent} yeni`);
    if (closed > 0) parts.push(`${closed} kapatildi`);
    return `Son 30 gun: ${parts.join(", ")}`;
  }, [risks]);

  return (
    <DomainWorkspace domain="risks" title="Risk Merkezi" subtitle="Sirket riskleri, olasilik x etki, sahiplik ve azaltma planlari.">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Risk Merkezi</h1>
            <p className="text-sm text-muted-foreground">
              Yurutme, finans, urun ve musteri risklerini tek yerden yonetin.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Yeni Risk</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Yeni Risk</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Baslik</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                <div><Label>Aciklama</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Seviye</Label>
                    <Select value={form.level} onValueChange={v => setForm({ ...form, level: v as RiskLevel })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(RISK_LEVEL_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Durum</Label>
                    <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as RiskStatus })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Olasilik (1-5)</Label>
                    <Input type="number" min={1} max={5} value={form.likelihood}
                      onChange={e => setForm({ ...form, likelihood: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Etki (1-5)</Label>
                    <Input type="number" min={1} max={5} value={form.impact}
                      onChange={e => setForm({ ...form, impact: Number(e.target.value) })} />
                  </div>
                </div>
                <div><Label>Azaltma Plani</Label><Textarea value={form.mitigation} onChange={e => setForm({ ...form, mitigation: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Iptal</Button>
                <Button onClick={submit} disabled={create.isPending}>Olustur</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 flex items-start gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <ShieldAlert className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Toplam Risk</div>
                <div className="text-2xl font-semibold font-mono">{stats.total}</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-500/30">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="rounded-lg bg-red-500/10 p-2">
                <ShieldX className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Kritik / Yuksek</div>
                <div className="text-2xl font-semibold font-mono text-red-600 dark:text-red-400">{stats.criticalHigh}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-start gap-3">
              <div className="rounded-lg bg-orange-500/10 p-2">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Acik</div>
                <div className="text-2xl font-semibold font-mono">{stats.open}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-start gap-3">
              <div className="rounded-lg bg-green-500/10 p-2">
                <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Azaltilmis</div>
                <div className="text-2xl font-semibold font-mono">{stats.mitigated}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trend indicator */}
        {trendText && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
            <Activity className="h-4 w-4" />
            <span>{trendText}</span>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-64" />
            <Skeleton className="h-48" />
          </div>
        ) : !risks?.length ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <ShieldAlert className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <div className="text-lg font-semibold">Henuz kayitli risk yok</div>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                  Riskleri kaydedip projeler, hedefler ve urunlerle iliskilendirerek erken uyari sisteminizi kurun.
                  Her risk icin olasilik ve etki belirleyerek risk matrisini olusturun.
                </p>
              </div>
              <Button onClick={() => setOpen(true)} size="lg">
                <Plus className="h-4 w-4 mr-2" />Ilk riski kaydet
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Risk Matrix */}
            <RiskMatrix risks={risks} />

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterLevel} onValueChange={v => setFilterLevel(v as RiskLevel | "all")}>
                <SelectTrigger className="w-[150px] h-8 text-xs">
                  <SelectValue placeholder="Seviye" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tum Seviyeler</SelectItem>
                  {Object.entries(RISK_LEVEL_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={v => setFilterStatus(v as RiskStatus | "all")}>
                <SelectTrigger className="w-[150px] h-8 text-xs">
                  <SelectValue placeholder="Durum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tum Durumlar</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button
                  variant="ghost" size="sm" className="h-8 text-xs"
                  onClick={() => { setFilterLevel("all"); setFilterStatus("all"); }}
                >
                  <X className="h-3 w-3 mr-1" />Temizle
                </Button>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {filtered.length} / {risks.length} risk
              </span>
            </div>

            {/* Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead>Risk</TableHead>
                      <TableHead>Seviye</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead className="text-right">Skor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(r => {
                      const score = r.likelihood * r.impact;
                      const isExpanded = expandedId === r.id;
                      return (
                        <Fragment key={r.id}>
                          <TableRow
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => setExpandedId(isExpanded ? null : r.id)}
                          >
                            <TableCell className="w-8 px-2">
                              {isExpanded
                                ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              }
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{r.title}</div>
                              {r.description && !isExpanded && (
                                <div className="text-xs text-muted-foreground line-clamp-1">{r.description}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={RISK_LEVEL_COLORS[r.level]}>{RISK_LEVEL_LABELS[r.level]}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{STATUS_LABELS[r.status]}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={cn(
                                "inline-flex items-center justify-center rounded-md px-2 py-0.5 text-sm font-mono font-bold",
                                scoreColor(score)
                              )}>
                                {score}
                              </span>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow className="bg-muted/30">
                              <TableCell colSpan={5} className="p-4">
                                <div className="space-y-4">
                                  {/* Details grid */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                      <div className="text-xs font-medium text-muted-foreground mb-1">Aciklama</div>
                                      <p className="text-sm">{r.description || "Aciklama girilmemis."}</p>
                                    </div>
                                    <div>
                                      <div className="text-xs font-medium text-muted-foreground mb-1">Azaltma Plani</div>
                                      <p className="text-sm">{r.mitigation || "Azaltma plani girilmemis."}</p>
                                    </div>
                                  </div>
                                  <div className="flex gap-4 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">Olasilik:</span>{" "}
                                      <span className="font-mono font-medium">{r.likelihood}/5</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Etki:</span>{" "}
                                      <span className="font-mono font-medium">{r.impact}/5</span>
                                    </div>
                                    <div className={cn("rounded px-2 py-0.5 font-mono font-bold text-xs", scoreColor(score))}>
                                      Skor: {score}
                                    </div>
                                  </div>
                                  {/* Related objects / links */}
                                  <div className="border-t pt-3">
                                    <div className="flex items-center gap-1.5 mb-2">
                                      <Link2 className="h-4 w-4 text-muted-foreground" />
                                      <span className="text-sm font-medium">Baglantilar</span>
                                    </div>
                                    <RelatedObjectsPanel type="risk" id={r.id} />
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DomainWorkspace>
  );
}
