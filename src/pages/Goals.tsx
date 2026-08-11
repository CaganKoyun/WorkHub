import { useState, useMemo } from "react";
import { DomainWorkspace } from "@/components/DomainWorkspace";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RelatedObjectsPanel } from "@/components/graph/RelatedObjectsPanel";
import { useGoals, useCreateGoal } from "@/lib/graph-hooks";
import {
  GOAL_STATUS_LABELS, type GoalStatus, type GoalPeriod,
} from "@/lib/graph-types";
import {
  Plus, Target, ChevronDown, ChevronRight, LayoutGrid, TableIcon,
  TrendingUp, AlertTriangle, CheckCircle2, BarChart3,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_TONE: Record<GoalStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  on_track: "bg-emerald-500/20 text-emerald-300",
  at_risk: "bg-amber-500/20 text-amber-300",
  off_track: "bg-destructive/20 text-destructive-foreground",
  achieved: "bg-emerald-500/30 text-emerald-200",
  missed: "bg-destructive/30 text-destructive-foreground",
  archived: "bg-muted text-muted-foreground",
};

const PERIOD_LABELS: Record<string, string> = {
  monthly: "Aylik",
  quarterly: "Ceyreklik",
  yearly: "Yillik",
  custom: "Ozel",
};

const PERIOD_ORDER: string[] = ["yearly", "quarterly", "monthly", "custom"];

function formatCurrency(val: number): string {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(val);
}

type SortKey = "title" | "status" | "period" | "progress" | "target_revenue";
type SortDir = "asc" | "desc";

