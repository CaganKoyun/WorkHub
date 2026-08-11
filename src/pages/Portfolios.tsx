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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus, Trash2, Briefcase, FolderKanban, AlertTriangle, ChevronLeft,
  CheckCircle2, Clock, TrendingUp, BarChart3, Calendar, Heart, Edit3,
  ArrowUpDown, Shield, Target, Users,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const SWATCH = ['#C6F432', '#4ADE80', '#FBBF24', '#FF6B5E', '#5EA8FF', '#2DD4BF'];

const STATUS_COLORS: Record<string, string> = {
  planned: '#5EA8FF',
  active: '#4ADE80',
  on_hold: '#FBBF24',
  completed: '#C6F432',
  archived: '#94a3b8',
};

const STATUS_LABELS: Record<string, string> = {
  planned: 'Planlanmis',
  active: 'Aktif',
  on_hold: 'Beklemede',
  completed: 'Tamamlandi',
  archived: 'Arsivlenmis',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Dusuk',
  medium: 'Orta',
  high: 'Yuksek',
  urgent: 'Acil',
};

type HealthStatus = 'on-track' | 'at-risk' | 'off-track';

function getHealthStatus(overdue: number, total: number): HealthStatus {
  if (total === 0) return 'on-track';
  const ratio = overdue / total;
  if (ratio >= 0.2) return 'off-track';
  if (ratio >= 0.1) return 'at-risk';
  return 'on-track';
}

const HEALTH_CONFIG: Record<HealthStatus, { label: string; color: string; bg: string }> = {
  'on-track':  { label: 'Yolunda',     color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/15' },
  'at-risk':   { label: 'Risk altinda', color: 'text-amber-600 dark:text-amber-400',    bg: 'bg-amber-500/15' },
  'off-track': { label: 'Gecikiyor',    color: 'text-red-600 dark:text-red-400',         bg: 'bg-red-500/15' },
};

function HealthBadge({ status }: { status: HealthStatus }) {
  const cfg = HEALTH_CONFIG[status];
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium', cfg.bg, cfg.color)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', status === 'on-track' ? 'bg-emerald-500' : status === 'at-risk' ? 'bg-amber-500' : 'bg-red-500')} />
      {cfg.label}
    </span>
  );
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
        <DialogHeader><DialogTitle>{initial ? 'Portfoyu duzenle' : 'Yeni portfoy'}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-1.5">
            <Label>Ad</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Orn: Q1 Urun Programi" autoFocus />
          </div>
          <div className="grid gap-1.5">
            <Label>Aciklama</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Opsiyonel" rows={3} />
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

// ---- Mini progress bar for cards ----------------------------------------

