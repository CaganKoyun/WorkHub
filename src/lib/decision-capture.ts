// ---------------------------------------------------------------------------
// Otomatik Karar Yakalama — Sessiz Karar Radarı (pure logic, no React/Supabase)
// Şirket içinde fiilen karar olan ama karar olarak kaydedilmeyen olayları bulur.
// ---------------------------------------------------------------------------

export type CaptureSource = "approval" | "opportunity" | "risk" | "goal";

export interface CaptureCandidate {
  key: string;                       // idempotent anahtar: `${source}:${id}`
  source: CaptureSource;
  sourceId: string;
  title: string;
  reason: string;                    // neden bu bir karar?
  suggestedDecision: string;         // karar taslağı cümlesi
  amount: number | null;
  currency: string | null;
  ageDays: number;
  severity: "high" | "medium" | "low";
  sourceApprovalId: string | null;
}

export interface ApprovalSignal {
  id: string;
  title: string;
  kind: string;
  amount: number | null;
  currency: string | null;
  status: string;
  priority: string;
  created_at: string;
  decided_at: string | null;
}

export interface OpportunitySignal {
  id: string;
  name: string;
  amount: number | null;
  currency: string | null;
  status: string | null;
  stage_entered_at: string | null;
  expected_close_date: string | null;
}

export interface RiskSignal {
  id: string;
  title: string;
  severity: string | null;
  status: string | null;
  created_at: string;
}

export interface GoalSignal {
  id: string;
  title: string;
  status: string | null;
  progress: number | null;
  due_date: string | null;
}

export const CAPTURE_SOURCE_LABELS: Record<CaptureSource, string> = {
  approval: "Onay",
  opportunity: "Fırsat",
  risk: "Risk",
  goal: "Hedef",
};

export const daysBetween = (iso: string | null, now: Date): number => {
  if (!iso) return 0;
  return Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000));
};

/** Onaylanmış, parasal ağırlığı olan ama karar kaydı olmayan onaylar. */
export function approvalCandidates(
  approvals: ApprovalSignal[],
  capturedApprovalIds: Set<string>,
  now: Date,
  minAmount = 0,
): CaptureCandidate[] {
  return approvals
    .filter((a) => a.status === "approved" || a.status === "rejected")
    .filter((a) => !capturedApprovalIds.has(a.id))
    .filter((a) => (a.amount ?? 0) >= minAmount || a.priority === "urgent" || a.priority === "high")
    .map((a) => {
      const ageDays = daysBetween(a.decided_at ?? a.created_at, now);
      const verdict = a.status === "approved" ? "onaylandı" : "reddedildi";
      return {
        key: `approval:${a.id}`,
        source: "approval" as const,
        sourceId: a.id,
        title: a.title,
        reason: `Bu onay ${verdict} ama arkasındaki gerekçe hiçbir yere yazılmadı — sessiz karar.`,
        suggestedDecision: `${a.title} talebi ${verdict}.`,
        amount: a.amount,
        currency: a.currency,
        ageDays,
        severity: (a.amount ?? 0) > 0 || a.priority === "urgent" ? "high" : "medium",
        sourceApprovalId: a.id,
      };
    });
}

/** Aşamada çakılı kalmış fırsatlar — karar verilmediği için karar olan durumlar. */
export function opportunityCandidates(
  opportunities: OpportunitySignal[],
  now: Date,
  stuckDays = 21,
): CaptureCandidate[] {
  return opportunities
    .filter((o) => (o.status ?? "open") === "open")
    .map((o) => ({ o, ageDays: daysBetween(o.stage_entered_at, now) }))
    .filter(({ o, ageDays }) => ageDays >= stuckDays || (o.expected_close_date != null && new Date(o.expected_close_date) < now))
    .map(({ o, ageDays }) => ({
      key: `opportunity:${o.id}`,
      source: "opportunity" as const,
      sourceId: o.id,
      title: o.name,
      reason: `Fırsat ${ageDays} gündür aynı aşamada — ertelemek de bir karar, ama kayıtsız.`,
      suggestedDecision: `${o.name} fırsatında ilerle ya da kapat.`,
      amount: o.amount,
      currency: o.currency,
      ageDays,
      severity: ageDays >= stuckDays * 2 ? "high" : "medium",
      sourceApprovalId: null,
    }));
}

/** Kabul edilmiş/açık yüksek riskler — risk kabulü fiilen bir karardır. */
export function riskCandidates(risks: RiskSignal[], now: Date): CaptureCandidate[] {
  return risks
    .filter((r) => (r.severity === "high" || r.severity === "critical") && r.status !== "closed" && r.status !== "mitigated")
    .map((r) => {
      const ageDays = daysBetween(r.created_at, now);
      return {
        key: `risk:${r.id}`,
        source: "risk" as const,
        sourceId: r.id,
        title: r.title,
        reason: `${ageDays} gündür açık yüksek risk — kabul mü ediyorsun, azaltıyor musun? Bu bir karar.`,
        suggestedDecision: `${r.title} riskini kabul et ya da azaltma planı başlat.`,
        amount: null,
        currency: null,
        ageDays,
        severity: ageDays >= 30 ? "high" : "medium",
        sourceApprovalId: null,
      };
    });
}

/** Gecikmiş / durmuş hedefler — hedefi değiştirmemek de karardır. */
export function goalCandidates(goals: GoalSignal[], now: Date): CaptureCandidate[] {
  return goals
    .filter((g) => g.status !== "achieved" && g.status !== "cancelled")
    .filter((g) => g.due_date != null && new Date(g.due_date) < now && (g.progress ?? 0) < 100)
    .map((g) => ({
      key: `goal:${g.id}`,
      source: "goal" as const,
      sourceId: g.id,
      title: g.title,
      reason: `Hedefin tarihi geçti, ilerleme %${Math.round(g.progress ?? 0)} — hedefi taşımak da bir karar.`,
      suggestedDecision: `${g.title} hedefini yeniden tarihle ya da kapat.`,
      amount: null,
      currency: null,
      ageDays: daysBetween(g.due_date, now),
      severity: "medium" as const,
      sourceApprovalId: null,
    }));
}

const SEVERITY_RANK = { high: 0, medium: 1, low: 2 } as const;

export function rankCandidates(candidates: CaptureCandidate[]): CaptureCandidate[] {
  return [...candidates].sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      (b.amount ?? 0) - (a.amount ?? 0) ||
      b.ageDays - a.ageDays,
  );
}

export interface CaptureInputs {
  approvals: ApprovalSignal[];
  opportunities: OpportunitySignal[];
  risks: RiskSignal[];
  goals: GoalSignal[];
  capturedApprovalIds: Set<string>;
  dismissedKeys?: Set<string>;
}

/** Tüm sinyalleri tek radar listesine indirger. */
export function detectSilentDecisions(input: CaptureInputs, now: Date = new Date()): CaptureCandidate[] {
  const all = [
    ...approvalCandidates(input.approvals, input.capturedApprovalIds, now),
    ...opportunityCandidates(input.opportunities, now),
    ...riskCandidates(input.risks, now),
    ...goalCandidates(input.goals, now),
  ];
  const dismissed = input.dismissedKeys ?? new Set<string>();
  return rankCandidates(all.filter((c) => !dismissed.has(c.key)));
}
