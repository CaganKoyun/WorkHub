// Notification scheduler — cron every 15 minutes.
// Checks for: overdue approvals, decision review due, and generates
// in-app notifications respecting user preferences.
//
// Auth: SERVICE_ROLE key or CRON_SECRET via header.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";

serve(async (req) => {
  const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const cronSecret = Deno.env.get("CRON_SECRET");
  const auth = req.headers.get("Authorization")?.replace("Bearer ", "");
  const secretHeader = req.headers.get("x-cron-secret");
  if (auth !== svcKey && !(cronSecret && secretHeader === cronSecret)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, svcKey);
  const now = new Date();
  const stats = { approval_overdue: 0, decision_review_due: 0, skipped: 0 };

  // --- Overdue approvals (pending > 48 hours) ---
  const cutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
  const { data: overdueApprovals } = await admin
    .from("approvals")
    .select("id,workspace_id,title,assigned_to,created_at")
    .eq("status", "pending")
    .lt("created_at", cutoff);

  for (const a of overdueApprovals ?? []) {
    const recipients = new Set<string>();

    if (a.assigned_to) recipients.add(a.assigned_to);

    const { data: admins } = await admin
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", a.workspace_id)
      .in("role", ["owner", "admin"])
      .eq("is_active", true);
    for (const m of admins ?? []) recipients.add(m.user_id);

    for (const uid of recipients) {
      const { data: pref } = await admin
        .from("notification_preferences")
        .select("approval_overdue")
        .eq("user_id", uid)
        .maybeSingle();
      if (pref?.approval_overdue === false) { stats.skipped++; continue; }

      const { data: existing } = await admin
        .from("notifications")
        .select("id")
        .eq("user_id", uid)
        .eq("kind", "approval_overdue")
        .eq("entity_type", "approval")
        .eq("entity_id", a.id)
        .gte("created_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1)
        .maybeSingle();
      if (existing) { stats.skipped++; continue; }

      await admin.from("notifications").insert({
        workspace_id: a.workspace_id,
        user_id: uid,
        kind: "approval_overdue",
        title: `Geciken onay: ${a.title}`,
        body: "Bu onay talebi 48 saati asti.",
        link: "/inbox",
        entity_type: "approval",
        entity_id: a.id,
      });
      stats.approval_overdue++;
    }
  }

  // --- Decision review due (decided, no verdict, review_at <= now) ---
  const { data: dueDecisions } = await admin
    .from("decisions")
    .select("id,workspace_id,title,created_by,owner_id")
    .eq("status", "decided")
    .is("verdict", null)
    .lte("review_at", now.toISOString());

  for (const d of dueDecisions ?? []) {
    const ownerId = d.owner_id ?? d.created_by;
    if (!ownerId) continue;

    const { data: pref } = await admin
      .from("notification_preferences")
      .select("decision_review_due")
      .eq("user_id", ownerId)
      .maybeSingle();
    if (pref?.decision_review_due === false) { stats.skipped++; continue; }

    const { data: existing } = await admin
      .from("notifications")
      .select("id")
      .eq("user_id", ownerId)
      .eq("kind", "decision_review_due")
      .eq("entity_type", "decision")
      .eq("entity_id", d.id)
      .gte("created_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
      .limit(1)
      .maybeSingle();
    if (existing) { stats.skipped++; continue; }

    await admin.from("notifications").insert({
      workspace_id: d.workspace_id,
      user_id: ownerId,
      kind: "decision_review_due",
      title: `Karar gozden gecirme: ${d.title}`,
      body: "Bu kararin 90 gunluk gozden gecirme suresi doldu.",
      link: `/decisions/${d.id}`,
      entity_type: "decision",
      entity_id: d.id,
    });
    stats.decision_review_due++;
  }

  return new Response(JSON.stringify({ ok: true, ...stats }), {
    headers: { "Content-Type": "application/json" },
  });
});
