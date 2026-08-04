import { describe, it, expect } from "vitest";
import {
  decisionFormSchema,
  validateWager,
  computeReviewAt,
  isDueForReview,
  calibrationGap,
  calibrationBias,
  calibrationVerdict,
} from "./decision-utils";

describe("decisionFormSchema", () => {
  it("accepts a minimal proposed decision", () => {
    const r = decisionFormSchema.safeParse({ title: "Fiyat artışı", status: "proposed" });
    expect(r.success).toBe(true);
  });

  it("rejects a too-short title", () => {
    const r = decisionFormSchema.safeParse({ title: "ab", status: "proposed" });
    expect(r.success).toBe(false);
  });

  it("rejects confidence outside 0-100", () => {
    const r = decisionFormSchema.safeParse({
      title: "Fiyat artışı", status: "decided", confidence: 140,
    });
    expect(r.success).toBe(false);
  });
});

describe("validateWager", () => {
  it("requires expected_outcome when status is decided", () => {
    const err = validateWager({ title: "X karar", status: "decided", expected_outcome: "" });
    expect(err).toBeTruthy();
  });

  it("requires confidence when status is decided", () => {
    const err = validateWager({
      title: "X karar", status: "decided",
      expected_outcome: "Churn %3 artar", confidence: null,
    });
    expect(err).toBeTruthy();
  });

  it("passes with full wager", () => {
    const err = validateWager({
      title: "X karar", status: "decided",
      expected_outcome: "Churn %3 artar", confidence: 70,
    });
    expect(err).toBeNull();
  });

  it("does not require a wager for proposals", () => {
    const err = validateWager({ title: "X karar", status: "proposed" });
    expect(err).toBeNull();
  });
});

describe("computeReviewAt", () => {
  it("defaults to +90 days", () => {
    const d = computeReviewAt(new Date("2026-01-01T00:00:00Z"));
    expect(d.toISOString().slice(0, 10)).toBe("2026-04-01");
  });
});

describe("isDueForReview", () => {
  const now = new Date("2026-07-28T12:00:00Z");

  it("is due when decided, past review_at, no verdict", () => {
    expect(isDueForReview(
      { status: "decided", review_at: "2026-07-01T00:00:00Z", verdict: null }, now,
    )).toBe(true);
  });

  it("is not due before review_at", () => {
    expect(isDueForReview(
      { status: "decided", review_at: "2026-09-01T00:00:00Z", verdict: null }, now,
    )).toBe(false);
  });

  it("is not due once a verdict exists", () => {
    expect(isDueForReview(
      { status: "decided", review_at: "2026-07-01T00:00:00Z", verdict: "held" }, now,
    )).toBe(false);
  });

  it("proposals are never due", () => {
    expect(isDueForReview(
      { status: "proposed", review_at: "2026-07-01T00:00:00Z", verdict: null }, now,
    )).toBe(false);
  });
});

describe("calibrationGap", () => {
  it("returns null with fewer than 3 closed decisions", () => {
    expect(calibrationGap([{ confidence: 80, verdict: "held" }])).toBeNull();
  });

  it("scores a perfectly calibrated set as 0", () => {
    expect(calibrationGap([
      { confidence: 100, verdict: "held" },
      { confidence: 100, verdict: "held" },
      { confidence: 0, verdict: "wrong" },
    ])).toBe(0);
  });

  it("penalizes overconfidence", () => {
    const gap = calibrationGap([
      { confidence: 90, verdict: "wrong" },
      { confidence: 90, verdict: "wrong" },
      { confidence: 90, verdict: "changed" },
    ]);
    expect(gap).toBe(Math.round((90 + 90 + 40) / 3));
  });
});

describe("calibrationBias", () => {
  it("returns null with fewer than 3 closed decisions", () => {
    expect(calibrationBias([{ confidence: 80, verdict: "held" }])).toBeNull();
  });

  it("positive when overconfident, negative when underconfident", () => {
    expect(calibrationBias([
      { confidence: 90, verdict: "wrong" },
      { confidence: 90, verdict: "wrong" },
      { confidence: 90, verdict: "wrong" },
    ])).toBe(90);
    expect(calibrationBias([
      { confidence: 20, verdict: "held" },
      { confidence: 20, verdict: "held" },
      { confidence: 20, verdict: "held" },
    ])).toBe(-80);
  });
});

describe("calibrationVerdict", () => {
  it("PRD eşikleri: 0-20 iyi, 21-40 orta, 40+ aşırı", () => {
    expect(calibrationVerdict(20, 5).tier).toBe("good");
    expect(calibrationVerdict(21, 5).tier).toBe("medium");
    expect(calibrationVerdict(40, 5).tier).toBe("medium");
    expect(calibrationVerdict(41, 5).tier).toBe("extreme");
  });

  it("aşırı etiketinde yön bias'tan gelir", () => {
    expect(calibrationVerdict(50, 30).label).toBe("aşırı iyimser");
    expect(calibrationVerdict(50, -30).label).toBe("aşırı kötümser");
  });
});
