// MCP connections manager — list/connect/disconnect/retry/list_tools/invoke_tool
// with full OAuth 2.1 + PKCE + Dynamic Client Registration flow.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import {
  corsHeaders, json,
  mcpRpc, parseRpc,
  discoverOAuth, registerClient,
  randomB64Url, pkceChallenge, buildAuthorizeUrl, callbackUrl,
  refreshTokens, type Tokens,
} from "../_shared/mcp-oauth.ts";

async function probeMcp(url: string, bearer?: string) {
  try {
    const initResp = await mcpRpc(url, "initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "FounderOS", version: "1.0" },
    }, bearer);

    if (initResp.status === 401 || initResp.status === 403) {
      const wwwAuth = initResp.headers.get("www-authenticate") || "";
      const meta = await discoverOAuth(url, wwwAuth);
      return { ok: false as const, needsAuth: true as const, meta, error: "Authentication required" };
    }
    if (!initResp.ok) {
      return { ok: false as const, needsAuth: false as const, error: `HTTP ${initResp.status}: ${await initResp.text()}` };
    }
    await parseRpc(initResp);

    const toolsResp = await mcpRpc(url, "tools/list", {}, bearer);
    if (!toolsResp.ok) return { ok: false as const, needsAuth: false as const, error: `tools/list HTTP ${toolsResp.status}` };
    const toolsJson = await parseRpc(toolsResp);
    return { ok: true as const, tools: toolsJson?.result?.tools ?? [] };
  } catch (e) {
    return { ok: false as const, needsAuth: false as const, error: e instanceof Error ? e.message : String(e) };
  }
}

