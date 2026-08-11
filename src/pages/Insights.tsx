import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useActiveCycle } from '@/lib/cycles-hooks';
import { useAllProfiles } from '@/lib/projects-hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area,
} from 'recharts';
import {
  Activity, Flame, Target, Users, TrendingUp, BarChart3,
  CheckCircle2, Clock, AlertTriangle, Layers, FolderKanban, CalendarDays,
} from 'lucide-react';

interface TaskLite {
  id: string;
  status: string;
  priority: string | null;
  assignee_id: string | null;
  created_at: string;
  completed_at: string | null;
  cycle_id: string | null;
  project_id: string | null;
}

const PRIORITY_ORDER = ['urgent', 'high', 'medium', 'low', 'none'] as const;
const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'hsl(var(--priority-urgent))',
  high: 'hsl(var(--priority-high))',
  medium: 'hsl(var(--priority-medium))',
  low: 'hsl(var(--priority-low))',
  none: 'hsl(var(--priority-none))',
};

const STATUS_COLORS: Record<string, string> = {
  backlog: '#94a3b8',
  todo: '#60a5fa',
  in_progress: '#f59e0b',
  in_review: '#a78bfa',
  done: '#22c55e',
  canceled: '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'Yapilacak',
  in_progress: 'Devam Ediyor',
  in_review: 'Incelemede',
  done: 'Tamamlandi',
  canceled: 'Iptal',
};

const RANGE_OPTIONS = [
  { label: '30 Gun', days: 30 },
  { label: '60 Gun', days: 60 },
  { label: '90 Gun', days: 90 },
] as const;

function startOfDay(d: Date) { d.setHours(0, 0, 0, 0); return d; }
function isoWeekBucket(d: Date): string {
  const t = new Date(d); t.setHours(0, 0, 0, 0);
  const day = t.getDay() || 7;
  t.setDate(t.getDate() - (day - 1));
  return t.toISOString().slice(0, 10);
}
function isoDayBucket(d: Date): string {
  return new Date(d).toISOString().slice(0, 10);
}
function fmtBucket(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
}
function daysBetween(a: Date, b: Date): number {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86_400_000));
}

function useInsights(workspaceId: string | undefined, rangeDays: number) {
  return useQuery({
    queryKey: ['insights', workspaceId, rangeDays],
    enabled: !!workspaceId,
    queryFn: async (): Promise<TaskLite[]> => {
      const since = new Date(); since.setDate(since.getDate() - rangeDays);
      const { data, error } = await supabase
        .from('tasks')
        .select('id, status, priority, assignee_id, created_at, completed_at, cycle_id, project_id')
        .eq('workspace_id', workspaceId!)
        .gte('created_at', since.toISOString())
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as TaskLite[];
    },
  });
}

const tooltipStyle = {
  background: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 12,
};
const axisTick = { fill: 'hsl(var(--muted-foreground))', fontSize: 11 };

