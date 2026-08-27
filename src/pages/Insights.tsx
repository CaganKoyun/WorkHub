import { useMemo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useActiveCycle } from '@/lib/cycles-hooks';
import { useAllProfiles, useProjects } from '@/lib/projects-hooks';
import { useGoals, useCompanyPulse } from '@/lib/graph-hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { StatCard } from '@/components/StatCard';
import {
  Activity, AlertTriangle, Flame, Target, Users, Download,
  CheckCircle2, Clock, FolderOpen, Bug, TrendingUp, BarChart3,
} from 'lucide-react';

/* ───────── types ───────── */

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

interface BugLite {
  id: string;
  status: string;
  severity: string;
  created_at: string;
  updated_at: string;
  project_id: string | null;
}

type RangeKey = '30' | '60' | '90' | 'custom';

/* ───────── constants ───────── */

const PRIORITY_ORDER = ['urgent', 'high', 'medium', 'low', 'none'] as const;
const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'hsl(var(--priority-urgent))',
  high: 'hsl(var(--priority-high))',
  medium: 'hsl(var(--priority-medium))',
  low: 'hsl(var(--priority-low))',
  none: 'hsl(var(--priority-none))',
};
const GOAL_STATUS_COLOR: Record<string, string> = {
  on_track: 'hsl(var(--success))',
  at_risk: 'hsl(var(--warning))',
  off_track: 'hsl(var(--destructive))',
  draft: 'hsl(var(--muted-foreground))',
  achieved: 'hsl(var(--info))',
  missed: 'hsl(var(--destructive))',
};
const HEATMAP_COLORS = {
  good: 'bg-success/80',
  ok: 'bg-warning/80',
  bad: 'bg-destructive/80',
  neutral: 'bg-muted',
};
const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--info))',
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
];

const TOOLTIP_STYLE = {
  background: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 12,
};
const AXIS_TICK = { fill: 'hsl(var(--muted-foreground))', fontSize: 11 };

/* ───────── helpers ───────── */

function startOfDay(d: Date) { d.setHours(0, 0, 0, 0); return d; }
function isoWeekBucket(d: Date): string {
  const t = new Date(d); t.setHours(0, 0, 0, 0);
  const day = t.getDay() || 7;
  t.setDate(t.getDate() - (day - 1));
  return t.toISOString().slice(0, 10);
}
function fmtBucket(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
}
function weekLabel(d: Date): string {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  const day = s.getDay() || 7;
  s.setDate(s.getDate() - (day - 1));
  return s.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
}

/* ───────── data hooks ───────── */

