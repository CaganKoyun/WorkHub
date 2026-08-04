import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { Task } from '@/lib/tasks-types';
import { TASK_STATUS_COLORS, TASK_STATUS_LABELS, TASK_PRIORITY_COLORS, TASK_PRIORITY_LABELS } from '@/lib/tasks-types';
import type { ProjectMember } from '@/lib/projects-types';

interface MemberWithProfile extends ProjectMember {
  profile?: { name: string | null; avatar: string | null } | undefined;
}

export function ProjectDashboardTab({
  tasks,
  members,
}: {
  tasks: Task[];
  members: MemberWithProfile[];
}) {
  const stats = useMemo(() => {
    const total = tasks.length || 1;
    const byStatus = Object.fromEntries(
      (Object.keys(TASK_STATUS_LABELS) as (keyof typeof TASK_STATUS_LABELS)[]).map(s => [
        s, tasks.filter(t => t.status === s).length,
      ]),
    );
    const byPriority = Object.fromEntries(
      (Object.keys(TASK_PRIORITY_LABELS) as (keyof typeof TASK_PRIORITY_LABELS)[]).map(p => [
        p, tasks.filter(t => t.priority === p).length,
      ]),
    );
    const byAssignee = new Map<string | null, { count: number; done: number }>();
    tasks.forEach(t => {
      const key = t.assignee_id;
      const s = byAssignee.get(key) ?? { count: 0, done: 0 };
      s.count++;
      if (t.status === 'done') s.done++;
      byAssignee.set(key, s);
    });
    return { total: tasks.length, byStatus, byPriority, byAssignee };
  }, [tasks]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="p-5">
        <p className="text-sm font-medium mb-3">Durum dağılımı</p>
        <div className="space-y-2">
          {(Object.keys(TASK_STATUS_LABELS) as (keyof typeof TASK_STATUS_LABELS)[]).map(s => {
            const c = stats.byStatus[s] ?? 0;
            const pct = stats.total ? Math.round((c / stats.total) * 100) : 0;
            return (
              <div key={s}>
                <div className="flex justify-between text-xs mb-1">
                  <span className={`px-1.5 py-0.5 rounded border ${TASK_STATUS_COLORS[s]}`}>{TASK_STATUS_LABELS[s]}</span>
                  <span className="text-muted-foreground">{c} · {pct}%</span>
                </div>
                <Progress value={pct} />
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-sm font-medium mb-3">Öncelik dağılımı</p>
        <div className="space-y-2">
          {(Object.keys(TASK_PRIORITY_LABELS) as (keyof typeof TASK_PRIORITY_LABELS)[]).map(p => {
            const c = stats.byPriority[p] ?? 0;
            const pct = stats.total ? Math.round((c / stats.total) * 100) : 0;
            return (
              <div key={p}>
                <div className="flex justify-between text-xs mb-1">
                  <span className={`px-1.5 py-0.5 rounded ${TASK_PRIORITY_COLORS[p]}`}>{TASK_PRIORITY_LABELS[p]}</span>
                  <span className="text-muted-foreground">{c} · {pct}%</span>
                </div>
                <Progress value={pct} />
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-5 md:col-span-2">
        <p className="text-sm font-medium mb-3">Üye iş yükü</p>
        {members.length === 0 ? (
          <p className="text-xs text-muted-foreground">Üye yok</p>
        ) : (
          <div className="space-y-2">
            {members.map(m => {
              const s = stats.byAssignee.get(m.user_id) ?? { count: 0, done: 0 };
              const pct = s.count ? Math.round((s.done / s.count) * 100) : 0;
              return (
                <div key={m.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{m.profile?.name ?? 'Kullanıcı'}</span>
                    <span className="text-muted-foreground">{s.done} / {s.count} tamam</span>
                  </div>
                  <Progress value={pct} />
                </div>
              );
            })}
            {stats.byAssignee.get(null) && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Atanmamış</span>
                  <span className="text-muted-foreground">{stats.byAssignee.get(null)!.count}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
