// Sayı künyesi (PRD Görev 3) — pulse metriklerinde kaynak + tazelik etiketi.

/** Sorgu zamanını insan-okur tazelik etiketine çevirir. */
export function freshnessLabel(updatedAtMs: number, nowMs: number): string {
  const diffSec = Math.max(0, Math.floor((nowMs - updatedAtMs) / 1000));
  if (diffSec < 60) return "şimdi";
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa önce`;
  return new Date(updatedAtMs).toLocaleDateString("tr-TR");
}

/**
 * Nakit kartının gösterim durumu. PRD: veri yoksa asla "0" ile yanıltma;
 * yetki yoksa sayı sızdırmadan "yetki gerekli".
 */
export type CashCardState =
  | { kind: "no_access" }
  | { kind: "no_data" }
  | { kind: "value"; amount: number };

export function cashCardState(args: {
  allowed: boolean;
  accountsCount: number | undefined;
  cashBase: number | undefined;
}): CashCardState {
  if (!args.allowed) return { kind: "no_access" };
  if (!args.accountsCount || args.accountsCount === 0) return { kind: "no_data" };
  return { kind: "value", amount: args.cashBase ?? 0 };
}
