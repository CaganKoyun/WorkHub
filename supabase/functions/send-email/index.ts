// deno-lint-ignore-file no-explicit-any
/**
 * send-email — WorkHub outbound email worker.
 *
 * Reads public.email_queue rows with status='pending', sends each via
 * Resend, marks 'sent' or 'error'. Invoke via HTTP POST (cron or manual).
 *
 * Required secrets (Supabase → Edge Function secrets):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (auto-injected)
 *   RESEND_API_KEY                            (from resend.com dashboard)
 *   EMAIL_FROM                                (e.g. "WorkHub <alerts@yourdomain.com>")
 *
 * Batch size defaults to 25; override with { limit: N } POST body.
 */

// @ts-expect-error — Deno remote import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_KEY   = Deno.env.get('RESEND_API_KEY');
const FROM         = Deno.env.get('EMAIL_FROM') ?? 'WorkHub <alerts@workhub.local>';

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function esc(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
}

function htmlWrap(subject: string, body: string, link: string | null) {
  const cta = link
    ? `<p style="margin:24px 0"><a href="${link}" style="display:inline-block;background:#5E6AD2;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:500">Aç</a></p>`
    : '';
  return `<!doctype html><html><body style="font-family:-apple-system,Inter,sans-serif;background:#0B0B0F;color:#F5F6F9;padding:32px 16px">
  <div style="max-width:520px;margin:0 auto;background:#111116;border:1px solid #24242a;border-radius:12px;padding:24px">
    <h1 style="font-size:18px;margin:0 0 12px;font-weight:600">${esc(subject)}</h1>
    <p style="font-size:14px;line-height:1.6;color:#c8c9d0;margin:0;white-space:pre-wrap">${esc(body)}</p>
    ${cta}
    <p style="font-size:11px;color:#7a7b83;margin-top:24px">
      Bu e-posta WorkHub bildirim tercihlerinden geliyor. Tercihlerini bildirim ayarlarından değiştirebilirsin.
    </p>
  </div>
</body></html>`;
}

async function sendOne(row: any): Promise<void> {
  if (!RESEND_KEY) throw new Error('RESEND_API_KEY missing');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: [row.to_email],
      subject: row.subject,
      html: htmlWrap(row.subject, row.body, row.link),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`resend ${res.status}: ${text.slice(0, 200)}`);
  }
}

Deno.serve(async (req) => {
  let limit = 25;
  try {
    const body = await req.json();
    if (typeof body?.limit === 'number') limit = Math.min(100, body.limit);
  } catch { /* no body ok */ }

  const { data: rows, error } = await sb
    .from('email_queue')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });

  let sent = 0, failed = 0;
  for (const row of rows ?? []) {
    try {
      await sendOne(row);
      await sb.from('email_queue').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', row.id);
      sent++;
    } catch (e: any) {
      await sb.from('email_queue').update({ status: 'error', error: String(e.message ?? e).slice(0, 500) }).eq('id', row.id);
      failed++;
    }
  }

  return new Response(JSON.stringify({ ok: true, sent, failed, processed: (rows ?? []).length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
