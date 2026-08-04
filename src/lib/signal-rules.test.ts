import { describe, it, expect } from "vitest";
import { SIGNAL_RULES, ruleThreshold } from "./signal-rules";

const bugRule = SIGNAL_RULES.find((r) => r.key === "critical_bug_open")!;

describe("SIGNAL_RULES", () => {
  it("tam olarak 5 sabit kural var (automation builder değil)", () => {
    expect(SIGNAL_RULES).toHaveLength(5);
    expect(new Set(SIGNAL_RULES.map((r) => r.key)).size).toBe(5);
  });
});

describe("ruleThreshold", () => {
  it("geçerli parametreyi okur", () => {
    expect(ruleThreshold(bugRule, { hours: 72 })).toBe(72);
  });

  it("bozuk/eksik/sınır dışı değerde varsayılana döner", () => {
    expect(ruleThreshold(bugRule, {})).toBe(48);
    expect(ruleThreshold(bugRule, null)).toBe(48);
    expect(ruleThreshold(bugRule, { hours: "yakında" })).toBe(48);
    expect(ruleThreshold(bugRule, { hours: 0 })).toBe(48);
    expect(ruleThreshold(bugRule, { hours: 10_000 })).toBe(48);
  });
});
