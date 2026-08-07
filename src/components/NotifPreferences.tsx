import { Mail, Bell } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  type NotificationPreferences as Prefs,
} from '@/lib/notification-hooks';

const PREF_ROWS: { key: keyof Prefs; label: string }[] = [
  { key: 'task_assigned',          label: 'Sana task atandığında' },
  { key: 'mention_in_comment',     label: 'Yorumda seni @mention ettiklerinde' },
  { key: 'decision_review_due',    label: 'Karar review vadesi geldiğinde' },
  { key: 'approval_created',       label: 'Onayına düşen bir istek olduğunda' },
  { key: 'approval_overdue',       label: 'Onay süresi geçtiğinde' },
  { key: 'signal_scan_detected',   label: 'Sinyal taraması tespit edildiğinde' },
];

export function NotifPreferences() {
  const { data: prefs, isLoading } = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();

  const value = (key: keyof Prefs): boolean => {
    if (!prefs) return true;
    return prefs[key] ?? true;
  };

  return (
    <div>
      <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
        Bildirim türleri
      </div>
      <div className="overflow-hidden rounded-md border border-border/60 bg-secondary/10">
        <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 border-b border-border/60 bg-background/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          <span>Olay</span>
          <span className="inline-flex items-center gap-1"><Bell className="h-3 w-3" /> Bildirim</span>
        </div>
        {isLoading ? (
          <div className="space-y-1 p-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8" />)}
          </div>
        ) : PREF_ROWS.map((row) => (
          <div key={row.key} className="grid grid-cols-[1fr_auto] items-center gap-x-4 border-b border-border/40 px-3 py-2 last:border-0">
            <span className="text-[12.5px]">{row.label}</span>
            <Switch
              checked={value(row.key)}
              disabled={update.isPending}
              onCheckedChange={(v) => update.mutate({ [row.key]: v })}
            />
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground/80">
        E-postalar sadece bir yönetici Resend + <code className="rounded border border-border bg-background px-1 font-mono text-[10.5px]">RESEND_API_KEY</code>'i
        yapılandırdıysa gönderilir. Detay için <code className="rounded border border-border bg-background px-1 font-mono text-[10.5px]">supabase/functions/send-email/README.md</code>.
      </p>
    </div>
  );
}
