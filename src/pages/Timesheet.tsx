import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMyTimeEntries, useDeleteTimeEntry, useAddManualEntry, formatHMS, formatSeconds } from '@/lib/time-tracking-hooks';
import { useWorkspaceIssues } from '@/lib/tasks-hooks';
import { useProjects } from '@/lib/projects-hooks';
import { DomainWorkspace } from '@/components/DomainWorkspace';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Trash2,
  Timer,
  Plus,
  ChevronDown,
  ChevronRight,
  Clock,
  BarChart3,
  FolderOpen,
  CircleDollarSign,
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, isSameDay } from 'date-fns';
import type { TimeEntry } from '@/lib/time-tracking-hooks';

const DAY_LABELS = ['Pzt', 'Sal', 'Car', 'Per', 'Cum', 'Cmt', 'Paz'];

export default function Timesheet() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());

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

  const weekEntries = useMemo(() => {
    return (entries ?? []).filter(e => {
      const d = new Date(e.started_at);
      return d >= rangeStart && d <= rangeEnd;
    });
  }, [entries, rangeStart, rangeEnd]);

  // --- Day breakdown ---
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
  const maxDayTotal = Math.max(...days.map(d => d.total), 1);

  // --- Billable breakdown ---
  const billableTotal = weekEntries
    .filter(e => e.billable)
    .reduce((s, e) => s + (e.duration_seconds ?? 0), 0);
  const nonBillableTotal = weekTotal - billableTotal;

  // --- Average hours/day (only days with entries) ---
  const daysWithEntries = days.filter(d => d.entries.length > 0).length;
  const avgSecondsPerDay = daysWithEntries > 0 ? Math.round(weekTotal / daysWithEntries) : 0;

  // --- Most tracked project ---
  const projectTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of weekEntries) {
      const task = taskMap.get(e.task_id);
      const pid = task?.project_id ?? '__none__';
      map.set(pid, (map.get(pid) ?? 0) + (e.duration_seconds ?? 0));
    }
    return map;
  }, [weekEntries, taskMap]);

  const mostTrackedProject = useMemo(() => {
    let maxId = '';
    let maxVal = 0;
    for (const [pid, total] of projectTotals) {
      if (total > maxVal) { maxId = pid; maxVal = total; }
    }
    return maxId ? (projectMap.get(maxId)?.name ?? 'Bilinmeyen proje') : null;
  }, [projectTotals, projectMap]);

  // --- Project-grouped entries ---
  const projectGroups = useMemo(() => {
    const map = new Map<string, { projectName: string; entries: TimeEntry[]; total: number }>();
    for (const e of weekEntries) {
      const task = taskMap.get(e.task_id);
      const pid = task?.project_id ?? '__none__';
      const pName = projectMap.get(pid)?.name ?? 'Projesiz';
      if (!map.has(pid)) map.set(pid, { projectName: pName, entries: [], total: 0 });
      const g = map.get(pid)!;
      g.entries.push(e);
      g.total += e.duration_seconds ?? 0;
    }
    return [...map.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [weekEntries, taskMap, projectMap]);

  const toggleProject = (pid: string) => {
    setCollapsedProjects(prev => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid); else next.add(pid);
      return next;
    });
  };

  return (
    <DomainWorkspace domain="analytics" title="Zaman Cizelgesi" subtitle="Haftalik sure takibi ve raporlama">
      {/* Week navigation */}
      <div className="flex items-center justify-between rounded-md border border-border/60 bg-card px-3 py-2">
        <Button size="sm" variant="ghost" onClick={() => setWeekOffset(w => w - 1)} className="h-7 text-[12px]">
          <ChevronRight className="mr-1 h-3 w-3 rotate-180" /> Onceki hafta
        </Button>
        <div className="text-[13px] font-medium">
          {format(rangeStart, 'MMM d')} &ndash; {format(rangeEnd, 'MMM d, yyyy')}
          <span className="ml-2 font-mono tabular-nums text-muted-foreground">{formatSeconds(weekTotal)}</span>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setWeekOffset(w => w + 1)} className="h-7 text-[12px]" disabled={weekOffset >= 0}>
          Sonraki hafta <ChevronRight className="ml-1 h-3 w-3" />
        </Button>
      </div>

      {/* Daily bar chart */}
      <Card className="p-3">
        <div className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground">
          <BarChart3 className="h-3.5 w-3.5" /> Gunluk Dagilim
        </div>
        <div className="flex items-end gap-1.5" style={{ height: 56 }}>
          {days.map((d, i) => {
            const pct = maxDayTotal > 0 ? (d.total / maxDayTotal) * 100 : 0;
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-0.5">
                <div className="relative w-full flex justify-center" style={{ height: 40 }}>
                  <div
                    className="w-full max-w-[28px] rounded-sm bg-primary/70 transition-all"
                    style={{ height: `${Math.max(pct, d.total > 0 ? 4 : 0)}%`, marginTop: 'auto' }}
                    title={formatSeconds(d.total)}
                  />
                </div>
                <span className="text-[10px] tabular-nums text-muted-foreground">{DAY_LABELS[i]}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Weekly summary stats */}
      {weekTotal > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Card className="flex items-center gap-2 p-2.5">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-[10.5px] text-muted-foreground">Toplam Sure</div>
              <div className="font-mono text-[13px] font-medium tabular-nums">{formatSeconds(weekTotal)}</div>
            </div>
          </Card>
          <Card className="flex items-center gap-2 p-2.5">
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-[10.5px] text-muted-foreground">Faturalandirilabilir</div>
              <div className="font-mono text-[13px] font-medium tabular-nums">{formatSeconds(billableTotal)}</div>
            </div>
          </Card>
          <Card className="flex items-center gap-2 p-2.5">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-[10.5px] text-muted-foreground">Ort. Saat/Gun</div>
              <div className="font-mono text-[13px] font-medium tabular-nums">{formatSeconds(avgSecondsPerDay)}</div>
            </div>
          </Card>
          <Card className="flex items-center gap-2 p-2.5">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-[10.5px] text-muted-foreground">En Cok Takip</div>
              <div className="truncate text-[13px] font-medium">{mostTrackedProject ?? '-'}</div>
            </div>
          </Card>
        </div>
      )}

      {/* Billable vs Non-billable summary */}
      {weekTotal > 0 && (
        <div className="flex items-center gap-3 rounded-md border border-border/60 bg-card px-3 py-2 text-[12px]">
          <span className="text-muted-foreground">Sure Ozeti:</span>
          <Badge variant="default" className="font-mono tabular-nums">
            <CircleDollarSign className="mr-1 h-3 w-3" />
            Faturalandirilabilir {formatSeconds(billableTotal)}
          </Badge>
          <Badge variant="secondary" className="font-mono tabular-nums">
            Faturalandirilmaz {formatSeconds(nonBillableTotal)}
          </Badge>
        </div>
      )}

      {/* Add entry button */}
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} className="h-7 text-[12px]">
          <Plus className="mr-1 h-3 w-3" /> Manuel Kayit Ekle
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}</div>
      ) : weekTotal === 0 ? (
        <div className="rounded-md border border-border/60 py-16 text-center">
          <Timer className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-[13px] font-medium text-muted-foreground">Bu hafta henuz kayit yok</p>
          <p className="mt-1 text-[12px] text-muted-foreground/70">
            Bir goreve gidip zamanlayici baslatin veya asagidaki butonu kullanarak manuel kayit ekleyin.
          </p>
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} className="mt-4 h-7 text-[12px]">
            <Plus className="mr-1 h-3 w-3" /> Manuel Kayit Ekle
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {projectGroups.map(([pid, group]) => {
            const collapsed = collapsedProjects.has(pid);
            return (
              <section key={pid} className="rounded-md border border-border/60 overflow-hidden">
                {/* Project header */}
                <button
                  type="button"
                  onClick={() => toggleProject(pid)}
                  className="flex w-full items-center gap-2 border-b border-border/60 bg-secondary/40 px-3 py-1.5 text-left hover:bg-secondary/60"
                >
                  {collapsed
                    ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  }
                  <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[12.5px] font-medium">{group.projectName}</span>
                  <span className="ml-auto font-mono text-[11.5px] tabular-nums text-muted-foreground">
                    {formatSeconds(group.total)}
                  </span>
                  <Badge variant="outline" className="ml-1 text-[10px]">
                    {group.entries.length} kayit
                  </Badge>
                </button>

                {/* Entries grouped by day within this project */}
                {!collapsed && (
                  <div>
                    {days.filter(d => d.entries.length > 0).map(d => {
                      const dayProjectEntries = group.entries.filter(e =>
                        isSameDay(new Date(e.started_at), d.date)
                      );
                      if (dayProjectEntries.length === 0) return null;
                      const dayTotal = dayProjectEntries.reduce((s, e) => s + (e.duration_seconds ?? 0), 0);
                      return (
                        <div key={d.date.toISOString()}>
                          <div className="flex items-center justify-between border-b border-border/40 bg-secondary/20 px-3 py-1">
                            <span className="text-[11px] text-muted-foreground">
                              {format(d.date, 'EEEE, MMM d')}
                            </span>
                            <span className="font-mono text-[10.5px] tabular-nums text-muted-foreground">
                              {formatSeconds(dayTotal)}
                            </span>
                          </div>
                          {dayProjectEntries.map(e => {
                            const task = taskMap.get(e.task_id);
                            return (
                              <div key={e.id} className="group flex items-center gap-3 border-b border-border/60 px-3 py-1.5 last:border-b-0 text-[12.5px] hover:bg-sidebar-accent/30">
                                <span className="w-14 shrink-0 font-mono tabular-nums text-muted-foreground">
                                  {e.duration_seconds != null ? formatHMS(e.duration_seconds) : '-- canli'}
                                </span>
                                <span className="w-14 shrink-0 font-mono text-[10.5px] tabular-nums text-muted-foreground/70">
                                  {task?.tracking_id ?? 'WH---'}
                                </span>
                                {task ? (
                                  <Link to={`/projects/${task.project_id}`} className="flex-1 truncate hover:underline">
                                    {task.title}
                                  </Link>
                                ) : (
                                  <span className="flex-1 truncate text-muted-foreground">(silinmis gorev)</span>
                                )}
                                {e.billable && (
                                  <Badge variant="default" className="shrink-0 text-[9.5px] px-1.5 py-0">
                                    Faturalandirilabilir
                                  </Badge>
                                )}
                                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                                  {format(new Date(e.started_at), 'HH:mm')}
                                  {e.ended_at && <> &ndash; {format(new Date(e.ended_at), 'HH:mm')}</>}
                                </span>
                                {e.note && (
                                  <span className="max-w-[200px] shrink-0 truncate text-[11px] text-muted-foreground">
                                    &middot; {e.note}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => del.mutate(e.id)}
                                  className="grid h-6 w-6 place-items-center rounded opacity-0 group-hover:opacity-60 hover:!opacity-100 text-muted-foreground"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Manual entry dialog */}
      <ManualEntryDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        tasks={tasks ?? []}
        onSubmit={(data) => {
          addEntry.mutate(data, { onSuccess: () => setAddOpen(false) });
        }}
        isPending={addEntry.isPending}
      />
    </DomainWorkspace>
  );
}

// ---------------------------------------------------------------------------
// Manual Entry Dialog
// ---------------------------------------------------------------------------

interface ManualEntryDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tasks: { id: string; title: string; tracking_id: string; project_id: string }[];
  onSubmit: (data: { task_id: string; started_at: string; ended_at: string; note?: string }) => void;
  isPending: boolean;
}

function ManualEntryDialog({ open, onOpenChange, tasks, onSubmit, isPending }: ManualEntryDialogProps) {
  const [taskId, setTaskId] = useState('');
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [note, setNote] = useState('');

  const handleSubmit = () => {
    if (!taskId || !date || !startTime || !endTime) return;
    const started_at = new Date(`${date}T${startTime}:00`).toISOString();
    const ended_at = new Date(`${date}T${endTime}:00`).toISOString();
    onSubmit({ task_id: taskId, started_at, ended_at, note: note || undefined });
  };

  const resetForm = () => {
    setTaskId('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setStartTime('09:00');
    setEndTime('10:00');
    setNote('');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manuel Sure Kaydi</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="space-y-1">
            <Label className="text-[12px]">Gorev</Label>
            <Select value={taskId} onValueChange={setTaskId}>
              <SelectTrigger className="h-8 text-[12.5px]">
                <SelectValue placeholder="Gorev secin..." />
              </SelectTrigger>
              <SelectContent>
                {tasks.map(t => (
                  <SelectItem key={t.id} value={t.id} className="text-[12.5px]">
                    <span className="font-mono text-[10.5px] text-muted-foreground mr-1.5">{t.tracking_id}</span>
                    {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[12px]">Tarih</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-8 text-[12.5px]" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[12px]">Baslangic Saati</Label>
              <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="h-8 text-[12.5px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-[12px]">Bitis Saati</Label>
              <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="h-8 text-[12.5px]" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[12px]">Not (istege bagli)</Label>
            <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Aciklama ekleyin..." className="h-8 text-[12.5px]" />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button size="sm" variant="ghost" onClick={() => { onOpenChange(false); resetForm(); }} className="h-7 text-[12px]">
              Iptal
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={!taskId || isPending} className="h-7 text-[12px]">
              <Plus className="mr-1 h-3 w-3" /> Kaydet
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
