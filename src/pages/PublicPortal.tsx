import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  usePortalGrant, usePortalProjects, usePortalTasks, usePortalTaskComments,
  usePortalPostComment, type PortalTask,
} from '@/lib/client-portal-hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  UserRound, FolderKanban, XCircle, MessageCircle, ChevronRight, Send, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_LABEL: Record<string, string> = {
  backlog: 'Backlog', todo: 'Yapılacak', in_progress: 'Devam ediyor',
  review: 'İncelemede', done: 'Tamamlandı',
};
const STATUS_TONE: Record<string, string> = {
  backlog: 'text-muted-foreground bg-secondary/40',
  todo: 'text-muted-foreground bg-secondary/40',
  in_progress: 'text-blue-300 bg-blue-500/15',
  review: 'text-purple-300 bg-purple-500/15',
  done: 'text-emerald-400 bg-emerald-500/15',
};
const PRIO_LABEL: Record<string, string> = {
  low: 'Düşük', medium: 'Orta', high: 'Yüksek', urgent: 'Acil',
};

// ---- Task detail pane ---------------------------------------------------

function TaskPane({ token, task, canComment, guestEmail }: {
  token: string; task: PortalTask; canComment: boolean; guestEmail: string;
}) {
  const { data: comments, isLoading: cLoading } = usePortalTaskComments(token, task.id);
  const post = usePortalPostComment();
  const [body, setBody] = useState('');
  const [name, setName] = useState('');

  const send = async () => {
    if (!body.trim()) return;
    try {
      await post.mutateAsync({ token, task_id: task.id, body: body.trim(), guest_name: name.trim() || undefined });
      setBody('');
      toast.success('Yorum gönderildi');
    } catch (e: any) { toast.error(e.message ?? 'Gönderilemedi'); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-border/60">
        <div className="flex items-center gap-2 text-[11px]">
          <span className="font-mono text-muted-foreground">{task.tracking_id}</span>
          <span className={cn('rounded px-2 py-0.5 text-[10.5px] uppercase tracking-wider', STATUS_TONE[task.status] ?? 'text-muted-foreground')}>{STATUS_LABEL[task.status] ?? task.status}</span>
          <span className="text-muted-foreground">Öncelik: {PRIO_LABEL[task.priority] ?? task.priority}</span>
          {task.due_date && <span className="text-muted-foreground inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(task.due_date).toLocaleDateString('tr-TR')}</span>}
        </div>
        <h2 className="mt-1 text-[16px] font-semibold">{task.title}</h2>
        <div className="text-[11.5px] text-muted-foreground mt-1">{task.project_name}</div>
        {task.description && <p className="mt-3 text-[13px] whitespace-pre-wrap text-muted-foreground leading-relaxed">{task.description}</p>}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-3">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
          <MessageCircle className="h-3 w-3" /> Yorumlar ({comments?.length ?? 0})
        </div>
        {cLoading ? (
          <div className="space-y-1.5">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : (comments ?? []).length === 0 ? (
          <div className="text-[12.5px] text-muted-foreground py-6 text-center">Henüz yorum yok.</div>
        ) : (
          <div className="space-y-2">
            {comments!.map(c => (
              <div key={c.id} className="rounded-md border border-border/60 bg-secondary/10 px-3 py-2">
                <div className="text-[11px] text-muted-foreground mb-1">
                  <strong className="text-foreground">{c.guest_name || c.guest_email}</strong>
                  {c.guest_name && <span> · {c.guest_email}</span>}
                  <span> · {new Date(c.created_at).toLocaleString('tr-TR')}</span>
                </div>
                <p className="text-[13px] whitespace-pre-wrap leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {canComment ? (
        <div className="border-t border-border/60 px-5 py-3 space-y-2">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder={`Görünecek ad (opsiyonel) — ${guestEmail}`} className="h-8 text-[12px]" />
          <textarea
            value={body} onChange={e => setBody(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } }}
            rows={3}
            placeholder="Yorum yaz… (⌘Enter = gönder)"
            className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-[13px] focus:outline-none"
          />
          <div className="flex justify-end">
            <Button size="sm" className="h-7 gap-1.5" onClick={send} disabled={!body.trim() || post.isPending}>
              <Send className="h-3 w-3" /> Gönder
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-t border-border/60 px-5 py-3 text-[11.5px] text-muted-foreground text-center">
          Bu portalda yorum kapalı.
        </div>
      )}
    </div>
  );
}

// ---- Portal page --------------------------------------------------------

export default function PublicPortal() {
  const { token } = useParams<{ token: string }>();
  const { data: grant, isLoading: gLoading } = usePortalGrant(token);
  const { data: projects } = usePortalProjects(token);
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const { data: tasks, isLoading: tLoading } = usePortalTasks(token, projectFilter);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(() => (tasks ?? []).find(t => t.id === selectedId) ?? null, [tasks, selectedId]);

  if (gLoading) {
    return <div className="mx-auto max-w-lg pt-24 space-y-3 px-6"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-40" /></div>;
  }
  if (!grant) {
    return (
      <div className="mx-auto max-w-lg pt-32 text-center px-6">
        <XCircle className="mx-auto h-10 w-10 text-destructive/70" />
        <h1 className="mt-3 text-[18px] font-semibold">Portal bulunamadı</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">Link geçersiz olabilir, iptal edilmiş ya da süresi geçmiş olabilir.</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <aside className="w-[280px] shrink-0 border-r border-border/60 bg-bg-sidebar flex flex-col">
        <div className="px-4 py-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary/20 grid place-items-center"><UserRound className="h-3.5 w-3.5 text-primary" /></div>
            <div className="min-w-0">
              <div className="text-[13px] font-medium truncate">{grant.name}</div>
              <div className="text-[10.5px] text-muted-foreground truncate">{grant.client_email}</div>
            </div>
          </div>
        </div>
        <div className="px-3 py-2">
          <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1">Projeler</div>
          <button
            onClick={() => { setProjectFilter(null); setSelectedId(null); }}
            className={cn(
              'w-full text-left px-2 py-1.5 rounded text-[12.5px] mb-0.5',
              projectFilter === null ? 'bg-sidebar-accent text-foreground' : 'text-muted-foreground hover:bg-sidebar-accent/40',
            )}
          >Tümü ({tasks?.length ?? 0})</button>
          {(projects ?? []).map(p => (
            <button
              key={p.id}
              onClick={() => { setProjectFilter(p.id); setSelectedId(null); }}
              className={cn(
                'w-full flex items-center gap-1.5 text-left px-2 py-1.5 rounded text-[12.5px] mb-0.5',
                projectFilter === p.id ? 'bg-sidebar-accent text-foreground' : 'text-muted-foreground hover:bg-sidebar-accent/40',
              )}
            >
              <FolderKanban className="h-3 w-3" />
              <span className="truncate flex-1">{p.name}</span>
            </button>
          ))}
        </div>
        <div className="mt-auto px-4 py-3 border-t border-border/60 text-[10px] text-muted-foreground">
          WorkHub · client portal
        </div>
      </aside>

      <main className="flex-1 flex overflow-hidden">
        <div className="w-[380px] shrink-0 border-r border-border/60 overflow-y-auto">
          <div className="px-4 py-2 border-b border-border/60 text-[11px] uppercase tracking-wider text-muted-foreground">
            Task listesi
          </div>
          {tLoading ? (
            <div className="p-3 space-y-1.5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : (tasks ?? []).length === 0 ? (
            <div className="text-[12.5px] text-muted-foreground p-6 text-center">Bu projede task yok.</div>
          ) : (
            tasks!.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={cn(
                  'w-full text-left px-4 py-2 border-b border-border/40 hover:bg-sidebar-accent/25',
                  selectedId === t.id && 'bg-sidebar-accent',
                )}
              >
                <div className="flex items-center gap-2 text-[10.5px] text-muted-foreground">
                  <span className="font-mono">{t.tracking_id}</span>
                  <span className={cn('rounded px-1.5 py-0.5 uppercase tracking-wider', STATUS_TONE[t.status])}>{STATUS_LABEL[t.status] ?? t.status}</span>
                </div>
                <div className="text-[13px] font-medium truncate mt-0.5">{t.title}</div>
                <div className="text-[11px] text-muted-foreground truncate">{t.project_name}</div>
              </button>
            ))
          )}
        </div>
        <div className="flex-1 overflow-hidden">
          {selected ? (
            <TaskPane token={token!} task={selected} canComment={grant.can_comment} guestEmail={grant.client_email} />
          ) : (
            <div className="h-full grid place-items-center text-[13px] text-muted-foreground">
              <div className="text-center">
                <ChevronRight className="mx-auto h-8 w-8 opacity-40" />
                <p className="mt-2">Sol listeden bir task seç.</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
