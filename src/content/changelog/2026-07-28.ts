import type { ChangelogEntry } from "./entries";

const entry: ChangelogEntry = {
  date: "2026-07-28",
  title: "Multi-tenancy & Finance Module",
  content: `
### Workspace Isolation

Every workspace now operates in complete isolation. Row-Level Security policies enforce that queries never leak data across tenant boundaries, even in shared database infrastructure.

### RLS Hardening

All existing tables have been audited and re-secured with stricter RLS policies. The \`is_workspace_member()\` check is enforced on every read, insert, update, and delete operation without exception.

### Finance Module

A new Finance module is available from the sidebar:

- **Runway calculator** -- real-time runway projection based on current burn rate, cash balance, and projected revenue.
- **Burn rate tracking** -- monthly and weekly burn broken down by category (payroll, infrastructure, services, other).
- **Budget variance** -- compare planned vs. actual spend per project, department, or cost center.
- **Multi-currency support** -- record transactions in any currency with automatic conversion at daily rates.

### Workspace Switcher

Users who belong to multiple workspaces can now switch between them from the sidebar without logging out. The active workspace is persisted across sessions.
`,
};

export default entry;
