import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMyTasks, useUnassignedTasks, useUpdateTask, useWorkspaceIssues } from '@/lib/tasks-hooks';
import { useProjects } from '@/lib/projects-hooks';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  TASK_STATUS_COLORS, TASK_STATUS_LABELS,
  TASK_PRIORITY_COLORS, TASK_PRIORITY_LABELS,
  TASK_STATUS_ORDER,
} from '@/lib/tasks-types';
import type { Task, TaskStatus, TaskPriority } from '@/lib/tasks-types';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Search, UserRoundPlus, Inbox, List, LayoutGrid, BarChart3,
  CheckCircle2, Target, TrendingUp, Clock,
} from 'lucide-react';
import { TaskRow } from './TaskRow';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------
type Bucket = 'recent' | 'overdue' | 'today' | 'this_week' | 'next_week' | 'later' | 'no_date';
type ViewMode = 'mine' | 'all';
type Layout = 'list' | 'board' | 'summary';

const BUCKET_LABELS: Record<Bucket, string> = {
  recent: 'Yeni atananlar',
  overdue: 'Geciken',
  today: 'Bugün yap',
  this_week: 'Bu hafta',
  next_week: 'Önümüzdeki hafta',
  later: 'Daha sonra',
  no_date: 'Tarihsiz',
};

const BUCKET_ORDER: Bucket[] = ['recent', 'overdue', 'today', 'this_week', 'next_week', 'later', 'no_date'];

const BOARD_COLUMNS: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'review', 'done'];

function bucketFor(task: Task): Bucket {
  const created = new Date(task.created_at).getTime();
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  if (now - created < 2 * dayMs && task.status !== 'done') return 'recent';
  if (!task.due_date) return 'no_date';
  const due = new Date(task.due_date);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dueDay = new Date(due); dueDay.setHours(0, 0, 0, 0);
  const diff = Math.round((dueDay.getTime() - today.getTime()) / dayMs);
  if (diff < 0 && task.status !== 'done') return 'overdue';
  if (diff === 0) return 'today';
  if (diff <= 7) return 'this_week';
  if (diff <= 14) return 'next_week';
  return 'later';
}