function Tile({ title, icon: Icon, children, className = '' }: {
  title: string; icon: React.ElementType; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border bg-card p-5 shadow-sm ${className}`}>
      <div className="mb-4 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      {children}
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, sub }: {
  label: string; value: string | number; icon: React.ElementType; sub?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-xl font-bold tabular-nums">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="py-10 text-center text-[13px] text-muted-foreground">{text}</p>;
}

export default function Insights() {
  const { currentWorkspace } = useWorkspace();
  const [rangeDays, setRangeDays] = useState<number>(90);
  const { data: tasks, isLoading } = useInsights(currentWorkspace?.id, rangeDays);
  const { data: cycle } = useActiveCycle();
  const { data: profiles } = useAllProfiles();

  // --- KPI metrics ---
  const kpis = useMemo(() => {
    if (!tasks) return null;
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'done');
    const completionRate = total > 0 ? Math.round((done.length / total) * 100) : 0;
    const cycleTimes = done
      .filter(t => t.completed_at)
      .map(t => daysBetween(new Date(t.created_at), new Date(t.completed_at!)));
    const avgCycleTime = cycleTimes.length > 0
      ? (cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length).toFixed(1)
      : '-';
    const now = new Date();
    const overdue = tasks.filter(t =>
      t.status !== 'done' && t.status !== 'canceled' &&
      daysBetween(new Date(t.created_at), now) > 14
    );
    const openTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'canceled');
    const overdueRate = openTasks.length > 0 ? Math.round((overdue.length / openTasks.length) * 100) : 0;
    return { total, completionRate, avgCycleTime, overdueRate };
  }, [tasks]);

  // --- Throughput (existing) ---
  const throughput = useMemo(() => {
    if (!tasks) return [];
    const buckets = new Map<string, number>();
    const now = new Date(); startOfDay(now);
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i * 7);
      buckets.set(isoWeekBucket(d), 0);
    }
    for (const t of tasks) {
      if (!t.completed_at) continue;
      const b = isoWeekBucket(new Date(t.completed_at));
      if (buckets.has(b)) buckets.set(b, (buckets.get(b) ?? 0) + 1);
    }
    return [...buckets.entries()].map(([week, count]) => ({ week: fmtBucket(week), count }));
  }, [tasks]);

  // --- Priority mix (existing) ---
  const priorityMix = useMemo(() => {
    if (!tasks) return [];
    const open = tasks.filter(t => t.status !== 'done' && t.status !== 'canceled');
    const counts: Record<string, number> = {};
    for (const t of open) {
      const p = t.priority ?? 'none';
      counts[p] = (counts[p] ?? 0) + 1;
    }
    return PRIORITY_ORDER
      .filter(p => counts[p])
      .map(p => ({ name: p, value: counts[p], color: PRIORITY_COLOR[p] }));
  }, [tasks]);

  // --- Burndown (existing) ---
  const burndown = useMemo(() => {
    if (!tasks || !cycle) return [];
    const start = new Date(cycle.start_date); startOfDay(start);
    const end = new Date(cycle.end_date); startOfDay(end);
    const today = startOfDay(new Date());
    const inCycle = tasks.filter(t => t.cycle_id === cycle.id);
    const total = inCycle.length;
    if (total === 0) return [];
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));
    const out: { day: string; ideal: number; remaining: number | null }[] = [];
    for (let i = 0; i <= days; i++) {
      const d = new Date(start); d.setDate(d.getDate() + i);
      const ideal = Math.max(0, Math.round(total - (total * i) / days));
      const isFuture = d.getTime() > today.getTime();
      const remaining = isFuture
        ? null
        : inCycle.filter(t => !t.completed_at || new Date(t.completed_at).getTime() > d.getTime()).length;
      out.push({
        day: d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }),
        ideal,
        remaining,
      });
    }
    return out;
  }, [tasks, cycle]);

  // --- Workload (existing) ---
  const workload = useMemo(() => {
    if (!tasks) return [];
    const open = tasks.filter(t => t.status !== 'done' && t.status !== 'canceled');
    const counts = new Map<string | null, number>();
    for (const t of open) counts.set(t.assignee_id, (counts.get(t.assignee_id) ?? 0) + 1);
    const byId = new Map((profiles ?? []).map(p => [p.user_id, p.full_name || 'Isimsiz']));
    return [...counts.entries()]
      .map(([id, count]) => ({
        name: id ? (byId.get(id) ?? 'Bilinmiyor') : 'Atanmadi',
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [tasks, profiles]);

  // --- Status distribution over weeks ---
  const statusDistribution = useMemo(() => {
    if (!tasks) return [];
    const weekMap = new Map<string, Record<string, number>>();
    const allStatuses = new Set<string>();
    for (const t of tasks) {
      const w = isoWeekBucket(new Date(t.created_at));
      allStatuses.add(t.status);
      if (!weekMap.has(w)) weekMap.set(w, {});
      const bucket = weekMap.get(w)!;
      bucket[t.status] = (bucket[t.status] ?? 0) + 1;
    }
    return [...weekMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, counts]) => ({ week: fmtBucket(week), ...counts }));
  }, [tasks]);

  const allStatuses = useMemo(() => {
    if (!tasks) return [];
    return [...new Set(tasks.map(t => t.status))];
  }, [tasks]);

  // --- Completion trend (cumulative) ---
  const completionTrend = useMemo(() => {
    if (!tasks) return [];
    const dayMap = new Map<string, { created: number; completed: number }>();
    for (const t of tasks) {
      const cd = isoDayBucket(new Date(t.created_at));
      if (!dayMap.has(cd)) dayMap.set(cd, { created: 0, completed: 0 });
      dayMap.get(cd)!.created++;
      if (t.completed_at) {
        const dd = isoDayBucket(new Date(t.completed_at));
        if (!dayMap.has(dd)) dayMap.set(dd, { created: 0, completed: 0 });
        dayMap.get(dd)!.completed++;
      }
    }
    const sorted = [...dayMap.entries()].sort(([a], [b]) => a.localeCompare(b));
    let cumCreated = 0, cumCompleted = 0;
    return sorted.map(([day, v]) => {
      cumCreated += v.created;
      cumCompleted += v.completed;
      return { day: fmtBucket(day), Olusturulan: cumCreated, Tamamlanan: cumCompleted };
    });
  }, [tasks]);

  // --- Priority x Status matrix ---
  const matrix = useMemo(() => {
    if (!tasks) return { rows: [], statuses: [] };
    const statuses = [...new Set(tasks.map(t => t.status))];
    const rows = PRIORITY_ORDER.map(p => {
      const row: Record<string, number | string> = { priority: p };
      let total = 0;
      for (const s of statuses) {
        const count = tasks.filter(t => (t.priority ?? 'none') === p && t.status === s).length;
        row[s] = count;
        total += count;
      }
      row._total = total;
      return row;
    }).filter(r => (r._total as number) > 0);
    return { rows, statuses };
  }, [tasks]);

  // --- Project performance ---
  const projectPerformance = useMemo(() => {
    if (!tasks) return [];
    const groups = new Map<string | null, { total: number; done: number }>();
    for (const t of tasks) {
      const pid = t.project_id;
      if (!groups.has(pid)) groups.set(pid, { total: 0, done: 0 });
      const g = groups.get(pid)!;
      g.total++;
      if (t.status === 'done') g.done++;
    }
    return [...groups.entries()]
      .map(([pid, g]) => ({
        name: pid ? pid.slice(0, 8) : 'Projesi yok',
        rate: g.total > 0 ? Math.round((g.done / g.total) * 100) : 0,
        total: g.total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [tasks]);

  // --- Daily activity sparkline ---
  const dailyActivity = useMemo(() => {
    if (!tasks) return [];
    const now = new Date();
    const dayMap = new Map<string, { created: number; completed: number }>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      dayMap.set(isoDayBucket(d), { created: 0, completed: 0 });
    }
    for (const t of tasks) {
      const cd = isoDayBucket(new Date(t.created_at));
      if (dayMap.has(cd)) dayMap.get(cd)!.created++;
      if (t.completed_at) {
        const dd = isoDayBucket(new Date(t.completed_at));
        if (dayMap.has(dd)) dayMap.get(dd)!.completed++;
      }
    }
    return [...dayMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, v]) => ({ day: fmtBucket(day), Olusturulan: v.created, Tamamlanan: v.completed }));
  }, [tasks]);

  if (isLoading || !tasks) {
    return (
      <div className="p-6">
        <Skeleton className="h-8 w-40" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Insights</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Son {rangeDays} gundeki is akisi sagligi -- performans, dagitim ve trendler.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {RANGE_OPTIONS.map(opt => (
            <Button
              key={opt.days}
              variant={rangeDays === opt.days ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRangeDays(opt.days)}
              className="text-xs"
            >
              {opt.label}
            </Button>
          ))}
          <span className="ml-2 rounded-full border border-border bg-secondary px-2.5 py-1 font-mono text-[11px] tabular-nums text-muted-foreground">
            {tasks.length} gorev
          </span>
        </div>
      </div>

      {/* KPI Row */}
      {kpis && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Toplam Gorev" value={kpis.total} icon={Layers} sub={`Son ${rangeDays} gun`} />
          <KpiCard label="Tamamlanma Orani" value={`%${kpis.completionRate}`} icon={CheckCircle2} />
          <KpiCard label="Ort. Cycle Suresi" value={`${kpis.avgCycleTime}`} icon={Clock} sub="gun" />
          <KpiCard label="Gecikme Orani" value={`%${kpis.overdueRate}`} icon={AlertTriangle} sub="14+ gun acik" />
        </div>
      )}

      {/* Charts grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* 1. Weekly throughput */}
        <Tile title="Haftalik Throughput (8 hafta)" icon={Activity}>
          {throughput.length === 0 ? <EmptyState text="Yeterli veri yok." /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={throughput}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="week" tick={axisTick} tickLine={false} axisLine={false} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={28} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Tamamlanan" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Tile>

        {/* 2. Priority mix donut */}
        <Tile title="Acik Is -- Oncelik Dagilimi" icon={Flame}>
          {priorityMix.length === 0 ? <EmptyState text="Acik is yok." /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={priorityMix} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {priorityMix.map((e) => <Cell key={e.name} fill={e.color} />)}
                </Pie>
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Tile>

        {/* 3. Status distribution stacked bar */}
        <Tile title="Durum Dagilimi (Haftalik)" icon={BarChart3}>
          {statusDistribution.length === 0 ? <EmptyState text="Veri yok." /> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={statusDistribution}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="week" tick={axisTick} tickLine={false} axisLine={false} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={28} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {allStatuses.map(s => (
                  <Bar
                    key={s}
                    dataKey={s}
                    stackId="status"
                    fill={STATUS_COLORS[s] ?? '#64748b'}
                    name={STATUS_LABELS[s] ?? s}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </Tile>

        {/* 4. Completion trend area */}
        <Tile title="Tamamlanma Trendi (Kumulatif)" icon={TrendingUp}>
          {completionTrend.length === 0 ? <EmptyState text="Veri yok." /> : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={completionTrend}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={axisTick} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={36} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="Olusturulan" stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.15} strokeWidth={2} name="Olusturulan" />
                <Area type="monotone" dataKey="Tamamlanan" stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} strokeWidth={2} name="Tamamlanan" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Tile>

        {/* 5. Burndown */}
        <Tile title={cycle ? `Aktif Cycle Burndown -- ${cycle.name}` : 'Aktif Cycle Burndown'} icon={Target}>
          {burndown.length === 0 ? (
            <EmptyState text={cycle ? 'Bu cycle icin gorev yok.' : 'Aktif cycle bulunmuyor.'} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={burndown}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={axisTick} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={28} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="ideal" stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" dot={false} name="Ideal" />
                <Line type="monotone" dataKey="remaining" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Kalan" connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Tile>

        {/* 6. Workload per assignee */}
        <Tile title="Yuk -- Atanan Basina Acik Is" icon={Users}>
          {workload.length === 0 ? <EmptyState text="Acik is yok." /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={workload} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid horizontal={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis type="number" tick={axisTick} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={axisTick} tickLine={false} axisLine={false} width={110} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Acik Gorev" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Tile>

        {/* 7. Project performance */}
        <Tile title="Proje Bazli Performans" icon={FolderKanban}>
          {projectPerformance.length === 0 ? <EmptyState text="Proje verisi yok." /> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={projectPerformance} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid horizontal={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} tick={axisTick} tickLine={false} axisLine={false} unit="%" />
                <YAxis type="category" dataKey="name" tick={axisTick} tickLine={false} axisLine={false} width={90} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `%${v}`} />
                <Bar dataKey="rate" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Tamamlanma %" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Tile>

        {/* 8. Daily activity sparkline */}
        <Tile title="Gunluk Aktivite (Son 30 Gun)" icon={CalendarDays}>
          {dailyActivity.length === 0 ? <EmptyState text="Veri yok." /> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dailyActivity} barGap={0}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={axisTick} tickLine={false} axisLine={false} interval={4} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={20} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Olusturulan" fill="#60a5fa" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Tamamlanan" fill="#22c55e" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Tile>
      </div>

      {/* Priority x Status Matrix -- full width */}
      <div className="mt-4">
        <Tile title="Oncelik x Durum Matrisi" icon={Layers} className="overflow-x-auto">
          {matrix.rows.length === 0 ? <EmptyState text="Veri yok." /> : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Oncelik</th>
                  {matrix.statuses.map(s => (
                    <th key={s} className="px-3 py-2 text-center font-semibold text-muted-foreground">
                      {STATUS_LABELS[s] ?? s}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-center font-semibold text-muted-foreground">Toplam</th>
                </tr>
              </thead>
              <tbody>
                {matrix.rows.map((row) => (
                  <tr key={row.priority as string} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium capitalize">{row.priority as string}</td>
                    {matrix.statuses.map(s => {
                      const val = (row[s] as number) || 0;
                      const intensity = Math.min(val / 10, 1);
                      return (
                        <td
                          key={s}
                          className="px-3 py-2 text-center tabular-nums"
                          style={{
                            backgroundColor: val > 0
                              ? `rgba(99, 102, 241, ${0.08 + intensity * 0.3})`
                              : undefined,
                          }}
                        >
                          {val || '-'}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center font-semibold tabular-nums">{row._total as number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Tile>
      </div>
    </div>
  );
}
