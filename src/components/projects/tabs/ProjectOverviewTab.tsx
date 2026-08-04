import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { Project } from '@/lib/projects-types';
import type { Task } from '@/lib/tasks-types';
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS } from '@/lib/tasks-types';
import { CalendarDays, Target, Users, CheckCircle2 } from 'lucide-react';

export function ProjectOverviewTab({
  project,
  tasks,
  memberCount,
}: {
  project: Project;
  tasks: Task[];
  memberCount: number;
}) {
  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'done').length;
    const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { total, done, overdue, pct };
  }, [tasks]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="p-5 lg:col-span-2 space-y-4">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Proje açıklaması</h3>
          <p className="text-sm whitespace-pre-wrap">
            {project.description || 'Bu proje henüz bir açıklama içermiyor.'}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><CalendarDays className="h-3 w-3" /> Başlangıç</p>
            <p className="text-sm">{project.start_date ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Target className="h-3 w-3" /> Bitiş</p>
            <p className="text-sm">{project.end_date ?? '—'}</p>
          </div>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">İlerleme</p>
            <span className="text-sm text-muted-foreground">{stats.pct}%</span>
          </div>
          <Progress value={stats.pct} />
          <p className="text-xs text-muted-foreground mt-2">{stats.done} / {stats.total} görev tamamlandı</p>
        </div>
        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Görev</p>
            <p className="text-xl font-semibold">{stats.total}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Geciken</p>
            <p className="text-xl font-semibold text-destructive">{stats.overdue}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Üye</p>
            <p className="text-xl font-semibold">{memberCount}</p>
          </div>
        </div>
      </Card>

      <Card className="p-5 lg:col-span-3">
        <p className="text-sm font-medium mb-3">Durum dağılımı</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(Object.keys(TASK_STATUS_LABELS) as (keyof typeof TASK_STATUS_LABELS)[]).map(s => {
            const count = tasks.filter(t => t.status === s).length;
            return (
              <div key={s} className="rounded-md border p-3">
                <Badge className={`text-[10px] border ${TASK_STATUS_COLORS[s]}`}>{TASK_STATUS_LABELS[s]}</Badge>
                <p className="text-2xl font-semibold mt-2">{count}</p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
