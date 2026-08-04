DROP POLICY IF EXISTS "pm ws select" ON public.project_messages;
DROP POLICY IF EXISTS "pm ws insert" ON public.project_messages;
DROP POLICY IF EXISTS "pf ws select" ON public.project_files;
DROP POLICY IF EXISTS "pf ws insert" ON public.project_files;

CREATE POLICY "pm ws select" ON public.project_messages FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "pm ws insert" ON public.project_messages FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "pf ws select" ON public.project_files FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "pf ws insert" ON public.project_files FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND public.is_workspace_member(workspace_id, auth.uid()));

COMMENT ON FUNCTION public.is_workspace_member(uuid, uuid) IS
  'CANONICAL ARGUMENT ORDER: (_workspace_id, _user_id). Call as is_workspace_member(workspace_id, auth.uid()). Reversed order silently returns false.';

DO $$
BEGIN
  IF to_regclass('public.workspace_connections') IS NOT NULL THEN
    REVOKE SELECT (oauth_tokens, dcr_client) ON public.workspace_connections FROM authenticated, anon;
    REVOKE UPDATE (oauth_tokens, dcr_client) ON public.workspace_connections FROM authenticated, anon;
  END IF;
  IF to_regclass('public.user_mcp_servers') IS NOT NULL THEN
    REVOKE SELECT (oauth_tokens) ON public.user_mcp_servers FROM authenticated, anon;
    REVOKE UPDATE (oauth_tokens) ON public.user_mcp_servers FROM authenticated, anon;
  END IF;
END $$;