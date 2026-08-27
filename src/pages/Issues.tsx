import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWorkspaceIssues } from '@/lib/tasks-hooks';
import { useProjects, useAllProfiles } from '@/lib/projects-hooks';
import {
  TASK_STATUS_LABELS, TASK_STATUS_ORDER, TASK_PRIORITY_LABELS,
} from '@/lib/tasks-types';
import type { Task, TaskStatus, TaskPriority } from '@/lib/tasks-types';
import { TaskRow } from '@/components/tasks/TaskRow';
import { TaskStatusIcon } from '@/components/tasks/TaskStatusIcon';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Search, LayoutList, LayoutGrid, ArrowUpDown, ArrowUp, ArrowDown,
  Bookmark, Save,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { BulkBar } from '@/components/tasks/BulkBar';
import { KanbanBoard } from '@/components/tasks/KanbanBoard';
import { useRealtime } from '@/lib/realtime';
import { useQueryClient } from '@tanstack/react-query';
import { useSavedViews, useCreateSavedView, type ViewTarget } from '@/lib/saved-views-hooks';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { differenceInDays, startOfDay } from 'date-fns';

type GroupBy = 'status' | 'priority' | 'project' | 'assignee' | 'none';
type Scope = 'active' | 'backlog' | 'all';
type ViewMode = 'list' | 'board';
type SortField = 'position' | 'due_date' | 'priority' | 'created_at' | 'updated_at';
type SortDir = 'asc' | 'desc';

const SORT_LABELS: Record<SortField, string> = {
  position: 'Sıra',
  due_date: 'Son tarih',
  priority: 'Öncelik',
  created_at: 'Oluşturma',
  updated_at: 'Güncelleme',
};

const PRIORITY_RANK: Record<TaskPriority, number> = {
  urgent: 4, high: 3, medium: 2, low: 1,
};

