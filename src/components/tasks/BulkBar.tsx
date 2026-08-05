import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  TASK_STATUS_LABELS, TASK_STATUS_ORDER, TASK_PRIORITY_LABELS,
  type TaskStatus, type TaskPriority,
} from '@/lib/tasks-types';
import { useWorkspaceMembers } from '@/lib/chat-hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, X, Tag, User, Circle, Flag, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  selectedIds: string[];
  onClear: () => void;
  className?: string;
}

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

async function bulkUpdate(ids: string[], patch: Record<string, unknown>) {
  const { error } = await supabase.from('tasks').update(patch).in('id', ids);
  if (error) throw error;
}

async function bulkAddTag(ids: string[], tag: string) {
  // Postgres array_append yerine per-row read+write; küçük seçim için yeter.
  const { data, error } = await supabase.from('tasks').select('id, tags').in('id', ids);
  if (error) throw error;
  let updated = 0;
  for (const row of (data ?? []) as { id: string; tags: string[] | null }[]) {
    const cur = row.tags ?? [];
    if (cur.includes(tag)) continue;
    const { error: upErr } = await supabase.from('tasks').update({ tags: [...cur, tag] }).eq('id', row.id);
    if (!upErr) updated += 1;
  }
  return updated;
}

/**
 * Bir veya daha fazla task seçildiğinde ekranın altına yapışan bulk bar.
 * Status / priority / assignee dropdown'ları anında uygular; tag ve delete
 * için ayrı popover / confirm akışı var.
 */
export function BulkBar({ selectedIds, onClear, className }: Props) {
  const qc = useQueryClient();
  const { data: members } = useWorkspaceMembers();
  const [busy, setBusy] = useState(false);
  const [tag, setTag] = useState('');
  const [tagOpen, setTagOpen] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['workspace-issues'] });
    qc.invalidateQueries({ queryKey: ['my-tasks'] });
  };

  const run = async (label: string, fn: () => Promise<void | number>) => {
    setBusy(true);
    try {
      const detail = await fn();
      invalidate();
      const suffix = typeof detail === 'number' ? ` (${detail})` : '';
      toast.success(`${label}${suffix}`);
    } catch (e: any) {
      toast.error(e.message ?? 'Başarısız');
    } finally {
      setBusy(false);
    }
  };

  const setStatus = (s: TaskStatus) =>
    run(`${selectedIds.length} task → durum ${TASK_STATUS_LABELS[s]}`, () => bulkUpdate(selectedIds, { status: s }));

  const setPriority = (p: TaskPriority) =>
    run(`${selectedIds.length} task → öncelik ${TASK_PRIORITY_LABELS[p]}`, () => bulkUpdate(selectedIds, { priority: p }));

  const setAssignee = (uid: string | null) =>
    run(`${selectedIds.length} task → ${uid ? 'atandı' : 'atama kaldırıldı'}`,
        () => bulkUpdate(selectedIds, { assignee_id: uid }));

  const addTag = async () => {
    const t = tag.trim();
    if (!t) return;
    await run(`"${t}" etiketi eklendi`, () => bulkAddTag(selectedIds, t));
    setTag('');
    setTagOpen(false);
  };

  const doDelete = async () => {
    if (!confirm(`${selectedIds.length} task'ı silmek istediğine emin misin?`)) return;
    await run(`${selectedIds.length} task silindi`, async () => {
      const { error } = await supabase.from('tasks').delete().in('id', selectedIds);
      if (error) throw error;
      onClear();
    });
  };

  return (
    <div className={cn(
      'fixed inset-x-2 bottom-3 z-40 flex max-w-full items-center gap-2 overflow-x-auto rounded-lg border border-border/60 bg-surface px-3 py-2 shadow-2xl scrollbar-thin',
      'sm:inset-x-auto sm:left-1/2 sm:bottom-4 sm:max-w-none sm:-translate-x-1/2 sm:overflow-visible',
      'animate-in slide-in-from-bottom-2',
      busy && 'opacity-70 pointer-events-none',
      className,
    )}>
      <span className="flex items-center gap-1.5 pr-2 border-r border-border/60 text-[12.5px]">
        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
        <strong className="font-medium">{selectedIds.length}</strong> seçili
      </span>

      <Select onValueChange={v => setStatus(v as TaskStatus)}>
        <SelectTrigger className="h-7 w-32 text-[12px] gap-1">
          <Circle className="h-3 w-3" /> <SelectValue placeholder="Durum" />
        </SelectTrigger>
        <SelectContent>
          {TASK_STATUS_ORDER.map(s => <SelectItem key={s} value={s}>{TASK_STATUS_LABELS[s]}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select onValueChange={v => setPriority(v as TaskPriority)}>
        <SelectTrigger className="h-7 w-28 text-[12px] gap-1">
          <Flag className="h-3 w-3" /> <SelectValue placeholder="Öncelik" />
        </SelectTrigger>
        <SelectContent>
          {PRIORITIES.map(p => <SelectItem key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select onValueChange={v => setAssignee(v === '__u' ? null : v)}>
        <SelectTrigger className="h-7 w-36 text-[12px] gap-1">
          <User className="h-3 w-3" /> <SelectValue placeholder="Atanan" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__u">Atama kaldır</SelectItem>
          {(members ?? []).map(m => (
            <SelectItem key={m.user_id} value={m.user_id}>{m.full_name ?? m.user_id.slice(0, 8)}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {tagOpen ? (
        <div className="flex items-center gap-1">
          <Input
            autoFocus
            value={tag}
            onChange={e => setTag(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addTag(); if (e.key === 'Escape') { setTagOpen(false); setTag(''); } }}
            placeholder="etiket…"
            className="h-7 w-28 text-[12px]"
          />
          <Button size="sm" className="h-7 text-[11.5px]" onClick={addTag}>Ekle</Button>
        </div>
      ) : (
        <Button size="sm" variant="ghost" className="h-7 text-[12px] gap-1" onClick={() => setTagOpen(true)}>
          <Tag className="h-3 w-3" /> Etiket
        </Button>
      )}

      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={doDelete} title="Seçilenleri sil">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>

      <span className="mx-1 h-4 w-px bg-border" />

      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClear} title="Seçimi temizle (Esc)">
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
