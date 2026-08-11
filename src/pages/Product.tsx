import { useState, useMemo } from "react";
import { DomainWorkspace } from "@/components/DomainWorkspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  useProducts, useFeatures, useFeedback, useReleases, useIncidents, useUpsert,
} from "@/lib/product-hooks";
import {
  Plus, Package, Lightbulb, MessageSquare, Rocket, AlertOctagon,
  ChevronDown, ChevronRight, User, Link2, Grid3X3, Heart, ShieldAlert,
  Activity, CheckCircle2, XCircle,
} from "lucide-react";
import { IntegrationsPanel } from "@/components/integrations/IntegrationsPanel";
import { toast } from "sonner";
import { format } from "date-fns";

const FEATURE_STATUS = ["idea", "planned", "in_progress", "shipped", "cancelled"] as const;
const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
const MOSCOW = ["must_have", "should_have", "could_have", "wont_have"] as const;
const EFFORT_SIZES = ["XS", "S", "M", "L", "XL"] as const;
const FEEDBACK_STATUS = ["new", "triaged", "planned", "done", "wont_do"] as const;
const FEEDBACK_CATEGORY = ["bug", "feature_request", "praise", "question", "complaint"] as const;
const RELEASE_STATUS = ["planned", "in_progress", "released", "cancelled"] as const;
const SEVERITY = ["sev1", "sev2", "sev3", "sev4"] as const;
const INCIDENT_STATUS = ["investigating", "identified", "monitoring", "resolved", "postmortem"] as const;

const MOSCOW_LABELS: Record<string, string> = {
  must_have: "Must Have",
  should_have: "Should Have",
  could_have: "Could Have",
  wont_have: "Won't Have",
};

const MOSCOW_COLORS: Record<string, string> = {
  must_have: "bg-destructive/20 text-destructive-foreground",
  should_have: "bg-amber-500/20 text-amber-300",
  could_have: "bg-blue-500/20 text-blue-300",
  wont_have: "bg-muted text-muted-foreground",
};

const EFFORT_COLORS: Record<string, string> = {
  XS: "bg-emerald-500/20 text-emerald-300",
  S: "bg-blue-500/20 text-blue-300",
  M: "bg-amber-500/20 text-amber-300",
  L: "bg-orange-500/20 text-orange-300",
  XL: "bg-destructive/20 text-destructive-foreground",
};

const tone: Record<string, string> = {
  idea: "bg-muted text-muted-foreground",
  planned: "bg-blue-500/20 text-blue-300",
  in_progress: "bg-amber-500/20 text-amber-300",
  shipped: "bg-emerald-500/20 text-emerald-300",
  released: "bg-emerald-500/20 text-emerald-300",
  cancelled: "bg-destructive/20 text-destructive-foreground",
  new: "bg-blue-500/20 text-blue-300",
  triaged: "bg-amber-500/20 text-amber-300",
  done: "bg-emerald-500/20 text-emerald-300",
  wont_do: "bg-muted text-muted-foreground",
  investigating: "bg-destructive/20 text-destructive-foreground",
  identified: "bg-amber-500/20 text-amber-300",
  monitoring: "bg-blue-500/20 text-blue-300",
  resolved: "bg-emerald-500/20 text-emerald-300",
  postmortem: "bg-muted text-muted-foreground",
  sev1: "bg-destructive text-destructive-foreground",
  sev2: "bg-destructive/70 text-destructive-foreground",
  sev3: "bg-amber-500/20 text-amber-300",
  sev4: "bg-muted text-muted-foreground",
  urgent: "bg-destructive text-destructive-foreground",
  high: "bg-amber-500/20 text-amber-300",
  medium: "bg-blue-500/20 text-blue-300",
  low: "bg-muted text-muted-foreground",
};

function EmptyState({ icon: Icon, title, desc, onNew }: any) {
  return (
    <Card><CardContent className="p-10 text-center space-y-3">
      <Icon className="h-10 w-10 mx-auto text-muted-foreground" />
      <div className="text-lg font-medium">{title}</div>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">{desc}</p>
      <Button onClick={onNew}><Plus className="h-4 w-4 mr-2" />Ekle</Button>
    </CardContent></Card>
  );
}

