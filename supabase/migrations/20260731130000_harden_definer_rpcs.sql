-- SECURITY DEFINER RPC sertleştirmesi.
--
-- İki gerçek açık:
-- 1) build_company_snapshot(_ws): üyelik kontrolü yoktu ve EXECUTE varsayılan
--    olarak PUBLIC'te — herhangi bir authenticated kullanıcı keyfi workspace
--    id'siyle başka kiracının nakit/pipeline agregalarını çekebiliyordu.
-- 2) fin_cash_balance() / fin_burn_rate(): workspace filtresi HİÇ yoktu —
--    definer RLS'i deldiği için TÜM kiracıların toplamını döndürüyordu
--    (hem cross-tenant sızıntı hem tek kiracı için bile yanlış sayı).
--
-- Kural: definer fonksiyon ya çağıranın üyeliğini doğrular ya NULL döner.
-- service_role (edge fn / DB trigger'ı içinden değil, admin istemciden) için
-- auth.role() = 'service_role' muafiyeti korunur.

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

-- fin_* özet RPC'leri: aktif workspace'e daraltıldı + finance/view yetkisi şart.
CREATE OR REPLACE FUNCTION public.fin_cash_balance()
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH ws AS (SELECT public.active_workspace_id(auth.uid()) AS id)
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
  WITH ws AS (SELECT public.active_workspace_id(auth.uid()) AS id)
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

-- Anon'un bu RPC'leri çağırması için hiçbir neden yok.
REVOKE EXECUTE ON FUNCTION public.build_company_snapshot(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fin_cash_balance() FROM anon;
REVOKE EXECUTE ON FUNCTION public.fin_burn_rate(int) FROM anon;