// Refresh access token in-place when possible; returns bearer to use now.
async function ensureFreshToken(admin: any, connId: string, dcr: any, tokens: Tokens | null): Promise<string | undefined> {
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
    const merged: Tokens = {
      ...tokens,
      ...fresh,
      refresh_token: fresh.refresh_token || tokens.refresh_token,
    };
    await admin.from("workspace_connections").update({ oauth_tokens: merged }).eq("id", connId);
    return merged.access_token;
  } catch {
    return tokens.access_token;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, svcKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");

    const { data: activeWs } = await admin
      .from("user_active_workspace").select("workspace_id").eq("user_id", userId).maybeSingle();
    const ws = activeWs?.workspace_id;
    if (!ws) return json({ error: "No active workspace" }, 400);

    // Permission helpers
    const { data: roleRow } = await admin.rpc("workspace_role", { _workspace_id: ws, _user_id: userId });
    const role = String(roleRow ?? "");
    const isAdmin = role === "owner" || role === "admin";
    const { data: canManageRaw } = await admin.rpc("has_workspace_permission", {
      _workspace_id: ws, _user_id: userId, _module: "integrations", _action: "manage",
    });
    const canManage = isAdmin || !!canManageRaw;

    switch (action) {
      case "list": {
        const { data, error } = await admin
          .from("workspace_connections")
          .select("id,catalog_key,display_name,scope,owner_user_id,state,auth_url,mcp_url,transport,error,created_at,updated_at")
          .eq("workspace_id", ws)
          .or(`scope.eq.workspace,and(scope.eq.personal,owner_user_id.eq.${userId})`)
          .order("created_at", { ascending: false });
        if (error) return json({ error: error.message }, 500);
        return json({ items: data ?? [], permissions: { canManage, isAdmin, role } });
      }

      case "connect": {
        const {
          catalog_key, display_name, mcp_url,
          transport = "http", scope = "personal", bearer_token,
        } = body || {};

        if (!mcp_url || typeof mcp_url !== "string") return json({ error: "mcp_url required" }, 400);
        if (!/^https:\/\//.test(mcp_url) && !mcp_url.startsWith("http://localhost")) {
          return json({ error: "mcp_url must be https://" }, 400);
        }
        if (scope === "workspace" && !canManage) {
          return json({ error: "You don't have permission to add workspace-wide integrations" }, 403);
        }

        // Probe first — pass bearer if provided (static token flow)
        const probe = await probeMcp(mcp_url, bearer_token);

        // Insert row up-front so we have an id for state binding
        const { data: inserted, error: insErr } = await admin
          .from("workspace_connections")
          .insert({
            workspace_id: ws,
            catalog_key: catalog_key || null,
            display_name: display_name || "Custom MCP",
            scope,
            owner_user_id: scope === "personal" ? userId : null,
            state: "authenticating",
            mcp_url, transport,
            oauth_tokens: bearer_token ? { access_token: bearer_token, static: true } : null,
          })
          .select().single();
        if (insErr) return json({ error: insErr.message }, 500);

        if (probe.ok) {
          await admin.from("workspace_connections").update({ state: "ready", error: null }).eq("id", inserted.id);
          return json({ connection: { ...inserted, state: "ready" }, probe });
        }

        if (probe.needsAuth && probe.meta) {
          // Kick off OAuth PKCE + DCR
          const redirectUri = callbackUrl();
          let clientId: string | undefined;
          let clientSecret: string | undefined;
          if (probe.meta.registration_endpoint) {
            const reg = await registerClient(probe.meta.registration_endpoint, redirectUri, display_name || "FounderOS");
            if (reg) { clientId = reg.client_id; clientSecret = reg.client_secret; }
          }
          if (!clientId) {
            await admin.from("workspace_connections").update({
              state: "failed",
              error: "Server requires OAuth but does not support dynamic client registration.",
            }).eq("id", inserted.id);
            return json({
              connection: { ...inserted, state: "failed" },
              probe: { ok: false, error: "OAuth server does not support DCR. Configure a client manually or add a bearer token." },
            });
          }

          const verifier = randomB64Url(48);
          const challenge = await pkceChallenge(verifier);
          const state = randomB64Url(24);
          const scopeStr = Array.isArray(probe.meta.scopes_supported) && probe.meta.scopes_supported.length
            ? probe.meta.scopes_supported.join(" ")
            : undefined;

          await admin.from("mcp_oauth_states").insert({
            state,
            connection_id: inserted.id,
            workspace_id: ws,
            user_id: userId,
            code_verifier: verifier,
            redirect_uri: redirectUri,
            authorization_endpoint: probe.meta.authorization_endpoint,
            token_endpoint: probe.meta.token_endpoint,
            client_id: clientId,
            client_secret: clientSecret ?? null,
            scope: scopeStr ?? null,
          });

          const authUrl = buildAuthorizeUrl({
            authorizationEndpoint: probe.meta.authorization_endpoint,
            clientId, redirectUri, state, codeChallenge: challenge, scope: scopeStr,
          });

          await admin.from("workspace_connections").update({
            state: "authenticating",
            auth_url: authUrl,
            error: null,
            dcr_client: {
              client_id: clientId,
              client_secret: clientSecret ?? null,
              token_endpoint: probe.meta.token_endpoint,
              authorization_endpoint: probe.meta.authorization_endpoint,
              redirect_uri: redirectUri,
            },
          }).eq("id", inserted.id);

          return json({
            connection: { ...inserted, state: "authenticating", auth_url: authUrl },
            probe: { ok: false, authUrl },
          });
        }

        await admin.from("workspace_connections").update({
          state: "failed",
          error: probe.error || "Unable to reach MCP server",
        }).eq("id", inserted.id);
        return json({ connection: { ...inserted, state: "failed" }, probe });
      }

      case "disconnect": {
        const id = String(body?.id || "");
        if (!id) return json({ error: "id required" }, 400);
        const supaAsUser = createClient(supabaseUrl, svcKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { error } = await supaAsUser.from("workspace_connections").delete().eq("id", id);
        if (error) return json({ error: error.message }, 403);
        return json({ ok: true });
      }

      case "retry": {
        const id = String(body?.id || "");
        if (!id) return json({ error: "id required" }, 400);
        const { data: conn } = await admin
          .from("workspace_connections").select("*").eq("id", id).eq("workspace_id", ws).maybeSingle();
        if (!conn) return json({ error: "Not found" }, 404);
        if (conn.scope === "personal" && conn.owner_user_id !== userId) {
          return json({ error: "Not your connection" }, 403);
        }
        if (conn.scope === "workspace" && !canManage) {
          return json({ error: "You don't have permission to manage workspace integrations" }, 403);
        }
        const bearer = await ensureFreshToken(admin, id, conn.dcr_client, conn.oauth_tokens as Tokens | null);
        const probe = await probeMcp(conn.mcp_url, bearer);
        const state = probe.ok ? "ready" : "failed";
        await admin.from("workspace_connections").update({
          state, error: probe.ok ? null : (probe.error || null),
        }).eq("id", id);
        return json({ probe, state });
      }

      case "list_tools": {
        const { data: conns } = await admin
          .from("workspace_connections")
          .select("id,display_name,catalog_key,mcp_url,oauth_tokens,dcr_client,scope,owner_user_id")
          .eq("workspace_id", ws).eq("state", "ready")
          .or(`scope.eq.workspace,and(scope.eq.personal,owner_user_id.eq.${userId})`);
        const items: any[] = [];
        for (const c of conns ?? []) {
          const bearer = await ensureFreshToken(admin, c.id, c.dcr_client, c.oauth_tokens as Tokens | null);
          try {
            const resp = await mcpRpc(c.mcp_url, "tools/list", {}, bearer);
            if (!resp.ok) continue;
            const parsed = await parseRpc(resp);
            for (const t of parsed?.result?.tools ?? []) {
              items.push({
                connection_id: c.id, connection_name: c.display_name,
                catalog_key: c.catalog_key, name: t.name,
                description: t.description, input_schema: t.inputSchema,
              });
            }
          } catch { /* skip */ }
        }
        return json({ tools: items });
      }

      case "invoke_tool": {
        const { connection_id, name, arguments: args } = body || {};
        if (!connection_id || !name) return json({ error: "connection_id and name required" }, 400);
        const { data: conn } = await admin
          .from("workspace_connections")
          .select("mcp_url,oauth_tokens,dcr_client,scope,owner_user_id")
          .eq("id", connection_id).eq("workspace_id", ws).eq("state", "ready").maybeSingle();
        if (!conn) return json({ error: "Connection not ready" }, 404);
        if (conn.scope === "personal" && conn.owner_user_id !== userId) {
          return json({ error: "Not your connection" }, 403);
        }
        const bearer = await ensureFreshToken(admin, connection_id, conn.dcr_client, conn.oauth_tokens as Tokens | null);
        const resp = await mcpRpc(conn.mcp_url, "tools/call", { name, arguments: args || {} }, bearer);
        if (!resp.ok) return json({ error: `Provider ${resp.status}: ${await resp.text()}` }, resp.status);
        const parsed = await parseRpc(resp);
        return json({ result: parsed?.result });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (e) {
    console.error("mcp-connections error:", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
