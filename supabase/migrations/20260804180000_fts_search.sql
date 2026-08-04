-- Full-text search across the searchable domain entities. Every searchable
-- table gets:
--   1. A generated tsvector column (`fts`) built from title + description-ish
--      fields, weighted by importance.
--   2. A GIN index on that column.
-- Prefix-search support is provided at query time via to_tsquery('word:*').
-- We also enable pg_trgm for cheap typo-tolerance on tracking_id lookups.
--
-- NOTE: Postgres requires generation expressions to be IMMUTABLE. The
-- to_tsvector(regconfig, text) overload is IMMUTABLE, but the single-arg
-- to_tsvector(text) form (which is what you get without an explicit cast on
-- 'simple') is STABLE — hence the ::regconfig casts everywhere below.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------- tasks ----------
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS fts tsvector
    GENERATED ALWAYS AS (
      setweight(to_tsvector('simple'::regconfig, coalesce(title, '')), 'A') ||
      setweight(to_tsvector('simple'::regconfig, coalesce(tracking_id, '')), 'A') ||
      setweight(to_tsvector('simple'::regconfig, coalesce(description, '')), 'B') ||
      setweight(to_tsvector('simple'::regconfig, array_to_string(coalesce(tags, ARRAY[]::text[]), ' ')), 'C')
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_tasks_fts ON public.tasks USING GIN (fts);
CREATE INDEX IF NOT EXISTS idx_tasks_tracking_trgm ON public.tasks USING GIN (tracking_id gin_trgm_ops);

-- ---------- projects ----------
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS fts tsvector
    GENERATED ALWAYS AS (
      setweight(to_tsvector('simple'::regconfig, coalesce(name, '')), 'A') ||
      setweight(to_tsvector('simple'::regconfig, coalesce(description, '')), 'B')
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_projects_fts ON public.projects USING GIN (fts);

-- ---------- bugs ----------
ALTER TABLE public.bugs
  ADD COLUMN IF NOT EXISTS fts tsvector
    GENERATED ALWAYS AS (
      setweight(to_tsvector('simple'::regconfig, coalesce(title, '')), 'A') ||
      setweight(to_tsvector('simple'::regconfig, coalesce(tracking_id, '')), 'A') ||
      setweight(to_tsvector('simple'::regconfig, coalesce(description, '')), 'B') ||
      setweight(to_tsvector('simple'::regconfig, coalesce(steps_to_reproduce, '')), 'C')
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_bugs_fts ON public.bugs USING GIN (fts);
CREATE INDEX IF NOT EXISTS idx_bugs_tracking_trgm ON public.bugs USING GIN (tracking_id gin_trgm_ops);

-- ---------- decisions ----------
ALTER TABLE public.decisions
  ADD COLUMN IF NOT EXISTS fts tsvector
    GENERATED ALWAYS AS (
      setweight(to_tsvector('simple'::regconfig, coalesce(title, '')), 'A') ||
      setweight(to_tsvector('simple'::regconfig, coalesce(problem, '')), 'B') ||
      setweight(to_tsvector('simple'::regconfig, coalesce(context, '')), 'B') ||
      setweight(to_tsvector('simple'::regconfig, coalesce(rationale, '')), 'C')
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_decisions_fts ON public.decisions USING GIN (fts);

-- ---------- CRM companies ----------
ALTER TABLE public.crm_companies
  ADD COLUMN IF NOT EXISTS fts tsvector
    GENERATED ALWAYS AS (
      setweight(to_tsvector('simple'::regconfig, coalesce(name, '')), 'A') ||
      setweight(to_tsvector('simple'::regconfig, coalesce(website, '')), 'B') ||
      setweight(to_tsvector('simple'::regconfig, coalesce(description, '')), 'C')
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_crm_companies_fts ON public.crm_companies USING GIN (fts);
