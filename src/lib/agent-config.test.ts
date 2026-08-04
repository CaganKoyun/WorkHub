import { describe, it, expect } from "vitest";
import { AGENTS, AGENT_LIST, getAgent } from "./agent-config";

describe("agent-config", () => {
  it("defines exactly the 4 MVP agents", () => {
    expect(AGENT_LIST).toHaveLength(4);
    expect(Object.keys(AGENTS).sort()).toEqual(
      ["chief_of_staff", "finance", "projects", "revenue"].sort(),
    );
  });

  it("every agent has at least 3 suggested prompts", () => {
    for (const a of AGENT_LIST) {
      expect(a.suggestedPrompts.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("only finance requires the finance permission", () => {
    expect(AGENTS.finance.requiresFinanceAccess).toBe(true);
    expect(AGENTS.chief_of_staff.requiresFinanceAccess).toBe(false);
    expect(AGENTS.projects.requiresFinanceAccess).toBe(false);
    expect(AGENTS.revenue.requiresFinanceAccess).toBe(false);
  });

  it("getAgent falls back to chief_of_staff for unknown domains", () => {
    expect(getAgent("nonexistent").domain).toBe("chief_of_staff");
    expect(getAgent(null).domain).toBe("chief_of_staff");
    expect(getAgent("finance").domain).toBe("finance");
  });
});

describe("extractApprovalDraft", () => {
  it("strips markdown and truncates the title to 120 chars", async () => {
    const { extractApprovalDraft } = await import("./agent-config");
    const long = "**Gözlem:** " + "a".repeat(200);
    const d = extractApprovalDraft(long);
    expect(d.title.length).toBeLessThanOrEqual(120);
    expect(d.title.startsWith("Gözlem:")).toBe(true);
  });

  it("falls back to a default title on empty input", async () => {
    const { extractApprovalDraft } = await import("./agent-config");
    expect(extractApprovalDraft("").title).toBe("Agent önerisi");
  });

  it("caps summary at 2000 chars", async () => {
    const { extractApprovalDraft } = await import("./agent-config");
    expect(extractApprovalDraft("x".repeat(3000)).summary.length).toBe(2000);
  });
});
