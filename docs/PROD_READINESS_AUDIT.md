# WorkHub / FounderOS — Production Readiness Audit Prompt

> Bu doküman, projeye özel hale getirilmiş bir **audit prompt**'tur. Copy-paste
> ile bir Claude Code session'ına verildiğinde, agent WorkHub'ı bu prompt'ta
> yazılı prensiplere göre uçtan uca denetleyecek ve **P0/P1** hataları
> düzeltecektir. Amaç mock/placeholder/dead-button/orphan-route sıfır olan,
> gerçek bir SaaS gibi davranan bir ürüne ulaşmak.
>
> Prod URL: https://sparkworkhub.com
> Repo: `CaganKoyun/WorkHub`
> Codename: **WorkHub** (kullanıcıya görünen) / **FounderOS** (dahili PRD ismi)

---

## Rol

Sen **Senior Staff Engineer + Product Engineer + QA Lead + Security / Production
Readiness Reviewer**'sın. WorkHub'ı üretime çıkmaya hazırlayacaksın.

Görevin **rapor yazmak değil**:
`inspect → discover → trace → fix → test → re-audit`
döngüsünü çalıştırmak. WorkHub gerçekten üretime hazır olana kadar durma.

## Birincil hedef

Aşağıdakiler ürünün hiçbir yerinde kalmayacak:

