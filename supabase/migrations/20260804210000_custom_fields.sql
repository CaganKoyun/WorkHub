-- Custom fields. Two tables:
--   custom_field_defs   — the schema (per workspace, per entity_type)
--   custom_field_values — the values (per row of the target entity)
-- entity_type is a free text so we can attach fields to tasks, projects,
-- bugs, deals, etc. without another migration each time.

-- 1) Kinds
DO $$ BEGIN
  CREATE TYPE public.custom_field_kind AS ENUM (
    'text','long_text','number','currency','percent',
    'select','multi_select','date','datetime','boolean','url','email'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2) Definitions
CREATE TABLE IF NOT EXISTS public.custom_field_defs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL DEFAULT public.current_workspace_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('task','project','bug','deal','customer')),
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  kind public.custom_field_kind NOT NULL,
  /* Per-kind config:
     select      → { options: [{value,label,color?}] }
     multi_select→ { options: [...] }
     currency    → { currency: 'USD' }
     number      → { min?, max?, precision? }
     text        → { placeholder? }                                        */
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  position INT NOT NULL DEFAULT 0,
  required BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, entity_type, key)
);

CREATE INDEX IF NOT EXISTS idx_cf_defs_ws_entity ON public.custom_field_defs(workspace_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_cf_defs_position ON public.custom_field_defs(workspace_id, entity_type, position);

ALTER TABLE public.custom_field_defs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cf_defs_read ON public.custom_field_defs;
CREATE POLICY cf_defs_read ON public.custom_field_defs FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
DROP POLICY IF EXISTS cf_defs_write ON public.custom_field_defs;
CREATE POLICY cf_defs_write ON public.custom_field_defs FOR ALL TO authenticated
  USING (public.is_workspace_admin(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_admin(workspace_id, auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_field_defs TO authenticated;
GRANT ALL ON public.custom_field_defs TO service_role;

DROP TRIGGER IF EXISTS cf_defs_touch ON public.custom_field_defs;
CREATE TRIGGER cf_defs_touch BEFORE UPDATE ON public.custom_field_defs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Values
CREATE TABLE IF NOT EXISTS public.custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL DEFAULT public.current_workspace_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  def_id UUID NOT NULL REFERENCES public.custom_field_defs(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  value JSONB,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (def_id, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_cf_values_entity ON public.custom_field_values(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_cf_values_def ON public.custom_field_values(def_id);
CREATE INDEX IF NOT EXISTS idx_cf_values_workspace ON public.custom_field_values(workspace_id);

ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cf_values_read ON public.custom_field_values;
CREATE POLICY cf_values_read ON public.custom_field_values FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
DROP POLICY IF EXISTS cf_values_write ON public.custom_field_values;
CREATE POLICY cf_values_write ON public.custom_field_values FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_field_values TO authenticated;
GRANT ALL ON public.custom_field_values TO service_role;

DROP TRIGGER IF EXISTS cf_values_touch ON public.custom_field_values;
CREATE TRIGGER cf_values_touch BEFORE UPDATE ON public.custom_field_values
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
