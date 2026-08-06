// 4.2 — Paylaşılabilir karne kartı. İçerik üretimi saf (testli);
// çizim tarafı tarayıcıya özel (canvas), veri UYDURMAZ — yalnızca
// ekranda zaten gösterilen sayıları biçimlendirir.

export interface ShareCardContent {
  /** üst küçük etiket */
  eyebrow: string;
  /** dev sayı */
  metric: string;
  /** sayının altındaki tek cümle */
  headline: string;
  /** ikincil açıklama */
  sub: string;
}

export function buildCalibrationCard(args: {
  gap: number;
  label: string;
  closedCount: number;
}): ShareCardContent {
  return {
    eyebrow: "KALİBRASYON KARNEM",
    metric: `${args.gap}`,
    headline: `puan ortalama sapma — ${args.label}`,
    sub: `${args.closedCount} kapanmış karar üzerinden hesaplandı`,
  };
}

export function buildMirrorCard(args: {
  currentDays: number;
  previousDays: number;
}): ShareCardContent {
  const { currentDays, previousDays } = args;
  let sub: string;
  if (previousDays === 0) {
    sub = "İlk ölçüm — bundan sonrası kıyaslanacak";
  } else {
    const pct = Math.abs(Math.round(((currentDays - previousDays) / previousDays) * 100));
    sub = currentDays < previousDays
      ? `Geçen ay ${previousDays} gündü — %${pct} iyileşme`
      : currentDays > previousDays
        ? `Geçen ay ${previousDays} gündü — %${pct} artış`
        : `Geçen ayla aynı (${previousDays} gün)`;
  }
  return {
    eyebrow: "BENİM YÜZÜMDEN",
    metric: `${currentDays}`,
    headline: currentDays === 1 ? "gün ekibim beni bekledi" : "gün ekibim beni bekledi",
    sub,
  };
}

/** Dosya adı: türkçe karaktersiz, tarihli. */
export function shareCardFilename(kind: string, now: Date): string {
  const stamp = now.toISOString().slice(0, 10);
  return `founderos-${kind}-${stamp}.png`;
}

// ---------------------------------------------------------------------------
// Çizim (tarayıcı). 1200×630 — LinkedIn/OG standardı.
// ---------------------------------------------------------------------------
export function renderShareCard(content: ShareCardContent): HTMLCanvasElement {
  const W = 1200;
  const H = 630;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // arka plan
  ctx.fillStyle = "#0b0d10";
  ctx.fillRect(0, 0, W, H);
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "rgba(99,102,241,0.18)");
  grad.addColorStop(1, "rgba(16,185,129,0.10)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const font = (size: number, weight = "600") =>
    `${weight} ${size}px ui-sans-serif, -apple-system, "Segoe UI", Roboto, sans-serif`;

  ctx.fillStyle = "rgba(230,232,235,0.62)";
  ctx.font = font(24, "700");
  ctx.fillText(content.eyebrow, 80, 130);

  ctx.fillStyle = "#e6e8eb";
  ctx.font = font(190, "700");
  ctx.fillText(content.metric, 80, 330);

  const metricWidth = ctx.measureText(content.metric).width;
  ctx.font = font(38, "500");
  ctx.fillStyle = "rgba(230,232,235,0.86)";
  ctx.fillText(content.headline, 80 + metricWidth + 24, 330);

  ctx.font = font(28, "400");
  ctx.fillStyle = "rgba(230,232,235,0.55)";
  ctx.fillText(content.sub, 80, 400);

  // alt çizgi + marka
  ctx.strokeStyle = "rgba(230,232,235,0.14)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(80, 500);
  ctx.lineTo(W - 80, 500);
  ctx.stroke();

  ctx.font = font(26, "600");
  ctx.fillStyle = "rgba(230,232,235,0.75)";
  ctx.fillText("Spark WorkHub · kararın kayıt sistemi", 80, 552);

  return canvas;
}

/** Kartı PNG olarak indirir. */
export function downloadShareCard(content: ShareCardContent, filename: string): void {
  const canvas = renderShareCard(content);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}
