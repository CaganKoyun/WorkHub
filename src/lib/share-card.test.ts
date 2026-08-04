import { describe, it, expect } from "vitest";
import { buildCalibrationCard, buildMirrorCard, shareCardFilename } from "./share-card";

describe("buildCalibrationCard", () => {
  it("sapmayı ve etiketi kartlar", () => {
    const c = buildCalibrationCard({ gap: 18, label: "iyi kalibre", closedCount: 7 });
    expect(c.metric).toBe("18");
    expect(c.headline).toContain("iyi kalibre");
    expect(c.sub).toContain("7 kapanmış karar");
  });
});

describe("buildMirrorCard", () => {
  it("iyileşmeyi yüzdeyle anlatır", () => {
    expect(buildMirrorCard({ currentDays: 34, previousDays: 41 }).sub)
      .toBe("Geçen ay 41 gündü — %17 iyileşme");
  });

  it("artışı da dürüstçe söyler", () => {
    expect(buildMirrorCard({ currentDays: 50, previousDays: 40 }).sub)
      .toBe("Geçen ay 40 gündü — %25 artış");
  });

  it("değişmediyse kıyas cümlesi nötr", () => {
    expect(buildMirrorCard({ currentDays: 12, previousDays: 12 }).sub)
      .toBe("Geçen ayla aynı (12 gün)");
  });

  it("geçmiş veri yoksa oran uydurmaz", () => {
    const c = buildMirrorCard({ currentDays: 9, previousDays: 0 });
    expect(c.metric).toBe("9");
    expect(c.sub).toBe("İlk ölçüm — bundan sonrası kıyaslanacak");
  });
});

describe("shareCardFilename", () => {
  it("tarihli ve güvenli dosya adı", () => {
    expect(shareCardFilename("kalibrasyon", new Date("2026-07-31T10:00:00Z")))
      .toBe("founderos-kalibrasyon-2026-07-31.png");
  });
});
