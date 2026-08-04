
-- ========== ENUMS ==========
DO $$ BEGIN CREATE TYPE public.crm_lifecycle AS ENUM ('lead','prospect','customer','partner','vendor','churned'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.crm_forecast_category AS ENUM ('pipeline','best_case','commit','closed_won','closed_lost','omitted'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.crm_opp_status AS ENUM ('open','won','lost','abandoned'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.crm_activity_kind AS ENUM ('call','email','meeting','note','task','whatsapp','demo','proposal_sent','contract_sent','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.crm_quote_status AS ENUM ('draft','sent','accepted','declined','expired','revised'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.crm_contract_status AS ENUM ('draft','internal_review','counterparty_review','pending_approval','pending_signature','active','renewal','expired','terminated'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.crm_customer_health AS ENUM ('healthy','watch','at_risk','critical'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.crm_subscription_status AS ENUM ('trialing','active','past_due','cancelled','paused','expired'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ========== COMPANIES ==========
CREATE TABLE public.crm_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  legal_name text,
  domain text,
  website text,
  industry text,
  employee_count int,
  annual_revenue numeric,
  currency text DEFAULT 'USD',
  country text,
  city text,
  address text,
  phone text,
  lifecycle public.crm_lifecycle NOT NULL DEFAULT 'lead',
  source text,
  tags text[] NOT NULL DEFAULT '{}',
  description text,
  health public.crm_customer_health,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source_system text,
  source_record_id text,
  is_archived boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_companies_name ON public.crm_companies (lower(name));
CREATE INDEX idx_crm_companies_domain ON public.crm_companies (lower(domain));
CREATE INDEX idx_crm_companies_lifecycle ON public.crm_companies (lifecycle);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_companies TO authenticated;
GRANT ALL ON public.crm_companies TO service_role;
ALTER TABLE public.crm_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_companies read" ON public.crm_companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_companies insert" ON public.crm_companies FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "crm_companies update" ON public.crm_companies FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR created_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "crm_companies delete" ON public.crm_companies FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER crm_companies_updated_at BEFORE UPDATE ON public.crm_companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== CONTACTS ==========
CREATE TABLE public.crm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.crm_companies(id) ON DELETE SET NULL,
  first_name text,
  last_name text,
  full_name text GENERATED ALWAYS AS (COALESCE(NULLIF(TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')), ''), 'Unknown')) STORED,
  email text,
  phone text,
  title text,
  seniority text,
  linkedin_url text,
  is_primary boolean NOT NULL DEFAULT false,
  is_decision_maker boolean NOT NULL DEFAULT false,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  lifecycle public.crm_lifecycle NOT NULL DEFAULT 'lead',
  source text,
  tags text[] NOT NULL DEFAULT '{}',
  source_system text,
  source_record_id text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_contacts_email ON public.crm_contacts (lower(email));
CREATE INDEX idx_crm_contacts_company ON public.crm_contacts (company_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_contacts TO authenticated;
GRANT ALL ON public.crm_contacts TO service_role;
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_contacts read" ON public.crm_contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_contacts insert" ON public.crm_contacts FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "crm_contacts update" ON public.crm_contacts FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR created_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "crm_contacts delete" ON public.crm_contacts FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER crm_contacts_updated_at BEFORE UPDATE ON public.crm_contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== PIPELINES ==========
CREATE TABLE public.crm_pipelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_default boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  currency text DEFAULT 'USD',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_pipelines TO authenticated;
GRANT ALL ON public.crm_pipelines TO service_role;
ALTER TABLE public.crm_pipelines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_pipelines read" ON public.crm_pipelines FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_pipelines insert" ON public.crm_pipelines FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')));
CREATE POLICY "crm_pipelines update" ON public.crm_pipelines FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "crm_pipelines delete" ON public.crm_pipelines FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER crm_pipelines_updated_at BEFORE UPDATE ON public.crm_pipelines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.crm_pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  name text NOT NULL,
  position int NOT NULL DEFAULT 0,
  probability numeric NOT NULL DEFAULT 0 CHECK (probability BETWEEN 0 AND 100),
  sla_days int,
  forecast_category public.crm_forecast_category NOT NULL DEFAULT 'pipeline',
  is_won boolean NOT NULL DEFAULT false,
  is_lost boolean NOT NULL DEFAULT false,
  color text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_stages_pipeline ON public.crm_pipeline_stages (pipeline_id, position);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_pipeline_stages TO authenticated;
GRANT ALL ON public.crm_pipeline_stages TO service_role;
ALTER TABLE public.crm_pipeline_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_stages read" ON public.crm_pipeline_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_stages write" ON public.crm_pipeline_stages FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "crm_stages update" ON public.crm_pipeline_stages FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "crm_stages delete" ON public.crm_pipeline_stages FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- Seed a default pipeline
INSERT INTO public.crm_pipelines (name, description, is_default) VALUES ('Sales', 'Varsayılan satış pipeline''ı', true);
INSERT INTO public.crm_pipeline_stages (pipeline_id, name, position, probability, forecast_category, is_won, is_lost, color)
SELECT p.id, s.name, s.position, s.probability, s.forecast_category::public.crm_forecast_category, s.is_won, s.is_lost, s.color
FROM public.crm_pipelines p
CROSS JOIN (VALUES
  ('Lead',          0,  10, 'pipeline',    false, false, '#94a3b8'),
  ('Qualified',     1,  25, 'pipeline',    false, false, '#60a5fa'),
  ('Demo',          2,  40, 'best_case',   false, false, '#38bdf8'),
  ('Proposal',      3,  60, 'best_case',   false, false, '#a78bfa'),
  ('Negotiation',   4,  80, 'commit',      false, false, '#f59e0b'),
  ('Closed Won',    5, 100, 'closed_won',  true,  false, '#10b981'),
  ('Closed Lost',   6,   0, 'closed_lost', false, true,  '#ef4444')
) AS s(name, position, probability, forecast_category, is_won, is_lost, color)
WHERE p.is_default = true;

-- ========== OPPORTUNITIES ==========
CREATE TABLE public.crm_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company_id uuid REFERENCES public.crm_companies(id) ON DELETE SET NULL,
  primary_contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  pipeline_id uuid NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE RESTRICT,
  stage_id uuid NOT NULL REFERENCES public.crm_pipeline_stages(id) ON DELETE RESTRICT,
  status public.crm_opp_status NOT NULL DEFAULT 'open',
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  fx_rate numeric,
  amount_base numeric,
  probability numeric CHECK (probability IS NULL OR probability BETWEEN 0 AND 100),
  forecast_category public.crm_forecast_category NOT NULL DEFAULT 'pipeline',
  expected_close_date date,
  actual_close_date date,
  source text,
  campaign text,
  competitor text,
  next_action text,
  next_action_date date,
  lost_reason text,
  won_reason text,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  stage_entered_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz,
  source_system text,
  source_record_id text,
  description text,
  tags text[] NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_opps_stage ON public.crm_opportunities (stage_id);
CREATE INDEX idx_opps_pipeline ON public.crm_opportunities (pipeline_id);
CREATE INDEX idx_opps_company ON public.crm_opportunities (company_id);
CREATE INDEX idx_opps_owner ON public.crm_opportunities (owner_id);
CREATE INDEX idx_opps_status ON public.crm_opportunities (status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_opportunities TO authenticated;
GRANT ALL ON public.crm_opportunities TO service_role;
ALTER TABLE public.crm_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_opps read" ON public.crm_opportunities FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_opps insert" ON public.crm_opportunities FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "crm_opps update" ON public.crm_opportunities FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR created_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "crm_opps delete" ON public.crm_opportunities FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER crm_opps_updated_at BEFORE UPDATE ON public.crm_opportunities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Track stage entry time for stuck-opportunity detection
CREATE OR REPLACE FUNCTION public.crm_track_stage_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.stage_id IS DISTINCT FROM OLD.stage_id THEN
    NEW.stage_entered_at = now();
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER crm_opps_stage_change BEFORE UPDATE ON public.crm_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.crm_track_stage_change();

-- ========== ACTIVITIES ==========
CREATE TABLE public.crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.crm_activity_kind NOT NULL DEFAULT 'note',
  subject text NOT NULL,
  body text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  duration_minutes int,
  outcome text,
  -- polymorphic parent: any of these may be set
  company_id uuid REFERENCES public.crm_companies(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES public.crm_opportunities(id) ON DELETE CASCADE,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source_system text,
  source_record_id text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_act_opp ON public.crm_activities (opportunity_id);
CREATE INDEX idx_crm_act_company ON public.crm_activities (company_id);
CREATE INDEX idx_crm_act_contact ON public.crm_activities (contact_id);
CREATE INDEX idx_crm_act_occurred ON public.crm_activities (occurred_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_activities TO authenticated;
GRANT ALL ON public.crm_activities TO service_role;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_act read" ON public.crm_activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_act insert" ON public.crm_activities FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "crm_act update" ON public.crm_activities FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR performed_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "crm_act delete" ON public.crm_activities FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Bump opportunity.last_activity_at
CREATE OR REPLACE FUNCTION public.crm_touch_opp_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.opportunity_id IS NOT NULL THEN
    UPDATE public.crm_opportunities SET last_activity_at = NEW.occurred_at WHERE id = NEW.opportunity_id;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER crm_act_touch_opp AFTER INSERT ON public.crm_activities
  FOR EACH ROW EXECUTE FUNCTION public.crm_touch_opp_activity();

-- ========== QUOTES ==========
CREATE TABLE public.crm_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number text NOT NULL,
  opportunity_id uuid REFERENCES public.crm_opportunities(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.crm_companies(id) ON DELETE SET NULL,
  status public.crm_quote_status NOT NULL DEFAULT 'draft',
  version int NOT NULL DEFAULT 1,
  currency text NOT NULL DEFAULT 'USD',
  subtotal numeric NOT NULL DEFAULT 0,
  discount_pct numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  tax_pct numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  valid_until date,
  notes text,
  terms text,
  pdf_url text,
  esign_url text,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  sent_at timestamptz,
  accepted_at timestamptz,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quote_number, version)
);
CREATE INDEX idx_quotes_opp ON public.crm_quotes (opportunity_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_quotes TO authenticated;
GRANT ALL ON public.crm_quotes TO service_role;
ALTER TABLE public.crm_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_quotes read" ON public.crm_quotes FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_quotes insert" ON public.crm_quotes FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "crm_quotes update" ON public.crm_quotes FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR created_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "crm_quotes delete" ON public.crm_quotes FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER crm_quotes_updated_at BEFORE UPDATE ON public.crm_quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE SEQUENCE IF NOT EXISTS public.crm_quote_seq START 1000;
CREATE OR REPLACE FUNCTION public.crm_quote_default_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.quote_number IS NULL OR NEW.quote_number = '' THEN
    NEW.quote_number := 'Q-' || LPAD(nextval('public.crm_quote_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER crm_quotes_number BEFORE INSERT ON public.crm_quotes FOR EACH ROW EXECUTE FUNCTION public.crm_quote_default_number();

CREATE TABLE public.crm_quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.crm_quotes(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  sku text,
  name text NOT NULL,
  description text,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  discount_pct numeric NOT NULL DEFAULT 0,
  tax_pct numeric NOT NULL DEFAULT 0,
  line_total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_quote_items_quote ON public.crm_quote_items (quote_id, position);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_quote_items TO authenticated;
GRANT ALL ON public.crm_quote_items TO service_role;
ALTER TABLE public.crm_quote_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_qi read" ON public.crm_quote_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_qi insert" ON public.crm_quote_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "crm_qi update" ON public.crm_quote_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "crm_qi delete" ON public.crm_quote_items FOR DELETE TO authenticated USING (true);

-- ========== CONTRACTS ==========
CREATE TABLE public.crm_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number text NOT NULL,
  title text NOT NULL,
  company_id uuid REFERENCES public.crm_companies(id) ON DELETE SET NULL,
  opportunity_id uuid REFERENCES public.crm_opportunities(id) ON DELETE SET NULL,
  status public.crm_contract_status NOT NULL DEFAULT 'draft',
  value numeric,
  currency text DEFAULT 'USD',
  start_date date,
  end_date date,
  renewal_date date,
  auto_renew boolean NOT NULL DEFAULT false,
  renewal_notice_days int DEFAULT 30,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  counterparty_name text,
  counterparty_email text,
  risky_clauses text,
  file_url text,
  esign_url text,
  approval_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  signed_at timestamptz,
  terminated_at timestamptz,
  termination_reason text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contract_number)
);
CREATE INDEX idx_contracts_company ON public.crm_contracts (company_id);
CREATE INDEX idx_contracts_status ON public.crm_contracts (status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_contracts TO authenticated;
GRANT ALL ON public.crm_contracts TO service_role;
ALTER TABLE public.crm_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_contracts read" ON public.crm_contracts FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_contracts insert" ON public.crm_contracts FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "crm_contracts update" ON public.crm_contracts FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR created_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "crm_contracts delete" ON public.crm_contracts FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER crm_contracts_updated_at BEFORE UPDATE ON public.crm_contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE SEQUENCE IF NOT EXISTS public.crm_contract_seq START 1000;
CREATE OR REPLACE FUNCTION public.crm_contract_default_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.contract_number IS NULL OR NEW.contract_number = '' THEN
    NEW.contract_number := 'C-' || LPAD(nextval('public.crm_contract_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER crm_contracts_number BEFORE INSERT ON public.crm_contracts FOR EACH ROW EXECUTE FUNCTION public.crm_contract_default_number();

-- ========== CUSTOMERS ==========
CREATE TABLE public.crm_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid UNIQUE REFERENCES public.crm_companies(id) ON DELETE CASCADE,
  onboarded_at timestamptz NOT NULL DEFAULT now(),
  cs_owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  am_owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  health public.crm_customer_health NOT NULL DEFAULT 'watch',
  health_score int CHECK (health_score IS NULL OR health_score BETWEEN 0 AND 100),
  health_updated_at timestamptz,
  arr numeric,
  mrr numeric,
  currency text DEFAULT 'USD',
  nps int,
  nps_updated_at timestamptz,
  last_contact_at timestamptz,
  renewal_date date,
  churned_at timestamptz,
  churn_reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_customers TO authenticated;
GRANT ALL ON public.crm_customers TO service_role;
ALTER TABLE public.crm_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_customers read" ON public.crm_customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_customers insert" ON public.crm_customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "crm_customers update" ON public.crm_customers FOR UPDATE TO authenticated
  USING (cs_owner_id = auth.uid() OR am_owner_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "crm_customers delete" ON public.crm_customers FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER crm_customers_updated_at BEFORE UPDATE ON public.crm_customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== SUBSCRIPTIONS ==========
CREATE TABLE public.crm_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
  plan_name text NOT NULL,
  status public.crm_subscription_status NOT NULL DEFAULT 'active',
  mrr numeric NOT NULL DEFAULT 0,
  arr numeric,
  currency text NOT NULL DEFAULT 'USD',
  seats int,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  renewal_date date,
  cancelled_at timestamptz,
  trial_ends_at timestamptz,
  source_system text,
  source_record_id text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_subs_customer ON public.crm_subscriptions (customer_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_subscriptions TO authenticated;
GRANT ALL ON public.crm_subscriptions TO service_role;
ALTER TABLE public.crm_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_subs read" ON public.crm_subscriptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_subs insert" ON public.crm_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "crm_subs update" ON public.crm_subscriptions FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "crm_subs delete" ON public.crm_subscriptions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER crm_subs_updated_at BEFORE UPDATE ON public.crm_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== WON-DEAL AUTOMATION ==========
CREATE OR REPLACE FUNCTION public.crm_opportunity_won_flow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_stage_is_won boolean := false;
  v_prev_won boolean := false;
  v_customer_id uuid;
  v_company_name text;
BEGIN
  SELECT is_won INTO v_stage_is_won FROM public.crm_pipeline_stages WHERE id = NEW.stage_id;
  IF TG_OP = 'UPDATE' THEN
    SELECT is_won INTO v_prev_won FROM public.crm_pipeline_stages WHERE id = OLD.stage_id;
  END IF;

  -- Only fire on transition into a won stage
  IF v_stage_is_won IS TRUE AND (TG_OP = 'INSERT' OR v_prev_won IS DISTINCT FROM true) THEN
    NEW.status := 'won';
    NEW.actual_close_date := COALESCE(NEW.actual_close_date, CURRENT_DATE);
    NEW.forecast_category := 'closed_won';

    IF NEW.company_id IS NOT NULL THEN
      -- Promote company lifecycle
      UPDATE public.crm_companies SET lifecycle = 'customer' WHERE id = NEW.company_id AND lifecycle <> 'customer';
      SELECT name INTO v_company_name FROM public.crm_companies WHERE id = NEW.company_id;

      -- Create customer if none
      INSERT INTO public.crm_customers (company_id, cs_owner_id, am_owner_id, arr, mrr, currency, renewal_date)
      VALUES (NEW.company_id, NEW.owner_id, NEW.owner_id, NEW.amount, ROUND(NEW.amount / 12.0, 2), NEW.currency,
              COALESCE(NEW.actual_close_date, CURRENT_DATE) + INTERVAL '1 year')
      ON CONFLICT (company_id) DO NOTHING
      RETURNING id INTO v_customer_id;

      IF v_customer_id IS NULL THEN
        SELECT id INTO v_customer_id FROM public.crm_customers WHERE company_id = NEW.company_id;
      END IF;

      -- Wire the graph: opportunity → customer, company → customer
      INSERT INTO public.object_links (from_type, from_id, to_type, to_id, link_kind, created_by)
      VALUES ('crm.opportunity', NEW.id, 'crm.company', v_customer_id, 'won_deal', NEW.owner_id)
      ON CONFLICT DO NOTHING;

      -- Founder Inbox item: first invoice
      INSERT INTO public.approvals (kind, title, summary, amount, currency, priority, assigned_to, requested_by, resource_type, resource_id, context)
      VALUES (
        'payment',
        'İlk fatura hazırlansın: ' || COALESCE(v_company_name, NEW.name),
        'Yeni kazanılan fırsat için ilk fatura süreci başlatılmalı.',
        NEW.amount, NEW.currency, 'high', NEW.owner_id, NEW.owner_id,
        'crm.opportunity', NEW.id,
        jsonb_build_object('opportunity_id', NEW.id, 'company_id', NEW.company_id, 'customer_id', v_customer_id)
      );
    END IF;
  END IF;

  RETURN NEW;
END; $$;

CREATE TRIGGER crm_opps_won_flow BEFORE INSERT OR UPDATE OF stage_id ON public.crm_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.crm_opportunity_won_flow();
