import { describe, it, expect } from "vitest";
import { computeSnoozeUntil, isSnoozeExpired, canDecideApproval } from "./approval-utils";

const NOW = new Date("2026-07-31T12:00:00Z").getTime();

describe("computeSnoozeUntil", () => {
  it("1g/3g/1h seçenekleri doğru mutlak zamana çevrilir", () => {
    expect(computeSnoozeUntil("1d", NOW)).toBe("2026-08-01T12:00:00.000Z");
    expect(computeSnoozeUntil("3d", NOW)).toBe("2026-08-03T12:00:00.000Z");
    expect(computeSnoozeUntil("1w", NOW)).toBe("2026-08-07T12:00:00.000Z");
  });
});

describe("isSnoozeExpired", () => {
  it("gelecekteki snooze aktif", () => {
    expect(isSnoozeExpired("2026-08-01T00:00:00Z", NOW)).toBe(false);
  });
  it("geçmiş snooze dolmuş → kuyruğa geri düşer", () => {
    expect(isSnoozeExpired("2026-07-31T11:00:00Z", NOW)).toBe(true);
  });
  it("null snooze dolmuş sayılır", () => {
    expect(isSnoozeExpired(null, NOW)).toBe(true);
  });
});

describe("canDecideApproval (F3 onay limitleri)", () => {
  const member = { role: "member", approvalLimit: 50000 };

  it("owner/admin her onayı karara bağlar", () => {
    expect(canDecideApproval({ role: "owner", approvalLimit: null }, { kind: "contract", amount: 999999 }).allowed).toBe(true);
    expect(canDecideApproval({ role: "admin", approvalLimit: null }, { kind: "expense", amount: 999999 }).allowed).toBe(true);
  });

  it("founder-only tipler üyeye kapalı (tutardan bağımsız)", () => {
    for (const kind of ["contract", "hiring", "risk_acceptance"]) {
      expect(canDecideApproval(member, { kind, amount: null }).allowed).toBe(false);
    }
  });

  it("limit içi tutarı üye onaylar, üstünü onaylayamaz", () => {
    expect(canDecideApproval(member, { kind: "expense", amount: 50000 }).allowed).toBe(true);
    expect(canDecideApproval(member, { kind: "expense", amount: 50001 }).allowed).toBe(false);
  });

  it("limiti tanımsız üye tutarlı onay veremez, tutarsız genel onayı verebilir", () => {
    const limitless = { role: "member", approvalLimit: null };
    expect(canDecideApproval(limitless, { kind: "expense", amount: 100 }).allowed).toBe(false);
    expect(canDecideApproval(limitless, { kind: "general", amount: null }).allowed).toBe(true);
  });
});
