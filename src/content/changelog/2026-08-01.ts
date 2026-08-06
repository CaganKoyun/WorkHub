import type { ChangelogEntry } from "./entries";

const entry: ChangelogEntry = {
  date: "2026-08-01",
  title: "Decision System of Record v2",
  content: `
### Verdict Tracking

Every decision now carries a formal verdict field -- Approved, Rejected, Deferred, or Needs More Data -- with a timestamped audit trail showing who moved it through each stage.

### Confidence Calibration

Assign a confidence percentage at decision time. FounderOS tracks your calibration accuracy over months so you can see whether your 70% calls really land 70% of the time.

### Company Snapshot Freeze

The full company context (runway, headcount, pipeline value, active risks) is frozen at the moment a decision is recorded. Months later you can compare the snapshot to current state and measure what changed.

### Pre-Mortem Dialog

Before finalizing a decision, a structured pre-mortem dialog prompts the team to surface what could go wrong. Responses are stored alongside the decision record for future review.

### Assumption Ledger

Each decision can carry explicit assumptions ("churn stays below 3%", "Series A closes by Q4"). These are tracked as living items -- when an assumption is invalidated, every decision that depended on it is flagged for re-evaluation.
`,
};

export default entry;
