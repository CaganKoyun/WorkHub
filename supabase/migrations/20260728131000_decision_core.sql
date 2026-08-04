-- ============================================================================
-- DECISION CORE — turns `decisions` from a note into a decision record:
--   * the wager  (expected_outcome + confidence)
--   * the moment (immutable state_snapshot captured when status -> decided)
--   * the loop   (review_at + verdict + actual_outcome)
--   * capture    (approved/rejected approvals auto-create decision records)
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.decision_verdict AS ENUM ('held','changed','wrong');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.decision_reversibility AS ENUM ('one_way','two_way');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.decisions
  ADD COLUMN IF NOT EXISTS expected_outcome text,
  ADD COLUMN IF NOT EXISTS confidence smallint CHECK (confidence BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS reversibility public.decision_reversibility,
  ADD COLUMN IF NOT EXISTS reversibility_note text,
  ADD COLUMN IF NOT EXISTS review_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS actual_outcome text,
  ADD COLUMN IF NOT EXISTS verdict public.decision_verdict,
  ADD COLUMN IF NOT EXISTS state_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS source_approval_id uuid REFERENCES public.approvals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_decisions_review_due
  ON public.decisions (review_at)
  WHERE verdict IS NULL AND review_at IS NOT NULL;

-- ---------- company snapshot: what the world looked like at decision time ----

CREATE OR REPLACE FUNCTION public.build_company_snapshot(_ws uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
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
  );
$$;

-- ---------- decided => freeze the moment; snapshot is write-once -------------

CREATE OR REPLACE FUNCTION public.decisions_freeze_moment()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- snapshot is immutable once captured
  IF TG_OP = 'UPDATE' AND OLD.state_snapshot IS NOT NULL THEN
    NEW.state_snapshot := OLD.state_snapshot;
  END IF;

  IF NEW.status = 'decided' THEN
    IF NEW.decided_at IS NULL THEN
      NEW.decided_at := now();
    END IF;
    IF NEW.state_snapshot IS NULL AND NEW.workspace_id IS NOT NULL THEN
      NEW.state_snapshot := public.build_company_snapshot(NEW.workspace_id);
    END IF;
    IF NEW.review_at IS NULL THEN
      NEW.review_at := NEW.decided_at + interval '90 days';
    END IF;
  END IF;

  IF NEW.verdict IS NOT NULL AND NEW.reviewed_at IS NULL THEN
    NEW.reviewed_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS decisions_freeze_moment ON public.decisions;
CREATE TRIGGER decisions_freeze_moment
  BEFORE INSERT OR UPDATE ON public.decisions
  FOR EACH ROW EXECUTE FUNCTION public.decisions_freeze_moment();

-- ---------- capture: approvals become decision records automatically ---------

CREATE OR REPLACE FUNCTION public.approvals_capture_decision()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _decision_id uuid;
BEGIN
  IF NEW.status IN ('approved','rejected')
     AND (OLD.status IS DISTINCT FROM NEW.status)
     AND NOT EXISTS (SELECT 1 FROM public.decisions WHERE source_approval_id = NEW.id)
  THEN
    INSERT INTO public.decisions
      (workspace_id, title, context, decision, rationale, status,
       decided_by, decided_at, source_approval_id, created_by)
    VALUES
      (NEW.workspace_id,
       CASE WHEN NEW.status = 'approved' THEN 'Onaylandı: ' ELSE 'Reddedildi: ' END || NEW.title,
       NULLIF(concat_ws(' | ',
         NEW.summary,
         CASE WHEN NEW.amount IS NOT NULL
              THEN NEW.amount::text || ' ' || COALESCE(NEW.currency,'') END), ''),
       CASE WHEN NEW.status = 'approved' THEN 'Onaylandı' ELSE 'Reddedildi' END,
       NEW.decision_note,
       'decided',
       NEW.decided_by,
       COALESCE(NEW.decided_at, now()),
       NEW.id,
       COALESCE(NEW.decided_by, NEW.requested_by))
    RETURNING id INTO _decision_id;

    INSERT INTO public.object_links
      (workspace_id, from_type, from_id, to_type, to_id, link_kind, created_by)
    VALUES
      (NEW.workspace_id, 'decision', _decision_id, 'approval', NEW.id,
       'derived_from', NEW.decided_by)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS approvals_capture_decision ON public.approvals;
CREATE TRIGGER approvals_capture_decision
  AFTER UPDATE ON public.approvals
  FOR EACH ROW EXECUTE FUNCTION public.approvals_capture_decision();
