import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMyTasks, useUnassignedTasks, useUpdateTask } from '@/lib/tasks-hooks';
import { useProjects } from '@/lib/projects-hooks';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  TASK_STATUS_COLORS, TASK_STATUS_LABELS,
  TASK_PRIORITY_COLORS, TASK_PRIORITY_LABELS,
} from '@/lib/tasks-types';
import type { Task, TaskStatus } from '@/lib/tasks-types';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, UserRoundPlus, Inbox } from 'lucide-react';
import { TaskRow } from './TaskRow';

type Bucket = 'recent' | 'overdue' | 'today' | 'this_week' | 'next_week' | 'later' | 'no_date';

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

export function MyTasksView() {
  const { data: tasks, isLoading } = useMyTasks();
  const { data: unassigned } = useUnassignedTasks();
  const { data: projects } = useProjects();
  const { user } = useAuth();
  const updateTask = useUpdateTask();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');

  const projectMap = useMemo(() => new Map((projects ?? []).map(p => [p.id, p])), [projects]);

  const claim = async (taskId: string, title: string) => {
    try {
      await updateTask.mutateAsync({ id: taskId, assignee_id: user!.id });
      toast.success(`Üstlendin: ${title}`);
    } catch (e) {
      toast.error('Atanamadı: ' + (e instanceof Error ? e.message : ''));
    }
  };

  // Sahipsiz işler aynı arama/durum filtrelerine tabi
  const unassignedFiltered = useMemo(() => {
    let r = unassigned ?? [];
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(t => t.title.toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') r = r.filter(t => t.status === statusFilter);
    return r;
  }, [unassigned, search, statusFilter]);

  const filtered = useMemo(() => {
    let r = tasks ?? [];
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(t => t.title.toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') r = r.filter(t => t.status === statusFilter);
    return r;
  }, [tasks, search, statusFilter]);

  const grouped = useMemo(() => {
    const g: Record<Bucket, Task[]> = { recent: [], overdue: [], today: [], this_week: [], next_week: [], later: [], no_date: [] };
    filtered.forEach(t => { g[bucketFor(t)].push(t); });
    return g;
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Görevlerim</h1>
        <p className="text-sm text-muted-foreground">
          Sana atanan görevler zamana göre gruplandı; sahipsiz işler ayrı başlıkta
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Görev ara..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm durumlar</SelectItem>
            {(Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map(s => (
              <SelectItem key={s} value={s}>{TASK_STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* F16 — sahipsiz işler: hiçbir kişisel listede görünmüyordu */}
      {unassignedFiltered.length > 0 && (
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
      )}

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-center py-16 text-muted-foreground">
          {unassignedFiltered.length > 0 ? 'Sana atanmış görev yok' : 'Görev yok'}
        </p>
      ) : (
        <div className="space-y-4">
          {BUCKET_ORDER.map(b => {
            const items = grouped[b];
            if (items.length === 0) return null;
            return (
              <section key={b}>
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-sm font-semibold">{BUCKET_LABELS[b]}</h2>
                  <span className="text-xs text-muted-foreground">{items.length}</span>
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
      )}
    </div>
  );
}