// ---------------------------------------------------------------------------
// Stat helpers
// ---------------------------------------------------------------------------
function computeStats(tasks: Task[]) {
  const total = tasks.length;
  const done = tasks.filter(t => t.status === 'done').length;
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const completedToday = tasks.filter(t => {
    if (t.status !== 'done' || !t.completed_at) return false;
    return new Date(t.completed_at).getTime() >= todayStart.getTime();
  }).length;

  // Streak: count consecutive days (backwards from today) that have at least one completion
  let streak = 0;
  const completionDates = new Set(
    tasks
      .filter(t => t.completed_at)
      .map(t => {
        const d = new Date(t.completed_at!);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
  );
  const dayMs = 24 * 60 * 60 * 1000;
  const checkDay = new Date(); checkDay.setHours(0, 0, 0, 0);
  // Include today if there are completions
  for (let i = 0; i < 365; i++) {
    const ts = checkDay.getTime() - i * dayMs;
    if (completionDates.has(ts)) {
      streak++;
    } else {
      // allow skipping today if nothing completed yet, start counting from yesterday
      if (i === 0) continue;
      break;
    }
  }

  return { total, done, completionRate, completedToday, streak };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function MyTasksView() {
  const { data: myTasks, isLoading: myLoading } = useMyTasks();
  const { data: allTasks, isLoading: allLoading } = useWorkspaceIssues();
  const { data: unassigned } = useUnassignedTasks();
  const { data: projects } = useProjects();
  const { user } = useAuth();
  const updateTask = useUpdateTask();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('mine');
  const [layout, setLayout] = useState<Layout>('list');

  const projectMap = useMemo(() => new Map((projects ?? []).map(p => [p.id, p])), [projects]);

  const isLoading = viewMode === 'mine' ? myLoading : allLoading;
  const sourceTasks = viewMode === 'mine' ? (myTasks ?? []) : (allTasks ?? []);

  const claim = async (taskId: string, title: string) => {
    try {
      await updateTask.mutateAsync({ id: taskId, assignee_id: user!.id });
      toast.success(`Üstlendin: ${title}`);
    } catch (e) {
      toast.error('Atanamadı: ' + (e instanceof Error ? e.message : ''));
    }
  };

  // Apply filters
  const applyFilters = (list: Task[]) => {
    let r = list;
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(t => t.title.toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') r = r.filter(t => t.status === statusFilter);
    if (priorityFilter !== 'all') r = r.filter(t => t.priority === priorityFilter);
    return r;
  };

  const unassignedFiltered = useMemo(
    () => applyFilters(unassigned ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unassigned, search, statusFilter, priorityFilter],
  );

  const filtered = useMemo(
    () => applyFilters(sourceTasks),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sourceTasks, search, statusFilter, priorityFilter],
  );

  const grouped = useMemo(() => {
    const g: Record<Bucket, Task[]> = { recent: [], overdue: [], today: [], this_week: [], next_week: [], later: [], no_date: [] };
    filtered.forEach(t => { g[bucketFor(t)].push(t); });
    return g;
  }, [filtered]);

  const boardColumns = useMemo(() => {
    const cols: Record<TaskStatus, Task[]> = { backlog: [], todo: [], in_progress: [], review: [], done: [] };
    filtered.forEach(t => { cols[t.status].push(t); });
    return cols;
  }, [filtered]);

  const stats = useMemo(() => computeStats(sourceTasks), [sourceTasks]);

  // Summary: group by project with completion %
  const projectSummary = useMemo(() => {
    const map = new Map<string, { name: string; total: number; done: number }>();
    filtered.forEach(t => {
      const p = projectMap.get(t.project_id);
      const name = p?.name ?? 'Projeksiz';
      if (!map.has(t.project_id)) map.set(t.project_id, { name, total: 0, done: 0 });
      const entry = map.get(t.project_id)!;
      entry.total++;
      if (t.status === 'done') entry.done++;
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filtered, projectMap]);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const renderStatCards = () => (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="rounded-lg border border-border/60 bg-card p-3">
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
          <Target className="h-3.5 w-3.5" />
          Toplam
        </div>
        <span className="text-2xl font-bold">{stats.total}</span>
        <span className="text-xs text-muted-foreground ml-1">task</span>
      </div>
      <div className="rounded-lg border border-border/60 bg-card p-3">
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          Bugün
        </div>
        <span className="text-2xl font-bold">{stats.completedToday}</span>
        <span className="text-xs text-muted-foreground ml-1">tamamlandı</span>
      </div>
      <div className="rounded-lg border border-border/60 bg-card p-3">
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
          <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
          Seri
        </div>
        <span className="text-2xl font-bold">{stats.streak}</span>
        <span className="text-xs text-muted-foreground ml-1">gün</span>
      </div>
      <div className="rounded-lg border border-border/60 bg-card p-3">
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
          <Clock className="h-3.5 w-3.5 text-blue-400" />
          Oran
        </div>
        <span className="text-2xl font-bold">%{stats.completionRate}</span>
        <span className="text-xs text-muted-foreground ml-1">tamamlanma</span>
      </div>
    </div>
  );

  const renderUnassigned = () => {
    if (viewMode !== 'mine' || unassignedFiltered.length === 0) return null;
    return (
      <section>
        <div className="flex items-center gap-2 mb-2">
          <Inbox className="h-3.5 w-3.5 text-warning" />
          <h2 className="text-sm font-semibold">Sahipsiz işler</h2>
          <span className="text-xs text-muted-foreground">{unassignedFiltered.length}</span>
        </div>
        <div className="rounded-md border border-warning/25 overflow-hidden">
          {unassignedFiltered.map(t => {
            const project = projectMap.get(t.project_id);
            return (
              <TaskRow
                key={t.id}
                task={t}
                projectName={project?.name}
                href={`/projects/${t.project_id}`}
                rightSlot={
                  <Button
                    size="sm" variant="outline" className="h-6 shrink-0 text-[11px] px-2"
                    disabled={updateTask.isPending}
                    onClick={(e) => { e.preventDefault(); claim(t.id, t.title); }}
                  >
                    <UserRoundPlus className="mr-1 h-3 w-3" /> Üstlen
                  </Button>
                }
              />
            );
          })}
        </div>
      </section>
    );
  };

  const renderListView = () => (
    <div className="space-y-4">
      {BUCKET_ORDER.map(b => {
        const items = grouped[b];
        if (items.length === 0) return null;
        const doneCount = items.filter(t => t.status === 'done').length;
        const pct = Math.round((doneCount / items.length) * 100);
        return (
          <section key={b}>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-sm font-semibold">{BUCKET_LABELS[b]}</h2>
              <span className="text-xs text-muted-foreground">{items.length}</span>
              <div className="flex items-center gap-1.5 ml-auto">
                <Progress value={pct} className="h-1.5 w-20" />
                <span className="text-[10px] tabular-nums text-muted-foreground">%{pct}</span>
              </div>
            </div>
            <div className="rounded-md border border-border/60 overflow-hidden">
              {items.map(t => {
                const project = projectMap.get(t.project_id);
                return (
                  <TaskRow
                    key={t.id}
                    task={t}
                    projectName={project?.name}
                    href={`/projects/${t.project_id}`}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );

  const renderBoardView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 overflow-x-auto">
      {BOARD_COLUMNS.map(status => {
        const items = boardColumns[status];
        return (
          <div key={status} className="min-w-[220px] flex flex-col">
            <div className="flex items-center gap-2 mb-2 px-1">
              <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', TASK_STATUS_COLORS[status])}>
                {TASK_STATUS_LABELS[status]}
              </Badge>
              <span className="text-xs text-muted-foreground">{items.length}</span>
            </div>
            <div className="flex-1 space-y-1.5 rounded-lg border border-border/40 bg-muted/20 p-2 min-h-[120px]">
              {items.length === 0 && (
                <p className="text-xs text-muted-foreground/60 text-center py-6">Görev yok</p>
              )}
              {items.map(t => {
                const project = projectMap.get(t.project_id);
                return (
                  <Link
                    key={t.id}
                    to={`/projects/${t.project_id}`}
                    className="block rounded-md border border-border/60 bg-card p-2.5 hover:bg-accent/40 transition-colors"
                  >
                    <p className="text-sm font-medium truncate">{t.title}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                      <span className="font-mono tabular-nums">{t.tracking_id}</span>
                      {project && <span className="truncate max-w-[80px]">{project.name}</span>}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Badge variant="outline" className={cn('text-[9px] px-1 py-0', TASK_PRIORITY_COLORS[t.priority])}>
                        {TASK_PRIORITY_LABELS[t.priority]}
                      </Badge>
                      {t.due_date && (
                        <span className="text-[10px] tabular-nums text-muted-foreground">
                          {new Date(t.due_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderSummaryView = () => (
    <div className="space-y-3">
      {/* Status overview */}
      <div className="rounded-lg border border-border/60 bg-card p-4">
        <h3 className="text-sm font-semibold mb-3">Duruma göre dağılım</h3>
        <div className="space-y-2">
          {TASK_STATUS_ORDER.map(status => {
            const count = filtered.filter(t => t.status === status).length;
            const pct = filtered.length > 0 ? Math.round((count / filtered.length) * 100) : 0;
            return (
              <div key={status} className="flex items-center gap-3">
                <span className="text-xs w-24 truncate">{TASK_STATUS_LABELS[status]}</span>
                <Progress value={pct} className="h-2 flex-1" />
                <span className="text-xs tabular-nums text-muted-foreground w-12 text-right">{count} (%{pct})</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-project breakdown */}
      <div className="rounded-lg border border-border/60 bg-card p-4">
        <h3 className="text-sm font-semibold mb-3">Projelere göre ilerleme</h3>
        {projectSummary.length === 0 ? (
          <p className="text-xs text-muted-foreground">Görev bulunamadı</p>
        ) : (
          <div className="space-y-3">
            {projectSummary.map((ps, i) => {
              const pct = ps.total > 0 ? Math.round((ps.done / ps.total) * 100) : 0;
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm truncate max-w-[200px]">{ps.name}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">{ps.done}/{ps.total} (%{pct})</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Priority breakdown */}
      <div className="rounded-lg border border-border/60 bg-card p-4">
        <h3 className="text-sm font-semibold mb-3">Öncelik dağılımı</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.keys(TASK_PRIORITY_LABELS) as TaskPriority[]).map(p => {
            const count = filtered.filter(t => t.priority === p).length;
            return (
              <div key={p} className="rounded-md border border-border/40 p-2 text-center">
                <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 mb-1', TASK_PRIORITY_COLORS[p])}>
                  {TASK_PRIORITY_LABELS[p]}
                </Badge>
                <p className="text-lg font-bold">{count}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Görevlerim</h1>
        <p className="text-sm text-muted-foreground">
          {viewMode === 'mine'
            ? 'Sana atanan görevler zamana göre gruplandı; sahipsiz işler ayrı başlıkta'
            : 'Workspace genelindeki tüm görevler'}
        </p>
      </div>

      {/* View mode tabs + layout switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="inline-flex rounded-lg border border-border/60 p-0.5 bg-muted/30">
          <button
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors',
              viewMode === 'mine' ? 'bg-background text-foreground shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setViewMode('mine')}
          >
            Benim Tasklerim
          </button>
          <button
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors',
              viewMode === 'all' ? 'bg-background text-foreground shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setViewMode('all')}
          >
            Tüm Taskler
          </button>
        </div>

        <div className="inline-flex rounded-lg border border-border/60 p-0.5 bg-muted/30 ml-auto">
          <button
            title="Liste"
            className={cn(
              'p-1.5 rounded-md transition-colors',
              layout === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setLayout('list')}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            title="Pano"
            className={cn(
              'p-1.5 rounded-md transition-colors',
              layout === 'board' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setLayout('board')}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            title="Özet"
            className={cn(
              'p-1.5 rounded-md transition-colors',
              layout === 'summary' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setLayout('summary')}
          >
            <BarChart3 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Stats row */}
      {renderStatCards()}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Görev ara..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as 'all' | TaskStatus)}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm durumlar</SelectItem>
            {(Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map(s => (
              <SelectItem key={s} value={s}>{TASK_STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={v => setPriorityFilter(v as 'all' | TaskPriority)}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm öncelikler</SelectItem>
            {(Object.keys(TASK_PRIORITY_LABELS) as TaskPriority[]).map(p => (
              <SelectItem key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* F16 -- sahipsiz isler (only in list layout + mine view) */}
      {layout === 'list' && renderUnassigned()}

      {/* Main content */}
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-center py-16 text-muted-foreground">
          {viewMode === 'mine' && unassignedFiltered.length > 0
            ? 'Sana atanmış görev yok'
            : 'Görev yok'}
        </p>
      ) : layout === 'list' ? (
        renderListView()
      ) : layout === 'board' ? (
        renderBoardView()
      ) : (
        renderSummaryView()
      )}
    </div>
  );
}
