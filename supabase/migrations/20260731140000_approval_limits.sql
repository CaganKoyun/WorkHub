-- F3 — Onay limitleri (approval routing) DB zorlaması.
-- workspace_members.approval_limit şemada vardı ama hiçbir akış okumuyordu.
-- Kural:
--   * owner/admin her onayı karara bağlayabilir
--   * 'contract' | 'hiring' | 'risk_acceptance' her zaman owner/admin ister
--   * tutarlı onaylarda üye, yalnızca amount <= approval_limit ise karar verir
--     (limit NULL = üyeye tutarlı onay yetkisi verilmemiş)
--   * tutarsız (amount IS NULL) genel onayları her üye karara bağlayabilir
-- UI aynı kuralı canDecideApproval (src/lib/approval-utils.ts) ile yansıtır;
-- gerçek zorlama buradadır.

CREATE OR REPLACE FUNCTION public.approvals_enforce_limits()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _role public.workspace_role;
  _limit numeric;
BEGIN
  -- Yalnızca karar anında (pending/snoozed/... → approved|rejected) denetle
  IF NEW.status NOT IN ('approved','rejected') OR OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- service_role (edge fn / bakım) muaf
  IF _uid IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role, approval_limit INTO _role, _limit
  FROM public.workspace_members
  WHERE workspace_id = NEW.workspace_id AND user_id = _uid AND is_active;

  IF _role IN ('owner','admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.kind IN ('contract','hiring','risk_acceptance') THEN
    RAISE EXCEPTION 'Bu onay tipi (%) yalnızca owner/admin tarafından karara bağlanabilir', NEW.kind
      USING ERRCODE = 'P0001';
  END IF;

  IF NEW.amount IS NOT NULL THEN
    IF _limit IS NULL THEN
      RAISE EXCEPTION 'Tutarlı onaylar için onay limitin tanımlı değil — workspace yöneticisine başvur'
        USING ERRCODE = 'P0001';
    END IF;
    IF NEW.amount > _limit THEN
      RAISE EXCEPTION 'Onay tutarı (%) limitinin (%) üstünde — owner/admin onayı gerekli', NEW.amount, _limit
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS approvals_enforce_limits ON public.approvals;
CREATE TRIGGER approvals_enforce_limits
  BEFORE UPDATE ON public.approvals
  FOR EACH ROW EXECUTE FUNCTION public.approvals_enforce_limits();
