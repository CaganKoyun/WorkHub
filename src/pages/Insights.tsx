import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useActiveCycle } from '@/lib/cycles-hooks';
import { useAllProfiles } from '@/lib/projects-hooks';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { Activity, Flame, Target, Users } from 'lucide-react';

interface TaskLite {
  id: string;
  status: string;
  priority: string | null;
  assignee_id: string | null;
  created_at: string;
  completed_at: string | null;
  cycle_id: string | null;
}

const PRIORITY_ORDER = ['urgent', 'high', 'medium', 'low', 'none'] as const;
const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'hsl(var(--priority-urgent))',
  high: 'hsl(var(--priority-high))',
  medium: 'hsl(var(--priority-medium))',
  low: 'hsl(var(--priority-low))',
  none: 'hsl(var(--priority-none))',
};

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

function useInsights(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['insights', workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<TaskLite[]> => {
      const since = new Date(); since.setDate(since.getDate() - 90);
      const { data, error } = await supabase
        .from('tasks')
        .select('id, status, priority, assignee_id, created_at, completed_at, cycle_id')
        .eq('workspace_id', workspaceId!)
        .gte('created_at', since.toISOString())
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as TaskLite[];
    },
  });
}

function Tile({ title, icon: Icon, children }: {
  title: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 elevation-1">
      <div className="mb-4 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      {children}
    </div>
  );
}

export default function Insights() {
  const { currentWorkspace } = useWorkspace();
  const { data: tasks, isLoading } = useInsights(currentWorkspace?.id);
  const { data: cycle } = useActiveCycle();
  const { data: profiles } = useAllProfiles();

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

  const workload = useMemo(() => {
    if (!tasks) return [];
    const open = tasks.filter(t => t.status !== 'done' && t.status !== 'canceled');
    const counts = new Map<string | null, number>();
    for (const t of open) counts.set(t.assignee_id, (counts.get(t.assignee_id) ?? 0) + 1);
    const byId = new Map((profiles ?? []).map(p => [p.user_id, p.full_name || 'İsimsiz']));
    return [...counts.entries()]
      .map(([id, count]) => ({
        name: id ? (byId.get(id) ?? 'Bilinmiyor') : 'Atanmadı',
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [tasks, profiles]);

  if (isLoading || !tasks) {
    return (
      <div className="p-6">
        <Skeleton className="h-8 w-40" />
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Insights</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Son 90 gündeki iş akışı sağlığı — throughput, öncelik dağılımı, aktif cycle ve yük.
          </p>
        </div>
        <span className="rounded-full border border-border bg-secondary px-2.5 py-1 font-mono text-[11px] tabular-nums text-muted-foreground">
          {tasks.length} task
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Tile title="Haftalık throughput (8 hafta)" icon={Activity}>
          {throughput.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-muted-foreground">Yeterli veri yok.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={throughput}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="week" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
                <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Tile>

        <Tile title="Açık iş — öncelik dağılımı" icon={Flame}>
          {priorityMix.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-muted-foreground">Açık iş yok.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={priorityMix} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {priorityMix.map((e) => <Cell key={e.name} fill={e.color} />)}
                </Pie>
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Tile>

        <Tile title={cycle ? `Aktif cycle burndown — ${cycle.name}` : 'Aktif cycle burndown'} icon={Target}>
          {burndown.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-muted-foreground">
              {cycle ? 'Bu cycle için task yok.' : 'Aktif cycle bulunmuyor.'}
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={burndown}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
                <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="ideal" stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" dot={false} name="Ideal" />
                <Line type="monotone" dataKey="remaining" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Kalan" connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Tile>

        <Tile title="Yük — atanan başına açık iş" icon={Users}>
          {workload.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-muted-foreground">Açık iş yok.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={workload} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid horizontal={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickLine={false} axisLine={false} width={110} />
                <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Tile>
      </div>
    </div>
  );
}
