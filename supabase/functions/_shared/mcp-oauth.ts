// Shared MCP + OAuth PKCE helpers.
// Deno runtime.

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomB64Url(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return b64url(arr);
}

export async function pkceChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return b64url(digest);
}

export function callbackUrl(): string {
  const supaUrl = Deno.env.get("SUPABASE_URL")!;
  return `${supaUrl}/functions/v1/mcp-oauth-callback`;
}

// -------- MCP JSON-RPC ----------
export async function mcpRpc(
  url: string,
  method: string,
  params: Record<string, unknown>,
  bearer?: string,
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  return fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: crypto.randomUUID(), method, params }),
    redirect: "error",
  });
}

export async function parseRpc(resp: Response): Promise<any> {
  const ct = resp.headers.get("content-type") || "";
  if (ct.includes("text/event-stream")) {
    const text = await resp.text();
    for (const line of text.split("\n")) {
      if (line.startsWith("data:")) {
        const raw = line.slice(5).trim();
        if (raw) return JSON.parse(raw);
      }
    }
    throw new Error("Empty MCP stream");
  }
  return await resp.json();
}

// -------- OAuth discovery ----------
export type OAuthMeta = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
  scopes_supported?: string[];
};

async function discoverFromResourceMetadata(url: string): Promise<OAuthMeta | null> {
  try {
    const rm = await fetch(url).then(r => r.ok ? r.json() : null);
    const asUrl = rm?.authorization_servers?.[0];
    if (!asUrl) return null;
    return await discoverAuthServer(asUrl);
  } catch { return null; }
}

async function discoverAuthServer(issuer: string): Promise<OAuthMeta | null> {
  const clean = issuer.replace(/\/$/, "");
  // Try RFC 8414 well-known first, then OIDC
  const candidates = [
    `${clean}/.well-known/oauth-authorization-server`,
    `${clean}/.well-known/openid-configuration`,
  ];
  for (const u of candidates) {
    try {
      const r = await fetch(u);
      if (r.ok) {
        const meta = await r.json();
        if (meta.authorization_endpoint && meta.token_endpoint) return meta as OAuthMeta;
      }
    } catch { /* next */ }
  }
  return null;
}

// Given an MCP 401 response, discover the OAuth authorization server metadata.
export async function discoverOAuth(mcpUrl: string, wwwAuth: string): Promise<OAuthMeta | null> {
  const m = /resource_metadata="([^"]+)"/.exec(wwwAuth);
  if (m) {
    const meta = await discoverFromResourceMetadata(m[1]);
    if (meta) return meta;
  }
  // Fallback: try /.well-known/oauth-protected-resource on the MCP origin
  try {
    const u = new URL(mcpUrl);
    const wellKnown = `${u.origin}/.well-known/oauth-protected-resource`;
    const meta = await discoverFromResourceMetadata(wellKnown);
    if (meta) return meta;
    // Last resort: treat the MCP origin itself as the auth server
    return await discoverAuthServer(u.origin);
  } catch { return null; }
}

// -------- Dynamic Client Registration (RFC 7591) ----------
export async function registerClient(
  registrationEndpoint: string,
  redirectUri: string,
  displayName: string,
): Promise<{ client_id: string; client_secret?: string } | null> {
  try {
    const r = await fetch(registrationEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_name: displayName || "FounderOS",
        redirect_uris: [redirectUri],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
        application_type: "web",
      }),
    });
    if (!r.ok) return null;
    const data = await r.json();
    return { client_id: data.client_id, client_secret: data.client_secret };
  } catch { return null; }
}

export type Tokens = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number; // unix seconds
  token_type?: string;
  scope?: string;
};

// Exchange authorization code (PKCE) for tokens.
export async function exchangeCode(params: {
  tokenEndpoint: string;
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret?: string;
  codeVerifier: string;
}): Promise<Tokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: params.clientId,
    code_verifier: params.codeVerifier,
  });
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  };
  if (params.clientSecret) {
    headers.Authorization = "Basic " + btoa(`${params.clientId}:${params.clientSecret}`);
  }
  const r = await fetch(params.tokenEndpoint, { method: "POST", headers, body });
  if (!r.ok) throw new Error(`Token exchange failed: ${r.status} ${await r.text()}`);
  const data = await r.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    token_type: data.token_type,
    scope: data.scope,
    expires_at: data.expires_in ? Math.floor(Date.now() / 1000) + Number(data.expires_in) - 30 : undefined,
  };
}

export async function refreshTokens(params: {
  tokenEndpoint: string;
  refreshToken: string;
  clientId: string;
  clientSecret?: string;
}): Promise<Tokens> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: params.refreshToken,
    client_id: params.clientId,
  });
  const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };
  if (params.clientSecret) {
    headers.Authorization = "Basic " + btoa(`${params.clientId}:${params.clientSecret}`);
  }
  const r = await fetch(params.tokenEndpoint, { method: "POST", headers, body });
  if (!r.ok) throw new Error(`Refresh failed: ${r.status}`);
  const data = await r.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token, // may be omitted; keep old if so
    token_type: data.token_type,
    scope: data.scope,
    expires_at: data.expires_in ? Math.floor(Date.now() / 1000) + Number(data.expires_in) - 30 : undefined,
  };
}

// Build the /authorize URL for the OAuth flow.
export function buildAuthorizeUrl(params: {
  authorizationEndpoint: string;
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  scope?: string;
}): string {
  const u = new URL(params.authorizationEndpoint);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", params.clientId);
  u.searchParams.set("redirect_uri", params.redirectUri);
  u.searchParams.set("state", params.state);
  u.searchParams.set("code_challenge", params.codeChallenge);
  u.searchParams.set("code_challenge_method", "S256");
  if (params.scope) u.searchParams.set("scope", params.scope);
  return u.toString();
}
