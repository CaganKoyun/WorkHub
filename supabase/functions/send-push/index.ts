// deno-lint-ignore-file no-explicit-any
/**
 * send-push — WorkHub Web Push worker.
 *
 * Reads public.push_queue rows with status='queued', groups by user_id,
 * fetches that user's push_subscriptions, and delivers each notification
 * via the Web Push protocol using VAPID signatures.
 *
 * Invoke: HTTP POST (cron or manual). No body required; will process up
 * to _limit (default 50) rows per invocation.
 *
 * Required secrets (Supabase → Edge Function secrets):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (auto-injected by the platform)
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT   (mailto:you@…)
 *
 * A 404/410 from a push endpoint marks the subscription dead — we delete it
 * from push_subscriptions. Other failures bump `attempts` and set status=
 * 'failed' after 5 tries.
 */

// @ts-expect-error — Deno remote import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
// @ts-expect-error — Deno remote import
import webpush from 'https://esm.sh/web-push@3.6.7?target=deno';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUB    = Deno.env.get('VAPID_PUBLIC_KEY');
const VAPID_PRIV   = Deno.env.get('VAPID_PRIVATE_KEY');
const VAPID_SUB    = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@workhub.local';

function badConfig(reason: string) {
  return new Response(JSON.stringify({ ok: false, reason }), {
    status: 500, headers: { 'content-type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (!VAPID_PUB || !VAPID_PRIV) return badConfig('VAPID keys missing');

  webpush.setVapidDetails(VAPID_SUB, VAPID_PUB, VAPID_PRIV);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '50'), 200);

  // Claim a batch — flip queued→sending atomically so parallel invocations
  // don't double-send. Uses an UPDATE ... RETURNING pattern via RPC would be
  // cleaner; for the scaffold, a select+update loop is fine at low volume.
  const { data: batch, error: batchErr } = await admin
    .from('push_queue')
    .select('*')
    .eq('status', 'queued')
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(limit);
  if (batchErr) return badConfig(batchErr.message);

  const results: { id: string; ok: boolean; delivered: number; error?: string }[] = [];

  for (const item of (batch ?? []) as any[]) {
    await admin.from('push_queue').update({ status: 'sending', attempts: item.attempts + 1 }).eq('id', item.id);

    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', item.user_id);

    const payload = JSON.stringify({
      title: item.title,
      body: item.body,
      url: item.url,
      data: item.data,
    });

    let delivered = 0;
    let lastError: string | undefined;

    for (const s of (subs ?? []) as any[]) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        delivered += 1;
        await admin.from('push_subscriptions').update({ last_used_at: new Date().toISOString() }).eq('id', s.id);
      } catch (err: any) {
        lastError = err?.message ?? String(err);
        // 404/410 → dead subscription. Remove it.
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await admin.from('push_subscriptions').delete().eq('id', s.id);
        }
      }
    }

    const finalStatus = delivered > 0 ? 'sent' : item.attempts + 1 >= 5 ? 'failed' : 'queued';
    await admin.from('push_queue').update({
      status: finalStatus,
      sent_at: delivered > 0 ? new Date().toISOString() : null,
      last_error: lastError ?? null,
    }).eq('id', item.id);

    results.push({ id: item.id, ok: delivered > 0, delivered, error: lastError });
  }

  return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
    status: 200, headers: { 'content-type': 'application/json' },
  });
});
