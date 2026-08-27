import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useTickets, useTicket, useTicketReplies, useUpdateTicket, useAddReply,
  useDeleteTicket,
  TICKET_STATUS_LABELS, TICKET_STATUS_ORDER, TICKET_PRIORITY_LABELS,
  type TicketStatus, type TicketPriority,
} from '@/lib/tickets-hooks';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useWorkspaceMembers } from '@/lib/chat-hooks';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Headphones, ExternalLink, Copy, Clock, CheckCircle2, AlertTriangle,
  User, Trash2, Send, Lock, Inbox, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { DomainWorkspace } from "@/components/DomainWorkspace";

// ---- SLA helpers ---------------------------------------------------------

function slaBadge(t: { sla_due_at: string | null; status: TicketStatus; resolved_at: string | null }) {
  if (t.status === 'resolved' || t.status === 'closed') return { label: 'SLA sağlandı', tone: 'ok' as const };
  if (!t.sla_due_at) return { label: '—', tone: 'muted' as const };
  const ms = new Date(t.sla_due_at).getTime() - Date.now();
  const mins = Math.round(ms / 60_000);
  if (mins <= 0) return { label: `${Math.abs(mins)}dk geçti`, tone: 'over' as const };
  if (mins < 60) return { label: `${mins}dk kaldı`, tone: 'warn' as const };
  const h = Math.round(mins / 60);
  return { label: `${h}sa kaldı`, tone: h < 4 ? 'warn' as const : 'ok' as const };
}

const TONE_CLASS: Record<'ok' | 'warn' | 'over' | 'muted', string> = {
  ok: 'text-success bg-emerald-500/10 border-emerald-500/30',
  warn: 'text-warning bg-warning/10 border-amber-500/30',
  over: 'text-destructive bg-destructive/10 border-destructive/30',
  muted: 'text-muted-foreground bg-muted border-border',
};

const PRIORITY_TONE: Record<TicketPriority, string> = {
  urgent: 'text-destructive bg-destructive/10',
  high: 'text-warning bg-warning/10',
  medium: 'text-muted-foreground bg-secondary/40',
  low: 'text-muted-foreground bg-secondary/20',
};

// ---- Inbox list ----------------------------------------------------------

