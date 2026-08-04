import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useChannels, useCreateChannel, useChannelMessages, useSendMessage,
  useThreadReplies, useReplyCounts, useDeleteMessage, useWorkspaceMembers,
  extractMentions, type ChatMessage, type ChatMember,
} from '@/lib/chat-hooks';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Hash, Plus, Send, Trash2, MessageCircle, X, AtSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function fmtTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** Render body with @mentions highlighted. */
function BodyText({ body, members }: { body: string; members: ChatMember[] }) {
  const parts = body.split(/(@[a-zA-Z0-9._-]+)/g);
  return (
    <span className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">
      {parts.map((p, i) => {
        if (p.startsWith('@')) {
          const tag = p.slice(1).toLowerCase();
          const hit = members.find(m => (m.full_name ?? '').toLowerCase().replace(/\s+/g, '') === tag);
          if (hit) return <span key={i} className="rounded bg-primary/15 px-1 text-primary font-medium">{p}</span>;
        }
        return <span key={i}>{p}</span>;
      })}
    </span>
  );
}

function CreateChannelDialog({ open, onOpenChange }: {
  open: boolean; onOpenChange: (o: boolean) => void;
}) {
  const create = useCreateChannel();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const c = await create.mutateAsync({ name: name.trim(), description: desc.trim() || undefined });
      toast.success('Kanal oluşturuldu');
      setName(''); setDesc('');
      onOpenChange(false);
      navigate(`/chat/${c.id}`);
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Yeni kanal</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium">Ad</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="pazarlama" autoFocus />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium">Açıklama (opsiyonel)</label>
            <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Kanalın konusu…" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>İptal</Button>
            <Button type="submit" disabled={create.isPending}>Oluştur</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Composer({ channelId, parentId, membersById, members, autoFocus }: {
  channelId: string;
  parentId?: string;
  membersById: Map<string, ChatMember>;
  members: ChatMember[];
  autoFocus?: boolean;
}) {
  const send = useSendMessage();
  const [text, setText] = useState('');
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => { if (autoFocus) ref.current?.focus(); }, [autoFocus, channelId, parentId]);

  const submit = async () => {
    const body = text.trim();
    if (!body) return;
    const mentions = extractMentions(body, members);
    try {
      await send.mutateAsync({ channel_id: channelId, body, parent_id: parentId, mentions });
      setText('');
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="border-t border-border/60 bg-background/95 px-3 py-2">
      <div className="rounded-md border border-border/60 focus-within:border-primary/60 flex items-end gap-1 p-1.5">
        <textarea
          ref={ref}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
          }}
          rows={1}
          placeholder={parentId ? 'Yanıtla…' : 'Mesaj yaz… (Enter = gönder, Shift+Enter = satır)'}
          className="flex-1 resize-none bg-transparent px-2 py-1.5 text-[13px] focus:outline-none max-h-40"
        />
        <Button
          size="icon" onClick={submit} disabled={!text.trim() || send.isPending}
          className="h-7 w-7 shrink-0"
        ><Send className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
}

