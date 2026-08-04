import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useTaskComments, useAddTaskComment, useUpdateTask,
  useSubtasks, useTasks,
  useTaskDependencies, useAddTaskDependency, useRemoveTaskDependency,
} from '@/lib/tasks-hooks';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '@/lib/tasks-types';
import type { Task, TaskStatus } from '@/lib/tasks-types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, X, GitMerge, GitBranch, ListTree } from 'lucide-react';
import { toast } from 'sonner';
import { TaskStatusIcon, TaskPriorityIcon } from './TaskStatusIcon';

interface Member { user_id: string; profile?: { name: string | null } }

interface Props {
  task: Task;
  onOpenChange: (o: boolean) => void;
  members: Member[];
}

function LinkedTaskRow({
  otherId, otherTitle, otherTracking, otherStatus, otherProjectId, onRemove,
}: {
  otherId: string;
  otherTitle?: string | null;
  otherTracking?: string | null;
  otherStatus?: string | null;
  otherProjectId?: string | null;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border/60 bg-secondary/30 px-2 py-1.5 text-[12.5px]">
      {otherStatus && <TaskStatusIcon status={otherStatus as any} size={12} />}
      <span className="font-mono text-[10.5px] tabular-nums text-muted-foreground w-14">
        {otherTracking ?? 'WH-—'}
      </span>
      <Link
        to={otherProjectId ? `/projects/${otherProjectId}` : '/tasks'}
        className="flex-1 truncate hover:underline"
      >
        {otherTitle ?? '(silinmiş görev)'}
      </Link>
      <Button variant="ghost" size="icon" className="h-5 w-5 opacity-60 hover:opacity-100" onClick={onRemove}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

function AddDependencyPopover({
  currentTaskId, projectId, direction, onAdd,
}: {
  currentTaskId: string;
  projectId: string;
  direction: 'blocking' | 'blocked_by';
  onAdd: (otherId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { data: siblings } = useTasks(projectId);

  const candidates = (siblings ?? [])
    .filter(t => t.id !== currentTaskId)
    .filter(t => !query || t.title.toLowerCase().includes(query.toLowerCase()) || (t.tracking_id ?? '').toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 text-[11px] gap-1">
          <Plus className="h-3 w-3" /> Ekle
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={`${direction === 'blocking' ? 'Blokladığın' : 'Seni bloklayan'} görev ara…`}
          className="w-full h-8 px-2 rounded-md bg-secondary text-[12px] outline-none border border-transparent focus:border-border"
          autoFocus
        />
        <div className="mt-2 max-h-56 overflow-y-auto space-y-0.5">
          {candidates.length === 0 && (
            <p className="text-center text-[11px] text-muted-foreground py-4">Sonuç yok</p>
          )}
          {candidates.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => { onAdd(t.id); setOpen(false); setQuery(''); }}
              className="w-full flex items-center gap-2 rounded-md px-1.5 py-1 text-left text-[12px] hover:bg-sidebar-accent/60"
            >
              <TaskStatusIcon status={t.status} size={12} />
              <span className="font-mono text-[10.5px] tabular-nums text-muted-foreground w-14">{t.tracking_id ?? 'WH-—'}</span>
              <span className="flex-1 truncate">{t.title}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function TaskDetailDialog({ task, onOpenChange, members }: Props) {
  const { data: comments } = useTaskComments(task.id);
  const addComment = useAddTaskComment();
  const updateTask = useUpdateTask();
  const { data: subtasks } = useSubtasks(task.id);
  const { data: deps } = useTaskDependencies(task.id);
  const addDep = useAddTaskDependency();
  const removeDep = useRemoveTaskDependency();
  const { currentWorkspace } = useWorkspace();
  const [body, setBody] = useState('');

  const memberMap = new Map(members.map(m => [m.user_id, m.profile?.name ?? 'Kullanıcı']));

  const handleAdd = async () => {
    if (!body.trim()) return;
    try {
      await addComment.mutateAsync({ task_id: task.id, body: body.trim() });
      setBody('');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleStatus = (s: TaskStatus) => updateTask.mutate({ id: task.id, status: s });

  const handleAddDep = async (otherId: string, direction: 'blocking' | 'blocked_by') => {
    if (!currentWorkspace) return;
    try {
      await addDep.mutateAsync({
        workspace_id: currentWorkspace.id,
        blocking_task_id: direction === 'blocking' ? task.id : otherId,
        blocked_task_id: direction === 'blocking' ? otherId : task.id,
      });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{task.tracking_id ?? 'WH-—'}</span>
            <TaskStatusIcon status={task.status} size={12} />
            <span className="text-[12px] text-muted-foreground">{TASK_STATUS_LABELS[task.status]}</span>
          </div>
          <DialogTitle className="text-[18px]">{task.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Attributes bar */}
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={task.status} onValueChange={v => handleStatus(v as TaskStatus)}>
              <SelectTrigger className="w-36 h-7 text-[12px]">
                <div className="flex items-center gap-1.5">
                  <TaskStatusIcon status={task.status} size={12} />
                  {TASK_STATUS_LABELS[task.status]}
                </div>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map(s => (
                  <SelectItem key={s} value={s}>
                    <div className="flex items-center gap-1.5">
                      <TaskStatusIcon status={s} size={12} />
                      {TASK_STATUS_LABELS[s]}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="inline-flex items-center gap-1.5 chip">
              <TaskPriorityIcon priority={task.priority} size={11} />
              {TASK_PRIORITY_LABELS[task.priority]}
            </span>
            {task.due_date && <Badge variant="outline" className="text-[11px] gap-1">📅 {task.due_date}</Badge>}
            {task.assignee_id && (
              <span className="inline-flex items-center gap-1.5 chip">
                <Avatar className="h-4 w-4">
                  <AvatarFallback className="text-[8px] bg-sidebar-accent">
                    {(memberMap.get(task.assignee_id) ?? '?')[0]}
                  </AvatarFallback>
                </Avatar>
                {memberMap.get(task.assignee_id)}
              </span>
            )}
          </div>

          {task.description && (
            <div className="rounded-md border border-border/60 bg-secondary/30 p-3 text-[13px] whitespace-pre-wrap">
              {task.description}
            </div>
          )}

          {task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {task.tags.map(t => (
                <span key={t} className="rounded border border-border bg-secondary/40 px-1.5 py-0.5 text-[10.5px] text-muted-foreground">
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Sub-tasks */}
          <section>
            <h4 className="mb-2 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
              <ListTree className="h-3 w-3" /> Alt görevler ({subtasks?.length ?? 0})
            </h4>
            {subtasks && subtasks.length > 0 ? (
              <div className="space-y-1">
                {subtasks.map(s => (
                  <div key={s.id} className="flex items-center gap-2 rounded-md border border-border/60 bg-secondary/20 px-2 py-1.5 text-[12.5px]">
                    <TaskStatusIcon status={s.status} size={12} />
                    <span className="font-mono text-[10.5px] tabular-nums text-muted-foreground w-14">{s.tracking_id ?? 'WH-—'}</span>
                    <Link to={`/projects/${s.project_id}`} className="flex-1 truncate hover:underline">{s.title}</Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-muted-foreground/70">Yok</p>
            )}
          </section>

          {/* Dependencies */}
          <section className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <GitBranch className="h-3 w-3" /> Blokluyor ({deps?.blocking.length ?? 0})
                </h4>
                <AddDependencyPopover
                  currentTaskId={task.id}
                  projectId={task.project_id}
                  direction="blocking"
                  onAdd={(id) => handleAddDep(id, 'blocking')}
                />
              </div>
              <div className="space-y-1">
                {(deps?.blocking ?? []).map(edge => (
                  <LinkedTaskRow
                    key={edge.id}
                    otherId={edge.other?.id ?? ''}
                    otherTitle={edge.other?.title}
                    otherTracking={edge.other?.tracking_id}
                    otherStatus={edge.other?.status}
                    otherProjectId={edge.other?.project_id}
                    onRemove={() => removeDep.mutate({ id: edge.id, blocked_task_id: task.id, blocking_task_id: task.id })}
                  />
                ))}
                {(deps?.blocking.length ?? 0) === 0 && (
                  <p className="text-[12px] text-muted-foreground/70">Yok</p>
                )}
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <GitMerge className="h-3 w-3" /> Bloklanıyor ({deps?.blockedBy.length ?? 0})
                </h4>
                <AddDependencyPopover
                  currentTaskId={task.id}
                  projectId={task.project_id}
                  direction="blocked_by"
                  onAdd={(id) => handleAddDep(id, 'blocked_by')}
                />
              </div>
              <div className="space-y-1">
                {(deps?.blockedBy ?? []).map(edge => (
                  <LinkedTaskRow
                    key={edge.id}
                    otherId={edge.other?.id ?? ''}
                    otherTitle={edge.other?.title}
                    otherTracking={edge.other?.tracking_id}
                    otherStatus={edge.other?.status}
                    otherProjectId={edge.other?.project_id}
                    onRemove={() => removeDep.mutate({ id: edge.id, blocked_task_id: task.id, blocking_task_id: task.id })}
                  />
                ))}
                {(deps?.blockedBy.length ?? 0) === 0 && (
                  <p className="text-[12px] text-muted-foreground/70">Yok</p>
                )}
              </div>
            </div>
          </section>

          {/* Comments */}
          <section>
            <h4 className="mb-2 text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
              Yorumlar ({comments?.length ?? 0})
            </h4>
            <div className="space-y-2">
              {(comments ?? []).map(c => (
                <div key={c.id} className="flex gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[9px] bg-sidebar-accent">
                      {(memberMap.get(c.author_id) ?? '?')[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 rounded-md border border-border/60 bg-card p-2">
                    <p className="text-[11.5px] font-medium">{memberMap.get(c.author_id) ?? 'Kullanıcı'}</p>
                    <p className="text-[13px] whitespace-pre-wrap">{c.body}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(c.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Yorum yaz…" rows={2} className="text-[13px]" />
              <Button size="sm" onClick={handleAdd} disabled={!body.trim() || addComment.isPending}>Gönder</Button>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
