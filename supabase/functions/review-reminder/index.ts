// PRD Görev 2 — Review hatırlatma cron'u.
// Günlük zamanlanmış çağrı (Supabase Dashboard → Edge Functions → Schedules,
// önerilen: "0 7 * * *"). pg_cron VARSAYILMAZ; dışarıdan tetiklenir.
//
// Kurallar (src/lib/notification-utils.ts ile aynı sözleşme, birim testli):
// - workspace başına ayrı değerlendirme
// - alıcılar: workspace owner'ları (kurucu)
// - kullanıcı başına günde EN FAZLA 1 bildirim (aynı UTC günü idempotent)
// - notification_preferences.review_reminder = false ise gönderme (yoksa açık)
// - içerik: vadesi gelen karar sayısı + en eskisinin başlığı
//
// Güvenlik: verify_jwt=false (cron çağrısı) — bunun yerine çağıran,
// SERVICE_ROLE key'i ya da CRON_SECRET'ı Authorization/x-cron-secret ile
// sunmak zorunda. Yanıt hiçbir tenant verisi içermez (sadece sayaçlar).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";

const KIND = "review_reminder";

function isSameUtcDay(a: string | Date, b: Date): boolean {
  const da = new Date(a);
  return (
    da.getUTCFullYear() === b.getUTCFullYear() &&
    da.getUTCMonth() === b.getUTCMonth() &&
    da.getUTCDate() === b.getUTCDate()
  );
}

serve(async (req) => {
  const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const cronSecret = Deno.env.get("CRON_SECRET");
  const auth = req.headers.get("Authorization")?.replace("Bearer ", "");
  const secretHeader = req.headers.get("x-cron-secret");
  const authorized = auth === svcKey || (!!cronSecret && secretHeader === cronSecret);
  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, svcKey);
  const now = new Date();

  // Vadesi gelmiş, verdict'siz kararlar (tüm workspace'ler; grup client-side)
  const { data: due, error: dueErr } = await admin
    .from("decisions")
    .select("workspace_id,title,review_at")
    .eq("status", "decided")
    .is("verdict", null)
    .lte("review_at", now.toISOString())
    .order("review_at", { ascending: true });
  if (dueErr) return new Response(JSON.stringify({ error: dueErr.message }), { status: 500 });

  const byWorkspace = new Map<string, { count: number; oldestTitle: string }>();
  for (const d of due ?? []) {
    const cur = byWorkspace.get(d.workspace_id);
    if (cur) cur.count += 1;
    else byWorkspace.set(d.workspace_id, { count: 1, oldestTitle: d.title });
  }

  let sent = 0;
  let skipped = 0;

  for (const [ws, info] of byWorkspace) {
    const { data: owners } = await admin
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", ws)
      .eq("role", "owner")
      .eq("is_active", true);

    for (const owner of owners ?? []) {
      // Tercih (kayıt yoksa varsayılan açık)
      const { data: pref } = await admin
        .from("notification_preferences")
        .select("review_reminder")
        .eq("user_id", owner.user_id)
        .maybeSingle();
      if (pref?.review_reminder === false) { skipped++; continue; }

      // Günde 1: bu UTC gününde aynı tür bildirim var mı?
      const { data: last } = await admin
        .from("notifications")
        .select("created_at")
        .eq("user_id", owner.user_id)
        .eq("workspace_id", ws)
        .eq("kind", KIND)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (last && isSameUtcDay(last.created_at, now)) { skipped++; continue; }

      const plural = info.count === 1 ? "1 kararın" : `${info.count} kararın`;
      const { error: insErr } = await admin.from("notifications").insert({
        workspace_id: ws,
        user_id: owner.user_id,
        kind: KIND,
        title: `${plural} yeniden açılış vakti geldi`,
        body: `En eskisi: ${info.oldestTitle}. Doğruydu / Değişti / Yanlıştı — kapat ve kalibrasyonunu gör.`,
        link: "/decisions",
      });
      if (!insErr) sent++;
    }
  }

  return new Response(
    JSON.stringify({ ok: true, workspaces: byWorkspace.size, sent, skipped }),
    { headers: { "Content-Type": "application/json" } },
  );
});
