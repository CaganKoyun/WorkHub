import { useEffect, useState } from 'react';
import { useCreateTask, useUpdateTask, useTasks } from '@/lib/tasks-hooks';
import { useCycles } from '@/lib/cycles-hooks';
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, RECURRENCE_LABELS } from '@/lib/tasks-types';
import type { Task, TaskStatus, TaskPriority, RecurrenceFreq, TaskRecurrence } from '@/lib/tasks-types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Member { user_id: string; profile?: { name: string | null } }

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
  task: Task | null;
  members: Member[];
  /** If set, the created task will be inserted as a sub-task of this parent. */
  defaultParentId?: string | null;
}

export function TaskFormDialog({ open, onOpenChange, projectId, task, members, defaultParentId }: Props) {
  const create = useCreateTask();
  const update = useUpdateTask();
  const { data: siblings } = useTasks(projectId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assigneeId, setAssigneeId] = useState<string>('none');
  const [dueDate, setDueDate] = useState('');
  const [estimated, setEstimated] = useState('');
  const [tags, setTags] = useState('');
  const [parentId, setParentId] = useState<string>('none');
  const [cycleId, setCycleId] = useState<string>('none');
  const [points, setPoints] = useState('');
  const [recurrenceOn, setRecurrenceOn] = useState(false);
  const [recFreq, setRecFreq] = useState<RecurrenceFreq>('weekly');
  const [recInterval, setRecInterval] = useState('1');
  const { data: cycles } = useCycles();

  useEffect(() => {
    if (open) {
      setTitle(task?.title ?? '');
      setDescription(task?.description ?? '');
      setStatus(task?.status ?? 'todo');
      setPriority(task?.priority ?? 'medium');
      setAssigneeId(task?.assignee_id ?? 'none');
      setDueDate(task?.due_date ?? '');
      setEstimated(task?.estimated_hours?.toString() ?? '');
      setTags((task?.tags ?? []).join(', '));
      setParentId(task?.parent_task_id ?? defaultParentId ?? 'none');
      setCycleId(task?.cycle_id ?? 'none');
      setPoints(task?.story_points?.toString() ?? '');
      setRecurrenceOn(!!task?.recurrence);
      setRecFreq((task?.recurrence?.freq ?? 'weekly') as RecurrenceFreq);
      setRecInterval(String(task?.recurrence?.interval ?? 1));
    }
  }, [open, task, defaultParentId]);

  const parentOptions = (siblings ?? []).filter(t => !task || t.id !== task.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error('Başlık gerekli'); return; }
    const payload = {
      title: title.trim(),
      description: description || null,
      status, priority,
      assignee_id: assigneeId === 'none' ? null : assigneeId,
      due_date: dueDate || null,
      estimated_hours: estimated ? Number(estimated) : null,
      tags: tags.split(',').map(s => s.trim()).filter(Boolean),
      parent_task_id: parentId === 'none' ? null : parentId,
      cycle_id: cycleId === 'none' ? null : cycleId,
      story_points: points ? Number(points) : null,
      recurrence: recurrenceOn ? ({
        freq: recFreq,
        interval: Math.max(1, Number(recInterval) || 1),
      } satisfies TaskRecurrence) : null,
    };
    try {
      if (task) await update.mutateAsync({ id: task.id, ...payload });
      else await create.mutateAsync({ project_id: projectId, ...payload });
      toast.success(task ? 'Görev güncellendi' : 'Görev oluşturuldu');
      onOpenChange(false);
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{task ? 'Görevi düzenle' : 'Yeni görev'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Başlık *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} required autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Açıklama</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Durum</Label>
              <Select value={status} onValueChange={v => setStatus(v as TaskStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map(s => (
                    <SelectItem key={s} value={s}>{TASK_STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Öncelik</Label>
              <Select value={priority} onValueChange={v => setPriority(v as TaskPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TASK_PRIORITY_LABELS) as TaskPriority[]).map(p => (
                    <SelectItem key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Atanan kişi</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Kimse</SelectItem>
                {members.map(m => (
                  <SelectItem key={m.user_id} value={m.user_id}>{m.profile?.name ?? 'Kullanıcı'}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Bitiş tarihi</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tahmini (saat)</Label>
              <Input type="number" step="0.5" value={estimated} onChange={e => setEstimated(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Etiketler (virgülle)</Label>
            <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="frontend, bug, ui" />
          </div>
          <div className="space-y-2">
            <Label>Üst görev (opsiyonel)</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Yok (üst düzey görev)</SelectItem>
                {parentOptions.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="font-mono text-[11px] text-muted-foreground mr-1.5">{p.tracking_id ?? 'WH-—'}</span>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Cycle</Label>
              <Select value={cycleId} onValueChange={setCycleId}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Cycle yok</SelectItem>
                  {(cycles ?? []).map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="font-mono text-[11px] text-muted-foreground mr-1.5">#{c.number}</span>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Story points</Label>
              <Input type="number" step="0.5" min="0" value={points} onChange={e => setPoints(e.target.value)} placeholder="3" />
            </div>
          </div>
          <div className="space-y-2 rounded-md border border-border/60 p-3">
            <label className="flex items-center gap-2 text-[13px] font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={recurrenceOn}
                onChange={e => setRecurrenceOn(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              Tekrarlanan görev
            </label>
            {recurrenceOn && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <Label className="text-[11px] text-muted-foreground">Sıklık</Label>
                  <Select value={recFreq} onValueChange={v => setRecFreq(v as RecurrenceFreq)}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(['daily','weekly','monthly','yearly'] as RecurrenceFreq[]).map(f => (
                        <SelectItem key={f} value={f}>{RECURRENCE_LABELS[f]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Her N {RECURRENCE_LABELS[recFreq].toLowerCase()}</Label>
                  <Input type="number" min="1" max="365" value={recInterval} onChange={e => setRecInterval(e.target.value)} className="h-8" />
                </div>
              </div>
            )}
            {recurrenceOn && (
              <p className="text-[11px] text-muted-foreground pt-1">
                Task "Tamamlandı" olarak işaretlendiğinde bir sonraki tekrarı otomatik oluşur.
              </p>
            )}
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={create.isPending || update.isPending}>Kaydet</Button>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>İptal</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
