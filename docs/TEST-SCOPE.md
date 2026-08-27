# WorkHub — Test Scope

Companion to the full internal test-scope planning doc. This file is what
lives in the repo: priority matrix + the one-line intent per spec, so an
outside contributor can pick up a P0 slot without loading the whole plan.

## Priority matrix

| Prio | Where           | Case                                        | Rationale                                                                          |
| ---- | --------------- | ------------------------------------------- | ---------------------------------------------------------------------------------- |
| P0   | e2e/projects    | Zero-to-hero: signup → workspace → project  | Onboarding health = precondition for every other E2E.                              |
| P0   | e2e/invite      | Invite + magic-link accept                  | First customer's day-one pain path.                                                |
| P0   | e2e/kanban-dnd  | Drag card between columns, refresh persists | Regression-fragile; three prior bugs in this path.                                 |
| P0   | e2e/rls         | Cross-workspace read denied by RLS          | Multi-tenant blast radius — worst possible failure mode.                           |
| P0   | e2e/password    | Reset flow end-to-end                       | Prod-ready product cannot ship this broken.                                        |
| P0   | e2e/regression  | `decisions` create 400 red-test             | Known-open (PRD §6.1). Turns green when fixed.                                     |
| P0   | e2e/regression  | My Tasks "Unassigned" group visible         | Known-open (PRD §6.4). UX regression.                                              |
| P1   | e2e/approvals   | Founder Inbox approve/reject loop           | Core value prop but not a common-user path yet.                                    |
| P1   | e2e/crm-won     | Won-deal automation → customer + inbox     | Business-logic critical, low daily traffic.                                        |
| P1   | e2e/bugs        | BUG-##### issuance + lifecycle              | Numbering race is a real risk under load.                                          |
| P1   | e2e/oauth       | Integrations OAuth handshake                | Fragile against provider changes; keep smoke-only.                                 |
| P2   | everything else | Cycles, forms, whiteboards, chat, meetings  | Long tail; convert to P1 as customers request each module.                         |

## What lives where

- `e2e/*.spec.ts` — Playwright end-to-end. Add new specs at the P0 tier
  before touching P1/P2.
- `e2e/support/roles.ts` — thin factory returning a Supabase client
  scoped to a role fixture user. Any RLS spec goes through this.
- `docs/TEST-SCOPE.md` — this file. Update the priority matrix whenever
  a case moves tiers.

## Local run

```
npm test                  # vitest (unit + component)
npm run test:e2e          # playwright — CI equivalent
PWDEBUG=1 npm run test:e2e -- kanban-dnd   # headed, single spec
```

E2E specs are shipped in `test.skip()` state until wired up so CI stays
green during scaffolding. Flip to `test()` (or `test.only()` while
authoring) when the spec is ready to enforce.
