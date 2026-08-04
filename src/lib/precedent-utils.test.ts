import { describe, it, expect } from "vitest";
import { extractKeywords, summarizePrecedents } from "./precedent-utils";

describe("extractKeywords", () => {
  it("stopword'leri ve kısa kelimeleri eler, Türkçe küçük harfe çevirir", () => {
    expect(extractKeywords("ABD pazarına şimdi mi girmeliyiz")).toEqual([
      "abd", "pazarına", "şimdi", "girmeliyiz",
    ]);
  });

  it("en fazla 4 anahtar döner", () => {
    expect(extractKeywords("kurumsal fiyat artışı pazarlama bütçesi genişletme kararı")).toHaveLength(4);
  });

  it("noktalama ve boşluklarla başa çıkar", () => {
    expect(extractKeywords("Fiyatı %20 artır!")).toEqual(["fiyatı", "artır"]);
  });
});

describe("summarizePrecedents", () => {
  it("kapanmış karar yoksa cümle üretmez", () => {
    expect(summarizePrecedents([{ verdict: null }]).sentence).toBeNull();
  });

  it("beklenti altı kalanları sayar ve uyarır", () => {
    const s = summarizePrecedents([
      { verdict: "held" }, { verdict: "wrong" }, { verdict: "changed" }, { verdict: null },
    ]);
    expect(s.closed).toBe(3);
    expect(s.below).toBe(2);
    expect(s.sentence).toContain("2'i beklentinin altında");
  });

  it("hepsi tuttuysa olumlu cümle", () => {
    expect(summarizePrecedents([{ verdict: "held" }, { verdict: "held" }]).sentence)
      .toContain("hepsi beklentiyi tuttu");
  });
});
