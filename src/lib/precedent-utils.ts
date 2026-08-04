// F5 — Emsal getirme: "şirket kendi geçmişinden öğrenir" vaadinin v1'i.
// Embedding yok; başlık kelime örtüşmesi yeter (doküman F5'in kendi tarifi).

const STOPWORDS = new Set([
  "ve", "veya", "ile", "için", "bir", "bu", "şu", "o", "mi", "mı", "mu", "mü",
  "ne", "nasıl", "daha", "en", "çok", "az", "de", "da", "ki", "gibi", "kadar",
  "the", "a", "an", "to", "of", "for", "in", "on", "we", "should",
]);

/** Başlıktan arama anahtarları: stopword'süz, 3+ harfli, küçük harf, ilk 4. */
export function extractKeywords(title: string): string[] {
  return title
    .toLocaleLowerCase("tr-TR")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
    .slice(0, 4);
}

export interface PrecedentInput {
  verdict: "held" | "changed" | "wrong" | null;
}

export interface PrecedentSummary {
  total: number;
  closed: number;
  /** beklentinin altında kalanlar (changed + wrong) */
  below: number;
  sentence: string | null;
}

/** Benzer kararlardan tek cümlelik uyarı üretir; kapanmış karar yoksa null. */
export function summarizePrecedents(rows: PrecedentInput[]): PrecedentSummary {
  const closed = rows.filter((r) => r.verdict !== null);
  const below = closed.filter((r) => r.verdict === "changed" || r.verdict === "wrong").length;
  let sentence: string | null = null;
  if (closed.length > 0) {
    sentence =
      below === 0
        ? `Benzer ${closed.length} kapanmış kararın hepsi beklentiyi tuttu.`
        : `Benzer ${closed.length} kapanmış karardan ${below}'i beklentinin altında kaldı — bahsini ona göre kur.`;
  }
  return { total: rows.length, closed: closed.length, below, sentence };
}
