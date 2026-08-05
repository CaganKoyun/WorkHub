import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Zap, FolderKanban, UserRound, Flag, Send, Tag as TagIcon, AlertCircle,
} from 'lucide-react';
import { useProjects } from '@/lib/projects-hooks';
import { useWorkspaceMembers } from '@/lib/chat-hooks';
import { useCreateTask } from '@/lib/tasks-hooks';
import { parseQuickAdd, type PriorityToken } from '@/lib/quick-add-parse';
import { TASK_PRIORITY_LABELS } from '@/lib/tasks-types';
import type { TaskPriority } from '@/lib/tasks-types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

function resolveByName<T extends { name?: string; full_name?: string | null; user_id?: string; id?: string }>(
  hint: string | null, list: T[], nameField: 'name' | 'full_name',
): T | null {
  if (!hint) return null;
  const h = hint.toLowerCase();
  return list.find(x => {
    const n = ((x as unknown as Record<string, string | null>)[nameField] ?? '').toLowerCase();
    return n === h
      || n.split(/\s+/)[0] === h
      || n.replace(/\s+/g, '') === h.replace(/\s+/g, '')
      || (nameField === 'name' && n.startsWith(h));
  }) ?? null;
}

/**
 * Linear-tarzı tek satır issue creator. C tuşu açar. Enter oluşturur.
 * Parse edilmiş tokens input'un altında gösterilir; kullanıcı override
 * için proje / atanan / öncelik dropdown'larıyla düzeltebilir.
 */
