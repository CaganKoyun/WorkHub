-- F6 — Sinyal → Inbox kural motoru (sabit 5 kural, automation builder DEĞİL).
-- Kurallar workspace başına aç/kapa + tek parametre; değerlendirme signal-scan
-- edge fonksiyonunda (service_role, günlük cron). Aynı nesne için aynı kural
-- ikinci kez approval üretmez (signal_events dedup).

-- NOTE: this migration is idempotent. An earlier migration (20260731074317)
-- created the signal_rules and signal_events tables + policies with the same
-- shape; a clean-DB replay (Supabase Preview) needs IF NOT EXISTS / DROP IF
-- EXISTS to succeed.
CREATE TABLE IF NOT EXISTS public.signal_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL DEFAULT public.current_workspace_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  rule_key text NOT NULL CHECK (rule_key IN (
    'overdue_receivable','budget_overrun','stale_opportunity',
    'critical_bug_open','contract_expiring'
  )),
  enabled boolean NOT NULL DEFAULT false,
  -- tek serbestlik: eşik parametresi (gün/saat/yüzde — kurala göre)
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, rule_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.signal_rules TO authenticated;
GRANT ALL ON public.signal_rules TO service_role;
ALTER TABLE public.signal_rules ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS signal_rules_touch ON public.signal_rules;
CREATE TRIGGER signal_rules_touch
  BEFORE UPDATE ON public.signal_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "signal_rules member read" ON public.signal_rules;
CREATE POLICY "signal_rules member read"
  ON public.signal_rules FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
DROP POLICY IF EXISTS "signal_rules admin insert" ON public.signal_rules;
CREATE POLICY "signal_rules admin insert"
  ON public.signal_rules FOR INSERT TO authenticated
  WITH CHECK (public.workspace_role(workspace_id, auth.uid()) IN ('owner','admin'));
DROP POLICY IF EXISTS "signal_rules admin update" ON public.signal_rules;
CREATE POLICY "signal_rules admin update"
  ON public.signal_rules FOR UPDATE TO authenticated
  USING (public.workspace_role(workspace_id, auth.uid()) IN ('owner','admin'));
DROP POLICY IF EXISTS "signal_rules admin delete" ON public.signal_rules;
CREATE POLICY "signal_rules admin delete"
  ON public.signal_rules FOR DELETE TO authenticated
  USING (public.workspace_role(workspace_id, auth.uid()) IN ('owner','admin'));

-- Dedup: hangi nesne için hangi kural approval üretti
CREATE TABLE IF NOT EXISTS public.signal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  rule_key text NOT NULL,
  object_id uuid NOT NULL,
  approval_id uuid REFERENCES public.approvals(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, rule_key, object_id)
);

GRANT SELECT ON public.signal_events TO authenticated;
GRANT ALL ON public.signal_events TO service_role;
ALTER TABLE public.signal_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "signal_events member read" ON public.signal_events;
CREATE POLICY "signal_events member read"
  ON public.signal_events FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
-- INSERT/UPDATE/DELETE: yalnızca service_role (policy yok, grant yok).
