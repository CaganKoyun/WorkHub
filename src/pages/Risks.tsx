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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  useRisks, useCreateRisk, useUpdateRisk, useDeleteRisk,
  useObjectLinks, useCreateObjectLink,
} from "@/lib/graph-hooks";
import {
  RISK_LEVEL_LABELS, RISK_LEVEL_COLORS, LINKABLE_LABELS,
  type RiskLevel, type RiskStatus, type Risk, type LinkableType,
} from "@/lib/graph-types";
import { Plus, ShieldAlert, Pencil, Trash2, Link } from "lucide-react";
import { toast } from "sonner";

const STATUS_LABELS: Record<RiskStatus, string> = {
  open: "Açık", mitigating: "Azaltılıyor", accepted: "Kabul", closed: "Kapalı",
};

const EMPTY_FORM = {
  title: "", description: "", mitigation: "", owner_id: "", due_date: "",
  status: "open" as RiskStatus, level: "medium" as RiskLevel,
  likelihood: 3, impact: 3,
};

function riskToForm(r: Risk) {
  return {
    title: r.title,
    description: r.description ?? "",
    mitigation: r.mitigation ?? "",
    owner_id: r.owner_id ?? "",
    due_date: r.due_date ?? "",
    status: r.status,
    level: r.level,
    likelihood: r.likelihood,
    impact: r.impact,
  };
}

/* ---- Risk Matrix ---- */
function RiskMatrix({ risks }: { risks: Risk[] }) {
  const grid = useMemo(() => {
    const m: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
    for (const r of risks) {
      const li = Math.min(Math.max(r.likelihood, 1), 5) - 1;
      const im = Math.min(Math.max(r.impact, 1), 5) - 1;
      m[li][im]++;
    }
    return m;
  }, [risks]);

  const cellColor = (li: number, im: number) => {
    const score = (li + 1) * (im + 1);
    if (score <= 4) return "bg-success/30 text-success";
    if (score <= 9) return "bg-warning/30 text-warning";
    if (score <= 15) return "bg-[hsl(var(--warning))]/30 text-warning";
    return "bg-destructive/30 text-destructive";
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-sm font-medium mb-2">Risk Matrisi (Olasılık x Etki)</div>
        <div className="grid grid-cols-[auto_repeat(5,1fr)] gap-1 text-xs text-center">
          <div />
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="text-muted-foreground font-medium py-1">E{i}</div>
          ))}
          {[5, 4, 3, 2, 1].map(li => (
            <>
              <div key={`l${li}`} className="text-muted-foreground font-medium flex items-center justify-center">O{li}</div>
              {[1, 2, 3, 4, 5].map(im => {
                const count = grid[li - 1][im - 1];
                return (
                  <div key={`${li}-${im}`}
                    className={`rounded p-2 font-mono font-semibold ${count > 0 ? cellColor(li - 1, im - 1) : "bg-muted/30 text-muted-foreground"}`}>
                    {count || ""}
                  </div>
                );
              })}
            </>
          ))}
        </div>
        <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
          <span>O = Olasılık</span><span>E = Etki</span>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---- Related Objects ---- */
