import { useState, useMemo } from 'react';
import { useCycles, useCreateCycle, useUpdateCycle, useCycleProgress } from '@/lib/cycles-hooks';
import { useCycleTasks } from '@/lib/tasks-hooks';
import { useAllProfiles } from '@/lib/projects-hooks';
import { CYCLE_STATUS_LABELS, type Cycle, type CycleStatus } from '@/lib/cycles-types';
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_ORDER,
  TASK_PRIORITY_LABELS,
  type Task,
  type TaskStatus,
} from '@/lib/tasks-types';
import { StatCard } from '@/components/StatCard';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Calendar,
  Target,
  CheckCircle2,
  Play,
  Clock,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Pencil,
  TrendingUp,
  BarChart3,
  Circle,
  Loader2,
  Eye,
  AlertCircle,
  Users,
} from 'lucide-react';
import { format, formatDistanceToNowStrict, differenceInDays, eachDayOfInterval, isBefore, isAfter, parseISO } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const STATUS_META: Record<CycleStatus, { icon: React.ElementType; className: string; label: string; bg: string }> = {
  active:    { icon: Play,         className: 'text-[hsl(var(--status-in-progress))]', bg: 'bg-blue-500/10 border-blue-500/20',    label: CYCLE_STATUS_LABELS.active },
  planned:   { icon: Clock,        className: 'text-muted-foreground',                 bg: 'bg-muted/50 border-border/60',          label: CYCLE_STATUS_LABELS.planned },
  completed: { icon: CheckCircle2, className: 'text-[hsl(var(--status-done))]',        bg: 'bg-emerald-500/10 border-emerald-500/20', label: CYCLE_STATUS_LABELS.completed },
};

const TASK_STATUS_ICON: Record<TaskStatus, React.ElementType> = {
  backlog: Circle,
  todo: Circle,
  in_progress: Loader2,
  review: Eye,
  done: CheckCircle2,
};

const TASK_STATUS_COLOR: Record<TaskStatus, string> = {
  backlog: 'text-muted-foreground/50',
  todo: 'text-muted-foreground',
  in_progress: 'text-blue-400',
  review: 'text-amber-400',
  done: 'text-emerald-400',
};

const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-amber-500',
  medium: 'bg-blue-400',
  low: 'bg-muted-foreground/40',
};

/* ------------------------------------------------------------------ */
/*  Cycle Card (list item)                                            */
/* ------------------------------------------------------------------ */

function CycleCard({ cycle, isSelected, onSelect }: { cycle: Cycle; isSelected: boolean; onSelect: () => void }) {
  const { data: progress } = useCycleProgress(cycle.id);
  const meta = STATUS_META[cycle.status];
  const total = progress?.total_tasks ?? 0;
  const done = progress?.done_tasks ?? 0;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const start = new Date(cycle.start_date);
  const end = new Date(cycle.end_date);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-lg border p-4 transition-all cursor-pointer group
        ${isSelected
          ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20'
          : `border-border/60 bg-card hover:border-border hover:bg-accent/30`
        }
        ${cycle.status === 'active' && !isSelected ? `${meta.bg}` : ''}
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <meta.icon className={`h-3.5 w-3.5 ${meta.className}`} />
            <span className={`text-[11px] font-medium uppercase tracking-wider ${meta.className}`}>
              {meta.label}
            </span>
            <span className="font-mono text-[10.5px] text-muted-foreground/70">#{cycle.number}</span>
          </div>
          <h3 className="text-[15px] font-semibold text-foreground truncate">{cycle.name}</h3>
          {cycle.goal && (
            <p className="mt-1 text-[12px] text-muted-foreground line-clamp-2 flex items-center gap-1">
              <Target className="h-3 w-3 shrink-0" /> {cycle.goal}
            </p>
          )}
        </div>
        <ChevronRight className={`h-4 w-4 text-muted-foreground/40 transition-transform mt-1 shrink-0
          ${isSelected ? 'rotate-90 text-primary' : 'group-hover:text-muted-foreground'}`}
        />
      </div>

      <div className="mt-3 flex items-center gap-3 text-[11.5px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {format(start, 'MMM d')} &rarr; {format(end, 'MMM d')}
        </span>
        {cycle.status === 'active' && daysLeft > 0 && (
          <span className="text-[hsl(var(--status-in-progress))]">
            {daysLeft} gun kaldi
          </span>
        )}
        {cycle.status === 'planned' && (
          <span>{formatDistanceToNowStrict(start, { addSuffix: true })}</span>
        )}
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-muted-foreground">
            {total} gorev
          </span>
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {done}/{total} <span className="opacity-60">({pct}%)</span>
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/60">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        {(progress?.total_points ?? 0) > 0 && (
          <div className="mt-1.5 text-[10.5px] text-muted-foreground font-mono tabular-nums">
            {progress?.done_points ?? 0} / {progress?.total_points ?? 0} puan
          </div>
        )}
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Burndown Chart                                                    */
/* ------------------------------------------------------------------ */

