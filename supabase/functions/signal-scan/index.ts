// F6 — Sinyal → Inbox kural motoru. Günlük cron (review-reminder ile aynı
// zamanlayıcı düzeni; öneri "15 7 * * *"). Sabit 5 kural; workspace başına
// aç/kapa + tek eşik parametresi (signal_rules). Aynı nesne için aynı kural
// yalnızca BİR kez approval üretir (signal_events unique dedup).
//
// Güvenlik: verify_jwt=false; çağıran service_role key'i veya CRON_SECRET
// sunmak zorunda. Yanıt yalnızca sayaç döndürür, tenant verisi içermez.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";

type RuleKey =
  | "overdue_receivable" | "budget_overrun" | "stale_opportunity"
  | "critical_bug_open" | "contract_expiring";

const DEFAULTS: Record<RuleKey, number> = {
  overdue_receivable: 14,   // gün
  budget_overrun: 100,      // % (params yoksa bütçenin alert_threshold_pct'i)
  stale_opportunity: 14,    // gün
  critical_bug_open: 48,    // saat
  contract_expiring: 30,    // gün
};

interface Hit {
  objectId: string;
  kind: string;
  priority: "normal" | "high" | "urgent";
  title: string;
  summary: string;
  amount?: number | null;
  currency?: string | null;
}

function threshold(key: RuleKey, params: unknown): number {
  if (params && typeof params === "object") {
    const p = params as Record<string, unknown>;
    const v = p.days ?? p.hours ?? p.pct;
    if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
  }
  return DEFAULTS[key];
}

const daysAgoIso = (days: number) => new Date(Date.now() - days * 86400000).toISOString();
const daysAgoDate = (days: number) => new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
const inDaysDate = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const today = () => new Date().toISOString().slice(0, 10);

