DO $$
DECLARE
  t text;
  fin_tables text[] := ARRAY[
    'fin_accounts','fin_categories','fin_transactions','fin_budgets','fin_fx_rates'
  ];
  pol record;
BEGIN
  FOREACH t IN ARRAY fin_tables LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;
    FOR pol IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated
         USING (public.has_workspace_permission(workspace_id, auth.uid(), ''finance'', ''view''))',
      t || '_fin_select', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated
         WITH CHECK (public.has_workspace_permission(workspace_id, auth.uid(), ''finance'', ''create''))',
      t || '_fin_insert', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated
         USING (public.has_workspace_permission(workspace_id, auth.uid(), ''finance'', ''update''))',
      t || '_fin_update', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated
         USING (public.has_workspace_permission(workspace_id, auth.uid(), ''finance'', ''delete''))',
      t || '_fin_delete', t);
  END LOOP;
END $$;