function Inbox_({ status, onSelect, activeId }: {
  status: TicketStatus | 'all';
  onSelect: (id: string) => void;
  activeId?: string;
}) {
  const { data, isLoading } = useTickets({ status });
  const { currentWorkspace } = useWorkspace();
  const publicUrl = currentWorkspace ? `${window.location.origin}/support/${currentWorkspace.id}` : '';

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(publicUrl); toast.success('Link kopyalandı'); }
    catch { toast.error('Kopyalanamadı'); }
  };

  return (
    <aside className="w-[360px] shrink-0 border-r border-border/60 flex flex-col">
      <div className="border-b border-border/60 px-3 pt-3 pb-2 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[13px] font-medium">
            <Inbox className="h-3.5 w-3.5 text-muted-foreground" /> Service Desk
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border/60 bg-secondary/30 px-2 py-1 text-[11px]">
          <span className="truncate text-muted-foreground flex-1">{publicUrl}</span>
          <button onClick={copyLink} className="h-5 w-5 grid place-items-center rounded hover:bg-secondary/60"><Copy className="h-3 w-3" /></button>
          <a href={publicUrl} target="_blank" rel="noreferrer" className="h-5 w-5 grid place-items-center rounded hover:bg-secondary/60"><ExternalLink className="h-3 w-3" /></a>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-1.5 p-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : (data ?? []).length === 0 ? (
          <div className="px-4 py-10 text-center text-[12px] text-muted-foreground">
            Bu filtrede talep yok.
          </div>
        ) : (
          data!.map(t => {
            const sla = slaBadge(t);
            return (
              <button
                key={t.id}
                onClick={() => onSelect(t.id)}
                className={cn(
                  'flex w-full flex-col items-start gap-1 border-b border-border/40 px-3 py-2 text-left transition',
                  activeId === t.id ? 'bg-sidebar-accent' : 'hover:bg-sidebar-accent/40',
                )}
              >
                <div className="flex w-full items-center gap-2">
                  <span className="font-mono text-[10.5px] text-muted-foreground">{t.tracking_id}</span>
                  <span className={cn('rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider border', TONE_CLASS[sla.tone])}>{sla.label}</span>
                  <span className={cn('ml-auto rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider', PRIORITY_TONE[t.priority])}>{TICKET_PRIORITY_LABELS[t.priority]}</span>
                </div>
                <div className="text-[13px] font-medium truncate w-full">{t.subject}</div>
                <div className="text-[11px] text-muted-foreground truncate w-full">
                  {t.requester_email ?? '—'} · {new Date(t.created_at).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}

// ---- Detail --------------------------------------------------------------

function TicketDetail({ ticketId }: { ticketId: string }) {
  const { data: ticket, isLoading } = useTicket(ticketId);
  const { data: replies } = useTicketReplies(ticketId);
  const { data: members } = useWorkspaceMembers();
  const update = useUpdateTicket();
  const addReply = useAddReply();
  const del = useDeleteTicket();
  const { user } = useAuth();
  const [replyBody, setReplyBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  if (isLoading) return <div className="flex-1 p-6 space-y-3"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-40" /></div>;
  if (!ticket) return <div className="flex-1 grid place-items-center text-[13px] text-muted-foreground">Talep bulunamadı.</div>;

  const membersById = new Map((members ?? []).map(m => [m.user_id, m]));
  const sla = slaBadge(ticket);

  const send = async () => {
    if (!replyBody.trim()) return;
    try {
      await addReply.mutateAsync({ ticket_id: ticket.id, workspace_id: ticket.workspace_id, body: replyBody.trim(), is_internal: isInternal });
      setReplyBody('');
      if (!isInternal && ticket.status === 'open') {
        await update.mutateAsync({ id: ticket.id, status: 'in_progress' });
      }
    } catch (e: any) { toast.error(e.message); }
  };

  const setField = async (patch: Partial<typeof ticket>) => {
    try { await update.mutateAsync({ id: ticket.id, ...patch }); }
    catch (e: any) { toast.error(e.message); }
  };

  const doDelete = async () => {
    if (!confirm('Talebi tamamen sil?')) return;
    try { await del.mutateAsync(ticket.id); toast.success('Silindi'); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <main className="flex-1 flex flex-col min-w-0">
      <header className="border-b border-border/60 px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-muted-foreground">{ticket.tracking_id}</span>
          <span className={cn('rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider border', TONE_CLASS[sla.tone])}>{sla.label}</span>
          <span className={cn('rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider', PRIORITY_TONE[ticket.priority])}>{TICKET_PRIORITY_LABELS[ticket.priority]}</span>
          <Button size="icon" variant="ghost" className="ml-auto h-7 w-7 text-destructive" onClick={doDelete}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
        <h1 className="mt-2 text-[18px] font-semibold tracking-tight">{ticket.subject}</h1>
        <div className="mt-1 text-[12px] text-muted-foreground flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> {ticket.requester_name || ticket.requester_email || 'anonim'}</span>
          {ticket.requester_email && <span>{ticket.requester_email}</span>}
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(ticket.created_at).toLocaleString('tr-TR')}</span>
          {ticket.first_response_at && <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" /> ilk yanıt {new Date(ticket.first_response_at).toLocaleString('tr-TR')}</span>}
          {!ticket.first_response_at && sla.tone === 'over' && (
            <span className="inline-flex items-center gap-1 text-destructive"><AlertTriangle className="h-3 w-3" /> SLA aşıldı</span>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <Select value={ticket.status} onValueChange={v => setField({ status: v as TicketStatus })}>
            <SelectTrigger className="h-7 w-36 text-[12px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TICKET_STATUS_ORDER.map(s => <SelectItem key={s} value={s}>{TICKET_STATUS_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={ticket.priority} onValueChange={v => setField({ priority: v as TicketPriority })}>
            <SelectTrigger className="h-7 w-28 text-[12px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(TICKET_PRIORITY_LABELS) as TicketPriority[]).map(p => (
                <SelectItem key={p} value={p}>{TICKET_PRIORITY_LABELS[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={ticket.assignee_id ?? '__u'} onValueChange={v => setField({ assignee_id: v === '__u' ? null : v })}>
            <SelectTrigger className="h-7 w-40 text-[12px]"><SelectValue placeholder="Atanmadı" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__u">Atanmadı</SelectItem>
              {(members ?? []).map(m => <SelectItem key={m.user_id} value={m.user_id}>{m.full_name ?? m.user_id.slice(0, 8)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        <div className="rounded-md border border-border/60 bg-background/50 p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Talep</div>
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{ticket.body || <span className="text-muted-foreground">İçerik boş.</span>}</p>
        </div>
        {(replies ?? []).map(r => {
          const author = r.author_id ? membersById.get(r.author_id) : null;
          const isMe = r.author_id === user?.id;
          return (
            <div key={r.id} className={cn(
              'rounded-md border p-3',
              r.is_internal
                ? 'border-amber-500/30 bg-warning/5'
                : isMe
                  ? 'border-primary/30 bg-primary/5'
                  : 'border-border/60 bg-background/50',
            )}>
              <div className="flex items-center gap-2 mb-1 text-[11px]">
                <span className="font-medium">{author?.full_name ?? 'Talep sahibi'}</span>
                <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString('tr-TR')}</span>
                {r.is_internal && <span className="inline-flex items-center gap-1 text-warning"><Lock className="h-3 w-3" /> iç not</span>}
              </div>
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{r.body}</p>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border/60 px-6 py-3">
        <textarea
          value={replyBody} onChange={e => setReplyBody(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } }}
          placeholder={isInternal ? 'İç not (talep sahibi görmez)…' : 'Yanıt yaz… (⌘Enter = gönder)'}
          rows={3}
          className={cn(
            'w-full rounded-md border px-3 py-2 text-[13px] focus:outline-none',
            isInternal ? 'border-warning/40 bg-warning/5' : 'border-border/60 bg-background',
          )}
        />
        <div className="mt-2 flex items-center justify-between">
          <label className="flex items-center gap-2 text-[12px] cursor-pointer">
            <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} className="h-3.5 w-3.5 accent-amber-500" />
            İç not olarak yaz
          </label>
          <Button size="sm" className="h-7 gap-1.5" onClick={send} disabled={!replyBody.trim() || addReply.isPending}>
            <Send className="h-3 w-3" /> Gönder
          </Button>
        </div>
      </div>
    </main>
  );
}

// ---- Page --------------------------------------------------------------

const FILTERS: (TicketStatus | 'all')[] = ['all', 'open', 'in_progress', 'waiting', 'resolved'];
const FILTER_LABELS: Record<TicketStatus | 'all', string> = { ...TICKET_STATUS_LABELS, all: 'Tümü' };

export default function ServiceDesk() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<TicketStatus | 'all'>('open');

  return (
    <DomainWorkspace
      domain="inbox"
      title="Destek Masası"
      showAgent={false}
      maxWidth="max-w-none"
      tabs={
        <>
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-md px-2 py-1 text-[12px] transition',
                filter === f
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/40',
              )}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </>
      }
    >
      <div className="flex h-[calc(100vh-140px)] overflow-hidden -mx-4 lg:-mx-6 -my-5">
        <Inbox_
          status={filter}
          onSelect={tid => navigate(`/desk/${tid}`)}
          activeId={id}
        />
        {id ? <TicketDetail ticketId={id} /> : (
          <main className="flex-1 grid place-items-center text-[13px] text-muted-foreground">
            <div className="text-center">
              <Headphones className="mx-auto h-8 w-8 opacity-40" />
              <p className="mt-2">Soldan bir talep seç.</p>
              <p className="text-[11.5px]">Public link üzerinden yeni talepler otomatik açılacak.</p>
            </div>
          </main>
        )}
      </div>
    </DomainWorkspace>
  );
}