function MiniProgress({ pct, className }: { pct: number; className?: string }) {
  return (
    <div className={cn('h-1.5 rounded-full bg-secondary/40 overflow-hidden', className)}>
      <div
        className="h-full rounded-full bg-primary transition-all duration-300"
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

// ---- Portfolio card with rollup data ------------------------------------

function PortfolioCard({ portfolio, onDelete }: {
  portfolio: Portfolio;
  onDelete: (id: string, name: string) => void;
}) {
  const { data: rows } = usePortfolioRollup(portfolio.id);
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const rs = rows ?? [];
    const total = rs.reduce((s, r) => s + Number(r.total_tasks), 0);
    const done  = rs.reduce((s, r) => s + Number(r.done_tasks), 0);
    const active = rs.reduce((s, r) => s + Number(r.active_tasks), 0);
    const overdue = rs.reduce((s, r) => s + Number(r.overdue_tasks), 0);
    const pct = total > 0 ? Math.round((done / total) * 1000) / 10 : 0;
    const health = getHealthStatus(overdue, total);
    return { total, done, active, overdue, pct, health, projectCount: rs.length };
  }, [rows]);

  return (
    <div className="group rounded-lg border border-border/60 bg-secondary/20 hover:bg-sidebar-accent/25 transition-all hover:shadow-sm">
      <button
        onClick={() => navigate(`/portfolios/${portfolio.id}`)}
        className="block w-full text-left p-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="h-3.5 w-3.5 rounded-full shrink-0" style={{ backgroundColor: portfolio.color }} />
            <span className="text-[14px] font-semibold truncate">{portfolio.name}</span>
          </div>
          <HealthBadge status={stats.health} />
        </div>

        {/* Description */}
        {portfolio.description && (
          <p className="text-[12px] text-muted-foreground line-clamp-2 mb-3">{portfolio.description}</p>
        )}

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-muted-foreground">Ilerleme</span>
            <span className="text-[12px] font-medium tabular-nums">%{stats.pct}</span>
          </div>
          <MiniProgress pct={stats.pct} />
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <FolderKanban className="h-3 w-3" /> {stats.projectCount} proje
          </span>
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> {stats.done}/{stats.total} task
          </span>
          {stats.overdue > 0 && (
            <span className="inline-flex items-center gap-1 text-destructive">
              <AlertTriangle className="h-3 w-3" /> {stats.overdue} gecikmi
            </span>
          )}
          {stats.active > 0 && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> {stats.active} aktif
            </span>
          )}
        </div>
      </button>
      <div className="flex justify-end px-3 pb-3">
        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100" onClick={() => onDelete(portfolio.id, portfolio.name)}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// ---- Portfolio list -----------------------------------------------------

function PortfoliosList() {
  const { data, isLoading } = usePortfolios();
  const del = useDeletePortfolio();
  const [createOpen, setCreateOpen] = useState(false);
  const navigate = useNavigate();

  const doDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" portfoyunu sil? (Projeler silinmez.)`)) return;
    try { await del.mutateAsync(id); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-muted-foreground" /> Portfoyler
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground max-w-xl">
            Iliskili projeleri tek bir cati altinda toplayin. Her portfoy kartinda saglik durumu,
            ilerleme cubugu, proje ve task ozeti goruntulenur. Detay sayfasinda zaman cizgisi,
            saglik panosu ve sirlanabilir proje tablosu bulunur.
          </p>
        </div>
        <Button size="sm" className="h-8 gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Yeni portfoy
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-lg" />)}
        </div>
      ) : (data ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 py-16 text-center">
          <Briefcase className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-[14px] text-muted-foreground">Henuz portfoy olusturulmadi.</p>
          <p className="mt-1 text-[12px] text-muted-foreground/60">Projeleri gruplandirmak icin bir portfoy olusturun.</p>
          <Button size="sm" className="mt-4 gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Ilk portfoyu olustur
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data ?? []).map(p => (
            <PortfolioCard key={p.id} portfolio={p} onDelete={doDelete} />
          ))}
        </div>
      )}

      {createOpen && <EditDialog open={createOpen} onOpenChange={setCreateOpen} initial={null} />}
    </div>
  );
}

// ---- Stat tile ----------------------------------------------------------

function StatTile({ label, value, icon: Icon, accent, subtitle }: {
  label: string; value: number | string; icon?: React.ElementType;
  accent?: 'muted' | 'destructive' | 'success'; subtitle?: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-secondary/20 p-4">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      </div>
      <div className={cn(
        'mt-2 text-[24px] font-semibold tabular-nums leading-none',
        accent === 'destructive' ? 'text-destructive' : accent === 'success' ? 'text-emerald-600 dark:text-emerald-400' : '',
      )}>{value}</div>
      {subtitle && <div className="mt-1 text-[11px] text-muted-foreground">{subtitle}</div>}
    </div>
  );
}

// ---- Health donut chart -------------------------------------------------