function RelatedObjects({ riskId }: { riskId: string }) {
  const { data: links } = useObjectLinks("risk", riskId);
  const createLink = useCreateObjectLink();
  const [linkType, setLinkType] = useState<LinkableType>("project");
  const [linkId, setLinkId] = useState("");

  const addLink = async () => {
    if (!linkId.trim()) return;
    try {
      await createLink.mutateAsync({
        from_type: "risk", from_id: riskId,
        to_type: linkType, to_id: linkId.trim(),
        link_kind: "related",
      });
      toast.success("Bağlantı eklendi");
      setLinkId("");
    } catch (e) {
      toast.error("Bağlantı eklenemedi: " + (e instanceof Error ? e.message : ""));
    }
  };

  const linkableOptions: LinkableType[] = [
    "project", "task", "goal", "decision", "product.feature", "product.release",
    "crm.company", "crm.opportunity",
  ];

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">İlişkili Nesneler</div>
      {links && links.length > 0 ? (
        <div className="space-y-1">
          {links.map(l => (
            <div key={l.id} className="flex items-center gap-2 text-sm">
              <Link className="h-3 w-3 text-muted-foreground" />
              <Badge variant="outline" className="text-[10px]">
                {LINKABLE_LABELS[l.from_type === "risk" ? l.to_type : l.from_type]}
              </Badge>
              <span className="text-muted-foreground">{l.from_type === "risk" ? l.to_id : l.from_id}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Henüz bağlantı yok.</p>
      )}
      <div className="flex gap-2">
        <Select value={linkType} onValueChange={v => setLinkType(v as LinkableType)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {linkableOptions.map(t => (
              <SelectItem key={t} value={t}>{LINKABLE_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input placeholder="ID" value={linkId} onChange={e => setLinkId(e.target.value)} className="flex-1" />
        <Button size="sm" variant="outline" onClick={addLink} disabled={createLink.isPending}>Ekle</Button>
      </div>
    </div>
  );
}

/* ---- Risk Form (shared between create/edit) ---- */
function RiskForm({
  form, setForm,
}: {
  form: typeof EMPTY_FORM;
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>;
}) {
  return (
    <div className="space-y-3">
      <div><Label>Başlık</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
      <div><Label>Açıklama</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Seviye</Label>
          <Select value={form.level} onValueChange={v => setForm(f => ({ ...f, level: v as RiskLevel }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(RISK_LEVEL_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Durum</Label>
          <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as RiskStatus }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Olasılık (1-5)</Label>
          <Input type="number" min={1} max={5} value={form.likelihood}
            onChange={e => setForm(f => ({ ...f, likelihood: Number(e.target.value) }))} />
        </div>
        <div>
          <Label>Etki (1-5)</Label>
          <Input type="number" min={1} max={5} value={form.impact}
            onChange={e => setForm(f => ({ ...f, impact: Number(e.target.value) }))} />
        </div>
      </div>
      <div><Label>Azaltma Planı</Label><Textarea value={form.mitigation} onChange={e => setForm(f => ({ ...f, mitigation: e.target.value }))} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Sorumlu</Label><Input value={form.owner_id} onChange={e => setForm(f => ({ ...f, owner_id: e.target.value }))} placeholder="Kullanıcı ID" /></div>
        <div><Label>Son Tarih</Label><Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
      </div>
    </div>
  );
}

/* ---- Main Page ---- */
export default function Risks() {
  const { data: risks, isLoading } = useRisks();
  const create = useCreateRisk();
  const update = useUpdateRisk();
  const del = useDeleteRisk();

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [sheetRisk, setSheetRisk] = useState<Risk | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  // Filters
  const [statusFilter, setStatusFilter] = useState<RiskStatus | "all">("all");
  const [levelFilter, setLevelFilter] = useState<RiskLevel | "all">("all");

  const filteredAndSorted = useMemo(() => {
    let list = risks ?? [];
    if (statusFilter !== "all") list = list.filter(r => r.status === statusFilter);
    if (levelFilter !== "all") list = list.filter(r => r.level === levelFilter);
    return [...list].sort((a, b) => (b.likelihood * b.impact) - (a.likelihood * a.impact));
  }, [risks, statusFilter, levelFilter]);

  const stats = useMemo(() => {
    const r = risks ?? [];
    return {
      total: r.length,
      critical: r.filter(x => x.level === "critical").length,
      high: r.filter(x => x.level === "high").length,
      open: r.filter(x => x.status === "open" || x.status === "mitigating").length,
    };
  }, [risks]);

  const submitCreate = async () => {
    if (!form.title.trim()) return toast.error("Başlık gerekli");
    try {
      await create.mutateAsync({
        ...form,
        owner_id: form.owner_id || null,
        due_date: form.due_date || null,
      });
      toast.success("Risk kaydı oluşturuldu");
      setCreateOpen(false);
      setForm({ ...EMPTY_FORM });
    } catch (e) {
      toast.error("Oluşturulamadı: " + (e instanceof Error ? e.message : ""));
    }
  };

  const openEdit = (r: Risk) => {
    setEditingRisk(r);
    setForm(riskToForm(r));
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!editingRisk || !form.title.trim()) return toast.error("Başlık gerekli");
    try {
      await update.mutateAsync({
        id: editingRisk.id,
        title: form.title,
        description: form.description || null,
        mitigation: form.mitigation || null,
        owner_id: form.owner_id || null,
        due_date: form.due_date || null,
        status: form.status,
        level: form.level,
        likelihood: form.likelihood,
        impact: form.impact,
      });
      toast.success("Risk güncellendi");
      setEditOpen(false);
      setEditingRisk(null);
      setForm({ ...EMPTY_FORM });
    } catch (e) {
      toast.error("Güncellenemedi: " + (e instanceof Error ? e.message : ""));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await del.mutateAsync(id);
      toast.success("Risk silindi");
      if (sheetRisk?.id === id) setSheetRisk(null);
    } catch (e) {
      toast.error("Silinemedi: " + (e instanceof Error ? e.message : ""));
    }
  };

  return (
    <DomainWorkspace domain="risks" title="Risk Merkezi" subtitle="Şirket riskleri, olasılık × etki, sahiplik ve azaltma planları.">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Risk Merkezi</h1>
            <p className="text-sm text-muted-foreground">Yürütme, finans, ürün ve müşteri risklerini tek yerden yönetin.</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Yeni Risk</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Yeni Risk</DialogTitle></DialogHeader>
              <RiskForm form={form} setForm={setForm} />
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>İptal</Button>
                <Button onClick={submitCreate} disabled={create.isPending}>Oluştur</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Toplam", value: stats.total },
            { label: "Açık", value: stats.open },
            { label: "Yüksek", value: stats.high },
            { label: "Kritik", value: stats.critical },
          ].map(s => (
            <Card key={s.label}><CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="text-2xl font-semibold font-mono">{s.value}</div>
            </CardContent></Card>
          ))}
        </div>

        {/* Risk Matrix */}
        {risks && risks.length > 0 && <RiskMatrix risks={risks} />}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">Durum:</Label>
            <Select value={statusFilter} onValueChange={v => setStatusFilter(v as RiskStatus | "all")}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">Seviye:</Label>
            <Select value={levelFilter} onValueChange={v => setLevelFilter(v as RiskLevel | "all")}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                {Object.entries(RISK_LEVEL_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <Skeleton className="h-64" />
        ) : !risks?.length ? (
          <Card><CardContent className="p-10 text-center space-y-3">
            <ShieldAlert className="h-10 w-10 mx-auto text-muted-foreground" />
            <div className="text-lg font-medium">Kayıtlı risk yok</div>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Riskleri kaydedip projeler ve müşterilerle ilişkilendirerek Founder Inbox'ta erken uyarılar oluşturun.
            </p>
            <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />İlk riski kaydet</Button>
          </CardContent></Card>
        ) : (
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Risk</TableHead>
                  <TableHead>Seviye</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">Skor</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSorted.map(r => (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => setSheetRisk(r)}>
                    <TableCell>
                      <div className="font-medium">{r.title}</div>
                      {r.description && <div className="text-xs text-muted-foreground line-clamp-1">{r.description}</div>}
                    </TableCell>
                    <TableCell><Badge className={RISK_LEVEL_COLORS[r.level]}>{RISK_LEVEL_LABELS[r.level]}</Badge></TableCell>
                    <TableCell><Badge variant="outline">{STATUS_LABELS[r.status]}</Badge></TableCell>
                    <TableCell className="text-right font-mono">{r.likelihood * r.impact}</TableCell>
                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(r)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Riski Sil</AlertDialogTitle>
                              <AlertDialogDescription>
                                &quot;{r.title}&quot; riski kalıcı olarak silinecek. Bu işlem geri alınamaz.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>İptal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(r.id)}>Sil</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={o => { setEditOpen(o); if (!o) setEditingRisk(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Riski Düzenle</DialogTitle></DialogHeader>
          <RiskForm form={form} setForm={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>İptal</Button>
            <Button onClick={submitEdit} disabled={update.isPending}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      <Sheet open={!!sheetRisk} onOpenChange={o => { if (!o) setSheetRisk(null); }}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          {sheetRisk && (
            <>
              <SheetHeader>
                <SheetTitle>{sheetRisk.title}</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                <div className="flex gap-2 flex-wrap">
                  <Badge className={RISK_LEVEL_COLORS[sheetRisk.level]}>{RISK_LEVEL_LABELS[sheetRisk.level]}</Badge>
                  <Badge variant="outline">{STATUS_LABELS[sheetRisk.status]}</Badge>
                </div>

                {sheetRisk.description && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Açıklama</div>
                    <p className="text-sm">{sheetRisk.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Olasılık</div>
                    <div className="text-lg font-mono font-semibold">{sheetRisk.likelihood}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Etki</div>
                    <div className="text-lg font-mono font-semibold">{sheetRisk.impact}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Skor</div>
                    <div className="text-lg font-mono font-semibold">{sheetRisk.likelihood * sheetRisk.impact}</div>
                  </div>
                </div>

                {sheetRisk.mitigation && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Azaltma Planı</div>
                    <p className="text-sm">{sheetRisk.mitigation}</p>
                  </div>
                )}

                {sheetRisk.owner_id && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Sorumlu</div>
                    <p className="text-sm">{sheetRisk.owner_id}</p>
                  </div>
                )}

                {sheetRisk.due_date && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Son Tarih</div>
                    <p className="text-sm">{sheetRisk.due_date}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                  <div>
                    <div>Oluşturulma</div>
                    <div className="text-foreground">{new Date(sheetRisk.created_at).toLocaleString("tr-TR")}</div>
                  </div>
                  <div>
                    <div>Güncelleme</div>
                    <div className="text-foreground">{new Date(sheetRisk.updated_at).toLocaleString("tr-TR")}</div>
                  </div>
                </div>

                <hr className="border-border" />

                <RelatedObjects riskId={sheetRisk.id} />

                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => { openEdit(sheetRisk); setSheetRisk(null); }}>
                    <Pencil className="h-3 w-3 mr-1" />Düzenle
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive"><Trash2 className="h-3 w-3 mr-1" />Sil</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Riski Sil</AlertDialogTitle>
                        <AlertDialogDescription>
                          &quot;{sheetRisk.title}&quot; riski kalıcı olarak silinecek. Bu işlem geri alınamaz.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(sheetRisk.id)}>Sil</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </DomainWorkspace>
  );
}
