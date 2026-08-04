
ALTER TABLE public.decisions
  ADD COLUMN IF NOT EXISTS expected_outcome text,
  ADD COLUMN IF NOT EXISTS confidence integer CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 100)),
  ADD COLUMN IF NOT EXISTS reversibility text CHECK (reversibility IS NULL OR reversibility IN ('one_way','two_way')),
  ADD COLUMN IF NOT EXISTS reversibility_note text,
  ADD COLUMN IF NOT EXISTS review_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS actual_outcome text,
  ADD COLUMN IF NOT EXISTS verdict text CHECK (verdict IS NULL OR verdict IN ('held','changed','wrong')),
  ADD COLUMN IF NOT EXISTS state_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS source_approval_id uuid;

CREATE INDEX IF NOT EXISTS decisions_review_at_idx ON public.decisions (workspace_id, review_at) WHERE verdict IS NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.profiles (user_id, full_name)
SELECT u.id, COALESCE(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1))
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.id IS NULL;
