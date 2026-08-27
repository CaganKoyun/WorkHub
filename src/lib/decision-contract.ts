// ---------------------------------------------------------------------------
// Decision Contract — pure logic layer (no React, no Supabase).
// Karar sözleşmesi: yaşam döngüsü, varsayım defteri, karar borcu.
// ---------------------------------------------------------------------------

export type DecisionLifecycle =
  | "detected"
  | "framed"
  | "challenged"
  | "approved"
  | "committed"
  | "executing"
  | "checkpoint_due"
  | "outcome_recorded"
  | "learned"
  | "policy";

export const LIFECYCLE_ORDER: DecisionLifecycle[] = [
  "detected",
  "framed",
  "challenged",
  "approved",
  "committed",
  "executing",
  "checkpoint_due",
  "outcome_recorded",
  "learned",
  "policy",
];

export const LIFECYCLE_LABELS: Record<DecisionLifecycle, string> = {
  detected: "Tespit edildi",
  framed: "Çerçevelendi",
  challenged: "Sorgulandı",
  approved: "Onaylandı",
  committed: "Taahhüt edildi",
  executing: "Uygulanıyor",
  checkpoint_due: "Kontrol zamanı",
  outcome_recorded: "Sonuç kaydedildi",
  learned: "Ders çıkarıldı",
  policy: "Politikaya dönüştü",
};

export const LIFECYCLE_TONE: Record<DecisionLifecycle, string> = {
  detected: "bg-muted text-muted-foreground",
  framed: "bg-blue-500/15 text-blue-600",
  challenged: "bg-orange-500/15 text-orange-600",
  approved: "bg-emerald-500/15 text-success",
  committed: "bg-emerald-500/20 text-success",
  executing: "bg-sky-500/15 text-sky-600",
  checkpoint_due: "bg-amber-500/20 text-warning",
  outcome_recorded: "bg-cyan-500/15 text-cyan-600",
  learned: "bg-teal-500/15 text-teal-700",
  policy: "bg-primary/15 text-primary",
};

/** İleri gidilebilecek durumlar — state machine. */
export function nextStates(state: DecisionLifecycle): DecisionLifecycle[] {
  const map: Record<DecisionLifecycle, DecisionLifecycle[]> = {
    detected: ["framed"],
    framed: ["challenged", "approved"],
    challenged: ["approved", "framed"],
    approved: ["committed"],
    committed: ["executing"],
    executing: ["checkpoint_due"],
    checkpoint_due: ["outcome_recorded", "executing"],
    outcome_recorded: ["learned"],
    learned: ["policy"],
    policy: [],
  };
  return map[state] ?? [];
}

/* ----------------------------- ASSUMPTIONS ------------------------------ */

export type AssumptionStatus = "holding" | "at_risk" | "breached" | "unknown";

export const ASSUMPTION_LABELS: Record<AssumptionStatus, string> = {
  holding: "Geçerli",
  at_risk: "Riskli",
  breached: "Bozuldu",
  unknown: "Bilinmiyor",
};

export const ASSUMPTION_TONE: Record<AssumptionStatus, string> = {
  holding: "bg-emerald-500/15 text-success",
  at_risk: "bg-amber-500/20 text-warning",
  breached: "bg-destructive/15 text-destructive",
  unknown: "bg-muted text-muted-foreground",
};

export type AssumptionOperator = ">=" | ">" | "<=" | "<" | "==";

export const OPERATOR_LABELS: Record<AssumptionOperator, string> = {
  ">=": "en az",
  ">": "büyüktür",
  "<=": "en fazla",
  "<": "küçüktür",
  "==": "eşittir",
};

export interface AssumptionInput {
  operator: string;
  threshold: number | null;
  current_value: number | null;
}

/**
 * Varsayımın canlı değere göre durumu.
 * Eşiğe %10 yakınlıkta ise "riskli" olarak işaretlenir — erken uyarı.
 */
