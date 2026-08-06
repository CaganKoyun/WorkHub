# FounderOS

Multi-tenant Company Operating System for startups and SMBs. Tracks projects, revenue, decisions, and company operations in a single workspace — with every record connected through a Company Graph.

## Stack

- **Frontend:** React 18, Vite 5, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Supabase (Postgres, Auth, Storage, Edge Functions, Realtime)
- **Access control:** Row-Level Security with workspace scoping on every table

## Modules

| Area | What it covers |
|------|----------------|
| Work | Projects (Kanban/List/Timeline/Calendar), My Tasks, Bugs |
| Revenue | CRM pipeline, Finance (cash, burn, runway, FX), Analytics |
| Strategy | Goals (OKR), Risks, Decisions (DSoR with verdict tracking) |
| Company | Legal entities, Departments, Employees, Assets |
| Platform | Integrations (MCP/OAuth), AI Chat, Notifications, Settings |

## Local development

Prerequisites: Node.js 18+ and npm.

```sh
git clone <repo-url> && cd WorkHub
cp .env.example .env          # fill in your Supabase credentials
npm install
npm run dev                   # starts on http://localhost:8080
```

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Type-check + production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run preview` | Preview production build locally |

## Deploy

The project includes a `vercel.json` with SPA rewrites and security headers. To deploy:

1. Connect the repo to Vercel (or any static host).
2. Set environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL`.
3. Build command: `npm run build`, output directory: `dist`.

## Project structure

```
src/
  components/     UI components (shadcn/ui based)
  contexts/       React context providers (Auth, Workspace)
  hooks/          Custom React hooks
  integrations/   Supabase client setup
  lib/            Domain hooks, types, utilities
  pages/          Route-level page components
  content/        Static content (changelog, compare data)
supabase/
  functions/      Deno edge functions
  migrations/     Postgres migrations (timestamped)
docs/
  PRD.md          Product requirements document
```

## Contributing

1. Create a feature branch from `main`.
2. Make changes — `npm run build` must pass (includes type-check).
3. Open a pull request with a clear description of what changed and why.
