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
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal,
  useObjectLinks, useCreateObjectLink,
} from "@/lib/graph-hooks";
import {
  GOAL_STATUS_LABELS, LINKABLE_LABELS,
  type GoalStatus, type GoalPeriod, type Goal, type LinkableType,
} from "@/lib/graph-types";
import { Plus, Target, Pencil, Trash2, Link2, ChevronUp, Filter } from "lucide-react";
import { toast } from "sonner";

const STATUS_TONE: Record<GoalStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  on_track: "bg-success/20 text-success",
  at_risk: "bg-warning/20 text-warning",
  off_track: "bg-destructive/20 text-destructive",
  achieved: "bg-success/30 text-success",
  missed: "bg-destructive/30 text-destructive-foreground",
  archived: "bg-muted text-muted-foreground",
};

const PERIOD_LABELS: Record<GoalPeriod, string> = {
  monthly: "Aylik",
  quarterly: "Ceyreklik",
  yearly: "Yillik",
  custom: "Ozel",
};

const EMPTY_FORM = {
  title: "", description: "", status: "on_track" as GoalStatus,
  period: "quarterly" as GoalPeriod, progress: 0,
  target_value: "" as string, current_value: "" as string, unit: "",
  start_date: "", end_date: "", parent_goal_id: "" as string,
};

