import { useState, useMemo } from "react";
import { DomainWorkspace } from "@/components/DomainWorkspace";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useProducts, useFeatures, useFeedback, useReleases, useIncidents, useUpsert, useDelete,
} from "@/lib/product-hooks";
import { useAllProfiles } from "@/lib/projects-hooks";
import { useProjects } from "@/lib/projects-hooks";
import { riceScore, iceScore } from "@/lib/rice";
import {
  Plus, Package, Lightbulb, MessageSquare, Rocket, AlertOctagon,
  Pencil, Trash2, ThumbsUp, ThumbsDown, Eye, Link2, ChevronRight,
} from "lucide-react";
import { IntegrationsPanel } from "@/components/integrations/IntegrationsPanel";
import { toast } from "sonner";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

/* ------------------------------ Constants ------------------------------ */

const FEATURE_STATUS = ["proposed", "in_progress", "shipped", "deprecated"] as const;
const FEATURE_STATUS_LABELS: Record<string, string> = {
  proposed: "Önerildi", in_progress: "Devam Ediyor", shipped: "Yayınlandı", deprecated: "Kullanımdan Kalktı",
  idea: "Fikir", planned: "Planlandı", cancelled: "İptal Edildi",
};

const MOSCOW = ["must_have", "should_have", "could_have", "wont_have"] as const;
const MOSCOW_LABELS: Record<string, string> = {
  must_have: "Olmazsa Olmaz", should_have: "Olmalı", could_have: "Olsa İyi", wont_have: "Olmayacak",
};

const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
const FEEDBACK_STATUS = ["new", "triaged", "planned", "done", "wont_do"] as const;
const FEEDBACK_CATEGORY = ["bug", "feature_request", "praise", "question", "complaint"] as const;
const RELEASE_STATUS = ["planned", "in_progress", "released", "cancelled"] as const;
const SEVERITY = ["sev1", "sev2", "sev3", "sev4"] as const;
const INCIDENT_STATUS = ["investigating", "identified", "monitoring", "resolved", "postmortem"] as const;

const tone: Record<string, string> = {
  // feature status
  proposed: "bg-blue-500/20 text-blue-300",
  idea: "bg-muted text-muted-foreground",
  planned: "bg-blue-500/20 text-blue-300",
  in_progress: "bg-amber-500/20 text-amber-300",
  shipped: "bg-emerald-500/20 text-emerald-300",
  deprecated: "bg-muted text-muted-foreground",
  released: "bg-emerald-500/20 text-emerald-300",
  cancelled: "bg-destructive/20 text-destructive-foreground",
  // moscow
  must_have: "bg-destructive text-destructive-foreground",
  should_have: "bg-amber-500/20 text-amber-300",
  could_have: "bg-blue-500/20 text-blue-300",
  wont_have: "bg-muted text-muted-foreground",
  // feedback
  new: "bg-blue-500/20 text-blue-300",
  triaged: "bg-amber-500/20 text-amber-300",
  done: "bg-emerald-500/20 text-emerald-300",
  wont_do: "bg-muted text-muted-foreground",
  // incidents
  investigating: "bg-destructive/20 text-destructive-foreground",
  identified: "bg-amber-500/20 text-amber-300",
  monitoring: "bg-blue-500/20 text-blue-300",
  resolved: "bg-emerald-500/20 text-emerald-300",
  postmortem: "bg-muted text-muted-foreground",
  sev1: "bg-destructive text-destructive-foreground",
  sev2: "bg-destructive/70 text-destructive-foreground",
  sev3: "bg-amber-500/20 text-amber-300",
  sev4: "bg-muted text-muted-foreground",
  // priority
  urgent: "bg-destructive text-destructive-foreground",
  high: "bg-amber-500/20 text-amber-300",
  medium: "bg-blue-500/20 text-blue-300",
  low: "bg-muted text-muted-foreground",
};

/* ------------------------------ Helpers ------------------------------ */

type AnyRow = Record<string, any>;

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

function DeleteButton({ onConfirm, isPending }: { onConfirm: () => void; isPending: boolean }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Silmek istediginize emin misiniz?</AlertDialogTitle>
          <AlertDialogDescription>Bu islem geri alinamaz.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>İptal</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isPending}>Sil</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function computeFeatureRice(f: AnyRow): number | null {
  if (f.reach != null && f.impact != null && f.confidence != null && f.effort != null) {
    return riceScore({ reach: f.reach, impact: f.impact, confidence: f.confidence, effort: f.effort });
  }
  return null;
}

function computeFeatureIce(f: AnyRow): number {
  if (f.impact != null && f.confidence != null && f.ease != null) {
    return iceScore({ impact: f.impact, confidence: f.confidence, ease: f.ease });
  }
  return 0;
}