function BurndownChart({ cycle, tasks }: { cycle: Cycle; tasks: Task[] }) {
  const chartData = useMemo(() => {
    const start = parseISO(cycle.start_date);
    const end = parseISO(cycle.end_date);
    const now = new Date();
    const endDate = isBefore(now, end) ? now : end;

    if (isAfter(start, endDate)) return [];

    const days = eachDayOfInterval({ start, end });
    const totalTasks = tasks.length;

    // Ideal burndown line
    const totalDays = days.length;

    return days.map((day, i) => {
      // Count tasks completed on or before this day
      const completedByDay = tasks.filter(t => {
        if (t.status !== 'done' || !t.completed_at) return false;
        return isBefore(parseISO(t.completed_at), new Date(day.getTime() + 86400000));
      }).length;

      const remaining = totalTasks - completedByDay;
      const idealRemaining = Math.max(0, totalTasks - (totalTasks * (i / (totalDays - 1 || 1))));

      // Only show actual data up to today
      const isInFuture = isAfter(day, now);

      return {
        date: format(day, 'MMM d'),
        remaining: isInFuture ? undefined : remaining,
        ideal: Math.round(idealRemaining * 10) / 10,
      };
    });
  }, [cycle, tasks]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-[12px] text-muted-foreground">
        Burndown icin yeterli veri yok
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10 }}
          className="text-muted-foreground"
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10 }}
          className="text-muted-foreground"
          allowDecimals={false}
        />
        <RechartsTooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
        <Area
          type="monotone"
          dataKey="ideal"
          stroke="hsl(var(--muted-foreground) / 0.3)"
          strokeDasharray="4 4"
          fill="none"
          name="Ideal"
        />
        <Area
          type="monotone"
          dataKey="remaining"
          stroke="hsl(var(--primary))"
          fill="hsl(var(--primary) / 0.1)"
          strokeWidth={2}
          name="Kalan"
          connectNulls={false}
        />
        <ReferenceLine y={0} stroke="hsl(var(--muted-foreground) / 0.2)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------------------ */
/*  Task List (grouped by status)                                     */
/* ------------------------------------------------------------------ */

