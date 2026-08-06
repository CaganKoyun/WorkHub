import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  usePortfolios, usePortfolio, usePortfolioRollup, useCreatePortfolio,
  useUpdatePortfolio, useDeletePortfolio, useAddProjectToPortfolio,
  useRemoveProjectFromPortfolio, type Portfolio,
} from '@/lib/portfolios-hooks';
import { useProjects } from '@/lib/projects-hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, Trash2, Briefcase, FolderKanban, AlertTriangle, ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const SWATCH = ['#C6F432', '#4ADE80', '#FBBF24', '#FF6B5E', '#5EA8FF', '#2DD4BF'];

// ---- Create / edit dialog -----------------------------------------------

function EditDialog({ open, onOpenChange, initial }: {
  open: boolean; onOpenChange: (o: boolean) => void; initial?: Portfolio | null;
}) {
  const create = useCreatePortfolio();
  const update = useUpdatePortfolio();
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [color, setColor] = useState(initial?.color ?? SWATCH[0]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Ad zorunlu'); return; }
    try {
      if (initial) await update.mutateAsync({ id: initial.id, name: name.trim(), description: description.trim() || null, color });
      else         await create.mutateAsync({ name: name.trim(), description: description.trim() || undefined, color });
      onOpenChange(false);
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{initial ? 'Portföyü düzenle' : 'Yeni portföy'}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-1.5">
            <Label>Ad</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Örn: Q1 Ürün Programı" autoFocus />
          </div>
          <div className="grid gap-1.5">
            <Label>Açıklama</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Opsiyonel" />
          </div>
          <div className="grid gap-1.5">
            <Label>Renk</Label>
            <div className="flex gap-1.5">
              {SWATCH.map(c => (
                <button
                  key={c} type="button"
                  onClick={() => setColor(c)}
                  className={cn('h-6 w-6 rounded-full border-2', color === c ? 'border-primary scale-110' : 'border-border/40')}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>İptal</Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>
              {initial ? 'Kaydet' : 'Oluştur'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---- Portfolio list -----------------------------------------------------

function PortfoliosList() {
  const { data, isLoading } = usePortfolios();
  const del = useDeletePortfolio();
  const [createOpen, setCreateOpen] = useState(false);
  const navigate = useNavigate();

  const doDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" portföyünü sil? (Projeler silinmez.)`)) return;
    try { await del.mutateAsync(id); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-muted-foreground" /> Portföyler
          </h1>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            İlişkili projeleri tek bir çatı altında topla — üst düzey tamamlanma,
            aktif ve gecikmiş task sayıları roll-up olarak gelir.
          </p>
        </div>
        <Button size="sm" className="h-8 gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Yeni portföy
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (data ?? []).length === 0 ? (
        <div className="rounded-md border border-dashed border-border/60 py-14 text-center">
          <Briefcase className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-[13px] text-muted-foreground">Henüz portföy yok.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {(data ?? []).map(p => (
            <div key={p.id} className="group rounded-md border border-border/60 bg-secondary/20 hover:bg-sidebar-accent/25 transition">
              <button
                onClick={() => navigate(`/portfolios/${p.id}`)}
                className="block w-full text-left p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  <span className="text-[13px] font-medium truncate flex-1">{p.name}</span>
                </div>
                {p.description && <p className="mt-1 text-[11.5px] text-muted-foreground line-clamp-2">{p.description}</p>}
              </button>
              <div className="flex justify-end px-2 pb-2">
                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100" onClick={() => doDelete(p.id, p.name)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {createOpen && <EditDialog open={createOpen} onOpenChange={setCreateOpen} initial={null} />}
    </div>
  );
}

// ---- Portfolio detail with rollup ---------------------------------------

function PortfolioDetail({ id }: { id: string }) {
  const { data: portfolio, isLoading: pLoading } = usePortfolio(id);
  const { data: rows, isLoading: rLoading } = usePortfolioRollup(id);
  const { data: allProjects } = useProjects();
  const add = useAddProjectToPortfolio();
  const remove = useRemoveProjectFromPortfolio();
  const [editOpen, setEditOpen] = useState(false);
  const [addValue, setAddValue] = useState<string>('');
  const navigate = useNavigate();

  const takenIds = useMemo(() => new Set((rows ?? []).map(r => r.project_id)), [rows]);
  const available = useMemo(
    () => (allProjects ?? []).filter(p => !takenIds.has(p.id)),
    [allProjects, takenIds],
  );

  const totals = useMemo(() => {
    const rs = rows ?? [];
    const total = rs.reduce((s, r) => s + Number(r.total_tasks), 0);
    const done  = rs.reduce((s, r) => s + Number(r.done_tasks), 0);
    const active = rs.reduce((s, r) => s + Number(r.active_tasks), 0);
    const overdue = rs.reduce((s, r) => s + Number(r.overdue_tasks), 0);
    return {
      total, done, active, overdue,
      pct: total > 0 ? Math.round((done / total) * 1000) / 10 : 0,
    };
  }, [rows]);

  const addProject = async () => {
    if (!addValue) return;
    try { await add.mutateAsync({ portfolio_id: id, project_id: addValue }); setAddValue(''); }
    catch (e: any) { toast.error(e.message); }
  };

  const removeProject = async (project_id: string) => {
    try { await remove.mutateAsync({ portfolio_id: id, project_id }); }
    catch (e: any) { toast.error(e.message); }
  };

  if (pLoading) return <div className="p-6 space-y-3"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-40" /></div>;
  if (!portfolio) return <div className="p-6 text-[13px] text-muted-foreground">Portföy bulunamadı.</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <button onClick={() => navigate('/portfolios')} className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3.5 w-3.5" /> Portföyler
      </button>

      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: portfolio.color }} />
            <h1 className="text-[22px] font-semibold tracking-tight">{portfolio.name}</h1>
          </div>
          {portfolio.description && <p className="mt-1 text-[13px] text-muted-foreground">{portfolio.description}</p>}
        </div>
        <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditOpen(true)}>Düzenle</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Toplam task" value={totals.total} />
        <StatTile label="Tamamlanan" value={totals.done} />
        <StatTile label="Aktif" value={totals.active} />
        <StatTile label="Gecikmiş" value={totals.overdue} accent={totals.overdue > 0 ? 'destructive' : 'muted'} />
      </div>

      <div className="rounded-md border border-border/60 bg-secondary/20 p-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11.5px] uppercase tracking-wider text-muted-foreground">Genel ilerleme</span>
          <span className="text-[13px] font-medium">%{totals.pct}</span>
        </div>
        <div className="h-2 rounded bg-secondary/40 overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${totals.pct}%` }} />
        </div>
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-[11.5px] uppercase tracking-wider text-muted-foreground">Projeler ({rows?.length ?? 0})</h2>
          <div className="flex items-center gap-1.5">
            <Select value={addValue} onValueChange={setAddValue}>
              <SelectTrigger className="h-7 w-56 text-[12px]"><SelectValue placeholder="Proje ekle…" /></SelectTrigger>
              <SelectContent>
                {available.length === 0 && <SelectItem value="__" disabled>Tüm projeler eklenmiş</SelectItem>}
                {available.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" className="h-7" onClick={addProject} disabled={!addValue || add.isPending}>Ekle</Button>
          </div>
        </div>

        {rLoading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (rows ?? []).length === 0 ? (
          <div className="rounded-md border border-dashed border-border/60 py-10 text-center text-[13px] text-muted-foreground">
            Bu portföyde henüz proje yok.
          </div>
        ) : (
          <div className="rounded-md border border-border/60 overflow-hidden">
            {rows!.map(r => (
              <div key={r.project_id} className="group flex items-center gap-3 border-b border-border/40 last:border-b-0 px-3 py-2">
                <FolderKanban className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <button
                  onClick={() => navigate(`/projects/${r.project_id}`)}
                  className="text-[13px] font-medium hover:underline text-left truncate flex-1"
                >{r.project_name}</button>
                <span className="text-[10.5px] uppercase tracking-wider text-muted-foreground rounded border border-border px-1.5 py-0.5">{r.project_status}</span>
                <div className="w-40 text-right text-[11.5px] text-muted-foreground">
                  {r.done_tasks}/{r.total_tasks} • %{r.completion_pct}
                </div>
                <div className="w-32 h-1.5 rounded bg-secondary/40 overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${r.completion_pct}%` }} />
                </div>
                {Number(r.overdue_tasks) > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-destructive"><AlertTriangle className="h-3 w-3" /> {r.overdue_tasks}</span>
                )}
                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-60 hover:!opacity-100" onClick={() => removeProject(r.project_id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {editOpen && <EditDialog open={editOpen} onOpenChange={setEditOpen} initial={portfolio} />}
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: number; accent?: 'muted' | 'destructive' }) {
  return (
    <div className="rounded-md border border-border/60 bg-secondary/20 p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn(
        'mt-1 text-[22px] font-semibold tabular-nums',
        accent === 'destructive' ? 'text-destructive' : '',
      )}>{value}</div>
    </div>
  );
}

// ---- Router shim ---------------------------------------------------------

export default function Portfolios() {
  const { id } = useParams<{ id?: string }>();
  if (id) return <PortfolioDetail id={id} />;
  return <PortfoliosList />;
}
