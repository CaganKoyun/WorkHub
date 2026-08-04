import { describe, it, expect } from "vitest";
import { ageInDays, computeBottleneck, founderWaitDays } from "./bottleneck-utils";

const NOW = new Date("2026-07-30T12:00:00Z").getTime();
const daysAgo = (n: number) => new Date(NOW - n * 24 * 60 * 60 * 1000).toISOString();

describe("ageInDays", () => {
  it("tam gün farkını döner", () => {
    expect(ageInDays(daysAgo(5), NOW)).toBe(5);
  });

  it("kısmi günü aşağı yuvarlar", () => {
    expect(ageInDays(new Date(NOW - 1.9 * 24 * 60 * 60 * 1000).toISOString(), NOW)).toBe(1);
  });

  it("gelecek tarihli created_at'i 0'a sabitler", () => {
    expect(ageInDays(daysAgo(-3), NOW)).toBe(0);
  });

  it("Date tipinde now kabul eder", () => {
    expect(ageInDays(daysAgo(2), new Date(NOW))).toBe(2);
  });
});

describe("computeBottleneck", () => {
  it("boş listede null döner (kart render edilmez)", () => {
    expect(computeBottleneck([], NOW)).toBeNull();
  });

  it("toplam gün ve en eskiyi hesaplar", () => {
    const rows = [
      { title: "a", created_at: daysAgo(1) },
      { title: "b", created_at: daysAgo(7) },
      { title: "c", created_at: daysAgo(3) },
    ];
    const s = computeBottleneck(rows, NOW)!;
    expect(s.count).toBe(3);
    expect(s.totalDays).toBe(11);
    expect(s.oldest.item.title).toBe("b");
    expect(s.oldest.days).toBe(7);
  });

  it("eşit yaşta ilk kayıt kazanır (stabil seçim)", () => {
    const rows = [
      { title: "ilk", created_at: daysAgo(4) },
      { title: "ikinci", created_at: daysAgo(4) },
    ];
    expect(computeBottleneck(rows, NOW)!.oldest.item.title).toBe("ilk");
  });

  it("tek kayıtta toplam = en eskinin yaşı", () => {
    const s = computeBottleneck([{ created_at: daysAgo(9) }], NOW)!;
    expect(s.count).toBe(1);
    expect(s.totalDays).toBe(9);
    expect(s.oldest.days).toBe(9);
  });
});

describe("founderWaitDays", () => {
  const start = new Date("2026-07-01T00:00:00Z").getTime();
  const end = new Date("2026-07-31T00:00:00Z").getTime();

  it("pencere içinde açılıp kapanan onayın süresini sayar", () => {
    expect(founderWaitDays(
      [{ created_at: "2026-07-05T00:00:00Z", decided_at: "2026-07-12T00:00:00Z" }],
      start, end,
    )).toBe(7);
  });

  it("hâlâ bekleyen onay pencere sonuna kadar sayılır", () => {
    expect(founderWaitDays(
      [{ created_at: "2026-07-21T00:00:00Z", decided_at: null }],
      start, end,
    )).toBe(10);
  });

  it("pencereden önce kapanan onay sayılmaz", () => {
    expect(founderWaitDays(
      [{ created_at: "2026-06-01T00:00:00Z", decided_at: "2026-06-20T00:00:00Z" }],
      start, end,
    )).toBe(0);
  });

  it("pencereden önce açılan onayın yalnızca pencere içi kısmı sayılır", () => {
    expect(founderWaitDays(
      [{ created_at: "2026-06-15T00:00:00Z", decided_at: "2026-07-03T00:00:00Z" }],
      start, end,
    )).toBe(2);
  });

  it("birden çok onay toplanır (kesirli günler yuvarlanır)", () => {
    expect(founderWaitDays(
      [
        { created_at: "2026-07-01T00:00:00Z", decided_at: "2026-07-02T12:00:00Z" }, // 1.5g
        { created_at: "2026-07-10T00:00:00Z", decided_at: "2026-07-12T00:00:00Z" }, // 2g
      ],
      start, end,
    )).toBe(4); // 3.5 → 4
  });
});
