import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  last_used_at: string | null;
  created_at: string;
}

export interface EnqueueInput {
  user_id: string;
  title: string;
  body?: string;
  url?: string;
  data?: Record<string, unknown>;
}

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

/** urlBase64ToUint8Array — Web Push standard applicationServerKey format. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function bufToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export interface PushEnvSupport {
  browser: boolean;      // Notification + PushManager + ServiceWorker
  permission: NotificationPermission | 'unsupported';
  vapidConfigured: boolean;
}

export function detectPushSupport(): PushEnvSupport {
  if (typeof window === 'undefined') {
    return { browser: false, permission: 'unsupported', vapidConfigured: !!VAPID_PUBLIC_KEY };
  }
  const browser =
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;
  return {
    browser,
    permission: browser ? Notification.permission : 'unsupported',
    vapidConfigured: !!VAPID_PUBLIC_KEY,
  };
}

export function useMyPushSubscriptions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['push-subs', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<PushSubscriptionRow[]> => {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as PushSubscriptionRow[];
    },
  });
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const reg = await navigator.serviceWorker.getRegistration('/');
  if (reg) return reg;
  return navigator.serviceWorker.register('/sw.js', { scope: '/' });
}

export function useSubscribePush() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Auth required');
      if (!VAPID_PUBLIC_KEY) throw new Error('VITE_VAPID_PUBLIC_KEY yok — env ekle');
      const support = detectPushSupport();
      if (!support.browser) throw new Error('Bu tarayıcı push desteklemiyor');

      if (Notification.permission === 'denied') throw new Error('İzin reddedilmiş — tarayıcı ayarlarından aç');
      if (Notification.permission !== 'granted') {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') throw new Error('İzin verilmedi');
      }

      const reg = await getRegistration();
      const existing = await reg.pushManager.getSubscription();
      const sub = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      const endpoint = json.endpoint ?? sub.endpoint;
      const p256dh = json.keys?.p256dh ?? bufToBase64Url(sub.getKey('p256dh')!);
      const auth = json.keys?.auth ?? bufToBase64Url(sub.getKey('auth')!);

      // Upsert by endpoint UNIQUE — delete-then-insert is simplest here.
      await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
      const { error } = await supabase.from('push_subscriptions').insert({
        user_id: user.id,
        endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent.slice(0, 200),
      });
      if (error) throw error;
      return sub;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['push-subs'] }),
  });
}

export function useUnsubscribePush() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const reg = await navigator.serviceWorker.getRegistration('/');
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['push-subs'] }),
  });
}

export function useDeletePushSub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('push_subscriptions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['push-subs'] }),
  });
}

/** Enqueue a push into push_queue via SECURITY DEFINER RPC. Actual delivery
 *  is handled by the send-push Edge Function (v2 — see supabase/functions/
 *  send-push/README.md). */
export function useEnqueuePush() {
  return useMutation({
    mutationFn: async (input: EnqueueInput): Promise<string> => {
      const { data, error } = await supabase.rpc('enqueue_push', {
        _user_id: input.user_id,
        _title: input.title,
        _body: input.body ?? undefined,
        _url: input.url ?? undefined,
        _data: (input.data ?? {}) as never,
      });
      if (error) throw error;
      return data as unknown as string;
    },
  });
}
