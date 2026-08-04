-- 1) Seed integrations permission rows for every existing workspace
DO $$
DECLARE w RECORD;
BEGIN
  FOR w IN SELECT id FROM public.workspaces LOOP
    -- manager: full manage, member/viewer: view only, admin/owner: bypass in has_workspace_permission
    INSERT INTO public.workspace_permissions (workspace_id, role, module, action, allowed) VALUES
      (w.id, 'manager', 'integrations', 'view', true),
      (w.id, 'manager', 'integrations', 'create', true),
      (w.id, 'manager', 'integrations', 'update', true),
      (w.id, 'manager', 'integrations', 'delete', true),
      (w.id, 'manager', 'integrations', 'manage', true),
      (w.id, 'member',  'integrations', 'view', true),
      (w.id, 'member',  'integrations', 'create', false),
      (w.id, 'viewer',  'integrations', 'view', true)
    ON CONFLICT (workspace_id, role, module, action) DO NOTHING;
  END LOOP;
END $$;

-- 2) Update seed_default_permissions to include integrations for future workspaces
CREATE OR REPLACE FUNCTION public.seed_default_permissions(_workspace_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('manager','work','view',true),('manager','work','create',true),('manager','work','update',true),('manager','work','delete',true),
      ('manager','crm','view',true),('manager','crm','create',true),('manager','crm','update',true),('manager','crm','delete',false),
      ('manager','finance','view',true),('manager','finance','create',true),('manager','finance','update',true),('manager','finance','delete',false),
      ('manager','people','view',true),('manager','people','create',true),('manager','people','update',true),('manager','people','delete',false),
      ('manager','goals','view',true),('manager','goals','create',true),('manager','goals','update',true),('manager','goals','delete',true),
      ('manager','approvals','view',true),('manager','approvals','create',true),('manager','approvals','update',true),('manager','approvals','delete',false),
      ('manager','analytics','view',true),
      ('manager','integrations','view',true),('manager','integrations','create',true),('manager','integrations','update',true),('manager','integrations','delete',true),('manager','integrations','manage',true),
      ('manager','admin','view',false),
      ('member','work','view',true),('member','work','create',true),('member','work','update',true),('member','work','delete',false),
      ('member','crm','view',true),('member','crm','create',true),('member','crm','update',true),('member','crm','delete',false),
      ('member','finance','view',true),('member','finance','create',true),('member','finance','update',false),('member','finance','delete',false),
      ('member','people','view',true),('member','people','create',false),('member','people','update',false),('member','people','delete',false),
      ('member','goals','view',true),('member','goals','create',true),('member','goals','update',true),('member','goals','delete',false),
      ('member','approvals','view',true),('member','approvals','create',true),
      ('member','analytics','view',true),
      ('member','integrations','view',true),
      ('viewer','work','view',true),
      ('viewer','crm','view',true),
      ('viewer','finance','view',true),
      ('viewer','people','view',true),
      ('viewer','goals','view',true),
      ('viewer','approvals','view',true),
      ('viewer','analytics','view',true),
      ('viewer','integrations','view',true),
      ('guest','work','view',true)
    ) AS t(role, module, action, allowed)
  LOOP
    INSERT INTO public.workspace_permissions (workspace_id, role, module, action, allowed)
    VALUES (_workspace_id, r.role::public.workspace_role, r.module, r.action, r.allowed)
    ON CONFLICT (workspace_id, role, module, action) DO NOTHING;
  END LOOP;
END; $$;

-- 3) Replace RLS on workspace_connections to honor integrations.manage permission
DROP POLICY IF EXISTS "insert personal by self, workspace by admin" ON public.workspace_connections;
DROP POLICY IF EXISTS "update own or workspace by admin" ON public.workspace_connections;
DROP POLICY IF EXISTS "delete own or workspace by admin" ON public.workspace_connections;

CREATE POLICY "insert personal by self, workspace by manager"
  ON public.workspace_connections FOR INSERT TO authenticated
  WITH CHECK (
    public.is_workspace_member(workspace_id, auth.uid())
    AND (
      (scope = 'personal' AND owner_user_id = auth.uid())
      OR (scope = 'workspace' AND public.has_workspace_permission(workspace_id, auth.uid(), 'integrations', 'manage'))
    )
  );

CREATE POLICY "update own or workspace by manager"
  ON public.workspace_connections FOR UPDATE TO authenticated
  USING (
    public.is_workspace_member(workspace_id, auth.uid())
    AND (
      (scope = 'personal' AND owner_user_id = auth.uid())
      OR (scope = 'workspace' AND public.has_workspace_permission(workspace_id, auth.uid(), 'integrations', 'manage'))
    )
  );

CREATE POLICY "delete own or workspace by manager"
  ON public.workspace_connections FOR DELETE TO authenticated
  USING (
    public.is_workspace_member(workspace_id, auth.uid())
    AND (
      (scope = 'personal' AND owner_user_id = auth.uid())
      OR (scope = 'workspace' AND public.has_workspace_permission(workspace_id, auth.uid(), 'integrations', 'manage'))
    )
  );

-- 4) OAuth PKCE state store (server-only, no RLS reads from client)
CREATE TABLE IF NOT EXISTS public.mcp_oauth_states (
  state text PRIMARY KEY,
  connection_id uuid NOT NULL REFERENCES public.workspace_connections(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  code_verifier text NOT NULL,
  redirect_uri text NOT NULL,
  authorization_endpoint text NOT NULL,
  token_endpoint text NOT NULL,
  client_id text NOT NULL,
  client_secret text,
  scope text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes')
);
GRANT ALL ON public.mcp_oauth_states TO service_role;
ALTER TABLE public.mcp_oauth_states ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role reads/writes this table.

CREATE INDEX IF NOT EXISTS idx_mcp_oauth_states_expires ON public.mcp_oauth_states(expires_at);