export function QuickAddIssue({ open, onOpenChange }: Props) {
  const { data: projects } = useProjects();
  const { data: members } = useWorkspaceMembers();
  const create = useCreateTask();
  const navigate = useNavigate();
  const [raw, setRaw] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dirty, setDirty] = useState<{ project: boolean; assignee: boolean; priority: boolean }>({ project: false, assignee: false, priority: false });
  const inputRef = useRef<HTMLInputElement | null>(null);

  const parsed = useMemo(() => parseQuickAdd(raw), [raw]);

  useEffect(() => {
    if (!open) {
      setRaw(''); setDirty({ project: false, assignee: false, priority: false });
      setAssigneeId(''); setPriority('medium');
      return;
    }
    setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  // Auto-apply parsed hints unless the user has manually overridden.
  useEffect(() => {
    if (!dirty.project) {
      const hit = resolveByName(parsed.projectHint, projects ?? [], 'name');
      if (hit) setProjectId(hit.id);
      else if (!projectId && (projects ?? []).length > 0) setProjectId((projects ?? [])[0].id);
    }
    if (!dirty.assignee) {
      const hit = resolveByName(parsed.assigneeHint, members ?? [], 'full_name');
      if (hit) setAssigneeId(hit.user_id!);
      else if (!parsed.assigneeHint) setAssigneeId('');
    }
    if (!dirty.priority && parsed.priority) {
      setPriority(parsed.priority);
    }
  }, [parsed.projectHint, parsed.assigneeHint, parsed.priority, projects, members]);

  const canSubmit = parsed.title.trim().length > 0 && projectId !== '';

  const submit = async () => {
    if (!canSubmit) return;
    try {
      const task = await create.mutateAsync({
        project_id: projectId,
        title: parsed.title,
        priority,
        assignee_id: assigneeId || null,
        tags: parsed.tags.length ? parsed.tags : undefined,
      });
      toast.success(`${task.tracking_id ?? 'Task'} oluşturuldu`);
      onOpenChange(false);
      // Detay yerine liste — kullanıcı hızlı arka arkaya birden çok task
      // ekleyebilir; navigate opsiyonel.
    } catch (e: any) { toast.error(e.message); }
  };

  const projectHintMatched = parsed.projectHint && projects?.some(p => p.name.toLowerCase().includes(parsed.projectHint!.toLowerCase()));
  const assigneeHintMatched = parsed.assigneeHint && members?.some(m => (m.full_name ?? '').toLowerCase().includes(parsed.assigneeHint!.toLowerCase()));

  const priorityHintUnmatched = parsed.priority && parsed.priority !== priority;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5">
          <Zap className="h-4 w-4 text-primary shrink-0" />
          <input
            ref={inputRef}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canSubmit) { e.preventDefault(); submit(); }
              if (e.key === 'Escape') onOpenChange(false);
            }}
            placeholder="Yeni issue — #project @user !priority destekli"
            className="flex-1 bg-transparent text-[14px] focus:outline-none"
          />
          <Button size="sm" className="h-7 gap-1.5" onClick={submit} disabled={!canSubmit || create.isPending}>
            <Send className="h-3 w-3" /> Enter
          </Button>
        </div>

        {/* Parsed hints preview */}
        {(parsed.projectHint || parsed.assigneeHint || parsed.priority || parsed.tags.length > 0) && (
          <div className="flex items-center gap-1.5 flex-wrap px-3 py-2 border-b border-border/40 bg-secondary/10 text-[11.5px]">
            {parsed.projectHint && (
              <span className={cn('chip inline-flex items-center gap-1',
                projectHintMatched ? 'accent' : 'warn')}>
                <FolderKanban className="h-3 w-3" /> {parsed.projectHint}
                {!projectHintMatched && <AlertCircle className="h-3 w-3" />}
              </span>
            )}
            {parsed.assigneeHint && (
              <span className={cn('chip inline-flex items-center gap-1',
                assigneeHintMatched ? 'accent' : 'warn')}>
                <UserRound className="h-3 w-3" /> {parsed.assigneeHint}
                {!assigneeHintMatched && <AlertCircle className="h-3 w-3" />}
              </span>
            )}
            {parsed.priority && (
              <span className={cn('chip inline-flex items-center gap-1',
                priorityHintUnmatched ? 'warn' : 'accent')}>
                <Flag className="h-3 w-3" /> {TASK_PRIORITY_LABELS[parsed.priority]}
              </span>
            )}
            {parsed.tags.map(t => (
              <span key={t} className="chip inline-flex items-center gap-1">
                <TagIcon className="h-3 w-3" /> {t}
              </span>
            ))}
          </div>
        )}

        {/* Override row */}
        <div className="flex items-center gap-1.5 flex-wrap px-3 py-2 text-[11.5px] text-muted-foreground">
          <span className="text-[10px] uppercase tracking-wider">Ayarla:</span>

          <Select
            value={projectId}
            onValueChange={(v) => { setProjectId(v); setDirty(d => ({ ...d, project: true })); }}
          >
            <SelectTrigger className="h-7 w-40 text-[11.5px] gap-1">
              <FolderKanban className="h-3 w-3" /> <SelectValue placeholder="Proje…" />
            </SelectTrigger>
            <SelectContent>
              {(projects ?? []).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select
            value={assigneeId || '__u'}
            onValueChange={(v) => { setAssigneeId(v === '__u' ? '' : v); setDirty(d => ({ ...d, assignee: true })); }}
          >
            <SelectTrigger className="h-7 w-40 text-[11.5px] gap-1">
              <UserRound className="h-3 w-3" /> <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__u">Atama yok</SelectItem>
              {(members ?? []).map(m => (
                <SelectItem key={m.user_id} value={m.user_id}>{m.full_name ?? m.user_id.slice(0, 8)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={priority}
            onValueChange={(v) => { setPriority(v as TaskPriority); setDirty(d => ({ ...d, priority: true })); }}
          >
            <SelectTrigger className="h-7 w-28 text-[11.5px] gap-1">
              <Flag className="h-3 w-3" /> <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(['low', 'medium', 'high', 'urgent'] as PriorityToken[]).map(p => (
                <SelectItem key={p} value={p}>{TASK_PRIORITY_LABELS[p as TaskPriority]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            type="button"
            className="ml-auto text-[11px] text-muted-foreground hover:text-foreground"
            onClick={() => {
              onOpenChange(false);
              navigate('/tasks?new=1');
            }}
            title="Detaylı form aç"
          >Detay…</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
