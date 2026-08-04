
CREATE OR REPLACE FUNCTION public.decision_capture_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ws uuid := NEW.workspace_id;
  snap jsonb;
BEGIN
  IF TG_OP = 'INSERT' OR NEW.state_snapshot IS NULL THEN
    SELECT jsonb_build_object(
      'captured_at', now(),
      'open_tasks', (SELECT count(*) FROM public.tasks t WHERE t.workspace_id = ws AND t.status <> 'done'),
      'overdue_tasks', (SELECT count(*) FROM public.tasks t WHERE t.workspace_id = ws AND t.status <> 'done' AND t.due_date IS NOT NULL AND t.due_date < now()),
      'critical_bugs', (SELECT count(*) FROM public.bugs b WHERE b.workspace_id = ws AND b.severity = 'critical' AND b.status NOT IN ('resolved','closed')),
      'active_projects', (SELECT count(*) FROM public.projects p WHERE p.workspace_id = ws AND p.status = 'active'),
      'pending_approvals', (SELECT count(*) FROM public.approvals a WHERE a.workspace_id = ws AND a.status = 'pending'),
      'open_risks', (SELECT count(*) FROM public.risks r WHERE r.workspace_id = ws AND r.status IN ('open','mitigating')),
      'critical_risks', (SELECT count(*) FROM public.risks r WHERE r.workspace_id = ws AND r.status IN ('open','mitigating') AND r.level = 'critical'),
      'cash_position', (SELECT COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount WHEN t.type = 'expense' THEN -t.amount ELSE 0 END), 0)
                        FROM public.fin_transactions t WHERE t.workspace_id = ws AND t.status IN ('posted','reconciled')),
      'open_opportunities', (SELECT count(*) FROM public.crm_opportunities o WHERE o.workspace_id = ws AND o.status = 'open'),
      'pipeline_amount', (SELECT COALESCE(SUM(o.amount), 0) FROM public.crm_opportunities o WHERE o.workspace_id = ws AND o.status = 'open')
    ) INTO snap;
    NEW.state_snapshot := snap;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS decisions_capture_snapshot ON public.decisions;
CREATE TRIGGER decisions_capture_snapshot
BEFORE INSERT ON public.decisions
FOR EACH ROW EXECUTE FUNCTION public.decision_capture_snapshot();

CREATE OR REPLACE FUNCTION public.decision_review_loop()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'decided' THEN
    IF NEW.decided_at IS NULL THEN NEW.decided_at := now(); END IF;
    IF NEW.review_at IS NULL THEN NEW.review_at := COALESCE(NEW.decided_at, now()) + interval '90 days'; END IF;
  END IF;
  IF NEW.verdict IS NOT NULL AND NEW.reviewed_at IS NULL THEN
    NEW.reviewed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS decisions_review_loop ON public.decisions;
CREATE TRIGGER decisions_review_loop
BEFORE INSERT OR UPDATE ON public.decisions
FOR EACH ROW EXECUTE FUNCTION public.decision_review_loop();
