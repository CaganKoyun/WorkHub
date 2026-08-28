import { useMemo } from 'react';
import { Mail, Bell } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  useNotifPrefs, useUpsertNotifPref, NOTIF_KINDS,
} from '@/lib/notif-prefs-hooks';

export function NotifPreferences() {
  const { data: prefs, isLoading } = useNotifPrefs();
  const upsert = useUpsertNotifPref();

  const map = useMemo(
    () => new Map((prefs ?? []).map((p) => [p.kind, p])),
    [prefs],
  );

  const value = (kind: string, field: 'email' | 'in_app'): boolean => {
    const p = map.get(kind);
    if (p) return p[field];
    // Missing = default true (mirrors DB default).
    return true;
  };

  return (
    <div>
      <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
        Bildirim türleri
      </div>
      <div className="overflow-hidden rounded-md border border-border/60 bg-secondary/10">
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-b border-border/60 bg-background/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          <span>Olay</span>
          <span className="inline-flex items-center gap-1"><Bell className="h-3 w-3" /> Uygulama</span>
          <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> E-posta</span>
        </div>
        {isLoading ? (
          <div className="space-y-1 p-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8" />)}
          </div>
        ) : NOTIF_KINDS.map((k) => (
          <div key={k.key} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-b border-border/40 px-3 py-2 last:border-0">
            <span className="text-[12.5px]">{k.label}</span>
            <Switch
              checked={value(k.key, 'in_app')}
              disabled={upsert.isPending}
              onCheckedChange={(v) => upsert.mutate({
                kind: k.key,
                in_app: v,
                email: value(k.key, 'email'),
              })}
            />
            <Switch
              checked={value(k.key, 'email')}
              disabled={upsert.isPending}
              onCheckedChange={(v) => upsert.mutate({
                kind: k.key,
                in_app: value(k.key, 'in_app'),
                email: v,
              })}
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
