import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Building2, Users, Briefcase, Scale, Layers, ShieldCheck, Trash2 } from "lucide-react";
import {
  useDepartments, useUpsertDepartment, useDeleteDepartment,
  useTeams, useUpsertTeam, useDeleteTeam,
  useJobTitles, useUpsertJobTitle, useDeleteJobTitle,
  useLegalEntities, useUpsertLegalEntity, useDeleteLegalEntity,
  useModuleOwnership, useUpsertModuleOwnership, FOUNDEROS_MODULES,
  usePermissionSets, useUpsertPermissionSet, useDeletePermissionSet,
} from "@/lib/org-hooks";
import { toast } from "sonner";

export default function Company() {
  return (
    <AppLayout>
      <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Şirket Yapısı</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Departmanlar, takımlar, unvanlar ve fonksiyon sahiplikleri — organizasyonunuzu modüllerden bağımsız modelleyin.
          </p>
        </div>

        <Tabs defaultValue="departments" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="departments"><Building2 className="h-3.5 w-3.5 mr-1.5" />Departmanlar</TabsTrigger>
            <TabsTrigger value="teams"><Users className="h-3.5 w-3.5 mr-1.5" />Takımlar</TabsTrigger>
            <TabsTrigger value="titles"><Briefcase className="h-3.5 w-3.5 mr-1.5" />Unvanlar</TabsTrigger>
            <TabsTrigger value="entities"><Scale className="h-3.5 w-3.5 mr-1.5" />Tüzel Kişilikler</TabsTrigger>
            <TabsTrigger value="modules"><Layers className="h-3.5 w-3.5 mr-1.5" />Modül Sahipliği</TabsTrigger>
            <TabsTrigger value="permissions"><ShieldCheck className="h-3.5 w-3.5 mr-1.5" />Yetki Paketleri</TabsTrigger>
          </TabsList>

          <TabsContent value="departments"><DepartmentsTab /></TabsContent>
          <TabsContent value="teams"><TeamsTab /></TabsContent>
          <TabsContent value="titles"><TitlesTab /></TabsContent>
          <TabsContent value="entities"><EntitiesTab /></TabsContent>
          <TabsContent value="modules"><ModuleOwnershipTab /></TabsContent>
          <TabsContent value="permissions"><PermissionSetsTab /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

// ============ Departments ============
function DepartmentsTab() {
  const { data: departments = [], isLoading } = useDepartments();
  const upsert = useUpsertDepartment();
  const del = useDeleteDepartment();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", description: "", parent_id: "" });

  const save = async () => {
    if (!form.name.trim()) return;
    try {
      await upsert.mutateAsync({
        name: form.name,
        code: form.code || null,
        description: form.description || null,
        parent_id: form.parent_id || null,
      } as any);
      toast.success("Departman eklendi");
      setOpen(false);
      setForm({ name: "", code: "", description: "", parent_id: "" });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Organizasyonun kurumsal iskeleti. Bir kişi birden fazla departmana bağlı olabilir.</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Departman</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Yeni Departman</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>İsim *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Finans" /></div>
              <div><Label>Kod</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="FIN" /></div>
              <div>
                <Label>Üst Departman</Label>
                <Select value={form.parent_id || "none"} onValueChange={v => setForm(f => ({ ...f, parent_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— yok —</SelectItem>
                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Açıklama</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            </div>
            <DialogFooter><Button onClick={save} disabled={upsert.isPending}>Kaydet</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Yükleniyor…</p> :
        departments.length === 0 ? <EmptyState label="Henüz departman yok." /> :
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map(d => (
            <Card key={d.id} className="p-3 flex items-start justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{d.name}</span>
                  {d.code && <Badge variant="outline" className="text-[10px]">{d.code}</Badge>}
                </div>
                {d.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{d.description}</p>}
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => del.mutate(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </Card>
          ))}
        </div>}
    </div>
  );
}

// ============ Teams ============
function TeamsTab() {
  const { data: teams = [], isLoading } = useTeams();
  const { data: departments = [] } = useDepartments();
  const upsert = useUpsertTeam();
  const del = useDeleteTeam();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", department_id: "", description: "" });

  const save = async () => {
    if (!form.name.trim()) return;
    try {
      await upsert.mutateAsync({ name: form.name, department_id: form.department_id || null, description: form.description || null } as any);
      toast.success("Takım eklendi"); setOpen(false); setForm({ name: "", department_id: "", description: "" });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Departman altında çalışan operasyonel gruplar.</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Takım</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Yeni Takım</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>İsim *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Growth" /></div>
              <div>
                <Label>Departman</Label>
                <Select value={form.department_id || "none"} onValueChange={v => setForm(f => ({ ...f, department_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— yok —</SelectItem>
                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Açıklama</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            </div>
            <DialogFooter><Button onClick={save} disabled={upsert.isPending}>Kaydet</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Yükleniyor…</p> :
        teams.length === 0 ? <EmptyState label="Henüz takım yok." /> :
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map(t => {
            const dep = departments.find(d => d.id === t.department_id);
            return (
              <Card key={t.id} className="p-3 flex items-start justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{t.name}</span>
                    {dep && <Badge variant="outline" className="text-[10px]">{dep.name}</Badge>}
                  </div>
                  {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => del.mutate(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </Card>
            );
          })}
        </div>}
    </div>
  );
}

// ============ Job Titles ============
function TitlesTab() {
  const { data: titles = [], isLoading } = useJobTitles();
  const { data: departments = [] } = useDepartments();
  const upsert = useUpsertJobTitle();
  const del = useDeleteJobTitle();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", department_id: "", level: "" });

  const save = async () => {
    if (!form.name.trim()) return;
    try {
      await upsert.mutateAsync({ name: form.name, department_id: form.department_id || null, level: form.level || null } as any);
      toast.success("Unvan eklendi"); setOpen(false); setForm({ name: "", department_id: "", level: "" });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Unvanlar rolden bağımsızdır — aynı unvan farklı yetkilerle atanabilir.</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Unvan</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Yeni Unvan</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>İsim *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Finance Manager" /></div>
              <div>
                <Label>Departman</Label>
                <Select value={form.department_id || "none"} onValueChange={v => setForm(f => ({ ...f, department_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— yok —</SelectItem>
                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Seviye</Label>
                <Select value={form.level || "none"} onValueChange={v => setForm(f => ({ ...f, level: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    <SelectItem value="junior">Junior</SelectItem>
                    <SelectItem value="mid">Mid</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="head">Head</SelectItem>
                    <SelectItem value="c-level">C-Level</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button onClick={save} disabled={upsert.isPending}>Kaydet</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Yükleniyor…</p> :
        titles.length === 0 ? <EmptyState label="Henüz unvan yok." /> :
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {titles.map(t => {
            const dep = departments.find(d => d.id === t.department_id);
            return (
              <Card key={t.id} className="p-3 flex items-start justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{t.name}</span>
                    {t.level && <Badge variant="secondary" className="text-[10px]">{t.level}</Badge>}
                    {dep && <Badge variant="outline" className="text-[10px]">{dep.name}</Badge>}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => del.mutate(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </Card>
            );
          })}
        </div>}
    </div>
  );
}

// ============ Legal Entities ============
function EntitiesTab() {
  const { data: entities = [], isLoading } = useLegalEntities();
  const upsert = useUpsertLegalEntity();
  const del = useDeleteLegalEntity();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", legal_name: "", country: "", currency: "USD", tax_id: "", is_primary: false });

  const save = async () => {
    if (!form.name.trim()) return;
    try {
      await upsert.mutateAsync(form as any);
      toast.success("Tüzel kişilik eklendi"); setOpen(false);
      setForm({ name: "", legal_name: "", country: "", currency: "USD", tax_id: "", is_primary: false });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Çoklu şirket yapılarını modelleyin (holding, iştirak, ülke şubesi vb.).</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Tüzel Kişilik</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Yeni Tüzel Kişilik</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>İsim *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>Yasal Ünvan</Label><Input value={form.legal_name} onChange={e => setForm(f => ({ ...f, legal_name: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Ülke</Label><Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="TR" /></div>
                <div><Label>Para Birimi</Label><Input value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} /></div>
              </div>
              <div><Label>Vergi No</Label><Input value={form.tax_id} onChange={e => setForm(f => ({ ...f, tax_id: e.target.value }))} /></div>
            </div>
            <DialogFooter><Button onClick={save} disabled={upsert.isPending}>Kaydet</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Yükleniyor…</p> :
        entities.length === 0 ? <EmptyState label="Henüz tüzel kişilik yok." /> :
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {entities.map(e => (
            <Card key={e.id} className="p-3 flex items-start justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{e.name}</span>
                  {e.is_primary && <Badge className="text-[10px]">Primary</Badge>}
                  {e.currency && <Badge variant="outline" className="text-[10px]">{e.currency}</Badge>}
                  {e.country && <Badge variant="outline" className="text-[10px]">{e.country}</Badge>}
                </div>
                {e.legal_name && <p className="text-xs text-muted-foreground mt-1">{e.legal_name}</p>}
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => del.mutate(e.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </Card>
          ))}
        </div>}
    </div>
  );
}

// ============ Module Ownership ============
function ModuleOwnershipTab() {
  const { data: ownership = [] } = useModuleOwnership();
  const { data: departments = [] } = useDepartments();
  const upsert = useUpsertModuleOwnership();

  const byModule = Object.fromEntries(ownership.map(o => [o.module, o]));

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Her ürün modülünün organizasyonel sahibini belirleyin. Bir startup'ta finans modülünün sahibi "Founder" departmanı olabilir.
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {FOUNDEROS_MODULES.map(mod => {
          const current = byModule[mod];
          return (
            <Card key={mod} className="p-3">
              <div className="text-sm font-medium capitalize mb-2">{mod}</div>
              <Select
                value={current?.owner_department_id || "none"}
                onValueChange={(v) => upsert.mutate({ module: mod, owner_department_id: v === "none" ? null : v })}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Sahip departman" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— sahip yok —</SelectItem>
                  {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ============ Permission Sets ============
function PermissionSetsTab() {
  const { data: sets = [], isLoading } = usePermissionSets();
  const upsert = useUpsertPermissionSet();
  const del = useDeletePermissionSet();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });

  const save = async () => {
    if (!form.name.trim()) return;
    try {
      await upsert.mutateAsync({ name: form.name, description: form.description || null, permission_map: {}, scope: {} } as any);
      toast.success("Yetki paketi oluşturuldu"); setOpen(false); setForm({ name: "", description: "" });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Rol paketleri — aynı unvana farklı yetki paketi bağlayabilirsiniz. Matris düzenlemesi Workspace Ayarları altında.</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Paket</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Yeni Yetki Paketi</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>İsim *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="External Accountant" /></div>
              <div><Label>Açıklama</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            </div>
            <DialogFooter><Button onClick={save} disabled={upsert.isPending}>Kaydet</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Yükleniyor…</p> :
        sets.length === 0 ? <EmptyState label="Henüz yetki paketi yok." /> :
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {sets.map(s => (
            <Card key={s.id} className="p-3 flex items-start justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{s.name}</span>
                  {s.is_system && <Badge variant="secondary" className="text-[10px]">System</Badge>}
                </div>
                {s.description && <p className="text-xs text-muted-foreground mt-1">{s.description}</p>}
              </div>
              {!s.is_system && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => del.mutate(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              )}
            </Card>
          ))}
        </div>}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <Card className="p-8 text-center">
      <p className="text-sm text-muted-foreground">{label}</p>
    </Card>
  );
}
