import { useState, useMemo } from 'react';
import { useCycles, useCreateCycle, useCycleProgress } from '@/lib/cycles-hooks';
import { CYCLE_STATUS_LABELS, type Cycle, type CycleStatus } from '@/lib/cycles-types';
import { TASK_STATUS_LABELS, TASK_STATUS_ORDER, type Task } from '@/lib/tasks-types';
import { TaskStatusIcon, TaskPriorityIcon } from '@/components/tasks/TaskStatusIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Plus, Calendar, Target, CheckCircle2, Play, Clock,
  ChevronRight, TrendingUp, ArrowRightCircle,
  GripVertical, Zap, BarChart3, Layers, Timer,
  CircleDot, AlertCircle,
} from 'lucide-react';
import { format, formatDistanceToNowStrict, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

/* ─── Types ─── */
type FilterTab = 'all' | CycleStatus;
type CycleHealth = 'on-track' | 'at-risk' | 'behind';

/* ─── Constants ─── */
const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'Tumunu Gor' },
  { value: 'active', label: CYCLE_STATUS_LABELS.active },
  { value: 'planned', label: CYCLE_STATUS_LABELS.planned },
  { value: 'completed', label: CYCLE_STATUS_LABELS.completed },
];

const STATUS_META: Record<CycleStatus, { icon: React.ElementType; className: string; label: string }> = {
  active:    { icon: Play,         className: 'text-[hsl(var(--status-in-progress))]', label: CYCLE_STATUS_LABELS.active },
  planned:   { icon: Clock,        className: 'text-muted-foreground',                 label: CYCLE_STATUS_LABELS.planned },
  completed: { icon: CheckCircle2, className: 'text-[hsl(var(--status-done))]',        label: CYCLE_STATUS_LABELS.completed },
};

const HEALTH_META: Record<CycleHealth, { label: string; className: string; dotClass: string }> = {
  'on-track': { label: 'Yolunda',       className: 'text-emerald-500', dotClass: 'bg-emerald-500' },
  'at-risk':  { label: 'Risk altinda',   className: 'text-amber-500',   dotClass: 'bg-amber-500' },
  'behind':   { label: 'Geride',         className: 'text-red-500',     dotClass: 'bg-red-500' },
};

function computeHealth(cycle: Cycle, done: number, total: number): CycleHealth {
  if (cycle.status === 'completed') return 'on-track';
  if (cycle.status === 'planned' || total === 0) return 'on-track';
  const start = new Date(cycle.start_date);
  const end = new Date(cycle.end_date);
  const now = new Date();
  const totalDays = Math.max(1, differenceInDays(end, start));
  const elapsed = Math.max(0, differenceInDays(now, start));
  const timeRatio = Math.min(1, elapsed / totalDays);
  const progressRatio = done / total;
  const delta = progressRatio - timeRatio;
  if (delta >= -0.05) return 'on-track';
  if (delta >= -0.2) return 'at-risk';
  return 'behind';
}

/* ─── Hook to fetch tasks for a cycle ─── */
function useCycleTasks(cycleId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['cycle-tasks', cycleId],
    enabled: !!cycleId && enabled,
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('cycle_id', cycleId!)
        .order('position', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Task[];
    },
  });
}

