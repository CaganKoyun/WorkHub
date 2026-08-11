import { useState, useMemo } from "react";
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
import {
  Plus, Building2, Users, Briefcase, Scale, Layers, ShieldCheck, Trash2,
  LayoutDashboard, GitBranch, ChevronRight, MapPin, Calendar, Network,
  TrendingUp, UserCheck, FolderTree,
} from "lucide-react";
import {
  useDepartments, useUpsertDepartment, useDeleteDepartment,
  useTeams, useUpsertTeam, useDeleteTeam,
  useJobTitles, useUpsertJobTitle, useDeleteJobTitle,
  useLegalEntities, useUpsertLegalEntity, useDeleteLegalEntity,
  useModuleOwnership, useUpsertModuleOwnership, FOUNDEROS_MODULES,
  usePermissionSets, useUpsertPermissionSet, useDeletePermissionSet,
} from "@/lib/org-hooks";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ============ Stat Tile ============
function StatTile({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color?: string }) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className={cn("rounded-lg p-2.5", color || "bg-primary/10")}>
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}

// ============ Section Header ============
function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      <div className="border-b mt-2" />
    </div>
  );
}

// ============ Empty State ============
function EmptyState({ label }: { label: string }) {
  return (
    <Card className="p-8 text-center">
      <p className="text-sm text-muted-foreground">{label}</p>
    </Card>
  );
}

