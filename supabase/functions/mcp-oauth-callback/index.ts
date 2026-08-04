// Public OAuth callback for MCP PKCE flow. verify_jwt = false (see config.toml).
// Receives ?code&state from the OAuth provider, exchanges for tokens,
// updates the connection to "ready", then posts a message to the popup opener
// and closes the window.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import { mcpRpc, parseRpc, exchangeCode } from "../_shared/mcp-oauth.ts";

function html(body: string, status = 200) {
  return new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));
}

function renderResult(kind: "ok" | "error", rawMessage: string, connectionId?: string) {
  // Query paramlarından gelen metin HTML'e ve <script>'e gömülüyor;
  // ikisi de kaçışlanmazsa callback sayfası reflected-XSS yüzeyi olur.
  const message = escapeHtml(rawMessage);
  const payload = JSON.stringify({ source: "mcp-oauth", kind, message: rawMessage, connectionId })
    .replace(/</g, "\\u003c");
  return html(`<!doctype html><html><head><meta charset="utf-8"><title>MCP auth</title>
<style>body{font-family:system-ui;background:#0b0d10;color:#e6e8eb;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.card{background:#151719;padding:24px 28px;border-radius:12px;max-width:420px;text-align:center;border:1px solid #23262a}
h1{font-size:16px;margin:0 0 8px;color:${kind === "ok" ? "#34d399" : "#f87171"}}
p{font-size:13px;color:#a1a5aa;margin:0}</style></head><body>
<div class="card"><h1>${kind === "ok" ? "Connected ✓" : "Auth failed"}</h1><p>${message}</p></div>
<script>
try { window.opener && window.opener.postMessage(${payload}, "*"); } catch(e) {}
setTimeout(function(){ window.close(); }, 1200);
</script></body></html>`, kind === "ok" ? 200 : 400);
}

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const err = url.searchParams.get("error");
    const errDesc = url.searchParams.get("error_description");

    if (err) return renderResult("error", `${err}: ${errDesc || ""}`);
    if (!code || !state) return renderResult("error", "Missing code or state");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: st } = await admin.from("mcp_oauth_states").select("*").eq("state", state).maybeSingle();
    if (!st) return renderResult("error", "Unknown or expired state");
    // Consume immediately
    await admin.from("mcp_oauth_states").delete().eq("state", state);
    if (new Date(st.expires_at).getTime() < Date.now()) return renderResult("error", "State expired");

    let tokens;
    try {
      tokens = await exchangeCode({
        tokenEndpoint: st.token_endpoint,
        code,
        redirectUri: st.redirect_uri,
        clientId: st.client_id,
        clientSecret: st.client_secret || undefined,
        codeVerifier: st.code_verifier,
      });
    } catch (e) {
      await admin.from("workspace_connections").update({
        state: "failed",
        error: e instanceof Error ? e.message : String(e),
      }).eq("id", st.connection_id);
      return renderResult("error", "Token exchange failed", st.connection_id);
    }

    // Load connection for probe
    const { data: conn } = await admin.from("workspace_connections")
      .select("mcp_url,dcr_client").eq("id", st.connection_id).maybeSingle();

    let probeOk = false;
    let probeErr: string | undefined;
    if (conn) {
      try {
        const resp = await mcpRpc(conn.mcp_url, "tools/list", {}, tokens.access_token);
        if (resp.ok) { await parseRpc(resp); probeOk = true; }
        else probeErr = `HTTP ${resp.status}`;
      } catch (e) { probeErr = e instanceof Error ? e.message : String(e); }
    }

    await admin.from("workspace_connections").update({
      state: probeOk ? "ready" : "failed",
      auth_url: null,
      error: probeOk ? null : (probeErr || "Probe failed after auth"),
      oauth_tokens: tokens,
    }).eq("id", st.connection_id);

    return probeOk
      ? renderResult("ok", "Integration connected. You can close this window.", st.connection_id)
      : renderResult("error", `Authenticated but MCP probe failed: ${probeErr || ""}`, st.connection_id);
  } catch (e) {
    return renderResult("error", e instanceof Error ? e.message : String(e));
  }
});
