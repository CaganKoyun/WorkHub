import { useState } from 'react';
import { useTaskComments, useAddTaskComment, useUpdateTask } from '@/lib/tasks-hooks';
import {
  TASK_STATUS_COLORS, TASK_STATUS_LABELS,
  TASK_PRIORITY_COLORS, TASK_PRIORITY_LABELS,
} from '@/lib/tasks-types';
import type { Task, TaskStatus } from '@/lib/tasks-types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';

interface Member { user_id: string; profile?: { name: string | null } }

interface Props {
  task: Task;
  onOpenChange: (o: boolean) => void;
  members: Member[];
}

export function TaskDetailDialog({ task, onOpenChange, members }: Props) {
  const { data: comments } = useTaskComments(task.id);
  const addComment = useAddTaskComment();
  const updateTask = useUpdateTask();
  const [body, setBody] = useState('');

  const memberMap = new Map(members.map(m => [m.user_id, m.profile?.name ?? 'Kullanıcı']));

  const handleAdd = async () => {
    if (!body.trim()) return;
    try {
      await addComment.mutateAsync({ task_id: task.id, body: body.trim() });
      setBody('');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleStatus = (s: TaskStatus) => {
    updateTask.mutate({ id: task.id, status: s });
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{task.title}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Select value={task.status} onValueChange={v => handleStatus(v as TaskStatus)}>
              <SelectTrigger className="w-40 h-8">
                <Badge className={`text-xs border ${TASK_STATUS_COLORS[task.status]}`}>{TASK_STATUS_LABELS[task.status]}</Badge>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map(s => (
                  <SelectItem key={s} value={s}>{TASK_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge className={`text-xs ${TASK_PRIORITY_COLORS[task.priority]}`}>{TASK_PRIORITY_LABELS[task.priority]}</Badge>
            {task.due_date && <Badge variant="outline" className="text-xs">📅 {task.due_date}</Badge>}
            {task.assignee_id && <Badge variant="outline" className="text-xs">👤 {memberMap.get(task.assignee_id)}</Badge>}
          </div>
          {task.description && (
            <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">{task.description}</div>
          )}
          {task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {task.tags.map(t => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
            </div>
          )}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Yorumlar ({comments?.length ?? 0})</h4>
            <div className="space-y-2">
              {(comments ?? []).map(c => (
                <div key={c.id} className="flex gap-2">
                  <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px]">{(memberMap.get(c.author_id) ?? '?')[0]}</AvatarFallback></Avatar>
                  <div className="flex-1 rounded-md border bg-card p-2">
                    <p className="text-xs font-medium">{memberMap.get(c.author_id) ?? 'Kullanıcı'}</p>
                    <p className="text-sm whitespace-pre-wrap">{c.body}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(c.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Yorum yaz..." rows={2} />
              <Button onClick={handleAdd} disabled={!body.trim() || addComment.isPending}>Gönder</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
