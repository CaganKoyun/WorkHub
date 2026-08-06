-- ============================================================================
-- SPRINT 1.1 — DSoR fix (P0, PRD §"P0 Fixes")
--
-- Root cause of the "decisions 400" regression: 20260728131000_decision_core
-- was never applied to prod, so the client posts verdict/confidence/
-- actual_outcome columns the DB doesn't have. This migration is a
-- self-contained, idempotent consolidation:
--   1. decision-core columns (IF NOT EXISTS re-application)
--   2. NEW: reviewed_by — who closed the loop
--   3. handle_new_user() guarantee — auth.users INSERT → profiles row
--
-- Verdict domain note: this codebase's DSoR uses the review-outcome
-- domain ('held','changed','wrong') — "did the decision hold?" — which
-- the whole client (decision-contract.ts, DecisionReplay) is built on.
-- Kept as-is; approval-style states (approved/rejected) already live on
-- decisions.status + the approvals table.
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.decision_verdict AS ENUM ('held','changed','wrong');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.decision_reversibility AS ENUM ('one_way','two_way');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.decisions
  ADD COLUMN IF NOT EXISTS expected_outcome text,
  ADD COLUMN IF NOT EXISTS confidence smallint CHECK (confidence BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS reversibility public.decision_reversibility,
  ADD COLUMN IF NOT EXISTS reversibility_note text,
  ADD COLUMN IF NOT EXISTS review_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS actual_outcome text,
  ADD COLUMN IF NOT EXISTS verdict public.decision_verdict,
  ADD COLUMN IF NOT EXISTS state_snapshot jsonb;

CREATE INDEX IF NOT EXISTS idx_decisions_review_due
  ON public.decisions (review_at)
  WHERE verdict IS NULL AND review_at IS NOT NULL;

-- reviewed_at/by are stamped server-side so a client can't forget them.
CREATE OR REPLACE FUNCTION public.decisions_stamp_review()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.verdict IS NOT NULL AND OLD.verdict IS DISTINCT FROM NEW.verdict THEN
    IF NEW.reviewed_at IS NULL THEN NEW.reviewed_at := now(); END IF;
    IF NEW.reviewed_by IS NULL THEN NEW.reviewed_by := auth.uid(); END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS decisions_stamp_review ON public.decisions;
CREATE TRIGGER decisions_stamp_review
  BEFORE UPDATE ON public.decisions
  FOR EACH ROW EXECUTE FUNCTION public.decisions_stamp_review();

-- ---------------------------------------------------------------------------
-- profiles.email — needed by handle_new_user and backfill below.
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- ---------------------------------------------------------------------------
-- handle_new_user: guarantee every auth.users row gets a profiles row.
-- Idempotent re-declaration; ON CONFLICT protects rows that already exist.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill: any auth user missing a profile gets one now.
INSERT INTO public.profiles (user_id, email, full_name)
SELECT u.id, u.email,
       COALESCE(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1))
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
