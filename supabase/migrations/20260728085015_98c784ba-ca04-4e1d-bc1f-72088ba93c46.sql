-- Asset condition enum
CREATE TYPE public.asset_condition AS ENUM ('excellent', 'good', 'fair', 'poor', 'retired');

-- Asset categories
CREATE TABLE public.asset_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  default_useful_life_years INTEGER NOT NULL DEFAULT 3,
  residual_value_percent NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_categories TO authenticated;
GRANT ALL ON public.asset_categories TO service_role;
ALTER TABLE public.asset_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can select categories" ON public.asset_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert categories" ON public.asset_categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update categories" ON public.asset_categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can delete categories" ON public.asset_categories FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Employees
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  department TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can select employees" ON public.employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert employees" ON public.employees FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update employees" ON public.employees FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can delete employees" ON public.employees FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Assets
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.asset_categories(id) ON DELETE SET NULL,
  serial_number TEXT,
  purchase_date DATE NOT NULL,
  purchase_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  condition public.asset_condition NOT NULL DEFAULT 'good',
  location TEXT,
  notes TEXT,
  useful_life_years INTEGER NOT NULL DEFAULT 3,
  residual_value_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assets TO authenticated;
GRANT ALL ON public.assets TO service_role;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can select assets" ON public.assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert assets" ON public.assets FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Owner or admin can update assets" ON public.assets FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete assets" ON public.assets FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Asset assignments
CREATE TABLE public.asset_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  assigned_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  returned_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_assignments TO authenticated;
GRANT ALL ON public.asset_assignments TO service_role;
ALTER TABLE public.asset_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can select assignments" ON public.asset_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert assignments" ON public.asset_assignments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update assignments" ON public.asset_assignments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can delete assignments" ON public.asset_assignments FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Indexes
CREATE INDEX idx_assets_category ON public.assets(category_id);
CREATE INDEX idx_assets_condition ON public.assets(condition);
CREATE INDEX idx_assets_archived ON public.assets(is_archived);
CREATE INDEX idx_assignments_asset ON public.asset_assignments(asset_id);
CREATE INDEX idx_assignments_employee ON public.asset_assignments(employee_id);
CREATE UNIQUE INDEX idx_assets_serial ON public.assets(serial_number) WHERE serial_number IS NOT NULL;

-- Seed categories
INSERT INTO public.asset_categories (name, default_useful_life_years) VALUES
  ('Hardware', 3),
  ('Furniture', 7),
  ('Software licenses', 3),
  ('Office equipment', 5),
  ('Vehicles', 5);