function CycleTaskList({ tasks, isLoading, profileMap }: { tasks: Task[]; isLoading: boolean; profileMap: Map<string, string | null> }) {
  const [collapsedStatuses, setCollapsedStatuses] = useState<Set<TaskStatus>>(new Set());

  const grouped = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      backlog: [], todo: [], in_progress: [], review: [], done: [],
    };
    tasks.forEach(t => {
      if (map[t.status]) map[t.status].push(t);
    });
    return map;
  }, [tasks]);

  const toggleStatus = (s: TaskStatus) => {
    setCollapsedStatuses(prev => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  };

  if (isLoading) {
    return <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10" />)}</div>;
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-md border border-border/40 py-12 text-center">
        <AlertCircle className="mx-auto h-6 w-6 text-muted-foreground/30 mb-2" />
        <p className="text-[12.5px] text-muted-foreground">Bu cycle'da henuz gorev yok.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {TASK_STATUS_ORDER.map(status => {
        const list = grouped[status];
        if (list.length === 0) return null;
        const Icon = TASK_STATUS_ICON[status];
        const isCollapsed = collapsedStatuses.has(status);

        return (
          <div key={status}>
            <button
              type="button"
              onClick={() => toggleStatus(status)}
              className="flex items-center gap-2 mb-1.5 w-full text-left group"
            >
              {isCollapsed
                ? <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
                : <ChevronDown className="h-3 w-3 text-muted-foreground/60" />
              }
              <Icon className={`h-3.5 w-3.5 ${TASK_STATUS_COLOR[status]}`} />
              <span className="text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                {TASK_STATUS_LABELS[status]}
              </span>
              <span className="font-mono text-[10.5px] tabular-nums text-muted-foreground/60">{list.length}</span>
            </button>
            {!isCollapsed && (
              <div className="ml-5 space-y-0.5">
                {list.map(task => {
                  const assigneeName = task.assignee_id ? profileMap.get(task.assignee_id) : null;
                  const initials = assigneeName
                    ? assigneeName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                    : '';
                  const isOverdue = task.due_date && task.status !== 'done' &&
                    new Date(task.due_date) < new Date();
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 rounded-md px-2.5 py-1.5 hover:bg-accent/40 transition-colors group/task"
                    >
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${TASK_STATUS_COLOR[status]}`} />
                      <span className="font-mono text-[10px] text-muted-foreground/50 shrink-0">
                        {task.tracking_id}
                      </span>
                      <span className="text-[13px] text-foreground truncate flex-1">{task.title}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {task.priority && (
                          <span className="flex items-center gap-1 text-[10.5px] text-muted-foreground">
                            <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[task.priority] ?? ''}`} />
                            {TASK_PRIORITY_LABELS[task.priority]}
                          </span>
                        )}
                        {task.story_points != null && (
                          <span className="font-mono text-[10px] tabular-nums text-muted-foreground/60 bg-muted/60 rounded px-1 py-0.5">
                            {task.story_points}p
                          </span>
                        )}
                        {task.due_date && (
                          <span className={`text-[10.5px] tabular-nums ${isOverdue ? 'text-red-400 font-medium' : 'text-muted-foreground'}`}>
                            {format(new Date(task.due_date), 'MMM d')}
                          </span>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="bg-sidebar-accent text-[8px] font-semibold text-sidebar-accent-foreground">
                                {initials || '·'}
                              </AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-[11px]">
                            {assigneeName ?? 'Atanmamış'}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Cycle Detail View                                                 */
/* ------------------------------------------------------------------ */

function CycleDetail({ cycle, onBack }: { cycle: Cycle; onBack: () => void }) {
  const { data: progress } = useCycleProgress(cycle.id);
  const { data: tasks = [], isLoading: tasksLoading } = useCycleTasks(cycle.id);
  const { data: profiles } = useAllProfiles();
  const [editOpen, setEditOpen] = useState(false);

  const profileMap = useMemo(
    () => new Map((profiles ?? []).map(p => [p.user_id, p.full_name])),
    [profiles],
  );

  const memberBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; total: number; done: number; overdue: number; inProgress: number }>();
    const today = new Date();
    tasks.forEach(t => {
      const key = t.assignee_id ?? '__unassigned__';
      const name = t.assignee_id ? (profileMap.get(t.assignee_id) ?? 'Kullanıcı') : 'Atanmamış';
      const entry = map.get(key) ?? { name, total: 0, done: 0, overdue: 0, inProgress: 0 };
      entry.total++;
      if (t.status === 'done') entry.done++;
      if (t.status === 'in_progress' || t.status === 'review') entry.inProgress++;
      if (t.due_date && t.status !== 'done' && new Date(t.due_date) < today) entry.overdue++;
      map.set(key, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.overdue - a.overdue || b.total - a.total);
  }, [tasks, profileMap]);

  const meta = STATUS_META[cycle.status];
  const total = progress?.total_tasks ?? 0;
  const done = progress?.done_tasks ?? 0;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const start = parseISO(cycle.start_date);
  const end = parseISO(cycle.end_date);
  const now = new Date();
  const totalDays = differenceInDays(end, start) || 1;
  const elapsedDays = Math.min(totalDays, Math.max(0, differenceInDays(now, start)));
  const daysLeft = Math.max(0, differenceInDays(end, now));

  // Velocity: tasks completed per day (only for active/completed cycles)
  const velocity = useMemo(() => {
    if (elapsedDays <= 0 || done === 0) return 0;
    return Math.round((done / elapsedDays) * 10) / 10;
  }, [done, elapsedDays]);

  // Status distribution
  const statusDistribution = useMemo(() => {
    const dist: Record<TaskStatus, number> = { backlog: 0, todo: 0, in_progress: 0, review: 0, done: 0 };
    tasks.forEach(t => { if (dist[t.status] !== undefined) dist[t.status]++; });
    return dist;
  }, [tasks]);

  const inProgressCount = statusDistribution.in_progress + statusDistribution.review;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onBack}
            className="mt-1 rounded-md p-1 hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <meta.icon className={`h-4 w-4 ${meta.className}`} />
              <span className={`text-[11px] font-medium uppercase tracking-wider ${meta.className} px-2 py-0.5 rounded-full border ${meta.bg}`}>
                {meta.label}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground/60">#{cycle.number}</span>
            </div>
            <h2 className="text-[20px] font-semibold tracking-tight text-foreground">{cycle.name}</h2>
            {cycle.goal && (
              <p className="mt-1 text-[13px] text-muted-foreground flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 shrink-0" /> {cycle.goal}
              </p>
            )}
            <p className="mt-1.5 text-[12px] text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3 w-3" />
              {format(start, 'MMM d, yyyy')} &rarr; {format(end, 'MMM d, yyyy')}
              <span className="text-muted-foreground/50 mx-1">&middot;</span>
              {totalDays} gun
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setEditOpen(true)}>
          <Pencil className="h-3 w-3" /> Duzenle
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="Ilerleme" value={`${pct}%`} subtitle={`${done}/${total} gorev`} icon={Target} />
        <StatCard title="Kalan gun" value={cycle.status === 'completed' ? '-' : String(daysLeft)} subtitle={`${elapsedDays}/${totalDays} gecti`} icon={Calendar} />
        <StatCard
          title="Hiz"
          value={velocity > 0 ? `${velocity}` : '-'}
          subtitle="gorev/gun"
          icon={TrendingUp}
        />
        <StatCard
          title="Devam eden"
          value={String(inProgressCount)}
          subtitle={`${statusDistribution.in_progress} is + ${statusDistribution.review} inceleme`}
          icon={Play}
        />
      </div>

      {/* Progress bar - full width */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11.5px] text-muted-foreground font-medium">Genel ilerleme</span>
          <span className="font-mono text-[11.5px] tabular-nums text-muted-foreground">{pct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/60">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
        {/* Mini status bar */}
        {total > 0 && (
          <div className="flex mt-2 h-1 rounded-full overflow-hidden bg-secondary/40">
            {TASK_STATUS_ORDER.map(s => {
              const count = statusDistribution[s];
              if (count === 0) return null;
              const colors: Record<TaskStatus, string> = {
                backlog: 'bg-muted-foreground/20',
                todo: 'bg-muted-foreground/40',
                in_progress: 'bg-blue-500',
                review: 'bg-amber-500',
                done: 'bg-emerald-500',
              };
              return (
                <div
                  key={s}
                  className={`${colors[s]} transition-all`}
                  style={{ width: `${(count / total) * 100}%` }}
                  title={`${TASK_STATUS_LABELS[s]}: ${count}`}
                />
              );
            })}
          </div>
        )}
        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
          {TASK_STATUS_ORDER.map(s => {
            const count = statusDistribution[s];
            if (count === 0) return null;
            return (
              <span key={s} className="flex items-center gap-1 text-[10.5px] text-muted-foreground">
                <span className={`inline-block h-2 w-2 rounded-full ${
                  s === 'done' ? 'bg-emerald-500' :
                  s === 'in_progress' ? 'bg-blue-500' :
                  s === 'review' ? 'bg-amber-500' : 'bg-muted-foreground/30'
                }`} />
                {TASK_STATUS_LABELS[s]} ({count})
              </span>
            );
          })}
        </div>
      </div>

      {/* Burndown chart */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-4 w-4 text-muted-foreground/60" />
          <h3 className="text-[13px] font-semibold text-foreground">Burndown</h3>
        </div>
        <div className="rounded-lg border border-border/40 bg-card p-4">
          <BurndownChart cycle={cycle} tasks={tasks} />
        </div>
      </div>

      {/* Member breakdown - who's behind */}
      {memberBreakdown.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-muted-foreground/60" />
            <h3 className="text-[13px] font-semibold text-foreground">Kişi bazlı ilerleme</h3>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {memberBreakdown.map(m => {
              const pctDone = m.total === 0 ? 0 : Math.round((m.done / m.total) * 100);
              const initials = m.name === 'Atanmamış' ? '?' : m.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
              return (
                <div
                  key={m.name}
                  className={cn(
                    "rounded-lg border p-3 transition-colors",
                    m.overdue > 0
                      ? "border-red-500/30 bg-red-500/5"
                      : "border-border/40 bg-card"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className={cn(
                        "text-[9px] font-semibold",
                        m.name === 'Atanmamış' ? "bg-amber-500/20 text-warning" : "bg-sidebar-accent text-sidebar-accent-foreground"
                      )}>
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[13px] font-medium truncate">{m.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-1.5">
                    <span className="tabular-nums">{m.done}/{m.total} tamamlandı</span>
                    {m.inProgress > 0 && <span className="text-blue-400 tabular-nums">{m.inProgress} devam eden</span>}
                    {m.overdue > 0 && <span className="text-red-400 font-medium tabular-nums">{m.overdue} gecikmiş</span>}
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/60">
                    <div className="h-full rounded-full bg-emerald-500/70 transition-all" style={{ width: `${pctDone}%` }} />
                  </div>
                  <div className="mt-1 text-right text-[10px] tabular-nums text-muted-foreground/60">%{pctDone}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Task list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-semibold text-foreground">Gorevler</h3>
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{tasks.length} gorev</span>
        </div>
        <div className="rounded-lg border border-border/40 bg-card p-4">
          <CycleTaskList tasks={tasks} isLoading={tasksLoading} profileMap={profileMap} />
        </div>
      </div>

      {/* Edit dialog */}
      <EditCycleDialog cycle={cycle} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Edit Cycle Dialog                                                 */
/* ------------------------------------------------------------------ */

function EditCycleDialog({ cycle, open, onOpenChange }: { cycle: Cycle; open: boolean; onOpenChange: (o: boolean) => void }) {
  const update = useUpdateCycle();
  const [name, setName] = useState(cycle.name);
  const [startDate, setStartDate] = useState(cycle.start_date);
  const [endDate, setEndDate] = useState(cycle.end_date);
  const [goal, setGoal] = useState(cycle.goal ?? '');
  const [status, setStatus] = useState<CycleStatus>(cycle.status);

  // Reset form when cycle changes
  const [prevId, setPrevId] = useState(cycle.id);
  if (cycle.id !== prevId) {
    setPrevId(cycle.id);
    setName(cycle.name);
    setStartDate(cycle.start_date);
    setEndDate(cycle.end_date);
    setGoal(cycle.goal ?? '');
    setStatus(cycle.status);
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await update.mutateAsync({
        id: cycle.id,
        name: name.trim(),
        start_date: startDate,
        end_date: endDate,
        goal: goal.trim() || null,
        status,
      });
      toast.success('Cycle guncellendi');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Cycle duzenle</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Ad</Label>
            <Input value={name} onChange={e => setName(e.target.value)} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Baslangic</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Bitis</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Hedef (opsiyonel)</Label>
            <Input value={goal} onChange={e => setGoal(e.target.value)} placeholder="Bu cycle'da ne basaracagiz?" />
          </div>
          <div className="space-y-2">
            <Label>Durum</Label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as CycleStatus)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="planned">{CYCLE_STATUS_LABELS.planned}</option>
              <option value="active">{CYCLE_STATUS_LABELS.active}</option>
              <option value="completed">{CYCLE_STATUS_LABELS.completed}</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={update.isPending}>Kaydet</Button>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Iptal</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Create Cycle Dialog                                               */
/* ------------------------------------------------------------------ */

function CreateCycleDialog({ open, onOpenChange, nextNumber }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  nextNumber: number;
}) {
  const create = useCreateCycle();
  const [name, setName] = useState('');
  const [start, setStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [end, setEnd] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [goal, setGoal] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await create.mutateAsync({
        name: name.trim() || `Cycle ${nextNumber}`,
        start_date: start,
        end_date: end,
        goal: goal.trim() || null,
        number: nextNumber,
      });
      toast.success('Cycle olusturuldu');
      setName(''); setGoal('');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Yeni cycle</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Ad</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder={`Cycle ${nextNumber}`} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Baslangic</Label>
              <Input type="date" value={start} onChange={e => setStart(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Bitis</Label>
              <Input type="date" value={end} onChange={e => setEnd(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Hedef (opsiyonel)</Label>
            <Input value={goal} onChange={e => setGoal(e.target.value)} placeholder="Bu cycle'da ne basaracagiz?" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={create.isPending}>Olustur</Button>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Iptal</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                         */
/* ------------------------------------------------------------------ */

export default function Cycles() {
  const { data: cycles, isLoading } = useCycles();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);

  const sorted = useMemo(() => {
    if (!cycles) return [];
    // Active first, then planned, then completed. Within each group, by start_date desc
    const order: Record<CycleStatus, number> = { active: 0, planned: 1, completed: 2 };
    return [...cycles].sort((a, b) => {
      const so = order[a.status] - order[b.status];
      if (so !== 0) return so;
      return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
    });
  }, [cycles]);

  const grouped = useMemo(() => ({
    active:    sorted.filter(c => c.status === 'active'),
    planned:   sorted.filter(c => c.status === 'planned'),
    completed: sorted.filter(c => c.status === 'completed'),
  }), [sorted]);

  const nextNumber = ((cycles ?? []).reduce((m, c) => Math.max(m, c.number), 0)) + 1;

  const selectedCycle = sorted.find(c => c.id === selectedCycleId) ?? null;

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight">Döngüler</h1>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            Zaman-kutulu is dilimleri. Bir cycle ekiplerin bir hafta / iki hafta boyunca odaklandigi seydir.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="h-8 gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Yeni cycle
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-32" />)}</div>
      ) : (cycles?.length ?? 0) === 0 ? (
        <EmptyState
          icon={Clock}
          title="Henuz cycle yok"
          description="Ilk cycle'i olustur, ekip odagini baslat."
          action={{ label: "Ilk cycle'i olustur", onClick: () => setCreateOpen(true) }}
        />
      ) : selectedCycle ? (
        <CycleDetail
          cycle={selectedCycle}
          onBack={() => setSelectedCycleId(null)}
        />
      ) : (
        <div className="space-y-6">
          {(['active', 'planned', 'completed'] as CycleStatus[]).map(s => {
            const list = grouped[s];
            if (list.length === 0) return null;
            const meta = STATUS_META[s];
            return (
              <section key={s}>
                <div className="mb-2 flex items-center gap-2">
                  <meta.icon className={`h-3.5 w-3.5 ${meta.className}`} />
                  <h2 className="text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {meta.label}
                  </h2>
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground/70">{list.length}</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {list.map(c => (
                    <CycleCard
                      key={c.id}
                      cycle={c}
                      isSelected={false}
                      onSelect={() => setSelectedCycleId(c.id)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <CreateCycleDialog open={createOpen} onOpenChange={setCreateOpen} nextNumber={nextNumber} />
    </div>
  );
}
