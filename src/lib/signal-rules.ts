// F6 — Sabit 5 sinyal kuralının tanımı. UI bu listeden çizilir; edge fn
// (signal-scan) aynı anahtar ve parametre semantiğini uygular.
// Bilinçli olarak genel bir "automation builder" DEĞİL (PRD §5 ruhu).

export type SignalRuleKey =
  | "overdue_receivable"
  | "budget_overrun"
  | "stale_opportunity"
  | "critical_bug_open"
  | "contract_expiring";

export interface SignalRuleDef {
  key: SignalRuleKey;
  label: string;
  description: string;
  /** parametrenin anlamı ve birimi */
  paramName: "days" | "hours" | "pct";
  paramLabel: string;
  defaultParam: number;
  min: number;
  max: number;
}

export const SIGNAL_RULES: SignalRuleDef[] = [
  {
    key: "overdue_receivable",
    label: "Geciken tahsilat",
    description: "Beklemede kalan gelir işlemi X günü aşarsa Inbox'a düşer.",
    paramName: "days", paramLabel: "gün", defaultParam: 14, min: 1, max: 180,
  },
  {
    key: "budget_overrun",
    label: "Bütçe aşımı",
    description: "Aktif bütçenin harcaması uyarı eşiğini (bütçedeki %) geçerse Inbox'a düşer.",
    paramName: "pct", paramLabel: "% (boşsa bütçedeki eşik)", defaultParam: 100, min: 50, max: 200,
  },
  {
    key: "stale_opportunity",
    label: "Dokunulmamış fırsat",
    description: "Açık fırsata X gündür temas yoksa Inbox'a düşer.",
    paramName: "days", paramLabel: "gün", defaultParam: 14, min: 1, max: 180,
  },
  {
    key: "critical_bug_open",
    label: "Açık kritik bug",
    description: "Kritik bug X saatten uzun açık kalırsa Inbox'a düşer.",
    paramName: "hours", paramLabel: "saat", defaultParam: 48, min: 1, max: 720,
  },
  {
    key: "contract_expiring",
    label: "Biten sözleşme",
    description: "Sözleşme bitişine X günden az kaldıysa Inbox'a düşer.",
    paramName: "days", paramLabel: "gün", defaultParam: 30, min: 1, max: 365,
  },
];

/** Params jsonb'sinden güvenli eşik okur: sınır dışı/bozuk değer → varsayılan. */
export function ruleThreshold(def: SignalRuleDef, params: unknown): number {
  if (params && typeof params === "object") {
    const v = (params as Record<string, unknown>)[def.paramName];
    if (typeof v === "number" && Number.isFinite(v) && v >= def.min && v <= def.max) {
      return v;
    }
  }
  return def.defaultParam;
}