- mock / demo / dummy / sample / fake veri (production-facing)
- placeholder UI, "coming soon" tabelaları
- disconnected sayfalar, dead butonlar, hiçbir yere gitmeyen rotalar
- görsel olarak var olan ama çalışmayan feature'lar
- kaydetmeyen formlar, backend'e yazılmayan aksiyonlar
- eksik CRUD döngüleri (create var, delete yok gibi)
- unutulmuş loading / empty / error state'ler
- inkonsistent navigasyon, orphan sayfalar, kırık geri butonu
- hardcoded demo değerler (`const projects = [{ id: 1, name: "Acme" }, …]`)
- temporary TODO / FIXME implementasyonları
- eksik permission enforcement (yalnız UI'da gizlenen ama server-side açık)
- frontend-only pretending-to-work feature'lar
- console error'ları, sessiz API failure'ları, unhandled exception'lar
- 375/768/1024 kırıkları (responsive)
- kaydettiğini iddia edip kaydetmeyen ayar sayfaları
- destructive action'lar için onay yokluğu
- feedback vermeyen aksiyonlar
- refresh/deep-link'te bozulan sayfalar
- production build warning/error'ları
- güvenlik ihlalleri (frontend'de service_role key gibi)
- veri bütünlüğü sorunları (workspace_id sızıntısı, orphan row)

Sonuç: **gerçek bir SaaS ürünü** gibi hissettirecek, prototip gibi değil.

---

## WorkHub — Mimari Snapshot (mental modelini bununla oluştur)

### Stack
- **Frontend:** React 18 + Vite 5 + TypeScript + Tailwind + Radix + shadcn/ui
- **State/Cache:** @tanstack/react-query
- **Router:** react-router-dom v6
- **Theme:** next-themes (dark default, `enableSystem={false}`)
- **PWA:** manifest + install prompt (`src/components/InstallPrompt.tsx`)
- **Backend:** Lovable Cloud = Supabase (Postgres + Auth + Storage + Edge Functions)
- **Auth SDK:** `@lovable.dev/cloud-auth-js`
- **Deploy:** Vercel (Preview + Production, `vercel.json`)

### App shell
`AppRail` (56px ikon rayı) + `AppSidebar` (kümelenmiş, `nav-config.ts`) +
`TopBar` (arama + bildirim + workspace switcher) + `DomainWorkspace` (65/35
içerik + AI rayı) + `ShortcutsProvider` (klavye kısayolları).

### Guard zinciri
`ProtectedRoute` (oturum) → `WorkspaceGate` (aktif workspace / onboarding
yönlendirmesi) → sayfa.

### Multi-tenant + RLS
- Her tabloda `workspace_id` **zorunlu**.
- RLS `is_workspace_member(workspace_id)` ve
  `has_workspace_permission(workspace_id, user_id, module, action)` üstünden.
- Rol enum'ı: **`workspace_role`** = `owner | admin | manager | member | viewer | guest`.
- Frontend permission hook: `useWorkspacePermission(module, action)`
  (`src/hooks/useWorkspacePermission.ts`).
- `useUserRole()` yalnız system-level (`user_roles` tablosu). Workspace-role
  UI kararları için **kullanılmaz** — `useWorkspacePermission` kullan.

### Rotalar (App.tsx)
Şu rotaları gerçek tara (`grep -n "<Route" src/App.tsx`); ~65 tane var:
Public: `/`, `/auth`, `/invite/:token`, `/f/:slug` (form), `/support/:workspaceId`,
`/portal/:token` · Auth guard: `/onboarding` · Workspace guard:
`/dashboard`, `/home` (Founder Home), `/inbox` (Founder Inbox), `/bugs*`,
`/analytics`, `/assets*`, `/employees`, `/ai-chat`, `/projects*`, `/tasks`,
`/issues`, `/cycles`, `/teams`, `/templates`, `/workload`, `/insights`,
`/roadmap`, `/admin`, `/import`, `/workflow-states`, `/timesheet`,
`/custom-fields`, `/docs*`, `/chat*`, `/automations`, `/forms`,
`/whiteboards*`, `/desk*`, `/portfolios*`, `/meetings*`, `/audit`, `/views`,
`/api-tokens`, `/portals`, `/notification-settings`, `/agent`, `/leaderboard`,
`/crm`, `/finance`, `/goals`, `/risks`, `/decisions*`, `/product`, `/company`,
`/workspace/settings`, `/integrations`, `/settings`, `*` → 404.

### Veri modeli (~66 tablo)
- **Tenancy:** `workspaces`, `workspace_members`, `workspace_permissions`,
  `workspace_invitations`, `workspace_onboarding`, `user_active_workspace`,
  `user_roles`, `profiles`
- **Work:** `projects`, `project_members`, `project_messages`, `project_files`,
  `tasks`, `task_comments`, `task_activity`, `bugs`, `attachments`, `comments`,
  `activity_log`
- **Product:** `products`, `features`, `feedback`, `releases`, `incidents`
- **CRM:** `crm_companies`, `crm_contacts`, `crm_opportunities`, `crm_pipelines`,
  `crm_pipeline_stages`, `crm_quotes`, `crm_quote_items`, `crm_contracts`,
  `crm_subscriptions`, `crm_customers`, `crm_activities`
- **Finance:** `fin_accounts`, `fin_transactions`, `fin_categories`,
  `fin_budgets`, `fin_fx_rates`
- **Governance:** `goals`, `risks`, `decisions`, `approvals`
- **Company:** `legal_entities`, `departments`, `teams`, `job_titles`,
  `employees`, `business_functions`, `module_ownership`, `permission_sets`
- **Assets:** `assets`, `asset_categories`, `asset_assignments`
- **Graph & Platform:** `object_links`, `integrations_catalog`,
  `workspace_connections`, `user_mcp_servers`, `mcp_oauth_states`,
  `notification_preferences`

### Kritik RPC / fonksiyonlar
`create_workspace`, `accept_workspace_invitation`, `seed_default_permissions`,
`has_workspace_permission`, `is_workspace_member`, `handle_new_user()`
(profiles trigger — `20260806180000_dsor_fix.sql`), `fin_cash_balance`,
`fin_burn_rate`, `fin_lookup_fx`, `crm_opportunity_won_flow`, `has_role`.

### Storage bucket'ları
`avatars` (public), `bug-attachments` (private, signed URL).

### Edge functions
`ai-chat`, `mcp-connections`, `mcp-oauth-callback` (+ `_shared` yardımcılar).
`supabase/functions/` altında.

### Env (`.env.example` referans)
- Public/browser: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
  `VITE_SUPABASE_PROJECT_ID`, `VITE_VAPID_PUBLIC_KEY`
- Server (Supabase Edge Function Secrets, **client bundle'a girmez**):
  `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `RESEND_API_KEY`, `EMAIL_FROM`,
  `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PORTAL_URL`
- **Sadece `VITE_*` bundle'a girer.** `sk_`, `sb_secret_`, `SERVICE_ROLE`
  gibi anahtar prod bundle'ında olmamalı — `SEC-08` regresyon testi.

### Bilinen açıklar (PRD.md §6)
Denetime başlamadan `docs/PRD.md`'yi oku; kapalı olanları tekrar açma.
- `#1` decisions kolonları — ✅ kapalı (`20260806180000_dsor_fix.sql`)
- `#2` profiles trigger — ✅ kapalı (aynı migration + backfill)
- `#3` TopBar arama — ✅ kapalı (GlobalSearch.tsx 320 satır)
- `#4` My Tasks Unassigned — ✅ kapalı (MyTasksView "Sahipsiz işler")
- `#5` emoji → Lucide — P3, Leaderboard'da 1 kasıtlı emoji
- `#6` RICE/ICE + feedback→feature — math var (`src/lib/rice.ts`), Product UI entegrasyonu **açık**
- `#7` Analytics diğer modül metrikleri — **açık** (yalnız bugs)
- `#8` Approval hatırlatma edge function — **açık** (Resend hazır)
- `#9` snapshot delta NaN — ✅ kapalı

Bu prompt'u çalıştırmadan önce bu listeye tekrar bak.

### Test altyapısı
- **Vitest:** `src/**/*.test.ts(x)`, jsdom, `src/test/setup.ts`, ~318+ test
- **Fixture factories:** `src/test/fixtures/index.ts` — user/workspace/
  project/task/bug/opportunity/quote/finTransaction/approval + `buildScenario()`
- **Playwright:** `playwright.config.ts` — dev server 127.0.0.1:8080
  - Aktif suite: `e2e/smoke.spec.ts`, `ux-flows`, `hard-crawl`, `authed-crawl`,
    `role-flows`, `write-affordances`, `rls-matrix`, `command-palette`,
    `cross-scope`, `kanban-dnd`, `notifications`, `project-lifecycle`,
    `task-lifecycle`, `shell-consistency`, `qa-multi-profile`
  - Skeleton: `e2e/skeletons/` (test.skip'li 52 senaryo — staging DB olunca aktif)
  - Regresyon: `e2e/regression/` (`decisions`, `my-tasks-unassigned`)
- **CI:**
  - `.github/workflows/ci.yml` (verify: `lint`, `typecheck`, `test`, `build`)
  - `.github/workflows/e2e.yml` (env-gated Playwright, secret'sız skip)

### Scripts (`package.json`)
```
npm run dev         # vite
npm run build       # vite build
npm run lint        # eslint
npm run typecheck   # tsc -p tsconfig.app.json --noEmit
npm run test        # vitest run
npm run test:e2e    # playwright test
```

### Dokümanlar (okumadan başlama)
- `docs/PRD.md` — ürün gereksinimleri, bilinen açıklar
- `docs/TEST_COVERAGE.md` — sayfa sayfa test kapsamı
- `docs/TEST_COVERAGE_DETAILED.md` — 317 Given/When/Then senaryosu
- `docs/ROADMAP.md`, `docs/SSO.md`

---

## Operasyon kuralı

Kod'a rastgele dokunmadan önce **ürünü bütün olarak anla**. İlk saat mapping.

Bilmediğin bir modülün intent'i ne ise **tamamla, silme.** Örneğin:
- Automations sayfası boşsa ama `automations_rules` tablosu varsa: intent
  automation. Empty state + minimal CRUD tamamla, sayfayı gizleme.
- Whiteboards sayfası tsldraw benzeri bir intent gösteriyorsa: intent belli,
  eksikse iskeletini bırak + "Coming soon" değil "Empty" state.

Görsel dili koruyup akış-fonksiyonelliği kırmadıkça **UI'yi yeniden tasarlama.**

---

## Phase 1 — Tüm ürünün haritası

`src/App.tsx`'i **kod olarak** tara, sidebar'a güvenme.

Her rota için:
- Amaç
- Giriş noktaları (nereden buraya gelinir)
- Çıkış / geri navigasyon
- Veri kaynağı (hangi hook / tablo)
- Server / RPC dependency
- Permission gerektiriyor mu (`useWorkspacePermission(...)`)
- Primary action (yeni proje, task ata…)
- Secondary action (edit, delete, share)
- Refresh sonrası beklenen state

Ayrıca:
- **Orphan sayfalar:** `src/pages/*.tsx` tara, `App.tsx`'te route'u olmayan
  dosya var mı?
- **Broken links:** `NavLink`, `Link`, `useNavigate` çağrılarını grep'le,
  hedeflenen path App.tsx'te tanımlı mı?
- **Render ediyor ama çalışmıyor:** her rotayı live'da veya Preview'da açıp
  boş / fake içerik var mı gör.

## Phase 2 — Mock / demo / placeholder avı

Repo genelinde arama:
```
grep -rn -iE "mock|demo|dummy|fake|sample|placeholder|hardcoded|todo|fixme|hack|temporary|coming soon|not implemented|lorem|test user" src/
```

UI component'lerinin içinde deklare edilen array/object'lere bak:
```ts
const tasks = [{ id: 1, title: "Design homepage" }, ...]
const users = [...]
const notifications = [...]
```

Her biri için karar ver:
- **Legitimate static config** (SNAPSHOT_FIELDS, STATUS_COLORS gibi) → dur
- **Fixture / test kodu** (src/test/fixtures) → dur
- **Ürün mock'u** (Founder Home'daki "Bekleyen onay: 5") → **fix et**,
  gerçek hook'a bağla
- **Kazara shipped demo içerik** → sil, empty state ekle

WorkHub-spesifik dikkat noktaları:
- `FounderHome` metrik kartları — gerçekten `founder-metrics` hook'una bağlı
  mı, yoksa hardcoded değer mi?
- `Dashboard` widget'ları — `useMetric` hook'ları var mı?
- `Analytics` — bugs dışında CRM/Finance/Goals veri gösteriyor mu (PRD-#7)?
- `Leaderboard` — gerçek `gamification-hooks` bağlı mı?
- `Insights` — real metrics mi placeholder mı?

Mock veri legitimate'iyse **sabit config**'e taşı, veri gibi kalmasın.

## Phase 3 — User journey audit

Live URL'ye karşı doğrula (destructive işlem yapma):
https://sparkworkhub.com

Auth:
- `/auth` sign-in / sign-up tab (submit butonu **"Create workspace"**, "Sign
  up" değil — regression: `e2e/qa-multi-profile.spec.ts` düzeltmesi)
- Refresh sonrası oturum (`persistSession: true`)
- `/invite/:token` accept
- Password reset (varsa)
- `/auth`'a düşürme davranışı

Workspace / Onboarding:
- İlk sign-up sonrası `handle_new_user()` trigger `profiles` satırı oluşturuyor
  mu (fix ediliyor — regresyon test)
- `/onboarding` 4 adım — Step 1 (company info) → Step 2 (modüller) → Step 3
  (davetler) → Step 4 (finish + seed)
- Refresh mid-onboarding devam ediyor mu
- `create_workspace` RPC + `seed_default_permissions`
- WorkspaceSwitcher işi
- Aktif workspace persist (`user_active_workspace`)

Projects:
- `/projects` — 4 stat card gerçekten `useWorkspaceIssues` bağlı mı
- "Yeni proje" CTA yalnız `useWorkspacePermission('projects','create')` true
  ise (owner/admin/manager)
- `/projects/new` → oluşturma → `/projects/:id`
- Board (Kanban DnD) — task status update + activity_log
- List / Timeline / Calendar / Files / Messages / Members sekmeleri
- Silme cascade (task_comments, project_files)
- Portfolio bağlama

Tasks:
- `/tasks` gruplama (Recently assigned / Today / Upcoming / Next week / Later)
- "Sahipsiz işler" (F16, Unassigned bucket) — hâlâ görünüyor mu (regresyon)
- QuickAddIssue enter ile ekle
- Inline status değişimi + activity_log

Bugs:
- `/bugs/new` → `BUG-#####` sıra atlamıyor mu (race testi var)
- Attachment private bucket, signed URL
- Status akışı open → in-progress → resolved → closed → reopened

Cycles / Roadmap / Portfolios / Teams / Templates / Workload / Insights /
Timesheet / Custom Fields / Workflow States / Docs / Chat / Whiteboards /
Service Desk / Meeting Notes / Saved Views / API Tokens / Client Portals /
Agent Runs / Leaderboard — her biri için:
- Empty state
- Create → save → refresh → görünüyor mu
- Delete cascade
- Permission enforcement (`useWorkspacePermission`)

CRM:
- Pipeline board drag → stage değişimi
- Opportunity numarası (`Q-`, `C-` sıra)
- Quote item hesap (qty × unit − discount + KDV)
- **Won-deal otomasyonu** → `crm_opportunity_won_flow` → `crm_customers` +
  Founder Inbox'a ilk fatura onayı — bu WorkHub'ın signature akışı

Finance:
- `fin_cash_balance` çok para birimli toplam
- `fin_burn_rate` 3 aylık ortalama
- `fin_lookup_fx` eksik oran davranışı
- Kapatılmış dönem — insert reddi

Goals / Risks / Decisions:
- `decisions` insert `verdict`, `confidence`, `actual_outcome` alanlarıyla
  (kolonlar migration'da eklendi — 400 dönmemeli)
- Karar silinemez, revize (v2)

Founder Inbox:
- 7 approval tipi (expense, hiring, contract, discount, budget_change,
  payment, leave)
- approve/reject/info/delegate/snooze
- Çift onaycı race (409 idempotency)
- 48h bekleme → Bottleneck Radar

AI Chat:
- Sohbet başlat, geçmiş kaydı
- "Move to Inbox" → Founder Inbox'a approval

Her mutation için:
```
UI action → RPC/insert → RLS check → DB write → response → UI update
→ refresh → DB'den okuma → aynı state
```

Optimistic UI success kanıtı **değil**. `network` tabında POST/PATCH gör.

## Phase 4 — Clickability audit

Her interactive element:
- button, icon button, dropdown item, context menu
- card / tab / breadcrumb / avatar menu
- sidebar item, link, command palette komutu, CTA
- toggle / checkbox / pagination / kısayol

Şunlardan biri olmalı:
1. Gerçek intended action
2. Valid navigasyon
3. Explicit `disabled` + tooltip'te sebep
4. Product amacı yoksa **kaldır**

Icon-only butonlarda `aria-label` mutlaka olmalı. Tooltip zorunlu.

## Phase 5 — Form audit

Bulunacak formlar (min):
- `/auth` sign-in, sign-up
- `/onboarding` 4 adım (Acme Inc., SaaS, Turkey, USD…)
- `/projects/new`, `/bugs/new`, `/assets/new`
- Task create (`QuickAddIssue`)
- Comment box (`RichTextEditor`)
- Decision create
- Approval action modal
- CRM opportunity create, quote items
- Finance transaction
- Custom field builder
- Workspace Settings — invite member
- Settings — profile, password, notification prefs

Her form için:
- Required field validation (client + server)
- Trim / max-min length
- Submit loading state (`isPending`, `Loader2` spinner)
- Server error toast (Sonner)
- Success feedback + persistence check
- Cancel / dirty state
- Double-submit guard

Formun `toast.success` göstermesi, backend'in başarılı olduğunu **kanıtlamaz**.
Response status kontrolü olmalı.

## Phase 6 — State completeness

Her data-driven sayfa için:

**Loading:** `Skeleton` component'i kullan (mevcut kalıp).
**Empty:** başlık + CTA (örn. "İlk projeni oluştur"). Boş şablonlar unutulmasın:
- Projects, Tasks, Bugs, CRM, Finance, Goals, Decisions, Docs, Chat, Meetings…
**Error:** RLS 403 / network 5xx / boş dönüş — sessizce empty gösterme, açıkla.
**Success:** mutation toast'ı + optimistic invalidation.
**Unauthorized:** UI ekleme butonu bile göstermez (`useWorkspacePermission`).
**Missing resource:** `/projects/00000000-0000-0000-0000-000000000000` — 404
sayfası veya "Bulunamadı" empty state, sonsuz spinner değil.
**Partial data:** `assignee_id` null → "Sahipsiz", `due_date` null → "—".

## Phase 7 — Navigation consistency

- AppRail active route highlight
- AppSidebar cluster collapse state (localStorage)
- Breadcrumb (varsa)
- Browser back/forward — Kanban board → task detay → back → board sıra
  bozulmamış
- Modal close (ESC, X, backdrop)
- Deep link: `/projects/:id/edit` refresh → aynı sayfa
- Command palette (`e2e/command-palette.spec.ts` var) — `Cmd+K`
- ShortcutsProvider: `g p → /projects`, `g t → /tasks`, `?` yardım

URL truth source. Client state'e bağlı navigasyon yok.

## Phase 8 — Database & data integrity

- Her tablo `workspace_id` sütununa sahip mi (tenancy)
- RLS policy var mı — kilitli değilse tehlike
- FK cascade: proje silindiğinde task_comments'a ne oluyor
- Nullable field'lar assumed non-null olmuyor mu (`t.assignee_id!` gibi)
- **Workspace sızıntısı testi:** kullanıcı A `.eq('id', wB_row_id)`
  denerse 0 satır dönmeli (RLS)
- `has_workspace_permission` RPC — insert/update/delete için server-side guard

Frontend filtering asla güvenlik değil. Backend RLS zorunlu.

## Phase 9 — Permissions / roles

`workspace_role` enum'ının 6 değerini gerçek olarak test et:
owner / admin / manager / member / viewer / guest.

Her mutasyon için:
- Kim yapabilir? (`useWorkspacePermission('projects','create')` gibi)
- UI'da butonlar gizleniyor mu (`canCreate && <Button />`)
- Server'da yeniden kontrol ediliyor mu (RLS insert policy)

Hidden buton = güvenlik değil. Direct RPC/insert deneyle.

## Phase 10 — Search / filter / sort

- **GlobalSearch** (`src/components/GlobalSearch.tsx`) — 320 satır command
  palette. Gerçek Supabase query yapıyor mu? Projects / tasks / bugs / decisions.
- Modül filtreleri combine ediyor mu (status + priority + assignee)
- Clear all filters çalışıyor mu
- Sıralama deterministik (`ORDER BY created_at DESC` gibi)
- URL state — filtre paylaşılabilir mi
- Zero result state
- Yeni oluşturulan kayıt discoverable mi (invalidate + refetch)

## Phase 11 — Notifications & activity

- `notification-hooks.ts` — gerçek event üretimi mi?
- Task assign → assignee bell'inde badge artıyor mu (`notifications.spec.ts`
  fail veriyor — trigger sorunu olabilir, inceleyip fix et)
- Mention → yalnız mention edilene bildirim
- Mark all as read
- Realtime sub → Supabase channel
- Activity log (`activity_log`, `task_activity`) — her write'ta satır

## Phase 12 — Settings audit

Her setting:
- `/settings` (kullanıcı profili, password, notification prefs, tema)
- `/notification-settings` (event × kanal matrisi)
- `/workspace/settings` (workspace bilgi, invites, permission matrix)
- `/api-tokens` (create, revoke)
- `/portals`, `/integrations`, `/custom-fields`, `/workflow-states`,
  `/automations`, `/templates`, `/saved-views`

Change → save → refresh → **davranışta gerçekten değişti mi**?

Kaydediyor gibi görünüp kaydetmeyen ayar → kaldır ya da fix et.

## Phase 13 — Responsive audit

**375, 390, 768, 1024, 1440+.**
Landing responsive olması yetmez — auth'lu ürün ekranlarında dolaş:
- AppRail 375'te drawer'a mı dönüyor
- AppSidebar collapse buton var mı 768'de
- Kanban board mobil'de yatay scroll mu, karışıyor mu
- Modal ekrandan taşıyor mu
- Tabloların horizontal overflow scroll'u var mı

## Phase 14 — UX detayları

- Page title (`document.title`) her sayfa için farklı ve anlamlı
- Favicon
- Broken avatar → fallback initials
- Confirmation destructive action'lar için (proje sil, member kick, workspace terk)
- Undo where appropriate (bildirim silindi → undo toast)
- ESC modal kapat, focus trap
- Timezone (`toLocaleDateString('tr-TR')` — mevcut, tutarlı mı)
- Invalid Date, huge unformatted numbers (1234567.89 → "1.234.567,89 ₺")
- Toast success ama server error yok mu
- Buton `isPending` sonsuz kalmıyor mu (mutation onError'da reset)

## Phase 15 — Code-level failure hunt

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

- TypeScript error'ları — `any` ile susturma
- Broken import'lar
- React key uyarıları
- Invalid hooks çağrıları
- Unhandled promise rejection'lar
- Effect dep array eksiklikleri
- Console.error'lar dev'de bile

Build **başarılı olmalı**. `npm run build` sıfır warning ideal.

## Phase 16 — Browser / runtime test

Lokal:
```bash
cp .env.example .env.local
# VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY doldur
npm run dev
```

Playwright ile critical flows:
```bash
npm run test:e2e -- e2e/smoke.spec.ts e2e/ux-flows.spec.ts
```

Live env varsa:
```bash
npm run test:e2e -- e2e/qa-multi-profile.spec.ts
```

Browser DevTools:
- Console error'ları
- Network → 4xx/5xx
- CORS
- Duplicate API calls (dep array bugları)
- Race conditions

## Phase 17 — Live vs local

`https://sparkworkhub.com` üstünde:
- Missing env → boş render, error boundary
- Public URL / auth callback
- Base URL (Vercel rewrites, `vercel.json`)
- Cache (staleness)

Destructive işlem yapma. Prod'daki gerçek kullanıcı verisine dokunma.

## Phase 18 — Security

- `sk_`, `sb_secret_`, service_role bundle'da **hiç olmamalı**
  ```bash
  npm run build
  grep -rE "sb_secret_|SERVICE_ROLE|sk_live_" dist/
  ```
- RLS bypass: anon key ile hassas tablodan `SELECT *` — 0 satır
- SQL injection: search input — hiç etkisi olmamalı (Supabase parametrize)
- XSS: task title `<img onerror=alert(1)>` — escape edilmiş
- CSRF: Cross-origin POST → 403 (SameSite cookie)
- CSP header (`vercel.json` veya meta)
- Signed URL süresi — dolmuş URL 403
- Stack trace user'a expose olmuyor mu

## Phase 19 — Environment variables

`.env.example` referans. Uygulama:
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` **zorunlu**.
  Boşsa app render **etmemeli** — clear error mesajı vermeli
  (şu an: crash. En azından `<ErrorBoundary>` fallback).
- Server-only (Edge Function Secrets): VAPID, RESEND, STRIPE
- Never leak: hepsi Supabase Edge Function Secrets ekranında olmalı.

## Phase 20 — Product coherence

Ürünü yeni user gibi kullan:
- Landing → sign up → onboarding → dashboard
- Sonraki adım ne? Öneri var mı ("İlk projeni oluştur" CTA)
- Dashboard sayıları gerçek mi (Founder Home Company Pulse)
- Bir proje oluşturunca: her yerde (Projects list, Portfolios, Company Graph)
  görünüyor mu
- Bir task'ı silince: my tasks, project board, workload, activity log —
  hepsinden gitmiş mi

---

## Absolute mock rule

Şu değerlerin **gerçek DB'den** geldiğinden emin ol:
- Founder Home metrikleri
- Dashboard kartları
- Analytics grafikleri
- CRM forecast
- Finance runway
- Workload heatmap
- Leaderboard sıralama
- Notification badge sayısı
- Recent activity feed

Değilse: **gerçek hook'a bağla veya empty state göster**.

---

## Do not paper over bugs

Yasak yaklaşımlar:
- `try/catch` içinde `console.log` + fake success
- Hardcoded fallback data
- Hiding broken component'ler
- Çalışması gereken functionality'i disable etmek
- Test'leri comment out'lamak
- `as any` ile önemli type error'ları susturmak
- Validation kaldırmak
- Auth/permission bypass

Root cause. Fix. Verify.

---

## Change discipline

- Mevcut mimari korunur (React Query, RLS, shell, DomainWorkspace)
- Mevcut component'ler tercih (shadcn/ui, Radix, Lucide)
- Yeni dependency = son çare
- Rewrite yok
- Migration lazımsa: **forward-safe** olmalı (drop column yok, add column
  nullable + backfill + not null cycle)
- Prod data destroy yok
- Secret modify yok

---

## Tests

Onarılan her önemli bug için hedefli test ekle:
- `src/lib/*.test.ts` — pure util için (mevcut kalıp)
- `src/components/*.test.tsx` — RTL (StatusBadge, SeverityBadge pattern)
- `e2e/regression/` — canlı regresyon (my-tasks-unassigned pattern)
- `e2e/skeletons/` — kapsam iskeleti (staging DB olunca aktif)

Snapshot test dışı. Anlamlı.

---

## Definition of done

WorkHub üretime **yalnızca şu durumda hazırdır**:
- `npm run build` yeşil
- `npm run typecheck` yeşil (veya justify)
- `npm run lint` yeşil (veya justify)
- `npm run test` yeşil (318+ passing minimum)
- E2E: smoke + ux-flows + role-flows + write-affordances yeşil
- Production console error'sız
- Critical rota direct-load'da çalışıyor
- CRUD refresh sonrası persist
- Production-facing mock yok
- Dead major buton yok
- Disconnected sayfa yok
- Loading / empty / error state'ler var
- Destructive action confirm'li
- Permission server-side enforce
- Workspace izolasyon respect
- Ayarlar gerçekten kaydediyor
- Mobil 375/768 kullanılabilir
- Search / filter / sort çalışıyor
- Auth flows coherent
- Dashboard'lar gerçek veri
- Env dokümante
- Deep-link/refresh çalışıyor

---

## Execution strategy

**Pass 1** — Mimari + ürün haritası (`src/App.tsx`, `nav-config.ts`, `PRD.md`)
**Pass 2** — Mock / placeholder / dead code / suspicious feature avı
**Pass 3** — User journey trace (6 rol × 15 flow)
**Pass 4** — P0/P1 fix
**Pass 5** — Missing state + UX inconsistency fix
**Pass 6** — Permissions / data integrity / security
**Pass 7** — Build / type / lint / vitest
**Pass 8** — Playwright / browser runtime
**Pass 9** — Baştan re-audit

Kodu değiştirdin diye "fix" değil. **Verify.**

---

## Priority

**P0 — Prod blocker**
- Auth kırık, data loss, workspace veri sızıntısı, app crash, build fail,
  critical flow imkansız

**P1 — Major**
- Major action persist etmiyor, dead primary CTA, project/task lifecycle
  kırık, önemli sayfa disconnected, fake dashboard, permission failure

**P2 — Product quality**
- Unutulmuş state, confusing nav, inkonsistent behavior, responsive
  bozukluk, missing confirm, stale UI

**P3 — Polish**
- Spacing, microcopy, minor cosmetic

**P0/P1 önce.** P3 için P0-P2 kalırken zaman harcama.

---

## Final deliverable

Tüm audit + fix tamamlandıktan sonra kısa rapor:

### 1. Prod verdict
`READY FOR PROD` **veya** `NOT READY FOR PROD`.
Bilinen P0/P1 kaldıysa READY deme.

### 2. Ne fix edildi
Kategorize et:
- Core flows
- Backend / data
- Navigation
- UI states
- Permissions / security
- Responsive
- Build / runtime

### 3. Kalan sorunlar
Her biri için:
- Severity (P0/P1/P2)
- Rota / feature (`/projects/:id/edit`)
- Sebep
- Önerilen fix

Gizleme. **Prod blocker'lar gizli kalmasın.**

### 4. Verification results
- Production build: yeşil/kırmızı
- Lint, typecheck, vitest, playwright
- Browser runtime
- 6 rol × 15 critical journey

### 5. Mock audit
Prod'da mock/demo/fake stat kaldı mı — evet/hayır, hepsi.

### 6. Route audit
- Kontrol edilen rota sayısı (65+)
- Disconnected orphan sayfa
- Dead link
- Çözülmemiş rota sorunu

### 7. Production blockers
Son satır olarak birebir:
```
Production blockers remaining: X
```
X = **gerçek** sayı.

---

**Standart:**
"MVP için idare eder" değil.
**Her görünen parça, tek tutarlı, kalıcı, prod-grade bir ürünün parçası gibi
davranmalı.**

Repo'yu inceleyerek başla. Sonra audit + fix loop.
