import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  TASK_STATUS_LABELS, TASK_STATUS_ORDER,
  type Task, type TaskStatus,
} from '@/lib/tasks-types';
import { TaskStatusIcon, TaskPriorityIcon } from './TaskStatusIcon';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  tasks: Task[];
  projectMap: Map<string, { name: string }>;
  className?: string;
}

/**
 * Native HTML5 DnD kanban — status başına 5 kolon. Kartı bırakınca
 * anlık supabase.update; başarısızsa toast + optimistic revert için
 * query invalidate. Kütüphane bağımlılığı yok.
 */
export function KanbanBoard({ tasks, projectMap, className }: Props) {
  const qc = useQueryClient();
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);

  const byStatus = useMemo(() => {
    const m = new Map<TaskStatus, Task[]>();
    for (const s of TASK_STATUS_ORDER) m.set(s, []);
    for (const t of tasks) {
      const list = m.get(t.status) ?? [];
      list.push(t);
      m.set(t.status, list);
    }
    return m;
  }, [tasks]);

  const onDrop = async (targetStatus: TaskStatus, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverCol(null);
    const taskId = e.dataTransfer.getData('text/task-id');
    const fromStatus = e.dataTransfer.getData('text/task-status') as TaskStatus | '';
    if (!taskId || fromStatus === targetStatus) return;
    try {
      const { error } = await supabase.from('tasks').update({ status: targetStatus }).eq('id', taskId);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['workspace-issues'] });
    } catch (err: any) {
      toast.error(err.message ?? 'Taşınamadı');
    }
  };

  return (
    <div className={cn('flex gap-3 overflow-x-auto pb-3', className)}>
      {TASK_STATUS_ORDER.map(s => {
        const items = byStatus.get(s) ?? [];
        const isDragOver = dragOverCol === s;
        return (
          <div
            key={s}
            onDragOver={(e) => { e.preventDefault(); setDragOverCol(s); }}
            onDragLeave={() => setDragOverCol(prev => prev === s ? null : prev)}
            onDrop={(e) => onDrop(s, e)}
            className={cn(
              'w-72 shrink-0 rounded-md border bg-secondary/10 flex flex-col',
              isDragOver ? 'border-primary/60 bg-primary/5' : 'border-border/60',
            )}
          >
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60">
              <TaskStatusIcon status={s} size={12} />
              <span className="text-[12.5px] font-medium">{TASK_STATUS_LABELS[s]}</span>
              <span className="ml-auto font-mono text-[11px] text-muted-foreground">{items.length}</span>
            </div>
            <div className="flex-1 min-h-[100px] p-2 space-y-1.5 overflow-y-auto max-h-[calc(100vh-260px)]">
              {items.length === 0 ? (
                <div className="text-[11px] text-muted-foreground/70 text-center py-4">boş</div>
              ) : items.map(t => <KanbanCard key={t.id} task={t} project={projectMap.get(t.project_id)} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({ task, project }: { task: Task; project?: { name: string } }) {
  const [dragging, setDragging] = useState(false);
  return (
    <Link
      to={`/projects/${task.project_id}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/task-id', task.id);
        e.dataTransfer.setData('text/task-status', task.status);
        e.dataTransfer.effectAllowed = 'move';
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      className={cn(
        'block rounded-md border border-border/60 bg-background hover:border-primary/40 transition-colors p-2 select-none cursor-grab active:cursor-grabbing',
        dragging && 'opacity-50',
      )}
    >
      <div className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
        <TaskPriorityIcon priority={task.priority} />
        <span className="font-mono">{task.tracking_id ?? '—'}</span>
        {task.story_points != null && (
          <span className="ml-auto font-mono rounded border border-border bg-secondary/40 px-1 text-muted-foreground/80">{task.story_points}sp</span>
        )}
      </div>
      <div className="mt-1 text-[13px] font-medium truncate">{task.title}</div>
      {project && (
        <div className="mt-0.5 text-[11px] text-muted-foreground truncate">{project.name}</div>
      )}
      {task.tags && task.tags.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {task.tags.slice(0, 3).map(tag => (
            <span key={tag} className="chip text-[9.5px]">{tag}</span>
          ))}
          {task.tags.length > 3 && (
            <span className="text-[10px] text-muted-foreground">+{task.tags.length - 3}</span>
          )}
        </div>
      )}
    </Link>
  );
}