// ============ Main Component ============
export default function Company() {
  return (
    <AppLayout>
      <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sirket Yapisi</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Departmanlar, takimlar, unvanlar ve fonksiyon sahiplikleri -- organizasyonunuzu modullerden bagimsiz modelleyin.
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="overview"><LayoutDashboard className="h-3.5 w-3.5 mr-1.5" />Genel Bakis</TabsTrigger>
            <TabsTrigger value="departments"><Building2 className="h-3.5 w-3.5 mr-1.5" />Departmanlar</TabsTrigger>
            <TabsTrigger value="teams"><Users className="h-3.5 w-3.5 mr-1.5" />Takimlar</TabsTrigger>
            <TabsTrigger value="titles"><Briefcase className="h-3.5 w-3.5 mr-1.5" />Unvanlar</TabsTrigger>
            <TabsTrigger value="orgchart"><Network className="h-3.5 w-3.5 mr-1.5" />Organizasyon Semasi</TabsTrigger>
            <TabsTrigger value="entities"><Scale className="h-3.5 w-3.5 mr-1.5" />Tuzel Kisilikler</TabsTrigger>
            <TabsTrigger value="modules"><Layers className="h-3.5 w-3.5 mr-1.5" />Modul Sahipligi</TabsTrigger>
            <TabsTrigger value="permissions"><ShieldCheck className="h-3.5 w-3.5 mr-1.5" />Yetki Paketleri</TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><OverviewTab /></TabsContent>
          <TabsContent value="departments"><DepartmentsTab /></TabsContent>
          <TabsContent value="teams"><TeamsTab /></TabsContent>
          <TabsContent value="titles"><TitlesTab /></TabsContent>
          <TabsContent value="orgchart"><OrgChartTab /></TabsContent>
          <TabsContent value="entities"><EntitiesTab /></TabsContent>
          <TabsContent value="modules"><ModuleOwnershipTab /></TabsContent>
          <TabsContent value="permissions"><PermissionSetsTab /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

// ============ Overview Tab ============
function OverviewTab() {
  const { data: departments = [] } = useDepartments();
  const { data: teams = [] } = useTeams();
  const { data: titles = [] } = useJobTitles();
  const { data: entities = [] } = useLegalEntities();
  const { data: permSets = [] } = usePermissionSets();

  const rootDepartments = useMemo(
    () => departments.filter(d => !d.parent_id),
    [departments],
  );

  const teamsPerDept = useMemo(() => {
    const map: Record<string, typeof teams> = {};
    for (const t of teams) {
      const key = t.department_id || "__none__";
      (map[key] ||= []).push(t);
    }
    return map;
  }, [teams]);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <SectionHeader title="Organizasyon Ozeti" description="Sirket yapisinin anlil gorunumu" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={Building2} label="Departman" value={departments.length} />
        <StatTile icon={Users} label="Takim" value={teams.length} />
        <StatTile icon={Briefcase} label="Unvan" value={titles.length} />
        <StatTile icon={Scale} label="Tuzel Kisilik" value={entities.length} />
      </div>

      {/* Mini Org Chart */}
      <SectionHeader title="Departman / Takim Hiyerarsisi" description="Departmanlara bagli takimlarin ozet gorunumu" />
      {departments.length === 0 ? (
        <EmptyState label="Henuz departman yok. Departmanlar sekmesinden ekleyin." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rootDepartments.map(dept => {
            const childDepts = departments.filter(d => d.parent_id === dept.id);
            const deptTeams = teamsPerDept[dept.id] || [];
            return (
              <Card key={dept.id} className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">{dept.name}</span>
                  {dept.code && <Badge variant="outline" className="text-[10px]">{dept.code}</Badge>}
                </div>
                {childDepts.length > 0 && (
                  <div className="ml-4 mb-2 space-y-1">
                    {childDepts.map(cd => (
                      <div key={cd.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <ChevronRight className="h-3 w-3" />
                        <span>{cd.name}</span>
                        {cd.code && <Badge variant="outline" className="text-[9px]">{cd.code}</Badge>}
                      </div>
                    ))}
                  </div>
                )}
                {deptTeams.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {deptTeams.map(t => (
                      <Badge key={t.id} variant="secondary" className="text-[10px]">
                        <Users className="h-2.5 w-2.5 mr-0.5" />{t.name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground mt-1">Takim atanmamis</p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Recent Activity / Quick Info */}
      <SectionHeader title="Hizli Bilgiler" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Yetki Paketleri</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {permSets.length} adet paket tanimli.
            {permSets.filter(s => s.is_system).length > 0 && (
              <> ({permSets.filter(s => s.is_system).length} sistem paketi)</>
            )}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Modul Sahipligi</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {FOUNDEROS_MODULES.length} modul tanimli. Modul Sahipligi sekmesinden departman atayabilirsiniz.
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Organizasyon Durumu</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {departments.filter(d => !d.parent_id).length} kok departman, {departments.filter(d => d.parent_id).length} alt departman,{" "}
            {teams.filter(t => !t.department_id).length} bagimsiz takim.
          </p>
        </Card>
      </div>
    </div>
  );
}

// ============ Org Chart Tab ============
function OrgChartTab() {
  const { data: departments = [] } = useDepartments();
  const { data: teams = [] } = useTeams();

  const rootDepartments = useMemo(
    () => departments.filter(d => !d.parent_id),
    [departments],
  );

  function getChildDepts(parentId: string) {
    return departments.filter(d => d.parent_id === parentId);
  }

  function getTeamsForDept(deptId: string) {
    return teams.filter(t => t.department_id === deptId);
  }

  function DeptNode({ dept, depth = 0 }: { dept: any; depth?: number }) {
    const children = getChildDepts(dept.id);
    const deptTeams = getTeamsForDept(dept.id);

    return (
      <div className={cn("relative", depth > 0 && "ml-8")}>
        {depth > 0 && (
          <div className="absolute left-[-20px] top-4 w-4 border-b border-dashed border-muted-foreground/30" />
        )}
        <Card className="p-3 mb-2 border-l-4 border-l-primary/60">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">{dept.name}</span>
            {dept.code && <Badge variant="outline" className="text-[10px]">{dept.code}</Badge>}
            <Badge variant="secondary" className="text-[10px] ml-auto">
              {deptTeams.length} takim
            </Badge>
          </div>
          {dept.description && (
            <p className="text-xs text-muted-foreground mt-1 ml-6">{dept.description}</p>
          )}
          {deptTeams.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2 ml-6">
              {deptTeams.map(t => (
                <Badge key={t.id} variant="outline" className="text-[10px] bg-muted/50">
                  <Users className="h-2.5 w-2.5 mr-0.5" />{t.name}
                  {(t as any).member_count != null && (
                    <span className="ml-1 text-muted-foreground">({(t as any).member_count})</span>
                  )}
                </Badge>
              ))}
            </div>
          )}
        </Card>
        {children.length > 0 && (
          <div className="relative border-l border-dashed border-muted-foreground/30 ml-4">
            {children.map(child => (
              <DeptNode key={child.id} dept={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (departments.length === 0) {
    return <EmptyState label="Organizasyon semasi icin once departman ekleyin." />;
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Organizasyon Semasi"
        description="Departman ve takim hiyerarsisinin gorsel agac yapisi"
      />
      <div className="space-y-1">
        {rootDepartments.map(dept => (
          <DeptNode key={dept.id} dept={dept} />
        ))}
      </div>
      {/* Unassigned teams */}
      {teams.filter(t => !t.department_id).length > 0 && (
        <div className="mt-6">
          <SectionHeader title="Bagimsiz Takimlar" description="Herhangi bir departmana bagli olmayan takimlar" />
          <div className="flex flex-wrap gap-2">
            {teams.filter(t => !t.department_id).map(t => (
              <Badge key={t.id} variant="secondary" className="text-xs py-1 px-2">
                <Users className="h-3 w-3 mr-1" />{t.name}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ Departments ============
function DepartmentsTab() {
  const { data: departments = [], isLoading } = useDepartments();
  const { data: teams = [] } = useTeams();
  const upsert = useUpsertDepartment();
  const del = useDeleteDepartment();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", description: "", parent_id: "" });

  const rootDepts = useMemo(() => departments.filter(d => !d.parent_id), [departments]);

  const teamCountByDept = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of teams) {
      if (t.department_id) map[t.department_id] = (map[t.department_id] || 0) + 1;
    }
    return map;
  }, [teams]);

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

  function DeptRow({ dept, depth = 0 }: { dept: any; depth?: number }) {
    const children = departments.filter(d => d.parent_id === dept.id);
    const tc = teamCountByDept[dept.id] || 0;
    return (
      <>
        <Card className={cn("p-3 flex items-start justify-between", depth > 0 && "border-l-2 border-l-primary/30")}>
          <div className="min-w-0" style={{ paddingLeft: depth * 20 }}>
            <div className="flex items-center gap-2 flex-wrap">
              {depth > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
              <span className="font-medium text-sm truncate">{dept.name}</span>
              {dept.code && <Badge variant="outline" className="text-[10px]">{dept.code}</Badge>}
              {tc > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  <Users className="h-2.5 w-2.5 mr-0.5" />{tc} takim
                </Badge>
              )}
              {dept.employee_count != null && dept.employee_count > 0 && (
                <Badge className="text-[10px]">
                  <UserCheck className="h-2.5 w-2.5 mr-0.5" />{dept.employee_count} kisi
                </Badge>
              )}
            </div>
            {dept.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{dept.description}</p>}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => del.mutate(dept.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </Card>
        {children.map(c => <DeptRow key={c.id} dept={c} depth={depth + 1} />)}
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <SectionHeader
            title="Departmanlar"
            description="Organizasyonun kurumsal iskeleti. Bir kisi birden fazla departmana bagli olabilir."
          />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Departman</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Yeni Departman</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Isim *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Finans" /></div>
              <div><Label>Kod</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="FIN" /></div>
              <div>
                <Label>Ust Departman</Label>
                <Select value={form.parent_id || "none"} onValueChange={v => setForm(f => ({ ...f, parent_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- yok --</SelectItem>
                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Aciklama</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            </div>
            <DialogFooter><Button onClick={save} disabled={upsert.isPending}>Kaydet</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats bar */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>{departments.length} departman</span>
        <span>{rootDepts.length} kok departman</span>
        <span>{departments.length - rootDepts.length} alt departman</span>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Yukleniyor...</p> :
        departments.length === 0 ? <EmptyState label="Henuz departman yok." /> :
        <div className="grid gap-2">
          {rootDepts.map(d => <DeptRow key={d.id} dept={d} />)}
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
      toast.success("Takim eklendi"); setOpen(false); setForm({ name: "", department_id: "", description: "" });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <SectionHeader title="Takimlar" description="Departman altinda calisan operasyonel gruplar." />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Takim</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Yeni Takim</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Isim *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Growth" /></div>
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
              <div><Label>Aciklama</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            </div>
            <DialogFooter><Button onClick={save} disabled={upsert.isPending}>Kaydet</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>{teams.length} takim</span>
        <span>{teams.filter(t => t.department_id).length} departmana bagli</span>
        <span>{teams.filter(t => !t.department_id).length} bagimsiz</span>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Yukleniyor...</p> :
        teams.length === 0 ? <EmptyState label="Henuz takim yok." /> :
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map(t => {
            const dep = departments.find(d => d.id === t.department_id);
            return (
              <Card key={t.id} className="p-4 flex flex-col justify-between">
                <div className="min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <Users className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-medium text-sm truncate">{t.name}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => del.mutate(t.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {t.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{t.description}</p>}
                  <div className="flex items-center gap-2 flex-wrap">
                    {dep && (
                      <Badge variant="outline" className="text-[10px]">
                        <Building2 className="h-2.5 w-2.5 mr-0.5" />{dep.name}
                      </Badge>
                    )}
                    {!dep && (
                      <Badge variant="secondary" className="text-[10px] text-muted-foreground">Bagimsiz</Badge>
                    )}
                    {(t as any).member_count != null && (
                      <Badge className="text-[10px]">
                        <UserCheck className="h-2.5 w-2.5 mr-0.5" />{(t as any).member_count} uye
                      </Badge>
                    )}
                  </div>
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
  const [form, setForm] = useState({ name: "", department_id: "", level: "" });

  const save = async () => {
    if (!form.name.trim()) return;
    try {
      await upsert.mutateAsync({ name: form.name, department_id: form.department_id || null, level: form.level || null } as any);
      toast.success("Unvan eklendi"); setOpen(false); setForm({ name: "", department_id: "", level: "" });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <SectionHeader title="Unvanlar" description="Unvanlar rolden bagimsizdir -- ayni unvan farkli yetkilerle atanabilir." />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Unvan</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Yeni Unvan</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Isim *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Finance Manager" /></div>
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

      {isLoading ? <p className="text-sm text-muted-foreground">Yukleniyor...</p> :
        titles.length === 0 ? <EmptyState label="Henuz unvan yok." /> :
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
  const [form, setForm] = useState({
    name: "", legal_name: "", country: "", currency: "USD", tax_id: "",
    is_primary: false, address: "", founding_date: "",
  });

  const save = async () => {
    if (!form.name.trim()) return;
    try {
      await upsert.mutateAsync({
        ...form,
        address: form.address || null,
        founding_date: form.founding_date || null,
      } as any);
      toast.success("Tuzel kisilik eklendi"); setOpen(false);
      setForm({ name: "", legal_name: "", country: "", currency: "USD", tax_id: "", is_primary: false, address: "", founding_date: "" });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <SectionHeader title="Tuzel Kisilikler" description="Coklu sirket yapilarini modelleyin (holding, istirak, ulke subesi vb.)." />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Tuzel Kisilik</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Yeni Tuzel Kisilik</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Isim *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>Yasal Unvan</Label><Input value={form.legal_name} onChange={e => setForm(f => ({ ...f, legal_name: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Ulke</Label><Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="TR" /></div>
                <div><Label>Para Birimi</Label><Input value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} /></div>
              </div>
              <div><Label>Vergi No</Label><Input value={form.tax_id} onChange={e => setForm(f => ({ ...f, tax_id: e.target.value }))} /></div>
              <div>
                <Label>Adres</Label>
                <Textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Sirket adresi" />
              </div>
              <div>
                <Label>Kurulus Tarihi</Label>
                <Input type="date" value={form.founding_date} onChange={e => setForm(f => ({ ...f, founding_date: e.target.value }))} />
              </div>
            </div>
            <DialogFooter><Button onClick={save} disabled={upsert.isPending}>Kaydet</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Yukleniyor...</p> :
        entities.length === 0 ? <EmptyState label="Henuz tuzel kisilik yok." /> :
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {entities.map(e => (
            <Card key={e.id} className="p-4 flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{e.name}</span>
                    {e.is_primary && <Badge className="text-[10px]">Primary</Badge>}
                  </div>
                  {e.legal_name && <p className="text-xs text-muted-foreground mt-0.5">{e.legal_name}</p>}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => del.mutate(e.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {e.currency && <Badge variant="outline" className="text-[10px]">{e.currency}</Badge>}
                {e.country && <Badge variant="outline" className="text-[10px]">{e.country}</Badge>}
                {e.tax_id && <Badge variant="outline" className="text-[10px]">VKN: {e.tax_id}</Badge>}
              </div>
              {(e as any).address && (
                <div className="flex items-start gap-1.5 text-xs text-muted-foreground mb-1">
                  <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                  <span className="line-clamp-2">{(e as any).address}</span>
                </div>
              )}
              {(e as any).founding_date && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3 shrink-0" />
                  <span>{(e as any).founding_date}</span>
                </div>
              )}
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
    <div className="space-y-4">
      <SectionHeader
        title="Modul Sahipligi"
        description="Her urun modulunun organizasyonel sahibini belirleyin. Bir startup'ta finans modulunun sahibi 'Founder' departmani olabilir."
      />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {FOUNDEROS_MODULES.map(mod => {
          const current = byModule[mod];
          return (
            <Card key={mod} className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="h-3.5 w-3.5 text-primary" />
                <span className="text-sm font-medium capitalize">{mod}</span>
                {current?.owner_department_id && (
                  <Badge variant="secondary" className="text-[10px] ml-auto">Atanmis</Badge>
                )}
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
  const [form, setForm] = useState({ name: "", description: "" });

  const save = async () => {
    if (!form.name.trim()) return;
    try {
      await upsert.mutateAsync({ name: form.name, description: form.description || null, permission_map: {}, scope: {} } as any);
      toast.success("Yetki paketi olusturuldu"); setOpen(false); setForm({ name: "", description: "" });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <SectionHeader
          title="Yetki Paketleri"
          description="Rol paketleri -- ayni unvana farkli yetki paketi baglayabilirsiniz. Matris duzenlemesi Workspace Ayarlari altinda."
        />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Paket</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Yeni Yetki Paketi</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Isim *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="External Accountant" /></div>
              <div><Label>Aciklama</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            </div>
            <DialogFooter><Button onClick={save} disabled={upsert.isPending}>Kaydet</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>{sets.length} paket</span>
        <span>{sets.filter(s => s.is_system).length} sistem paketi</span>
        <span>{sets.filter(s => !s.is_system).length} ozel paket</span>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Yukleniyor...</p> :
        sets.length === 0 ? <EmptyState label="Henuz yetki paketi yok." /> :
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {sets.map(s => (
            <Card key={s.id} className="p-3 flex items-start justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
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
