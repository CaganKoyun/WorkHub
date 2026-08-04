CREATE TRIGGER signal_rules_touch
  BEFORE UPDATE ON public.signal_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.fin_cash_balance()
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH ws AS (SELECT public.current_workspace_id() AS id)
  SELECT CASE
    WHEN (SELECT id FROM ws) IS NULL THEN NULL
    WHEN NOT public.has_workspace_permission((SELECT id FROM ws), auth.uid(), 'finance', 'view') THEN NULL
    ELSE (
      COALESCE((
        SELECT SUM(opening_balance * COALESCE(public.fin_lookup_fx(currency,'USD',opening_date), 1))
        FROM public.fin_accounts
        WHERE is_archived = false AND workspace_id = (SELECT id FROM ws)
      ), 0)
      + COALESCE((
        SELECT COALESCE(SUM(CASE WHEN type = 'income'  THEN amount_base ELSE 0 END), 0) -
               COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_base ELSE 0 END), 0)
        FROM public.fin_transactions
        WHERE status IN ('posted','reconciled') AND workspace_id = (SELECT id FROM ws)
      ), 0)
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.fin_burn_rate(_days int DEFAULT 90)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH ws AS (SELECT public.current_workspace_id() AS id)
  SELECT CASE
    WHEN (SELECT id FROM ws) IS NULL THEN NULL
    WHEN NOT public.has_workspace_permission((SELECT id FROM ws), auth.uid(), 'finance', 'view') THEN NULL
    ELSE GREATEST(0, (
      SELECT COALESCE(SUM(CASE WHEN type='expense' THEN amount_base ELSE 0 END),0) -
             COALESCE(SUM(CASE WHEN type='income'  THEN amount_base ELSE 0 END),0)
      FROM public.fin_transactions
      WHERE status IN ('posted','reconciled')
        AND workspace_id = (SELECT id FROM ws)
        AND txn_date BETWEEN (CURRENT_DATE - (_days || ' days')::interval)::date AND CURRENT_DATE
    ) / (_days::numeric / 30.0))
  END;
$$;

REVOKE EXECUTE ON FUNCTION public.fin_cash_balance() FROM anon;
REVOKE EXECUTE ON FUNCTION public.fin_burn_rate(int) FROM anon;