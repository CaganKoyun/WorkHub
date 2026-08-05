import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useMeetingNotes, useMeetingNote, useCreateMeetingNote, useUpdateMeetingNote,
  useDeleteMeetingNote, useConvertActionItemToTask, type MeetingNote,
} from '@/lib/meeting-notes-hooks';
import { extractMeetingNotes, type ExtractedActionItem } from '@/lib/meeting-extract';
import { useProjects } from '@/lib/projects-hooks';
import { useWorkspaceMembers } from '@/lib/chat-hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sparkles, Plus, Trash2, ArrowRight, Wand2, ChevronLeft, CheckCircle2, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ---- List ---------------------------------------------------------------

function NotesList() {
  const { data, isLoading } = useMeetingNotes();
  const del = useDeleteMeetingNote();
  const navigate = useNavigate();

  const doDelete = async (id: string, title: string) => {
    if (!confirm(`"${title}" toplantı notunu sil?`)) return;
    try { await del.mutateAsync(id); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-muted-foreground" /> Toplantı notları
          </h1>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            Ham transkripti yapıştır, özeti ve aksiyon maddelerini heuristik olarak çıkar.
            Her aksiyon maddesini tek tıkla task’a çevir.
          </p>
        </div>
        <Button size="sm" className="h-8 gap-1.5" onClick={() => navigate('/meetings/new')}>
          <Plus className="h-3.5 w-3.5" /> Yeni not
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : (data ?? []).length === 0 ? (
        <div className="rounded-md border border-dashed border-border/60 py-14 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-[13px] text-muted-foreground">Henüz toplantı notu yok.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data!.map(n => {
            const total = n.action_items.length;
            const done = n.action_items.filter(a => a.done || a.task_id).length;
            return (
              <div key={n.id} className="group rounded-md border border-border/60 bg-secondary/20 hover:bg-sidebar-accent/25 transition">
                <button onClick={() => navigate(`/meetings/${n.id}`)} className="block w-full text-left p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium truncate flex-1">{n.title}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(n.meeting_at).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="mt-1 text-[12px] text-muted-foreground line-clamp-2">{n.summary || '—'}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {total > 0 ? `${done}/${total} aksiyon tamamlandı` : 'Aksiyon yok'}
                  </div>
                </button>
                <div className="flex justify-end px-2 pb-2">
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100" onClick={() => doDelete(n.id, n.title)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---- Create form --------------------------------------------------------

function NewNote() {
  const create = useCreateMeetingNote();
  const { data: projects } = useProjects();
  const [title, setTitle] = useState('');
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [items, setItems] = useState<ExtractedActionItem[]>([]);
  const [projectId, setProjectId] = useState<string>('');
  const navigate = useNavigate();

  const runExtract = () => {
    if (!transcript.trim()) { toast.error('Önce transkripti yapıştır'); return; }
    const r = extractMeetingNotes(transcript);
    setSummary(r.summary);
    setItems(r.action_items);
    toast.success(`${r.action_items.length} aksiyon bulundu`);
  };

  const save = async () => {
    if (!title.trim()) { toast.error('Başlık zorunlu'); return; }
    try {
      const n = await create.mutateAsync({
        title: title.trim(),
        transcript,
        summary,
        action_items: items,
        project_id: projectId || null,
      });
      navigate(`/meetings/${n.id}`);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <button onClick={() => navigate('/meetings')} className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3.5 w-3.5" /> Toplantı notları
      </button>

      <div>
        <h1 className="text-[20px] font-semibold tracking-tight flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-muted-foreground" /> Yeni toplantı notu
        </h1>
      </div>

      <div className="grid gap-1.5">
        <Label>Başlık</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Örn: Q1 planlama · 2 Şubat" autoFocus />
      </div>

      <div className="grid gap-1.5">
        <Label>Ham transkript / notlar</Label>
        <textarea
          value={transcript} onChange={e => setTranscript(e.target.value)}
          rows={12}
          placeholder={'Toplantı transkriptini veya not döküntüsünü yapıştır. Örn:\n\n- TODO: Cagan mockup\'ları paylaşacak\n- Ayşe pazarlama planını hazırlayacak\n- We will ship v0.9 by Friday\n…'}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] font-mono"
        />
        <div className="flex justify-end">
          <Button size="sm" variant="secondary" className="h-8 gap-1.5" onClick={runExtract}>
            <Wand2 className="h-3.5 w-3.5" /> Aksiyonları çıkar
          </Button>
        </div>
      </div>

      {summary && (
        <div className="rounded-md border border-border/60 bg-secondary/20 p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Özet</div>
          <p className="text-[13px] leading-relaxed">{summary}</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-1.5">
          <Label>Aksiyon maddeleri ({items.length})</Label>
          <div className="rounded-md border border-border/60 divide-y divide-border/40 bg-background">
            {items.map((a, i) => (
              <div key={a.id} className="flex items-center gap-2 px-3 py-1.5">
                <input
                  value={a.text}
                  onChange={e => setItems(prev => prev.map((x, xi) => xi === i ? { ...x, text: e.target.value } : x))}
                  className="flex-1 bg-transparent text-[13px] focus:outline-none"
                />
                {a.assignee_email && (
                  <span className="text-[11px] text-primary/80 rounded border border-primary/40 px-1.5 py-0.5">{a.assignee_email}</span>
                )}
                <button onClick={() => setItems(prev => prev.filter((_, xi) => xi !== i))} className="text-destructive/70 hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-1.5">
        <Label>Task hedef projesi (opsiyonel)</Label>
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Proje seç…" /></SelectTrigger>
          <SelectContent>
            {(projects ?? []).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => navigate('/meetings')}>İptal</Button>
        <Button onClick={save} disabled={create.isPending}>Kaydet</Button>
      </div>
    </div>
  );
}

// ---- Detail (with action-item → task conversion) -------------------------

function NoteDetail({ id }: { id: string }) {
  const { data: note, isLoading } = useMeetingNote(id);
  const { data: projects } = useProjects();
  const { data: members } = useWorkspaceMembers();
  const update = useUpdateMeetingNote();
  const convert = useConvertActionItemToTask();
  const del = useDeleteMeetingNote();
  const navigate = useNavigate();

  const [projectId, setProjectId] = useState<string>('');

  const membersByEmail = useMemo(() => new Map<string, string>(), []); // email→user_id — profiles table lacks email

  if (isLoading) return <div className="p-6 space-y-3"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-40" /></div>;
  if (!note) return <div className="p-6 text-[13px] text-muted-foreground">Toplantı bulunamadı.</div>;

  const effectiveProjectId = projectId || note.project_id || '';

  const toggle = async (aid: string) => {
    const items = note.action_items.map(a => a.id === aid ? { ...a, done: !a.done } : a);
    await update.mutateAsync({ id: note.id, action_items: items });
  };

  const remove = async (aid: string) => {
    const items = note.action_items.filter(a => a.id !== aid);
    await update.mutateAsync({ id: note.id, action_items: items });
  };

  const toTask = async (item: typeof note.action_items[number]) => {
    const target = effectiveProjectId;
    if (!target) { toast.error('Önce hedef proje seç'); return; }
    try {
      const assigneeId = item.assignee_email ? membersByEmail.get(item.assignee_email) ?? null : null;
      const taskId = await convert.mutateAsync({ project_id: target, title: item.text, assignee_id: assigneeId });
      const items = note.action_items.map(a => a.id === item.id ? { ...a, task_id: taskId } : a);
      await update.mutateAsync({ id: note.id, action_items: items });
      toast.success('Task oluşturuldu');
    } catch (e: any) { toast.error(e.message); }
  };

  const doDelete = async () => {
    if (!confirm('Toplantı notunu sil?')) return;
    try { await del.mutateAsync(note.id); navigate('/meetings'); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <button onClick={() => navigate('/meetings')} className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3.5 w-3.5" /> Toplantı notları
      </button>

      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight">{note.title}</h1>
          <p className="text-[12px] text-muted-foreground">
            {new Date(note.meeting_at).toLocaleString('tr-TR')} · {note.action_items.length} aksiyon
          </p>
        </div>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={doDelete}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>

      {note.summary && (
        <div className="rounded-md border border-border/60 bg-secondary/20 p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Özet</div>
          <p className="text-[13px] leading-relaxed">{note.summary}</p>
        </div>
      )}

      <div className="grid gap-1.5">
        <Label>Task hedef projesi</Label>
        <Select value={effectiveProjectId} onValueChange={setProjectId}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Proje seç…" /></SelectTrigger>
          <SelectContent>
            {(projects ?? []).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <div className="text-[11.5px] uppercase tracking-wider text-muted-foreground mb-1.5">Aksiyon maddeleri</div>
        <div className="rounded-md border border-border/60 bg-background divide-y divide-border/40">
          {note.action_items.length === 0 && (
            <div className="px-3 py-6 text-center text-[12px] text-muted-foreground">Aksiyon yok.</div>
          )}
          {note.action_items.map(a => (
            <div key={a.id} className={cn('group flex items-center gap-2 px-3 py-2', a.done && 'opacity-60')}>
              <input type="checkbox" checked={a.done} onChange={() => toggle(a.id)} className="h-3.5 w-3.5 accent-primary" />
              <span className={cn('flex-1 text-[13px]', a.done && 'line-through text-muted-foreground')}>{a.text}</span>
              {a.assignee_email && <span className="text-[10.5px] text-primary/80 rounded border border-primary/40 px-1.5 py-0.5">{a.assignee_email}</span>}
              {a.task_id ? (
                <a href={`/tasks`} className="inline-flex items-center gap-1 text-[11px] text-emerald-400"><CheckCircle2 className="h-3 w-3" /> task oluştu <ExternalLink className="h-3 w-3" /></a>
              ) : (
                <Button size="sm" variant="ghost" className="h-6 gap-1 px-1.5 text-[11.5px]" onClick={() => toTask(a)}>
                  <ArrowRight className="h-3 w-3" /> Task’a çevir
                </Button>
              )}
              <button onClick={() => remove(a.id)} className="text-destructive/70 hover:text-destructive opacity-0 group-hover:opacity-100">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {note.transcript && (
        <details className="rounded-md border border-border/60 bg-secondary/10 px-3 py-2 text-[12.5px]">
          <summary className="cursor-pointer text-muted-foreground">Ham transkript</summary>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-[12.5px] leading-relaxed">{note.transcript}</pre>
        </details>
      )}
    </div>
  );
}

// ---- Router shim --------------------------------------------------------

export default function MeetingNotes() {
  const { id } = useParams<{ id?: string }>();
  if (id === 'new') return <NewNote />;
  if (id) return <NoteDetail id={id} />;
  return <NotesList />;
}
