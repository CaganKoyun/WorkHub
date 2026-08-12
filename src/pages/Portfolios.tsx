import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  usePortfolios, usePortfolio, usePortfolioRollup, useCreatePortfolio,
  useUpdatePortfolio, useDeletePortfolio, useAddProjectToPortfolio,
  useRemoveProjectFromPortfolio, type Portfolio,
} from '@/lib/portfolios-hooks';
import { useProjects, useAllProfiles } from '@/lib/projects-hooks';
import { DomainWorkspace } from '@/components/DomainWorkspace';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, Trash2, Briefcase, FolderKanban, AlertTriangle, ChevronLeft,
  Search, Calendar, User, BarChart3, TrendingUp, ShieldAlert, ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const SWATCH = ['#C6F432', '#4ADE80', '#FBBF24', '#FF6B5E', '#5EA8FF', '#2DD4BF'];

// ---- Helpers ---------------------------------------------------------------

type PortfolioStatus = 'on_track' | 'at_risk' | 'behind';

function deriveStatus(pct: number, overdue: number, total: number): PortfolioStatus {
  if (total === 0) return 'on_track';
  const overdueRatio = total > 0 ? overdue / total : 0;
  if (pct < 25) return 'behind';
  if (overdueRatio > 0.2) return 'at_risk';
  return 'on_track';
}

const STATUS_CONFIG: Record<PortfolioStatus, { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline'; icon: typeof ShieldCheck }> = {
  on_track:  { label: 'Yolunda',        variant: 'default',     icon: ShieldCheck },
  at_risk:   { label: 'Risk Altinda',   variant: 'destructive', icon: ShieldAlert },
  behind:    { label: 'Geride',         variant: 'secondary',   icon: AlertTriangle },
};

