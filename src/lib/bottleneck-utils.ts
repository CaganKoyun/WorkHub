// Founder Bottleneck Radar'ın saf mantık katmanı (PRD Görev 1).
// decision-utils deseni: UI'sız, yan etkisiz, birim testli.

export interface BottleneckSummary<T> {
  count: number;
  /** Tüm bekleyenlerin yaşlarının toplamı (gün) */
  totalDays: number;
  /** En uzun süredir bekleyen kayıt ve yaşı */
  oldest: { item: T; days: number };
}

const DAY_MS = 1000 * 60 * 60 * 24;

/** Kaydın yaşı, tam gün olarak. Gelecek tarihli created_at 0'a sabitlenir. */
export function ageInDays(createdAt: string, now: number | Date): number {
  const nowMs = typeof now === "number" ? now : now.getTime();
  return Math.max(0, Math.floor((nowMs - new Date(createdAt).getTime()) / DAY_MS));
}

/**
 * Bekleyen kayıtlardan darboğaz özeti üretir; boş listede null döner
 * (kart render edilmez). Eşit yaşta ilk gelen kazanır (stabil).
 */
export function computeBottleneck<T extends { created_at: string }>(
  rows: T[],
  now: number | Date,
): BottleneckSummary<T> | null {
  if (rows.length === 0) return null;
  const ages = rows.map((item) => ({ item, days: ageInDays(item.created_at, now) }));
  return {
    count: ages.length,
    totalDays: ages.reduce((sum, a) => sum + a.days, 0),
    oldest: ages.reduce((a, b) => (b.days > a.days ? b : a)),
  };
}

// ---------------------------------------------------------------------------
// "Benim Yüzümden" sayacı: bir zaman penceresinde şirketin kurucuyu beklediği
// toplam gün. Her onayın bekleme aralığı [created_at, decided_at ?? pencere
// sonu]; pencereyle kesişimleri (kesirli) toplanır, sonuç güne yuvarlanır.
// ---------------------------------------------------------------------------
export interface WaitInterval {
  created_at: string;
  decided_at: string | null;
}

export function founderWaitDays(
  rows: WaitInterval[],
  windowStart: number | Date,
  windowEnd: number | Date,
): number {
  const ws = typeof windowStart === "number" ? windowStart : windowStart.getTime();
  const we = typeof windowEnd === "number" ? windowEnd : windowEnd.getTime();
  if (we <= ws) return 0;
  let totalMs = 0;
  for (const r of rows) {
    const start = Math.max(new Date(r.created_at).getTime(), ws);
    const end = Math.min(r.decided_at ? new Date(r.decided_at).getTime() : we, we);
    if (end > start) totalMs += end - start;
  }
  return Math.round(totalMs / (24 * 60 * 60 * 1000));
}
