
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.goal_status AS ENUM ('draft','on_track','at_risk','off_track','achieved','missed','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.goal_period AS ENUM ('monthly','quarterly','yearly','custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.risk_status AS ENUM ('open','mitigating','accepted','closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.risk_level AS ENUM ('low','medium','high','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.decision_status AS ENUM ('proposed','decided','revisit','revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.approval_kind AS ENUM (
    'expense','hiring','contract','discount','budget_change',
    'project_escalation','risk_acceptance','payment','time_off','general'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.approval_status AS ENUM ('pending','approved','rejected','info_requested','delegated','snoozed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.approval_priority AS ENUM ('low','normal','high','urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ OBJECT LINKS (Company Graph) ============
CREATE TABLE IF NOT EXISTS public.object_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_type text NOT NULL,
  from_id uuid NOT NULL,
  to_type text NOT NULL,
  to_id uuid NOT NULL,
  link_kind text NOT NULL DEFAULT 'related',
  note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_type, from_id, to_type, to_id, link_kind)
);
CREATE INDEX IF NOT EXISTS idx_object_links_from ON public.object_links (from_type, from_id);
CREATE INDEX IF NOT EXISTS idx_object_links_to ON public.object_links (to_type, to_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.object_links TO authenticated;
GRANT ALL ON public.object_links TO service_role;
ALTER TABLE public.object_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "object_links read" ON public.object_links FOR SELECT TO authenticated USING (true);
CREATE POLICY "object_links create" ON public.object_links FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "object_links delete own or admin" ON public.object_links FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ============ GOALS ============
CREATE TABLE IF NOT EXISTS public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.goal_status NOT NULL DEFAULT 'draft',
  period public.goal_period NOT NULL DEFAULT 'quarterly',
  progress numeric NOT NULL DEFAULT 0,
  target_value numeric,
  current_value numeric,
  unit text,
  start_date date,
  end_date date,
  parent_goal_id uuid REFERENCES public.goals(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT ALL ON public.goals TO service_role;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "goals read" ON public.goals FOR SELECT TO authenticated USING (true);
CREATE POLICY "goals insert" ON public.goals FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "goals update" ON public.goals FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR created_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "goals delete" ON public.goals FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER goals_updated_at BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ RISKS ============
CREATE TABLE IF NOT EXISTS public.risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.risk_status NOT NULL DEFAULT 'open',
  level public.risk_level NOT NULL DEFAULT 'medium',
  likelihood int NOT NULL DEFAULT 3 CHECK (likelihood BETWEEN 1 AND 5),
  impact int NOT NULL DEFAULT 3 CHECK (impact BETWEEN 1 AND 5),
  mitigation text,
  due_date date,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.risks TO authenticated;
GRANT ALL ON public.risks TO service_role;
ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "risks read" ON public.risks FOR SELECT TO authenticated USING (true);
CREATE POLICY "risks insert" ON public.risks FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "risks update" ON public.risks FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR created_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "risks delete" ON public.risks FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER risks_updated_at BEFORE UPDATE ON public.risks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ DECISIONS ============
CREATE TABLE IF NOT EXISTS public.decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  context text,
  decision text,
  rationale text,
  status public.decision_status NOT NULL DEFAULT 'proposed',
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.decisions TO authenticated;
GRANT ALL ON public.decisions TO service_role;
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "decisions read" ON public.decisions FOR SELECT TO authenticated USING (true);
CREATE POLICY "decisions insert" ON public.decisions FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "decisions update" ON public.decisions FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR decided_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "decisions delete" ON public.decisions FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER decisions_updated_at BEFORE UPDATE ON public.decisions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ APPROVALS (Founder Inbox) ============
CREATE TABLE IF NOT EXISTS public.approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.approval_kind NOT NULL DEFAULT 'general',
  title text NOT NULL,
  summary text,
  amount numeric,
  currency text DEFAULT 'USD',
  priority public.approval_priority NOT NULL DEFAULT 'normal',
  status public.approval_status NOT NULL DEFAULT 'pending',
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  resource_type text,
  resource_id uuid,
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  decision_note text,
  due_at timestamptz,
  snooze_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON public.approvals (status);
CREATE INDEX IF NOT EXISTS idx_approvals_assigned ON public.approvals (assigned_to);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.approvals TO authenticated;
GRANT ALL ON public.approvals TO service_role;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approvals read" ON public.approvals FOR SELECT TO authenticated USING (true);
CREATE POLICY "approvals insert" ON public.approvals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requested_by);
CREATE POLICY "approvals update" ON public.approvals FOR UPDATE TO authenticated
  USING (
    requested_by = auth.uid()
    OR assigned_to = auth.uid()
    OR (assigned_to IS NULL AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')))
    OR public.has_role(auth.uid(),'admin')
  );
CREATE POLICY "approvals delete" ON public.approvals FOR DELETE TO authenticated
  USING (requested_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER approvals_updated_at BEFORE UPDATE ON public.approvals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
