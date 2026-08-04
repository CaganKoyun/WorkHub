import { useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useProducts, useFeatures, useFeedback, useReleases, useIncidents, useUpsert,
} from "@/lib/product-hooks";
import { Plus, Package, Lightbulb, MessageSquare, Rocket, AlertOctagon } from "lucide-react";
import { IntegrationsPanel } from "@/components/integrations/IntegrationsPanel";
import { toast } from "sonner";
import { format } from "date-fns";

const FEATURE_STATUS = ["idea", "planned", "in_progress", "shipped", "cancelled"] as const;
const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
const FEEDBACK_STATUS = ["new", "triaged", "planned", "done", "wont_do"] as const;
const FEEDBACK_CATEGORY = ["bug", "feature_request", "praise", "question", "complaint"] as const;
const RELEASE_STATUS = ["planned", "in_progress", "released", "cancelled"] as const;
const SEVERITY = ["sev1", "sev2", "sev3", "sev4"] as const;
const INCIDENT_STATUS = ["investigating", "identified", "monitoring", "resolved", "postmortem"] as const;

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
  const upsert = useUpsert("products");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", status: "active" });
  const submit = async () => {
    if (!form.name.trim()) return toast.error("İsim gerekli");
    try { await upsert.mutateAsync(form); toast.success("Ürün eklendi"); setOpen(false); setForm({ name: "", description: "", status: "active" }); }
    catch (e: any) { toast.error(e.message); }
  };
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Yeni Ürün</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Yeni Ürün</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>İsim</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Açıklama</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>İptal</Button><Button onClick={submit} disabled={upsert.isPending}>Oluştur</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? <Skeleton className="h-40" /> : !data?.length
        ? <EmptyState icon={Package} title="Henüz ürün yok" desc="Şirketinizin ürünlerini tanımlayın; feature, feedback, release ve incident kayıtları bu ürünlere bağlanır." onNew={() => setOpen(true)} />
        : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map(p => (
            <Card key={p.id}><CardContent className="p-5 space-y-2">
              <div className="flex justify-between"><div className="font-medium">{p.name}</div><Badge className={tone[p.status] ?? ""}>{p.status}</Badge></div>
              {p.description && <p className="text-sm text-muted-foreground line-clamp-3">{p.description}</p>}
            </CardContent></Card>
          ))}
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
  const [form, setForm] = useState<any>({ title: "", description: "", status: "idea", priority: "medium", product_id: "" });
  const submit = async () => {
    if (!form.title.trim()) return toast.error("Başlık gerekli");
    try { await upsert.mutateAsync({ ...form, product_id: form.product_id || null }); toast.success("Feature eklendi"); setOpen(false); setForm({ title: "", description: "", status: "idea", priority: "medium", product_id: "" }); }
    catch (e: any) { toast.error(e.message); }
  };
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Yeni Feature</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Yeni Feature</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Başlık</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Açıklama</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Ürün</Label>
                  <Select value={form.product_id} onValueChange={v => setForm({ ...form, product_id: v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>{products?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Durum</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{FEATURE_STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Öncelik</Label>
                  <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PRIORITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>İptal</Button><Button onClick={submit} disabled={upsert.isPending}>Oluştur</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? <Skeleton className="h-40" /> : !data?.length
        ? <EmptyState icon={Lightbulb} title="Henüz feature yok" desc="Roadmap'inizi oluşturmak için özellik fikirlerinizi ekleyin, önceliklendirin ve release'lere bağlayın." onNew={() => setOpen(true)} />
        : <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.map(f => (
              <Card key={f.id}><CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="font-medium">{f.title}</div>
                  <div className="flex gap-1"><Badge className={tone[f.priority]}>{f.priority}</Badge><Badge className={tone[f.status]}>{f.status}</Badge></div>
                </div>
                {f.description && <p className="text-sm text-muted-foreground line-clamp-2">{f.description}</p>}
                <div className="text-xs text-muted-foreground">Oy: {f.votes ?? 0}</div>
              </CardContent></Card>
            ))}
          </div>}
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
    if (!form.title.trim()) return toast.error("Başlık gerekli");
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
              <div><Label>Başlık</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>İçerik</Label><Textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Gönderen</Label><Input value={form.submitter_name} onChange={e => setForm({ ...form, submitter_name: e.target.value })} /></div>
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
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>İptal</Button><Button onClick={submit} disabled={upsert.isPending}>Kaydet</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? <Skeleton className="h-40" /> : !data?.length
        ? <EmptyState icon={MessageSquare} title="Feedback yok" desc="Müşteri geri bildirimlerini toplayın, kategorize edin ve feature'lara bağlayın." onNew={() => setOpen(true)} />
        : <div className="space-y-2">
            {data.map(f => (
              <Card key={f.id}><CardContent className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">{f.title}</div>
                  {f.body && <p className="text-sm text-muted-foreground line-clamp-2">{f.body}</p>}
                  <div className="text-xs text-muted-foreground mt-1">{f.submitter_name || "Anonim"} · {f.submitter_email || "—"}</div>
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
                <div><Label>İsim</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Ürün</Label>
                  <Select value={form.product_id} onValueChange={v => setForm({ ...form, product_id: v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
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
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>İptal</Button><Button onClick={submit} disabled={upsert.isPending}>Kaydet</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? <Skeleton className="h-40" /> : !data?.length
        ? <EmptyState icon={Rocket} title="Release yok" desc="Sürüm planlayın, changelog tutun ve feature'ları release'lere bağlayın." onNew={() => setOpen(true)} />
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
    if (!form.title.trim()) return toast.error("Başlık gerekli");
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
              <div><Label>Başlık</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Özet</Label><Textarea value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Şiddet</Label>
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
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>İptal</Button><Button onClick={submit} disabled={upsert.isPending}>Kaydet</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? <Skeleton className="h-40" /> : !data?.length
        ? <EmptyState icon={AlertOctagon} title="Incident yok" desc="Üretim olaylarını şiddet, zaman çizelgesi ve postmortem ile takip edin." onNew={() => setOpen(true)} />
        : <div className="space-y-2">
            {data.map(i => (
              <Card key={i.id}><CardContent className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">{i.title}</div>
                  {i.summary && <p className="text-sm text-muted-foreground line-clamp-2">{i.summary}</p>}
                  {i.impact && <div className="text-xs text-muted-foreground mt-1">Etki: {i.impact}</div>}
                  <div className="text-xs text-muted-foreground">Başlangıç: {format(new Date(i.started_at), "PPp")}</div>
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

export default function Product() {
  return (
    <DomainWorkspace domain="product" title="Product" subtitle="Ürün, feature, feedback, release ve incident tek yerde.">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Ürün & Mühendislik</h1>
          <p className="text-sm text-muted-foreground">Ürünler, roadmap, feedback, sürümler ve incident yönetimi.</p>
        </div>
        <IntegrationsPanel domain="product" compact />
        <Tabs defaultValue="features">
          <TabsList>
            <TabsTrigger value="features">Roadmap</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
            <TabsTrigger value="releases">Releases</TabsTrigger>
            <TabsTrigger value="incidents">Incidents</TabsTrigger>
            <TabsTrigger value="products">Ürünler</TabsTrigger>
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
