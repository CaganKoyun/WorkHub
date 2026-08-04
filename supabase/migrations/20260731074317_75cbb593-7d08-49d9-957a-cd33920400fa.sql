REVOKE SELECT, INSERT, UPDATE ON public.workspace_connections FROM authenticated, anon;
GRANT SELECT (
  id, workspace_id, catalog_key, display_name, scope, owner_user_id,
  state, auth_url, mcp_url, transport, error, created_at, updated_at
) ON public.workspace_connections TO authenticated;

REVOKE SELECT, INSERT, UPDATE ON public.user_mcp_servers FROM authenticated, anon;
GRANT SELECT (id, user_id, workspace_id, name, url, transport, created_at, updated_at)
  ON public.user_mcp_servers TO authenticated;
GRANT INSERT (user_id, workspace_id, name, url, transport)
  ON public.user_mcp_servers TO authenticated;
GRANT UPDATE (name, url, transport)
  ON public.user_mcp_servers TO authenticated;

REVOKE SELECT ON public.integrations_catalog FROM anon;
DROP POLICY IF EXISTS "catalog readable by everyone" ON public.integrations_catalog;
CREATE POLICY "catalog readable by authenticated"
  ON public.integrations_catalog FOR SELECT TO authenticated USING (true);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL DEFAULT public.current_workspace_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_dedup ON public.notifications (user_id, workspace_id, kind, created_at DESC);

GRANT SELECT, DELETE ON public.notifications TO authenticated;
GRANT UPDATE (read_at) ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications select own"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "notifications mark own read"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications delete own"
  ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS review_reminder boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.build_company_snapshot(_ws uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.role() = 'service_role' OR public.is_workspace_member(_ws, auth.uid()) THEN
      jsonb_build_object(
        'captured_at',       now(),
        'open_tasks',        (SELECT count(*) FROM public.tasks
                               WHERE workspace_id = _ws AND status <> 'done'),
        'overdue_tasks',     (SELECT count(*) FROM public.tasks
                               WHERE workspace_id = _ws AND status <> 'done'
                                 AND due_date IS NOT NULL AND due_date < CURRENT_DATE),
        'critical_bugs',     (SELECT count(*) FROM public.bugs
                               WHERE workspace_id = _ws AND severity = 'critical'
                                 AND status NOT IN ('resolved','closed')),
        'active_projects',   (SELECT count(*) FROM public.projects
                               WHERE workspace_id = _ws AND status = 'active'),
        'pending_approvals', (SELECT count(*) FROM public.approvals
                               WHERE workspace_id = _ws AND status = 'pending'),
        'open_risks',        (SELECT count(*) FROM public.risks
                               WHERE workspace_id = _ws AND status IN ('open','mitigating')),
        'critical_risks',    (SELECT count(*) FROM public.risks
                               WHERE workspace_id = _ws AND status IN ('open','mitigating')
                                 AND level = 'critical'),
        'cash_position',     (SELECT COALESCE(sum(
                                 a.opening_balance
                                 + COALESCE((SELECT sum(CASE tx.type
                                                          WHEN 'income'  THEN tx.amount
                                                          WHEN 'expense' THEN -tx.amount
                                                          ELSE 0 END)
                                             FROM public.fin_transactions tx
                                             WHERE tx.account_id = a.id
                                               AND tx.status IN ('posted','reconciled')), 0)
                               ), 0)
                               FROM public.fin_accounts a
                               WHERE a.workspace_id = _ws AND NOT a.is_archived),
        'open_opportunities',(SELECT count(*) FROM public.crm_opportunities
                               WHERE workspace_id = _ws AND status = 'open'),
        'pipeline_amount',   (SELECT COALESCE(sum(amount),0) FROM public.crm_opportunities
                               WHERE workspace_id = _ws AND status = 'open')
      )
    ELSE NULL
  END;
$$;

REVOKE EXECUTE ON FUNCTION public.build_company_snapshot(uuid) FROM anon;

CREATE OR REPLACE FUNCTION public.approvals_enforce_limits()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _role public.workspace_role;
  _limit numeric;
BEGIN
  IF NEW.status NOT IN ('approved','rejected') OR OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF _uid IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role, approval_limit INTO _role, _limit
  FROM public.workspace_members
  WHERE workspace_id = NEW.workspace_id AND user_id = _uid AND is_active;

  IF _role IN ('owner','admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.kind IN ('contract','hiring','risk_acceptance') THEN
    RAISE EXCEPTION 'Bu onay tipi (%) yalnizca owner/admin tarafindan karara baglanabilir', NEW.kind
      USING ERRCODE = 'P0001';
  END IF;

  IF NEW.amount IS NOT NULL THEN
    IF _limit IS NULL THEN
      RAISE EXCEPTION 'Tutarli onaylar icin onay limitin tanimli degil'
        USING ERRCODE = 'P0001';
    END IF;
    IF NEW.amount > _limit THEN
      RAISE EXCEPTION 'Onay tutari (%) limitinin (%) ustunde', NEW.amount, _limit
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS approvals_enforce_limits ON public.approvals;
CREATE TRIGGER approvals_enforce_limits
  BEFORE UPDATE ON public.approvals
  FOR EACH ROW EXECUTE FUNCTION public.approvals_enforce_limits();

CREATE TABLE public.signal_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL DEFAULT public.current_workspace_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  rule_key text NOT NULL CHECK (rule_key IN (
    'overdue_receivable','budget_overrun','stale_opportunity',
    'critical_bug_open','contract_expiring'
  )),
  enabled boolean NOT NULL DEFAULT false,
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, rule_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.signal_rules TO authenticated;
GRANT ALL ON public.signal_rules TO service_role;
ALTER TABLE public.signal_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "signal_rules member read"
  ON public.signal_rules FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "signal_rules admin insert"
  ON public.signal_rules FOR INSERT TO authenticated
  WITH CHECK (public.workspace_role(workspace_id, auth.uid()) IN ('owner','admin'));
CREATE POLICY "signal_rules admin update"
  ON public.signal_rules FOR UPDATE TO authenticated
  USING (public.workspace_role(workspace_id, auth.uid()) IN ('owner','admin'));
CREATE POLICY "signal_rules admin delete"
  ON public.signal_rules FOR DELETE TO authenticated
  USING (public.workspace_role(workspace_id, auth.uid()) IN ('owner','admin'));

CREATE TABLE public.signal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  rule_key text NOT NULL,
  object_id uuid NOT NULL,
  approval_id uuid REFERENCES public.approvals(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, rule_key, object_id)
);

GRANT SELECT ON public.signal_events TO authenticated;
GRANT ALL ON public.signal_events TO service_role;
ALTER TABLE public.signal_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "signal_events member read"
  ON public.signal_events FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));