/* --------------------------- Products --------------------------- */
function ProductsTab() {
  const { data, isLoading } = useProducts();
  const { data: features } = useFeatures();
  const { data: incidents } = useIncidents();
  const { data: releases } = useReleases();
  const upsert = useUpsert("products");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", status: "active", related_projects: "" });

  const productStats = useMemo(() => {
    if (!data) return {};
    const stats: Record<string, { featureCount: number; openIncidents: number; sevCounts: Record<string, number>; latestRelease: any }> = {};
    for (const p of data) {
      const pFeatures = features?.filter(f => f.product_id === p.id) ?? [];
      const pIncidents = incidents?.filter(i => i.product_id === p.id && i.status !== "resolved" && i.status !== "postmortem") ?? [];
      const sevCounts: Record<string, number> = {};
      for (const inc of pIncidents) sevCounts[inc.severity] = (sevCounts[inc.severity] || 0) + 1;
      const pReleases = releases?.filter(r => r.product_id === p.id).sort((a: any, b: any) => new Date(b.release_date || b.created_at).getTime() - new Date(a.release_date || a.created_at).getTime());
      stats[p.id] = { featureCount: pFeatures.length, openIncidents: pIncidents.length, sevCounts, latestRelease: pReleases?.[0] ?? null };
    }
    return stats;
  }, [data, features, incidents, releases]);

  function getHealthColor(pid: string) {
    const s = productStats[pid];
    if (!s) return "text-muted-foreground";
    if (s.sevCounts["sev1"]) return "text-destructive";
    if (s.sevCounts["sev2"]) return "text-orange-400";
    if (s.openIncidents > 0) return "text-amber-400";
    return "text-emerald-400";
  }

  function getHealthLabel(pid: string) {
    const s = productStats[pid];
    if (!s) return "Bilinmiyor";
    if (s.sevCounts["sev1"]) return "Kritik";
    if (s.sevCounts["sev2"]) return "Uyari";
    if (s.openIncidents > 0) return "Dikkat";
    return "Saglikli";
  }

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Isim gerekli");
    try {
      await upsert.mutateAsync({ ...form });
      toast.success("Urun eklendi"); setOpen(false);
      setForm({ name: "", description: "", status: "active", related_projects: "" });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Yeni Urun</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Yeni Urun</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Isim</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Aciklama</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label>Iliskili Projeler</Label><Input placeholder="Proje ID veya isim (virgul ile)" value={form.related_projects} onChange={e => setForm({ ...form, related_projects: e.target.value })} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Iptal</Button><Button onClick={submit} disabled={upsert.isPending}>Olustur</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? <Skeleton className="h-40" /> : !data?.length
        ? <EmptyState icon={Package} title="Henuz urun yok" desc="Sirketinizin urunlerini tanimlayin; feature, feedback, release ve incident kayitlari bu urunlere baglanir." onNew={() => setOpen(true)} />
        : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map(p => {
            const s = productStats[p.id];
            return (
              <Card key={p.id} className="border-l-4" style={{ borderLeftColor: getHealthColor(p.id).includes("destructive") ? "hsl(var(--destructive))" : getHealthColor(p.id).includes("emerald") ? "#34d399" : getHealthColor(p.id).includes("orange") ? "#fb923c" : getHealthColor(p.id).includes("amber") ? "#fbbf24" : "hsl(var(--muted))" }}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="font-semibold text-base">{p.name}</div>
                    <Badge className={tone[p.status] ?? ""}>{p.status}</Badge>
                  </div>
                  {p.description && <p className="text-sm text-muted-foreground line-clamp-3">{p.description}</p>}

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
                    <div className="text-center">
                      <div className="text-lg font-semibold">{s?.featureCount ?? 0}</div>
                      <div className="text-xs text-muted-foreground">Feature</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">{s?.openIncidents ?? 0}</div>
                      <div className="text-xs text-muted-foreground">Acik Incident</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium truncate">{s?.latestRelease?.version ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">Son Release</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div className="flex items-center gap-1.5">
                      <Activity className={`h-4 w-4 ${getHealthColor(p.id)}`} />
                      <span className={`text-xs font-medium ${getHealthColor(p.id)}`}>{getHealthLabel(p.id)}</span>
                    </div>
                    {p.related_projects && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Link2 className="h-3 w-3" />
                        <span className="truncate max-w-[120px]">{p.related_projects}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>}
    </div>
  );
}

/* --------------------------- Features --------------------------- */
function FeaturesTab() {
  const { data, isLoading } = useFeatures();
  const { data: products } = useProducts();
  const upsert = useUpsert("features");
  const [open, setOpen] = useState(false);
  const [groupByMoscow, setGroupByMoscow] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState<any>({
    title: "", description: "", status: "idea", priority: "medium", product_id: "",
    moscow: "should_have", owner: "", effort: "M", dependencies: "",
  });

  const submit = async () => {
    if (!form.title.trim()) return toast.error("Baslik gerekli");
    try {
      await upsert.mutateAsync({ ...form, product_id: form.product_id || null });
      toast.success("Feature eklendi"); setOpen(false);
      setForm({ title: "", description: "", status: "idea", priority: "medium", product_id: "", moscow: "should_have", owner: "", effort: "M", dependencies: "" });
    } catch (e: any) { toast.error(e.message); }
  };

  const toggleGroup = (key: string) => setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }));

  const grouped = useMemo(() => {
    if (!data) return {};
    const groups: Record<string, any[]> = {};
    for (const cat of MOSCOW) groups[cat] = [];
    groups["_unset"] = [];
    for (const f of data) {
      const key = MOSCOW.includes(f.moscow) ? f.moscow : "_unset";
      groups[key].push(f);
    }
    return groups;
  }, [data]);

  const productMap = useMemo(() => {
    const m: Record<string, string> = {};
    products?.forEach(p => { m[p.id] = p.name; });
    return m;
  }, [products]);

  function FeatureCard({ f }: { f: any }) {
    return (
      <Card className="hover:border-primary/30 transition-colors">
        <CardContent className="p-4 space-y-2">
          <div className="flex justify-between items-start gap-2">
            <div className="font-medium">{f.title}</div>
            <div className="flex gap-1 flex-wrap justify-end">
              <Badge className={tone[f.priority]}>{f.priority}</Badge>
              <Badge className={tone[f.status]}>{f.status}</Badge>
            </div>
          </div>
          {f.description && <p className="text-sm text-muted-foreground line-clamp-2">{f.description}</p>}
          <div className="flex flex-wrap gap-2 items-center text-xs">
            {f.moscow && <Badge variant="outline" className={MOSCOW_COLORS[f.moscow] ?? ""}>{MOSCOW_LABELS[f.moscow] ?? f.moscow}</Badge>}
            {f.effort && <Badge variant="outline" className={EFFORT_COLORS[f.effort] ?? ""}>{f.effort}</Badge>}
            {f.owner && <span className="flex items-center gap-1 text-muted-foreground"><User className="h-3 w-3" />{f.owner}</span>}
            <span className="text-muted-foreground">Oy: {f.votes ?? 0}</span>
          </div>
          {f.product_id && productMap[f.product_id] && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Package className="h-3 w-3" />
              {productMap[f.product_id]}
            </div>
          )}
          {f.dependencies && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Link2 className="h-3 w-3" />
              Bagimliliklar: {f.dependencies}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Button variant="ghost" size="sm" onClick={() => setGroupByMoscow(!groupByMoscow)}>
          {groupByMoscow ? <Grid3X3 className="h-4 w-4 mr-1" /> : <Grid3X3 className="h-4 w-4 mr-1" />}
          {groupByMoscow ? "Duz Liste" : "MoSCoW Gruplama"}
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Yeni Feature</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Yeni Feature</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Baslik</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Aciklama</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Urun</Label>
                  <Select value={form.product_id} onValueChange={v => setForm({ ...form, product_id: v })}>
                    <SelectTrigger><SelectValue placeholder="---" /></SelectTrigger>
                    <SelectContent>{products?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Sahip (Owner)</Label><Input placeholder="Isim veya takim" value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Durum</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{FEATURE_STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Oncelik</Label>
                  <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PRIORITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>MoSCoW</Label>
                  <Select value={form.moscow} onValueChange={v => setForm({ ...form, moscow: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{MOSCOW.map(s => <SelectItem key={s} value={s}>{MOSCOW_LABELS[s]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Efor (T-shirt)</Label>
                  <Select value={form.effort} onValueChange={v => setForm({ ...form, effort: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{EFFORT_SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Bagimliliklar</Label><Input placeholder="Feature ID'leri (virgul ile)" value={form.dependencies} onChange={e => setForm({ ...form, dependencies: e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Iptal</Button><Button onClick={submit} disabled={upsert.isPending}>Olustur</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <Skeleton className="h-40" /> : !data?.length
        ? <EmptyState icon={Lightbulb} title="Henuz feature yok" desc="Roadmap'inizi olusturmak icin ozellik fikirlerinizi ekleyin, onceliklendirin ve release'lere baglayin." onNew={() => setOpen(true)} />
        : groupByMoscow ? (
          <div className="space-y-4">
            {[...MOSCOW, "_unset" as const].map(cat => {
              const items = grouped[cat];
              if (!items?.length) return null;
              const label = cat === "_unset" ? "Kategorisiz" : MOSCOW_LABELS[cat] ?? cat;
              const isCollapsed = collapsedGroups[cat] ?? false;
              return (
                <Collapsible key={cat} open={!isCollapsed} onOpenChange={() => toggleGroup(cat)}>
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-2 w-full text-left py-2 px-1 rounded hover:bg-muted/50 transition-colors">
                      {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      <span className="font-semibold">{label}</span>
                      <Badge variant="secondary" className="ml-1">{items.length}</Badge>
                      {cat !== "_unset" && <div className={`h-2 w-2 rounded-full ${MOSCOW_COLORS[cat]?.split(" ")[0] ?? "bg-muted"}`} />}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 ml-6">
                      {items.map((f: any) => <FeatureCard key={f.id} f={f} />)}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.map(f => <FeatureCard key={f.id} f={f} />)}
          </div>
        )}
    </div>
  );
}

/* --------------------------- Feedback --------------------------- */
function FeedbackTab() {
  const { data, isLoading } = useFeedback();
  const upsert = useUpsert("feedback");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ title: "", body: "", category: "feature_request", status: "new", submitter_name: "", submitter_email: "" });
  const submit = async () => {
    if (!form.title.trim()) return toast.error("Baslik gerekli");
    try { await upsert.mutateAsync(form); toast.success("Feedback eklendi"); setOpen(false); setForm({ title: "", body: "", category: "feature_request", status: "new", submitter_name: "", submitter_email: "" }); }
    catch (e: any) { toast.error(e.message); }
  };
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Yeni Feedback</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Yeni Feedback</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Baslik</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Icerik</Label><Textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Gonderen</Label><Input value={form.submitter_name} onChange={e => setForm({ ...form, submitter_name: e.target.value })} /></div>
                <div><Label>E-posta</Label><Input value={form.submitter_email} onChange={e => setForm({ ...form, submitter_email: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Kategori</Label>
                  <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{FEEDBACK_CATEGORY.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Durum</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{FEEDBACK_STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Iptal</Button><Button onClick={submit} disabled={upsert.isPending}>Kaydet</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? <Skeleton className="h-40" /> : !data?.length
        ? <EmptyState icon={MessageSquare} title="Feedback yok" desc="Musteri geri bildirimlerini toplayin, kategorize edin ve feature'lara baglayin." onNew={() => setOpen(true)} />
        : <div className="space-y-2">
            {data.map(f => (
              <Card key={f.id}><CardContent className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">{f.title}</div>
                  {f.body && <p className="text-sm text-muted-foreground line-clamp-2">{f.body}</p>}
                  <div className="text-xs text-muted-foreground mt-1">{f.submitter_name || "Anonim"} · {f.submitter_email || "---"}</div>
                </div>
                <div className="flex flex-col gap-1 items-end shrink-0">
                  <Badge className={tone[f.status]}>{f.status}</Badge>
                  {f.category && <Badge variant="outline">{f.category}</Badge>}
                </div>
              </CardContent></Card>
            ))}
          </div>}
    </div>
  );
}

/* --------------------------- Releases --------------------------- */
function ReleasesTab() {
  const { data, isLoading } = useReleases();
  const { data: products } = useProducts();
  const upsert = useUpsert("releases");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ version: "", name: "", status: "planned", release_date: "", product_id: "", notes: "" });
  const submit = async () => {
    if (!form.version.trim()) return toast.error("Versiyon gerekli");
    try {
      await upsert.mutateAsync({ ...form, product_id: form.product_id || null, release_date: form.release_date || null });
      toast.success("Release kaydedildi"); setOpen(false);
      setForm({ version: "", name: "", status: "planned", release_date: "", product_id: "", notes: "" });
    } catch (e: any) { toast.error(e.message); }
  };
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Yeni Release</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Yeni Release</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Versiyon</Label><Input placeholder="v1.2.0" value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} /></div>
                <div><Label>Isim</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Urun</Label>
                  <Select value={form.product_id} onValueChange={v => setForm({ ...form, product_id: v })}>
                    <SelectTrigger><SelectValue placeholder="---" /></SelectTrigger>
                    <SelectContent>{products?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Durum</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{RELEASE_STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Tarih</Label><Input type="date" value={form.release_date} onChange={e => setForm({ ...form, release_date: e.target.value })} /></div>
              </div>
              <div><Label>Notlar</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Iptal</Button><Button onClick={submit} disabled={upsert.isPending}>Kaydet</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? <Skeleton className="h-40" /> : !data?.length
        ? <EmptyState icon={Rocket} title="Release yok" desc="Surum planlayin, changelog tutun ve feature'lari release'lere baglayin." onNew={() => setOpen(true)} />
        : <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.map(r => (
              <Card key={r.id}><CardContent className="p-4 space-y-1">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="font-medium">{r.version} {r.name && <span className="text-muted-foreground font-normal">· {r.name}</span>}</div>
                    {r.release_date && <div className="text-xs text-muted-foreground">{format(new Date(r.release_date), "PP")}</div>}
                  </div>
                  <Badge className={tone[r.status]}>{r.status}</Badge>
                </div>
                {r.notes && <p className="text-sm text-muted-foreground line-clamp-3">{r.notes}</p>}
              </CardContent></Card>
            ))}
          </div>}
    </div>
  );
}

/* --------------------------- Incidents --------------------------- */
function IncidentsTab() {
  const { data, isLoading } = useIncidents();
  const upsert = useUpsert("incidents");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ title: "", summary: "", severity: "sev3", status: "investigating", impact: "" });
  const submit = async () => {
    if (!form.title.trim()) return toast.error("Baslik gerekli");
    try { await upsert.mutateAsync(form); toast.success("Incident kaydedildi"); setOpen(false); setForm({ title: "", summary: "", severity: "sev3", status: "investigating", impact: "" }); }
    catch (e: any) { toast.error(e.message); }
  };
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Yeni Incident</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Yeni Incident</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Baslik</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Ozet</Label><Textarea value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Siddet</Label>
                  <Select value={form.severity} onValueChange={v => setForm({ ...form, severity: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SEVERITY.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Durum</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{INCIDENT_STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Etki</Label><Input value={form.impact} onChange={e => setForm({ ...form, impact: e.target.value })} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Iptal</Button><Button onClick={submit} disabled={upsert.isPending}>Kaydet</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? <Skeleton className="h-40" /> : !data?.length
        ? <EmptyState icon={AlertOctagon} title="Incident yok" desc="Uretim olaylarini siddet, zaman cizelgesi ve postmortem ile takip edin." onNew={() => setOpen(true)} />
        : <div className="space-y-2">
            {data.map(i => (
              <Card key={i.id}><CardContent className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">{i.title}</div>
                  {i.summary && <p className="text-sm text-muted-foreground line-clamp-2">{i.summary}</p>}
                  {i.impact && <div className="text-xs text-muted-foreground mt-1">Etki: {i.impact}</div>}
                  <div className="text-xs text-muted-foreground">Baslangic: {format(new Date(i.started_at), "PPp")}</div>
                </div>
                <div className="flex flex-col gap-1 items-end shrink-0">
                  <Badge className={tone[i.severity]}>{i.severity}</Badge>
                  <Badge className={tone[i.status]}>{i.status}</Badge>
                </div>
              </CardContent></Card>
            ))}
          </div>}
    </div>
  );
}

/* --------------------------- Matrix Tab --------------------------- */
function MatrixTab() {
  const { data: products, isLoading: pLoading } = useProducts();
  const { data: features, isLoading: fLoading } = useFeatures();

  if (pLoading || fLoading) return <Skeleton className="h-60" />;
  if (!products?.length || !features?.length) {
    return (
      <Card><CardContent className="p-10 text-center space-y-3">
        <Grid3X3 className="h-10 w-10 mx-auto text-muted-foreground" />
        <div className="text-lg font-medium">Matris Gorunumu</div>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">Urun ve feature verisi gerekli. Once urun ve feature ekleyin.</p>
      </CardContent></Card>
    );
  }

  const unassigned = features.filter(f => !f.product_id);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Urun x Feature matris gorunumu. Her urunun feature dagilimlni MoSCoW ve duruma gore goruntuleyin.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 font-semibold min-w-[160px]">Urun</th>
              {MOSCOW.map(m => (
                <th key={m} className="text-center p-3 font-semibold min-w-[120px]">
                  <Badge variant="outline" className={MOSCOW_COLORS[m]}>{MOSCOW_LABELS[m]}</Badge>
                </th>
              ))}
              <th className="text-center p-3 font-semibold min-w-[80px]">Toplam</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => {
              const pFeatures = features.filter(f => f.product_id === p.id);
              return (
                <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-medium">{p.name}</td>
                  {MOSCOW.map(m => {
                    const count = pFeatures.filter(f => f.moscow === m).length;
                    return (
                      <td key={m} className="text-center p-3">
                        {count > 0 ? (
                          <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-muted font-medium text-sm">{count}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="text-center p-3 font-semibold">{pFeatures.length}</td>
                </tr>
              );
            })}
            {unassigned.length > 0 && (
              <tr className="border-b border-border/50 bg-muted/10">
                <td className="p-3 font-medium text-muted-foreground italic">Atanmamis</td>
                {MOSCOW.map(m => {
                  const count = unassigned.filter(f => f.moscow === m).length;
                  return (
                    <td key={m} className="text-center p-3">
                      {count > 0 ? (
                        <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-muted font-medium text-sm">{count}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  );
                })}
                <td className="text-center p-3 font-semibold">{unassigned.length}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail: features per product with status */}
      <div className="space-y-3 mt-6">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Detay</h3>
        {products.map(p => {
          const pFeatures = features.filter(f => f.product_id === p.id);
          if (!pFeatures.length) return null;
          return (
            <Card key={p.id}>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4" /> {p.name}
                  <Badge variant="secondary">{pFeatures.length} feature</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="flex flex-wrap gap-2">
                  {pFeatures.map(f => (
                    <div key={f.id} className="flex items-center gap-1.5 px-2 py-1 rounded border border-border text-xs">
                      <span className="font-medium">{f.title}</span>
                      <Badge className={`${tone[f.status]} text-[10px] px-1 py-0`}>{f.status}</Badge>
                      {f.moscow && <Badge variant="outline" className={`${MOSCOW_COLORS[f.moscow]} text-[10px] px-1 py-0`}>{MOSCOW_LABELS[f.moscow]}</Badge>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default function Product() {
  return (
    <DomainWorkspace domain="product" title="Product" subtitle="Urun, feature, feedback, release ve incident tek yerde.">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Urun & Muhendislik</h1>
          <p className="text-sm text-muted-foreground">Urunler, roadmap, feedback, surumler ve incident yonetimi.</p>
        </div>
        <IntegrationsPanel domain="product" compact />
        <Tabs defaultValue="features">
          <TabsList>
            <TabsTrigger value="features">Roadmap</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
            <TabsTrigger value="releases">Releases</TabsTrigger>
            <TabsTrigger value="incidents">Incidents</TabsTrigger>
            <TabsTrigger value="products">Urunler</TabsTrigger>
            <TabsTrigger value="matrix">Matris</TabsTrigger>
          </TabsList>
          <TabsContent value="features" className="mt-4"><FeaturesTab /></TabsContent>
          <TabsContent value="feedback" className="mt-4"><FeedbackTab /></TabsContent>
          <TabsContent value="releases" className="mt-4"><ReleasesTab /></TabsContent>
          <TabsContent value="incidents" className="mt-4"><IncidentsTab /></TabsContent>
          <TabsContent value="products" className="mt-4"><ProductsTab /></TabsContent>
          <TabsContent value="matrix" className="mt-4"><MatrixTab /></TabsContent>
        </Tabs>
      </div>
    </DomainWorkspace>
  );
}
