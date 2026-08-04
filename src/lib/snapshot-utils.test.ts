import { describe, it, expect } from "vitest";
import { snapshotEntries, snapshotCapturedAt } from "./snapshot-utils";

describe("snapshotEntries", () => {
  it("bilinen sayısal alanları sırayla döker", () => {
    const entries = snapshotEntries({
      captured_at: "2026-07-01T00:00:00Z",
      cash_position: 125000,
      open_tasks: 14,
      critical_bugs: 3,
    });
    expect(entries.map((e) => e.key)).toEqual(["cash_position", "open_tasks", "critical_bugs"]);
    expect(entries[0].value).toBe(125000);
  });

  it("eksik/bilinmeyen/sayı-olmayan alanları atlar — değer uydurmaz", () => {
    const entries = snapshotEntries({
      cash_position: "gizli",
      surprise_field: 42,
      open_tasks: 5,
    });
    expect(entries.map((e) => e.key)).toEqual(["open_tasks"]);
  });

  it("null/bozuk snapshot'ta boş döner", () => {
    expect(snapshotEntries(null)).toEqual([]);
    expect(snapshotEntries("json değil")).toEqual([]);
  });

  it("0 değeri gerçek veridir, atlanmaz", () => {
    expect(snapshotEntries({ critical_bugs: 0 })[0]?.value).toBe(0);
  });
});

describe("snapshotCapturedAt", () => {
  it("captured_at'i döner, yoksa null", () => {
    expect(snapshotCapturedAt({ captured_at: "2026-07-01T00:00:00Z" })).toBe("2026-07-01T00:00:00Z");
    expect(snapshotCapturedAt({})).toBeNull();
    expect(snapshotCapturedAt(null)).toBeNull();
  });
});