export default function Goals() {
  const { data: goals, isLoading } = useGoals();
  const create = useCreateGoal();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"card" | "table">("card");
  const [collapsedPeriods, setCollapsedPeriods] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("progress");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "on_track" as GoalStatus,
    period: "quarterly" as GoalPeriod,
    progress: 0,
    target_revenue: "" as string | number,
    owner: "",
  });

  const submit = async () => {
    if (!form.title.trim()) return toast.error("Baslik gerekli");
    try {
      const payload = {
        ...form,
        target_revenue: form.target_revenue !== "" ? Number(form.target_revenue) : undefined,
        owner: form.owner || undefined,
      };
      await create.mutateAsync(payload);
      toast.success("Hedef olusturuldu");
      setOpen(false);
      setForm({ title: "", description: "", status: "on_track", period: "quarterly", progress: 0, target_revenue: "", owner: "" });
    } catch (e) {
      toast.error("Olusturulamadi: " + (e instanceof Error ? e.message : ""));
    }
  };

  const summary = useMemo(() => {
    if (!goals?.length) return { total: 0, onTrack: 0, atRisk: 0, achieved: 0 };
    return {
      total: goals.length,
      onTrack: goals.filter((g: any) => g.status === "on_track").length,
      atRisk: goals.filter((g: any) => g.status === "at_risk" || g.status === "off_track").length,
      achieved: goals.filter((g: any) => g.status === "achieved").length,
    };
  }, [goals]);

  const groupedGoals = useMemo(() => {
    if (!goals?.length) return new Map<string, any[]>();
    const map = new Map<string, any[]>();
    for (const p of PERIOD_ORDER) map.set(p, []);
    for (const g of goals) {
      const key = g.period || "custom";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(g);
    }
    // Remove empty groups
    for (const [k, v] of map) {
      if (!v.length) map.delete(k);
    }
    return map;
  }, [goals]);

  const sortedGoals = useMemo(() => {
    if (!goals?.length) return [];
    const sorted = [...goals].sort((a: any, b: any) => {
      let aVal: any, bVal: any;
      switch (sortKey) {
        case "title": aVal = a.title?.toLowerCase() ?? ""; bVal = b.title?.toLowerCase() ?? ""; break;
        case "status": aVal = a.status ?? ""; bVal = b.status ?? ""; break;
        case "period": aVal = PERIOD_ORDER.indexOf(a.period ?? "custom"); bVal = PERIOD_ORDER.indexOf(b.period ?? "custom"); break;
        case "progress": aVal = a.progress ?? 0; bVal = b.progress ?? 0; break;
        case "target_revenue": aVal = a.target_revenue ?? 0; bVal = b.target_revenue ?? 0; break;
        default: aVal = 0; bVal = 0;
      }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [goals, sortKey, sortDir]);

  const togglePeriod = (p: string) => {
    setCollapsedPeriods(prev => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  const createDialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" />Yeni Hedef</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Yeni Hedef</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Baslik</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Aciklama</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Durum</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as GoalStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(GOAL_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Donem</Label>
              <Select value={form.period} onValueChange={v => setForm({ ...form, period: v as GoalPeriod })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Aylik</SelectItem>
                  <SelectItem value="quarterly">Ceyreklik</SelectItem>
                  <SelectItem value="yearly">Yillik</SelectItem>
                  <SelectItem value="custom">Ozel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Ilerleme (%)</Label>
              <Input type="number" min={0} max={100} value={form.progress}
                onChange={e => setForm({ ...form, progress: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Hedef Gelir (TRY)</Label>
              <Input type="number" min={0} placeholder="orn. 500000" value={form.target_revenue}
                onChange={e => setForm({ ...form, target_revenue: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Sorumlu</Label>
            <Input value={form.owner} placeholder="Kisi veya ekip adi" onChange={e => setForm({ ...form, owner: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Iptal</Button>
          <Button onClick={submit} disabled={create.isPending}>Olustur</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const summarySection = goals?.length ? (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-blue-400" />
          <div>
            <div className="text-2xl font-bold">{summary.total}</div>
            <div className="text-xs text-muted-foreground">Toplam Hedef</div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-emerald-400" />
          <div>
            <div className="text-2xl font-bold">{summary.onTrack}</div>
            <div className="text-xs text-muted-foreground">Yolunda</div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-amber-400" />
          <div>
            <div className="text-2xl font-bold">{summary.atRisk}</div>
            <div className="text-xs text-muted-foreground">Risk Altinda</div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-emerald-300" />
          <div>
            <div className="text-2xl font-bold">{summary.achieved}</div>
            <div className="text-xs text-muted-foreground">Tamamlanan</div>
          </div>
        </CardContent>
      </Card>
    </div>
  ) : null;

  const renderGoalCard = (g: any) => (
    <Card key={g.id}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="font-medium">{g.title}</div>
            {g.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{g.description}</p>}
            {g.owner && <p className="text-xs text-muted-foreground mt-1">Sorumlu: {g.owner}</p>}
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <Badge className={STATUS_TONE[g.status as GoalStatus]}>{GOAL_STATUS_LABELS[g.status as GoalStatus]}</Badge>
            <Badge variant="outline" className="text-xs">{PERIOD_LABELS[g.period] ?? g.period}</Badge>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Ilerleme</span><span>{g.progress}%</span>
          </div>
          <Progress value={g.progress} />
        </div>
        {g.target_revenue != null && g.target_revenue > 0 && (
          <div className="text-sm">
            <span className="text-muted-foreground">Hedef Gelir: </span>
            <span className="font-medium">{formatCurrency(g.target_revenue)}</span>
          </div>
        )}
        <div className="pt-1">
          <button
            onClick={() => setExpandedGoal(expandedGoal === g.id ? null : g.id)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            {expandedGoal === g.id ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Baglantilar
          </button>
          {expandedGoal === g.id && (
            <div className="mt-2">
              <RelatedObjectsPanel type="goal" id={g.id} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const cardView = (
    <div className="space-y-6">
      {Array.from(groupedGoals.entries()).map(([period, periodGoals]) => (
        <div key={period}>
          <button
            onClick={() => togglePeriod(period)}
            className="flex items-center gap-2 mb-3 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            {collapsedPeriods.has(period) ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {PERIOD_LABELS[period] ?? period}
            <Badge variant="secondary" className="text-xs">{periodGoals.length}</Badge>
          </button>
          {!collapsedPeriods.has(period) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {periodGoals.map(renderGoalCard)}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const tableView = (
    <Card>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer select-none" onClick={() => handleSort("title")}>
                Baslik{sortIndicator("title")}
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => handleSort("status")}>
                Durum{sortIndicator("status")}
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => handleSort("period")}>
                Donem{sortIndicator("period")}
              </TableHead>
              <TableHead className="cursor-pointer select-none text-right" onClick={() => handleSort("progress")}>
                Ilerleme{sortIndicator("progress")}
              </TableHead>
              <TableHead className="cursor-pointer select-none text-right" onClick={() => handleSort("target_revenue")}>
                Hedef Gelir{sortIndicator("target_revenue")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedGoals.map((g: any) => (
              <TableRow key={g.id}>
                <TableCell>
                  <div className="font-medium">{g.title}</div>
                  {g.owner && <div className="text-xs text-muted-foreground">{g.owner}</div>}
                </TableCell>
                <TableCell>
                  <Badge className={STATUS_TONE[g.status as GoalStatus]}>{GOAL_STATUS_LABELS[g.status as GoalStatus]}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{PERIOD_LABELS[g.period] ?? g.period}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <Progress value={g.progress} className="w-20" />
                    <span className="text-sm tabular-nums">{g.progress}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {g.target_revenue ? formatCurrency(g.target_revenue) : <span className="text-muted-foreground">-</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );

  return (
    <DomainWorkspace
      domain="goals"
      title="Hedefler"
      subtitle="Sirket, ekip ve bireysel OKR'lari tek yerden takip edin."
      headerActions={
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={v => setView(v as "card" | "table")}>
            <TabsList>
              <TabsTrigger value="card" className="gap-1.5"><LayoutGrid className="h-3.5 w-3.5" />Kart</TabsTrigger>
              <TabsTrigger value="table" className="gap-1.5"><TableIcon className="h-3.5 w-3.5" />Tablo</TabsTrigger>
            </TabsList>
          </Tabs>
          {createDialog}
        </div>
      }
    >
      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      ) : !goals?.length ? (
        <Card><CardContent className="p-10 text-center space-y-3">
          <Target className="h-12 w-12 mx-auto text-muted-foreground" />
          <div className="text-lg font-medium">Henuz hedef tanimlanmadi</div>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Sirket hedeflerini tanimlayarak baslayabilirsiniz. Hedeflerinizi projeler, urunler,
            ekipler ve risklerle iliskilendirerek Company Graph uzerinden butunsel bir takip saglayabilirsiniz.
            Gelir hedefleri belirleyerek finansal ilerleyisi de izleyebilirsiniz.
          </p>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Ilk hedefi olustur</Button>
        </CardContent></Card>
      ) : (
        <>
          {summarySection}
          {view === "card" ? cardView : tableView}
        </>
      )}
    </DomainWorkspace>
  );
}
