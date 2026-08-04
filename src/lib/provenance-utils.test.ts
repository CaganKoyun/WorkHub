import { describe, it, expect } from "vitest";
import { freshnessLabel, cashCardState } from "./provenance-utils";

const NOW = new Date("2026-07-31T12:00:00Z").getTime();

describe("freshnessLabel", () => {
  it("60 saniyeden yeni → şimdi", () => {
    expect(freshnessLabel(NOW - 30_000, NOW)).toBe("şimdi");
  });
  it("dakika ölçeği", () => {
    expect(freshnessLabel(NOW - 5 * 60_000, NOW)).toBe("5 dk önce");
  });
  it("saat ölçeği", () => {
    expect(freshnessLabel(NOW - 3 * 3_600_000, NOW)).toBe("3 sa önce");
  });
  it("gelecek zaman damgası 'şimdi' sayılır (saat kayması toleransı)", () => {
    expect(freshnessLabel(NOW + 10_000, NOW)).toBe("şimdi");
  });
});

describe("cashCardState", () => {
  it("yetki yoksa sayı sızdırmaz", () => {
    expect(cashCardState({ allowed: false, accountsCount: 3, cashBase: 950 })).toEqual({ kind: "no_access" });
  });
  it("hesap yoksa 'veri yok' — 0 ile yanıltmaz", () => {
    expect(cashCardState({ allowed: true, accountsCount: 0, cashBase: 0 })).toEqual({ kind: "no_data" });
    expect(cashCardState({ allowed: true, accountsCount: undefined, cashBase: undefined })).toEqual({ kind: "no_data" });
  });
  it("hesap varsa bakiye (0 dahil) gerçek değerdir", () => {
    expect(cashCardState({ allowed: true, accountsCount: 2, cashBase: 0 })).toEqual({ kind: "value", amount: 0 });
    expect(cashCardState({ allowed: true, accountsCount: 2, cashBase: 12500 })).toEqual({ kind: "value", amount: 12500 });
  });
});
