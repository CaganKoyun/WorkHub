
-- 1. Lifecycle enum
DO $$ BEGIN
  CREATE TYPE public.decision_lifecycle AS ENUM (
    'detected','framed','challenged','approved','committed','executing',
    'checkpoint_due','outcome_recorded','learned','policy'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.assumption_status AS ENUM ('holding','at_risk','breached','unknown');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Decision contract columns
ALTER TABLE public.decisions
  ADD COLUMN IF NOT EXISTS lifecycle_state public.decision_lifecycle NOT NULL DEFAULT 'framed',
  ADD COLUMN IF NOT EXISTS owner_id uuid,
  ADD COLUMN IF NOT EXISTS decide_by timestamptz,
  ADD COLUMN IF NOT EXISTS decision_type text,
  ADD COLUMN IF NOT EXISTS problem text,
  ADD COLUMN IF NOT EXISTS do_nothing_cost text,
  ADD COLUMN IF NOT EXISTS cost_of_delay_amount numeric,
  ADD COLUMN IF NOT EXISTS impact_amount numeric,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'TRY',
  ADD COLUMN IF NOT EXISTS success_metric text,
  ADD COLUMN IF NOT EXISTS target_value numeric,
  ADD COLUMN IF NOT EXISTS worst_case text,
  ADD COLUMN IF NOT EXISTS acceptable_loss text,
  ADD COLUMN IF NOT EXISTS lesson text,
  ADD COLUMN IF NOT EXISTS reopened_at timestamptz,
  ADD COLUMN IF NOT EXISTS reopen_reason text;

-- 3. Options
CREATE TABLE IF NOT EXISTS public.decision_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  decision_id uuid NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  label text NOT NULL,
  pros text,
  risks text,
  cost_amount numeric,
  time_impact text,
  expected_return text,
  is_chosen boolean NOT NULL DEFAULT false,
  rejection_reason text,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.decision_options TO authenticated;
GRANT ALL ON public.decision_options TO service_role;
ALTER TABLE public.decision_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws members read options" ON public.decision_options FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "ws members insert options" ON public.decision_options FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "ws members update options" ON public.decision_options FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "ws members delete options" ON public.decision_options FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

-- 4. Assumption ledger
CREATE TABLE IF NOT EXISTS public.decision_assumptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  decision_id uuid NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  statement text NOT NULL,
  metric_key text,
  operator text NOT NULL DEFAULT '>=',
  threshold numeric,
  current_value numeric,
  unit text,
  source text,
  status public.assumption_status NOT NULL DEFAULT 'unknown',
  is_critical boolean NOT NULL DEFAULT false,
  last_checked_at timestamptz,
  breached_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.decision_assumptions TO authenticated;
GRANT ALL ON public.decision_assumptions TO service_role;
ALTER TABLE public.decision_assumptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws members read assumptions" ON public.decision_assumptions FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "ws members insert assumptions" ON public.decision_assumptions FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "ws members update assumptions" ON public.decision_assumptions FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "ws members delete assumptions" ON public.decision_assumptions FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

-- 5. Decision events (audit / lifecycle log)
CREATE TABLE IF NOT EXISTS public.decision_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  decision_id uuid NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  from_state text,
  to_state text,
  note text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.decision_events TO authenticated;
GRANT ALL ON public.decision_events TO service_role;
ALTER TABLE public.decision_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws members read events" ON public.decision_events FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "ws members insert events" ON public.decision_events FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE INDEX IF NOT EXISTS idx_decision_options_decision ON public.decision_options(decision_id);
CREATE INDEX IF NOT EXISTS idx_decision_assumptions_decision ON public.decision_assumptions(decision_id);
CREATE INDEX IF NOT EXISTS idx_decision_events_decision ON public.decision_events(decision_id);

-- 6. updated_at triggers
DROP TRIGGER IF EXISTS trg_decision_options_updated ON public.decision_options;
CREATE TRIGGER trg_decision_options_updated BEFORE UPDATE ON public.decision_options
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_decision_assumptions_updated ON public.decision_assumptions;
CREATE TRIGGER trg_decision_assumptions_updated BEFORE UPDATE ON public.decision_assumptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Assumption breach -> reopen decision + log event
CREATE OR REPLACE FUNCTION public.decision_assumption_breach()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'breached' AND (OLD.status IS DISTINCT FROM 'breached') THEN
    NEW.breached_at := now();
    UPDATE public.decisions
      SET lifecycle_state = 'checkpoint_due',
          reopened_at = now(),
          reopen_reason = 'Varsayım bozuldu: ' || NEW.statement
      WHERE id = NEW.decision_id
        AND lifecycle_state NOT IN ('outcome_recorded','learned','policy');
    INSERT INTO public.decision_events (workspace_id, decision_id, event_type, to_state, note, payload, actor_id)
    VALUES (NEW.workspace_id, NEW.decision_id, 'assumption_breached', 'checkpoint_due',
            NEW.statement,
            jsonb_build_object('metric_key', NEW.metric_key, 'threshold', NEW.threshold, 'current_value', NEW.current_value),
            auth.uid());
  ELSIF NEW.status <> 'breached' AND OLD.status = 'breached' THEN
    NEW.breached_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_decision_assumption_breach ON public.decision_assumptions;
CREATE TRIGGER trg_decision_assumption_breach BEFORE UPDATE ON public.decision_assumptions
  FOR EACH ROW EXECUTE FUNCTION public.decision_assumption_breach();

-- 8. Lifecycle transition logging
CREATE OR REPLACE FUNCTION public.decision_log_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.decision_events (workspace_id, decision_id, event_type, to_state, actor_id)
    VALUES (NEW.workspace_id, NEW.id, 'created', NEW.lifecycle_state::text, auth.uid());
  ELSIF NEW.lifecycle_state IS DISTINCT FROM OLD.lifecycle_state THEN
    INSERT INTO public.decision_events (workspace_id, decision_id, event_type, from_state, to_state, actor_id)
    VALUES (NEW.workspace_id, NEW.id, 'state_change', OLD.lifecycle_state::text, NEW.lifecycle_state::text, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_decision_log_transition ON public.decisions;
CREATE TRIGGER trg_decision_log_transition AFTER INSERT OR UPDATE ON public.decisions
  FOR EACH ROW EXECUTE FUNCTION public.decision_log_transition();
