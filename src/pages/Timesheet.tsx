import { useMemo, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  useMyTimeEntries,
  useDeleteTimeEntry,
  useAddManualEntry,
  formatHMS,
  formatSeconds,
  type TimeEntry,
} from '@/lib/time-tracking-hooks';
import { useWorkspaceIssues } from '@/lib/tasks-hooks';
import { useProjects } from '@/lib/projects-hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Trash2,
  Timer,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Plus,
  Clock,
  TrendingUp,
  FileText,
  X,
} from 'lucide-react';
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  isSameDay,
  isToday,
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';

// ── palette for projects ────────────────────────────────────────────────
const PROJECT_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#3b82f6', '#84cc16',
];

const DAILY_TARGET_H = 8;
const WEEKLY_TARGET_H = 40;

const DAY_LABELS_TR = ['Pzt', 'Sal', 'Car', 'Per', 'Cum', 'Cmt', 'Paz'];

export default function Timesheet() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const anchor = addWeeks(new Date(), weekOffset);
  const rangeStart = startOfWeek(anchor, { weekStartsOn: 1 });
  const rangeEnd = endOfWeek(anchor, { weekStartsOn: 1 });

  const { data: entries, isLoading } = useMyTimeEntries(rangeStart.toISOString());
  const { data: tasks } = useWorkspaceIssues();
  const { data: projects } = useProjects();
  const del = useDeleteTimeEntry();
  const addEntry = useAddManualEntry();

  const taskMap = useMemo(() => new Map((tasks ?? []).map(t => [t.id, t])), [tasks]);
  const projectMap = useMemo(() => new Map((projects ?? []).map(p => [p.id, p])), [projects]);

  // assign stable color per project
  const projectColorMap = useMemo(() => {
    const m = new Map<string, string>();
    (projects ?? []).forEach((p, i) => {
      m.set(p.id, p.color ?? PROJECT_COLORS[i % PROJECT_COLORS.length]);
    });
    return m;
  }, [projects]);

  const weekEntries = useMemo(() => {
    return (entries ?? []).filter(e => {
      const d = new Date(e.started_at);
      return d >= rangeStart && d <= rangeEnd;
    });
  }, [entries, rangeStart, rangeEnd]);

  const days = useMemo(() => {
    const arr: { date: Date; entries: TimeEntry[]; total: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(rangeStart);
      d.setDate(d.getDate() + i);
      const es = weekEntries.filter(e => isSameDay(new Date(e.started_at), d));
      const total = es.reduce((s, e) => s + (e.duration_seconds ?? 0), 0);
      arr.push({ date: d, entries: es, total });
    }
    return arr;
  }, [weekEntries, rangeStart]);

  const weekTotal = days.reduce((s, d) => s + d.total, 0);
  const weekTotalH = weekTotal / 3600;
  const avgDailyH = weekTotalH / 7;

  // project breakdown
  const projectBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    weekEntries.forEach(e => {
      const task = taskMap.get(e.task_id);
      const pid = task?.project_id ?? '__none';
      map.set(pid, (map.get(pid) ?? 0) + (e.duration_seconds ?? 0));
    });
    return Array.from(map.entries())
      .map(([pid, secs]) => ({
        id: pid,
        name: projectMap.get(pid)?.name ?? 'Diğer',
        seconds: secs,
        color: projectColorMap.get(pid) ?? '#94a3b8',
      }))
      .sort((a, b) => b.seconds - a.seconds);
  }, [weekEntries, taskMap, projectMap, projectColorMap]);

  const topProject = projectBreakdown[0];

  // bar chart data
  const chartData = days.map((d, i) => ({
    day: DAY_LABELS_TR[i],
    hours: +(d.total / 3600).toFixed(2),
    isToday: isToday(d.date),
  }));

  // today scroll ref
  const todayRef = useRef<HTMLDivElement>(null);
  const scrollToToday = () => {
    if (weekOffset !== 0) {
      setWeekOffset(0);
      setTimeout(() => todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    } else {
      todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // ── manual entry form state ───────────────────────────────────────────
  const [formTaskId, setFormTaskId] = useState('');
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formStart, setFormStart] = useState('09:00');
  const [formEnd, setFormEnd] = useState('10:00');
  const [formNote, setFormNote] = useState('');

  const handleAddEntry = () => {
    if (!formTaskId) return;
    const startedAt = new Date(`${formDate}T${formStart}:00`).toISOString();
    const endedAt = new Date(`${formDate}T${formEnd}:00`).toISOString();
    addEntry.mutate(
      { task_id: formTaskId, started_at: startedAt, ended_at: endedAt, note: formNote || undefined },
      {
        onSuccess: () => {
          setShowAddForm(false);
          setFormNote('');
        },
      },
    );
  };

  const totalBreakdownSecs = projectBreakdown.reduce((s, p) => s + p.seconds, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight">Timesheet</h1>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            Haftalik zaman kayitlarin ve proje bazli dagilim.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 text-[12px] gap-1.5" onClick={scrollToToday}>
            <CalendarDays className="h-3.5 w-3.5" />
            Bugun
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-[12px] gap-1.5" onClick={() => setShowAddForm(v => !v)}>
            <Plus className="h-3.5 w-3.5" />
            Kayit Ekle
          </Button>
        </div>
      </div>

      {/* ── Week navigator ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card px-4 py-2.5">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setWeekOffset(w => w - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-[13px] font-medium">
          {format(rangeStart, 'd MMM', { locale: tr })} – {format(rangeEnd, 'd MMM yyyy', { locale: tr })}
        </span>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => setWeekOffset(w => w + 1)}
          disabled={weekOffset >= 0}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* ── Inline add form ────────────────────────────────────────────── */}
      {showAddForm && (
        <div className="rounded-lg border border-border/60 bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium">Manuel Kayit Ekle</span>
            <button type="button" onClick={() => setShowAddForm(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Select value={formTaskId} onValueChange={setFormTaskId}>
              <SelectTrigger className="h-8 text-[12px]">
                <SelectValue placeholder="Gorev sec..." />
              </SelectTrigger>
              <SelectContent>
                {(tasks ?? []).slice(0, 50).map(t => (
                  <SelectItem key={t.id} value={t.id} className="text-[12px]">
                    {t.tracking_id} · {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="h-8 text-[12px]" />
            <div className="flex gap-1.5">
              <Input type="time" value={formStart} onChange={e => setFormStart(e.target.value)} className="h-8 text-[12px]" />
              <Input type="time" value={formEnd} onChange={e => setFormEnd(e.target.value)} className="h-8 text-[12px]" />
            </div>
            <Input
              placeholder="Not (opsiyonel)"
              value={formNote}
              onChange={e => setFormNote(e.target.value)}
              className="h-8 text-[12px]"
            />
          </div>
          <Button size="sm" className="h-7 text-[12px]" onClick={handleAddEntry} disabled={!formTaskId || addEntry.isPending}>
            {addEntry.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
      ) : (
        <>
          {/* ── Summary cards row ────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3">
            {/* weekly total */}
            <div className="rounded-lg border border-border/60 bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-[11px] font-medium uppercase tracking-wider">Haftalik Toplam</span>
              </div>
              <div className="text-[22px] font-semibold tabular-nums leading-tight">
                {weekTotalH.toFixed(1)}s
                <span className="text-[13px] font-normal text-muted-foreground"> / {WEEKLY_TARGET_H}s hedef</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    weekTotalH >= WEEKLY_TARGET_H ? 'bg-emerald-500' : 'bg-primary',
                  )}
                  style={{ width: `${Math.min(100, (weekTotalH / WEEKLY_TARGET_H) * 100)}%` }}
                />
              </div>
            </div>

            {/* top project */}
            <div className="rounded-lg border border-border/60 bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="text-[11px] font-medium uppercase tracking-wider">En Cok Zaman</span>
              </div>
              {topProject ? (
                <>
                  <div className="text-[15px] font-medium truncate">{topProject.name}</div>
                  <div className="text-[12px] text-muted-foreground tabular-nums">
                    {(topProject.seconds / 3600).toFixed(1)} saat
                  </div>
                </>
              ) : (
                <div className="text-[13px] text-muted-foreground">Kayit yok</div>
              )}
            </div>

            {/* avg daily */}
            <div className="rounded-lg border border-border/60 bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
                <FileText className="h-3.5 w-3.5" />
                <span className="text-[11px] font-medium uppercase tracking-wider">Gunluk Ortalama</span>
              </div>
              <div className="text-[22px] font-semibold tabular-nums leading-tight">
                {avgDailyH.toFixed(1)}s
              </div>
              <div className="text-[12px] text-muted-foreground mt-0.5">
                {weekEntries.length} kayit bu hafta
              </div>
            </div>
          </div>

          {/* ── Weekly bar chart ─────────────────────────────────────── */}
          <div className="rounded-lg border border-border/60 bg-card p-4">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Haftalik Dagilim
            </span>
            <div className="h-[140px] mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap="20%">
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                  <ReTooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(v: number) => [`${v} saat`, 'Sure']}
                  />
                  <ReferenceLine y={DAILY_TARGET_H} stroke="var(--muted-foreground)" strokeDasharray="4 4" strokeOpacity={0.5} />
                  <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, idx) => (
                      <Cell
                        key={idx}
                        fill={entry.isToday ? 'var(--primary)' : 'var(--muted-foreground)'}
                        fillOpacity={entry.isToday ? 1 : 0.25}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Project breakdown ────────────────────────────────────── */}
          {projectBreakdown.length > 0 && (
            <div className="rounded-lg border border-border/60 bg-card p-4">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Proje Bazli Dagilim
              </span>
              {/* stacked bar */}
              <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-secondary">
                {projectBreakdown.map(p => (
                  <div
                    key={p.id}
                    className="h-full transition-all first:rounded-l-full last:rounded-r-full"
                    style={{
                      width: `${(p.seconds / totalBreakdownSecs) * 100}%`,
                      backgroundColor: p.color,
                    }}
                    title={`${p.name}: ${(p.seconds / 3600).toFixed(1)}s`}
                  />
                ))}
              </div>
              {/* legend */}
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                {projectBreakdown.map(p => (
                  <div key={p.id} className="flex items-center gap-1.5 text-[11.5px]">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="text-foreground">{p.name}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {(p.seconds / 3600).toFixed(1)}s ({Math.round((p.seconds / totalBreakdownSecs) * 100)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Day sections ─────────────────────────────────────────── */}
          {weekTotal === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 py-20 text-center">
              <Timer className="mx-auto h-10 w-10 text-muted-foreground/30 mb-4" />
              <p className="text-[14px] font-medium text-muted-foreground">Bu hafta henuz kayit yok</p>
              <p className="text-[12px] text-muted-foreground/70 mt-1">
                Yukaridaki "Kayit Ekle" butonu ile manuel sure girebilirsin.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {days.map((d, dayIdx) => {
                const today = isToday(d.date);
                return (
                  <section
                    key={d.date.toISOString()}
                    ref={today ? todayRef : undefined}
                    className={cn(
                      'rounded-lg border overflow-hidden transition-colors',
                      today ? 'border-primary/40 bg-primary/[0.03]' : 'border-border/60 bg-card',
                      d.entries.length === 0 && 'opacity-50',
                    )}
                  >
                    {/* day header */}
                    <div className={cn(
                      'flex items-center justify-between px-4 py-2',
                      today ? 'bg-primary/[0.06]' : 'bg-secondary/30',
                    )}>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'text-[12.5px] font-medium',
                          today && 'text-primary',
                        )}>
                          {format(d.date, 'EEEE, d MMM', { locale: tr })}
                        </span>
                        {today && (
                          <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground uppercase leading-none">
                            Bugun
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11.5px] tabular-nums text-muted-foreground">
                          {formatSeconds(d.total)}
                        </span>
                        {d.total > 0 && (
                          <div className="w-12 h-1 rounded-full bg-secondary overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full',
                                d.total / 3600 >= DAILY_TARGET_H ? 'bg-emerald-500' : 'bg-primary/60',
                              )}
                              style={{ width: `${Math.min(100, (d.total / 3600 / DAILY_TARGET_H) * 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* entries */}
                    {d.entries.length === 0 ? (
                      <div className="px-4 py-3 text-[12px] text-muted-foreground/60 italic">
                        Kayit yok
                      </div>
                    ) : (
                      d.entries.map(e => {
                        const task = taskMap.get(e.task_id);
                        const pid = task?.project_id;
                        const color = pid ? (projectColorMap.get(pid) ?? '#94a3b8') : '#94a3b8';

                        return (
                          <div
                            key={e.id}
                            className="group flex items-center gap-3 border-t border-border/40 px-4 py-2 text-[12.5px] hover:bg-accent/40 transition-colors"
                            style={{ borderLeftWidth: 3, borderLeftColor: color }}
                          >
                            {/* time range */}
                            <span className="font-mono text-[11px] tabular-nums text-muted-foreground w-[90px] shrink-0">
                              {format(new Date(e.started_at), 'HH:mm')}
                              {e.ended_at && <> – {format(new Date(e.ended_at), 'HH:mm')}</>}
                            </span>

                            {/* duration */}
                            <span className="font-mono tabular-nums font-medium w-[52px] shrink-0">
                              {e.duration_seconds != null ? formatHMS(e.duration_seconds) : (
                                <span className="text-emerald-500 animate-pulse">live</span>
                              )}
                            </span>

                            {/* tracking id */}
                            <span className="font-mono text-[10.5px] tabular-nums text-muted-foreground/60 w-[52px] shrink-0">
                              {task?.tracking_id ?? 'WH---'}
                            </span>

                            {/* task title */}
                            {task ? (
                              <Link
                                to={`/projects/${task.project_id}`}
                                className="flex-1 truncate hover:underline underline-offset-2"
                              >
                                {task.title}
                              </Link>
                            ) : (
                              <span className="flex-1 truncate text-muted-foreground italic">(silinmis gorev)</span>
                            )}

                            {/* note */}
                            {e.note && (
                              <span className="hidden sm:inline text-muted-foreground text-[11px] truncate max-w-[180px] shrink-0">
                                {e.note}
                              </span>
                            )}

                            {/* hover actions */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                type="button"
                                onClick={() => del.mutate(e.id)}
                                className="h-6 w-6 grid place-items-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                title="Sil"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
