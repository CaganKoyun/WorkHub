-- ============================================================================
-- FINANCE VISIBILITY LOCK
-- Workspace membership is no longer enough to read financial data.
-- The permission grid (workspace_permissions, already editable in Settings →
-- Permissions) is now ENFORCED at the database level for all fin_* tables.
--
-- Behavior:
--   * owner/admin        → full access (has_workspace_permission bypass)
--   * every other role   → default DENY until the founder toggles
--                          finance/view (read) or finance/create-update-delete
--                          (write) for that role in the grid
--
-- This is the Phase-0 precondition: a founder will not connect bank data to a
-- system their whole team can read.
-- ============================================================================

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

    -- drop the membership-only canonical policies from the multitenancy pass
    FOR pol IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;

    -- module-permission-scoped policies
    -- (has_workspace_permission already verifies active membership and
    --  grants owner/admin unconditionally)
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

-- Decision snapshots embed cash_position; build_company_snapshot runs as
-- SECURITY DEFINER so capture keeps working even for users who cannot read
-- fin_* directly. The snapshot exposes a single aggregate number, not
-- transactions — acceptable, since decisions themselves are founder-facing.
