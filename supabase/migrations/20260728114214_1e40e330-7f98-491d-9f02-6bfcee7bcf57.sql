-- =========================================================
-- FAZ 2: workspace_id eklemesi + backfill + RLS retrofit
-- =========================================================

-- 1) Default workspace + mevcut kullanıcıları üye yap
DO $$
DECLARE
  v_ws_id uuid;
  v_owner uuid;
BEGIN
  SELECT user_id INTO v_owner FROM public.profiles ORDER BY created_at ASC LIMIT 1;

  SELECT id INTO v_ws_id FROM public.workspaces WHERE slug = 'default';

  IF v_ws_id IS NULL THEN
    INSERT INTO public.workspaces (name, slug, owner_id, plan, default_currency)
    VALUES ('Default Workspace','default', COALESCE(v_owner, gen_random_uuid()), 'growth', 'USD')
    RETURNING id INTO v_ws_id;

    INSERT INTO public.workspace_onboarding
      (workspace_id, company_setup_done, team_invited_done, sample_data_seeded, modules_selected_done, finished_at)
    VALUES (v_ws_id, true, true, true, true, now());

    PERFORM public.seed_default_permissions(v_ws_id);
  END IF;

  IF v_owner IS NOT NULL THEN
    INSERT INTO public.workspace_members (workspace_id, user_id, role, is_active)
    SELECT v_ws_id, p.user_id,
      CASE WHEN p.user_id = v_owner THEN 'owner'::public.workspace_role
           ELSE 'member'::public.workspace_role END,
      true
    FROM public.profiles p
    ON CONFLICT (workspace_id, user_id) DO NOTHING;

    INSERT INTO public.user_active_workspace (user_id, workspace_id)
    SELECT p.user_id, v_ws_id FROM public.profiles p
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END $$;

-- 2) workspace_id kolonu, backfill, NOT NULL, default, index
DO $$
DECLARE
  v_ws_id uuid;
  t text;
  tables text[] := ARRAY[
    'projects','project_members','tasks','task_comments','task_activity',
    'bugs','comments','activity_log','attachments',
    'assets','asset_categories','asset_assignments','employees',
    'crm_companies','crm_contacts','crm_opportunities','crm_pipelines',
    'crm_pipeline_stages','crm_activities','crm_quotes','crm_quote_items',
    'crm_contracts','crm_customers','crm_subscriptions',
    'fin_accounts','fin_transactions','fin_categories','fin_budgets','fin_fx_rates',
    'goals','risks','decisions','approvals','object_links',
    'company_settings','invitations'
  ];
BEGIN
  SELECT id INTO v_ws_id FROM public.workspaces WHERE slug = 'default';
  IF v_ws_id IS NULL THEN
    RAISE NOTICE 'No default workspace, skipping backfill (empty project)';
    RETURN;
  END IF;

  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE', t);
    EXECUTE format('UPDATE public.%I SET workspace_id = $1 WHERE workspace_id IS NULL', t) USING v_ws_id;
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN workspace_id SET NOT NULL', t);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN workspace_id SET DEFAULT public.current_workspace_id()', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(workspace_id)',
                   'idx_' || t || '_workspace', t);
  END LOOP;
END $$;

-- 3) Eski RLS policy'lerini kaldır, workspace-scoped policy'leri kur
DO $$
DECLARE
  t text;
  pol record;
  tables text[] := ARRAY[
    'projects','project_members','tasks','task_comments','task_activity',
    'bugs','comments','activity_log','attachments',
    'assets','asset_categories','asset_assignments','employees',
    'crm_companies','crm_contacts','crm_opportunities','crm_pipelines',
    'crm_pipeline_stages','crm_activities','crm_quotes','crm_quote_items',
    'crm_contracts','crm_customers','crm_subscriptions',
    'fin_accounts','fin_transactions','fin_categories','fin_budgets','fin_fx_rates',
    'goals','risks','decisions','approvals','object_links',
    'company_settings','invitations'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- mevcut policy'leri temizle
    FOR pol IN
      SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;

    EXECUTE format($f$
      CREATE POLICY %I ON public.%I FOR SELECT TO authenticated
      USING (public.is_workspace_member(workspace_id, auth.uid()))
    $f$, t || '_ws_select', t);

    EXECUTE format($f$
      CREATE POLICY %I ON public.%I FOR INSERT TO authenticated
      WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()))
    $f$, t || '_ws_insert', t);

    EXECUTE format($f$
      CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated
      USING (public.is_workspace_member(workspace_id, auth.uid()))
      WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()))
    $f$, t || '_ws_update', t);

    EXECUTE format($f$
      CREATE POLICY %I ON public.%I FOR DELETE TO authenticated
      USING (public.is_workspace_member(workspace_id, auth.uid()))
    $f$, t || '_ws_delete', t);
  END LOOP;
END $$;

-- 4) Davet update policy'sini sıkılaştır (Faz 1'de "WITH CHECK (true)" bırakılmıştı)
DROP POLICY IF EXISTS wsi_update ON public.workspace_invitations;
CREATE POLICY wsi_update ON public.workspace_invitations FOR UPDATE TO authenticated
  USING (public.workspace_role(workspace_id, auth.uid()) IN ('owner','admin','manager'))
  WITH CHECK (public.workspace_role(workspace_id, auth.uid()) IN ('owner','admin','manager'));

-- 5) Davet kabul RPC (auth'lu kullanıcı token ile davete katılır)
CREATE OR REPLACE FUNCTION public.accept_workspace_invitation(_token text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_inv public.workspace_invitations%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_inv FROM public.workspace_invitations
   WHERE token = _token AND status = 'pending' AND expires_at > now()
   LIMIT 1;

  IF v_inv.id IS NULL THEN RAISE EXCEPTION 'Invitation not found or expired'; END IF;

  INSERT INTO public.workspace_members (workspace_id, user_id, role, department, invited_by, is_active)
  VALUES (v_inv.workspace_id, v_uid, v_inv.role, v_inv.department, v_inv.invited_by, true)
  ON CONFLICT (workspace_id, user_id) DO UPDATE
    SET role = EXCLUDED.role, is_active = true;

  UPDATE public.workspace_invitations
     SET status='accepted', accepted_at=now(), accepted_by=v_uid
   WHERE id = v_inv.id;

  INSERT INTO public.user_active_workspace (user_id, workspace_id)
  VALUES (v_uid, v_inv.workspace_id)
  ON CONFLICT (user_id) DO UPDATE SET workspace_id = EXCLUDED.workspace_id, updated_at = now();

  RETURN v_inv.workspace_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.accept_workspace_invitation(text) TO authenticated;