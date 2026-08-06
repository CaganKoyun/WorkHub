# WorkHub — Master Roadmap

Bu doküman kullanıcıdan gelen **66 bölüm ve ~1500 maddelik**
kapsamlı Task & Work Management özellik listesinin **tamamını**
faz-faz haritalar. Hiçbir madde atlanmaz; ya çalışıyor (✅), ya bu
turda inşa ediliyor (🚧), ya da bir faza atanmış olarak sırada
bekliyor (Faz X).

## Faz Özeti

| Faz | Kapsam | Durum | Tahmini süre |
| --- | --- | --- | --- |
| **1** | Design tokens, shell, Linear task row, tracking ID | ✅ | (bitti) |
| **2** | Cmd+K palette, subtasks, dependencies, Global Issues | ✅ | (bitti) |
| **3A/B** | Cycles/Sprints, Backlog vs Active | ✅ | (bitti) |
| **3C** | Teams sayfası + Members/Roles UI | 🚧 | 1-2 gün |
| **3D** | Onboarding wizard — Linear-style 5 adım | 🚧 | 1 gün |
| **4** | Task velocity paketi | ⏳ | 2-3 hafta |
| **5** | Collaboration paketi (Docs, Chat, Whiteboards, Automation, Forms) | ⏳ | 2-3 ay |
| **6** | Enterprise (SSO/SCIM, Audit, API/SDK, Portal, Compliance) | ⏳ | 1-2 ay |
| **7** | Platform (Mobile, Desktop, AI Agents advanced) | ⏳ | 3-6 ay |
| **8** | Vizyoner (Gamification, formula fields, advanced AI, voice) | ⏳ | değişken |

**Toplam realistic effort:** 6-12 ay full-time engineering. Bu doküman
yerine hangi maddenin öne çekileceği kararı, müşteri geri bildirimi
geldikçe güncellenir.

---

## Legend

- ✅ **Bitti** — production'da çalışıyor
- 🚧 **In progress** — bu turda inşa ediliyor
- **Faz N** — o faza atanmış, sırada
- 🎯 Bir bölümün Linear/Asana/Slack/Notion signature'ı — önceliklendirdik
- 🔵 Faz 4 · 🟣 Faz 5 · 🟠 Faz 6 · 🔴 Faz 7 · ⚪ Faz 8

---

## 1. Organizasyon Yapısı

| Item | Status |
|---|---|
| Organization | Faz 6 |
| Workspace | ✅ |
| Company | ✅ (Company modülü var) |
| Department | ✅ (departments tablosu) |
| Business Unit | Faz 6 |
| Team | ✅ schema — UI Faz 3C 🚧 |
| Sub-team | Faz 6 |
| Space | Faz 5 |
| Folder | Faz 5 |
| Portfolio | Faz 5 |
| Program | Faz 5 |
| Initiative | Faz 5 |
| Goal | ✅ |
| Project | ✅ |
| Epic | Faz 4 (parent_task_id ile) |
| Milestone | Faz 4 |
| Cycle | ✅ |
| Sprint | ✅ (Cycle = Sprint) |
| Backlog | ✅ |
| Task | ✅ |
| Issue | ✅ |
| Ticket | Faz 5 (service desk) |
| Bug | ✅ |
| Feature | Faz 4 (task type extension) |
| Story | Faz 4 |
| Subtask | ✅ |
| Checklist item | Faz 4 |
| Personal task | ✅ (My Tasks) |
| Recurring task | Faz 4 |
| Template task | Faz 4 |
| Private task | Faz 6 |
| Shared task | ✅ (workspace RLS) |
| External client task | Faz 6 (client portal) |

## 2. Task Türleri

Tüm 30 tip Faz 4'te `task_type` enum + UI seçici olarak eklenecek. Şu an
Standard, Bug (ayrı modül), Decision, Approval, Risk, Goal, Idea var.

| Grup | Status |
|---|---|
| Standard task | ✅ |
| Bug | ✅ |
| Feature request | Faz 4 |
| User story | Faz 4 |
| Epic | Faz 4 |
| Improvement | Faz 4 |
| Technical debt | Faz 4 |
| Research | Faz 4 |
| Design task | Faz 4 |
| Documentation task | Faz 4 |
| Meeting action | Faz 5 |
| Approval request | ✅ |
| Review task | Faz 4 |
| QA task | Faz 4 |
| Incident | Faz 5 |
| Support ticket | Faz 5 |
| Change request | Faz 5 |
| Risk | ✅ |
| Decision | ✅ |
| Idea | ✅ |
| Opportunity | ✅ (CRM) |
| Client request | Faz 5 |
| Marketing/Sales/HR/Finance/Legal/Procurement/Operations task | Faz 4 (task_type filter) |
| Custom task type | Faz 4 |

## 3. Task Oluşturma

