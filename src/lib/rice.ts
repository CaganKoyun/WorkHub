/**
 * Pure RICE / ICE feature-prioritization math.
 * Referans: docs/TEST_COVERAGE_DETAILED.md · PRD-02 (RICE formula).
 *
 * RICE = (Reach × Impact × Confidence) / Effort
 *   Reach:      etkilenen kişi/işlem sayısı — pozitif sayı
 *   Impact:     tekil etki katsayısı (Intercom: 3=Massive, 2=High, 1=Medium,
 *               0.5=Low, 0.25=Minimal). Sınırsız ama <= 3 tavsiye.
 *   Confidence: 0..1 (yüzdeyle de kabul: 0..100 → 0..1'e clamp).
 *   Effort:     kişi-ay veya adam-gün; 0 verilirse null döner (sonsuz skor
 *               anlamsız — UI '—' göstermeli).
 *
 * ICE (basitleştirilmiş): Impact × Confidence × Ease.
 *   Ease:       1..10 (kolaylık). 0 verilirse 0 döner (tersini istemez).
 */

export interface RiceInput {
  reach: number;
  impact: number;
  confidence: number;
  effort: number;
}

export interface IceInput {
  impact: number;
  confidence: number;
  ease: number;
}

/** 0..100 aralığındaki bir güven değerini 0..1 aralığına indirger. */
export function normalizeConfidence(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  if (raw <= 1) return Math.min(raw, 1);
  // Yüzdelik varsayımı
  return Math.min(raw / 100, 1);
}

/**
 * RICE skoru. `null` = anlamsız / hesaplanamaz (effort 0, negatif reach/impact,
 * NaN girişler). UI bunu '—' olarak göstermeli.
 */
export function riceScore(input: RiceInput): number | null {
  const { reach, impact } = input;
  const effort = input.effort;
  const confidence = normalizeConfidence(input.confidence);

  if (![reach, impact, effort].every((v) => Number.isFinite(v))) return null;
  if (reach < 0 || impact < 0) return null;
  if (effort <= 0) return null;

  const raw = (reach * impact * confidence) / effort;
  // İki ondalık — Intercom kalıbı
  return Math.round(raw * 100) / 100;
}

/** ICE skoru. Ease 0 → 0 (kolayca hesaplanabilir, sıralamada en alta düşer). */
export function iceScore(input: IceInput): number {
  const impact = Number.isFinite(input.impact) ? Math.max(0, input.impact) : 0;
  const ease = Number.isFinite(input.ease) ? Math.max(0, input.ease) : 0;
  const confidence = normalizeConfidence(input.confidence);
  const raw = impact * confidence * ease;
  return Math.round(raw * 100) / 100;
}

/**
 * Feature listesini RICE skoruna göre azalan sıralar.
 * `score === null` olanlar sona atılır (hesaplanamaz, tie-breaker id/isim).
 */
export function sortByRice<T extends { rice?: number | null; id?: string; name?: string }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    const sa = a.rice ?? null;
    const sb = b.rice ?? null;
    if (sa === null && sb === null) return (a.id ?? a.name ?? '').localeCompare(b.id ?? b.name ?? '');
    if (sa === null) return 1;
    if (sb === null) return -1;
    return sb - sa;
  });
}
