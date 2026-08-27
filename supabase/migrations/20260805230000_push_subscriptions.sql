-- Web Push subscriptions per user. Bir kullanıcı birden çok cihaza kayıt
-- olabilir (masaüstü + telefon). Endpoint browser tarafından üretilir ve
-- gerçek adrestir; bu yüzden UNIQUE + owner-only insert/delete.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    text        NOT NULL UNIQUE,
  p256dh      text        NOT NULL,        -- Base64Url public key
  auth        text        NOT NULL,        -- Base64Url auth secret
  user_agent  text,
  last_used_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_subs readable by owner"   ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subs insertable by owner" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subs deletable by owner"  ON public.push_subscriptions;

CREATE POLICY "push_subs readable by owner"
  ON public.push_subscriptions FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "push_subs insertable by owner"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "push_subs deletable by owner"
  ON public.push_subscriptions FOR DELETE
  USING (user_id = auth.uid());

-- Push kuyruk (v2): trigger'lar veya application kodu buraya insert eder,
-- Edge Function 'send-push' worker'ı bunu okur/gönderir. Şimdilik yalnızca
-- şema; sender v2'de aktif olacak.
CREATE TABLE IF NOT EXISTS public.push_queue (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         text        NOT NULL,
  body          text,
  url           text,
  data          jsonb       NOT NULL DEFAULT '{}'::jsonb,
  status        text        NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'sent', 'failed', 'expired')),
  attempts      integer     NOT NULL DEFAULT 0,
  last_error    text,
  scheduled_at  timestamptz NOT NULL DEFAULT now(),
  sent_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_push_queue_pending
  ON public.push_queue(scheduled_at)
  WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_push_queue_user_time
  ON public.push_queue(user_id, created_at DESC);

ALTER TABLE public.push_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_queue readable by owner" ON public.push_queue;
-- Insert/update yalnızca service-role veya SECURITY DEFINER RPC üzerinden;
-- son kullanıcı doğrudan yazamaz.

CREATE POLICY "push_queue readable by owner"
  ON public.push_queue FOR SELECT
  USING (user_id = auth.uid());

-- SECURITY DEFINER RPC — application kodu / gelecekteki notification
-- trigger'ları push queue'ya buradan insert eder. Sadece workspace üyesi
-- başka bir workspace üyesine push atabilir.
CREATE OR REPLACE FUNCTION public.enqueue_push(
  _user_id uuid,
  _title text,
  _body text DEFAULT NULL,
  _url text DEFAULT NULL,
  _data jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF _user_id IS NULL OR coalesce(length(trim(_title)), 0) = 0 THEN
    RAISE EXCEPTION 'user_id and title required';
  END IF;
  -- Aynı workspace'te olma kontrolü — self-push da kabul edilir.
  IF _user_id <> auth.uid()
     AND NOT EXISTS (
       SELECT 1 FROM public.workspace_members wm1
       JOIN public.workspace_members wm2
         ON wm2.workspace_id = wm1.workspace_id
       WHERE wm1.user_id = auth.uid() AND wm2.user_id = _user_id
         AND wm1.is_active AND wm2.is_active
     ) THEN
    RAISE EXCEPTION 'target user not in a shared workspace';
  END IF;

  INSERT INTO public.push_queue (user_id, title, body, url, data)
  VALUES (_user_id, trim(_title), _body, _url, coalesce(_data, '{}'::jsonb))
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;
