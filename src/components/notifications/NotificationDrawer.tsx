import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, useMarkNotificationsRead } from "@/lib/notification-hooks";
import { cn } from "@/lib/utils";
import {
  Bell, CheckCircle2, AlertTriangle, Target, UserPlus, AtSign, Radio,
  FileText, Clock,
} from "lucide-react";

const KIND_ICON: Record<string, React.ElementType> = {
  approval_created: FileText,
  approval_overdue: AlertTriangle,
  decision_review_due: Target,
  task_assigned: UserPlus,
  mention_in_comment: AtSign,
  signal_scan_detected: Radio,
};

const KIND_LABEL: Record<string, string> = {
  approval_created: "Yeni onay talebi",
  approval_overdue: "Geciken onay",
  decision_review_due: "Karar gözden geçirme",
  task_assigned: "Görev atandı",
  mention_in_comment: "Bahsedildin",
  signal_scan_detected: "Sinyal algılandı",
  review_reminder: "Gözden geçirme hatırlatması",
};

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return "simdi";
  if (mins < 60) return `${mins} dk`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa`;
  return `${Math.floor(hours / 24)} gun`;
}

interface NotificationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationDrawer({ open, onOpenChange }: NotificationDrawerProps) {
  const navigate = useNavigate();
  const { data: notifications } = useNotifications();
  const markRead = useMarkNotificationsRead();

  const items = notifications ?? [];
  const unread = items.filter((n) => !n.read_at);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[400px] p-0">
        <SheetHeader className="border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" />
              Bildirimler
              {unread.length > 0 && (
                <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[10px]">
                  {unread.length}
                </Badge>
              )}
            </SheetTitle>
            {unread.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={() => markRead.mutate(unread.map((n) => n.id))}
              >
                Tumunu okundu say
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-57px)]">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
              <Bell className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium">Bildirim yok</p>
              <p className="max-w-[260px] text-xs text-muted-foreground">
                Onay talepleri, karar gözden geçirmeleri ve görev atamaları burada görünür.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((n) => {
                const Icon = KIND_ICON[n.kind] ?? Bell;
                return (
                  <button
                    key={n.id}
                    className={cn(
                      "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/60",
                      !n.read_at && "bg-primary/5",
                    )}
                    onClick={() => {
                      if (!n.read_at) markRead.mutate([n.id]);
                      if (n.link) {
                        navigate(n.link);
                        onOpenChange(false);
                      }
                    }}
                  >
                    <div className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      !n.read_at ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className={cn(
                          "text-[13px] leading-snug",
                          !n.read_at ? "font-medium" : "text-muted-foreground",
                        )}>
                          {n.title}
                        </span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {timeAgo(n.created_at)}
                        </span>
                      </div>
                      {n.body && (
                        <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground line-clamp-2">
                          {n.body}
                        </p>
                      )}
                      <span className="mt-1 inline-block text-[10px] uppercase tracking-wide text-muted-foreground/70">
                        {KIND_LABEL[n.kind] ?? n.kind}
                      </span>
                    </div>
                    {!n.read_at && (
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