export function evaluateAssumption(a: AssumptionInput): AssumptionStatus {
  const { threshold, current_value } = a;
  if (threshold == null || current_value == null) return "unknown";
  const op = a.operator as AssumptionOperator;
  const passes =
    op === ">=" ? current_value >= threshold
    : op === ">" ? current_value > threshold
    : op === "<=" ? current_value <= threshold
    : op === "<" ? current_value < threshold
    : current_value === threshold;

  if (!passes) return "breached";
  if (threshold === 0) return "holding";
  const margin = Math.abs(current_value - threshold) / Math.abs(threshold);
  return margin <= 0.1 ? "at_risk" : "holding";
}

/* ----------------------------- DECISION DEBT ---------------------------- */

export interface DebtDecision {
  id: string;
  title: string;
  status: string;
  lifecycle_state: DecisionLifecycle;
  owner_id: string | null;
  decide_by: string | null;
  review_at: string | null;
  verdict: string | null;
  created_at: string;
  impact_amount: number | null;
  cost_of_delay_amount: number | null;
}

export interface DebtBreakdown {
  overdue: DebtDecision[];        // son karar tarihi geçmiş, hâlâ karara bağlanmamış
  ownerless: DebtDecision[];      // sahibi yok
  unexecuted: DebtDecision[];     // karar verilmiş ama işe bağlanmamış
  reviewOverdue: DebtDecision[];  // sonuç incelemesi gecikmiş
  breachedAssumptions: number;    // varsayımı bozulmuş açık karar sayısı
  blockedAmount: number;          // bekleyen kararların blokladığı tahmini tutar
  score: number;                  // 0-100, yüksek = kötü
}

const OPEN_STATES: DecisionLifecycle[] = [
  "detected", "framed", "challenged", "approved", "committed", "executing", "checkpoint_due",
];

export function computeDecisionDebt(
  decisions: DebtDecision[],
  linkedDecisionIds: Set<string>,
  breachedDecisionIds: Set<string>,
  now: Date = new Date(),
): DebtBreakdown {
  const open = decisions.filter((d) => OPEN_STATES.includes(d.lifecycle_state));

  const overdue = open.filter(
    (d) => d.decide_by != null && new Date(d.decide_by) < now && d.status !== "decided",
  );
  const ownerless = open.filter((d) => !d.owner_id);
  const unexecuted = decisions.filter(
    (d) => d.status === "decided" && !linkedDecisionIds.has(d.id),
  );
  const reviewOverdue = decisions.filter(
    (d) => !d.verdict && d.review_at != null && new Date(d.review_at) < now,
  );
  const breached = decisions.filter((d) => breachedDecisionIds.has(d.id));

  const blockedAmount = overdue.reduce(
    (sum, d) => sum + (d.cost_of_delay_amount ?? d.impact_amount ?? 0),
    0,
  );

  const denom = Math.max(decisions.length, 1);
  const raw =
    (overdue.length * 3 +
      ownerless.length * 2 +
      unexecuted.length * 2 +
      reviewOverdue.length * 2 +
      breached.length * 4) /
    (denom * 3);
  const score = Math.min(100, Math.round(raw * 100));

  return {
    overdue,
    ownerless,
    unexecuted,
    reviewOverdue,
    breachedAssumptions: breached.length,
    blockedAmount,
    score,
  };
}

export function debtBand(score: number): { label: string; tone: string } {
  if (score >= 60) return { label: "Yüksek", tone: "text-destructive" };
  if (score >= 30) return { label: "Orta", tone: "text-warning" };
  return { label: "Düşük", tone: "text-success" };
}

/** Weekly Closed Decision Loops — north star metriği. */
export interface LoopDecision {
  expected_outcome: string | null;
  review_at: string | null;
  verdict: string | null;
  reviewed_at: string | null;
  id: string;
}

export function closedLoops(
  decisions: LoopDecision[],
  linkedDecisionIds: Set<string>,
  since: Date,
): number {
  return decisions.filter(
    (d) =>
      d.verdict != null &&
      d.reviewed_at != null &&
      new Date(d.reviewed_at) >= since &&
      d.expected_outcome != null &&
      d.review_at != null &&
      linkedDecisionIds.has(d.id),
  ).length;
}
