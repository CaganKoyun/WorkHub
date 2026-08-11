import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { useNotifications, useMarkNotificationsRead } from '@/lib/notification-hooks';
import { NOTIF_KINDS } from '@/lib/notif-prefs-hooks';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bell, CheckCheck, ListTodo, MessageSquare, AtSign,
  RotateCcw, ShieldCheck, Filter, Inbox,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const KIND_ICONS: Record<string, React.ElementType> = {
  task_assigned: ListTodo,
  task_comment: MessageSquare,
  chat_mention: AtSign,
  decision_review: RotateCcw,
  approval_requested: ShieldCheck,
  review_reminder: RotateCcw,
};

const KIND_LABELS: Record<string, string> = Object.fromEntries(
  NOTIF_KINDS.filter(k => k.key !== '*').map(k => [k.key, k.label]),
);

export default function Notifications() {
  const navigate = useNavigate();
  const { data: notifications, isLoading } = useNotifications(100);
  const markRead = useMarkNotificationsRead();
  const [filter, setFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const list = notifications ?? [];
    if (!filter) return list;
    return list.filter(n => n.kind === filter);
  }, [notifications, filter]);

  const unreadIds = useMemo(
    () => (notifications ?? []).filter(n => !n.read_at).map(n => n.id),
    [notifications],
  );

  const kindCounts = useMemo(() => {
    const map = new Map<string, number>();
    (notifications ?? []).forEach(n => {
      map.set(n.kind, (map.get(n.kind) ?? 0) + 1);
    });
    return map;
  }, [notifications]);

  const handleClick = (n: { id: string; link: string | null; read_at: string | null }) => {
    if (!n.read_at) markRead.mutate([n.id]);
    if (n.link) navigate(n.link);
  };

  return (
    <AppLayout>
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight flex items-center gap-2">
            <Bell className="h-5 w-5 text-muted-foreground" /> Bildirimler
          </h1>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            Tüm bildirimlerini buradan takip et.
          </p>
        </div>
        {unreadIds.length > 0 && (
          <Button
            size="sm" variant="outline" className="h-7 gap-1.5 text-[12px]"
            onClick={() => markRead.mutate(unreadIds)}
            disabled={markRead.isPending}
          >
            <CheckCheck className="h-3.5 w-3.5" /> Tümünü okundu yap
          </Button>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setFilter(null)}
          className={cn(
            'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
            !filter
              ? 'border-primary/40 bg-primary/10 text-foreground'
              : 'border-border/60 text-muted-foreground hover:border-border',
          )}
        >
          Tümü ({notifications?.length ?? 0})
        </button>
        {Array.from(kindCounts.entries()).map(([kind, count]) => {
          const Icon = KIND_ICONS[kind] ?? Bell;
          return (
            <button
              key={kind}
              onClick={() => setFilter(filter === kind ? null : kind)}
              className={cn(
                'flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
                filter === kind
                  ? 'border-primary/40 bg-primary/10 text-foreground'
                  : 'border-border/60 text-muted-foreground hover:border-border',
              )}
            >
              <Icon className="h-3 w-3" />
              {KIND_LABELS[kind] ?? kind} ({count})
            </button>
          );
        })}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-md border border-dashed border-border/60 py-16 text-center">
          <Inbox className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-[13px] text-muted-foreground">
            {filter ? 'Bu kategoride bildirim yok.' : 'Henüz bildirim yok.'}
          </p>
        </div>
      ) : (
        <div className="rounded-md border border-border/60 overflow-hidden divide-y divide-border/40">
          {filtered.map(n => {
            const Icon = KIND_ICONS[n.kind] ?? Bell;
            const isUnread = !n.read_at;
            return (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={cn(
                  'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-sidebar-accent/30',
                  isUnread && 'bg-primary/[0.03]',
                )}
              >
                <div className={cn(
                  'mt-0.5 rounded-md p-1.5',
                  isUnread ? 'bg-primary/10 text-primary' : 'bg-secondary/40 text-muted-foreground',
                )}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-[13px] font-medium truncate',
                      isUnread ? 'text-foreground' : 'text-muted-foreground',
                    )}>
                      {n.title}
                    </span>
                    {isUnread && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                  {n.body && (
                    <p className="mt-0.5 text-[12px] text-muted-foreground line-clamp-1">{n.body}</p>
                  )}
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: tr })}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
    </AppLayout>
  );
}
