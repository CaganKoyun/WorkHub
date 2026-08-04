
# Integrations & Custom MCP

Kullanıcının seçimlerine göre: workspace + kişisel connections, custom MCP OAuth flow, hem merkezi Settings hem her modülde panel.

## 1. Data model (migration)

Yeni tablolar (hepsi `workspace_id` + RLS + GRANT ile):

- **`integrations_catalog`** — kürasyonu tuttuğumuz "hazır" entegrasyonlar (workspace_id yok, global seed).
  - `id, key, name, category, description, icon, auth_type ('oauth'|'apikey'|'mcp'), mcp_url, docs_url, domains text[]` (örn. `{"crm","comms"}`).
- **`workspace_connections`** — workspace-level bağlantılar.
  - `id, workspace_id, catalog_key, display_name, scope ('workspace'|'personal'), owner_user_id (personal ise), state ('ready'|'authenticating'|'failed'), auth_url, mcp_url, transport, oauth_tokens jsonb, dcr_client jsonb, created_at, updated_at`.
  - RLS: workspace member okuyabilir; `personal` scope sadece owner görür; insert/update/delete role bazlı (`has_role`).
- **`user_mcp_servers`** — kullanıcının kendi custom MCP URL'leri (personal shortcut).
  - `id, user_id, workspace_id, name, url, transport, oauth_tokens jsonb`.

Seed: HubSpot, Slack, Linear, Notion, GitHub, Google Drive, Google Calendar, Stripe, Gmail, Figma — her biri ilgili `domains` (crm/comms/product/finance) ile.

## 2. Backend (edge functions)

Tek `mcp-connections` fonksiyonu, aksiyonları JSON body ile:

- `list` — workspace + personal connection'ları döner.
- `connect` — verilen `catalog_key` veya custom `{url, name}` ile MCP probe eder (AI SDK `createMCPClient`). Başarılı → `ready`, OAuth gerekli → `{state:'authenticating', authUrl}`, DCR verisini saklar.
- `oauth-callback` — OAuth kodunu değişir, token kaydeder, `ready` işaretler. Küçük başarı HTML döner.
- `disconnect` — sadece owner veya admin.
- `well-known/oauth-client` — CIMD metadata.

`ai-chat` edge function güncellemesi: mevcut `Authorization: Bearer` ile user'ı çözer, workspace'in `ready` connection'larını (ve user'ın personal olanlarını) yükler, `tool_search` + `tool_invoke` meta-tool pattern'i ile modele verir (çünkü 10+ MCP olabilir). Response bitince tüm MCP client'ları kapatır. AI SDK `@ai-sdk/mcp` ve `zod` eklenir.

Auth: her request `Authorization: Bearer <access_token>`; unauth → 401.

## 3. Frontend

- **`src/lib/integrations-hooks.ts`** — `useCatalog`, `useConnections`, `useConnectMutation`, `useDisconnectMutation`. React Query.
- **`src/components/integrations/ConnectionCard.tsx`** — logo, isim, durum badge (Ready/Auth pending/Not connected), Connect/Disconnect butonu, scope switch (Workspace ↔ Personal, `has_role('admin')` yoksa Personal-only).
- **`src/components/integrations/IntegrationsPanel.tsx`** — `domain` prop ile filtreli grid. Modül sayfalarına gömülür.
- **`src/components/integrations/CustomMcpDialog.tsx`** — URL + isim, transport seç (HTTP/SSE), Personal/Workspace. Kaydet → connect flow (OAuth gerekiyorsa popup).
- **`src/pages/Integrations.tsx`** — kategori sekmeleri (All, CRM, Comms, Dev, Finance, Storage, Custom MCP), tam katalog, mevcut connection listesi, "Add custom MCP" butonu.
- **Route**: `/integrations`, sidebar'da Settings altına link, TopBar'daki Create menüsüne kısayol.
- **Modül entegrasyonu**: `Crm.tsx`, `Finance.tsx`, `Product.tsx`, `AiChat.tsx`, `FounderInbox.tsx` sayfalarına başlık altına küçük `<IntegrationsPanel domain="crm" compact />` şeridi.
- **AI Chat**: sağ üst köşede "N tool bağlı" chip → Integrations sayfasına link. Sistem mesajı: model tool_search/tool_invoke kullansın diye kısa not.

## 4. Güvenlik & UX

- Token'lar sadece server-side (RLS + service role sadece edge function). Frontend'e asla düşmez.
- Custom MCP URL validation: sadece `https://` prod'da, `redirect: "error"`.
- Personal connection'lar sadece owner'a görünür (RLS `owner_user_id = auth.uid()`).
- Loading/failed state'ler + retry butonu; unauth kullanıcıya "Sign in required" boş state.
- Connect popup açılır → OAuth tamamlanınca `postMessage` ile parent'a state döner → liste refresh.

## Teknik notlar

- MCP client: `@ai-sdk/mcp` (npm) — `createMCPClient({ transport: { type: "http", url, authProvider, redirect: "error" } })`.
- Meta-tool pattern (ai-sdk-tool-deferral): AI Chat context şişmesin diye default deferral.
- Edge function bundle: her connection için short-lived client, `client.tools()` sonrası `client.close()`.
- Tool namespacing: `{catalog_key}.{tool_name}` — collision önler ve `tool_search({server})` filtresi çalışır.
- OAuth callback route: `/integrations/oauth-callback` (frontend) → edge function'a code forward → sonuç → window.close.

## Dosya listesi

**Yeni**: `supabase/migrations/<ts>_integrations.sql`, `supabase/functions/mcp-connections/index.ts`, `src/lib/integrations-hooks.ts`, `src/lib/integrations-types.ts`, `src/components/integrations/{ConnectionCard,IntegrationsPanel,CustomMcpDialog,ConnectionsList}.tsx`, `src/pages/Integrations.tsx`, `src/pages/OAuthCallback.tsx`.

**Değişiklik**: `supabase/functions/ai-chat/index.ts` (MCP tools + meta-tools), `src/App.tsx` (route), `src/components/AppSidebar.tsx` (nav), `src/components/TopBar.tsx` (create menu), `src/pages/{Crm,Finance,Product,AiChat,FounderInbox}.tsx` (panel embed), `package.json` (`@ai-sdk/mcp`, `zod`).

## Sıra

1. Migration + seed catalog
2. Edge function (`mcp-connections`) + OAuth callback
3. Frontend hooks + Integrations sayfası + Custom MCP dialog
4. AI Chat'e MCP tool injection (meta-tool pattern)
5. Modül sayfalarına panel gömme

Onaylarsan başlıyorum.
