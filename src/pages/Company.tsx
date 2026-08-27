import { useState, useMemo, useEffect } from "react";
import { DomainWorkspace } from "@/components/DomainWorkspace";
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
import {
  Plus, Building2, Users, Briefcase, Scale, Layers, ShieldCheck, Trash2,
  LayoutDashboard, Search, Pencil, Globe, MapPin, Calendar, Image,
  ChevronRight, UserCheck, Hash, FolderTree, Network,
} from "lucide-react";
import {
  useDepartments, useUpsertDepartment, useDeleteDepartment,
  useTeams, useUpsertTeam, useDeleteTeam,
  useJobTitles, useUpsertJobTitle, useDeleteJobTitle,
  useLegalEntities, useUpsertLegalEntity, useDeleteLegalEntity,
  useModuleOwnership, useUpsertModuleOwnership, FOUNDEROS_MODULES,
  usePermissionSets, useUpsertPermissionSet, useDeletePermissionSet,
} from "@/lib/org-hooks";
import { useEmployees } from "@/lib/assets-hooks";
import { toast } from "sonner";

// ---- localStorage helpers for company info ----
const COMPANY_INFO_KEY = "workhub_company_info";
interface CompanyInfo {
  name: string;
  address: string;
  website: string;
  foundingDate: string;
}
function loadCompanyInfo(): CompanyInfo {
  try {
    const raw = localStorage.getItem(COMPANY_INFO_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { name: "", address: "", website: "", foundingDate: "" };
}
function saveCompanyInfo(info: CompanyInfo) {
  localStorage.setItem(COMPANY_INFO_KEY, JSON.stringify(info));
}

export default function Company() {
  return (
    <DomainWorkspace domain="company" title="Şirket Yapısı">
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overview"><LayoutDashboard className="h-3.5 w-3.5 mr-1.5" />Genel Bakış</TabsTrigger>
          <TabsTrigger value="departments"><Building2 className="h-3.5 w-3.5 mr-1.5" />Departmanlar</TabsTrigger>
          <TabsTrigger value="teams"><Users className="h-3.5 w-3.5 mr-1.5" />Takımlar</TabsTrigger>
          <TabsTrigger value="titles"><Briefcase className="h-3.5 w-3.5 mr-1.5" />Ünvanlar</TabsTrigger>
          <TabsTrigger value="entities"><Scale className="h-3.5 w-3.5 mr-1.5" />Tüzel Kişilikler</TabsTrigger>
          <TabsTrigger value="modules"><Layers className="h-3.5 w-3.5 mr-1.5" />Modül Sahipliği</TabsTrigger>
          <TabsTrigger value="permissions"><ShieldCheck className="h-3.5 w-3.5 mr-1.5" />Yetki Paketleri</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><OverviewTab /></TabsContent>
        <TabsContent value="departments"><DepartmentsTab /></TabsContent>
        <TabsContent value="teams"><TeamsTab /></TabsContent>
        <TabsContent value="titles"><TitlesTab /></TabsContent>
        <TabsContent value="entities"><EntitiesTab /></TabsContent>
        <TabsContent value="modules"><ModuleOwnershipTab /></TabsContent>
        <TabsContent value="permissions"><PermissionSetsTab /></TabsContent>
      </Tabs>
    </DomainWorkspace>
  );
}

// ============ Overview / Dashboard ============
function OverviewTab() {
  const { data: departments = [] } = useDepartments();
  const { data: teams = [] } = useTeams();
  const { data: employees = [] } = useEmployees();
  const { data: entities = [] } = useLegalEntities();
  const { data: ownership = [] } = useModuleOwnership();

  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(loadCompanyInfo);
  const [editingInfo, setEditingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState<CompanyInfo>(companyInfo);

  const saveInfo = () => {
    saveCompanyInfo(infoForm);
    setCompanyInfo(infoForm);
    setEditingInfo(false);
    toast.success("Şirket bilgileri kaydedildi");
  };

  // build department tree
  const deptTree = useMemo(() => {
    const roots = departments.filter(d => !d.parent_id);
    const children = (parentId: string) => departments.filter(d => d.parent_id === parentId);
    return { roots, children };
  }, [departments]);

  // employee counts by department
  const empByDept = useMemo(() => {
    const map: Record<string, number> = {};
    employees.forEach(e => {
      if (e.department) {
        // match by name since employees store department name
        const dept = departments.find(d => d.name === e.department);
        if (dept) map[dept.id] = (map[dept.id] || 0) + 1;
      }
    });
    return map;
  }, [employees, departments]);

  // module ownership map
  const byModule = Object.fromEntries(ownership.map(o => [o.module, o]));

  const stats = [
    { label: "Departman", value: departments.length, icon: Building2, color: "text-blue-600 dark:text-blue-400" },
    { label: "Takım", value: teams.length, icon: Users, color: "text-emerald-600 dark:text-emerald-400" },
    { label: "Çalışan", value: employees.length, icon: UserCheck, color: "text-violet-600 dark:text-violet-400" },
    { label: "Tüzel Kişilik", value: entities.length, icon: Scale, color: "text-amber-600 dark:text-amber-400" },
  ];

  const renderDeptNode = (deptId: string, depth: number): React.ReactNode => {
    const dept = departments.find(d => d.id === deptId);
    if (!dept) return null;
    const deptTeams = teams.filter(t => t.department_id === deptId);
    const childDepts = deptTree.children(deptId);
    return (
      <div key={dept.id} style={{ marginLeft: depth * 20 }}>
        <div className="flex items-center gap-2 py-1.5">
          {(childDepts.length > 0 || deptTeams.length > 0) && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
          <Building2 className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium">{dept.name}</span>
          {dept.code && <Badge variant="outline" className="text-[10px]">{dept.code}</Badge>}
          {empByDept[dept.id] && (
            <Badge variant="secondary" className="text-[10px]">{empByDept[dept.id]} kişi</Badge>
          )}
        </div>
        {deptTeams.map(t => (
          <div key={t.id} className="flex items-center gap-2 py-1" style={{ marginLeft: 20 }}>
            <Users className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-sm text-muted-foreground">{t.name}</span>
          </div>
        ))}
        {childDepts.map(c => renderDeptNode(c.id, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(s => (
          <Card key={s.label} className="p-4 flex items-center gap-4">
            <div className={`rounded-lg bg-muted p-2.5 ${s.color}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Company Info */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Şirket Bilgileri
          </h3>
          <Button variant="ghost" size="sm" onClick={() => { setInfoForm(companyInfo); setEditingInfo(!editingInfo); }}>
            <Pencil className="h-3.5 w-3.5 mr-1" />{editingInfo ? "İptal" : "Düzenle"}
          </Button>
        </div>
        {editingInfo ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />Şirket Adı</Label>
                <Input value={infoForm.name} onChange={e => setInfoForm(f => ({ ...f, name: e.target.value }))} placeholder="Şirket A.Ş." />
              </div>
              <div>
                <Label className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" />Web Sitesi</Label>
                <Input value={infoForm.website} onChange={e => setInfoForm(f => ({ ...f, website: e.target.value }))} placeholder="https://example.com" />
              </div>
              <div>
                <Label className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />Adres</Label>
                <Input value={infoForm.address} onChange={e => setInfoForm(f => ({ ...f, address: e.target.value }))} placeholder="İstanbul, Türkiye" />
              </div>
              <div>
                <Label className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Kuruluş Tarihi</Label>
                <Input type="date" value={infoForm.foundingDate} onChange={e => setInfoForm(f => ({ ...f, foundingDate: e.target.value }))} />
              </div>
            </div>
            <Button size="sm" onClick={saveInfo}>Kaydet</Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-2">
              <Image className="h-8 w-8 rounded bg-muted p-1.5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{companyInfo.name || "Henüz belirtilmedi"}</p>
                <p className="text-[11px] text-muted-foreground">Şirket Adı</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm">{companyInfo.website || "-"}</p>
                <p className="text-[11px] text-muted-foreground">Web Sitesi</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm">{companyInfo.address || "-"}</p>
                <p className="text-[11px] text-muted-foreground">Adres</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm">{companyInfo.foundingDate || "-"}</p>
                <p className="text-[11px] text-muted-foreground">Kuruluş Tarihi</p>
              </div>
            </div>
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Org tree */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <FolderTree className="h-4 w-4" />
            Organizasyon Hiyerarşisi
          </h3>
          {departments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Henüz departman eklenmedi.</p>
          ) : (
            <div className="space-y-0.5">
              {deptTree.roots.map(d => renderDeptNode(d.id, 0))}
              {/* departments with no parent and not in roots (orphans with deleted parent) */}
            </div>
          )}
        </Card>

        {/* Module ownership compact grid */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Network className="h-4 w-4" />
            Modül Sahiplik Haritası
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {FOUNDEROS_MODULES.map(mod => {
              const owner = byModule[mod]?.owner_department_id;
              const dept = owner ? departments.find(d => d.id === owner) : null;
              return (
                <div key={mod} className="flex items-center gap-1.5 text-xs py-1 px-2 rounded-md bg-muted/50">
                  <Layers className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="capitalize font-medium truncate">{mod}</span>
                  {dept ? (
                    <Badge variant="outline" className="text-[9px] ml-auto shrink-0">{dept.name}</Badge>
                  ) : (
                    <span className="text-muted-foreground ml-auto">-</span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ============ Search bar helper ============
function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative w-full max-w-xs">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || "Ara..."}
        className="pl-8 h-8 text-sm"
      />
    </div>
  );
}

// ============ Departments ============
function DepartmentsTab() {
  const { data: departments = [], isLoading } = useDepartments();
  const { data: employees = [] } = useEmployees();
  const upsert = useUpsertDepartment();
  const del = useDeleteDepartment();
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", code: "", description: "", parent_id: "" });
  const [search, setSearch] = useState("");

  const empByDept = useMemo(() => {
    const map: Record<string, number> = {};
    employees.forEach(e => {
      if (e.department) {
        const dept = departments.find(d => d.name === e.department);
        if (dept) map[dept.id] = (map[dept.id] || 0) + 1;
      }
    });
    return map;
  }, [employees, departments]);

  const filtered = useMemo(() => {
    if (!search.trim()) return departments;
    const q = search.toLowerCase();
    return departments.filter(d => d.name.toLowerCase().includes(q) || (d.code && d.code.toLowerCase().includes(q)));
  }, [departments, search]);

  const openEdit = (d: typeof departments[0]) => {
    setForm({ name: d.name, code: d.code || "", description: d.description || "", parent_id: d.parent_id || "" });
    setEditItem(d.id);
  };

  const openCreate = () => {
    setForm({ name: "", code: "", description: "", parent_id: "" });
    setEditItem(null);
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    try {
      await upsert.mutateAsync({
        ...(editItem ? { id: editItem } : {}),
        name: form.name,
        code: form.code || null,
        description: form.description || null,
        parent_id: form.parent_id || null,
      } as any);
      toast.success(editItem ? "Departman güncellendi" : "Departman eklendi");
      setOpen(false);
      setEditItem(null);
      setForm({ name: "", code: "", description: "", parent_id: "" });
    } catch (e: any) { toast.error(e.message); }
  };

  const isDialogOpen = open || editItem !== null;
  const setDialogOpen = (v: boolean) => { if (!v) { setOpen(false); setEditItem(null); } else { setOpen(true); } };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <SearchBar value={search} onChange={setSearch} placeholder="Departman ara..." />
        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Departman</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editItem ? "Departman Düzenle" : "Yeni Departman"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>İsim *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Finans" /></div>
              <div><Label>Kod</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="FIN" /></div>
              <div>
                <Label>Üst Departman</Label>
                <Select value={form.parent_id || "none"} onValueChange={v => setForm(f => ({ ...f, parent_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- yok --</SelectItem>
                    {departments.filter(d => d.id !== editItem).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Açıklama</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            </div>
            <DialogFooter><Button onClick={save} disabled={upsert.isPending}>Kaydet</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Yükleniyor...</p> :
        filtered.length === 0 ? <EmptyState label={search ? "Sonuç bulunamadı." : "Henüz departman yok."} /> :
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(d => (
            <Card key={d.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-2 shrink-0">
                    <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{d.name}</span>
                      {d.code && <Badge variant="outline" className="text-[10px]">{d.code}</Badge>}
                    </div>
                    {d.parent_id && (() => {
                      const parent = departments.find(p => p.id === d.parent_id);
                      return parent ? <p className="text-[11px] text-muted-foreground">Üst: {parent.name}</p> : null;
                    })()}
                  </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(d)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => del.mutate(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              {d.description && <p className="text-xs text-muted-foreground line-clamp-2">{d.description}</p>}
              <div className="flex items-center gap-3 pt-1 border-t border-border/50">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <UserCheck className="h-3 w-3" />{empByDept[d.id] || 0} çalışan
                </span>
              </div>
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
  const { data: employees = [] } = useEmployees();
  const upsert = useUpsertTeam();
  const del = useDeleteTeam();
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", department_id: "", description: "" });
  const [search, setSearch] = useState("");

  const empByTeam = useMemo(() => {
    // Since employees have department (name), we map teams via their department
    const map: Record<string, number> = {};
    teams.forEach(t => {
      if (t.department_id) {
        const dept = departments.find(d => d.id === t.department_id);
        if (dept) {
          const deptEmpCount = employees.filter(e => e.department === dept.name).length;
          // Distribute department employees equally among teams (rough estimate)
          const teamsInDept = teams.filter(tt => tt.department_id === t.department_id).length;
          if (teamsInDept > 0) map[t.id] = Math.round(deptEmpCount / teamsInDept);
        }
      }
    });
    return map;
  }, [employees, departments, teams]);

  const filtered = useMemo(() => {
    if (!search.trim()) return teams;
    const q = search.toLowerCase();
    return teams.filter(t => t.name.toLowerCase().includes(q));
  }, [teams, search]);

  const openEdit = (t: typeof teams[0]) => {
    setForm({ name: t.name, department_id: t.department_id || "", description: t.description || "" });
    setEditItem(t.id);
  };

  const openCreate = () => {
    setForm({ name: "", department_id: "", description: "" });
    setEditItem(null);
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    try {
      await upsert.mutateAsync({
        ...(editItem ? { id: editItem } : {}),
        name: form.name,
        department_id: form.department_id || null,
        description: form.description || null,
      } as any);
      toast.success(editItem ? "Takım güncellendi" : "Takım eklendi");
      setOpen(false); setEditItem(null);
      setForm({ name: "", department_id: "", description: "" });
    } catch (e: any) { toast.error(e.message); }
  };

  const isDialogOpen = open || editItem !== null;
  const setDialogOpen = (v: boolean) => { if (!v) { setOpen(false); setEditItem(null); } else { setOpen(true); } };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <SearchBar value={search} onChange={setSearch} placeholder="Takım ara..." />
        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Takım</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editItem ? "Takım Düzenle" : "Yeni Takım"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>İsim *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Büyüme" /></div>
              <div>
                <Label>Departman</Label>
                <Select value={form.department_id || "none"} onValueChange={v => setForm(f => ({ ...f, department_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- yok --</SelectItem>
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

      {isLoading ? <p className="text-sm text-muted-foreground">Yükleniyor...</p> :
        filtered.length === 0 ? <EmptyState label={search ? "Sonuç bulunamadı." : "Henüz takım yok."} /> :
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(t => {
            const dep = departments.find(d => d.id === t.department_id);
            return (
              <Card key={t.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950 p-2 shrink-0">
                      <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-medium text-sm truncate block">{t.name}</span>
                      {dep && <p className="text-[11px] text-muted-foreground">{dep.name}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => del.mutate(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                {t.description && <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>}
                <div className="flex items-center gap-3 pt-1 border-t border-border/50">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <UserCheck className="h-3 w-3" />~{empByTeam[t.id] || 0} çalışan
                  </span>
                </div>
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
  const [editItem, setEditItem] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", department_id: "", level: "" });
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return titles;
    const q = search.toLowerCase();
    return titles.filter(t => t.name.toLowerCase().includes(q));
  }, [titles, search]);

  const openEdit = (t: typeof titles[0]) => {
    setForm({ name: t.name, department_id: t.department_id || "", level: t.level || "" });
    setEditItem(t.id);
  };

  const openCreate = () => {
    setForm({ name: "", department_id: "", level: "" });
    setEditItem(null);
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    try {
      await upsert.mutateAsync({
        ...(editItem ? { id: editItem } : {}),
        name: form.name,
        department_id: form.department_id || null,
        level: form.level || null,
      } as any);
      toast.success(editItem ? "Ünvan güncellendi" : "Ünvan eklendi");
      setOpen(false); setEditItem(null);
      setForm({ name: "", department_id: "", level: "" });
    } catch (e: any) { toast.error(e.message); }
  };

  const isDialogOpen = open || editItem !== null;
  const setDialogOpen = (v: boolean) => { if (!v) { setOpen(false); setEditItem(null); } else { setOpen(true); } };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <SearchBar value={search} onChange={setSearch} placeholder="Ünvan ara..." />
        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Ünvan</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editItem ? "Ünvan Düzenle" : "Yeni Ünvan"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>İsim *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Finance Manager" /></div>
              <div>
                <Label>Departman</Label>
                <Select value={form.department_id || "none"} onValueChange={v => setForm(f => ({ ...f, department_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- yok --</SelectItem>
                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Seviye</Label>
                <Select value={form.level || "none"} onValueChange={v => setForm(f => ({ ...f, level: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="--" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">--</SelectItem>
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

      {isLoading ? <p className="text-sm text-muted-foreground">Yükleniyor...</p> :
        filtered.length === 0 ? <EmptyState label={search ? "Sonuç bulunamadı." : "Henüz ünvan yok."} /> :
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(t => {
            const dep = departments.find(d => d.id === t.department_id);
            return (
              <Card key={t.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="rounded-lg bg-orange-50 dark:bg-orange-950 p-2 shrink-0">
                      <Briefcase className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{t.name}</span>
                        {t.level && <Badge variant="secondary" className="text-[10px]">{t.level}</Badge>}
                      </div>
                      {dep && <p className="text-[11px] text-muted-foreground">{dep.name}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => del.mutate(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
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
  const [editItem, setEditItem] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", legal_name: "", country: "", currency: "USD", tax_id: "", is_primary: false });
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return entities;
    const q = search.toLowerCase();
    return entities.filter(e => e.name.toLowerCase().includes(q) || (e.legal_name && e.legal_name.toLowerCase().includes(q)));
  }, [entities, search]);

  const openEdit = (e: typeof entities[0]) => {
    setForm({
      name: e.name,
      legal_name: e.legal_name || "",
      country: e.country || "",
      currency: e.currency || "USD",
      tax_id: e.tax_id || "",
      is_primary: e.is_primary,
    });
    setEditItem(e.id);
  };

  const openCreate = () => {
    setForm({ name: "", legal_name: "", country: "", currency: "USD", tax_id: "", is_primary: false });
    setEditItem(null);
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    try {
      await upsert.mutateAsync({
        ...(editItem ? { id: editItem } : {}),
        ...form,
      } as any);
      toast.success(editItem ? "Tüzel kişilik güncellendi" : "Tüzel kişilik eklendi");
      setOpen(false); setEditItem(null);
      setForm({ name: "", legal_name: "", country: "", currency: "USD", tax_id: "", is_primary: false });
    } catch (e: any) { toast.error(e.message); }
  };

  const isDialogOpen = open || editItem !== null;
  const setDialogOpen = (v: boolean) => { if (!v) { setOpen(false); setEditItem(null); } else { setOpen(true); } };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <SearchBar value={search} onChange={setSearch} placeholder="Tüzel kişilik ara..." />
        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Tüzel Kişilik</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editItem ? "Tüzel Kişilik Düzenle" : "Yeni Tüzel Kişilik"}</DialogTitle></DialogHeader>
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

      {isLoading ? <p className="text-sm text-muted-foreground">Yükleniyor...</p> :
        filtered.length === 0 ? <EmptyState label={search ? "Sonuç bulunamadı." : "Henüz tüzel kişilik yok."} /> :
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(e => (
            <Card key={e.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950 p-2 shrink-0">
                    <Scale className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{e.name}</span>
                      {e.is_primary && <Badge className="text-[10px]">Primary</Badge>}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {e.currency && <Badge variant="outline" className="text-[10px]">{e.currency}</Badge>}
                      {e.country && <Badge variant="outline" className="text-[10px]">{e.country}</Badge>}
                    </div>
                    {e.legal_name && <p className="text-xs text-muted-foreground mt-1">{e.legal_name}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(e)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => del.mutate(e.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
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
  const [search, setSearch] = useState("");

  const byModule = Object.fromEntries(ownership.map(o => [o.module, o]));

  const filtered = useMemo(() => {
    if (!search.trim()) return FOUNDEROS_MODULES;
    const q = search.toLowerCase();
    return FOUNDEROS_MODULES.filter(m => m.toLowerCase().includes(q));
  }, [search]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <SearchBar value={search} onChange={setSearch} placeholder="Modül ara..." />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(mod => {
          const current = byModule[mod];
          return (
            <Card key={mod} className="p-4">
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="rounded-lg bg-violet-50 dark:bg-violet-950 p-2 shrink-0">
                  <Layers className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
                <span className="text-sm font-medium capitalize">{mod}</span>
              </div>
              <Select
                value={current?.owner_department_id || "none"}
                onValueChange={(v) => upsert.mutate({ module: mod, owner_department_id: v === "none" ? null : v })}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Sahip departman" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- sahip yok --</SelectItem>
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
  const [editItem, setEditItem] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return sets;
    const q = search.toLowerCase();
    return sets.filter(s => s.name.toLowerCase().includes(q));
  }, [sets, search]);

  const openEdit = (s: typeof sets[0]) => {
    setForm({ name: s.name, description: s.description || "" });
    setEditItem(s.id);
  };

  const openCreate = () => {
    setForm({ name: "", description: "" });
    setEditItem(null);
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    try {
      await upsert.mutateAsync({
        ...(editItem ? { id: editItem } : {}),
        name: form.name,
        description: form.description || null,
        permission_map: {},
        scope: {},
      } as any);
      toast.success(editItem ? "Yetki paketi güncellendi" : "Yetki paketi oluşturuldu");
      setOpen(false); setEditItem(null);
      setForm({ name: "", description: "" });
    } catch (e: any) { toast.error(e.message); }
  };

  const isDialogOpen = open || editItem !== null;
  const setDialogOpen = (v: boolean) => { if (!v) { setOpen(false); setEditItem(null); } else { setOpen(true); } };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <SearchBar value={search} onChange={setSearch} placeholder="Yetki paketi ara..." />
        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Paket</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editItem ? "Yetki Paketi Düzenle" : "Yeni Yetki Paketi"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>İsim *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="External Accountant" /></div>
              <div><Label>Açıklama</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            </div>
            <DialogFooter><Button onClick={save} disabled={upsert.isPending}>Kaydet</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Yükleniyor...</p> :
        filtered.length === 0 ? <EmptyState label={search ? "Sonuç bulunamadı." : "Henüz yetki paketi yok."} /> :
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(s => (
            <Card key={s.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950 p-2 shrink-0">
                    <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{s.name}</span>
                      {s.is_system && <Badge variant="secondary" className="text-[10px]">System</Badge>}
                    </div>
                    {s.description && <p className="text-xs text-muted-foreground mt-1">{s.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  {!s.is_system && (
                    <>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => del.mutate(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </>
                  )}
                </div>
              </div>
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