function useInsights(workspaceId: string | undefined, days: number) {
  return useQuery({
    queryKey: ['insights', workspaceId, days],
    enabled: !!workspaceId,
    queryFn: async (): Promise<TaskLite[]> => {
      const since = new Date(); since.setDate(since.getDate() - days);
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

function useBugInsights(days: number) {
  return useQuery({
    queryKey: ['bug-insights', days],
    queryFn: async (): Promise<BugLite[]> => {
      const since = new Date(); since.setDate(since.getDate() - days);
      const { data, error } = await supabase
        .from('bugs')
        .select('id, status, severity, created_at, updated_at, project_id')
        .gte('created_at', since.toISOString())
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as BugLite[];
    },
  });
}

/* ───────── components ───────── */

function Tile({ title, icon: Icon, children, className = '' }: {
  title: string; icon: React.ElementType; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border bg-card p-5 elevation-1 ${className}`}>
      <div className="mb-4 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      {children}
    </div>
  );
}

function InlineEmpty({ text }: { text: string }) {
  return <p className="py-10 text-center text-[13px] text-muted-foreground">{text}</p>;
}

/* ───────── csv export ───────── */

function buildCsv(
  tasks: TaskLite[],
  bugs: BugLite[],
  pulse: ReturnType<typeof useCompanyPulse>['data'],
) {
  const rows: string[][] = [];
  rows.push(['Metrik', 'Deger']);
  rows.push(['Toplam Task', String(tasks.length)]);
  rows.push(['Tamamlanan Task', String(tasks.filter(t => t.status === 'done').length)]);
  const completed = tasks.filter(t => t.completed_at);
  if (completed.length > 0) {
    const avg = completed.reduce((s, t) => {
      return s + (new Date(t.completed_at!).getTime() - new Date(t.created_at).getTime());
    }, 0) / completed.length / 86_400_000;
    rows.push(['Ort. Tamamlanma Suresi (gun)', avg.toFixed(1)]);
  }
  if (pulse) {
    rows.push(['Aktif Projeler', String(pulse.activeProjects)]);
    rows.push(['Acik Buglar', String(pulse.openBugs)]);
    rows.push(['Kritik Buglar', String(pulse.criticalBugs)]);
  }
  rows.push([]);
  rows.push(['Bug ID', 'Durum', 'Ciddiyet', 'Olusturulma']);
  for (const b of bugs) {
    rows.push([b.id, b.status, b.severity, b.created_at.slice(0, 10)]);
  }
  return rows.map(r => r.join(',')).join('\n');
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ───────── main component ───────── */

export default function Insights() {
  const [rangeKey, setRangeKey] = useState<RangeKey>('90');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const days = rangeKey === 'custom' ? 90 : Number(rangeKey);

  const { currentWorkspace } = useWorkspace();
  const { data: rawTasks, isLoading, isError } = useInsights(currentWorkspace?.id, days);
  const { data: cycle } = useActiveCycle();
  const { data: profiles } = useAllProfiles();
  const { data: projects } = useProjects();
  const { data: goals } = useGoals();
  const { data: pulse } = useCompanyPulse();
  const { data: rawBugs } = useBugInsights(days);

  const tasks = useMemo(() => {
    let r = rawTasks ?? [];
    if (projectFilter !== 'all') r = r.filter(t => t.project_id === projectFilter);
    if (assigneeFilter !== 'all') r = r.filter(t => t.assignee_id === assigneeFilter);
    return r;
  }, [rawTasks, projectFilter, assigneeFilter]);

  const bugs = useMemo(() => {
    let r = rawBugs ?? [];
    if (projectFilter !== 'all') r = r.filter(b => b.project_id === projectFilter);
    return r;
  }, [rawBugs, projectFilter]);

  const nameMap = useMemo(
    () => new Map((profiles ?? []).map(p => [p.user_id, p.full_name ?? 'Kullanıcı'])),
    [profiles],
  );

  const uniqueAssignees = useMemo(() => {
    const ids = new Set((rawTasks ?? []).map(t => t.assignee_id).filter(Boolean) as string[]);
    return Array.from(ids).map(id => ({ id, name: nameMap.get(id) ?? 'Kullanıcı' })).sort((a, b) => a.name.localeCompare(b.name));
  }, [rawTasks, nameMap]);

  /* ── computed data ── */

  const completedTasks = useMemo(() => tasks.filter(t => t.status === 'done'), [tasks]);

  const avgCompletionDays = useMemo(() => {
    const done = completedTasks.filter(t => t.completed_at);
    if (done.length === 0) return null;
    const total = done.reduce((s, t) => {
      return s + (new Date(t.completed_at!).getTime() - new Date(t.created_at).getTime());
    }, 0);
    return (total / done.length / 86_400_000).toFixed(1);
  }, [completedTasks]);

  const throughput = useMemo(() => {
    if (!tasks) return [];
    const weeks = Math.min(Math.ceil(days / 7), 12);
    const buckets = new Map<string, number>();
    const now = new Date(); startOfDay(now);
    for (let i = weeks; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i * 7);
      buckets.set(isoWeekBucket(d), 0);
    }
    for (const t of tasks) {
      if (!t.completed_at) continue;
      const b = isoWeekBucket(new Date(t.completed_at));
      if (buckets.has(b)) buckets.set(b, (buckets.get(b) ?? 0) + 1);
    }
    return [...buckets.entries()].map(([week, count]) => ({ week: fmtBucket(week), count }));
  }, [tasks, days]);

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

  const burndown = useMemo(() => {
    if (!tasks || !cycle) return [];
    const start = new Date(cycle.start_date); startOfDay(start);
    const end = new Date(cycle.end_date); startOfDay(end);
    const today = startOfDay(new Date());
    const inCycle = tasks.filter(t => t.cycle_id === cycle.id);
    const total = inCycle.length;
    if (total === 0) return [];
    const numDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));
    const out: { day: string; ideal: number; remaining: number | null }[] = [];
    for (let i = 0; i <= numDays; i++) {
      const d = new Date(start); d.setDate(d.getDate() + i);
      const ideal = Math.max(0, Math.round(total - (total * i) / numDays));
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

  // Bug trend (opened vs closed per week)
  const bugTrend = useMemo(() => {
    if (!bugs) return [];
    const weeks = Math.min(Math.ceil(days / 7), 12);
    const now = new Date(); startOfDay(now);
    const bucketKeys: string[] = [];
    for (let i = weeks; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i * 7);
      bucketKeys.push(isoWeekBucket(d));
    }
    const opened = new Map<string, number>(bucketKeys.map(k => [k, 0]));
    const closed = new Map<string, number>(bucketKeys.map(k => [k, 0]));
    for (const b of bugs) {
      const ob = isoWeekBucket(new Date(b.created_at));
      if (opened.has(ob)) opened.set(ob, (opened.get(ob) ?? 0) + 1);
      if (b.status === 'closed' || b.status === 'resolved') {
        const cb = isoWeekBucket(new Date(b.updated_at));
        if (closed.has(cb)) closed.set(cb, (closed.get(cb) ?? 0) + 1);
      }
    }
    return bucketKeys.map(k => ({
      week: fmtBucket(k),
      opened: opened.get(k) ?? 0,
      closed: closed.get(k) ?? 0,
    }));
  }, [bugs, days]);

  // Goal progress
  const goalProgress = useMemo(() => {
    if (!goals) return [];
    return goals
      .filter(g => g.status !== 'archived' && g.status !== 'missed')
      .slice(0, 10)
      .map(g => ({
        title: g.title.length > 30 ? g.title.slice(0, 28) + '...' : g.title,
        progress: g.progress ?? 0,
        status: g.status,
        color: GOAL_STATUS_COLOR[g.status] ?? 'hsl(var(--muted-foreground))',
      }));
  }, [goals]);

  // Team velocity (completed per week per assignee, top 5)
  const teamVelocity = useMemo(() => {
    if (!tasks) return { data: [] as Record<string, string | number>[], assignees: [] as string[] };
    const weeks = Math.min(Math.ceil(days / 7), 8);
    const now = new Date(); startOfDay(now);
    const bucketKeys: string[] = [];
    for (let i = weeks; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i * 7);
      bucketKeys.push(isoWeekBucket(d));
    }
    const byId = new Map((profiles ?? []).map(p => [p.user_id, p.full_name || 'Isimsiz']));
    // count completed per assignee per week
    const counts = new Map<string, Map<string, number>>();
    for (const t of tasks) {
      if (!t.completed_at || !t.assignee_id) continue;
      const wb = isoWeekBucket(new Date(t.completed_at));
      if (!counts.has(t.assignee_id)) counts.set(t.assignee_id, new Map());
      const am = counts.get(t.assignee_id)!;
      am.set(wb, (am.get(wb) ?? 0) + 1);
    }
    // pick top 5 by total
    const totals = [...counts.entries()]
      .map(([id, m]) => ({ id, total: [...m.values()].reduce((a, b) => a + b, 0) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
    const assignees = totals.map(t => byId.get(t.id) ?? 'Bilinmiyor');
    const data = bucketKeys.map(k => {
      const row: Record<string, string | number> = { week: fmtBucket(k) };
      for (const t of totals) {
        const name = byId.get(t.id) ?? 'Bilinmiyor';
        row[name] = counts.get(t.id)?.get(k) ?? 0;
      }
      return row;
    });
    return { data, assignees };
  }, [tasks, profiles, days]);

  // Project health heatmap
  const projectHealth = useMemo(() => {
    if (!tasks || !projects || !bugs) return [];
    const activeProjects = projects.filter(p => !p.is_archived && p.status === 'active').slice(0, 8);
    return activeProjects.map(proj => {
      const pTasks = tasks.filter(t => t.project_id === proj.id);
      const total = pTasks.length;
      const done = pTasks.filter(t => t.status === 'done').length;
      const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
      const overdue = pTasks.filter(t => t.status !== 'done' && t.status !== 'canceled').length;
      const overdueRate = total > 0 ? Math.round((overdue / total) * 100) : 0;
      const bugCount = bugs.filter(b => b.project_id === proj.id && b.status !== 'closed').length;
      return {
        name: proj.name.length > 20 ? proj.name.slice(0, 18) + '...' : proj.name,
        completionRate,
        overdueRate,
        bugCount,
      };
    });
  }, [tasks, projects, bugs]);

  // Department / assignee comparison
  const departmentComparison = useMemo(() => {
    if (!tasks) return [];
    const byId = new Map((profiles ?? []).map(p => [p.user_id, p.full_name || 'Isimsiz']));
    const map = new Map<string, { total: number; done: number }>();
    for (const t of tasks) {
      const name = t.assignee_id ? (byId.get(t.assignee_id) ?? 'Bilinmiyor') : 'Atanmadi';
      if (!map.has(name)) map.set(name, { total: 0, done: 0 });
      const e = map.get(name)!;
      e.total++;
      if (t.status === 'done') e.done++;
    }
    return [...map.entries()]
      .map(([name, v]) => ({ name, total: v.total, done: v.done, open: v.total - v.done }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [tasks, profiles]);

  const handleExport = useCallback(() => {
    if (!tasks || !bugs) return;
    const csv = buildCsv(tasks, bugs, pulse);
    downloadCsv(csv, `workhub-insights-${new Date().toISOString().slice(0, 10)}.csv`);
  }, [tasks, bugs, pulse]);

  /* ── loading / error states ── */

  if (isLoading || (!isError && !rawTasks)) {
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

  if (isError) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center space-y-3">
          <AlertTriangle className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium">İçgörüler yüklenemedi</p>
          <p className="text-xs text-muted-foreground">Lütfen sayfayı yenileyin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* ── header row ── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">İçgörüler</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Son {days} gundeki is akisi sagligi ve yonetici ozeti.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="Proje" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm projeler</SelectItem>
              {(projects ?? []).map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="Kişi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm kişiler</SelectItem>
              {uniqueAssignees.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={rangeKey} onValueChange={(v) => setRangeKey(v as RangeKey)}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Son 30 gün</SelectItem>
              <SelectItem value="60">Son 60 gün</SelectItem>
              <SelectItem value="90">Son 90 gün</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>
          <span className="rounded-full border border-border bg-secondary px-2.5 py-1 font-mono text-[11px] tabular-nums text-muted-foreground">
            {tasks.length} görev
          </span>
        </div>
      </div>

      {/* ── stat cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tamamlanan Görev"
          value={completedTasks.length}
          subtitle={`Toplam ${tasks.length} görev`}
          icon={CheckCircle2}
        />
        <StatCard
          title="Ort. Tamamlanma"
          value={avgCompletionDays ? `${avgCompletionDays} gun` : '-'}
          subtitle="Olusturmadan tamamlanmaya"
          icon={Clock}
        />
        <StatCard
          title="Aktif Projeler"
          value={pulse?.activeProjects ?? '-'}
          subtitle={`Toplam ${pulse?.totalProjects ?? '-'} proje`}
          icon={FolderOpen}
        />
        <StatCard
          title="Acik Buglar"
          value={pulse?.openBugs ?? '-'}
          subtitle={`${pulse?.criticalBugs ?? 0} kritik`}
          icon={Bug}
        />
      </div>

      {/* ── chart grid ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* 1. Weekly throughput */}
        <Tile title={`Haftalık iş tamamlama (${throughput.length} hafta)`} icon={Activity}>
          {throughput.length === 0 ? (
            <InlineEmpty text="Yeterli veri yok." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={throughput}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="week" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={28} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Tamamlanan" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Tile>

        {/* 2. Priority mix */}
        <Tile title="Acik is -- oncelik dagilimi" icon={Flame}>
          {priorityMix.length === 0 ? (
            <InlineEmpty text="Acik is yok." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={priorityMix} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {priorityMix.map((e) => <Cell key={e.name} fill={e.color} />)}
                </Pie>
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Tile>

        {/* 3. Burndown */}
        <Tile title={cycle ? `Aktif sprint yakması — ${cycle.name}` : 'Aktif sprint yakması'} icon={Target}>
          {burndown.length === 0 ? (
            <InlineEmpty text={cycle ? 'Bu sprint için görev yok.' : 'Aktif sprint bulunmuyor.'} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={burndown}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={28} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="ideal" stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" dot={false} name="Ideal" />
                <Line type="monotone" dataKey="remaining" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Kalan" connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Tile>

        {/* 4. Workload by assignee */}
        <Tile title="Yuk -- atanan basina acik is" icon={Users}>
          {workload.length === 0 ? (
            <InlineEmpty text="Acik is yok." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={workload} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid horizontal={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} width={110} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Acik" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Tile>

        {/* 5. Bug trend */}
        <Tile title="Bug trendi — açılan ve kapanan" icon={Bug}>
          {bugTrend.length === 0 ? (
            <InlineEmpty text="Bug verisi yok." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={bugTrend}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="week" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={28} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="opened" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} name="Acilan" />
                <Line type="monotone" dataKey="closed" stroke="hsl(var(--success))" strokeWidth={2} dot={false} name="Kapanan" />
                <Legend iconType="line" wrapperStyle={{ fontSize: 11 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Tile>

        {/* 6. Goal progress */}
        <Tile title="Hedef ilerleme durumu" icon={Target}>
          {goalProgress.length === 0 ? (
            <InlineEmpty text="Aktif hedef yok." />
          ) : (
            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
              {goalProgress.map((g) => (
                <div key={g.title}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-medium truncate max-w-[70%]">{g.title}</span>
                    <span className="text-[11px] font-mono tabular-nums text-muted-foreground">{g.progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(g.progress, 100)}%`, backgroundColor: g.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Tile>

        {/* 7. Team velocity */}
        <Tile title="Takim hizi -- haftalik tamamlanan" icon={TrendingUp} className="lg:col-span-2">
          {teamVelocity.data.length === 0 || teamVelocity.assignees.length === 0 ? (
            <InlineEmpty text="Yeterli veri yok." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={teamVelocity.data}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="week" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={28} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                {teamVelocity.assignees.map((name, i) => (
                  <Bar key={name} dataKey={name} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[2, 2, 0, 0]} stackId="velocity" />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </Tile>

        {/* 8. Department workload comparison */}
        <Tile title="Atanan bazinda is karsilastirmasi" icon={BarChart3}>
          {departmentComparison.length === 0 ? (
            <InlineEmpty text="Veri yok." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={departmentComparison} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid horizontal={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} width={110} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend iconType="square" wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="done" fill="hsl(var(--success))" radius={[0, 2, 2, 0]} stackId="dept" name="Tamamlanan" />
                <Bar dataKey="open" fill="hsl(var(--primary))" radius={[0, 2, 2, 0]} stackId="dept" name="Acik" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Tile>

        {/* 9. Project health heatmap */}
        <Tile title="Proje sagligi haritasi" icon={Activity}>
          {projectHealth.length === 0 ? (
            <InlineEmpty text="Aktif proje yok." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="text-left font-semibold py-1.5 pr-3">Proje</th>
                    <th className="text-center font-semibold py-1.5 px-2">Tamamlanma %</th>
                    <th className="text-center font-semibold py-1.5 px-2">Acik %</th>
                    <th className="text-center font-semibold py-1.5 px-2">Bug</th>
                  </tr>
                </thead>
                <tbody>
                  {projectHealth.map((p) => (
                    <tr key={p.name} className="border-t border-border/50">
                      <td className="py-2 pr-3 font-medium">{p.name}</td>
                      <td className="py-2 px-2 text-center">
                        <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-mono text-white ${
                          p.completionRate >= 70 ? HEATMAP_COLORS.good :
                          p.completionRate >= 40 ? HEATMAP_COLORS.ok : HEATMAP_COLORS.bad
                        }`}>
                          {p.completionRate}%
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-mono text-white ${
                          p.overdueRate <= 20 ? HEATMAP_COLORS.good :
                          p.overdueRate <= 50 ? HEATMAP_COLORS.ok : HEATMAP_COLORS.bad
                        }`}>
                          {p.overdueRate}%
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-mono text-white ${
                          p.bugCount === 0 ? HEATMAP_COLORS.good :
                          p.bugCount <= 3 ? HEATMAP_COLORS.ok : HEATMAP_COLORS.bad
                        }`}>
                          {p.bugCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Tile>
      </div>
    </div>
  );
}
