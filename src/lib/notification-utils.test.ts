import { describe, it, expect } from "vitest";
import { isSameUtcDay, shouldSendReviewReminder, formatReviewReminder } from "./notification-utils";

const NOW = "2026-07-31T10:00:00Z";

describe("isSameUtcDay", () => {
  it("aynı UTC günü — saat farklı", () => {
    expect(isSameUtcDay("2026-07-31T00:01:00Z", "2026-07-31T23:59:00Z")).toBe(true);
  });
  it("farklı UTC günleri", () => {
    expect(isSameUtcDay("2026-07-30T23:59:00Z", "2026-07-31T00:01:00Z")).toBe(false);
  });
});

describe("shouldSendReviewReminder", () => {
  const base = { dueCount: 2, prefEnabled: true, lastSentAt: null, now: NOW };

  it("vadesi gelen karar varsa gönderir", () => {
    expect(shouldSendReviewReminder(base)).toBe(true);
  });
  it("vadesi gelen yoksa göndermez", () => {
    expect(shouldSendReviewReminder({ ...base, dueCount: 0 })).toBe(false);
  });
  it("tercih kapalıysa göndermez", () => {
    expect(shouldSendReviewReminder({ ...base, prefEnabled: false })).toBe(false);
  });
  it("tercih kaydı yoksa varsayılan açıktır", () => {
    expect(shouldSendReviewReminder({ ...base, prefEnabled: null })).toBe(true);
    expect(shouldSendReviewReminder({ ...base, prefEnabled: undefined })).toBe(true);
  });
  it("aynı gün ikinci kez göndermez (idempotent)", () => {
    expect(shouldSendReviewReminder({ ...base, lastSentAt: "2026-07-31T06:00:00Z" })).toBe(false);
  });
  it("dünkü gönderim bugünü engellemez", () => {
    expect(shouldSendReviewReminder({ ...base, lastSentAt: "2026-07-30T06:00:00Z" })).toBe(true);
  });
});

describe("formatReviewReminder", () => {
  it("tekil ve çoğul başlık", () => {
    expect(formatReviewReminder(1, "Fiyat artışı").title).toBe("1 kararın yeniden açılış vakti geldi");
    expect(formatReviewReminder(4, "Fiyat artışı").title).toBe("4 kararın yeniden açılış vakti geldi");
  });
  it("gövdede en eski kararın başlığı ve /decisions linki", () => {
    const c = formatReviewReminder(2, "ABD pazarına giriş");
    expect(c.body).toContain("ABD pazarına giriş");
    expect(c.link).toBe("/decisions");
  });
});