function ScoreBadge({ rice, ice }: { rice: number | null; ice: number }) {
  if (rice != null) {
    return <Badge variant="outline" className="text-xs font-mono">RICE {rice}</Badge>;
  }
  if (ice > 0) {
    return <Badge variant="outline" className="text-xs font-mono">ICE {ice}</Badge>;
  }
  return null;
}

/* ========================== Products Tab ========================== */
function ProductsTab() {
  const { data, isLoading } = useProducts();
  const { data: projects } = useProjects();
  const upsert = useUpsert("products");
  const del = useDelete("products");
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<AnyRow | null>(null);
  const [detailItem, setDetailItem] = useState<AnyRow | null>(null);
  const [form, setForm] = useState({ name: "", description: "", status: "active", project_id: "" });

  const openCreate = () => { setEditItem(null); setForm({ name: "", description: "", status: "active", project_id: "" }); setOpen(true); };
  const openEdit = (p: AnyRow) => { setEditItem(p); setForm({ name: p.name ?? "", description: p.description ?? "", status: p.status ?? "active", project_id: p.project_id ?? "" }); setOpen(true); };

  const submit = async () => {
    if (!form.name.trim()) return toast.error("İsim gerekli");
    try {
      const payload: AnyRow = { ...form, project_id: form.project_id || null };
      if (editItem) payload.id = editItem.id;
      await upsert.mutateAsync(payload);
      toast.success(editItem ? "Urun guncellendi" : "Urun eklendi");
      setOpen(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async (id: string) => {
    try { await del.mutateAsync(id); toast.success("Urun silindi"); } catch (e: any) { toast.error(e.message); }
  };

  const linkedProjects = (productId: string) => projects?.filter((pr: AnyRow) => pr.id === (data?.find(p => p.id === productId)?.project_id)) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Yeni Urun</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editItem ? "Urun Düzenle" : "Yeni Urun"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>İsim</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Aciklama</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label>Proje Baglantisi</Label>
                <Select value={form.project_id} onValueChange={v => setForm({ ...form, project_id: v })}>
                  <SelectTrigger><SelectValue placeholder="-- Proje sec --" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">-- Yok --</SelectItem>
                    {projects?.map((pr: AnyRow) => <SelectItem key={pr.id} value={pr.id}>{pr.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
              <Button onClick={submit} disabled={upsert.isPending}>{editItem ? "Kaydet" : "Oluştur"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!detailItem} onOpenChange={o => { if (!o) setDetailItem(null); }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {detailItem && <>
            <SheetHeader>
              <SheetTitle>{detailItem.name}</SheetTitle>
              <SheetDescription>Urun Detayi</SheetDescription>
            </SheetHeader>
            <div className="mt-4 space-y-3 text-sm">
              <div><span className="font-medium">Durum:</span> <Badge className={tone[detailItem.status] ?? ""}>{detailItem.status}</Badge></div>
              {detailItem.description && <div><span className="font-medium">Aciklama:</span><p className="text-muted-foreground mt-1">{detailItem.description}</p></div>}
              {detailItem.project_id && <div><span className="font-medium">Bagli Proje:</span> {projects?.find((pr: AnyRow) => pr.id === detailItem.project_id)?.name ?? detailItem.project_id}</div>}
              {detailItem.created_at && <div><span className="font-medium">Oluşturulma:</span> {format(new Date(detailItem.created_at), "PPp", { locale: tr })}</div>}
            </div>
            <div className="mt-6 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { openEdit(detailItem); setDetailItem(null); }}><Pencil className="h-3.5 w-3.5 mr-1" />Düzenle</Button>
            </div>
          </>}
        </SheetContent>
      </Sheet>

      {isLoading ? <Skeleton className="h-40" /> : !data?.length
        ? <EmptyState icon={Package} title="Henuz urun yok" desc="Sirketinizin urunlerini tanimlayin; feature, feedback, release ve incident kayitlari bu urunlere baglanir." onNew={openCreate} />
        : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map(p => (
            <Card key={p.id} className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => setDetailItem(p)}>
              <CardContent className="p-5 space-y-2">
                <div className="flex justify-between items-start">
                  <div className="font-medium flex items-center gap-1">{p.name} <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /></div>
                  <div className="flex items-center gap-1">
                    <Badge className={tone[p.status] ?? ""}>{p.status}</Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); openEdit(p); }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <span onClick={e => e.stopPropagation()}><DeleteButton onConfirm={() => handleDelete(p.id)} isPending={del.isPending} /></span>
                  </div>
                </div>
                {p.description && <p className="text-sm text-muted-foreground line-clamp-3">{p.description}</p>}
                {p.project_id && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Link2 className="h-3 w-3" />{projects?.find((pr: AnyRow) => pr.id === p.project_id)?.name ?? "Proje"}</div>}
              </CardContent>
            </Card>
          ))}
        </div>}
    </div>
  );
}

/* ========================== Features Tab ========================== */
function FeaturesTab() {
  const { data, isLoading } = useFeatures();
  const { data: products } = useProducts();
  const { data: profiles } = useAllProfiles();
  const { data: allFeatures } = useFeatures();
  const upsert = useUpsert("features");
  const del = useDelete("features");
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<AnyRow | null>(null);
  const [detailItem, setDetailItem] = useState<AnyRow | null>(null);
  const [moscowFilter, setMoscowFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const emptyForm = { title: "", description: "", status: "proposed", priority: "medium", product_id: "", moscow: "", owner_id: "", blocked_by: "", reach: "", impact: "", confidence: "", effort: "", ease: "" };
  const [form, setForm] = useState<AnyRow>(emptyForm);

  const openCreate = () => { setEditItem(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (f: AnyRow) => {
    setEditItem(f);
    setForm({
      title: f.title ?? "", description: f.description ?? "", status: f.status ?? "proposed",
      priority: f.priority ?? "medium", product_id: f.product_id ?? "", moscow: f.moscow ?? "",
      owner_id: f.owner_id ?? "", blocked_by: f.blocked_by ?? "",
      reach: f.reach ?? "", impact: f.impact ?? "", confidence: f.confidence ?? "",
      effort: f.effort ?? "", ease: f.ease ?? "",
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.title.trim()) return toast.error("Başlık gerekli");
    try {
      const payload: AnyRow = {
        title: form.title, description: form.description, status: form.status,
        priority: form.priority, product_id: form.product_id || null,
        moscow: form.moscow || null, owner_id: form.owner_id || null,
        blocked_by: form.blocked_by || null,
        reach: form.reach ? Number(form.reach) : null,
        impact: form.impact ? Number(form.impact) : null,
        confidence: form.confidence ? Number(form.confidence) : null,
        effort: form.effort ? Number(form.effort) : null,
        ease: form.ease ? Number(form.ease) : null,
      };
      if (editItem) payload.id = editItem.id;
      await upsert.mutateAsync(payload);
      toast.success(editItem ? "Feature guncellendi" : "Feature eklendi");
      setOpen(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async (id: string) => {
    try { await del.mutateAsync(id); toast.success("Feature silindi"); if (detailItem?.id === id) setDetailItem(null); } catch (e: any) { toast.error(e.message); }
  };

  const handleVote = async (f: AnyRow, delta: number) => {
    try { await upsert.mutateAsync({ id: f.id, votes: Math.max(0, (f.votes ?? 0) + delta) }); } catch (e: any) { toast.error(e.message); }
  };

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter(f => {
      if (moscowFilter !== "all" && (f.moscow ?? "") !== moscowFilter) return false;
      if (statusFilter !== "all" && f.status !== statusFilter) return false;
      return true;
    });
  }, [data, moscowFilter, statusFilter]);

  const getOwnerName = (ownerId: string | null) => {
    if (!ownerId || !profiles) return null;
    const p = profiles.find(pr => pr.user_id === ownerId);
    return p?.full_name ?? null;
  };

  const getBlockedByTitle = (blockedById: string | null) => {
    if (!blockedById || !allFeatures) return null;
    const f = allFeatures.find(ft => ft.id === blockedById);
    return f?.title ?? null;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">MoSCoW:</Label>
          <Select value={moscowFilter} onValueChange={setMoscowFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tumu</SelectItem>
              {MOSCOW.map(m => <SelectItem key={m} value={m}>{MOSCOW_LABELS[m]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">Durum:</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tumu</SelectItem>
              {FEATURE_STATUS.map(s => <SelectItem key={s} value={s}>{FEATURE_STATUS_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Yeni Feature</Button></DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader><DialogTitle>{editItem ? "Feature Düzenle" : "Yeni Feature"}</DialogTitle></DialogHeader>
              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                <div><Label>Başlık</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                <div><Label>Aciklama</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Urun</Label>
                    <Select value={form.product_id} onValueChange={v => setForm({ ...form, product_id: v })}>
                      <SelectTrigger><SelectValue placeholder="--" /></SelectTrigger>
                      <SelectContent>{products?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Sahip</Label>
                    <Select value={form.owner_id} onValueChange={v => setForm({ ...form, owner_id: v })}>
                      <SelectTrigger><SelectValue placeholder="-- Sahip sec --" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">-- Yok --</SelectItem>
                        {profiles?.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name || p.user_id}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Durum</Label>
                    <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{FEATURE_STATUS.map(s => <SelectItem key={s} value={s}>{FEATURE_STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Oncelik</Label>
                    <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{PRIORITIES.map(s => <SelectItem key={s} value={s}>{{low:"Düşük",medium:"Orta",high:"Yüksek",urgent:"Acil"}[s] ?? s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>MoSCoW</Label>
                    <Select value={form.moscow} onValueChange={v => setForm({ ...form, moscow: v })}>
                      <SelectTrigger><SelectValue placeholder="--" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">-- Yok --</SelectItem>
                        {MOSCOW.map(m => <SelectItem key={m} value={m}>{MOSCOW_LABELS[m]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Bağımlılık (Engelleyen)</Label>
                  <Select value={form.blocked_by} onValueChange={v => setForm({ ...form, blocked_by: v })}>
                    <SelectTrigger><SelectValue placeholder="-- Yok --" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">-- Yok --</SelectItem>
                      {allFeatures?.filter(ft => ft.id !== editItem?.id).map(ft => <SelectItem key={ft.id} value={ft.id}>{ft.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="border-t pt-3">
                  <Label className="text-xs text-muted-foreground">RICE / ICE Skorlama</Label>
                  <div className="grid grid-cols-5 gap-2 mt-1">
                    <div><Label className="text-xs">Reach</Label><Input type="number" value={form.reach} onChange={e => setForm({ ...form, reach: e.target.value })} placeholder="0" /></div>
                    <div><Label className="text-xs">Impact</Label><Input type="number" step="0.25" value={form.impact} onChange={e => setForm({ ...form, impact: e.target.value })} placeholder="0-3" /></div>
                    <div><Label className="text-xs">Confidence</Label><Input type="number" value={form.confidence} onChange={e => setForm({ ...form, confidence: e.target.value })} placeholder="0-100" /></div>
                    <div><Label className="text-xs">Effort</Label><Input type="number" value={form.effort} onChange={e => setForm({ ...form, effort: e.target.value })} placeholder="kisi-ay" /></div>
                    <div><Label className="text-xs">Ease</Label><Input type="number" value={form.ease} onChange={e => setForm({ ...form, ease: e.target.value })} placeholder="1-10" /></div>
                  </div>
                </div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>İptal</Button><Button onClick={submit} disabled={upsert.isPending}>{editItem ? "Kaydet" : "Oluştur"}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!detailItem} onOpenChange={o => { if (!o) setDetailItem(null); }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {detailItem && <>
            <SheetHeader>
              <SheetTitle>{detailItem.title}</SheetTitle>
              <SheetDescription>Özellik Detayı</SheetDescription>
            </SheetHeader>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge className={tone[detailItem.status]}>{FEATURE_STATUS_LABELS[detailItem.status] ?? detailItem.status}</Badge>
                <Badge className={tone[detailItem.priority]}>{({low:"Düşük",medium:"Orta",high:"Yüksek",urgent:"Acil"} as Record<string,string>)[detailItem.priority] ?? detailItem.priority}</Badge>
                {detailItem.moscow && <Badge className={tone[detailItem.moscow]}>{MOSCOW_LABELS[detailItem.moscow] ?? detailItem.moscow}</Badge>}
              </div>
              {detailItem.description && <div><span className="font-medium">Aciklama:</span><p className="text-muted-foreground mt-1 whitespace-pre-wrap">{detailItem.description}</p></div>}
              {detailItem.owner_id && <div><span className="font-medium">Sahip:</span> {getOwnerName(detailItem.owner_id) ?? detailItem.owner_id}</div>}
              {detailItem.blocked_by && <div><span className="font-medium">Engelleniyor:</span> {getBlockedByTitle(detailItem.blocked_by) ?? detailItem.blocked_by}</div>}
              <div className="flex gap-3">
                <ScoreBadge rice={computeFeatureRice(detailItem)} ice={computeFeatureIce(detailItem)} />
              </div>
              <div className="flex items-center gap-2"><span className="font-medium">Oy:</span> {detailItem.votes ?? 0}</div>
              {detailItem.created_at && <div className="text-xs text-muted-foreground">Oluşturulma: {format(new Date(detailItem.created_at), "PPp", { locale: tr })}</div>}
            </div>
            <div className="mt-6 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { openEdit(detailItem); setDetailItem(null); }}><Pencil className="h-3.5 w-3.5 mr-1" />Düzenle</Button>
            </div>
          </>}
        </SheetContent>
      </Sheet>

      {isLoading ? <Skeleton className="h-40" /> : !filtered.length
        ? (data?.length ? <Card><CardContent className="p-8 text-center text-muted-foreground">Filtreye uyan feature bulunamadi.</CardContent></Card> : <EmptyState icon={Lightbulb} title="Henuz feature yok" desc="Roadmap'inizi olusturmak icin ozellik fikirlerinizi ekleyin, onceliklendirin ve release'lere baglayin." onNew={openCreate} />)
        : <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map(f => {
              const rice = computeFeatureRice(f);
              const ice = computeFeatureIce(f);
              return (
                <Card key={f.id} className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => setDetailItem(f)}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="font-medium flex items-center gap-1">{f.title} <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /></div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); openEdit(f); }}><Pencil className="h-3.5 w-3.5" /></Button>
                        <span onClick={e => e.stopPropagation()}><DeleteButton onConfirm={() => handleDelete(f.id)} isPending={del.isPending} /></span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Badge className={tone[f.priority]}>{({low:"Düşük",medium:"Orta",high:"Yüksek",urgent:"Acil"} as Record<string,string>)[f.priority] ?? f.priority}</Badge>
                      <Badge className={tone[f.status]}>{FEATURE_STATUS_LABELS[f.status] ?? f.status}</Badge>
                      {f.moscow && <Badge className={tone[f.moscow]}>{MOSCOW_LABELS[f.moscow] ?? f.moscow}</Badge>}
                    </div>
                    {f.description && <p className="text-sm text-muted-foreground line-clamp-2">{f.description}</p>}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={e => { e.stopPropagation(); handleVote(f, 1); }}><ThumbsUp className="h-3 w-3" /></Button>
                          {f.votes ?? 0}
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={e => { e.stopPropagation(); handleVote(f, -1); }}><ThumbsDown className="h-3 w-3" /></Button>
                        </span>
                        {f.owner_id && <span>{getOwnerName(f.owner_id) ?? "Sahip"}</span>}
                        {f.blocked_by && <span className="text-amber-400">Engelli</span>}
                      </div>
                      <ScoreBadge rice={rice} ice={ice} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>}
    </div>
  );
}

/* ========================== Feedback Tab ========================== */
function FeedbackTab() {
  const { data, isLoading } = useFeedback();
  const upsert = useUpsert("feedback");
  const del = useDelete("feedback");
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<AnyRow | null>(null);
  const [detailItem, setDetailItem] = useState<AnyRow | null>(null);
  const emptyForm = { title: "", body: "", category: "feature_request", status: "new", submitter_name: "", submitter_email: "", votes: 0 };
  const [form, setForm] = useState<AnyRow>(emptyForm);

  const openCreate = () => { setEditItem(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (f: AnyRow) => { setEditItem(f); setForm({ title: f.title ?? "", body: f.body ?? "", category: f.category ?? "feature_request", status: f.status ?? "new", submitter_name: f.submitter_name ?? "", submitter_email: f.submitter_email ?? "", votes: f.votes ?? 0 }); setOpen(true); };

  const submit = async () => {
    if (!form.title.trim()) return toast.error("Başlık gerekli");
    try {
      const payload: AnyRow = { ...form };
      if (editItem) payload.id = editItem.id;
      await upsert.mutateAsync(payload);
      toast.success(editItem ? "Feedback guncellendi" : "Feedback eklendi");
      setOpen(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async (id: string) => {
    try { await del.mutateAsync(id); toast.success("Feedback silindi"); if (detailItem?.id === id) setDetailItem(null); } catch (e: any) { toast.error(e.message); }
  };

  const handleVote = async (f: AnyRow, delta: number) => {
    try { await upsert.mutateAsync({ id: f.id, votes: Math.max(0, (f.votes ?? 0) + delta) }); } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Yeni Feedback</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editItem ? "Feedback Düzenle" : "Yeni Feedback"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Başlık</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Icerik</Label><Textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Gonderen</Label><Input value={form.submitter_name} onChange={e => setForm({ ...form, submitter_name: e.target.value })} /></div>
                <div><Label>E-posta</Label><Input value={form.submitter_email} onChange={e => setForm({ ...form, submitter_email: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Kategori</Label>
                  <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{FEEDBACK_CATEGORY.map(s => <SelectItem key={s} value={s}>{{ bug: "Hata", feature_request: "Özellik İsteği", praise: "Övgü", question: "Soru", complaint: "Şikayet" }[s] ?? s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Durum</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{FEEDBACK_STATUS.map(s => <SelectItem key={s} value={s}>{{ new: "Yeni", triaged: "Sınıflandırıldı", planned: "Planlandı", done: "Tamamlandı", wont_do: "Yapılmayacak" }[s] ?? s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>İptal</Button><Button onClick={submit} disabled={upsert.isPending}>{editItem ? "Kaydet" : "Oluştur"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!detailItem} onOpenChange={o => { if (!o) setDetailItem(null); }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {detailItem && <>
            <SheetHeader>
              <SheetTitle>{detailItem.title}</SheetTitle>
              <SheetDescription>Feedback Detayi</SheetDescription>
            </SheetHeader>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex gap-2"><Badge className={tone[detailItem.status]}>{detailItem.status}</Badge>{detailItem.category && <Badge variant="outline">{detailItem.category}</Badge>}</div>
              {detailItem.body && <p className="text-muted-foreground whitespace-pre-wrap">{detailItem.body}</p>}
              <div><span className="font-medium">Gonderen:</span> {detailItem.submitter_name || "Anonim"} ({detailItem.submitter_email || "--"})</div>
              <div className="flex items-center gap-2"><span className="font-medium">Oy:</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleVote(detailItem, 1)}><ThumbsUp className="h-3.5 w-3.5" /></Button>
                <span className="font-mono">{detailItem.votes ?? 0}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleVote(detailItem, -1)}><ThumbsDown className="h-3.5 w-3.5" /></Button>
              </div>
              {detailItem.created_at && <div className="text-xs text-muted-foreground">Oluşturulma: {format(new Date(detailItem.created_at), "PPp", { locale: tr })}</div>}
            </div>
            <div className="mt-6 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { openEdit(detailItem); setDetailItem(null); }}><Pencil className="h-3.5 w-3.5 mr-1" />Düzenle</Button>
            </div>
          </>}
        </SheetContent>
      </Sheet>

      {isLoading ? <Skeleton className="h-40" /> : !data?.length
        ? <EmptyState icon={MessageSquare} title="Feedback yok" desc="Müşteri geri bildirimlerini toplayin, kategorize edin ve feature'lara baglayin." onNew={openCreate} />
        : <div className="space-y-2">
            {data.map(f => (
              <Card key={f.id} className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => setDetailItem(f)}>
                <CardContent className="p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium flex items-center gap-1">{f.title} <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /></div>
                    {f.body && <p className="text-sm text-muted-foreground line-clamp-2">{f.body}</p>}
                    <div className="text-xs text-muted-foreground mt-1">{f.submitter_name || "Anonim"} · {f.submitter_email || "--"}</div>
                  </div>
                  <div className="flex flex-col gap-1 items-end shrink-0">
                    <div className="flex items-center gap-1">
                      <Badge className={tone[f.status]}>{f.status}</Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); openEdit(f); }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <span onClick={e => e.stopPropagation()}><DeleteButton onConfirm={() => handleDelete(f.id)} isPending={del.isPending} /></span>
                    </div>
                    {f.category && <Badge variant="outline">{f.category}</Badge>}
                    <div className="flex items-center gap-1 text-xs" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleVote(f, 1)}><ThumbsUp className="h-3 w-3" /></Button>
                      <span className="font-mono">{f.votes ?? 0}</span>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleVote(f, -1)}><ThumbsDown className="h-3 w-3" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>}
    </div>
  );
}

/* ========================== Releases Tab ========================== */
function ReleasesTab() {
  const { data, isLoading } = useReleases();
  const { data: products } = useProducts();
  const upsert = useUpsert("releases");
  const del = useDelete("releases");
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<AnyRow | null>(null);
  const [detailItem, setDetailItem] = useState<AnyRow | null>(null);
  const emptyForm = { version: "", name: "", status: "planned", release_date: "", product_id: "", notes: "" };
  const [form, setForm] = useState<AnyRow>(emptyForm);

  const openCreate = () => { setEditItem(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (r: AnyRow) => { setEditItem(r); setForm({ version: r.version ?? "", name: r.name ?? "", status: r.status ?? "planned", release_date: r.release_date ?? "", product_id: r.product_id ?? "", notes: r.notes ?? "" }); setOpen(true); };

  const submit = async () => {
    if (!form.version.trim()) return toast.error("Versiyon gerekli");
    try {
      const payload: AnyRow = { ...form, product_id: form.product_id || null, release_date: form.release_date || null };
      if (editItem) payload.id = editItem.id;
      await upsert.mutateAsync(payload);
      toast.success(editItem ? "Release guncellendi" : "Release kaydedildi");
      setOpen(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async (id: string) => {
    try { await del.mutateAsync(id); toast.success("Release silindi"); if (detailItem?.id === id) setDetailItem(null); } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Yeni Release</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editItem ? "Release Düzenle" : "Yeni Release"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Versiyon</Label><Input placeholder="v1.2.0" value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} /></div>
                <div><Label>İsim</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Urun</Label>
                  <Select value={form.product_id} onValueChange={v => setForm({ ...form, product_id: v })}>
                    <SelectTrigger><SelectValue placeholder="--" /></SelectTrigger>
                    <SelectContent>{products?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Durum</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{RELEASE_STATUS.map(s => <SelectItem key={s} value={s}>{{ planned: "Planlandı", in_progress: "Devam Ediyor", released: "Yayınlandı", cancelled: "İptal Edildi" }[s] ?? s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Tarih</Label><Input type="date" value={form.release_date} onChange={e => setForm({ ...form, release_date: e.target.value })} /></div>
              </div>
              <div><Label>Notlar</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>İptal</Button><Button onClick={submit} disabled={upsert.isPending}>{editItem ? "Kaydet" : "Oluştur"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!detailItem} onOpenChange={o => { if (!o) setDetailItem(null); }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {detailItem && <>
            <SheetHeader>
              <SheetTitle>{detailItem.version} {detailItem.name && `- ${detailItem.name}`}</SheetTitle>
              <SheetDescription>Release Detayi</SheetDescription>
            </SheetHeader>
            <div className="mt-4 space-y-3 text-sm">
              <Badge className={tone[detailItem.status]}>{detailItem.status}</Badge>
              {detailItem.release_date && <div><span className="font-medium">Tarih:</span> {format(new Date(detailItem.release_date), "PP", { locale: tr })}</div>}
              {detailItem.notes && <div><span className="font-medium">Notlar:</span><p className="text-muted-foreground mt-1 whitespace-pre-wrap">{detailItem.notes}</p></div>}
              {detailItem.created_at && <div className="text-xs text-muted-foreground">Oluşturulma: {format(new Date(detailItem.created_at), "PPp", { locale: tr })}</div>}
            </div>
            <div className="mt-6 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { openEdit(detailItem); setDetailItem(null); }}><Pencil className="h-3.5 w-3.5 mr-1" />Düzenle</Button>
            </div>
          </>}
        </SheetContent>
      </Sheet>

      {isLoading ? <Skeleton className="h-40" /> : !data?.length
        ? <EmptyState icon={Rocket} title="Release yok" desc="Surum planlayin, changelog tutun ve feature'lari release'lere baglayin." onNew={openCreate} />
        : <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.map(r => (
              <Card key={r.id} className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => setDetailItem(r)}>
                <CardContent className="p-4 space-y-1">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="font-medium flex items-center gap-1">{r.version} {r.name && <span className="text-muted-foreground font-normal">· {r.name}</span>} <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /></div>
                      {r.release_date && <div className="text-xs text-muted-foreground">{format(new Date(r.release_date), "PP", { locale: tr })}</div>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge className={tone[r.status]}>{r.status}</Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); openEdit(r); }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <span onClick={e => e.stopPropagation()}><DeleteButton onConfirm={() => handleDelete(r.id)} isPending={del.isPending} /></span>
                    </div>
                  </div>
                  {r.notes && <p className="text-sm text-muted-foreground line-clamp-3">{r.notes}</p>}
                </CardContent>
              </Card>
            ))}
          </div>}
    </div>
  );
}

/* ========================== Incidents Tab ========================== */
function IncidentsTab() {
  const { data, isLoading } = useIncidents();
  const upsert = useUpsert("incidents");
  const del = useDelete("incidents");
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<AnyRow | null>(null);
  const [detailItem, setDetailItem] = useState<AnyRow | null>(null);
  const emptyForm = { title: "", summary: "", severity: "sev3", status: "investigating", impact: "" };
  const [form, setForm] = useState<AnyRow>(emptyForm);

  const openCreate = () => { setEditItem(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (i: AnyRow) => { setEditItem(i); setForm({ title: i.title ?? "", summary: i.summary ?? "", severity: i.severity ?? "sev3", status: i.status ?? "investigating", impact: i.impact ?? "" }); setOpen(true); };

  const submit = async () => {
    if (!form.title.trim()) return toast.error("Başlık gerekli");
    try {
      const payload: AnyRow = { ...form };
      if (editItem) payload.id = editItem.id;
      await upsert.mutateAsync(payload);
      toast.success(editItem ? "Incident guncellendi" : "Incident kaydedildi");
      setOpen(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async (id: string) => {
    try { await del.mutateAsync(id); toast.success("Incident silindi"); if (detailItem?.id === id) setDetailItem(null); } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Yeni Incident</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editItem ? "Incident Düzenle" : "Yeni Incident"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Başlık</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Ozet</Label><Textarea value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Siddet</Label>
                  <Select value={form.severity} onValueChange={v => setForm({ ...form, severity: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SEVERITY.map(s => <SelectItem key={s} value={s}>{{ sev1: "SEV1 — Kritik", sev2: "SEV2 — Yüksek", sev3: "SEV3 — Orta", sev4: "SEV4 — Düşük" }[s] ?? s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Durum</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{INCIDENT_STATUS.map(s => <SelectItem key={s} value={s}>{{ investigating: "Araştırılıyor", identified: "Tanımlandı", monitoring: "İzleniyor", resolved: "Çözüldü", postmortem: "Postmortem" }[s] ?? s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Etki</Label><Input value={form.impact} onChange={e => setForm({ ...form, impact: e.target.value })} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>İptal</Button><Button onClick={submit} disabled={upsert.isPending}>{editItem ? "Kaydet" : "Oluştur"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!detailItem} onOpenChange={o => { if (!o) setDetailItem(null); }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {detailItem && <>
            <SheetHeader>
              <SheetTitle>{detailItem.title}</SheetTitle>
              <SheetDescription>Incident Detayi</SheetDescription>
            </SheetHeader>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex gap-2"><Badge className={tone[detailItem.severity]}>{detailItem.severity}</Badge><Badge className={tone[detailItem.status]}>{detailItem.status}</Badge></div>
              {detailItem.summary && <div><span className="font-medium">Ozet:</span><p className="text-muted-foreground mt-1 whitespace-pre-wrap">{detailItem.summary}</p></div>}
              {detailItem.impact && <div><span className="font-medium">Etki:</span> {detailItem.impact}</div>}
              {detailItem.started_at && <div><span className="font-medium">Başlangıç:</span> {format(new Date(detailItem.started_at), "PPp", { locale: tr })}</div>}
              {detailItem.resolved_at && <div><span className="font-medium">Çözüm:</span> {format(new Date(detailItem.resolved_at), "PPp", { locale: tr })}</div>}
            </div>
            <div className="mt-6 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { openEdit(detailItem); setDetailItem(null); }}><Pencil className="h-3.5 w-3.5 mr-1" />Düzenle</Button>
            </div>
          </>}
        </SheetContent>
      </Sheet>

      {isLoading ? <Skeleton className="h-40" /> : !data?.length
        ? <EmptyState icon={AlertOctagon} title="Incident yok" desc="Uretim olaylarini siddet, zaman cizelgesi ve postmortem ile takip edin." onNew={openCreate} />
        : <div className="space-y-2">
            {data.map(i => (
              <Card key={i.id} className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => setDetailItem(i)}>
                <CardContent className="p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium flex items-center gap-1">{i.title} <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /></div>
                    {i.summary && <p className="text-sm text-muted-foreground line-clamp-2">{i.summary}</p>}
                    {i.impact && <div className="text-xs text-muted-foreground mt-1">Etki: {i.impact}</div>}
                    <div className="text-xs text-muted-foreground">Başlangıç: {format(new Date(i.started_at), "PPp", { locale: tr })}</div>
                  </div>
                  <div className="flex flex-col gap-1 items-end shrink-0">
                    <div className="flex items-center gap-1">
                      <Badge className={tone[i.severity]}>{i.severity}</Badge>
                      <Badge className={tone[i.status]}>{i.status}</Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); openEdit(i); }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <span onClick={e => e.stopPropagation()}><DeleteButton onConfirm={() => handleDelete(i.id)} isPending={del.isPending} /></span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>}
    </div>
  );
}

/* ========================== Main Page ========================== */
export default function Product() {
  return (
    <DomainWorkspace domain="product" title="Ürün" subtitle="Ürün, özellik, geri bildirim, sürüm ve olay yönetimi tek yerde.">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Urun & Muhendislik</h1>
          <p className="text-sm text-muted-foreground">Urunler, roadmap, feedback, surumler ve incident yonetimi.</p>
        </div>
        <IntegrationsPanel domain="product" compact />
        <Tabs defaultValue="features">
          <TabsList>
            <TabsTrigger value="features">Roadmap</TabsTrigger>
            <TabsTrigger value="feedback">Geri Bildirim</TabsTrigger>
            <TabsTrigger value="releases">Sürümler</TabsTrigger>
            <TabsTrigger value="incidents">Olaylar</TabsTrigger>
            <TabsTrigger value="products">Urunler</TabsTrigger>
          </TabsList>
          <TabsContent value="features" className="mt-4"><FeaturesTab /></TabsContent>
          <TabsContent value="feedback" className="mt-4"><FeedbackTab /></TabsContent>
          <TabsContent value="releases" className="mt-4"><ReleasesTab /></TabsContent>
          <TabsContent value="incidents" className="mt-4"><IncidentsTab /></TabsContent>
          <TabsContent value="products" className="mt-4"><ProductsTab /></TabsContent>
        </Tabs>
      </div>
    </DomainWorkspace>
  );
}
