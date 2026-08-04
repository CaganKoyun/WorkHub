-- =========================================================
-- FAZ 1: Multi-tenancy foundation
-- =========================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE public.workspace_role AS ENUM ('owner','admin','manager','member','viewer','guest');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.workspace_plan AS ENUM ('trial','starter','growth','scale','enterprise');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.invitation_status AS ENUM ('pending','accepted','revoked','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================
-- workspaces
-- =========================================================
CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  industry text,
  size text,
  country text,
  timezone text NOT NULL DEFAULT 'UTC',
  default_currency text NOT NULL DEFAULT 'USD',
  plan public.workspace_plan NOT NULL DEFAULT 'trial',
  trial_ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces TO authenticated;
GRANT ALL ON public.workspaces TO service_role;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- workspace_members
-- =========================================================
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.workspace_role NOT NULL DEFAULT 'member',
  department text,
  job_title text,
  is_active boolean NOT NULL DEFAULT true,
  invited_by uuid,
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_members TO authenticated;
GRANT ALL ON public.workspace_members TO service_role;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_ws ON public.workspace_members(workspace_id);

-- =========================================================
-- workspace_invitations
-- =========================================================
CREATE TABLE IF NOT EXISTS public.workspace_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.workspace_role NOT NULL DEFAULT 'member',
  department text,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24),'hex'),
  invited_by uuid NOT NULL,
  status public.invitation_status NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_invitations TO authenticated;
GRANT SELECT ON public.workspace_invitations TO anon; -- token ile davet kabulünde gerekli
GRANT ALL ON public.workspace_invitations TO service_role;
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ws_invites_ws ON public.workspace_invitations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ws_invites_email ON public.workspace_invitations(email);

-- =========================================================
-- workspace_onboarding
-- =========================================================
CREATE TABLE IF NOT EXISTS public.workspace_onboarding (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  company_setup_done boolean NOT NULL DEFAULT false,
  team_invited_done boolean NOT NULL DEFAULT false,
  sample_data_seeded boolean NOT NULL DEFAULT false,
  modules_selected_done boolean NOT NULL DEFAULT false,
  finished_at timestamptz,
  enabled_modules text[] NOT NULL DEFAULT ARRAY['work','crm','finance','people','goals']::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_onboarding TO authenticated;
GRANT ALL ON public.workspace_onboarding TO service_role;
ALTER TABLE public.workspace_onboarding ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- workspace_permissions  (role × module × action matrix)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.workspace_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  role public.workspace_role NOT NULL,
  module text NOT NULL,      -- 'work','projects','tasks','bugs','crm','finance','people','assets','goals','risks','decisions','approvals','admin','analytics','ai'
  action text NOT NULL,      -- 'view','create','update','delete','manage'
  allowed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, role, module, action)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_permissions TO authenticated;
GRANT ALL ON public.workspace_permissions TO service_role;
ALTER TABLE public.workspace_permissions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ws_perms_lookup
  ON public.workspace_permissions(workspace_id, role, module, action);

