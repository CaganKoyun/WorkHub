// Founder Inbox erteleme/devretme saf mantığı (PRD Görev 5).

export type SnoozeOption = "1d" | "3d" | "1w";

export const SNOOZE_LABELS: Record<SnoozeOption, string> = {
  "1d": "1 gün",
  "3d": "3 gün",
  "1w": "1 hafta",
};

const SNOOZE_MS: Record<SnoozeOption, number> = {
  "1d": 1 * 24 * 60 * 60 * 1000,
  "3d": 3 * 24 * 60 * 60 * 1000,
  "1w": 7 * 24 * 60 * 60 * 1000,
};

/** Seçenekten mutlak snooze bitiş zamanı (ISO) üretir. */
export function computeSnoozeUntil(option: SnoozeOption, now: number | Date): string {
  const nowMs = typeof now === "number" ? now : now.getTime();
  return new Date(nowMs + SNOOZE_MS[option]).toISOString();
}

/** Snooze süresi dolmuş mu? (dolmuşsa kayıt tekrar "Bekleyen"e düşer) */
export function isSnoozeExpired(snoozeUntil: string | null, now: number | Date): boolean {
  if (!snoozeUntil) return true;
  const nowMs = typeof now === "number" ? now : now.getTime();
  return new Date(snoozeUntil).getTime() <= nowMs;
}

// ---------------------------------------------------------------------------
// F3 — Onay limitleri. Gerçek zorlama DB trigger'ında
// (approvals_enforce_limits); bu helper aynı kuralı UI'da yansıtır ki
// kullanıcı butona basıp hata yemek yerine nedenini baştan görsün.
// ---------------------------------------------------------------------------
export const FOUNDER_ONLY_KINDS = ["contract", "hiring", "risk_acceptance"] as const;

export interface DecideCheck {
  allowed: boolean;
  reason?: string;
}

export function canDecideApproval(
  actor: { role: string | null; approvalLimit: number | null },
  approval: { kind: string; amount: number | null },
): DecideCheck {
  if (actor.role === "owner" || actor.role === "admin") return { allowed: true };
  if ((FOUNDER_ONLY_KINDS as readonly string[]).includes(approval.kind)) {
    return { allowed: false, reason: "Bu onay tipi yalnızca owner/admin tarafından karara bağlanır" };
  }
  if (approval.amount === null || approval.amount === undefined) return { allowed: true };
  if (actor.approvalLimit === null || actor.approvalLimit === undefined) {
    return { allowed: false, reason: "Tutarlı onaylar için onay limitin tanımlı değil" };
  }
  if (approval.amount > actor.approvalLimit) {
    return {
      allowed: false,
      reason: `Tutar, onay limitinin (${actor.approvalLimit.toLocaleString()}) üstünde — owner/admin gerekli`,
    };
  }
  return { allowed: true };
}