function MessageRow({ msg, membersById, members, replyCount, onOpenThread, onDelete, isMine }: {
  msg: ChatMessage;
  membersById: Map<string, ChatMember>;
  members: ChatMember[];
  replyCount?: number;
  onOpenThread?: () => void;
  onDelete: () => void;
  isMine: boolean;
}) {
  const author = msg.author_id ? membersById.get(msg.author_id) : null;
  const initials = (author?.full_name ?? '?').split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="group flex gap-2.5 px-4 py-2 hover:bg-sidebar-accent/25">
      <div className="h-7 w-7 shrink-0 rounded-full bg-primary/15 text-primary grid place-items-center text-[11px] font-semibold">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-medium truncate">{author?.full_name ?? 'Kullanıcı'}</span>
          <span className="text-[10.5px] text-muted-foreground">{fmtTime(msg.created_at)}</span>
          {msg.edited_at && <span className="text-[10.5px] text-muted-foreground">(düzenlendi)</span>}
        </div>
        <BodyText body={msg.body} members={members} />
        {onOpenThread && (
          <button
            onClick={onOpenThread}
            className={cn(
              'mt-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px]',
              (replyCount ?? 0) > 0
                ? 'bg-primary/10 text-primary hover:bg-primary/15'
                : 'text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-secondary/60',
            )}
          >
            <MessageCircle className="h-3 w-3" />
            {(replyCount ?? 0) > 0 ? `${replyCount} yanıt` : 'Yanıtla'}
          </button>
        )}
      </div>
      {isMine && (
        <button
          onClick={onDelete}
          className="h-6 w-6 grid place-items-center rounded text-muted-foreground opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-secondary/60 hover:text-destructive"
          title="Sil"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function MessageList({ msgs, membersById, members, replyCounts, onOpenThread, onDelete, currentUserId }: {
  msgs: ChatMessage[];
  membersById: Map<string, ChatMember>;
  members: ChatMember[];
  replyCounts: Record<string, number>;
  onOpenThread: (id: string) => void;
  onDelete: (m: ChatMessage) => void;
  currentUserId: string | undefined;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [msgs.length]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      {msgs.length === 0
        ? <div className="mx-auto max-w-md pt-24 text-center text-[13px] text-muted-foreground">
            Henüz mesaj yok. İlk mesajı sen at.
          </div>
        : msgs.map(m => (
            <MessageRow
              key={m.id}
              msg={m}
              membersById={membersById}
              members={members}
              replyCount={replyCounts[m.id]}
              onOpenThread={() => onOpenThread(m.id)}
              onDelete={() => onDelete(m)}
              isMine={m.author_id === currentUserId}
            />
          ))}
    </div>
  );
}

function ThreadPane({ rootId, channelId, onClose, membersById, members, currentUserId }: {
  rootId: string;
  channelId: string;
  onClose: () => void;
  membersById: Map<string, ChatMember>;
  members: ChatMember[];
  currentUserId: string | undefined;
}) {
  const { data: replies, isLoading } = useThreadReplies(rootId);
  const del = useDeleteMessage();

  const doDelete = async (m: ChatMessage) => {
    if (!confirm('Yanıtı sil?')) return;
    try { await del.mutateAsync({ id: m.id, channel_id: m.channel_id, parent_id: m.parent_id }); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <aside className="w-[380px] shrink-0 border-l border-border/60 flex flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
        <div className="flex items-center gap-1.5 text-[13px] font-medium">
          <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" /> Thread
        </div>
        <button onClick={onClose} className="h-6 w-6 grid place-items-center rounded hover:bg-secondary/60">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {isLoading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : (replies ?? []).length === 0 ? (
          <div className="px-4 py-10 text-center text-[12px] text-muted-foreground">
            İlk yanıtı sen yaz.
          </div>
        ) : (
          replies!.map(r => (
            <MessageRow
              key={r.id}
              msg={r}
              membersById={membersById}
              members={members}
              onDelete={() => doDelete(r)}
              isMine={r.author_id === currentUserId}
            />
          ))
        )}
      </div>
      <Composer
        channelId={channelId}
        parentId={rootId}
        membersById={membersById}
        members={members}
        autoFocus
      />
    </aside>
  );
}

export default function Chat() {
  const { channelId: routeId } = useParams<{ channelId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: channels, isLoading: chLoading } = useChannels();
  const [createOpen, setCreateOpen] = useState(false);
  const [threadRoot, setThreadRoot] = useState<string | null>(null);

  useEffect(() => {
    if (!routeId && channels && channels[0]) navigate(`/chat/${channels[0].id}`, { replace: true });
  }, [routeId, channels, navigate]);

  const activeId = routeId ?? channels?.[0]?.id;
  const activeChannel = channels?.find(c => c.id === activeId) ?? null;

  const { data: msgs, isLoading: msgsLoading } = useChannelMessages(activeId);
  const { data: replyCounts } = useReplyCounts(activeId);
  const { data: members } = useWorkspaceMembers();
  const del = useDeleteMessage();

  const membersById = useMemo(
    () => new Map((members ?? []).map(m => [m.user_id, m])),
    [members],
  );

  const doDelete = async (m: ChatMessage) => {
    if (!confirm('Mesajı sil?')) return;
    try { await del.mutateAsync({ id: m.id, channel_id: m.channel_id, parent_id: m.parent_id }); }
    catch (e: any) { toast.error(e.message); }
  };

  // Close thread if root was deleted
  useEffect(() => {
    if (threadRoot && msgs && !msgs.some(m => m.id === threadRoot)) setThreadRoot(null);
  }, [threadRoot, msgs]);

  return (
    <div className="flex h-[calc(100vh-52px)]">
      <aside className="w-[240px] shrink-0 border-r border-border/60 flex flex-col">
        <div className="flex items-center justify-between px-3 pt-3 pb-2">
          <div className="text-[13px] font-medium">Kanallar</div>
          <Button
            size="sm" variant="ghost" className="h-6 gap-1 px-1.5 text-[11.5px]"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-3 w-3" /> Yeni
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-1.5 pb-3">
          {chLoading ? (
            <div className="space-y-1 px-1">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-7" />)}
            </div>
          ) : (channels ?? []).length === 0 ? (
            <div className="px-3 py-6 text-center text-[12px] text-muted-foreground">
              Kanal yok. Yukarıdan yeni bir tane oluştur.
            </div>
          ) : (
            channels!.map(c => (
              <button
                key={c.id}
                onClick={() => navigate(`/chat/${c.id}`)}
                className={cn(
                  'flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[13px]',
                  activeId === c.id
                    ? 'bg-sidebar-accent text-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent/40 hover:text-foreground',
                )}
              >
                <Hash className="h-3.5 w-3.5 shrink-0 opacity-60" />
                <span className="truncate">{c.name}</span>
              </button>
            ))
          )}
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0">
        {!activeChannel ? (
          <div className="mx-auto pt-24 text-center text-[13px] text-muted-foreground">
            Kanal seç veya oluştur.
          </div>
        ) : (
          <>
            <header className="border-b border-border/60 px-4 py-2.5 flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="text-[14px] font-medium">{activeChannel.name}</span>
              {activeChannel.description && (
                <span className="text-[12px] text-muted-foreground truncate">— {activeChannel.description}</span>
              )}
              <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <AtSign className="h-3 w-3" /> @isim ile bahset
              </span>
            </header>
            {msgsLoading ? (
              <div className="flex-1 space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : (
              <MessageList
                msgs={msgs ?? []}
                membersById={membersById}
                members={members ?? []}
                replyCounts={replyCounts ?? {}}
                onOpenThread={setThreadRoot}
                onDelete={doDelete}
                currentUserId={user?.id}
              />
            )}
            <Composer
              channelId={activeChannel.id}
              membersById={membersById}
              members={members ?? []}
            />
          </>
        )}
      </main>
      {threadRoot && activeChannel && (
        <ThreadPane
          rootId={threadRoot}
          channelId={activeChannel.id}
          onClose={() => setThreadRoot(null)}
          membersById={membersById}
          members={members ?? []}
          currentUserId={user?.id}
        />
      )}
      <CreateChannelDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
