import type { ChangelogEntry } from "./entries";

const entry: ChangelogEntry = {
  date: "2026-07-15",
  title: "CRM Pipeline & Founder Inbox",
  content: `
### CRM Pipeline Board

A visual pipeline board for managing sales opportunities. Drag deals between stages (Lead, Qualified, Proposal, Negotiation, Closed Won, Closed Lost) with automatic probability weighting per stage.

### Opportunity Tracking

Each opportunity records expected value, close date, assigned owner, and linked company. Pipeline reports aggregate weighted value by stage, owner, and time period.

### Approval Workflow

The Founder Inbox now serves as the central queue for every pending approval across the workspace:

- **Hiring requests** -- review role details, compensation band, and headcount impact before approving.
- **Spend approvals** -- any purchase or contract above a configurable threshold routes here with budget context attached.
- **Contract sign-off** -- CRM deals that reach the contract stage surface for founder review with the full deal history.

### Inbox Filters

Filter the inbox by module (CRM, Finance, People, Projects), urgency, or requester. Bulk approve or reject with a single action.

### Activity Feed

A unified activity feed shows every action taken across the workspace in reverse chronological order, filterable by module and team member.
`,
};

export default entry;
