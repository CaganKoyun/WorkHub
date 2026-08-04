-- ============================================================================
-- MULTI-TENANCY HARDENING
-- Adds workspace_id to every tenant-owned table, backfills, rewrites every
-- RLS policy from `USING (true)` to workspace-membership scoping, and installs
-- a BEFORE INSERT trigger that stamps the caller's active workspace so
-- existing frontend inserts keep working without passing workspace_id.
-- ============================================================================

-- ---------- helper functions (SECURITY DEFINER, pinned search_path) ----------

CREATE OR REPLACE FUNCTION public.is_workspace_member(_user uuid, _ws uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user AND workspace_id = _ws AND is_active
  );
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_admin(_user uuid, _ws uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user AND workspace_id = _ws AND is_active
      AND role IN ('owner','admin','manager')
  );
$$;

CREATE OR REPLACE FUNCTION public.active_workspace_id(_user uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT workspace_id FROM public.user_active_workspace WHERE user_id = _user;
$$;

CREATE OR REPLACE FUNCTION public.shares_workspace_with(_user uuid, _other uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members a
    JOIN public.workspace_members b ON a.workspace_id = b.workspace_id
    WHERE a.user_id = _user AND b.user_id = _other
      AND a.is_active AND b.is_active
  );
$$;

CREATE OR REPLACE FUNCTION public.set_workspace_id()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.workspace_id IS NULL THEN
    NEW.workspace_id := public.active_workspace_id(auth.uid());
  END IF;
  IF NEW.workspace_id IS NULL THEN
    RAISE EXCEPTION 'workspace_id is required: no active workspace for user %', auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

-- ---------- scope every tenant table ----------

DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'projects','project_members','tasks','task_comments','task_activity',
    'bugs','comments','attachments','activity_log',
    'assets','asset_categories','asset_assignments','employees',
    'approvals','goals','risks','decisions','object_links',
    'company_settings','invitations',
    'crm_pipelines','crm_pipeline_stages','crm_companies','crm_contacts',
    'crm_customers','crm_opportunities','crm_quotes','crm_quote_items',
    'crm_contracts','crm_subscriptions','crm_activities',
    'fin_accounts','fin_categories','fin_transactions','fin_budgets','fin_fx_rates'
  ];
  pol record;
  has_created_by boolean;
  has_user_id boolean;
  null_count bigint;
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    -- skip tables that don't exist in this database
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;

    -- 1) add workspace_id
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE',
      t);

    -- 2) backfill: creator''s workspace membership, else the oldest workspace
    SELECT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema='public' AND table_name=t AND column_name='created_by')
      INTO has_created_by;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema='public' AND table_name=t AND column_name='user_id')
      INTO has_user_id;

    IF has_created_by THEN
      EXECUTE format(
        'UPDATE public.%I x SET workspace_id = (
           SELECT wm.workspace_id FROM public.workspace_members wm
           WHERE wm.user_id = x.created_by ORDER BY wm.created_at LIMIT 1)
         WHERE x.workspace_id IS NULL AND x.created_by IS NOT NULL', t);
    ELSIF has_user_id THEN
      EXECUTE format(
        'UPDATE public.%I x SET workspace_id = (
           SELECT wm.workspace_id FROM public.workspace_members wm
           WHERE wm.user_id = x.user_id ORDER BY wm.created_at LIMIT 1)
         WHERE x.workspace_id IS NULL AND x.user_id IS NOT NULL', t);
    END IF;

    EXECUTE format(
      'UPDATE public.%I SET workspace_id = (
         SELECT id FROM public.workspaces ORDER BY created_at LIMIT 1)
       WHERE workspace_id IS NULL', t);

    -- 3) enforce NOT NULL when the backfill fully succeeded
    EXECUTE format('SELECT count(*) FROM public.%I WHERE workspace_id IS NULL', t) INTO null_count;
    IF null_count = 0 THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN workspace_id SET NOT NULL', t);
    END IF;

    -- 4) index for RLS performance
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_workspace ON public.%I (workspace_id)', t, t);

    -- 5) drop EVERY existing policy on the table (removes all USING(true) leaks)
    FOR pol IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;

    -- 6) canonical workspace-scoped policies
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated
         USING (public.is_workspace_member(auth.uid(), workspace_id))',
      t || '_ws_select', t);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated
         WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id))',
      t || '_ws_insert', t);

    IF has_created_by THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated
           USING (public.is_workspace_member(auth.uid(), workspace_id)
                  AND (created_by = auth.uid() OR public.is_workspace_admin(auth.uid(), workspace_id)))',
        t || '_ws_update', t);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated
           USING (public.is_workspace_member(auth.uid(), workspace_id)
                  AND (created_by = auth.uid() OR public.is_workspace_admin(auth.uid(), workspace_id)))',
        t || '_ws_delete', t);
    ELSE
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated
           USING (public.is_workspace_member(auth.uid(), workspace_id))',
        t || '_ws_update', t);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated
           USING (public.is_workspace_admin(auth.uid(), workspace_id))',
        t || '_ws_delete', t);
    END IF;

    -- 7) auto-stamp workspace on insert
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t || '_set_ws', t);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE INSERT ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.set_workspace_id()',
      t || '_set_ws', t);
  END LOOP;
END $$;

-- ---------- profiles: visible only to self + workspace-mates ----------

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles' AND cmd='SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY profiles_self_or_shared ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.shares_workspace_with(auth.uid(), id));

-- ---------- user_roles: same restriction ----------

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='user_roles' AND cmd='SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_roles', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY user_roles_self_or_shared ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.shares_workspace_with(auth.uid(), user_id));
