import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import { mcpRpc, parseRpc, refreshTokens, type Tokens } from "../_shared/mcp-oauth.ts";

// ============================================================================
// Domain Agents — one function, four personas (the doc's own MVP list):
//   chief_of_staff | finance | projects | revenue
//
// Rules enforced here, not in the prompt alone:
//   * ALL queries are scoped to the caller's active workspace (the previous
//     version leaked every tenant's data into the context)
//   * finance data enters the context ONLY if the caller has the
//     finance/view permission — the agent obeys the same permission model
//     as the UI
//   * behavior ceiling is Level 3 (explain / recommend / draft); the agent
//     never claims to have executed anything
//   * every response ends with source attribution; sources are also returned
//     in the x-agent-sources header
// ============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Expose-Headers": "x-agent-sources",
};

type Domain = "chief_of_staff" | "finance" | "projects" | "revenue";
const DOMAINS: Domain[] = ["chief_of_staff", "finance", "projects", "revenue"];

// ---------------------------------------------------------------------------
// MCP araç köprüsü (salt-okunur). Seviye 3 tavanı KOD seviyesinde uygulanır:
// modele yalnızca okuma fiiliyle başlayan araçlar tanıtılır; yazma/eylem
// araçları (create/send/update/delete...) hiç görünmez. Eylem gerektiren
// istekler Founder Inbox onay akışına önerilir.
// ---------------------------------------------------------------------------
const READONLY_TOOL = /^(get|list|search|read|fetch|find|query|describe|lookup|show|retrieve|count|history)([_\-.]|$)/i;

interface McpToolRef {
  oaiName: string;          // modele tanıtılan isim (sanitize edilmiş)
  mcpName: string;          // MCP sunucusundaki gerçek isim
  description: string;
  parameters: Record<string, unknown>;
  connectionId: string;
  connectionName: string;
  mcpUrl: string;
  bearer?: string;
}

async function freshBearer(
  admin: ReturnType<typeof createClient>,
  connId: string,
  dcr: { token_endpoint?: string; client_id?: string; client_secret?: string } | null,
  tokens: Tokens | null,
): Promise<string | undefined> {
  if (!tokens?.access_token) return undefined;
  const exp = tokens.expires_at;
  if (!exp || Date.now() / 1000 < exp) return tokens.access_token;
  if (!tokens.refresh_token || !dcr?.token_endpoint || !dcr?.client_id) return tokens.access_token;
  try {
    const fresh = await refreshTokens({
      tokenEndpoint: dcr.token_endpoint,
      refreshToken: tokens.refresh_token,
      clientId: dcr.client_id,
      clientSecret: dcr.client_secret,
    });
    const merged: Tokens = { ...tokens, ...fresh, refresh_token: fresh.refresh_token || tokens.refresh_token };
    await admin.from("workspace_connections").update({ oauth_tokens: merged }).eq("id", connId);
    return merged.access_token;
  } catch {
    return tokens.access_token;
  }
}

/** Hazır bağlantılardan salt-okunur araç kataloğu toplar (en fazla 4 bağlantı, 40 araç). */
async function gatherReadonlyMcpTools(
  admin: ReturnType<typeof createClient>,
  ws: string,
  userId: string,
): Promise<McpToolRef[]> {
  const { data: conns } = await admin
    .from("workspace_connections")
    .select("id,display_name,catalog_key,mcp_url,oauth_tokens,dcr_client,scope,owner_user_id")
    .eq("workspace_id", ws).eq("state", "ready")
    .or(`scope.eq.workspace,and(scope.eq.personal,owner_user_id.eq.${userId})`)
    .limit(4);

  const tools: McpToolRef[] = [];
  for (const [i, c] of (conns ?? []).entries()) {
    try {
      const bearer = await freshBearer(admin, c.id, c.dcr_client, c.oauth_tokens as Tokens | null);
      const resp = await mcpRpc(c.mcp_url, "tools/list", {}, bearer);
      if (!resp.ok) continue;
      const parsed = await parseRpc(resp);
      for (const t of parsed?.result?.tools ?? []) {
        if (tools.length >= 40) break;
        if (!READONLY_TOOL.test(String(t.name ?? ""))) continue;
        const safe = String(t.name).replace(/[^a-zA-Z0-9_-]/g, "_");
        tools.push({
          oaiName: `c${i}__${safe}`.slice(0, 64),
          mcpName: t.name,
          description: `[${c.display_name}] ${String(t.description ?? "").slice(0, 400)}`,
          parameters: t.inputSchema ?? { type: "object", properties: {} },
          connectionId: c.id,
          connectionName: c.display_name,
          mcpUrl: c.mcp_url,
          bearer,
        });
      }
    } catch { /* bağlantı erişilemezse ajan araçsız devam eder */ }
  }
  return tools;
}