function SaveViewDialog({
  open, onOpenChange, onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState('');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Görünümü kaydet</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[12px]">Ad</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Gecikmiş görevler, Sprint 5…"
              autoFocus
              className="h-8 text-[12.5px]"
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!name.trim()}
              onClick={() => { onSave(name.trim()); setName(''); onOpenChange(false); }}
            >Kaydet</Button>
            <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>İptal</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Issues() {
  const { data: tasks, isLoading } = useWorkspaceIssues();
  const { data: projects } = useProjects();
  const { data: profiles } = useAllProfiles();
  const { data: savedViews } = useSavedViews('issues');
  const createView = useCreateSavedView();
  const qcTasks = useQueryClient();
  useRealtime('tasks', () => {
    qcTasks.invalidateQueries({ queryKey: ['workspace-issues'] });
  });
  const [searchParams, setSearchParams] = useSearchParams();

  const [scope, setScope] = useState<Scope>('active');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | TaskStatus>('all');
  const [priority, setPriority] = useState<'all' | TaskPriority>('all');
  const [projectFilter, setProjectFilter] = useState<'all' | string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<'all' | 'unassigned' | string>('all');
  const [groupBy, setGroupBy] = useState<GroupBy>('status');
  const [view, setView] = useState<ViewMode>('list');
  const [sortField, setSortField] = useState<SortField>('position');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const lastClickedIndexRef = useRef<number | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);

  // Apply saved view from URL
  useEffect(() => {
    const viewId = searchParams.get('view');
    if (viewId && savedViews) {
      const sv = savedViews.find(v => v.id === viewId);
      if (sv) {
        if (sv.filters.status?.length === 1) setStatus(sv.filters.status[0] as TaskStatus);
        if (sv.filters.priority?.length === 1) setPriority(sv.filters.priority[0] as TaskPriority);
        if (sv.filters.project_ids?.length === 1) setProjectFilter(sv.filters.project_ids[0]);
        if (sv.filters.assignee_ids?.length === 1) setAssigneeFilter(sv.filters.assignee_ids[0]);
        if (sv.filters.search) setSearch(sv.filters.search);
        if (sv.group_by) setGroupBy(sv.group_by as GroupBy);
        if (sv.sort.field) setSortField(sv.sort.field as SortField);
        if (sv.sort.dir) setSortDir(sv.sort.dir);
      }
    }
  }, [searchParams, savedViews]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selected.size > 0) {
        setSelected(new Set());
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected.size]);

  const projectMap = useMemo(
    () => new Map((projects ?? []).map(p => [p.id, p])),
    [projects],
  );

  const profileMap = useMemo(
    () => new Map((profiles ?? []).map(p => [p.user_id, p.full_name])),
    [profiles],
  );

  const scoped = useMemo(() => {
    const src = tasks ?? [];
    if (scope === 'all') return src;
    if (scope === 'backlog') return src.filter(t => t.status === 'backlog');
    return src.filter(t => t.status !== 'backlog' && t.status !== 'done');
  }, [tasks, scope]);

  const filtered = useMemo(() => {
    let r = scoped;
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.tracking_id ?? '').toLowerCase().includes(q),
      );
    }
    if (status !== 'all') r = r.filter(t => t.status === status);
    if (priority !== 'all') r = r.filter(t => t.priority === priority);
    if (projectFilter !== 'all') r = r.filter(t => t.project_id === projectFilter);
    if (assigneeFilter === 'unassigned') r = r.filter(t => !t.assignee_id);
    else if (assigneeFilter !== 'all') r = r.filter(t => t.assignee_id === assigneeFilter);
    return r;
  }, [scoped, search, status, priority, projectFilter, assigneeFilter]);

  const sorted = useMemo(() => {
    if (sortField === 'position') return filtered;
    const arr = [...filtered];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      if (sortField === 'due_date') {
        const da = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const db = b.due_date ? new Date(b.due_date).getTime() : Infinity;
        return (da - db) * dir;
      }
      if (sortField === 'priority') {
        return (PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]) * dir;
      }
      if (sortField === 'created_at') {
        return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
      }
      if (sortField === 'updated_at') {
        return (new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()) * dir;
      }
      return 0;
    });
    return arr;
  }, [filtered, sortField, sortDir]);

  const counts = useMemo(() => {
    const src = tasks ?? [];
    return {
      active: src.filter(t => t.status !== 'backlog' && t.status !== 'done').length,
      backlog: src.filter(t => t.status === 'backlog').length,
      all: src.length,
    };
  }, [tasks]);

  const overdueCounts = useMemo(() => {
    const today = startOfDay(new Date());
    const src = tasks ?? [];
    return {
      overdue: src.filter(t => t.due_date && t.status !== 'done' && differenceInDays(startOfDay(new Date(t.due_date)), today) < 0).length,
      dueSoon: src.filter(t => t.due_date && t.status !== 'done' && differenceInDays(startOfDay(new Date(t.due_date)), today) >= 0 && differenceInDays(startOfDay(new Date(t.due_date)), today) <= 3).length,
    };
  }, [tasks]);

  const uniqueAssignees = useMemo(() => {
    const ids = new Set<string>();
    (tasks ?? []).forEach(t => { if (t.assignee_id) ids.add(t.assignee_id); });
    return Array.from(ids)
      .map(id => ({ id, name: profileMap.get(id) ?? 'Kullanıcı' }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks, profileMap]);

  const groups = useMemo(() => {
    if (groupBy === 'none') return [{ key: 'all', label: `Tümü (${sorted.length})`, items: sorted }];
    if (groupBy === 'status') {
      return TASK_STATUS_ORDER.map(s => ({
        key: s,
        label: TASK_STATUS_LABELS[s],
        icon: s,
        items: sorted.filter(t => t.status === s),
      })).filter(g => g.items.length > 0);
    }
    if (groupBy === 'priority') {
      const order: TaskPriority[] = ['urgent', 'high', 'medium', 'low'];
      return order.map(p => ({
        key: p,
        label: TASK_PRIORITY_LABELS[p],
        items: sorted.filter(t => t.priority === p),
      })).filter(g => g.items.length > 0);
    }
    if (groupBy === 'assignee') {
      const byAssignee = new Map<string, Task[]>();
      sorted.forEach(t => {
        const key = t.assignee_id ?? '__unassigned__';
        const list = byAssignee.get(key) ?? [];
        list.push(t);
        byAssignee.set(key, list);
      });
      return Array.from(byAssignee.entries()).map(([aid, items]) => ({
        key: aid,
        label: aid === '__unassigned__' ? 'Atanmamış' : (profileMap.get(aid) ?? 'Kullanıcı'),
        items,
      }));
    }
    const byProject = new Map<string, Task[]>();
    sorted.forEach(t => {
      const list = byProject.get(t.project_id) ?? [];
      list.push(t);
      byProject.set(t.project_id, list);
    });
    return Array.from(byProject.entries()).map(([pid, items]) => ({
      key: pid,
      label: projectMap.get(pid)?.name ?? 'Bilinmeyen proje',
      items,
    }));
  }, [sorted, groupBy, projectMap, profileMap]);

  const flatIds = useMemo(() => groups.flatMap(g => g.items.map(t => t.id)), [groups]);

  useEffect(() => {
    if (selected.size === 0) return;
    const visible = new Set(flatIds);
    const next = new Set([...selected].filter(id => visible.has(id)));
    if (next.size !== selected.size) setSelected(next);
  }, [flatIds]);

  const hasFilters = status !== 'all' || priority !== 'all' || projectFilter !== 'all' || assigneeFilter !== 'all' || search;

  const handleSaveView = async (name: string) => {
    try {
      await createView.mutateAsync({
        target: 'issues' as ViewTarget,
        name,
        filters: {
          status: status !== 'all' ? [status] : undefined,
          priority: priority !== 'all' ? [priority] : undefined,
          project_ids: projectFilter !== 'all' ? [projectFilter] : undefined,
          assignee_ids: assigneeFilter !== 'all' ? [assigneeFilter] : undefined,
          search: search || undefined,
        },
        sort: sortField !== 'position' ? { field: sortField, dir: sortDir } : undefined,
        group_by: groupBy !== 'status' ? groupBy : undefined,
      });
      toast.success('Görünüm kaydedildi');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const GROUP_BY_LABELS: Record<GroupBy, string> = {
    status: 'Durum',
    priority: 'Öncelik',
    project: 'Proje',
    assignee: 'Kişi',
    none: 'Düz',
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-[20px] font-semibold tracking-tight">Görevler</h1>
        <div className="flex items-center gap-3">
          {overdueCounts.overdue > 0 && (
            <span className="text-[11.5px] font-medium text-red-400 tabular-nums">
              {overdueCounts.overdue} gecikmiş
            </span>
          )}
          {overdueCounts.dueSoon > 0 && (
            <span className="text-[11.5px] text-amber-400/80 tabular-nums">
              {overdueCounts.dueSoon} yaklaşan
            </span>
          )}
          <span className="text-[12px] text-muted-foreground tabular-nums">{sorted.length} / {tasks?.length ?? 0}</span>
        </div>
      </div>

      {/* Saved views bar */}
      {(savedViews?.length ?? 0) > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <Bookmark className="h-3 w-3 text-muted-foreground shrink-0" />
          {(savedViews ?? []).map(sv => (
            <button
              key={sv.id}
              type="button"
              onClick={() => setSearchParams({ view: sv.id })}
              className={cn(
                "inline-flex h-6 items-center rounded-full border px-2.5 text-[11px] font-medium transition-colors shrink-0",
                searchParams.get('view') === sv.id
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              {sv.name}
            </button>
          ))}
        </div>
      )}

      {/* Active / Backlog / All tabs */}
      <div className="border-b border-border">
        {(['active', 'backlog', 'all'] as Scope[]).map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setScope(s)}
            className={cn(
              "relative inline-flex h-9 items-center gap-2 border-b-2 border-transparent px-3 text-[13px] font-medium transition-colors -mb-px",
              scope === s
                ? "border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {s === 'active' ? 'Aktif' : s === 'backlog' ? 'Bekleyen' : 'Tümü'}
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground/70">
              {counts[s]}
            </span>
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Görev ara (başlık veya WH-ID)…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-[12.5px]"
          />
        </div>
        <Select value={status} onValueChange={v => setStatus(v as any)}>
          <SelectTrigger className="w-32 h-8 text-[12px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm durumlar</SelectItem>
            {(Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map(s => (
              <SelectItem key={s} value={s}>{TASK_STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={v => setPriority(v as any)}>
          <SelectTrigger className="w-32 h-8 text-[12px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm öncelikler</SelectItem>
            {(Object.keys(TASK_PRIORITY_LABELS) as TaskPriority[]).map(p => (
              <SelectItem key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-40 h-8 text-[12px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm projeler</SelectItem>
            {(projects ?? []).map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="w-40 h-8 text-[12px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm kişiler</SelectItem>
            <SelectItem value="unassigned">Atanmamış</SelectItem>
            {uniqueAssignees.map(a => (
              <SelectItem key={a.id} value={a.id}>
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-4 w-4">
                    <AvatarFallback className="text-[7px] bg-sidebar-accent">
                      {a.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{a.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sort + View controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          <Select value={sortField} onValueChange={v => setSortField(v as SortField)}>
            <SelectTrigger className="w-28 h-7 text-[11px] border-dashed"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABELS) as SortField[]).map(f => (
                <SelectItem key={f} value={f}>{SORT_LABELS[f]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {sortField !== 'position' && (
            <button
              type="button"
              onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
              className="h-7 w-7 inline-flex items-center justify-center rounded border border-dashed border-border text-muted-foreground hover:text-foreground transition-colors"
              title={sortDir === 'asc' ? 'Artan' : 'Azalan'}
            >
              {sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            </button>
          )}
        </div>

        {hasFilters && (
          <Button
            variant="ghost" size="sm"
            className="h-7 text-[11px] gap-1"
            onClick={() => setSaveOpen(true)}
          >
            <Save className="h-3 w-3" /> Görünümü kaydet
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
            <button
              type="button"
              onClick={() => setView('list')}
              className={cn('h-6 px-2 rounded text-[11px] font-medium transition-colors inline-flex items-center gap-1',
                view === 'list' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground')}
              title="Liste görünümü"
            ><LayoutList className="h-3 w-3" /> Liste</button>
            <button
              type="button"
              onClick={() => setView('board')}
              className={cn('h-6 px-2 rounded text-[11px] font-medium transition-colors inline-flex items-center gap-1',
                view === 'board' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground')}
              title="Kanban görünümü"
            ><LayoutGrid className="h-3 w-3" /> Pano</button>
          </div>
          {view === 'list' && (
            <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
              {(Object.keys(GROUP_BY_LABELS) as GroupBy[]).map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGroupBy(g)}
                  className={`h-6 rounded px-2 text-[11px] font-medium transition-colors ${groupBy === g ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {GROUP_BY_LABELS[g]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-9" />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-md border border-border/60 py-12 text-center text-[13px] text-muted-foreground">
          Görev yok.
        </div>
      ) : view === 'board' ? (
        <KanbanBoard tasks={sorted} projectMap={projectMap} />
      ) : (
        <div className="space-y-4">
          {groups.map(g => (
            <section key={g.key} className="rounded-md border border-border/60 overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border/60 bg-secondary/30 px-3 py-1.5">
                {(g as any).icon && <TaskStatusIcon status={(g as any).icon} size={12} />}
                <span className="text-[12px] font-medium">{g.label}</span>
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground/70">{g.items.length}</span>
              </div>
              <div>
                {g.items.map(t => {
                  const project = projectMap.get(t.project_id);
                  const flatIndex = flatIds.indexOf(t.id);
                  const isSel = selected.has(t.id);
                  const onCheck = (e: React.MouseEvent) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const next = new Set(selected);
                    if (e.shiftKey && lastClickedIndexRef.current !== null) {
                      const [lo, hi] = [
                        Math.min(lastClickedIndexRef.current, flatIndex),
                        Math.max(lastClickedIndexRef.current, flatIndex),
                      ];
                      for (let i = lo; i <= hi; i++) next.add(flatIds[i]);
                    } else {
                      if (isSel) next.delete(t.id); else next.add(t.id);
                    }
                    lastClickedIndexRef.current = flatIndex;
                    setSelected(next);
                  };
                  return (
                    <div key={t.id} className={cn(
                      'group/select flex items-stretch',
                      isSel && 'bg-primary/5',
                    )}>
                      <div
                        onClick={onCheck}
                        className={cn(
                          'flex items-center pl-2 pr-1 cursor-pointer transition-opacity',
                          isSel || selected.size > 0 ? 'opacity-100' : 'opacity-0 group-hover/select:opacity-100',
                        )}
                        title="Seç (Shift-click aralık, Esc temizle)"
                      >
                        <input
                          type="checkbox" checked={isSel} readOnly
                          className="h-3.5 w-3.5 accent-primary pointer-events-none"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <TaskRow
                          task={t}
                          projectName={project?.name}
                          assigneeName={t.assignee_id ? profileMap.get(t.assignee_id) : null}
                          href={selected.size > 0 ? undefined : `/projects/${t.project_id}?task=${t.id}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {selected.size > 0 && (
        <BulkBar selectedIds={[...selected]} onClear={() => setSelected(new Set())} />
      )}

      <SaveViewDialog open={saveOpen} onOpenChange={setSaveOpen} onSave={handleSaveView} />
    </div>
  );
}
