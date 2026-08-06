import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotifications, useMarkNotificationsRead } from "@/lib/notification-hooks";
import { useRealtime } from "@/lib/realtime";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return "şimdi";
  if (mins < 60) return `${mins} dk`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa`;
  return `${Math.floor(hours / 24)} gün`;
}

export function NotificationBell() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: notifications } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const qc = useQueryClient();
  useRealtime('notifications', () => {
    qc.invalidateQueries({ queryKey: ['notifications'] });
  }, { filter: user?.id ? `user_id=eq.${user.id}` : undefined, enabled: !!user?.id });

  const items = notifications ?? [];
  const unread = items.filter((n) => !n.read_at);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="relative h-8 w-8 rounded-full p-0" aria-label="Bildirimler">
          <Bell className="h-4 w-4" />
          {unread.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9.5px] font-semibold text-primary-foreground">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-[13px] font-semibold">Bildirimler</span>
          {unread.length > 0 && (
            <button
              className="text-[11.5px] text-muted-foreground hover:text-foreground"
              onClick={() => markRead.mutate(unread.map((n) => n.id))}
            >
              Tümünü okundu say
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 && (
            <p className="px-3 py-6 text-center text-[12.5px] text-muted-foreground">
              Bildirim yok. Vadesi gelen karar reviewleri burada görünür.
            </p>
          )}
          {items.map((n) => (
            <button
              key={n.id}
              className={cn(
                "block w-full border-b border-border/60 px-3 py-2.5 text-left last:border-0 hover:bg-secondary/60",
                !n.read_at && "bg-primary/5",
              )}
              onClick={() => {
                if (!n.read_at) markRead.mutate([n.id]);
                if (n.link) navigate(n.link);
              }}
            >
              <span className="flex items-start justify-between gap-2">
                <span className="text-[12.5px] font-medium leading-snug">{n.title}</span>
                <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</span>
              </span>
              {n.body && (
                <span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">{n.body}</span>
              )}
            </button>
          ))}
        </div>
        {items.length > 0 && (
          <button
            className="block w-full border-t border-border px-3 py-2 text-center text-[11.5px] font-medium text-muted-foreground hover:text-foreground"
            onClick={() => navigate('/notifications')}
          >
            Tümünü gör
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
