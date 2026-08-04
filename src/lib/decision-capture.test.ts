import { describe, expect, it } from "vitest";
import {
  detectSilentDecisions,
  approvalCandidates,
  opportunityCandidates,
} from "./decision-capture";

const now = new Date("2026-07-31T00:00:00Z");

describe("decision capture", () => {
  it("captures decided approvals that have no decision record", () => {
    const out = approvalCandidates(
      [
        { id: "a1", title: "Sunucu harcaması", kind: "expense", amount: 5000, currency: "TRY", status: "approved", priority: "high", created_at: "2026-07-01T00:00:00Z", decided_at: "2026-07-02T00:00:00Z" },
        { id: "a2", title: "Zaten kayıtlı", kind: "expense", amount: 100, currency: "TRY", status: "approved", priority: "high", created_at: "2026-07-01T00:00:00Z", decided_at: null },
        { id: "a3", title: "Bekleyen", kind: "expense", amount: 100, currency: "TRY", status: "pending", priority: "high", created_at: "2026-07-01T00:00:00Z", decided_at: null },
      ],
      new Set(["a2"]),
      now,
    );
    expect(out.map((c) => c.sourceId)).toEqual(["a1"]);
    expect(out[0].severity).toBe("high");
  });

  it("flags opportunities stuck in a stage", () => {
    const out = opportunityCandidates(
      [
        { id: "o1", name: "Acme", amount: 1000, currency: "USD", status: "open", stage_entered_at: "2026-06-01T00:00:00Z", expected_close_date: null },
        { id: "o2", name: "Fresh", amount: 1000, currency: "USD", status: "open", stage_entered_at: "2026-07-28T00:00:00Z", expected_close_date: null },
      ],
      now,
    );
    expect(out.map((c) => c.sourceId)).toEqual(["o1"]);
  });

  it("ranks by severity and drops dismissed keys", () => {
    const out = detectSilentDecisions(
      {
        approvals: [],
        opportunities: [],
        risks: [
          { id: "r1", title: "Tek müşteri bağımlılığı", severity: "critical", status: "open", created_at: "2026-05-01T00:00:00Z" },
        ],
        goals: [
          { id: "g1", title: "ARR 1M", status: "on_track", progress: 40, due_date: "2026-06-01" },
        ],
        capturedApprovalIds: new Set(),
        dismissedKeys: new Set(["goal:g1"]),
      },
      now,
    );
    expect(out).toHaveLength(1);
    expect(out[0].key).toBe("risk:r1");
  });
});