| Item | Status |
|---|---|
| Hızlı task oluşturma | ✅ |
| Global task oluşturma butonu | ✅ (sidebar "New issue" + Cmd+K) |
| Klavye kısayolu | Faz 4 (single-key shortcuts) |
| Doğal dille task oluşturma | Faz 5 (AI) |
| E-postadan task | Faz 5 (email-to-task inbound) |
| Mesajdan task | Faz 5 (Slack integration) |
| Slack mesajından task | Faz 5 |
| Form yanıtından task | Faz 5 (Forms) |
| Toplantı notundan task | Faz 5 |
| Takvim etkinliğinden task | Faz 5 |
| Dokümandan task | Faz 5 (Docs) |
| Yorumdan task | Faz 4 |
| API üzerinden | Faz 6 |
| Webhook ile | Faz 6 |
| Mobil paylaşım menüsü | Faz 7 |
| Sesli komut | Faz 8 |
| CSV/Excel içe aktarma | Faz 4 |
| Toplu task oluşturma | Faz 4 |
| Başka projeden kopyalama | Faz 4 |
| Template üzerinden | Faz 4 |
| Tekrarlanan | Faz 4 |
| Draft task | Faz 4 |
| Inbox'a hızlı yakalama | ✅ (Approvals inbox + My Tasks) |
| Belirli projeye otomatik yönlendirme | Faz 5 (automation) |
| Varsayılan alanlarla | Faz 4 |
| Duplicate kontrolü | Faz 5 (AI) |

## 4. Task Temel Alanları

Kurulmuş alanlar: id, tracking_id, title, description, status, priority,
assignee_id, reporter_id, due_date, estimated_hours, actual_hours,
story_points, cycle_id, project_id, parent_task_id, tags, position,
completed_at, created_at, updated_at, workspace_id.

**Eksik alanlar → Faz 4** (custom fields tablosu ile birden fazla açılır):
Multiple assignees, Reviewer, Approver, Watcher, Collaborator,
Business value, Impact, Urgency, Risk, Confidence, Cost, Budget,
Revenue impact, Customer impact, Complexity, Difficulty, Department,
Location, Client, Account, Product area, Release, Version, Environment,
Source, Requester, External reference, Task health, Task score.

## 5. Task Açıklaması ve İçerik

| Item | Status |
|---|---|
| Textarea açıklama | ✅ (basit textarea) |
| Rich-text editor | Faz 4 (Tiptap) |
| Markdown | Faz 4 |
| Başlıklar / listeler / tablo / alıntı / kod bloğu | Faz 4 |
| Checklist / Nested checklist | Faz 4 |
| Callout, renkli metin, highlight | Faz 4 |
| Mention (@user, @task, @project) | Faz 4 |
| Emoji, GIF | Faz 4 |
| Görsel/Video/Ses kaydı/Dosya | ✅ (attachments) |
| Link preview | Faz 4 |
| Figma/Google Docs/YouTube/Loom/GitHub embed | Faz 5 |
| Doküman/Spreadsheet/Whiteboard embed | Faz 5 |
| Task/Project referans | Faz 4 (autocomplete) |
| Canlı veri bloğu | Faz 5 (Docs) |
| İçindekiler | Faz 5 |
| Versiyon geçmişi + diff | Faz 4 |
| Şablonlar | Faz 4 |

## 6. Status ve Workflow

