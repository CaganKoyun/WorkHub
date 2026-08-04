
-- ============ ENUMS ============
DO $$ BEGIN CREATE TYPE public.fin_txn_type AS ENUM ('income','expense','transfer'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.fin_txn_status AS ENUM ('planned','posted','reconciled','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.fin_account_type AS ENUM ('bank','cash','credit_card','wallet','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.fin_budget_period AS ENUM ('monthly','quarterly','yearly','custom'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Base currency: USD. All aggregates and dashboards use base.

-- ============ ACCOUNTS ============
CREATE TABLE public.fin_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type public.fin_account_type NOT NULL DEFAULT 'bank',
  currency text NOT NULL DEFAULT 'USD',
  opening_balance numeric NOT NULL DEFAULT 0,
  opening_date date NOT NULL DEFAULT CURRENT_DATE,
  bank_name text,
  account_number text,
  is_archived boolean NOT NULL DEFAULT false,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_accounts TO authenticated;
GRANT ALL ON public.fin_accounts TO service_role;
ALTER TABLE public.fin_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_accounts read" ON public.fin_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "fin_accounts insert" ON public.fin_accounts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')));
CREATE POLICY "fin_accounts update" ON public.fin_accounts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "fin_accounts delete" ON public.fin_accounts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER fin_accounts_updated_at BEFORE UPDATE ON public.fin_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CATEGORIES ============
CREATE TABLE public.fin_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  txn_type public.fin_txn_type NOT NULL DEFAULT 'expense',
  parent_id uuid REFERENCES public.fin_categories(id) ON DELETE SET NULL,
  color text,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_categories TO authenticated;
GRANT ALL ON public.fin_categories TO service_role;
ALTER TABLE public.fin_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_cat read" ON public.fin_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "fin_cat write" ON public.fin_categories FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "fin_cat update" ON public.fin_categories FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "fin_cat delete" ON public.fin_categories FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- Seed default categories
INSERT INTO public.fin_categories (name, txn_type, color) VALUES
  ('Payroll',       'expense', '#f59e0b'),
  ('Software/SaaS', 'expense', '#8b5cf6'),
  ('Marketing',     'expense', '#ec4899'),
  ('Infrastructure','expense', '#06b6d4'),
  ('Professional Services','expense', '#a3a3a3'),
  ('Office',        'expense', '#64748b'),
  ('Travel',        'expense', '#84cc16'),
  ('Tax',           'expense', '#ef4444'),
  ('Other',         'expense', '#6b7280'),
  ('Subscription Revenue','income', '#10b981'),
  ('Services Revenue',    'income', '#22c55e'),
  ('Other Income',        'income', '#14b8a6');

-- ============ FX RATES ============
CREATE TABLE public.fin_fx_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency text NOT NULL,
  to_currency text NOT NULL DEFAULT 'USD',
  rate numeric NOT NULL,
  rate_date date NOT NULL DEFAULT CURRENT_DATE,
  source text DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_currency, to_currency, rate_date)
);
CREATE INDEX idx_fx_lookup ON public.fin_fx_rates (from_currency, to_currency, rate_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_fx_rates TO authenticated;
GRANT ALL ON public.fin_fx_rates TO service_role;
ALTER TABLE public.fin_fx_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fx read" ON public.fin_fx_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "fx write" ON public.fin_fx_rates FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "fx update" ON public.fin_fx_rates FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "fx delete" ON public.fin_fx_rates FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- USD self-rate for base
INSERT INTO public.fin_fx_rates (from_currency, to_currency, rate) VALUES ('USD','USD',1);

-- Helper: latest fx rate on/before a date
CREATE OR REPLACE FUNCTION public.fin_lookup_fx(_from text, _to text, _date date)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN _from = _to THEN 1
              ELSE (SELECT rate FROM public.fin_fx_rates
                    WHERE from_currency = _from AND to_currency = _to AND rate_date <= _date
                    ORDER BY rate_date DESC LIMIT 1)
         END;
$$;

-- ============ TRANSACTIONS ============
CREATE TABLE public.fin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.fin_txn_type NOT NULL,
  status public.fin_txn_status NOT NULL DEFAULT 'posted',
  description text NOT NULL,
  txn_date date NOT NULL DEFAULT CURRENT_DATE,
  -- Multi-currency (PRD 19.11)
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  fx_rate numeric,
  amount_base numeric,
  fx_date date,
  account_id uuid REFERENCES public.fin_accounts(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.fin_categories(id) ON DELETE SET NULL,
  -- Polymorphic links (also mirrored to object_links)
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  crm_company_id uuid REFERENCES public.crm_companies(id) ON DELETE SET NULL,
  crm_customer_id uuid REFERENCES public.crm_customers(id) ON DELETE SET NULL,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  department text,
  contract_id uuid REFERENCES public.crm_contracts(id) ON DELETE SET NULL,
  invoice_number text,
  vendor_name text,
  notes text,
  attachment_url text,
  is_recurring boolean NOT NULL DEFAULT false,
  recurring_interval text,   -- 'monthly','yearly'
  tags text[] NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_fin_txn_date ON public.fin_transactions (txn_date DESC);
CREATE INDEX idx_fin_txn_project ON public.fin_transactions (project_id);
CREATE INDEX idx_fin_txn_customer ON public.fin_transactions (crm_customer_id);
CREATE INDEX idx_fin_txn_status ON public.fin_transactions (status);
CREATE INDEX idx_fin_txn_type ON public.fin_transactions (type);
CREATE INDEX idx_fin_txn_category ON public.fin_transactions (category_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_transactions TO authenticated;
GRANT ALL ON public.fin_transactions TO service_role;
ALTER TABLE public.fin_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_tx read" ON public.fin_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "fin_tx insert" ON public.fin_transactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "fin_tx update" ON public.fin_transactions FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "fin_tx delete" ON public.fin_transactions FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER fin_tx_updated_at BEFORE UPDATE ON public.fin_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-fill fx / base amount using lookup when missing
CREATE OR REPLACE FUNCTION public.fin_fill_base_amount()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.fx_date IS NULL THEN
    NEW.fx_date = NEW.txn_date;
  END IF;
  IF NEW.fx_rate IS NULL THEN
    NEW.fx_rate = COALESCE(public.fin_lookup_fx(NEW.currency, 'USD', NEW.fx_date), 1);
  END IF;
  IF NEW.amount_base IS NULL THEN
    NEW.amount_base = NEW.amount * NEW.fx_rate;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER fin_tx_fill_base BEFORE INSERT OR UPDATE ON public.fin_transactions
  FOR EACH ROW EXECUTE FUNCTION public.fin_fill_base_amount();

-- ============ BUDGETS ============
CREATE TABLE public.fin_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  period public.fin_budget_period NOT NULL DEFAULT 'monthly',
  period_start date NOT NULL,
  period_end date NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  amount_base numeric,
  category_id uuid REFERENCES public.fin_categories(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  department text,
  alert_threshold_pct numeric NOT NULL DEFAULT 90,   -- warn when actual crosses X% of budget
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (period_end >= period_start)
);
CREATE INDEX idx_budget_period ON public.fin_budgets (period_start, period_end);
CREATE INDEX idx_budget_project ON public.fin_budgets (project_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_budgets TO authenticated;
GRANT ALL ON public.fin_budgets TO service_role;
ALTER TABLE public.fin_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_bud read" ON public.fin_budgets FOR SELECT TO authenticated USING (true);
CREATE POLICY "fin_bud insert" ON public.fin_budgets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')));
CREATE POLICY "fin_bud update" ON public.fin_budgets FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR created_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "fin_bud delete" ON public.fin_budgets FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER fin_bud_updated_at BEFORE UPDATE ON public.fin_budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.fin_bud_fill_base()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.amount_base IS NULL THEN
    NEW.amount_base = NEW.amount * COALESCE(public.fin_lookup_fx(NEW.currency,'USD',NEW.period_start), 1);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER fin_bud_base BEFORE INSERT OR UPDATE ON public.fin_budgets
  FOR EACH ROW EXECUTE FUNCTION public.fin_bud_fill_base();

-- ============ AGGREGATE HELPERS ============
-- Cash balance in base currency (opening + posted net flow)
CREATE OR REPLACE FUNCTION public.fin_cash_balance()
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH acc AS (
    SELECT SUM(opening_balance * COALESCE(public.fin_lookup_fx(currency,'USD',opening_date), 1)) AS opening
    FROM public.fin_accounts WHERE is_archived = false
  ),
  flow AS (
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income'  THEN amount_base ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_base ELSE 0 END), 0) AS net
    FROM public.fin_transactions
    WHERE status IN ('posted','reconciled')
  )
  SELECT COALESCE((SELECT opening FROM acc), 0) + COALESCE((SELECT net FROM flow), 0);
$$;

-- Burn rate over N days (average monthly net outflow, negative net becomes burn)
CREATE OR REPLACE FUNCTION public.fin_burn_rate(_days int DEFAULT 90)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH range AS (
    SELECT (CURRENT_DATE - (_days || ' days')::interval)::date AS from_date, CURRENT_DATE AS to_date
  ),
  flow AS (
    SELECT
      COALESCE(SUM(CASE WHEN type='expense' THEN amount_base ELSE 0 END),0) -
      COALESCE(SUM(CASE WHEN type='income'  THEN amount_base ELSE 0 END),0) AS net_out
    FROM public.fin_transactions, range
    WHERE status IN ('posted','reconciled')
      AND txn_date BETWEEN range.from_date AND range.to_date
  )
  SELECT GREATEST(0, (SELECT net_out FROM flow) / (_days::numeric / 30.0));
$$;
