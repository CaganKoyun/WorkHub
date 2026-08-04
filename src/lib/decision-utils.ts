import { z } from "zod";

// ---------------------------------------------------------------------------
// Decision object — pure logic layer. No React, no Supabase: fully testable.
// ---------------------------------------------------------------------------

export type DecisionVerdict = "held" | "changed" | "wrong";
export type DecisionReversibility = "one_way" | "two_way";

export const REVIEW_INTERVAL_DAYS = 90;

export const VERDICT_LABELS: Record<DecisionVerdict, string> = {
  held: "Doğruydu",
  changed: "Değişti",
  wrong: "Yanlıştı",
};

export const REVERSIBILITY_LABELS: Record<DecisionReversibility, string> = {
  one_way: "Tek yönlü kapı",
  two_way: "İki yönlü kapı",
};

export const decisionFormSchema = z.object({
  title: z.string().trim().min(3, "Başlık en az 3 karakter olmalı").max(200),
  context: z.string().trim().max(4000).optional().or(z.literal("")),
  decision: z.string().trim().max(4000).optional().or(z.literal("")),
  rationale: z.string().trim().max(4000).optional().or(z.literal("")),
  status: z.enum(["proposed", "decided", "revisit", "revoked"]),
  expected_outcome: z
    .string()
    .trim()
    .max(500, "Beklenti tek cümle olmalı — 500 karakteri geçme")
    .optional()
    .or(z.literal("")),
  confidence: z.number().int().min(0).max(100).nullable().optional(),
  reversibility: z.enum(["one_way", "two_way"]).nullable().optional(),
});

export type DecisionFormValues = z.infer<typeof decisionFormSchema>;

/** A decided decision must carry a wager: statüsü "decided" ise beklenti zorunlu. */
export function validateWager(values: DecisionFormValues): string | null {
  if (values.status !== "decided") return null;
  if (!values.expected_outcome || values.expected_outcome.trim().length === 0) {
    return "Karar verildiyse 90 gün sonrası için bir beklenti yaz — kalibrasyon buradan doğar.";
  }
  if (values.confidence === null || values.confidence === undefined) {
    return "Beklentine ne kadar güvendiğini işaretle (0–100).";
  }
  return null;
}

export function computeReviewAt(
  decidedAt: Date,
  intervalDays: number = REVIEW_INTERVAL_DAYS,
): Date {
  const d = new Date(decidedAt.getTime());
  d.setDate(d.getDate() + intervalDays);
  return d;
}

export interface ReviewableDecision {
  status: string;
  review_at: string | null;
  verdict: string | null;
}

/** Yeniden açılış kuyruğu: karar verilmiş, vadesi gelmiş, henüz hüküm girilmemiş. */
export function isDueForReview(
  d: ReviewableDecision,
  now: Date = new Date(),
): boolean {
  if (d.status !== "decided") return false;
  if (d.verdict) return false;
  if (!d.review_at) return false;
  return new Date(d.review_at).getTime() <= now.getTime();
}

export interface CalibrationInput {
  confidence: number; // 0–100 at decision time
  verdict: DecisionVerdict;
}

/**
 * v1 calibration: mean absolute gap between stated confidence and outcome
 * (held = 100, changed = 50, wrong = 0). Lower is better; null until 3 closed
 * decisions exist — a single data point is noise, not calibration.
 */
export function calibrationGap(closed: CalibrationInput[]): number | null {
  if (closed.length < 3) return null;
  const outcomeScore: Record<DecisionVerdict, number> = {
    held: 100,
    changed: 50,
    wrong: 0,
  };
  const total = closed.reduce(
    (sum, c) => sum + Math.abs(c.confidence - outcomeScore[c.verdict]),
    0,
  );
  return Math.round(total / closed.length);
}

/**
 * Signed bias: mean(confidence − outcome). Positive → overconfident
 * (iyimser), negative → underconfident (kötümser). Null below 3 closed.
 */
export function calibrationBias(closed: CalibrationInput[]): number | null {
  if (closed.length < 3) return null;
  const outcomeScore: Record<DecisionVerdict, number> = {
    held: 100,
    changed: 50,
    wrong: 0,
  };
  const total = closed.reduce(
    (sum, c) => sum + (c.confidence - outcomeScore[c.verdict]),
    0,
  );
  return Math.round(total / closed.length);
}

export interface CalibrationVerdict {
  /** PRD Görev 4 eşikleri: 0–20 iyi, 21–40 orta, 40+ aşırı */
  tier: "good" | "medium" | "extreme";
  label: string;
  comment: string;
}

/** Sapmayı Türkçe karne etiketine çevirir (PRD Görev 4). */
export function calibrationVerdict(gap: number, bias: number): CalibrationVerdict {
  if (gap <= 20) {
    return {
      tier: "good",
      label: "iyi kalibre",
      comment: "Güven tahminlerin sonuçlarla örtüşüyor — böyle devam.",
    };
  }
  if (gap <= 40) {
    return {
      tier: "medium",
      label: "orta",
      comment:
        bias >= 0
          ? "Tahminlerin biraz iyimser — güven yüzdesini bir tık düşürmeyi dene."
          : "Tahminlerin biraz temkinli — kendine biraz daha güvenebilirsin.",
    };
  }
  return {
    tier: "extreme",
    label: bias >= 0 ? "aşırı iyimser" : "aşırı kötümser",
    comment:
      bias >= 0
        ? "Güven yüzdelerin sonuçların belirgin üstünde — bahisleri küçült, varsayımları yaz."
        : "Sonuçların güveninden belirgin iyi — daha cesur bahisler koyabilirsin.",
  };
}
