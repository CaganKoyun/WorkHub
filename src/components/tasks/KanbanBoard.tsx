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
import { MessageSquare, Paperclip, ListTree } from 'lucide-react';
import { tagStyle } from '@/lib/tag-color';
import { ProjectDot } from '@/components/ProjectDot';
import { useTaskCounts, type TaskCounts } from '@/lib/task-counts-hook';

interface Props {
  tasks: Task[];
  projectMap: Map<string, { name: string; color?: string | null }>;
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

  const taskIds = useMemo(() => tasks.map(t => t.id), [tasks]);
  const { data: counts } = useTaskCounts(taskIds);

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
              ) : items.map(t => (
                <KanbanCard
                  key={t.id}
                  task={t}
                  project={projectMap.get(t.project_id)}
                  counts={counts?.[t.id]}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({
  task, project, counts,
}: {
  task: Task;
  project?: { name: string; color?: string | null };
  counts?: TaskCounts;
}) {
  const [dragging, setDragging] = useState(false);
  const hasMeta = counts && (counts.subtasks || counts.comments || counts.attachments);
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
      {task.tags && task.tags.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {task.tags.slice(0, 3).map(tag => {
            const s = tagStyle(tag);
            return (
              <span
                key={tag}
                className="inline-flex h-4 items-center rounded-full px-1.5 text-[9.5px] font-medium ring-1"
                style={{ backgroundColor: s.bg, color: s.fg, boxShadow: `inset 0 0 0 1px ${s.ring}` }}
              >
                {tag}
              </span>
            );
          })}
          {task.tags.length > 3 && (
            <span className="text-[10px] text-muted-foreground">+{task.tags.length - 3}</span>
          )}
        </div>
      )}

      <div className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
        <TaskPriorityIcon priority={task.priority} />
        <span className="font-mono">{task.tracking_id ?? '—'}</span>
        {task.story_points != null && (
          <span className="ml-auto font-mono rounded border border-border bg-secondary/40 px-1 text-muted-foreground/80">{task.story_points}sp</span>
        )}
      </div>

      <div className="mt-1 text-[13px] font-medium leading-snug">
        <span className="line-clamp-2">{task.title}</span>
      </div>

      {project && (
        <div className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <ProjectDot color={project.color} name={project.name} size={7} />
          <span className="truncate">{project.name}</span>
        </div>
      )}

      {hasMeta && (
        <div className="mt-1.5 flex items-center gap-2 border-t border-border/40 pt-1.5 text-[10.5px] text-muted-foreground/80">
          {counts!.subtasks > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <ListTree className="h-3 w-3" /> {counts!.subtasks}
            </span>
          )}
          {counts!.comments > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <MessageSquare className="h-3 w-3" /> {counts!.comments}
            </span>
          )}
          {counts!.attachments > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <Paperclip className="h-3 w-3" /> {counts!.attachments}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
