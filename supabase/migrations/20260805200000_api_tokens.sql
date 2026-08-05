-- Personal Access Tokens (PATs) per workspace member.
-- Client generates the raw token (whu_<32 hex>), stores only its SHA-256 hash.
-- The plaintext is returned by the create RPC exactly once — never again.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.api_tokens (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           text        NOT NULL,
  token_prefix   text        NOT NULL,  -- first 8 chars of the raw token, shown in list
  token_hash     text        NOT NULL,  -- sha256 hex of the raw token
  scopes         text[]      NOT NULL DEFAULT '{read}'::text[],
  last_used_at   timestamptz,
  expires_at     timestamptz,
  revoked_at     timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_api_tokens_hash ON public.api_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_api_tokens_user ON public.api_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_api_tokens_ws ON public.api_tokens(workspace_id);

ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "api_tokens readable by owner or admin"       ON public.api_tokens;
DROP POLICY IF EXISTS "api_tokens updatable by owner (revoke only)" ON public.api_tokens;
DROP POLICY IF EXISTS "api_tokens deletable by owner or admin"      ON public.api_tokens;
-- No INSERT policy: creation goes through public.create_api_token RPC only,
-- so the hash+prefix pair is derived server-side from a fresh raw token.

CREATE POLICY "api_tokens readable by owner or admin"
  ON public.api_tokens FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_workspace_admin(workspace_id, auth.uid())
  );
CREATE POLICY "api_tokens updatable by owner (revoke only)"
  ON public.api_tokens FOR UPDATE
  USING (user_id = auth.uid() OR public.is_workspace_admin(workspace_id, auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_workspace_admin(workspace_id, auth.uid()));
CREATE POLICY "api_tokens deletable by owner or admin"
  ON public.api_tokens FOR DELETE
  USING (user_id = auth.uid() OR public.is_workspace_admin(workspace_id, auth.uid()));

-- ---------------------------------------------------------------------------
-- Create: caller supplies name+scopes+ttl+workspace, we generate the raw token
-- server-side, store its hash, and RETURN the plaintext once.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_api_token(
  _workspace_id uuid,
  _name text,
  _scopes text[] DEFAULT ARRAY['read'],
  _expires_at timestamptz DEFAULT NULL
) RETURNS TABLE (id uuid, token text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _raw text;
  _hash text;
  _prefix text;
  _new_id uuid;
BEGIN
  IF NOT public.is_workspace_member(_workspace_id, auth.uid()) THEN
    RAISE EXCEPTION 'not a workspace member';
  END IF;
  IF coalesce(length(trim(_name)), 0) = 0 THEN
    RAISE EXCEPTION 'name required';
  END IF;

  -- 16 random bytes → 32 hex chars, prefixed for lexical recognition.
  _raw    := 'whu_' || encode(gen_random_bytes(16), 'hex');
  _hash   := encode(digest(_raw, 'sha256'), 'hex');
  _prefix := substring(_raw from 1 for 12);   -- 'whu_' + 8 hex

  INSERT INTO public.api_tokens
    (workspace_id, user_id, name, token_prefix, token_hash, scopes, expires_at)
  VALUES
    (_workspace_id, auth.uid(), trim(_name), _prefix, _hash, coalesce(_scopes, ARRAY['read']), _expires_at)
  RETURNING api_tokens.id INTO _new_id;

  RETURN QUERY SELECT _new_id, _raw;
END;
$$;

-- ---------------------------------------------------------------------------
-- Revoke: sets revoked_at; keeps the row for audit.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.revoke_api_token(_token_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _updated integer;
BEGIN
  UPDATE public.api_tokens
     SET revoked_at = coalesce(revoked_at, now())
   WHERE id = _token_id
     AND (user_id = auth.uid() OR public.is_workspace_admin(workspace_id, auth.uid()));
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated > 0;
END;
$$;

-- ---------------------------------------------------------------------------
-- Verify: used by a future Edge Function to translate a raw token into a
-- (user_id, workspace_id, scopes) tuple. Also stamps last_used_at.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_api_token(_raw text)
RETURNS TABLE (user_id uuid, workspace_id uuid, scopes text[])
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _hash text;
  _rec  public.api_tokens%ROWTYPE;
BEGIN
  IF _raw IS NULL OR length(_raw) < 12 THEN RETURN; END IF;
  _hash := encode(digest(_raw, 'sha256'), 'hex');
  SELECT * INTO _rec FROM public.api_tokens WHERE token_hash = _hash;
  IF NOT FOUND OR _rec.revoked_at IS NOT NULL OR (_rec.expires_at IS NOT NULL AND _rec.expires_at < now()) THEN
    RETURN;
  END IF;
  UPDATE public.api_tokens SET last_used_at = now() WHERE id = _rec.id;
  RETURN QUERY SELECT _rec.user_id, _rec.workspace_id, _rec.scopes;
END;
$$;
