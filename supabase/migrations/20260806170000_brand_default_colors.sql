-- Graphite × Lime rebrand: DB-level default colors still carried the
-- old Linear indigo #5E6AD2. Client defaults were updated to lime
-- #C6F432; align the column defaults so rows created outside the app
-- (SQL, API) match the brand.

ALTER TABLE public.portfolios ALTER COLUMN color SET DEFAULT '#C6F432';

-- Projects table: only change if a default exists and is the old indigo.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'projects'
      AND column_name = 'color' AND column_default LIKE '%5E6AD2%'
  ) THEN
    ALTER TABLE public.projects ALTER COLUMN color SET DEFAULT '#C6F432';
  END IF;
END $$;