/* ---- Related Objects Section ---- */
function RelatedObjects({ goalId }: { goalId: string }) {
  const { data: links, isLoading } = useObjectLinks("goal", goalId);
  const createLink = useCreateObjectLink();
  const [adding, setAdding] = useState(false);
  const [linkForm, setLinkForm] = useState({ to_type: "project" as LinkableType, to_id: "" });

  const submitLink = async () => {
    if (!linkForm.to_id.trim()) return toast.error("ID gerekli");
    try {
      await createLink.mutateAsync({
        from_type: "goal", from_id: goalId,
        to_type: linkForm.to_type, to_id: linkForm.to_id,
      });
      toast.success("Baglanti eklendi");
      setAdding(false);
      setLinkForm({ to_type: "project", to_id: "" });
    } catch (e) {
      toast.error("Eklenemedi: " + (e instanceof Error ? e.message : ""));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Iliskili Nesneler</h4>
        <Button variant="ghost" size="sm" onClick={() => setAdding(!adding)}>
          <Link2 className="h-3.5 w-3.5 mr-1" />Bagla
        </Button>
      </div>
      {adding && (
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label className="text-xs">Tur</Label>
            <Select value={linkForm.to_type} onValueChange={v => setLinkForm({ ...linkForm, to_type: v as LinkableType })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(LINKABLE_LABELS) as [LinkableType, string][])
                  .filter(([k]) => k !== "goal")
                  .map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label className="text-xs">ID</Label>
            <Input className="h-8 text-xs" value={linkForm.to_id}
              onChange={e => setLinkForm({ ...linkForm, to_id: e.target.value })}
              placeholder="Nesne ID" />
          </div>
          <Button size="sm" className="h-8" onClick={submitLink} disabled={createLink.isPending}>Ekle</Button>
        </div>
      )}
      {isLoading ? (
        <Skeleton className="h-8" />
      ) : !links?.length ? (
        <p className="text-xs text-muted-foreground">Henuz baglanti yok</p>
      ) : (
        <div className="space-y-1">
          {links.map(l => {
            const isFrom = l.from_type === "goal" && l.from_id === goalId;
            const linkedType = isFrom ? l.to_type : l.from_type;
            const linkedId = isFrom ? l.to_id : l.from_id;
            return (
              <div key={l.id} className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1">
                <Badge variant="outline" className="text-[10px]">{LINKABLE_LABELS[linkedType]}</Badge>
                <span className="truncate text-muted-foreground">{linkedId}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---- Goal Form Component (shared between create and edit) ---- */
function GoalForm({ form, setForm, goals, editingId }: {
  form: typeof EMPTY_FORM;
  setForm: (f: typeof EMPTY_FORM) => void;
  goals: Goal[] | undefined;
  editingId?: string;
}) {
  const parentCandidates = goals?.filter(g => g.id !== editingId) ?? [];

  return (
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
      <div>
        <Label>Ilerleme (%)</Label>
        <Input type="number" min={0} max={100} value={form.progress}
          onChange={e => setForm({ ...form, progress: Number(e.target.value) })} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Hedef Degeri</Label>
          <Input type="number" value={form.target_value}
            onChange={e => setForm({ ...form, target_value: e.target.value })}
            placeholder="orn. 1000000" />
        </div>
        <div>
          <Label>Mevcut Deger</Label>
          <Input type="number" value={form.current_value}
            onChange={e => setForm({ ...form, current_value: e.target.value })}
            placeholder="orn. 750000" />
        </div>
        <div>
          <Label>Birim</Label>
          <Input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
            placeholder="orn. TRY, adet" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Baslangic Tarihi</Label>
          <Input type="date" value={form.start_date}
            onChange={e => setForm({ ...form, start_date: e.target.value })} />
        </div>
        <div>
          <Label>Bitis Tarihi</Label>
          <Input type="date" value={form.end_date}
            onChange={e => setForm({ ...form, end_date: e.target.value })} />
        </div>
      </div>
      <div>
        <Label>Ust Hedef</Label>
        <Select value={form.parent_goal_id || "__none__"} onValueChange={v => setForm({ ...form, parent_goal_id: v === "__none__" ? "" : v })}>
          <SelectTrigger><SelectValue placeholder="Yok" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Yok</SelectItem>
            {parentCandidates.map(g => <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

/* ---- Main Page ---- */
export default function Goals() {
  const { data: goals, isLoading } = useGoals();
  const create = useCreateGoal();
  const update = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailGoal, setDetailGoal] = useState<Goal | null>(null);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const [form, setForm] = useState(EMPTY_FORM);

  // Filters
  const [statusFilter, setStatusFilter] = useState<GoalStatus | "all">("all");
  const [periodFilter, setPeriodFilter] = useState<GoalPeriod | "all">("all");

  const filteredGoals = useMemo(() => {
    if (!goals) return [];
    return goals.filter(g => {
      if (statusFilter !== "all" && g.status !== statusFilter) return false;
      if (periodFilter !== "all" && g.period !== periodFilter) return false;
      return true;
    });
  }, [goals, statusFilter, periodFilter]);

  const resetForm = () => setForm(EMPTY_FORM);

  const goalToForm = (g: Goal) => ({
    title: g.title,
    description: g.description ?? "",
    status: g.status,
    period: g.period,
    progress: g.progress,
    target_value: g.target_value != null ? String(g.target_value) : "",
    current_value: g.current_value != null ? String(g.current_value) : "",
    unit: g.unit ?? "",
    start_date: g.start_date ?? "",
    end_date: g.end_date ?? "",
    parent_goal_id: g.parent_goal_id ?? "",
  });

  const formToPayload = (f: typeof EMPTY_FORM) => ({
    title: f.title,
    description: f.description || null,
    status: f.status,
    period: f.period,
    progress: f.progress,
    target_value: f.target_value !== "" ? Number(f.target_value) : null,
    current_value: f.current_value !== "" ? Number(f.current_value) : null,
    unit: f.unit || null,
    start_date: f.start_date || null,
    end_date: f.end_date || null,
    parent_goal_id: f.parent_goal_id || null,
  });

  const submitCreate = async () => {
    if (!form.title.trim()) return toast.error("Baslik gerekli");
    try {
      await create.mutateAsync(formToPayload(form));
      toast.success("Hedef olusturuldu");
      setCreateOpen(false);
      resetForm();
    } catch (e) {
      toast.error("Olusturulamadi: " + (e instanceof Error ? e.message : ""));
    }
  };

  const submitEdit = async () => {
    if (!editingGoal || !form.title.trim()) return toast.error("Baslik gerekli");
    try {
      await update.mutateAsync({ id: editingGoal.id, ...formToPayload(form) });
      toast.success("Hedef guncellendi");
      setEditOpen(false);
      setEditingGoal(null);
      resetForm();
      // Refresh detail sheet if open
      if (detailGoal?.id === editingGoal.id) {
        setDetailGoal({ ...editingGoal, ...formToPayload(form) } as Goal);
      }
    } catch (e) {
      toast.error("Guncellenemedi: " + (e instanceof Error ? e.message : ""));
    }
  };

  const openEdit = (g: Goal) => {
    setEditingGoal(g);
    setForm(goalToForm(g));
    setEditOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteGoal.mutateAsync(id);
      toast.success("Hedef silindi");
      if (detailGoal?.id === id) setDetailGoal(null);
    } catch (e) {
      toast.error("Silinemedi: " + (e instanceof Error ? e.message : ""));
    }
  };

  const parentName = (parentId: string | null) => {
    if (!parentId || !goals) return null;
    return goals.find(g => g.id === parentId)?.title ?? null;
  };

  return (
    <DomainWorkspace
      domain="goals"
      title="Hedefler"
      subtitle="Sirket, ekip ve bireysel OKR'lari tek yerden takip edin."
      headerActions={
        <Dialog open={createOpen} onOpenChange={o => { setCreateOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Yeni Hedef</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Yeni Hedef</DialogTitle></DialogHeader>
            <GoalForm form={form} setForm={setForm} goals={goals} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Iptal</Button>
              <Button onClick={submitCreate} disabled={create.isPending}>Olustur</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as GoalStatus | "all")}>
          <SelectTrigger className="w-[160px] h-8 text-sm"><SelectValue placeholder="Durum" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tum Durumlar</SelectItem>
            {Object.entries(GOAL_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={periodFilter} onValueChange={v => setPeriodFilter(v as GoalPeriod | "all")}>
          <SelectTrigger className="w-[160px] h-8 text-sm"><SelectValue placeholder="Donem" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tumu</SelectItem>
            <SelectItem value="monthly">Aylik</SelectItem>
            <SelectItem value="quarterly">Ceyreklik</SelectItem>
            <SelectItem value="yearly">Yillik</SelectItem>
            <SelectItem value="custom">Ozel</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : !filteredGoals.length ? (
        <Card><CardContent className="p-10 text-center space-y-3">
          <Target className="h-10 w-10 mx-auto text-muted-foreground" />
          <div className="text-lg font-medium">
            {goals?.length ? "Filtreye uyan hedef yok" : "Henuz hedef yok"}
          </div>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Sirket hedeflerini tanimlayin ve projeler, kararlar, ekipler ile iliskilendirerek Company Graph uzerinden takip edin.
          </p>
          {!goals?.length && (
            <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />Ilk hedefi olustur</Button>
          )}
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGoals.map(g => (
            <Card key={g.id} className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-shadow"
              onClick={() => setDetailGoal(g)}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">{g.title}</div>
                    {g.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{g.description}</p>}
                    {g.parent_goal_id && parentName(g.parent_goal_id) && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <ChevronUp className="h-3 w-3" />
                        <span className="truncate">{parentName(g.parent_goal_id)}</span>
                      </div>
                    )}
                  </div>
                  <Badge className={STATUS_TONE[g.status]}>{GOAL_STATUS_LABELS[g.status]}</Badge>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{PERIOD_LABELS[g.period]}</span>
                    <span>{g.progress}%</span>
                  </div>
                  <Progress value={g.progress} />
                </div>
                {g.target_value != null && (
                  <div className="text-xs text-muted-foreground">
                    {g.current_value ?? 0} / {g.target_value} {g.unit ?? ""}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={!!detailGoal} onOpenChange={o => { if (!o) setDetailGoal(null); }}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          {detailGoal && (
            <>
              <SheetHeader>
                <SheetTitle className="pr-8">{detailGoal.title}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-5">
                {/* Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(detailGoal)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" />Duzenle
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-3.5 w-3.5 mr-1" />Sil
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hedefi sil</AlertDialogTitle>
                        <AlertDialogDescription>
                          &quot;{detailGoal.title}&quot; hedefi kalici olarak silinecek. Bu islem geri alinamaz.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Iptal</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(detailGoal.id)}>Sil</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                {/* Status & Period */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Durum</Label>
                    <div><Badge className={STATUS_TONE[detailGoal.status]}>{GOAL_STATUS_LABELS[detailGoal.status]}</Badge></div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Donem</Label>
                    <div className="text-sm">{PERIOD_LABELS[detailGoal.period]}</div>
                  </div>
                </div>

                {/* Description */}
                {detailGoal.description && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Aciklama</Label>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{detailGoal.description}</p>
                  </div>
                )}

                {/* Progress */}
                <div>
                  <Label className="text-xs text-muted-foreground">Ilerleme</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <Progress value={detailGoal.progress} className="flex-1" />
                    <span className="text-sm font-medium">{detailGoal.progress}%</span>
                  </div>
                </div>

                {/* Target / Current / Unit */}
                {(detailGoal.target_value != null || detailGoal.current_value != null) && (
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Hedef Degeri</Label>
                      <div className="text-sm">{detailGoal.target_value ?? "-"}</div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Mevcut Deger</Label>
                      <div className="text-sm">{detailGoal.current_value ?? "-"}</div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Birim</Label>
                      <div className="text-sm">{detailGoal.unit ?? "-"}</div>
                    </div>
                  </div>
                )}

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Baslangic Tarihi</Label>
                    <div className="text-sm">{detailGoal.start_date ?? "-"}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Bitis Tarihi</Label>
                    <div className="text-sm">{detailGoal.end_date ?? "-"}</div>
                  </div>
                </div>

                {/* Parent Goal */}
                {detailGoal.parent_goal_id && parentName(detailGoal.parent_goal_id) && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Ust Hedef</Label>
                    <div className="flex items-center gap-1 text-sm mt-1">
                      <ChevronUp className="h-3.5 w-3.5" />
                      {parentName(detailGoal.parent_goal_id)}
                    </div>
                  </div>
                )}

                {/* Owner & Timestamps */}
                <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                  <div>
                    <Label className="text-xs text-muted-foreground">Sahip ID</Label>
                    <div>{detailGoal.owner_id ?? "-"}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Olusturan</Label>
                    <div>{detailGoal.created_by ?? "-"}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Olusturma</Label>
                    <div>{new Date(detailGoal.created_at).toLocaleString("tr-TR")}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Guncelleme</Label>
                    <div>{new Date(detailGoal.updated_at).toLocaleString("tr-TR")}</div>
                  </div>
                </div>

                {/* Related Objects */}
                <div className="border-t pt-4">
                  <RelatedObjects goalId={detailGoal.id} />
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={o => { setEditOpen(o); if (!o) { setEditingGoal(null); resetForm(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Hedefi Duzenle</DialogTitle></DialogHeader>
          <GoalForm form={form} setForm={setForm} goals={goals} editingId={editingGoal?.id} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Iptal</Button>
            <Button onClick={submitEdit} disabled={update.isPending}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DomainWorkspace>
  );
}
