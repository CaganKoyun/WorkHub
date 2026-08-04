// Review hatırlatma bildiriminin saf mantığı (PRD Görev 2).
// Edge function (Deno) bu kuralların aynısını uygular; birim testler
// davranış sözleşmesini burada sabitler.

export interface ReviewReminderContent {
  title: string;
  body: string;
  link: string;
}

/** İki timestamp aynı UTC gününde mi? (günde en fazla 1 bildirim kuralı) */
export function isSameUtcDay(a: string | number | Date, b: string | number | Date): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getUTCFullYear() === db.getUTCFullYear() &&
    da.getUTCMonth() === db.getUTCMonth() &&
    da.getUTCDate() === db.getUTCDate()
  );
}

/**
 * Bildirim gönderilmeli mi? Kurallar:
 * - vadesi gelen karar yoksa gönderme
 * - kullanıcı tercihi kapalıysa gönderme (kayıt yoksa varsayılan açık)
 * - aynı UTC gününde zaten gönderildiyse gönderme (idempotensi)
 */
export function shouldSendReviewReminder(args: {
  dueCount: number;
  prefEnabled: boolean | null | undefined;
  lastSentAt: string | null;
  now: string | number | Date;
}): boolean {
  if (args.dueCount <= 0) return false;
  if (args.prefEnabled === false) return false;
  if (args.lastSentAt && isSameUtcDay(args.lastSentAt, args.now)) return false;
  return true;
}

/** Bildirim içeriği: vadesi gelen sayı + en eski kararın başlığı. */
export function formatReviewReminder(dueCount: number, oldestTitle: string): ReviewReminderContent {
  const plural = dueCount === 1 ? "1 kararın" : `${dueCount} kararın`;
  return {
    title: `${plural} yeniden açılış vakti geldi`,
    body: `En eskisi: ${oldestTitle}. Doğruydu / Değişti / Yanlıştı — kapat ve kalibrasyonunu gör.`,
    link: "/decisions",
  };
}