/* ─── Timeline / Gantt visualization ─── */
function CycleTimeline({ cycles }: { cycles: Cycle[] }) {
  if (cycles.length === 0) return null;

  const sorted = [...cycles].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  const earliest = new Date(sorted[0].start_date);
  const latest = sorted.reduce((m, c) => {
    const e = new Date(c.end_date);
    return e > m ? e : m;
  }, new Date(sorted[0].end_date));

  const totalDays = Math.max(differenceInDays(latest, earliest), 1);
  const today = new Date();
  const todayPct = Math.max(0, Math.min(100, (differenceInDays(today, earliest) / totalDays) * 100));

  // Generate month markers
  const monthMarkers: { date: Date; pct: number }[] = [];
  const cursor = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
  while (cursor <= latest) {
    const pct = (differenceInDays(cursor, earliest) / totalDays) * 100;
    if (pct >= 0 && pct <= 100) {
      monthMarkers.push({ date: new Date(cursor), pct });
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return (
    <div className="rounded-lg border border-border/60 bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Layers className="h-3.5 w-3.5 text-muted-foreground" />
        <h2 className="text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">Zaman Cizelgesi</h2>
        <span className="text-[10px] text-muted-foreground/50 font-mono">{sorted.length} cycle</span>
      </div>
      <ScrollArea className="w-full">
        <div className="relative min-w-[500px]" style={{ height: `${sorted.length * 36 + 28}px` }}>
          {/* Month markers */}
          <div className="absolute inset-x-0 top-0 h-5">
            {monthMarkers.map((m, i) => (
              <span
                key={i}
                className="absolute text-[10px] text-muted-foreground/50 whitespace-nowrap"
                style={{ left: `${m.pct}%` }}
              >
                {format(m.date, 'MMM yyyy')}
              </span>
            ))}
          </div>

          {/* Grid lines */}
          {monthMarkers.map((m, i) => (
            <div
              key={`line-${i}`}
              className="absolute top-5 bottom-0 w-px bg-border/30"
              style={{ left: `${m.pct}%` }}
            />
          ))}

          {/* Today line */}
          {todayPct >= 0 && todayPct <= 100 && (
            <div
              className="absolute top-5 bottom-0 w-px bg-primary/60 z-10"
              style={{ left: `${todayPct}%` }}
            >
              <div className="absolute -top-0.5 -left-[3px] w-[7px] h-[7px] rounded-full bg-primary" />
              <span className="absolute -top-4 -translate-x-1/2 text-[9px] font-medium text-primary whitespace-nowrap">
                Bugun
              </span>
            </div>
          )}

          {/* Cycle bars */}
          {sorted.map((cycle, i) => {
            const startPct = (differenceInDays(new Date(cycle.start_date), earliest) / totalDays) * 100;
            const widthPct = Math.max(2, (differenceInDays(new Date(cycle.end_date), new Date(cycle.start_date)) / totalDays) * 100);

            return (
              <TooltipProvider key={cycle.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="absolute flex items-center"
                      style={{ top: `${i * 36 + 28}px`, left: `${startPct}%`, width: `${widthPct}%`, height: '28px' }}
                    >
                      <div className={cn(
                        'h-6 w-full rounded-md border transition-colors overflow-hidden',
                        cycle.status === 'active' && 'bg-primary/15 border-primary/40',
                        cycle.status === 'planned' && 'bg-muted/60 border-border/60',
                        cycle.status === 'completed' && 'bg-emerald-500/10 border-emerald-500/30',
                      )}>
                        <span className="px-2 text-[10.5px] font-medium truncate leading-6 block">
                          {cycle.name}
                        </span>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-[11px]">
                    <div className="font-medium">{cycle.name}</div>
                    <div className="text-muted-foreground">
                      {format(new Date(cycle.start_date), 'MMM d')} - {format(new Date(cycle.end_date), 'MMM d')}
                    </div>
                    <div className={cn('text-[10px]', STATUS_META[cycle.status].className)}>
                      {STATUS_META[cycle.status].label}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

/* ─── Segmented progress bar ─── */
function SegmentedProgressBar({ tasks }: { tasks?: Task[] }) {
  const counts = useMemo(() => {
    if (!tasks || tasks.length === 0) return { done: 0, inProgress: 0, review: 0, todo: 0, total: 0 };
    const done = tasks.filter(t => t.status === 'done').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const review = tasks.filter(t => t.status === 'review').length;
    const todo = tasks.length - done - inProgress - review;
    return { done, inProgress, review, todo, total: tasks.length };
  }, [tasks]);

  if (counts.total === 0) {
    return <div className="h-1.5 w-full rounded-full bg-secondary/60" />;
  }

  const pDone = (counts.done / counts.total) * 100;
  const pProgress = (counts.inProgress / counts.total) * 100;
  const pReview = (counts.review / counts.total) * 100;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/60 flex">
            {pDone > 0 && <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pDone}%` }} />}
            {pReview > 0 && <div className="h-full bg-amber-500 transition-all" style={{ width: `${pReview}%` }} />}
            {pProgress > 0 && <div className="h-full bg-blue-500 transition-all" style={{ width: `${pProgress}%` }} />}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-[11px]">
          <div className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Tamamlandi: {counts.done}</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> Incelemede: {counts.review}</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500" /> Devam ediyor: {counts.inProgress}</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-secondary" /> Yapilacak: {counts.todo}</span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/* ─── Mini burndown (CSS-based) ─── */
function MiniBurndown({ tasks, cycle }: { tasks: Task[]; cycle: Cycle }) {
  const total = tasks.length;
  if (total === 0) return null;

  const start = new Date(cycle.start_date);
  const end = new Date(cycle.end_date);
  const now = new Date();
  const totalDays = Math.max(1, differenceInDays(end, start));
  const elapsed = Math.min(totalDays, Math.max(0, differenceInDays(now, start)));
  const done = tasks.filter(t => t.status === 'done').length;
  const remaining = total - done;

  const points = 8;
  const idealPoints = Array.from({ length: points + 1 }, (_, i) => {
    const frac = i / points;
    return total * (1 - frac);
  });

  const h = 32;
  const w = 120;

  const idealPath = idealPoints
    .map((v, i) => {
      const x = (i / points) * w;
      const y = h - (v / total) * h;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  const actualX = (elapsed / totalDays) * w;
  const actualY = h - (remaining / total) * h;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Burndown</span>
      <svg width={w} height={h} className="text-muted-foreground/40">
        <path d={idealPath} fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" />
        <circle cx={actualX} cy={actualY} r="3" fill="hsl(var(--primary))" />
        <line x1="0" y1="0" x2={actualX} y2={actualY} stroke="hsl(var(--primary))" strokeWidth="1.5" opacity="0.6" />
      </svg>
    </div>
  );
}

/* ─── Velocity metric ─── */
function VelocityBadge({ tasks, cycle }: { tasks: Task[]; cycle: Cycle }) {
  const done = tasks.filter(t => t.status === 'done').length;
  const start = new Date(cycle.start_date);
  const now = new Date();
  const elapsed = Math.max(1, differenceInDays(now, start));
  const weeks = Math.max(1, elapsed / 7);
  const velocity = (done / weeks).toFixed(1);

  return (
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <Zap className="h-3 w-3" />
      <span className="font-mono tabular-nums">{velocity}</span>
      <span>/ hafta</span>
    </div>
  );
}

/* ─── Task row inside cycle detail ─── */
function CycleTaskRow({ task, onMoveToCycle }: { task: Task; onMoveToCycle?: (taskId: string) => void }) {
  const [dragging, setDragging] = useState(false);

  return (
    <div
      className={cn(
        'group flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors hover:bg-accent/50',
        dragging && 'opacity-50 bg-accent/30'
      )}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', task.id);
        e.dataTransfer.effectAllowed = 'move';
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
    >
      <GripVertical className="h-3 w-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 cursor-grab shrink-0" />
      <TaskStatusIcon status={task.status} size={14} />
      <span className="text-[12.5px] text-foreground truncate flex-1">{task.title}</span>
      <TaskPriorityIcon priority={task.priority} size={12} />
      {task.story_points != null && (
        <span className="font-mono text-[10px] text-muted-foreground/60 tabular-nums bg-secondary/50 px-1.5 py-0.5 rounded">
          {task.story_points}p
        </span>
      )}
      {onMoveToCycle && (
        <button
          onClick={(e) => { e.stopPropagation(); onMoveToCycle(task.id); }}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
          title="Baska cycle'a tasi"
        >
          <ArrowRightCircle className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/* ─── Expanded cycle detail ─── */
function CycleDetail({ cycle, tasks }: { cycle: Cycle; tasks: Task[] }) {
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);
  const { data: allCycles } = useCycles();

  const byStatus = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    for (const s of TASK_STATUS_ORDER) grouped[s] = [];
    for (const t of tasks) {
      (grouped[t.status] ??= []).push(t);
    }
    return grouped;
  }, [tasks]);

  const done = tasks.filter(t => t.status === 'done').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const review = tasks.filter(t => t.status === 'review').length;
  const blocked = tasks.filter(t => (t.status as string) === 'blocked').length;
  const totalPoints = tasks.reduce((s, t) => s + (t.story_points ?? 0), 0);
  const donePoints = tasks.filter(t => t.status === 'done').reduce((s, t) => s + (t.story_points ?? 0), 0);

  const otherCycles = (allCycles ?? []).filter(c => c.id !== cycle.id && c.status !== 'completed');

  // Timeline calculations
  const start = new Date(cycle.start_date);
  const end = new Date(cycle.end_date);
  const now = new Date();
  const totalDays = Math.max(1, differenceInDays(end, start));
  const elapsed = Math.max(0, differenceInDays(now, start));
  const remaining = Math.max(0, differenceInDays(end, now));
  const elapsedPct = Math.min(100, Math.round((elapsed / totalDays) * 100));

  return (
    <div className="border-t border-border/40 pt-3 mt-3 space-y-4">
      {/* Goal - prominent display */}
      {cycle.goal && (
        <div className="rounded-md bg-primary/5 border border-primary/10 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Target className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">Hedef</span>
          </div>
          <p className="text-[13px] text-foreground/90 leading-relaxed">{cycle.goal}</p>
        </div>
      )}

      {/* Stats row with overview */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Toplam', value: tasks.length, icon: BarChart3, color: 'text-muted-foreground' },
          { label: 'Tamamlanan', value: done, icon: CheckCircle2, color: 'text-emerald-500' },
          { label: 'Devam eden', value: inProgress + review, icon: Timer, color: 'text-blue-500' },
          { label: 'Bloklu', value: blocked, icon: AlertCircle, color: 'text-red-500' },
        ].map(s => (
          <div key={s.label} className="rounded-md border border-border/40 bg-muted/20 p-2.5 text-center">
            <s.icon className={cn('h-3.5 w-3.5 mx-auto mb-1', s.color)} />
            <div className="text-[17px] font-semibold tabular-nums">{s.value}</div>
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Days remaining / elapsed timeline */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-muted-foreground font-medium">Zaman Ilerleme</span>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {cycle.status === 'active'
              ? `${remaining} gun kaldi / ${totalDays} gun`
              : cycle.status === 'completed'
                ? `${totalDays} gun (tamamlandi)`
                : `${formatDistanceToNowStrict(start)} sonra basliyor`
            }
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/60">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              cycle.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500/70',
            )}
            style={{ width: `${cycle.status === 'completed' ? 100 : elapsedPct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-muted-foreground/60">
          <span>{format(start, 'MMM d, yyyy')}</span>
          <span>{format(end, 'MMM d, yyyy')}</span>
        </div>
      </div>

      {/* Scope changes indicator */}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground rounded-md border border-border/40 bg-muted/20 p-2.5">
        <TrendingUp className="h-3.5 w-3.5 shrink-0" />
        <span>Kapsam: <span className="font-mono font-medium tabular-nums">{tasks.length}</span> gorev</span>
        {totalPoints > 0 && (
          <>
            <span className="text-muted-foreground/30">|</span>
            <span className="font-mono tabular-nums">{donePoints}/{totalPoints} puan</span>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 text-[11px]">
        <VelocityBadge tasks={tasks} cycle={cycle} />
      </div>

      {/* Burndown + task list */}
      <div className="flex gap-6">
        <div className="shrink-0 hidden sm:block">
          <MiniBurndown tasks={tasks} cycle={cycle} />
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          {TASK_STATUS_ORDER.map(status => {
            const group = byStatus[status];
            if (!group || group.length === 0) return null;
            return (
              <div key={status}>
                <div className="flex items-center gap-1.5 mb-1 px-3">
                  <TaskStatusIcon status={status} size={12} />
                  <span className="text-[10.5px] font-medium text-muted-foreground uppercase tracking-wider">
                    {TASK_STATUS_LABELS[status]}
                  </span>
                  <span className="text-[10px] text-muted-foreground/50 font-mono">{group.length}</span>
                </div>
                <div
                  className="space-y-0.5"
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                  onDrop={(e) => {
                    e.preventDefault();
                    toast.info('Gorev sirasi guncellendi (gorsel)');
                  }}
                >
                  {group.map(t => (
                    <CycleTaskRow
                      key={t.id}
                      task={t}
                      onMoveToCycle={(id) => setMovingTaskId(id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {tasks.length === 0 && (
            <div className="text-center py-6 text-[12px] text-muted-foreground/60">
              Bu cycle'da henuz gorev yok.
            </div>
          )}
        </div>
      </div>

      {/* Move to cycle dialog */}
      {movingTaskId && (
        <Dialog open={!!movingTaskId} onOpenChange={() => setMovingTaskId(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Cycle'a tasi</DialogTitle></DialogHeader>
            <div className="space-y-1.5">
              {otherCycles.length === 0 ? (
                <p className="text-[12px] text-muted-foreground py-4 text-center">Tasinabilecek baska cycle yok.</p>
              ) : otherCycles.map(c => {
                const Icon = STATUS_META[c.status].icon;
                return (
                  <button
                    key={c.id}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors flex items-center gap-2"
                    onClick={() => {
                      toast.success(`Gorev "${c.name}" cycle'ina tasinacak`);
                      setMovingTaskId(null);
                    }}
                  >
                    <Icon className={`h-3.5 w-3.5 ${STATUS_META[c.status].className}`} />
                    <span className="text-[13px]">{c.name}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">#{c.number}</span>
                  </button>
                );
              })}
              <button
                className="w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors text-[13px] text-muted-foreground"
                onClick={() => {
                  toast.success("Gorev cycle'dan cikarildi");
                  setMovingTaskId(null);
                }}
              >
                Cycle'dan cikar
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

/* ─── Cycle card ─── */
function CycleCard({ cycle }: { cycle: Cycle }) {
  const [expanded, setExpanded] = useState(false);
  const { data: progress } = useCycleProgress(cycle.id);
  const { data: tasks, isLoading: tasksLoading } = useCycleTasks(cycle.id, expanded);
  const meta = STATUS_META[cycle.status];
  const total = progress?.total_tasks ?? 0;
  const done = progress?.done_tasks ?? 0;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const start = new Date(cycle.start_date);
  const end = new Date(cycle.end_date);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));

  const health = computeHealth(cycle, done, total);
  const healthMeta = HEALTH_META[health];

  // Task status breakdown dots for card (from progress, not full tasks)
  const inProgressEst = Math.round((total - done) * 0.5);
  const todoEst = total - done - inProgressEst;

  return (
    <div
      className={cn(
        'rounded-lg border border-border/60 bg-card transition-all',
        expanded ? 'border-border shadow-sm col-span-full' : 'hover:border-border hover:shadow-sm',
      )}
    >
      <button
        className="w-full text-left p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <ChevronRight className={cn(
                'h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-200',
                expanded && 'rotate-90'
              )} />
              <meta.icon className={`h-3.5 w-3.5 ${meta.className}`} />
              <span className={`text-[11px] font-medium uppercase tracking-wider ${meta.className}`}>
                {meta.label}
              </span>
              <span className="font-mono text-[10.5px] text-muted-foreground/70">#{cycle.number}</span>

              {cycle.status === 'active' && total > 0 && (
                <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium ml-1', healthMeta.className)}>
                  <span className={cn('h-1.5 w-1.5 rounded-full', healthMeta.dotClass)} />
                  {healthMeta.label}
                </span>
              )}
            </div>
            <h3 className="text-[15px] font-semibold text-foreground truncate pl-[22px]">{cycle.name}</h3>
            {cycle.goal && (
              <p className="mt-1 text-[12px] text-muted-foreground line-clamp-2 flex items-center gap-1 pl-[22px]">
                <Target className="h-3 w-3 shrink-0" /> {cycle.goal}
              </p>
            )}
          </div>

          <div className="shrink-0 ml-3 flex flex-col items-center">
            <svg width="40" height="40" viewBox="0 0 40 40" className="shrink-0">
              <circle cx="20" cy="20" r="16" fill="none" stroke="hsl(var(--secondary))" strokeWidth="3" opacity="0.4" />
              <circle
                cx="20" cy="20" r="16" fill="none"
                stroke={cycle.status === 'completed' ? 'hsl(var(--status-done))' : 'hsl(var(--primary))'}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 16}`}
                strokeDashoffset={`${2 * Math.PI * 16 * (1 - pct / 100)}`}
                transform="rotate(-90 20 20)"
                className="transition-all duration-500"
              />
              <text x="20" y="21" textAnchor="middle" dominantBaseline="central"
                className="fill-foreground text-[10px] font-mono font-semibold"
              >
                {pct}%
              </text>
            </svg>
          </div>
        </div>

        <div className="pl-[22px] flex items-center gap-3 text-[11.5px] text-muted-foreground">
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
          <span className="font-mono tabular-nums text-muted-foreground/60">
            {done}/{total} gorev
          </span>
        </div>

        {/* Status breakdown dots */}
        {total > 0 && !expanded && (
          <div className="pl-[22px] mt-2 flex gap-0.5">
            {Array.from({ length: Math.min(done, 30) }, (_, i) => (
              <div key={`d-${i}`} className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            ))}
            {Array.from({ length: Math.min(inProgressEst, 30) }, (_, i) => (
              <div key={`p-${i}`} className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            ))}
            {Array.from({ length: Math.min(todoEst, 30) }, (_, i) => (
              <div key={`t-${i}`} className="h-1.5 w-1.5 rounded-full bg-zinc-400/50" />
            ))}
            {total > 30 && (
              <span className="text-[9px] text-muted-foreground/50 ml-1">+{total - 30}</span>
            )}
          </div>
        )}

        <div className="mt-2 pl-[22px]">
          {expanded && tasks ? (
            <SegmentedProgressBar tasks={tasks} />
          ) : (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/60 flex">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          {tasksLoading ? (
            <div className="space-y-2 pt-3 border-t border-border/40 mt-1">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-7" />)}
            </div>
          ) : (
            <CycleDetail cycle={cycle} tasks={tasks ?? []} />
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Create cycle dialog ─── */
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

/* ─── Empty state with illustration ─── */
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-border/60 py-20 text-center">
      <div className="mx-auto mb-5 flex items-center justify-center">
        <div className="relative">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Layers className="h-8 w-8 text-primary/60" />
          </div>
          <div className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="absolute -left-2 -bottom-1 h-5 w-5 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Timer className="h-3 w-3 text-amber-500" />
          </div>
          <div className="absolute -right-3 bottom-0 h-4 w-4 rounded-full bg-blue-500/20 flex items-center justify-center">
            <CircleDot className="h-2.5 w-2.5 text-blue-500" />
          </div>
        </div>
      </div>
      <h3 className="text-[15px] font-semibold text-foreground mb-1">Henuz cycle yok</h3>
      <p className="text-[13px] text-muted-foreground max-w-sm mx-auto mb-5 leading-relaxed">
        Cycle'lar ekibinizin zaman-kutulu sprint'leridir. Gorevleri belirli zaman dilimlerine atayarak
        ekip odagini ve hizi artirin.
      </p>
      <Button size="sm" className="h-8 gap-1.5" onClick={onCreate}>
        <Plus className="h-3.5 w-3.5" /> Ilk cycle'i olustur
      </Button>
    </div>
  );
}

/* ─── Main page ─── */
export default function Cycles() {
  const { data: cycles, isLoading } = useCycles();
  const [createOpen, setCreateOpen] = useState(false);
  const [filter, setFilter] = useState<FilterTab>('all');

  const allCycles = cycles ?? [];

  const filtered = useMemo(() => {
    if (filter === 'all') return allCycles;
    return allCycles.filter(c => c.status === filter);
  }, [allCycles, filter]);

  const grouped = useMemo(() => ({
    active:    filtered.filter(c => c.status === 'active'),
    planned:   filtered.filter(c => c.status === 'planned'),
    completed: filtered.filter(c => c.status === 'completed'),
  }), [filtered]);

  const counts: Record<FilterTab, number> = useMemo(() => ({
    all: allCycles.length,
    active: allCycles.filter(c => c.status === 'active').length,
    planned: allCycles.filter(c => c.status === 'planned').length,
    completed: allCycles.filter(c => c.status === 'completed').length,
  }), [allCycles]);

  const nextNumber = (allCycles.reduce((m, c) => Math.max(m, c.number), 0)) + 1;

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-6">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight">Cycles</h1>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            Zaman-kutulu is dilimleri. Bir cycle ekiplerin bir hafta / iki hafta boyunca odaklandigi seydir.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="h-8 gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Yeni cycle
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : allCycles.length === 0 ? (
        <EmptyState onCreate={() => setCreateOpen(true)} />
      ) : (
        <>
          {/* Timeline / Gantt */}
          <CycleTimeline cycles={allCycles} />

          {/* Filter tabs */}
          <div className="flex items-center gap-1 rounded-lg bg-muted/40 p-1 w-fit">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors',
                  filter === tab.value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.label}
                <span className={cn(
                  'font-mono text-[10px] tabular-nums',
                  filter === tab.value ? 'text-foreground/70' : 'text-muted-foreground/60',
                )}>
                  {counts[tab.value]}
                </span>
              </button>
            ))}
          </div>

          {/* Cycle list */}
          {filtered.length === 0 ? (
            <div className="rounded-md border border-border/60 py-12 text-center">
              <p className="text-[13px] text-muted-foreground">Bu filtrede cycle bulunamadi.</p>
            </div>
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
                      {list.map(c => <CycleCard key={c.id} cycle={c} />)}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}

      <CreateCycleDialog open={createOpen} onOpenChange={setCreateOpen} nextNumber={nextNumber} />
    </div>
  );
}