function HealthDonut({ rows }: { rows: { project_status: string }[] }) {
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    rows.forEach(r => { counts[r.project_status] = (counts[r.project_status] ?? 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({
      name: STATUS_LABELS[status] ?? status,
      value: count,
      color: STATUS_COLORS[status] ?? '#94a3b8',
    }));
  }, [rows]);

  if (statusCounts.length === 0) return null;

  return (
    <div className="flex items-center gap-6">
      <div className="h-[140px] w-[140px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={statusCounts}
              cx="50%"
              cy="50%"
              innerRadius={38}
              outerRadius={62}
              dataKey="value"
              strokeWidth={2}
              stroke="var(--background)"
            >
              {statusCounts.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [`${value} proje`, name]}
              contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-1.5">
        {statusCounts.map(s => (
          <div key={s.name} className="flex items-center gap-2 text-[12px]">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-muted-foreground">{s.name}</span>
            <span className="font-medium">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Timeline view ------------------------------------------------------

function TimelineView({ rows, allProjects }: {
  rows: { project_id: string; project_name: string; project_status: string; completion_pct: number }[];
  allProjects: any[];
}) {
  const projectMap = useMemo(() => {
    const m = new Map<string, any>();
    (allProjects ?? []).forEach(p => m.set(p.id, p));
    return m;
  }, [allProjects]);

  const items = useMemo(() => {
    const now = new Date();
    return rows.map(r => {
      const proj = projectMap.get(r.project_id);
      const start = proj?.start_date ? new Date(proj.start_date) : null;
      const end = proj?.end_date ? new Date(proj.end_date) : null;
      return { ...r, start, end, priority: proj?.priority ?? 'medium' };
    }).filter(r => r.start || r.end);
  }, [rows, projectMap]);

  const { minDate, maxDate, totalDays } = useMemo(() => {
    const now = new Date();
    const dates = items.flatMap(i => [i.start, i.end].filter(Boolean) as Date[]);
    if (dates.length === 0) return { minDate: now, maxDate: now, totalDays: 1 };
    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));
    const diff = Math.max(1, Math.ceil((max.getTime() - min.getTime()) / 86400000));
    return { minDate: min, maxDate: max, totalDays: diff };
  }, [items]);

  const dayToPercent = (d: Date) => {
    return Math.max(0, Math.min(100, ((d.getTime() - minDate.getTime()) / 86400000 / totalDays) * 100));
  };

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 py-10 text-center text-[13px] text-muted-foreground">
        Zaman cizgisi icin projelere baslangic/bitis tarihi ekleyin.
      </div>
    );
  }

  const now = new Date();
  const todayPct = dayToPercent(now);

  return (
    <div className="space-y-1 relative">
      {/* Today marker */}
      {todayPct > 0 && todayPct < 100 && (
        <div className="absolute top-0 bottom-0 z-10 pointer-events-none" style={{ left: `${todayPct}%` }}>
          <div className="h-full w-px bg-destructive/50" />
          <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] text-destructive font-medium">Bugun</span>
        </div>
      )}
      {/* Month labels */}
      <div className="flex items-center text-[10px] text-muted-foreground/60 mb-2 h-4">
        {Array.from({ length: Math.min(12, Math.ceil(totalDays / 30)) }).map((_, i) => {
          const d = new Date(minDate.getTime() + i * 30 * 86400000);
          return (
            <span key={i} className="absolute text-[9px]" style={{ left: `${dayToPercent(d)}%` }}>
              {d.toLocaleDateString('tr-TR', { month: 'short' })}
            </span>
          );
        })}
      </div>
      {items.map(item => {
        const left = item.start ? dayToPercent(item.start) : 0;
        const right = item.end ? dayToPercent(item.end) : 100;
        const width = Math.max(2, right - left);
        return (
          <div key={item.project_id} className="flex items-center gap-3 py-1.5 group">
            <span className="w-36 shrink-0 text-[12px] truncate text-muted-foreground group-hover:text-foreground transition">
              {item.project_name}
            </span>
            <div className="flex-1 relative h-5">
              <div className="absolute inset-y-0 rounded-full" style={{
                left: `${left}%`,
                width: `${width}%`,
                backgroundColor: STATUS_COLORS[item.project_status] ?? '#94a3b8',
                opacity: 0.8,
              }}>
                <div className="h-full rounded-full bg-foreground/10" style={{ width: `${item.completion_pct}%` }} />
              </div>
            </div>
            <span className="w-12 text-right text-[11px] tabular-nums text-muted-foreground">%{item.completion_pct}</span>
          </div>
        );
      })}
    </div>
  );
}

// ---- Sortable project table ---------------------------------------------

type SortKey = 'name' | 'status' | 'progress' | 'priority' | 'overdue';
type SortDir = 'asc' | 'desc';

const PRIORITY_ORDER: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };

function ProjectTable({ rows, allProjects, onRemove, onNavigate }: {
  rows: any[];
  allProjects: any[];
  onRemove: (id: string) => void;
  onNavigate: (id: string) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const projectMap = useMemo(() => {
    const m = new Map<string, any>();
    (allProjects ?? []).forEach(p => m.set(p.id, p));
    return m;
  }, [allProjects]);

  const sorted = useMemo(() => {
    const list = [...rows].map(r => ({
      ...r,
      priority: projectMap.get(r.project_id)?.priority ?? 'medium',
    }));
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name': cmp = a.project_name.localeCompare(b.project_name); break;
        case 'status': cmp = a.project_status.localeCompare(b.project_status); break;
        case 'progress': cmp = Number(a.completion_pct) - Number(b.completion_pct); break;
        case 'priority': cmp = (PRIORITY_ORDER[a.priority] ?? 0) - (PRIORITY_ORDER[b.priority] ?? 0); break;
        case 'overdue': cmp = Number(a.overdue_tasks) - Number(b.overdue_tasks); break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return list;
  }, [rows, sortKey, sortDir, projectMap]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortHeader = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition">
      {children}
      <ArrowUpDown className={cn('h-3 w-3', sortKey === k ? 'text-foreground' : 'text-muted-foreground/40')} />
    </button>
  );

  return (
    <div className="rounded-lg border border-border/60 overflow-hidden">
      {/* Table header */}
      <div className="grid grid-cols-[1fr_90px_100px_80px_70px_36px] gap-2 px-3 py-2 bg-secondary/30 border-b border-border/40">
        <SortHeader k="name">Proje</SortHeader>
        <SortHeader k="status">Durum</SortHeader>
        <SortHeader k="progress">Ilerleme</SortHeader>
        <SortHeader k="priority">Oncelik</SortHeader>
        <SortHeader k="overdue">Geciken</SortHeader>
        <span />
      </div>
      {/* Rows */}
      {sorted.length === 0 ? (
        <div className="py-10 text-center text-[13px] text-muted-foreground">
          Bu portfoyde henuz proje yok.
        </div>
      ) : sorted.map(r => {
        const health = getHealthStatus(Number(r.overdue_tasks), Number(r.total_tasks));
        return (
          <div key={r.project_id} className="group grid grid-cols-[1fr_90px_100px_80px_70px_36px] gap-2 items-center px-3 py-2.5 border-b border-border/40 last:border-b-0 hover:bg-secondary/20 transition">
            <button onClick={() => onNavigate(r.project_id)} className="flex items-center gap-2 text-left min-w-0">
              <FolderKanban className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="text-[13px] font-medium hover:underline truncate">{r.project_name}</span>
            </button>
            <span className="text-[10.5px] uppercase tracking-wider text-muted-foreground rounded border border-border px-1.5 py-0.5 text-center truncate">
              {STATUS_LABELS[r.project_status] ?? r.project_status}
            </span>
            <div className="flex items-center gap-2">
              <MiniProgress pct={Number(r.completion_pct)} className="flex-1" />
              <span className="text-[11px] tabular-nums text-muted-foreground w-8 text-right">%{r.completion_pct}</span>
            </div>
            <span className={cn(
              'text-[11px] font-medium text-center',
              r.priority === 'urgent' ? 'text-red-500' : r.priority === 'high' ? 'text-amber-500' : 'text-muted-foreground'
            )}>
              {PRIORITY_LABELS[r.priority] ?? r.priority}
            </span>
            <span className={cn('text-[12px] tabular-nums text-center', Number(r.overdue_tasks) > 0 ? 'text-destructive font-medium' : 'text-muted-foreground')}>
              {r.overdue_tasks}
            </span>
            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-60 hover:!opacity-100" onClick={() => onRemove(r.project_id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        );
      })}
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
  const update = useUpdatePortfolio();
  const [editOpen, setEditOpen] = useState(false);
  const [addValue, setAddValue] = useState<string>('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
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
    const pct = total > 0 ? Math.round((done / total) * 1000) / 10 : 0;
    const health = getHealthStatus(overdue, total);
    const onTimeRate = total > 0 ? Math.round(((total - overdue) / total) * 100) : 100;
    const completedProjects = rs.filter(r => r.project_status === 'completed').length;
    return { total, done, active, overdue, pct, health, onTimeRate, completedProjects, projectCount: rs.length };
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

  const saveDescription = async () => {
    if (!portfolio) return;
    try {
      await update.mutateAsync({ id: portfolio.id, name: portfolio.name, description: descDraft.trim() || null, color: portfolio.color });
      setEditingDesc(false);
      toast.success('Aciklama guncellendi');
    } catch (e: any) { toast.error(e.message); }
  };

  if (pLoading) return <div className="p-6 space-y-3"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-40" /></div>;
  if (!portfolio) return <div className="p-6 text-[13px] text-muted-foreground">Portfoy bulunamadi.</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Back nav */}
      <button onClick={() => navigate('/portfolios')} className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition">
        <ChevronLeft className="h-3.5 w-3.5" /> Portfoyler
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 rounded-full" style={{ backgroundColor: portfolio.color }} />
            <h1 className="text-[24px] font-semibold tracking-tight">{portfolio.name}</h1>
            <HealthBadge status={totals.health} />
          </div>
          {/* Inline description editing */}
          {editingDesc ? (
            <div className="mt-2 space-y-2 max-w-lg">
              <Textarea value={descDraft} onChange={e => setDescDraft(e.target.value)} rows={3} className="text-[13px]" autoFocus />
              <div className="flex gap-2">
                <Button size="sm" className="h-7" onClick={saveDescription} disabled={update.isPending}>Kaydet</Button>
                <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditingDesc(false)}>Iptal</Button>
              </div>
            </div>
          ) : (
            <div className="mt-1 flex items-center gap-2 group/desc">
              <p className="text-[13px] text-muted-foreground">
                {portfolio.description || 'Aciklama eklemek icin tiklayin...'}
              </p>
              <button
                className="opacity-0 group-hover/desc:opacity-100 transition"
                onClick={() => { setDescDraft(portfolio.description ?? ''); setEditingDesc(true); }}
              >
                <Edit3 className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          )}
        </div>
        <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditOpen(true)}>Duzenle</Button>
      </div>

      {/* KPI summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatTile label="Toplam task" value={totals.total} icon={BarChart3} />
        <StatTile label="Tamamlanan" value={totals.done} icon={CheckCircle2} accent="success" subtitle={`%${totals.pct} tamamlandi`} />
        <StatTile label="Aktif" value={totals.active} icon={Clock} />
        <StatTile label="Gecikmi" value={totals.overdue} icon={AlertTriangle} accent={totals.overdue > 0 ? 'destructive' : 'muted'} />
        <StatTile label="Zamaninda teslim" value={`%${totals.onTimeRate}`} icon={Target} accent="success" subtitle="gecikmeyen oran" />
        <StatTile label="Projeler" value={totals.projectCount} icon={FolderKanban} subtitle={`${totals.completedProjects} tamamlandi`} />
      </div>

      {/* Overall progress */}
      <div className="rounded-lg border border-border/60 bg-secondary/20 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] uppercase tracking-wider text-muted-foreground font-medium">Genel ilerleme</span>
          <span className="text-[14px] font-semibold tabular-nums">%{totals.pct}</span>
        </div>
        <div className="h-2.5 rounded-full bg-secondary/40 overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${totals.pct}%` }} />
        </div>
        <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
          <span>{totals.done} / {totals.total} task tamamlandi</span>
          <span>{totals.active} devam ediyor, {totals.overdue} gecikmi</span>
        </div>
      </div>

      {/* Tabbed content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Genel Bakis</TabsTrigger>
          <TabsTrigger value="projects" className="gap-1.5"><FolderKanban className="h-3.5 w-3.5" /> Projeler</TabsTrigger>
          <TabsTrigger value="timeline" className="gap-1.5"><Calendar className="h-3.5 w-3.5" /> Zaman Cizgisi</TabsTrigger>
          <TabsTrigger value="health" className="gap-1.5"><Heart className="h-3.5 w-3.5" /> Saglik</TabsTrigger>
        </TabsList>

        {/* Overview tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Status distribution */}
            <div className="rounded-lg border border-border/60 bg-secondary/20 p-4">
              <h3 className="text-[13px] font-medium mb-3">Proje Durum Dagilimi</h3>
              {rLoading ? <Skeleton className="h-[140px]" /> : <HealthDonut rows={rows ?? []} />}
            </div>
            {/* Quick stats */}
            <div className="rounded-lg border border-border/60 bg-secondary/20 p-4 space-y-3">
              <h3 className="text-[13px] font-medium mb-3">Hizli Ozet</h3>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="text-muted-foreground">Toplam proje</span>
                  <span className="font-medium">{totals.projectCount}</span>
                </div>
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="text-muted-foreground">Tamamlanan proje</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">{totals.completedProjects}</span>
                </div>
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="text-muted-foreground">Ortalama ilerleme</span>
                  <span className="font-medium">%{totals.pct}</span>
                </div>
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="text-muted-foreground">Zamaninda teslim orani</span>
                  <span className="font-medium">%{totals.onTimeRate}</span>
                </div>
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="text-muted-foreground">Saglik durumu</span>
                  <HealthBadge status={totals.health} />
                </div>
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="text-muted-foreground">Geciken tasklar</span>
                  <span className={cn('font-medium', totals.overdue > 0 ? 'text-destructive' : '')}>{totals.overdue}</span>
                </div>
              </div>
            </div>
          </div>
          {/* Top overdue projects */}
          {(rows ?? []).filter(r => Number(r.overdue_tasks) > 0).length > 0 && (
            <div className="rounded-lg border border-border/60 bg-secondary/20 p-4">
              <h3 className="text-[13px] font-medium mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" /> Geciken Projeler
              </h3>
              <div className="space-y-2">
                {(rows ?? []).filter(r => Number(r.overdue_tasks) > 0)
                  .sort((a, b) => Number(b.overdue_tasks) - Number(a.overdue_tasks))
                  .map(r => (
                    <div key={r.project_id} className="flex items-center justify-between text-[12.5px] py-1">
                      <button onClick={() => navigate(`/projects/${r.project_id}`)} className="hover:underline text-left truncate flex-1">
                        {r.project_name}
                      </button>
                      <span className="text-destructive font-medium">{r.overdue_tasks} geciken task</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Projects tab */}
        <TabsContent value="projects" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-medium">Projeler ({rows?.length ?? 0})</h2>
            <div className="flex items-center gap-1.5">
              <Select value={addValue} onValueChange={setAddValue}>
                <SelectTrigger className="h-7 w-56 text-[12px]"><SelectValue placeholder="Proje ekle..." /></SelectTrigger>
                <SelectContent>
                  {available.length === 0 && <SelectItem value="__" disabled>Tum projeler eklenmi</SelectItem>}
                  {available.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" className="h-7" onClick={addProject} disabled={!addValue || add.isPending}>Ekle</Button>
            </div>
          </div>

          {rLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <ProjectTable
              rows={rows ?? []}
              allProjects={allProjects ?? []}
              onRemove={removeProject}
              onNavigate={(pid) => navigate(`/projects/${pid}`)}
            />
          )}
        </TabsContent>

        {/* Timeline tab */}
        <TabsContent value="timeline" className="space-y-3">
          <div className="rounded-lg border border-border/60 bg-secondary/20 p-4">
            <h3 className="text-[13px] font-medium mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" /> Proje Zaman Cizgisi
            </h3>
            {rLoading ? <Skeleton className="h-40" /> : (
              <TimelineView rows={rows ?? []} allProjects={allProjects ?? []} />
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Zaman cizgisi, her projenin baslangic ve bitis tarihlerini yatay cubuk olarak gosterir.
            Kirmizi dikey cizgi bugunu isaretler. Cubuk uzunlugu projenin zaman dilimini,
            ic dolgu ise tamamlanma yuzdesini gosterir.
          </p>
        </TabsContent>

        {/* Health tab */}
        <TabsContent value="health" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border/60 bg-secondary/20 p-4">
              <h3 className="text-[13px] font-medium mb-3">Durum Dagilimi</h3>
              <HealthDonut rows={rows ?? []} />
            </div>
            <div className="rounded-lg border border-border/60 bg-secondary/20 p-4">
              <h3 className="text-[13px] font-medium mb-3">Proje Saglik Durumu</h3>
              <div className="space-y-2">
                {(rows ?? []).map(r => {
                  const h = getHealthStatus(Number(r.overdue_tasks), Number(r.total_tasks));
                  return (
                    <div key={r.project_id} className="flex items-center justify-between py-1.5 text-[12.5px]">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <button onClick={() => navigate(`/projects/${r.project_id}`)} className="truncate hover:underline">
                          {r.project_name}
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <MiniProgress pct={Number(r.completion_pct)} className="w-20" />
                        <span className="text-[11px] tabular-nums w-8 text-right">%{r.completion_pct}</span>
                        <HealthBadge status={h} />
                      </div>
                    </div>
                  );
                })}
                {(rows ?? []).length === 0 && (
                  <p className="text-[12.5px] text-muted-foreground text-center py-4">Proje eklendikce saglik durumu burada gorunur.</p>
                )}
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border/60 bg-secondary/20 p-4">
            <h3 className="text-[13px] font-medium mb-2">Saglik Degerlendirme Kriterleri</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[12px] text-muted-foreground">
              <div className="flex items-start gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                <div><span className="font-medium text-foreground">Yolunda</span> -- Geciken task orani %10 altinda</div>
              </div>
              <div className="flex items-start gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500 mt-1 shrink-0" />
                <div><span className="font-medium text-foreground">Risk altinda</span> -- Geciken task orani %10-%20 arasi</div>
              </div>
              <div className="flex items-start gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500 mt-1 shrink-0" />
                <div><span className="font-medium text-foreground">Gecikiyor</span> -- Geciken task orani %20 uzerinde</div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {editOpen && <EditDialog open={editOpen} onOpenChange={setEditOpen} initial={portfolio} />}
    </div>
  );
}

// ---- Router shim ---------------------------------------------------------

export default function Portfolios() {
  const { id } = useParams<{ id?: string }>();
  if (id) return <PortfolioDetail id={id} />;
  return <PortfoliosList />;
}
