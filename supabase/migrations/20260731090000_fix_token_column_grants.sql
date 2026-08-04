-- 20260730214651'deki kolon-bazlı REVOKE'lar no-op'tu: PostgreSQL'de tablo
-- seviyesindeki GRANT SELECT dururken REVOKE SELECT (kolon) o grant'i
-- daraltmaz. oauth_tokens / dcr_client (client_secret içerir) fiilen tüm
-- workspace üyelerine açık kalıyordu. Doğru desen: tablo grant'ini kaldır,
-- güvenli kolon listesine grant ver. Client zaten bu tablolara doğrudan
-- yazmıyor (tüm akış mcp-connections edge fonksiyonunda, service_role ile);
-- tek istisna disconnect'in kullanıcı-JWT'li DELETE'i — o korunuyor.

-- workspace_connections: SELECT yalnızca token-dışı kolonlar; INSERT/UPDATE
-- client'a kapalı (edge fn service_role ile yapar); DELETE RLS'e tabi kalır.
REVOKE SELECT, INSERT, UPDATE ON public.workspace_connections FROM authenticated, anon;
GRANT SELECT (
  id, workspace_id, catalog_key, display_name, scope, owner_user_id,
  state, auth_url, mcp_url, transport, error, created_at, updated_at
) ON public.workspace_connections TO authenticated;

-- user_mcp_servers: frontend bu tabloyu henüz hiç kullanmıyor; token kolonu
-- dışındaki her şeye sahibi erişebilsin (RLS user_id = auth.uid() zaten var).
REVOKE SELECT, INSERT, UPDATE ON public.user_mcp_servers FROM authenticated, anon;
GRANT SELECT (id, user_id, workspace_id, name, url, transport, created_at, updated_at)
  ON public.user_mcp_servers TO authenticated;
GRANT INSERT (user_id, workspace_id, name, url, transport)
  ON public.user_mcp_servers TO authenticated;
GRANT UPDATE (name, url, transport)
  ON public.user_mcp_servers TO authenticated;

-- integrations_catalog: anon'un okuması için bir neden yok (giriş öncesi
-- yüzeyde katalog gösterilmiyor); authenticated'a daralt.
REVOKE SELECT ON public.integrations_catalog FROM anon;
DROP POLICY IF EXISTS "catalog readable by everyone" ON public.integrations_catalog;
CREATE POLICY "catalog readable by authenticated"
  ON public.integrations_catalog FOR SELECT TO authenticated USING (true);