| Item | Status |
|---|---|
| Sabit 5 status (backlog, todo, in_progress, review, done) | ✅ |
| Custom status per team/project | Faz 4 🎯 |
| Status kategorileri | Faz 4 |
| Genişletilmiş status seti (triage, waiting, blocked, design/code review, QA, testing, approval, ready for release, canceled, duplicate, won't do, archived) | Faz 4 |
| Custom workflow (transition kuralları, zorunlu sıra) | Faz 5 |
| Belirli statülere geçiş yetkisi | Faz 5 |
| Status değişiminde zorunlu alan | Faz 5 |
| Status değişiminde otomasyon | Faz 5 |
| Status geçmişi | ✅ (task_activity) |
| Status'ta geçirilen süre | Faz 4 |
| Status SLA | Faz 5 |
| Status bazlı renkler | ✅ |
| Status bazlı bildirim | Faz 4 |
| Status bazlı görünürlük | Faz 5 |

## 7. Önceliklendirme

| Item | Status |
|---|---|
| No/Low/Medium/High/Urgent | ✅ |
| Critical, P0-P4 | Faz 4 (enum extend) |
| Custom priority | Faz 5 |
| Priority score (Impact, Urgency, Effort, Confidence) | Faz 4 |
| RICE, ICE, WSJF, MoSCoW | Faz 4 |
| Impact/Effort, Value/Effort, Risk/Impact Matrix | Faz 4 |
| Weighted scoring, Stack ranking | Faz 4 |
| Drag-and-drop backlog sıralaması | Faz 3C (position field var) |
| Manual rank | ✅ (position) |
| Otomatik öncelik önerisi | Faz 5 (AI) |
| Priority change history | ✅ (task_activity) |

## 8. Atama ve Sorumluluk

| Item | Status |
|---|---|
| Tek assignee | ✅ |
| Çoklu assignee | Faz 4 (junction table) |
| Task owner | ✅ (reporter_id + assignee_id) |
| Project owner | ✅ |
| Reviewer/Approver/Watcher/Contributor/Collaborator | Faz 4 (task_participants junction) |
| RACI desteği | Faz 5 |
| Takıma atama | Faz 3C |
| Role atama | Faz 3C |
| Queue atama | Faz 5 (service desk) |
| Round-robin, workload-based, skill-based, location-based, department-based auto-assignment | Faz 5 |
| Manuel yeniden atama | ✅ |
| Geçici devir / vekalet | Faz 6 |
| Assignee geçmişi | ✅ |
| İzinli olduğunda yönlendirme | Faz 6 |
| Unassigned task kuyruğu | ✅ (`useUnassignedTasks`) |

## 9. Tarih ve Planlama

Var: start_date (project), due_date, estimated_hours, actual_hours,
completed_at.

Eksik → **Faz 4:** başlangıç saati, bitiş saati, tahmini süre birimi,
working days, hafta sonu/tatil hariç, organizasyon takvimi, takıma
özel takvim, timezone, deadline reminder, önceden hatırlatma, otomatik
kaydırma, dependency ile kaydırma, baseline, snooze/postpone, calendar
block, Google/Outlook two-way sync.

## 10. Tekrarlanan Görevler

**Faz 4 — tek toplu iş:** yeni `task_recurrences` tablosu,
frequency (daily/weekly/monthly/yearly/custom cron), end_date/count,
copy alt görevleri/checklist/dosyaları, assignee/tags koru, geçmiş.

## 11. Alt Görev ve Checklist

| Item | Status |
|---|---|
| Subtask + nested | ✅ schema, UI ✅ |
| Checklist / nested checklist | Faz 4 (rich text içinde `[ ]`) |
| Checklist assignee/due/comment/attachment | Faz 4 |
| Checklist template | Faz 4 |
| Checklist ↔ task dönüşüm | Faz 4 |
| Alt görevleri bağımsız board'da | Faz 4 |
| Parent ilerleme etkisi | Faz 4 (auto-progress) |
| Parent kapanmadan alt görev kontrolü | Faz 5 |

## 12. Task İlişkileri

| Item | Status |
|---|---|
| Parent/Child/Subtask | ✅ |
| Blocks/Blocked by | ✅ |
| Depends on/Required by | ✅ (alias) |
| Relates to / Duplicate of / Causes / Tests / Implements / Follows / Precedes / Part of | Faz 4 (relation_type enum) |
| Custom relationship | Faz 5 |
| Cross-project/team/external dependency | ✅ (workspace_id RLS) |
| Dependency map | Faz 4 (görselleştirme) |
| Circular dependency uyarısı | Faz 4 |
| Otomatik tarih güncelleme | Faz 5 |

## 13. Kanban ve Board

Var: Board tab, kolonlar (status), dnd-kit sürükle-bırak, card cover,
compact/detailed card. Custom column/swimlane/WIP limit/aging vs → **Faz 4**.

| Item | Status |
|---|---|
| Board / List / Column / Card | ✅ |
| Drag-and-drop | ✅ |
| Custom column (assignee, priority, team, project, epic) | Faz 4 |
| Swimlanes | Faz 4 |
| Horizontal/Vertical grouping | Faz 4 |
| Filter/Sort/Search | ✅ (Global Issues), board içi Faz 4 |
| Card cover/color/aging/compact/detailed | Faz 4 |
| Column WIP limit | Faz 4 |
| Column task count / effort total / collapse / hide | Faz 4 |
| Quick add card | ✅ |
| Multi-select / Bulk move / edit / assign / archive | Faz 4 |
| Board templates | Faz 4 |
| Public/Private/Team/Cross-project/Personal board | Faz 5 |

## 14. Liste ve Tablo Görünümü

Şu an: List view + basit filter. Spreadsheet-like advanced → **Faz 4**.

| Item | Status |
|---|---|
| List view | ✅ |
| Table view (spreadsheet) | Faz 4 |
| Inline editing / column resize / reorder / pin / hide / freeze | Faz 4 |
| Group by / multi-level | ✅ (Issues page) |
| Sort / multi-sort | Faz 4 |
| Advanced filter + saved | Faz 4 |
| Conditional formatting | Faz 5 |
| Calculated / Formula / Rollup / Summary / Aggregation | Faz 6 |
| Export / Print | Faz 4 |

## 15. Timeline ve Gantt

Var: basit ProjectTimelineTab. Advanced → **Faz 4**.

- Baseline, Critical path, Slack time, Drag extend/move, Zoom day..year,
  Group by assignee/project/team/epic/status, Unscheduled panel,
  Workload overlay, Capacity overlay, Planned vs actual, Delay highlight,
  Dependency conflict, Export PDF/image, Shareable → **Faz 4-5**

## 16. Calendar Görünümü

Var: proje kalender tab. Global + Team/Personal + external sync → **Faz 4**.

## 17. Diğer Gösterim Şekilleri

| View | Status |
|---|---|
| Board | ✅ |
| List | ✅ |
| Table | Faz 4 |
| Calendar | ✅ (project) — global Faz 4 |
| Timeline / Gantt | ✅ (proje) |
| Roadmap | Faz 4 |
| Backlog | ✅ |
| Sprint board | Faz 4 (Cycle board) |
| Cycle view | ✅ (Cycles page) |
| Workload | Faz 4 |
| Portfolio | Faz 5 |
| Dashboard | ✅ (Founder Home) — özelleştirilebilir Faz 5 |
| Activity | ✅ (task_activity) |
| Map | Faz 5 |
| Mind map | Faz 5 |
| Whiteboard | Faz 5 |
| Org chart | Faz 6 |
| Matrix | Faz 4 (priority matrix) |
| Form | Faz 5 |
| Gallery | Faz 4 |
| Chart | ✅ (Dashboard) |
| Box view | Faz 5 |
| Team view | Faz 3C |
| My Tasks | ✅ |
| Inbox | ✅ (Founder Inbox) |
| Triage | Faz 4 |
| Queue | Faz 5 |
| Goals view | ✅ |
| Milestone view | Faz 4 |
| Dependency map | Faz 4 |
| Release view | Faz 5 |
| Incident view | Faz 5 |
| Client view | Faz 6 |
| CRM-like view | ✅ (CRM modülü) |

## 18. Backlog ve Triage

| Item | Status |
|---|---|
| Product/Team/Sprint/Bug/Idea backlog | ✅ (Backlog tab + Bugs) |
| Triage inbox / incoming requests | Faz 4 🎯 (Linear signature) |
| Accepted/Rejected/Duplicate/Needs info | Faz 4 |
| Auto-triage / Manual / Bulk | Faz 4 |
| Priority/Score sorting | Faz 4 |
| Backlog grouping/filter/search | ✅ (Issues page) |
| Backlog estimate/refinement/owner/SLA | Faz 4 |
| Triage routing/rules | Faz 5 |
| Duplicate/Similar/Auto-labeling/Auto-assign | Faz 5 (AI) |
| Spam/stale detection | Faz 5 |

## 19. Sprint ve Cycle Yönetimi

Cycles var (isim, number, tarih, status, goal, progress). Eksikler:
- Sprint capacity/velocity/planned/unplanned/carried-over/removed → **Faz 4**
- Burndown / Burnup / Scope change → **Faz 4**
- Auto-carry unfinished, cycle cooldown, sprint locking, mid-sprint warning,
  sprint completion report, team capacity → **Faz 4-5**
- Sprint retrospective / review → **Faz 5**

## 20. Estimation

Var: story_points, estimated_hours.

Eksik → **Faz 4:** Fibonacci/T-shirt UI, custom units, complexity/effort/
confidence estimate, remaining/actual, velocity, historical accuracy,
planning poker, anonymous, consensus, history, change warning.

## 21. Proje Yönetimi

Çekirdek var: description, owner, members, status, priority, dates, progress,
icon, template (kısmi), task list, board, timeline, calendar, dashboard, files,
messages, activity, goals, milestones, dependencies, decisions, budget, resources,
access, updates, archive, duplication, export, share link.

Eksik → **Faz 4-5:** Project brief (dedicated), project health, weekly status
update, automatic status summary (AI), template marketplace, project sharing.

## 22. Portfolio ve Program Yönetimi

**Faz 5 — tek modül:** Yeni `portfolios` tablosu (nested), Program, çoklu
proje overview, owner, health, budget, resource, team allocation, risk,
custom fields, timeline, dashboard, workload, reporting, comparison,
cross-project dependencies, strategic alignment, status update, exec summary,
automated report, sharing, templates.

## 23. Goals ve OKR

Goals modülü var. Eksik → **Faz 4-5:**
- Objectives + Key results split
- Manual/task-based/project-based/numeric/percentage/currency/boolean progress
- Confidence, health, check-in, reminder, dashboard, history, scoring
- Alignment map (görselleştirme)
- Task-to-goal, project-to-goal, initiative-to-goal connection

## 24. Milestone ve Release Yönetimi

Milestone kısmen var (project target_date). Full → **Faz 4:**
- Dedicated milestones tablosu
- Release/Version, release notes, checklist, tasks, blockers, readiness,
  approval, calendar, train, deployment tracking, environment, rollback,
  post-release review

## 25. Workload ve Kaynak Yönetimi

**Faz 4 — Workload view:** Team/Individual/Project/Portfolio workload,
daily/weekly/monthly capacity, task-count/hour/point-based, role-based,
availability, working hours, vacation, leave, holidays, over/under
capacity warning, allocation %, planned/actual, skill-based, drag-drop
reallocation, reassign, forecast, heatmap, utilization report,
billable/non-billable, contractor/external capacity, scenario planning.

## 26. Time Tracking ve Timesheet

**Faz 4 — büyük özellik:** yeni `time_entries` tablosu.
- Start/Stop/Pause/Global timer, task timer, manuel giriş, retroactive,
  range, mobile/desktop/browser extension
- Estimated/actual/remaining, billable/non-billable, hourly/cost rate
- Timesheet weekly/monthly, lock, reminder, audit
- Report by task/project/client/user/team, export, invoice generation
- Idle detection, automatic tracking, calendar-based entry

## 27. Yorum ve Task İçi İletişim

Var: task_comments, task_activity. Eksik → **Faz 4-5:**
- Threaded replies, emoji/GIF reactions, voice notes, screen recording,
  rich-text, code blocks, edit/delete/pin/resolve/assign/quote,
  share link, permissions, internal vs external, email reply, notification
  settings

## 28. Slack Benzeri İletişim

**Faz 5 — Büyük Modül (3-4 hafta):**
- Public/Private/Project/Team/Topic/Announcement channels
- Direct + Group messages, Threads, Mentions, Reactions
- Saved, Later, Pinned, Bookmarks, Scheduling, Editing
- File sharing, searchable history
- Channel topics/descriptions/templates
- Guest access, external org channels, cross-company
- Presence, Status, Custom status, Do not disturb
- Notification preferences, retention, export, compliance archive
- Analytics

## 29. Sesli ve Görüntülü Görüşme

**Faz 5 (Slack Huddles benzeri) — external provider (Daily.co veya LiveKit) entegrasyonu:**
- Instant audio/video call, Huddle, screen sharing (multiple)
- Huddle chat, reactions, live captions
- Recording (audio/video), transcript, AI meeting notes, summary,
  action item extraction
- Attendance, meeting link, calendar integration
- Background effects, noise cancellation, raise hand, breakout rooms,
  whiteboard, collaborative notes, task creation, meeting-to-task linking

## 30. Inbox ve Bildirim Merkezi

Var: Founder Inbox (approvals), notifications table (schema).
Eksik → **Faz 4:** Unified inbox with all kinds:
- Assigned to me, Mentions, Comments, Replies, Approvals,
  Due soon, Overdue, Status/Priority/Assignment changes,
  Project/Goal updates, Automation/Integration alerts,
  New request, Triage, Review request, Task completed/reopened,
  Dependency resolved/blocked
- Batch, grouping, mark read/unread, snooze, mute, follow/unfollow,
  filters, email/push/desktop/mobile, digest, daily/weekly, custom rules

## 31. Forms ve Talep Toplama

**Faz 5 — Form Builder modülü:**
- Public/Private/Internal/External forms
- Conditional/Required/Custom fields (all types)
- File upload, date, dropdown, multi-select, user, rating, number, currency,
  formula, hidden, defaults
- Branding, custom domain, permissions, anon/auth submissions
- Routing, auto-assign, auto-project, auto-label
- Submission confirmation, email, tracking, edit
- Analytics, templates, task creation from submission, duplicate detection

## 32. Approvals

Approvals modülü var (Inbox). Eksik → **Faz 5:**
- Single/Multiple approvers, sequential/parallel/majority/unanimous,
  conditional
- Approve/Reject/Request changes with comment
- Deadline, reminder, escalation, delegate
- History, audit log, status, template, automation
- External link, client approval, document/design/budget/legal approval

## 33. Automation

Signal rules var (5 sabit). Automation Builder → **Faz 5 — büyük modül:**
- Triggers: schedule, event, recurring, webhook, API, form, status, date,
  assignment, priority, comment, label, custom field, dependency, sprint,
  project, goal
- Actions: create task/subtask, update, move, assign, change status/priority,
  add/remove label, deadline, send message/email/notification, request
  approval, create doc/calendar event, add comment/watcher, archive,
  duplicate, trigger webhook, call external API
- Conditions, branching, logs, error handling, retry, rate limit
- Templates, AI-generated automation

## 34. Doküman ve Wiki

**Faz 5 — Notion-lite modülü (3-4 hafta):**
- Documents, Pages, Subpages, Wiki, KB
- Project brief, PRD, Meeting notes, Decision log, SOP, Tech/Product docs
- Rich text (Tiptap), Markdown, real-time coedit (Yjs)
- Comments (inline + doc-level), mentions, version history
- Permissions, public sharing, external sharing, templates
- TOC, backlinks, linked databases, embedded tasks, task creation from text
- Ownership, verification, expiration, analytics, search
- Export PDF/Markdown, import, approval, AI summary/translation

## 35. Canvas ve Whiteboard

**Faz 5 — Excalidraw integration veya custom canvas:**
- Infinite canvas, sticky, shapes, connectors, text, images, video, drawing
- Frames, sections, mind map, flowchart, user journey, process map, org
- Brainstorming, voting, timer, presentation mode
- Real-time cursors, comments, mentions
- Task creation from sticky, link task ↔ object
- Embed docs/websites, template library, export image/PDF, versions

## 36. Dashboard ve Raporlama

Var: Founder Home. Custom dashboards → **Faz 5:**
- Custom/Personal/Team/Project/Portfolio/Executive/Client/Real-time/Shared/
  Public dashboards
- Filters (date/team/project), permissions, templates
- Scheduled reports, email, PDF, CSV export
- Live data, drill-down, click-to-edit, full-screen, presentation
- Comments, subscriptions

## 37. Dashboard Widget'ları

Faz 5 dashboard modülünde: 40+ widget tipi (total/open/completed/overdue/
blocked/unassigned tasks by status/priority/user/project/team/client/label/
type, completion rate, project progress, goal progress, sprint/cycle
progress, velocity, throughput, lead time, cycle time, burndown/burnup,
cumulative flow, workload, capacity, utilization, time tracked,
billable, estimated vs actual, budget used, cost, revenue, risk, milestone;
pie/donut/bar/line/area/scatter/heatmap/gauge/number card/table/task
list/activity feed/calendar/timeline).

## 38. Agile ve Flow Metrikleri

**Faz 4** (Cycle üzerine kurulacak):
Velocity, throughput, lead time, cycle time, time in status, queue/wait
time, WIP, WIP limit, flow efficiency, cumulative flow, burndown/burnup,
sprint completion rate, scope change, planned vs completed, spillover,
reopened, blocked duration, escaped defects, defect rate, bug resolution
time, release/deployment frequency, change failure rate, MTTR, aging work,
stale tasks, estimate accuracy, capacity utilization, team predictability.

## 39. Arama

Var: GlobalSearch (Cmd+K) — title + tracking_id + workspace scoped.

Eksik → **Faz 4** (Postgres FTS) + **Faz 5** (semantic):
Message/File/Doc search, semantic/NL search, filters, operators, Boolean,
saved searches, history, permissions, across integrations, preview,
keyboard-first, quick switcher.

## 40. Filter, Sort ve Saved Views

Var: Issues page filter/sort/group. Eksik → **Faz 4:**
- All filter dimensions (assignee, creator, reporter, watcher, team, project,
  status, priority, type, date, overdue, label, custom field, dependency,
  sprint, cycle, milestone, goal, client)
- AND/OR/Nested, relative dates
- Saved views (personal/shared/default/pinned/favorite/dynamic), permissions

## 41. Custom Fields

**Faz 4 — büyük modül:** `custom_field_defs` + `custom_field_values` tablo
Tüm tipler: text, long text, number, currency, %, date, date range, time,
dropdown, multi-select, checkbox, user, team, email, phone, url, rating,
formula, rollup, relationship, location, progress, status, priority, files,
created date, updated date, created by, auto-number, lookup, conditional,
required, field-level permissions, defaults, validation, templates, groups.

## 42. Templates

**Faz 4 — Templates modülü:**
- Workspace/Team/Project/Portfolio/Board/Task/Subtask/Checklist/
  Document/Dashboard/Form/Workflow/Automation/Goal/Sprint/Meeting/Onboarding/
  Marketing campaign/Product launch/Bug tracking/Engineering/CRM/HR/Finance/
  Legal/Operations templates
- Marketplace, organization/community templates, permissions, versioning

## 43. Integrasyonlar

MCP catalog var. Eksik connectorlar → **Faz 5-6** (öncelik: Slack, GitHub,
Google Workspace, Microsoft 365, Zoom, Figma, Loom, Zapier/Make, Zendesk,
Intercom, HubSpot, Salesforce, Jira sync).

## 44. GitHub ve Yazılım Geliştirme

**Faz 5 — GitHub deep integration:**
Repo/branch/commit/PR/MR linking, issue two-way sync, auto-close on merge,
auto-status, branch name generation, commit message task ID, code review
status, build/CI-CD/deployment status, release/environment, test result,
code coverage, incident linking, Sentry, feature flag, PR review request,
GitHub Projects sync, dev activity feed, workload, engineering metrics.

## 45. Bug ve Issue Tracking

Bugs modülü çekirdek var (severity, status, environment, SLA, tracking).
Eksik → **Faz 4:**
- Priority, browser, device, OS, app/build version
- Steps to reproduce, expected/actual result, screenshots, screen recording,
  logs, stack trace, error code
- Affected users, frequency, regression, root cause, fix version, release
- QA/dev owner, reproduction status, test case, acceptance criteria
- Duplicate/similar detection, lifecycle, reopened count, escaped defects

## 46. Service Desk ve Ticket Management

**Faz 5 — yeni modül:**
Request portal, ticket queue/type/category, requester, organization, SLA
(first response + resolution), business hours, priority matrix, routing,
round-robin, escalation, approval, internal notes vs public replies, canned
responses, KB suggestions, customer notifications, email/chat/form-to-ticket,
incident/problem/change/service request, asset linking, satisfaction survey,
CSAT, analytics.

## 47. CRM ve Client Work

CRM modülü var (companies, contacts, opportunities, quotes, contracts,
subscriptions, customers, activities). Client Work eklenmesi → **Faz 5:**
- Client project, task, portal, external collaborator, guest, approval,
  visible status, private notes, time tracking, billing, retainer, invoice,
  contract, deliverable, report, customer health, renewal date

## 48. Permissions ve Erişim

Roles (owner/admin/manager/member/viewer/guest) + izin matrisi var.
Eksik → **Faz 6:**
- Organization admin, custom role, project-level, task-level, field-level
  permission, comment/file/dashboard/form/view permission
- Private task/project, public project, shared link, password-protected,
  domain restriction, IP restriction, guest expiration, temporary access,
  download/copy/export restriction, invite approval, access request,
  permission audit

## 49. Security ve Enterprise

**Faz 6:** SSO, SAML, OAuth, SCIM, user provisioning/deprovisioning,
MFA, passkeys, session/device management, domain verification, IP
allowlist, encryption at rest/transit, customer-managed keys, enterprise
KMS, data residency, regional hosting, audit log, admin log, login history,
export log, permission history, retention policies, legal hold, eDiscovery,
DLP, CASB, SOC 2, ISO 27001, GDPR, KVKK, HIPAA, enterprise backup, DR,
security alerts.

## 50. Audit ve Versiyon Geçmişi

**Faz 6:**
Task/field/status/assignee/priority/date/description/comment/file/permission/
automation/integration history, deleted item log, restore, version compare,
user attribution, timestamp, IP, export audit, immutable audit trail,
compliance report.

## 51. Import, Export ve Migration

**Faz 4:** CSV/Excel/JSON import, Trello/Asana/Jira/ClickUp/Monday/Notion/
Basecamp/GitHub import, field/user/status mapping, attachment/comment/
history import, CSV/Excel/JSON/PDF/image export, project/workspace export,
scheduled export, backup/restore, migration validation, duplicate detection,
import error report.

## 52. Mobil Uygulama

**Faz 7 — React Native, 2-3 ay:**
iOS, Android, tablet layout, task creation/notifications/comments/attachments,
camera upload, voice note/voice-to-task, offline mode + sync, mobile time
tracking, calendar/board/inbox/approvals/search/widget, lock screen actions,
Siri/Android shortcuts, share extension, biometric auth.

## 53. Desktop ve Klavye Deneyimi

**Faz 7 — Electron/Tauri, 1-2 hafta:**
Mac/Windows/Linux app, command menu, quick switcher, shortcut customization,
universal search, quick task creation, mouse-free navigation, multi-select,
bulk edit, copy task ID/link, command palette, global hotkey, desktop
notifications, offline cache, optimistic updates, undo/redo, command history.

## 54. Kişisel Verimlilik

Kısmen var (My Tasks, Founder Inbox). Eksik → **Faz 4:**
Today/Upcoming/Overdue/Assigned/Created/Following/Waiting for/Reviews/
Approvals/Personal inbox/projects, private tasks, reminders, daily/weekly
planner, time blocking, focus mode, Pomodoro, DND, daily goals, personal
dashboard/activity/workload, saved filters, favorites, recent, quick capture.

## 55. Gamification ve Puan Sistemi

**Faz 8:**
XP, completion/difficulty/priority/on-time/early/quality points, review/
docs/collaboration/bug/incident points, daily/weekly/monthly streaks, level,
badge, achievement, milestone reward, team/dept/company score, leaderboards
(weekly/monthly/dept), personal best, team/sprint/goal challenges, reward
catalog, recognition, kudos, peer/manager recognition, anti-gaming
(quality-adjusted, reopened/late penalty, workload-normalized), optional,
private setting.

## 56. Sağlık, Risk ve Proje Skorları

**Faz 4-5:**
Task/project/sprint/portfolio/goal health, on track/at risk/off track/
blocked/unknown, risk score (delay/dependency/capacity/budget/quality/scope/
resource), confidence, completion/deadline probability, stale-task score,
health trend, manual/automatic, explanation, risk owner/mitigation/review
date, risk register.

## 57. AI Özellikleri

AI Chat + domain agents var. Eksik → **Faz 5-6:**
- NL task creation, title/description generation, summarization (task/
  comment/project/channel/daily/weekly)
- Action item çıkarma, meeting transcript/e-mail/message/doc → task
- Acceptance criteria/user story generation
- Subtask/checklist/estimate/priority/assignee/label/project/deadline/
  dependency önerme
- Duplicate/similar/risk/delay/blocker/stale detection
- Workload balancing, sprint planning, backlog prioritization
- Project plan, status update, exec report, release notes generation
- Search assistant, KB assistant, NL reporting, NL automation
- Translation, tone, grammar, autofill, workflow builder, agent actions,
  permission controls, audit logs

## 58. AI Agent ve Otomatik Çalışma

**Faz 7 — büyük vizyon:**
Personal work / Project manager / Triage / Scheduling / Reporting / QA /
Research / Documentation / Support / Approval / Risk / Meeting agents
- Assignment, status, activity history, human approval gates, permissions,
  budget limits, tool access, context selection, output review, failure
  handling, retry, escalation, agent↔human/agent handoff, audit trail

## 59. Toplantı Yönetimi

**Faz 5:** Meeting agenda, participants, date, notes, collaborative notes,
decisions, action items, task creation, assignment, due dates, recording,
transcript, AI summary, follow-up email, template, recurring, stand-up,
1:1, sprint planning/review/retro, project kickoff, status meeting,
archive, searchable history, meeting-task connection, calendar integration.

## 60. Activity Feed

Var: task_activity. Global feed → **Faz 4:**
Workspace/project/task/user/team activity, status/comment/file/assignment/
due date/automation/integration, filter/group/follow/subscribe/export,
audit-level details, real-time updates, infinite scroll.

## 61. Kullanıcı ve Organizasyon Profilleri

Kısmi var. Full → **Faz 3C-6:**
Profile pic, name, title, department, team, manager, direct reports,
location, timezone, working hours, skills, expertise, interests, current
projects, responsibilities, contact, status, availability, vacation, org
chart, reporting lines, searchable directory, custom fields, HRIS/SCIM
sync.

## 62. Dış Kullanıcı ve Müşteri Portalı

**Faz 6:** Guest, client, vendor, partner portal, public project page,
shared task/board/timeline/dashboard, external comments, internal-only,
external task creation/approval/file/form, branded portal, custom domain,
password protection, expiring link, download/copy restriction, activity
visibility, customer status updates, email notifications, portal analytics.

## 63. API ve Developer Platform

**Faz 6:** REST API, GraphQL, Webhooks, OAuth, personal access tokens,
service accounts, API keys, SDK (TS/Python/Go), CLI, custom integrations/
apps, embedded views, app marketplace, developer console, sandbox, test
env, rate limits, API/webhook logs, retry, event subscriptions, per-entity
APIs (Task/Project/User/Search/Reporting/Audit/Import/Export), MCP
server/client support.

## 64. Kullanılabilirlik ve Özelleştirme

Var: Dark mode default, theme toggle. Eksik → **Faz 4-5:**
Light/System/Custom themes/colors, project/status colors, custom icons/
emoji, branding, logo, custom domain, density (compact/comfortable),
sidebar/navigation customization, favorites, pinned, home/widget/column/
card/notification customization, language, date/time format, timezone,
accessibility (screen reader, keyboard nav, high contrast, reduced motion).

## 65. Faturalama ve Yönetim

**Faz 6:** Free/Paid plans, seat management, guest billing, usage-based,
annual/monthly, invoice, tax, PO, billing admin, cost center, department
billing, usage dashboard (storage/automation/AI/API/seat utilization),
license reclamation, billing export, enterprise contract, trial management.

## 66. Olmazsa Olmaz Ana Navigasyon

Bu bölüm zaten Faz 3C sonunda büyük ölçüde tamamlanmış olacak.

| Route | Status |
|---|---|
| Home | ✅ (Founder Home) |
| Inbox | ✅ (Founder Inbox) |
| My Tasks | ✅ |
| Projects | ✅ |
| Teams | 🚧 Faz 3C |
| Goals | ✅ |
| Portfolios | Faz 5 |
| Cycles | ✅ |
| Backlog | ✅ (Issues tabı) |
| Calendar | Faz 4 (global) |
| Workload | Faz 4 |
| Dashboards | Faz 5 (özelleştirilebilir) |
| Documents | Faz 5 |
| Whiteboards | Faz 5 |
| Chat | Faz 5 |
| Meetings | Faz 5 |
| Forms | Faz 5 |
| Automations | Faz 5 |
| Reports | Faz 5 |
| Search | ✅ (Cmd+K) — advanced Faz 4 |
| People | Faz 3C (Employees zaten var) |
| Templates | Faz 4 |
| Integrations | ✅ (Integrations + MCP) |
| Settings | ✅ (Workspace/Personal) |
| Admin | Faz 6 |
| Help | Faz 4 (help center + KB) |

---

## Sonraki adımlar

1. **Bu turda:** Faz 3C (Teams + Members UI), Faz 3D (Onboarding wizard) → push
2. **Bir sonraki tur:** Faz 4 çekirdek başlangıç — task velocity paketi
3. **Faz 4 içi öncelik sırası:**
   1. Recurring tasks
   2. Task templates + Project templates
   3. Custom workflow states per team
   4. Time tracking + Timesheet
   5. Rich text editor (Tiptap)
   6. CSV/Linear/Asana import
   7. Multiple assignees
   8. Custom fields (basic)
   9. Postgres FTS search
   10. Workload view

Her push'ta bu doküman güncellenir; tamamlanan maddeler ✅'e çevrilir.

_Kalan tüm maddeler Faz 5-8'de sistematik olarak işlenecek._
