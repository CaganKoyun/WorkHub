import {
  useMyPushSubscriptions, useSubscribePush, useUnsubscribePush, useDeletePushSub,
  useEnqueuePush, detectPushSupport, type PushSubscriptionRow,
} from '@/lib/push-hooks';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bell, BellOff, Trash2, AlertTriangle, Send, Smartphone, Monitor, Chrome, Globe, KeyRound, CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { NotifPreferences } from '@/components/NotifPreferences';

function deviceIcon(ua: string | null) {
  if (!ua) return Globe;
  const s = ua.toLowerCase();
  if (/iphone|android|mobile/.test(s)) return Smartphone;
  if (/chrome/.test(s) && !/edg/.test(s)) return Chrome;
  return Monitor;
}

function shortUA(ua: string | null): string {
  if (!ua) return 'Bilinmeyen cihaz';
  const m = ua.match(/\(([^)]+)\)/);
  return m ? m[1].split(';')[0].trim() : ua.slice(0, 60);
}

function shortEndpoint(ep: string): string {
  try {
    const u = new URL(ep);
    return `${u.hostname}${u.pathname.slice(0, 24)}…`;
  } catch { return ep.slice(0, 48); }
}

function SubRow({ sub, isCurrent }: { sub: PushSubscriptionRow; isCurrent: boolean }) {
  const del = useDeletePushSub();
  const Icon = deviceIcon(sub.user_agent);

  const doDelete = async () => {
    if (!confirm(`Bu aboneliği sil? Bu cihaz artık push almayacak.`)) return;
    try { await del.mutateAsync(sub.id); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="group flex items-center gap-3 px-3 py-2 border-b border-border/40 last:border-b-0">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium truncate">{shortUA(sub.user_agent)}</span>
          {isCurrent && <span className="chip ok inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Bu cihaz</span>}
        </div>
        <div className="text-[11px] text-muted-foreground font-mono truncate">{shortEndpoint(sub.endpoint)}</div>
      </div>
      <span className="text-[11px] text-muted-foreground">{new Date(sub.created_at).toLocaleDateString('tr-TR')}</span>
      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100" onClick={doDelete}>
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

export default function NotificationSettings() {
  const support = detectPushSupport();
  const { user } = useAuth();
  const { data: subs, isLoading } = useMyPushSubscriptions();
  const subscribe = useSubscribePush();
  const unsubscribe = useUnsubscribePush();
  const enqueue = useEnqueuePush();

  const currentEndpoint = typeof window !== 'undefined'
    ? (window as unknown as { __wh_current_endpoint__?: string }).__wh_current_endpoint__
    : undefined;

  const hasThisDevice = (subs ?? []).some(s => s.endpoint === currentEndpoint);

  const doSubscribe = async () => {
    try {
      const sub = await subscribe.mutateAsync();
      (window as unknown as { __wh_current_endpoint__?: string }).__wh_current_endpoint__ = sub.endpoint;
      toast.success('Push aboneliği aktif');
    } catch (e: any) { toast.error(e.message ?? 'Abone olunamadı'); }
  };

  const doUnsubscribe = async () => {
    if (!confirm('Bu cihazın push aboneliğini iptal et?')) return;
    try { await unsubscribe.mutateAsync(); toast.success('İptal edildi'); }
    catch (e: any) { toast.error(e.message); }
  };

  const doTest = async () => {
    if (!user) return;
    try {
      await enqueue.mutateAsync({
        user_id: user.id,
        title: 'WorkHub test bildirimi',
        body: 'Enqueue çalışıyor. Cihazına ulaşması için send-push Edge Function ve VAPID_PRIVATE_KEY gerekli.',
        url: '/inbox',
      });
      toast.success('Kuyruğa eklendi (v2 sender aktifleştirilince cihaza düşer)');
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-[20px] font-semibold tracking-tight flex items-center gap-2">
          <Bell className="h-5 w-5 text-muted-foreground" /> Bildirim ayarları
        </h1>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">
          Tarayıcı push bildirimleri (Web Push). Kayıt olduğun her cihaz burada
          listelenir; iş atandığında, yorum geldiğinde, SLA aşımlarında burada
          bildirim alırsın.
        </p>
      </div>

      {/* Env / permission durumu */}
      <div className="rounded-md border border-border/60 bg-secondary/10 p-3 space-y-1.5 text-[12px]">
        <div className="flex items-center gap-2">
          {support.browser
            ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            : <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
          <span>Tarayıcı desteği: <strong className={support.browser ? 'text-emerald-400' : 'text-destructive'}>{support.browser ? 'OK' : 'YOK'}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          {support.permission === 'granted'
            ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            : support.permission === 'denied'
              ? <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
              : <Bell className="h-3.5 w-3.5 text-muted-foreground" />}
          <span>İzin: <strong>{support.permission}</strong></span>
          {support.permission === 'denied' && <span className="text-muted-foreground">— tarayıcı ayarlarından aç</span>}
        </div>
        <div className="flex items-center gap-2">
          <KeyRound className={cn('h-3.5 w-3.5', support.vapidConfigured ? 'text-emerald-400' : 'text-amber-400')} />
          <span>VAPID public key: <strong className={support.vapidConfigured ? 'text-emerald-400' : 'text-amber-400'}>{support.vapidConfigured ? 'OK' : 'yok — env ekle'}</strong></span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {support.browser && support.vapidConfigured && (
          hasThisDevice
            ? <Button variant="ghost" onClick={doUnsubscribe} disabled={unsubscribe.isPending} className="gap-1.5">
                <BellOff className="h-3.5 w-3.5" /> Bu cihazı iptal et
              </Button>
            : <Button onClick={doSubscribe} disabled={subscribe.isPending} className="gap-1.5">
                <Bell className="h-3.5 w-3.5" /> Bu cihazı abone et
              </Button>
        )}
        <Button variant="ghost" onClick={doTest} disabled={enqueue.isPending} className="gap-1.5">
          <Send className="h-3.5 w-3.5" /> Test push kuyruğa at
        </Button>
      </div>

      {/* Devices */}
      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Kayıtlı cihazlar ({subs?.length ?? 0})</div>
        {isLoading ? (
          <div className="space-y-1.5">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (subs ?? []).length === 0 ? (
          <div className="rounded-md border border-dashed border-border/60 py-10 text-center text-[13px] text-muted-foreground">
            Hiç kayıtlı cihaz yok.
          </div>
        ) : (
          <div className="rounded-md border border-border/60 bg-secondary/10 overflow-hidden">
            {(subs ?? []).map(s => <SubRow key={s.id} sub={s} isCurrent={s.endpoint === currentEndpoint} />)}
          </div>
        )}
      </div>

      {/* Preferences */}
      <NotifPreferences />

      {/* Docs */}
      <div className="rounded-md border border-border/60 bg-secondary/10 p-4 text-[12px] space-y-2">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Kurulum (yönetici)</div>
        <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
          <li>VAPID key çifti üret: <code className="font-mono text-[11px] bg-background border border-border rounded px-1">npx web-push generate-vapid-keys</code></li>
          <li>Public key → Vercel env <code className="font-mono text-[11px] bg-background border border-border rounded px-1">VITE_VAPID_PUBLIC_KEY</code></li>
          <li>Private key → Supabase Edge Function secret <code className="font-mono text-[11px] bg-background border border-border rounded px-1">VAPID_PRIVATE_KEY</code></li>
          <li>Edge Function <code className="font-mono text-[11px] bg-background border border-border rounded px-1">supabase/functions/send-push</code>'ı deploy et — <code className="font-mono text-[11px] bg-background border border-border rounded px-1">push_queue</code>'yu okuyup Web Push gönderir.</li>
          <li>Cron veya trigger: <code className="font-mono text-[11px] bg-background border border-border rounded px-1">enqueue_push()</code> RPC ile herhangi bir kod push kuyruğa yazabilir.</li>
        </ol>
      </div>
    </div>
  );
}
