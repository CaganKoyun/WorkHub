
-- Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL DEFAULT public.current_workspace_id(),
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY products_select ON public.products FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY products_insert ON public.products FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY products_update ON public.products FOR UPDATE TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid())) WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY products_delete ON public.products FOR DELETE TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Features (roadmap items)
CREATE TABLE public.features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL DEFAULT public.current_workspace_id(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'idea', -- idea, planned, in_progress, shipped, cancelled
  priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, urgent
  effort TEXT, -- xs, s, m, l, xl
  impact TEXT,
  target_release_id UUID,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  votes INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.features TO authenticated;
GRANT ALL ON public.features TO service_role;
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;
CREATE POLICY features_select ON public.features FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY features_insert ON public.features FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY features_update ON public.features FOR UPDATE TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid())) WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY features_delete ON public.features FOR DELETE TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE TRIGGER trg_features_updated BEFORE UPDATE ON public.features FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Feedback
CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL DEFAULT public.current_workspace_id(),
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  feature_id UUID REFERENCES public.features(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'manual', -- manual, email, intercom, slack, form
  submitter_name TEXT,
  submitter_email TEXT,
  customer_id UUID,
  category TEXT, -- bug, feature_request, praise, question, complaint
  sentiment TEXT, -- positive, neutral, negative
  title TEXT NOT NULL,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'new', -- new, triaged, planned, done, wont_do
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY feedback_select ON public.feedback FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY feedback_insert ON public.feedback FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY feedback_update ON public.feedback FOR UPDATE TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid())) WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY feedback_delete ON public.feedback FOR DELETE TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE TRIGGER trg_feedback_updated BEFORE UPDATE ON public.feedback FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Releases
CREATE TABLE public.releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL DEFAULT public.current_workspace_id(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'planned', -- planned, in_progress, released, cancelled
  release_date DATE,
  released_at TIMESTAMPTZ,
  notes TEXT,
  changelog TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.releases TO authenticated;
GRANT ALL ON public.releases TO service_role;
ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;
CREATE POLICY releases_select ON public.releases FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY releases_insert ON public.releases FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY releases_update ON public.releases FOR UPDATE TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid())) WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY releases_delete ON public.releases FOR DELETE TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE TRIGGER trg_releases_updated BEFORE UPDATE ON public.releases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.features ADD CONSTRAINT features_release_fk FOREIGN KEY (target_release_id) REFERENCES public.releases(id) ON DELETE SET NULL;

-- Incidents
CREATE TABLE public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL DEFAULT public.current_workspace_id(),
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  summary TEXT,
  severity TEXT NOT NULL DEFAULT 'sev3', -- sev1, sev2, sev3, sev4
  status TEXT NOT NULL DEFAULT 'investigating', -- investigating, identified, monitoring, resolved, postmortem
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  detected_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  root_cause TEXT,
  postmortem TEXT,
  commander_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  impact TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incidents TO authenticated;
GRANT ALL ON public.incidents TO service_role;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY incidents_select ON public.incidents FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY incidents_insert ON public.incidents FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY incidents_update ON public.incidents FOR UPDATE TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid())) WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY incidents_delete ON public.incidents FOR DELETE TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE TRIGGER trg_incidents_updated BEFORE UPDATE ON public.incidents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_features_ws ON public.features(workspace_id, status);
CREATE INDEX idx_feedback_ws ON public.feedback(workspace_id, status);
CREATE INDEX idx_releases_ws ON public.releases(workspace_id, status);
CREATE INDEX idx_incidents_ws ON public.incidents(workspace_id, status);
