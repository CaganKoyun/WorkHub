import { useMemo, useState } from 'react';
import { useWorkspaceIssues } from '@/lib/tasks-hooks';
import { useProjects } from '@/lib/projects-hooks';
import {
  TASK_STATUS_LABELS, TASK_STATUS_ORDER, TASK_PRIORITY_LABELS,
} from '@/lib/tasks-types';
import type { Task, TaskStatus, TaskPriority } from '@/lib/tasks-types';
import { TaskRow } from '@/components/tasks/TaskRow';
import { TaskStatusIcon } from '@/components/tasks/TaskStatusIcon';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type GroupBy = 'status' | 'priority' | 'project' | 'none';
type Scope = 'active' | 'backlog' | 'all';

export default function Issues() {
  const { data: tasks, isLoading } = useWorkspaceIssues();
  const { data: projects } = useProjects();
  const [scope, setScope] = useState<Scope>('active');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | TaskStatus>('all');
  const [priority, setPriority] = useState<'all' | TaskPriority>('all');
  const [projectFilter, setProjectFilter] = useState<'all' | string>('all');
  const [groupBy, setGroupBy] = useState<GroupBy>('status');

  const projectMap = useMemo(
    () => new Map((projects ?? []).map(p => [p.id, p])),
    [projects],
  );

  const scoped = useMemo(() => {
    const src = tasks ?? [];
    if (scope === 'all') return src;
    if (scope === 'backlog') return src.filter(t => t.status === 'backlog');
    // active = every status EXCEPT backlog + not done
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
    return r;
  }, [scoped, search, status, priority, projectFilter]);

  const counts = useMemo(() => {
    const src = tasks ?? [];
    return {
      active: src.filter(t => t.status !== 'backlog' && t.status !== 'done').length,
      backlog: src.filter(t => t.status === 'backlog').length,
      all: src.length,
    };
  }, [tasks]);

  const groups = useMemo(() => {
    if (groupBy === 'none') return [{ key: 'all', label: `All (${filtered.length})`, items: filtered }];
    if (groupBy === 'status') {
      return TASK_STATUS_ORDER.map(s => ({
        key: s,
        label: TASK_STATUS_LABELS[s],
        icon: s,
        items: filtered.filter(t => t.status === s),
      })).filter(g => g.items.length > 0);
    }
    if (groupBy === 'priority') {
      const order: TaskPriority[] = ['urgent', 'high', 'medium', 'low'];
      return order.map(p => ({
        key: p,
        label: TASK_PRIORITY_LABELS[p],
        items: filtered.filter(t => t.priority === p),
      })).filter(g => g.items.length > 0);
    }
    // group by project
    const byProject = new Map<string, Task[]>();
    filtered.forEach(t => {
      const list = byProject.get(t.project_id) ?? [];
      list.push(t);
      byProject.set(t.project_id, list);
    });
    return Array.from(byProject.entries()).map(([pid, items]) => ({
      key: pid,
      label: projectMap.get(pid)?.name ?? 'Bilinmeyen proje',
      items,
    }));
  }, [filtered, groupBy, projectMap]);

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-[20px] font-semibold tracking-tight">Issues</h1>
        <span className="text-[12px] text-muted-foreground tabular-nums">{filtered.length} / {tasks?.length ?? 0}</span>
      </div>

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
            {s === 'active' ? 'Active' : s === 'backlog' ? 'Backlog' : 'All'}
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
        <div className="ml-auto flex items-center gap-1 rounded-md border border-border p-0.5">
          {(['status', 'priority', 'project', 'none'] as GroupBy[]).map(g => (
            <button
              key={g}
              type="button"
              onClick={() => setGroupBy(g)}
              className={`h-6 rounded px-2 text-[11px] font-medium transition-colors ${groupBy === g ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {g === 'none' ? 'flat' : g}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-9" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-md border border-border/60 py-12 text-center text-[13px] text-muted-foreground">
          Görev yok.
        </div>
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
          ))}
        </div>
      )}
    </div>
  );
}
