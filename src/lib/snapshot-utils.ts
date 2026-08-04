// Donmuş karar anı (state_snapshot) gösterim katmanı — saf, testli.
// Şema build_company_snapshot() DB fonksiyonunun ürettiği JSON'dur;
// buradaki alan listesi o fonksiyonla birlikte evrilmeli.

export interface SnapshotField {
  key: string;
  label: string;
  format: "count" | "currency";
  /** true → sayı yüksekken kötü sinyal (kırmızı ton) */
  highIsBad?: boolean;
}

export const SNAPSHOT_FIELDS: SnapshotField[] = [
  { key: "cash_position", label: "Nakit Pozisyonu", format: "currency" },
  { key: "pipeline_amount", label: "Pipeline Tutarı", format: "currency" },
  { key: "open_opportunities", label: "Açık Fırsat", format: "count" },
  { key: "active_projects", label: "Aktif Proje", format: "count" },
  { key: "open_tasks", label: "Açık İş", format: "count" },
  { key: "overdue_tasks", label: "Geciken İş", format: "count", highIsBad: true },
  { key: "critical_bugs", label: "Kritik Bug", format: "count", highIsBad: true },
  { key: "open_risks", label: "Açık Risk", format: "count", highIsBad: true },
  { key: "critical_risks", label: "Kritik Risk", format: "count", highIsBad: true },
  { key: "pending_approvals", label: "Bekleyen Onay", format: "count" },
];

export interface SnapshotEntry extends SnapshotField {
  value: number;
}

/**
 * Ham snapshot JSON'unu gösterilebilir satırlara çevirir. Bilinmeyen/eksik
 * alanlar atlanır (eski kararların snapshot'ı daha az alan içerebilir);
 * sayı olmayan değerler gösterilmez — asla uydurma değer üretilmez.
 */
export function snapshotEntries(snapshot: unknown): SnapshotEntry[] {
  if (!snapshot || typeof snapshot !== "object") return [];
  const raw = snapshot as Record<string, unknown>;
  const out: SnapshotEntry[] = [];
  for (const f of SNAPSHOT_FIELDS) {
    const v = raw[f.key];
    if (typeof v === "number" && Number.isFinite(v)) out.push({ ...f, value: v });
  }
  return out;
}

/** Snapshot'ın çekildiği an (yoksa null). */
export function snapshotCapturedAt(snapshot: unknown): string | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const v = (snapshot as Record<string, unknown>)["captured_at"];
  return typeof v === "string" ? v : null;
}