-- =========================================================
-- user_active_workspace
-- =========================================================
CREATE TABLE IF NOT EXISTS public.user_active_workspace (
  user_id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_active_workspace TO authenticated;
GRANT ALL ON public.user_active_workspace TO service_role;
ALTER TABLE public.user_active_workspace ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- Helper functions (SECURITY DEFINER — avoid RLS recursion)
-- =========================================================

CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _workspace_id AND user_id = _user_id AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.workspace_role(_workspace_id uuid, _user_id uuid)
RETURNS public.workspace_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.workspace_members
  WHERE workspace_id = _workspace_id AND user_id = _user_id AND is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_workspace_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT workspace_id FROM public.user_active_workspace WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.has_workspace_permission(
  _workspace_id uuid, _user_id uuid, _module text, _action text
) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role public.workspace_role;
  v_allowed boolean;
BEGIN
  SELECT role INTO v_role FROM public.workspace_members
  WHERE workspace_id = _workspace_id AND user_id = _user_id AND is_active = true;

  IF v_role IS NULL THEN RETURN false; END IF;
  IF v_role IN ('owner','admin') THEN RETURN true; END IF;

  SELECT allowed INTO v_allowed FROM public.workspace_permissions
  WHERE workspace_id = _workspace_id AND role = v_role AND module = _module AND action = _action;

  RETURN COALESCE(v_allowed, false);
END; $$;

-- Seed default permission matrix for a workspace
CREATE OR REPLACE FUNCTION public.seed_default_permissions(_workspace_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      -- manager: geniş yetki, admin dışında her şey
      ('manager','work','view',true),('manager','work','create',true),('manager','work','update',true),('manager','work','delete',true),
      ('manager','crm','view',true),('manager','crm','create',true),('manager','crm','update',true),('manager','crm','delete',false),
      ('manager','finance','view',true),('manager','finance','create',true),('manager','finance','update',true),('manager','finance','delete',false),
      ('manager','people','view',true),('manager','people','create',true),('manager','people','update',true),('manager','people','delete',false),
      ('manager','goals','view',true),('manager','goals','create',true),('manager','goals','update',true),('manager','goals','delete',true),
      ('manager','approvals','view',true),('manager','approvals','create',true),('manager','approvals','update',true),('manager','approvals','delete',false),
      ('manager','analytics','view',true),
      ('manager','admin','view',false),
      -- member: kendi işini yürütür
      ('member','work','view',true),('member','work','create',true),('member','work','update',true),('member','work','delete',false),
      ('member','crm','view',true),('member','crm','create',true),('member','crm','update',true),('member','crm','delete',false),
      ('member','finance','view',true),('member','finance','create',true),('member','finance','update',false),('member','finance','delete',false),
      ('member','people','view',true),('member','people','create',false),('member','people','update',false),('member','people','delete',false),
      ('member','goals','view',true),('member','goals','create',true),('member','goals','update',true),('member','goals','delete',false),
      ('member','approvals','view',true),('member','approvals','create',true),
      ('member','analytics','view',true),
      -- viewer: sadece okur
      ('viewer','work','view',true),
      ('viewer','crm','view',true),
      ('viewer','finance','view',true),
      ('viewer','people','view',true),
      ('viewer','goals','view',true),
      ('viewer','approvals','view',true),
      ('viewer','analytics','view',true),
      -- guest: minimum
      ('guest','work','view',true)
    ) AS t(role, module, action, allowed)
  LOOP
    INSERT INTO public.workspace_permissions (workspace_id, role, module, action, allowed)
    VALUES (_workspace_id, r.role::public.workspace_role, r.module, r.action, r.allowed)
    ON CONFLICT (workspace_id, role, module, action) DO NOTHING;
  END LOOP;
END; $$;

-- Create workspace + make caller the owner + seed defaults
CREATE OR REPLACE FUNCTION public.create_workspace(
  _name text,
  _slug text DEFAULT NULL,
  _industry text DEFAULT NULL,
  _size text DEFAULT NULL,
  _country text DEFAULT NULL,
  _currency text DEFAULT 'USD'
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_slug text;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  v_slug := COALESCE(NULLIF(_slug,''),
                     regexp_replace(lower(_name), '[^a-z0-9]+', '-', 'g'));
  -- ensure unique slug
  IF EXISTS (SELECT 1 FROM public.workspaces WHERE slug = v_slug) THEN
    v_slug := v_slug || '-' || substr(gen_random_uuid()::text,1,6);
  END IF;

  INSERT INTO public.workspaces (name, slug, industry, size, country, default_currency, owner_id, trial_ends_at)
  VALUES (_name, v_slug, _industry, _size, _country, COALESCE(_currency,'USD'), v_uid, now() + interval '30 days')
  RETURNING id INTO v_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role, is_active)
  VALUES (v_id, v_uid, 'owner', true);

  INSERT INTO public.workspace_onboarding (workspace_id) VALUES (v_id);

  PERFORM public.seed_default_permissions(v_id);

  INSERT INTO public.user_active_workspace (user_id, workspace_id)
  VALUES (v_uid, v_id)
  ON CONFLICT (user_id) DO UPDATE SET workspace_id = EXCLUDED.workspace_id, updated_at = now();

  RETURN v_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.create_workspace(text,text,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_workspace_permission(uuid,uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_workspace_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workspace_role(uuid,uuid) TO authenticated;

-- =========================================================
-- updated_at triggers
-- =========================================================
DROP TRIGGER IF EXISTS trg_workspaces_updated ON public.workspaces;
CREATE TRIGGER trg_workspaces_updated BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_ws_members_updated ON public.workspace_members;
CREATE TRIGGER trg_ws_members_updated BEFORE UPDATE ON public.workspace_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_ws_onboarding_updated ON public.workspace_onboarding;
CREATE TRIGGER trg_ws_onboarding_updated BEFORE UPDATE ON public.workspace_onboarding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_ws_perms_updated ON public.workspace_permissions;
CREATE TRIGGER trg_ws_perms_updated BEFORE UPDATE ON public.workspace_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- RLS POLICIES
-- =========================================================

-- workspaces
DROP POLICY IF EXISTS ws_select ON public.workspaces;
CREATE POLICY ws_select ON public.workspaces FOR SELECT TO authenticated
  USING (public.is_workspace_member(id, auth.uid()));

DROP POLICY IF EXISTS ws_insert ON public.workspaces;
CREATE POLICY ws_insert ON public.workspaces FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS ws_update ON public.workspaces;
CREATE POLICY ws_update ON public.workspaces FOR UPDATE TO authenticated
  USING (public.workspace_role(id, auth.uid()) IN ('owner','admin'))
  WITH CHECK (public.workspace_role(id, auth.uid()) IN ('owner','admin'));

DROP POLICY IF EXISTS ws_delete ON public.workspaces;
CREATE POLICY ws_delete ON public.workspaces FOR DELETE TO authenticated
  USING (public.workspace_role(id, auth.uid()) = 'owner');

-- workspace_members
DROP POLICY IF EXISTS wsm_select ON public.workspace_members;
CREATE POLICY wsm_select ON public.workspace_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS wsm_insert ON public.workspace_members;
CREATE POLICY wsm_insert ON public.workspace_members FOR INSERT TO authenticated
  WITH CHECK (
    -- kurucu ilk owner kaydını atabilir
    (user_id = auth.uid() AND NOT EXISTS (
      SELECT 1 FROM public.workspace_members WHERE workspace_id = workspace_members.workspace_id
    ))
    OR public.workspace_role(workspace_id, auth.uid()) IN ('owner','admin')
  );

DROP POLICY IF EXISTS wsm_update ON public.workspace_members;
CREATE POLICY wsm_update ON public.workspace_members FOR UPDATE TO authenticated
  USING (public.workspace_role(workspace_id, auth.uid()) IN ('owner','admin'))
  WITH CHECK (public.workspace_role(workspace_id, auth.uid()) IN ('owner','admin'));

DROP POLICY IF EXISTS wsm_delete ON public.workspace_members;
CREATE POLICY wsm_delete ON public.workspace_members FOR DELETE TO authenticated
  USING (
    public.workspace_role(workspace_id, auth.uid()) IN ('owner','admin')
    OR user_id = auth.uid()
  );

-- workspace_invitations
DROP POLICY IF EXISTS wsi_select ON public.workspace_invitations;
CREATE POLICY wsi_select ON public.workspace_invitations FOR SELECT TO authenticated
  USING (public.workspace_role(workspace_id, auth.uid()) IN ('owner','admin','manager'));

DROP POLICY IF EXISTS wsi_select_anon ON public.workspace_invitations;
CREATE POLICY wsi_select_anon ON public.workspace_invitations FOR SELECT TO anon
  USING (true); -- token bilgisi zaten opak; kabul akışı için gerekli

DROP POLICY IF EXISTS wsi_insert ON public.workspace_invitations;
CREATE POLICY wsi_insert ON public.workspace_invitations FOR INSERT TO authenticated
  WITH CHECK (
    invited_by = auth.uid()
    AND public.workspace_role(workspace_id, auth.uid()) IN ('owner','admin','manager')
  );

DROP POLICY IF EXISTS wsi_update ON public.workspace_invitations;
CREATE POLICY wsi_update ON public.workspace_invitations FOR UPDATE TO authenticated
  USING (public.workspace_role(workspace_id, auth.uid()) IN ('owner','admin','manager'))
  WITH CHECK (true);

DROP POLICY IF EXISTS wsi_delete ON public.workspace_invitations;
CREATE POLICY wsi_delete ON public.workspace_invitations FOR DELETE TO authenticated
  USING (public.workspace_role(workspace_id, auth.uid()) IN ('owner','admin'));

-- workspace_onboarding
DROP POLICY IF EXISTS wso_select ON public.workspace_onboarding;
CREATE POLICY wso_select ON public.workspace_onboarding FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS wso_insert ON public.workspace_onboarding;
CREATE POLICY wso_insert ON public.workspace_onboarding FOR INSERT TO authenticated
  WITH CHECK (public.workspace_role(workspace_id, auth.uid()) IN ('owner','admin'));

DROP POLICY IF EXISTS wso_update ON public.workspace_onboarding;
CREATE POLICY wso_update ON public.workspace_onboarding FOR UPDATE TO authenticated
  USING (public.workspace_role(workspace_id, auth.uid()) IN ('owner','admin'))
  WITH CHECK (public.workspace_role(workspace_id, auth.uid()) IN ('owner','admin'));

-- workspace_permissions
DROP POLICY IF EXISTS wsp_select ON public.workspace_permissions;
CREATE POLICY wsp_select ON public.workspace_permissions FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS wsp_insert ON public.workspace_permissions;
CREATE POLICY wsp_insert ON public.workspace_permissions FOR INSERT TO authenticated
  WITH CHECK (public.workspace_role(workspace_id, auth.uid()) IN ('owner','admin'));

DROP POLICY IF EXISTS wsp_update ON public.workspace_permissions;
CREATE POLICY wsp_update ON public.workspace_permissions FOR UPDATE TO authenticated
  USING (public.workspace_role(workspace_id, auth.uid()) IN ('owner','admin'))
  WITH CHECK (public.workspace_role(workspace_id, auth.uid()) IN ('owner','admin'));

DROP POLICY IF EXISTS wsp_delete ON public.workspace_permissions;
CREATE POLICY wsp_delete ON public.workspace_permissions FOR DELETE TO authenticated
  USING (public.workspace_role(workspace_id, auth.uid()) IN ('owner','admin'));

-- user_active_workspace
DROP POLICY IF EXISTS uaw_select ON public.user_active_workspace;
CREATE POLICY uaw_select ON public.user_active_workspace FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS uaw_upsert ON public.user_active_workspace;
CREATE POLICY uaw_upsert ON public.user_active_workspace FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS uaw_update ON public.user_active_workspace;
CREATE POLICY uaw_update ON public.user_active_workspace FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS uaw_delete ON public.user_active_workspace;
CREATE POLICY uaw_delete ON public.user_active_workspace FOR DELETE TO authenticated
  USING (user_id = auth.uid());