serve(async (req) => {
  const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const cronSecret = Deno.env.get("CRON_SECRET");
  const auth = req.headers.get("Authorization")?.replace("Bearer ", "");
  const secretHeader = req.headers.get("x-cron-secret");
  if (!(auth === svcKey || (!!cronSecret && secretHeader === cronSecret))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, svcKey);

  const { data: rules, error: rulesErr } = await admin
    .from("signal_rules").select("workspace_id,rule_key,params").eq("enabled", true);
  if (rulesErr) return new Response(JSON.stringify({ error: rulesErr.message }), { status: 500 });

  let created = 0;
  let skipped = 0;

  for (const rule of rules ?? []) {
    const ws = rule.workspace_id as string;
    const key = rule.rule_key as RuleKey;
    const t = threshold(key, rule.params);
    let hits: Hit[] = [];

    try {
      if (key === "overdue_receivable") {
        const { data } = await admin.from("fin_transactions")
          .select("id,description,amount,currency,txn_date")
          .eq("workspace_id", ws).eq("type", "income").eq("status", "pending")
          .lt("txn_date", daysAgoDate(t)).limit(20);
        hits = (data ?? []).map((r) => ({
          objectId: r.id, kind: "payment", priority: "high",
          title: `Tahsilat gecikti: ${r.description}`,
          summary: `${r.txn_date} tarihli gelir işlemi ${t} günden uzun süredir beklemede. Takip veya tahsilat kararı gerekli.`,
          amount: r.amount, currency: r.currency,
        }));
      } else if (key === "stale_opportunity") {
        const { data } = await admin.from("crm_opportunities")
          .select("id,name,amount,currency,last_activity_at,updated_at")
          .eq("workspace_id", ws).eq("status", "open").limit(200);
        const cutoff = daysAgoIso(t);
        hits = (data ?? [])
          .filter((o) => (o.last_activity_at ?? o.updated_at) < cutoff)
          .slice(0, 20)
          .map((o) => ({
            objectId: o.id, kind: "general", priority: "normal",
            title: `Fırsata ${t}+ gündür temas yok: ${o.name}`,
            summary: "Açık fırsat dokunulmadan bekliyor. Takip et, ertele veya kaybedildi olarak kapat — ama karar ver.",
            amount: o.amount, currency: o.currency,
          }));
      } else if (key === "critical_bug_open") {
        const { data } = await admin.from("bugs")
          .select("id,title,created_at,status")
          .eq("workspace_id", ws).eq("severity", "critical")
          .not("status", "in", "(resolved,closed)")
          .lt("created_at", new Date(Date.now() - t * 3600000).toISOString())
          .limit(20);
        hits = (data ?? []).map((b) => ({
          objectId: b.id, kind: "project_escalation", priority: "urgent",
          title: `Kritik bug ${t} saattir açık: ${b.title}`,
          summary: "Kritik önemde bug eskale eşiğini aştı. Kaynak ataması veya kapsam kararı gerekli.",
        }));
      } else if (key === "contract_expiring") {
        const { data } = await admin.from("crm_contracts")
          .select("id,title,end_date,value,currency")
          .eq("workspace_id", ws)
          .not("end_date", "is", null)
          .gte("end_date", today()).lte("end_date", inDaysDate(t))
          .limit(20);
        hits = (data ?? []).map((c) => ({
          objectId: c.id, kind: "contract", priority: "high",
          title: `Sözleşme bitiyor (${c.end_date}): ${c.title}`,
          summary: `Bitişe ${t} günden az kaldı. Yenileme, yeniden pazarlık veya sonlandırma kararı gerekli.`,
          amount: c.value, currency: c.currency,
        }));
      } else if (key === "budget_overrun") {
        const { data: budgets } = await admin.from("fin_budgets")
          .select("id,name,amount,amount_base,currency,category_id,alert_threshold_pct,period_start,period_end")
          .eq("workspace_id", ws)
          .lte("period_start", today()).gte("period_end", today()).limit(50);
        for (const b of budgets ?? []) {
          if (!b.category_id) continue; // v1: kategori bütçeleri
          const { data: txns } = await admin.from("fin_transactions")
            .select("amount_base")
            .eq("workspace_id", ws).eq("type", "expense").eq("category_id", b.category_id)
            .in("status", ["posted", "reconciled"])
            .gte("txn_date", b.period_start).lte("txn_date", b.period_end);
          const spent = (txns ?? []).reduce((s, r) => s + Number(r.amount_base ?? 0), 0);
          const budgetBase = Number(b.amount_base ?? b.amount);
          const pct = rule.params && typeof rule.params === "object" &&
            typeof (rule.params as Record<string, unknown>).pct === "number"
              ? (rule.params as Record<string, number>).pct
              : Number(b.alert_threshold_pct ?? 90);
          if (budgetBase > 0 && spent >= (budgetBase * pct) / 100) {
            hits.push({
              objectId: b.id, kind: "budget_change", priority: "high",
              title: `Bütçe eşiği aşıldı: ${b.name}`,
              summary: `Dönem harcaması ${Math.round((spent / budgetBase) * 100)}%'e ulaştı (eşik %${pct}). Bütçe artışı veya harcama freni kararı gerekli.`,
              amount: spent, currency: b.currency,
            });
          }
        }
      }
    } catch { continue; } // tek kural hatası taramayı durdurmaz

    for (const hit of hits) {
      // dedup: bu nesne için bu kural daha önce tetiklendiyse atla
      const { error: evErr } = await admin.from("signal_events").insert({
        workspace_id: ws, rule_key: key, object_id: hit.objectId,
      });
      if (evErr) { skipped++; continue; } // unique ihlali = zaten üretilmiş

      const { data: appr } = await admin.from("approvals").insert({
        workspace_id: ws,
        kind: hit.kind,
        title: hit.title,
        summary: hit.summary + "\n\n(Kaynak: FounderOS sinyal kuralı)",
        priority: hit.priority,
        amount: hit.amount ?? null,
        currency: hit.currency ?? null,
        context: { source: "signal_rule", rule_key: key, object_id: hit.objectId },
      }).select("id").single();

      if (appr) {
        await admin.from("signal_events")
          .update({ approval_id: appr.id })
          .eq("workspace_id", ws).eq("rule_key", key).eq("object_id", hit.objectId);
        created++;
      }
    }
  }

  return new Response(
    JSON.stringify({ ok: true, rules: (rules ?? []).length, created, skipped }),
    { headers: { "Content-Type": "application/json" } },
  );
});