const SHARED_RULES = `
Kurallar:
- SADECE aşağıda verilen şirket verisini kullan. Veri yoksa "bu veri elimde yok" de; asla uydurma.
- Cevaplarını üç bölümle yapılandır: **Gözlem** (ne oluyor), **Yorum** (neden önemli), **Öneri** (ne yapılabilir).
- Yetki seviyen: açıklama, öneri ve taslak üretme. HİÇBİR işlemi kendin gerçekleştiremezsin ve gerçekleştirdiğini iddia edemezsin; önerilerini kullanıcının uygulaması gerekir.
- Emin olmadığın sayı hakkında kendinden emin konuşma; verinin eksik veya bayat olabileceği durumu açıkça söyle.
- Türkçe, net ve kısa yaz. Markdown kullan.
- Cevabının SONUNA tek satır ekle: "Kaynaklar: <kullandığın veri bölümleri>".`;

const PERSONAS: Record<Domain, string> = {
  chief_of_staff: `Sen FounderOS Chief of Staff'sın: kurucunun yanındaki deneyimli genel müdür yardımcısı. Görevin şirketin farklı alanlarındaki (iş, para, müşteri, karar) sinyalleri BİRLEŞTİRMEK ve kurucunun bugün neye müdahale etmesi gerektiğini önceliklendirmek. Tek bir alanın detayına boğulma; alanlar arası bağlantıları kur (örn. geciken proje → riske giren gelir → kapasite sorunu). Kurucunun kendisinde bekleyen onay ve kararları her zaman öne çıkar.${SHARED_RULES}`,
  finance: `Sen FounderOS Finance Agent'sın: temkinli, analitik bir finans kontrolörü. Uzmanlığın nakit akışı, bütçe, harcama kontrolü ve tahsilat. Rakamları yorumlarken muhafazakâr ol; iyimser senaryoyu değil gerçekçi olanı anlat. Nakit pozisyonu tek agregat sayı olarak gelir; işlem detayı verilmediyse detay uydurmadığını belirt.${SHARED_RULES}`,
  projects: `Sen FounderOS Program Manager Agent'sın: teslimata odaklı kıdemli bir program yöneticisi. Uzmanlığın proje sağlığı, gecikme kök nedenleri, bloklanmış işler ve kapasite. Gecikme gördüğünde nedenini verideki açık iş/bug/onay bağlantılarından çıkarmaya çalış; veri yetmiyorsa hangi bilginin eksik olduğunu söyle.${SHARED_RULES}`,
  revenue: `Sen FounderOS Revenue Agent'sın: pipeline disiplinine inanan kıdemli bir satış yöneticisi. Uzmanlığın fırsat önceliklendirme, riskli fırsatlar, takip disiplini ve forecast gerçekçiliği. Weighted pipeline ile ham pipeline'ı ayır; kapanış tarihi geçmiş fırsatları her zaman işaretle.${SHARED_RULES}`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) return json({ error: "AI service not configured" }, 500);

    const supabase = createClient(supabaseUrl, supabaseKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    // ---------- input validation (unchanged limits) ----------
    const body = await req.json();
    const rawMessage = body?.message;
    const rawHistory = body?.history;
    const rawDomain = body?.domain;

    if (typeof rawMessage !== "string" || rawMessage.trim().length === 0 || rawMessage.length > 4000) {
      return json({ error: "Invalid message: must be a non-empty string up to 4000 characters." }, 400);
    }
    const domain: Domain = DOMAINS.includes(rawDomain) ? rawDomain : "chief_of_staff";

    const MAX_HISTORY = 20;
    const MAX_HISTORY_CHARS = 20000;
    const safeHistory: { role: "user" | "assistant"; content: string }[] = [];
    if (Array.isArray(rawHistory)) {
      let totalChars = 0;
      for (const entry of rawHistory.slice(-MAX_HISTORY)) {
        if (
          !entry || typeof entry !== "object" || typeof entry.content !== "string" ||
          (entry.role !== "user" && entry.role !== "assistant") || entry.content.length > 4000
        ) continue; // drop invalid/system-role entries (prompt injection guard)
        totalChars += entry.content.length;
        if (totalChars > MAX_HISTORY_CHARS) break;
        safeHistory.push({ role: entry.role, content: entry.content });
      }
    }

    // ---------- workspace resolution + membership ----------
    const { data: activeWs } = await supabase
      .from("user_active_workspace").select("workspace_id").eq("user_id", userId).maybeSingle();
    const ws = activeWs?.workspace_id;
    if (!ws) return json({ error: "Aktif workspace bulunamadı." }, 400);

    const { data: membership } = await supabase
      .from("workspace_members").select("id")
      .eq("workspace_id", ws).eq("user_id", userId).eq("is_active", true).maybeSingle();
    if (!membership) return json({ error: "Bu workspace'in üyesi değilsin." }, 403);

    // ---------- permission-aware finance access ----------
    const { data: financeAllowed } = await supabase.rpc("has_workspace_permission", {
      _workspace_id: ws, _user_id: userId, _module: "finance", _action: "view",
    });
    if (domain === "finance" && !financeAllowed) {
      return json({ error: "Finans modülüne erişimin yok. Workspace sahibinden yetki iste." }, 403);
    }

    // ---------- workspace-scoped context ----------
    const sources: string[] = [];
    let context = "";

    // shared base: the same snapshot decisions freeze (single aggregates only)
    const { data: snapshot } = await supabase.rpc("build_company_snapshot", { _ws: ws });
    if (snapshot) {
      const s = snapshot as Record<string, unknown>;
      const cash = financeAllowed ? `Nakit pozisyonu: ${s.cash_position}` : "Nakit pozisyonu: (yetki yok)";
      context += `## Şirket Özeti (anlık)\n${cash}\nAçık görev: ${s.open_tasks} (geciken: ${s.overdue_tasks})\nAktif proje: ${s.active_projects}\nKritik bug: ${s.critical_bugs}\nBekleyen onay: ${s.pending_approvals}\nAçık risk: ${s.open_risks} (kritik: ${s.critical_risks})\nAçık fırsat: ${s.open_opportunities} (pipeline: ${s.pipeline_amount})\n\n`;
      sources.push("FounderOS Şirket Özeti");
    }

    if (domain === "chief_of_staff" || domain === "projects") {
      const { data: projects } = await supabase
        .from("projects").select("name,status,priority,due_date")
        .eq("workspace_id", ws).in("status", ["planned", "active", "on_hold"])
        .order("due_date", { ascending: true, nullsFirst: false }).limit(15);
      if (projects?.length) {
        context += "## Projeler\n" + projects.map((p) =>
          `- ${p.name} | durum: ${p.status} | öncelik: ${p.priority} | bitiş: ${p.due_date ?? "—"}`).join("\n") + "\n\n";
        sources.push(`FounderOS Projeler (${projects.length})`);
      }
      const { data: overdue } = await supabase
        .from("tasks").select("title,due_date,status")
        .eq("workspace_id", ws).neq("status", "done")
        .not("due_date", "is", null).lt("due_date", new Date().toISOString().slice(0, 10))
        .order("due_date").limit(15);
      if (overdue?.length) {
        context += "## Geciken Görevler\n" + overdue.map((t) =>
          `- ${t.title} | vade: ${t.due_date} | durum: ${t.status}`).join("\n") + "\n\n";
        sources.push(`FounderOS Geciken Görevler (${overdue.length})`);
      }
    }

    if (domain === "chief_of_staff") {
      const { data: approvals } = await supabase
        .from("approvals").select("title,kind,amount,currency,priority,created_at")
        .eq("workspace_id", ws).eq("status", "pending")
        .order("created_at").limit(10);
      if (approvals?.length) {
        context += "## Kurucuda Bekleyen Onaylar\n" + approvals.map((a) =>
          `- ${a.title} | tür: ${a.kind} | tutar: ${a.amount ?? "—"} ${a.currency ?? ""} | öncelik: ${a.priority} | açılış: ${a.created_at?.slice(0, 10)}`).join("\n") + "\n\n";
        sources.push(`FounderOS Bekleyen Onaylar (${approvals.length})`);
      }
      const { data: reviewDue } = await supabase
        .from("decisions").select("title,decided_at,expected_outcome,confidence")
        .eq("workspace_id", ws).eq("status", "decided").is("verdict", null)
        .not("review_at", "is", null).lte("review_at", new Date().toISOString()).limit(10);
      if (reviewDue?.length) {
        context += "## Yeniden Açılışı Gelen Kararlar\n" + reviewDue.map((d) =>
          `- ${d.title} | karar tarihi: ${d.decided_at?.slice(0, 10)} | bahis: ${d.expected_outcome ?? "—"} (güven %${d.confidence ?? "?"})`).join("\n") + "\n\n";
        sources.push(`FounderOS Karar Defteri (${reviewDue.length} vadesi gelen)`);
      }
    }

    if (domain === "revenue" || domain === "chief_of_staff") {
      const { data: opps } = await supabase
        .from("crm_opportunities").select("name,amount,currency,forecast_category,expected_close_date")
        .eq("workspace_id", ws).eq("status", "open")
        .order("amount", { ascending: false }).limit(12);
      if (opps?.length) {
        context += "## Açık Fırsatlar (tutara göre)\n" + opps.map((o) =>
          `- ${o.name} | ${o.amount} ${o.currency} | kategori: ${o.forecast_category} | tahmini kapanış: ${o.expected_close_date ?? "—"}`).join("\n") + "\n\n";
        sources.push(`FounderOS CRM Fırsatlar (${opps.length})`);
      }
    }

    if (domain === "finance" && financeAllowed) {
      const { data: txns } = await supabase
        .from("fin_transactions").select("description,amount,type,status,date")
        .eq("workspace_id", ws).in("status", ["posted", "reconciled"])
        .order("date", { ascending: false }).limit(20);
      if (txns?.length) {
        context += "## Son İşlemler\n" + txns.map((t) =>
          `- ${t.date} | ${t.type} | ${t.amount} | ${t.description ?? "—"} | ${t.status}`).join("\n") + "\n\n";
        sources.push(`FounderOS Finans İşlemleri (son ${txns.length})`);
      }
      const { data: budgets } = await supabase
        .from("fin_budgets").select("name,amount,period")
        .eq("workspace_id", ws).limit(10);
      if (budgets?.length) {
        context += "## Bütçeler\n" + budgets.map((b) =>
          `- ${b.name} | ${b.amount} | dönem: ${b.period}`).join("\n") + "\n\n";
        sources.push(`FounderOS Bütçeler (${budgets.length})`);
      }
    }

    // ---------- karar külliyatı (F5 — ajan hafızası, tüm domainler) ----------
    const VERDICT_TR: Record<string, string> = { held: "doğruydu", changed: "değişti", wrong: "yanlıştı" };
    const { data: pastDecisions } = await supabase
      .from("decisions")
      .select("title,expected_outcome,confidence,verdict,actual_outcome,status")
      .eq("workspace_id", ws)
      .order("created_at", { ascending: false })
      .limit(20);
    if (pastDecisions?.length) {
      context += "## Karar Külliyatı (son " + pastDecisions.length + " karar)\n" +
        pastDecisions.map((d) => {
          const wager = d.expected_outcome
            ? ` | bahis: ${d.expected_outcome}${d.confidence !== null ? ` (%${d.confidence} güven)` : ""}`
            : "";
          const outcome = d.verdict
            ? ` | sonuç: ${VERDICT_TR[d.verdict] ?? d.verdict}${d.actual_outcome ? ` — ${d.actual_outcome}` : ""}`
            : ` | durum: ${d.status}`;
          return `- ${d.title}${wager}${outcome}`;
        }).join("\n") +
        "\n\nYeni bir konu tartışılırken bu külliyattaki benzer kararları ve SONUÇLARINI hatırlat; " +
        "kurucunun geçmiş kalibrasyonuna aykırı iyimserlik görürsen söyle.\n\n";
      sources.push(`Karar Külliyatı (son ${pastDecisions.length})`);
    }

    if (!context) {
      context = "## Veri\nBu workspace'te henüz kayıtlı veri yok.\n\n";
    }

    // ---------- connected MCP tools (Integrations) ----------
    const { data: mcpConns } = await admin
      .from("workspace_connections")
      .select("display_name,catalog_key,scope,owner_user_id")
      .eq("workspace_id", ws)
      .eq("state", "ready")
      .or(`scope.eq.workspace,and(scope.eq.personal,owner_user_id.eq.${userId})`);
    let mcpBlock = "";
    if (mcpConns?.length) {
      mcpBlock = "\n## Bağlı Entegrasyonlar (MCP)\n" +
        mcpConns.map(c => `- ${c.display_name}${c.catalog_key ? ` (${c.catalog_key})` : ""} — ${c.scope}`).join("\n") +
        "\n\nBu servislerin SALT-OKUNUR araçlarını gerektiğinde kendin çağırabilirsin (veri çekme/arama). " +
        "Yazma/eylem araçların YOK: kullanıcı bir eylem isterse (ör. 'Slack'e mesaj at') taslağını hazırla ve Founder Inbox onayına taşımasını öner.\n";
      sources.push(`Bağlı Entegrasyonlar (${mcpConns.length})`);
    }

    const systemPrompt = `${PERSONAS[domain]}\n\n# ŞİRKET VERİSİ (yalnızca bu workspace, ${new Date().toISOString().slice(0, 16)} UTC itibarıyla)\n\n${context}${mcpBlock}`;

    const messages: Record<string, unknown>[] = [
      { role: "system", content: systemPrompt },
      ...safeHistory,
      { role: "user", content: rawMessage },
    ];

    const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
    const MODEL = "google/gemini-3-flash-preview";
    const gwHeaders = { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" };

    // ---------- salt-okunur MCP araç döngüsü (en fazla 3 tur) ----------
    const finalPayload: Record<string, unknown> = { model: MODEL, messages, stream: true };
    if (mcpConns?.length) {
      const toolRefs = await gatherReadonlyMcpTools(admin, ws, userId);
      if (toolRefs.length) {
        const oaiTools = toolRefs.map((t) => ({
          type: "function",
          function: { name: t.oaiName, description: t.description, parameters: t.parameters },
        }));
        const invoked = new Set<string>();

        for (let round = 0; round < 3; round++) {
          const r = await fetch(GATEWAY, {
            method: "POST",
            headers: gwHeaders,
            body: JSON.stringify({ model: MODEL, messages, tools: oaiTools, stream: false }),
          });
          if (!r.ok) break; // araçsız akışa düş — cevap yine üretilir
          const j = await r.json();
          const msg = j?.choices?.[0]?.message;
          const calls = msg?.tool_calls as
            | { id: string; function?: { name?: string; arguments?: string } }[]
            | undefined;
          if (!calls?.length) break;

          messages.push(msg);
          for (const call of calls.slice(0, 5)) {
            const ref = toolRefs.find((t) => t.oaiName === call.function?.name);
            let content = "Araç bulunamadı.";
            if (ref) {
              invoked.add(`${ref.connectionName}/${ref.mcpName}`);
              try {
                const args = JSON.parse(call.function?.arguments || "{}");
                const resp = await mcpRpc(ref.mcpUrl, "tools/call", { name: ref.mcpName, arguments: args }, ref.bearer);
                const parsed = await parseRpc(resp);
                content = JSON.stringify(parsed?.result ?? parsed ?? {}).slice(0, 8000);
              } catch (e) {
                content = "Araç hatası: " + (e instanceof Error ? e.message : String(e));
              }
            }
            messages.push({ role: "tool", tool_call_id: call.id, content });
          }
        }

        if (invoked.size) {
          sources.push(`MCP araçları: ${[...invoked].join(", ")}`);
          // Tool mesajları geçmişteyken araç tanımları da gönderilmeli;
          // tool_choice "none" final cevabın yeni araç çağırmasını engeller.
          finalPayload.tools = oaiTools;
          finalPayload.tool_choice = "none";
        }
      }
    }

    // ---------- final cevap: her zaman stream ----------
    const response = await fetch(GATEWAY, {
      method: "POST",
      headers: gwHeaders,
      body: JSON.stringify(finalPayload),
    });

    if (!response.ok) {
      if (response.status === 429) return json({ error: "Rate limit exceeded. Please try again later." }, 429);
      if (response.status === 402) return json({ error: "AI credits exhausted. Please add funds in workspace settings." }, 402);
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return json({ error: "AI service error" }, 500);
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "x-agent-sources": encodeURIComponent(JSON.stringify(sources)),
      },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