function StatusBadge({ status }: { status: PortfolioStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <Badge variant={cfg.variant} className="gap-1 text-[10.5px]">
      <Icon className="h-3 w-3" /> {cfg.label}
    </Badge>
  );
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function ownerName(ownerId: string | null, profiles: { user_id: string; full_name: string | null }[]): string {
  if (!ownerId) return 'Atanmamis';
  const p = profiles.find(pr => pr.user_id === ownerId);
  return p?.full_name || 'Atanmamis';
}

// ---- Create / edit dialog -----------------------------------------------

function EditDialog({ open, onOpenChange, initial }: {
  open: boolean; onOpenChange: (o: boolean) => void; initial?: Portfolio | null;
}) {
  const create = useCreatePortfolio();
  const update = useUpdatePortfolio();
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [color, setColor] = useState(initial?.color ?? SWATCH[0]);
  const [budgetPlanned, setBudgetPlanned] = useState('');
  const [budgetSpent, setBudgetSpent] = useState('');

  // Try to parse budget from description JSON
  useMemo(() => {
    if (initial?.description) {
      try {
        const parsed = JSON.parse(initial.description);
        if (parsed._budget_planned != null) setBudgetPlanned(String(parsed._budget_planned));
        if (parsed._budget_spent != null) setBudgetSpent(String(parsed._budget_spent));
        if (parsed.text) setDescription(parsed.text);
      } catch {
        // not JSON, use as-is
      }
    }
  }, [initial?.description]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Ad zorunlu'); return; }

    // Encode budget in description JSON if provided
    let finalDesc: string | null = description.trim() || null;
    const bp = budgetPlanned ? parseFloat(budgetPlanned) : null;
    const bs = budgetSpent ? parseFloat(budgetSpent) : null;
    if (bp != null || bs != null) {
      finalDesc = JSON.stringify({
        text: description.trim() || '',
        _budget_planned: bp,
        _budget_spent: bs,
      });
    }

    try {
      if (initial) await update.mutateAsync({ id: initial.id, name: name.trim(), description: finalDesc, color });
      else         await create.mutateAsync({ name: name.trim(), description: finalDesc ?? undefined, color });
      onOpenChange(false);
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{initial ? 'Portfoyu duzenle' : 'Yeni portfoy'}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-1.5">
            <Label>Ad</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Orn: Q1 Urun Programi" autoFocus />
          </div>
          <div className="grid gap-1.5">
            <Label>Aciklama</Label>
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
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Planlanan Butce</Label>
              <Input type="number" value={budgetPlanned} onChange={e => setBudgetPlanned(e.target.value)} placeholder="0" />
            </div>
            <div className="grid gap-1.5">
              <Label>Harcanan Butce</Label>
              <Input type="number" value={budgetSpent} onChange={e => setBudgetSpent(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Iptal</Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>
              {initial ? 'Kaydet' : 'Olustur'}
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
  const { data: profiles } = useAllProfiles();
  const del = useDeletePortfolio();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const all = data ?? [];
    if (!search.trim()) return all;
    const q = search.trim().toLowerCase();
    return all.filter(p => p.name.toLowerCase().includes(q));
  }, [data, search]);

  const doDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" portfoyunu sil? (Projeler silinmez.)`)) return;
    try { await del.mutateAsync(id); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <DomainWorkspace
      domain="projects"
      title="Portfoyler"
      subtitle="Iliskili projeleri tek bir cati altinda topla -- ust duzey tamamlanma, aktif ve gecikmis task sayilari roll-up olarak gelir."
      headerActions={
        <>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Portfoy ara..."
              className="h-8 w-48 pl-8 text-[12.5px]"
            />
          </div>
          <Button size="sm" className="h-8 gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Yeni portfoy
          </Button>
        </>
      }
    >
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-md border border-dashed border-border/60 py-14 text-center">
          <Briefcase className="mx-auto h-8 w-8 text-muted-foreground/40" />
          {(data ?? []).length === 0 ? (
            <>
              <p className="mt-2 text-[13px] font-medium text-muted-foreground">Henuz portfoy olusturulmadi</p>
              <p className="mt-1 text-[12px] text-muted-foreground/70 max-w-sm mx-auto">
                Portfoyler, birbiriyle iliskili projeleri gruplayarak tamamlanma oranlarini,
                gecikmeleri ve genel durumu tek bir panelde gormenizi saglar.
              </p>
              <Button size="sm" variant="outline" className="mt-4 gap-1.5" onClick={() => setCreateOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Ilk portfoyu olustur
              </Button>
            </>
          ) : (
            <p className="mt-2 text-[13px] text-muted-foreground">
              "{search}" icin sonuc bulunamadi.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filtered.map(p => (
            <PortfolioCard
              key={p.id}
              portfolio={p}
              profiles={profiles ?? []}
              onNavigate={() => navigate(`/portfolios/${p.id}`)}
              onDelete={() => doDelete(p.id, p.name)}
            />
          ))}
        </div>
      )}

      {createOpen && <EditDialog open={createOpen} onOpenChange={setCreateOpen} initial={null} />}
    </DomainWorkspace>
  );
}

function PortfolioCard({ portfolio: p, profiles, onNavigate, onDelete }: {
  portfolio: Portfolio;
  profiles: { user_id: string; full_name: string | null }[];
  onNavigate: () => void;
  onDelete: () => void;
}) {
  const { data: rows } = usePortfolioRollup(p.id);
  const totals = useMemo(() => {
    const rs = rows ?? [];
    const total = rs.reduce((s, r) => s + Number(r.total_tasks), 0);
    const done  = rs.reduce((s, r) => s + Number(r.done_tasks), 0);
    const overdue = rs.reduce((s, r) => s + Number(r.overdue_tasks), 0);
    const pct = total > 0 ? Math.round((done / total) * 1000) / 10 : 0;
    return { total, done, overdue, pct };
  }, [rows]);

  const status = deriveStatus(totals.pct, totals.overdue, totals.total);

  // Parse display description
  let displayDesc = p.description;
  if (displayDesc) {
    try {
      const parsed = JSON.parse(displayDesc);
      displayDesc = parsed.text || null;
    } catch { /* use as-is */ }
  }

  return (
    <div className="group rounded-md border border-border/60 bg-secondary/20 hover:bg-sidebar-accent/25 transition">
      <button onClick={onNavigate} className="block w-full text-left p-3">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-[13px] font-medium truncate flex-1">{p.name}</span>
          {totals.total > 0 && <StatusBadge status={status} />}
        </div>
        {displayDesc && <p className="mt-1 text-[11.5px] text-muted-foreground line-clamp-2">{displayDesc}</p>}
        <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <User className="h-3 w-3" /> {ownerName(p.owner_id, profiles)}
          </span>
          {totals.total > 0 && (
            <span className="tabular-nums">%{totals.pct}</span>
          )}
          {(rows ?? []).length > 0 && (
            <span>{(rows ?? []).length} proje</span>
          )}
        </div>
      </button>
      <div className="flex justify-end px-2 pb-2">
        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100" onClick={onDelete}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// ---- Portfolio detail with rollup ---------------------------------------

function PortfolioDetail({ id }: { id: string }) {
  const { data: portfolio, isLoading: pLoading } = usePortfolio(id);
  const { data: rows, isLoading: rLoading } = usePortfolioRollup(id);
  const { data: allProjects } = useProjects();
  const { data: profiles } = useAllProfiles();
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

  const status = deriveStatus(totals.pct, totals.overdue, totals.total);

  // Aggregate timeline from projects
  const timeline = useMemo(() => {
    const projectIds = (rows ?? []).map(r => r.project_id);
    const projects = (allProjects ?? []).filter(p => projectIds.includes(p.id));
    let earliest: string | null = null;
    let latest: string | null = null;
    for (const p of projects) {
      if (p.start_date && (!earliest || p.start_date < earliest)) earliest = p.start_date;
      if (p.end_date && (!latest || p.end_date > latest)) latest = p.end_date;
    }
    return { earliest, latest };
  }, [rows, allProjects]);

  // Parse budget from description
  const budget = useMemo(() => {
    if (!portfolio?.description) return null;
    try {
      const parsed = JSON.parse(portfolio.description);
      if (parsed._budget_planned != null || parsed._budget_spent != null) {
        return { planned: parsed._budget_planned as number | null, spent: parsed._budget_spent as number | null };
      }
    } catch { /* not JSON */ }
    return null;
  }, [portfolio?.description]);

  // Parse display description
  const displayDesc = useMemo(() => {
    if (!portfolio?.description) return null;
    try {
      const parsed = JSON.parse(portfolio.description);
      return parsed.text || null;
    } catch { return portfolio.description; }
  }, [portfolio?.description]);

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
  if (!portfolio) return <div className="p-6 text-[13px] text-muted-foreground">Portfoy bulunamadi.</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <button onClick={() => navigate('/portfolios')} className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3.5 w-3.5" /> Portfoyler
      </button>

      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: portfolio.color }} />
            <h1 className="text-[22px] font-semibold tracking-tight">{portfolio.name}</h1>
            {totals.total > 0 && <StatusBadge status={status} />}
          </div>
          {displayDesc && <p className="mt-1 text-[13px] text-muted-foreground">{displayDesc}</p>}
          <div className="mt-1.5 flex items-center gap-4 text-[12px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <User className="h-3.5 w-3.5" /> {ownerName(portfolio.owner_id, profiles ?? [])}
            </span>
            {(timeline.earliest || timeline.latest) && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(timeline.earliest)} - {formatDate(timeline.latest)}
              </span>
            )}
          </div>
        </div>
        <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditOpen(true)}>Duzenle</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Toplam task" value={totals.total} />
        <StatTile label="Tamamlanan" value={totals.done} />
        <StatTile label="Aktif" value={totals.active} />
        <StatTile label="Gecikmis" value={totals.overdue} accent={totals.overdue > 0 ? 'destructive' : 'muted'} />
      </div>

      {/* Budget section */}
      {budget && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border border-border/60 bg-secondary/20 p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Planlanan Butce</div>
            <div className="mt-1 text-[18px] font-semibold tabular-nums">
              {budget.planned != null ? `${budget.planned.toLocaleString('tr-TR')} TL` : '-'}
            </div>
          </div>
          <div className="rounded-md border border-border/60 bg-secondary/20 p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Harcanan Butce</div>
            <div className={cn(
              'mt-1 text-[18px] font-semibold tabular-nums',
              budget.planned && budget.spent && budget.spent > budget.planned ? 'text-destructive' : '',
            )}>
              {budget.spent != null ? `${budget.spent.toLocaleString('tr-TR')} TL` : '-'}
            </div>
            {budget.planned != null && budget.planned > 0 && budget.spent != null && (
              <div className="mt-1.5 h-1.5 rounded bg-secondary/40 overflow-hidden">
                <div
                  className={cn('h-full transition-all', budget.spent > budget.planned ? 'bg-destructive' : 'bg-primary')}
                  style={{ width: `${Math.min((budget.spent / budget.planned) * 100, 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-md border border-border/60 bg-secondary/20 p-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11.5px] uppercase tracking-wider text-muted-foreground">Genel ilerleme</span>
          <span className="text-[13px] font-medium">%{totals.pct}</span>
        </div>
        <div className="h-2 rounded bg-secondary/40 overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${totals.pct}%` }} />
        </div>
      </div>

      {/* Mini bar chart: per-project completion */}
      {(rows ?? []).length > 0 && (
        <section className="rounded-md border border-border/60 bg-secondary/20 p-3 space-y-2">
          <div className="flex items-center gap-1.5 mb-1">
            <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11.5px] uppercase tracking-wider text-muted-foreground">Proje Bazli Tamamlanma</span>
          </div>
          {rows!.map(r => (
            <div key={r.project_id} className="flex items-center gap-2">
              <span className="w-32 truncate text-[12px] text-muted-foreground shrink-0">{r.project_name}</span>
              <div className="flex-1 h-4 rounded bg-secondary/40 overflow-hidden relative">
                <div
                  className="h-full bg-primary/80 rounded transition-all"
                  style={{ width: `${r.completion_pct}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium mix-blend-difference text-white">
                  %{r.completion_pct}
                </span>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-[11.5px] uppercase tracking-wider text-muted-foreground">Projeler ({rows?.length ?? 0})</h2>
          <div className="flex items-center gap-1.5">
            <Select value={addValue} onValueChange={setAddValue}>
              <SelectTrigger className="h-7 w-56 text-[12px]"><SelectValue placeholder="Proje ekle..." /></SelectTrigger>
              <SelectContent>
                {available.length === 0 && <SelectItem value="__" disabled>Tum projeler eklenmis</SelectItem>}
                {available.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" className="h-7" onClick={addProject} disabled={!addValue || add.isPending}>Ekle</Button>
          </div>
        </div>

        {rLoading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (rows ?? []).length === 0 ? (
          <div className="rounded-md border border-dashed border-border/60 py-10 text-center">
            <FolderKanban className="mx-auto h-7 w-7 text-muted-foreground/40" />
            <p className="mt-2 text-[13px] font-medium text-muted-foreground">Bu portfoyde henuz proje yok</p>
            <p className="mt-1 text-[12px] text-muted-foreground/70 max-w-xs mx-auto">
              Yukardaki seciciden proje ekleyerek portfoyunuzu olusturmaya baslayabilirsiniz.
            </p>
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
                  {r.done_tasks}/{r.total_tasks} - %{r.completion_pct}
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
