import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUnreadCount, useRealtimeNotifications } from "@/lib/notification-hooks";
import { NotificationDrawer } from "@/components/notifications/NotificationDrawer";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const unreadCount = useUnreadCount();

  useRealtimeNotifications();

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="relative h-8 w-8 rounded-full p-0"
        aria-label="Bildirimler"
        onClick={() => setOpen(true)}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9.5px] font-semibold text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>
      <NotificationDrawer open={open} onOpenChange={setOpen} />
    </>
  );
}
