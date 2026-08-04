-- Full-text search across the searchable domain entities.
--
-- Postgres refuses non-IMMUTABLE expressions in STORED generated columns.
-- The trap: to_tsvector('simple', text) resolves to the two-arg text
-- overload (STABLE), and array_to_string(anyarray, text) is STABLE too.
-- Fix by wrapping each fts expression in a SQL function we explicitly
-- mark IMMUTABLE — the wrapper uses regconfig-typed to_tsvector (which
-- IS immutable in Postgres) and array_to_tsvector for the tags array.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------- Helper wrappers (all IMMUTABLE) ----------
CREATE OR REPLACE FUNCTION public.fts_tasks_expr(
  _title text, _tracking_id text, _description text, _tags text[]
) RETURNS tsvector
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
  SELECT
    setweight(to_tsvector('simple'::regconfig, coalesce(_title, '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(_tracking_id, '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(_description, '')), 'B') ||
    setweight(array_to_tsvector(coalesce(_tags, ARRAY[]::text[])), 'C')
$$;

CREATE OR REPLACE FUNCTION public.fts_projects_expr(_name text, _description text)
RETURNS tsvector LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT
    setweight(to_tsvector('simple'::regconfig, coalesce(_name, '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(_description, '')), 'B')
$$;

CREATE OR REPLACE FUNCTION public.fts_bugs_expr(
  _title text, _tracking_id text, _description text, _steps text
) RETURNS tsvector LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT
    setweight(to_tsvector('simple'::regconfig, coalesce(_title, '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(_tracking_id, '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(_description, '')), 'B') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(_steps, '')), 'C')
$$;

CREATE OR REPLACE FUNCTION public.fts_decisions_expr(
  _title text, _problem text, _context text, _rationale text
) RETURNS tsvector LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT
    setweight(to_tsvector('simple'::regconfig, coalesce(_title, '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(_problem, '')), 'B') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(_context, '')), 'B') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(_rationale, '')), 'C')
$$;

CREATE OR REPLACE FUNCTION public.fts_companies_expr(
  _name text, _website text, _description text
) RETURNS tsvector LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT
    setweight(to_tsvector('simple'::regconfig, coalesce(_name, '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(_website, '')), 'B') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(_description, '')), 'C')
$$;

-- ---------- Generated columns + indexes ----------
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS fts tsvector
    GENERATED ALWAYS AS (public.fts_tasks_expr(title, tracking_id, description, tags)) STORED;
CREATE INDEX IF NOT EXISTS idx_tasks_fts ON public.tasks USING GIN (fts);
CREATE INDEX IF NOT EXISTS idx_tasks_tracking_trgm ON public.tasks USING GIN (tracking_id gin_trgm_ops);

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS fts tsvector
    GENERATED ALWAYS AS (public.fts_projects_expr(name, description)) STORED;
CREATE INDEX IF NOT EXISTS idx_projects_fts ON public.projects USING GIN (fts);

ALTER TABLE public.bugs
  ADD COLUMN IF NOT EXISTS fts tsvector
    GENERATED ALWAYS AS (public.fts_bugs_expr(title, tracking_id, description, steps_to_reproduce)) STORED;
CREATE INDEX IF NOT EXISTS idx_bugs_fts ON public.bugs USING GIN (fts);
CREATE INDEX IF NOT EXISTS idx_bugs_tracking_trgm ON public.bugs USING GIN (tracking_id gin_trgm_ops);

ALTER TABLE public.decisions
  ADD COLUMN IF NOT EXISTS fts tsvector
    GENERATED ALWAYS AS (public.fts_decisions_expr(title, problem, context, rationale)) STORED;
CREATE INDEX IF NOT EXISTS idx_decisions_fts ON public.decisions USING GIN (fts);

ALTER TABLE public.crm_companies
  ADD COLUMN IF NOT EXISTS fts tsvector
    GENERATED ALWAYS AS (public.fts_companies_expr(name, website, description)) STORED;
CREATE INDEX IF NOT EXISTS idx_crm_companies_fts ON public.crm_companies USING GIN (fts);
