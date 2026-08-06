-- Formula field kind: compute-on-read custom field. Formula string lives in
-- custom_field_defs.config.formula; client-side evaluator resolves it against
-- the task's context (self + subtasks). No DB-side compute — keeps it cheap.

DO $$ BEGIN
  ALTER TYPE public.custom_field_kind ADD VALUE IF NOT EXISTS 'formula';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
