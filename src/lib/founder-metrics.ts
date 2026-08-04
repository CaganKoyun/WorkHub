// Founder-facing pure metrics. No React, no Supabase — fully testable.

export interface WaitItem {
  created_at: string;
  decided_at: string | null;
  status: string;
}

const DAY = 1000 * 60 * 60 * 24;

/** Bir onayın kurucuyu beklettiği gün sayısı (karar verilmediyse bugüne kadar). */
export function waitDays(item: WaitItem, now: Date = new Date()): number {
  const start = new Date(item.created_at).getTime();
  const end = item.decided_at ? new Date(item.decided_at).getTime() : now.getTime();
  return Math.max(0, (end - start) / DAY);
}

export interface WaitSummary {
  /** Bu ay şirketin kurucuyu beklediği toplam gün */
  currentDays: number;
  /** Geçen ayın aynı ölçüsü */
  previousDays: number;
  /** Yüzde değişim (negatif = iyileşme). Önceki ay 0 ise null. */
  changePct: number | null;
  /** Şu an bekleyen onay sayısı */
  openCount: number;
  /** En uzun bekleyen açık onayın gün sayısı */
  longestOpenDays: number;
}

function monthKey(d: Date) {
  return d.getUTCFullYear() * 12 + d.getUTCMonth();
}

/**
 * "Benim Yüzümden" sayacı (§2.2): şirketin kurucuyu beklediği toplam gün.
 * Bekleme, onayın oluşturulduğu ayda sayılır — kapanmış ya da hâlâ açık farketmez.
 */
export function summarizeWait(items: WaitItem[], now: Date = new Date()): WaitSummary {
  const thisMonth = monthKey(now);
  let currentDays = 0;
  let previousDays = 0;
  let openCount = 0;
  let longestOpenDays = 0;

  for (const item of items) {
    const bucket = monthKey(new Date(item.created_at));
    const days = waitDays(item, now);
    if (bucket === thisMonth) currentDays += days;
    else if (bucket === thisMonth - 1) previousDays += days;

    if (item.status === "pending") {
      openCount += 1;
      longestOpenDays = Math.max(longestOpenDays, days);
    }
  }

  const changePct =
    previousDays > 0 ? Math.round(((currentDays - previousDays) / previousDays) * 100) : null;

  return {
    currentDays: Math.round(currentDays),
    previousDays: Math.round(previousDays),
    changePct,
    openCount,
    longestOpenDays: Math.round(longestOpenDays),
  };
}

export interface SnapshotDelta {
  key: string;
  label: string;
  then: number;
  now: number;
  /** Artışın iyi mi kötü mü olduğu — renklendirme için */
  higherIsBetter: boolean;
}

export const SNAPSHOT_FIELDS: { key: string; label: string; higherIsBetter: boolean }[] = [
  { key: "cash_position", label: "Nakit", higherIsBetter: true },
  { key: "active_projects", label: "Aktif proje", higherIsBetter: true },
  { key: "open_tasks", label: "Açık iş", higherIsBetter: false },
  { key: "overdue_tasks", label: "Gecikmiş iş", higherIsBetter: false },
  { key: "critical_bugs", label: "Kritik bug", higherIsBetter: false },
  { key: "pending_approvals", label: "Bekleyen onay", higherIsBetter: false },
  { key: "open_risks", label: "Açık risk", higherIsBetter: false },
  { key: "critical_risks", label: "Kritik risk", higherIsBetter: false },
  { key: "open_opportunities", label: "Açık fırsat", higherIsBetter: true },
  { key: "pipeline_amount", label: "Pipeline", higherIsBetter: true },
];

/** Karar günündeki dünya ile bugünü yan yana koyar (§1.2 Decision Replay). */
export function buildSnapshotDeltas(
  then: Record<string, unknown> | null,
  now: Record<string, number> | null,
): SnapshotDelta[] {
  if (!then) return [];
  return SNAPSHOT_FIELDS.map((f) => ({
    ...f,
    then: Number(then[f.key] ?? 0),
    now: Number(now?.[f.key] ?? 0),
  }));
}
