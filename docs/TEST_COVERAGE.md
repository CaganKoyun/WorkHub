# WorkHub / FounderOS — Test Kapsamı Dokümanı

Sürüm: 1.0 · Tarih: 2026-08-06
Amaç: test yazmadan **önce** neyi test edeceğimizi netleştirmek. Bu doküman kod değil, **kapsam belirleme** dokümanıdır. Her başlık altında: sayfa/modül, kritik işlevsellikler, kullanıcı akışları, sınır (edge) durumlar, izin/rol matrisi ve otomasyon tetikleri listelenir.

Kapsam bölümleri:
1. Kesişen (cross-cutting) kapsam — auth, workspace, izin, RLS, i18n, tema
2. Modül modül işlevsellik kapsamı
3. Kritik uçtan-uca kullanıcı akışları (E2E senaryoları)
4. Regresyon / bilinen açık kapsamı
5. Test katmanı önerisi (unit / integration / e2e / manuel)

Test seviyeleri:
- **U** = Unit (Vitest, saf fonksiyon / hook)
- **C** = Component (React Testing Library)
- **I** = Integration (birden çok bileşen + mock Supabase)
- **E** = E2E (Playwright, gerçek DB / stub DB)
- **M** = Manuel doğrulama (görsel, tarayıcı, PWA)

Rol kısaltmaları: OW=owner, AD=admin, MG=manager, MB=member, VW=viewer, GS=guest.

---

## 1. Cross-cutting Kapsam

### 1.1 Kimlik & Oturum (`/auth`, `/invite/:token`)
- Sign-up: e-posta + parola, e-posta formatı, zayıf parola reddi, mevcut e-posta ile duplikat sign-up
- Sign-in: doğru/yanlış parola, kilitli hesap, "Remember me"
- OAuth / SSO (docs/SSO.md kapsamındaysa): Google/GitHub akışı, callback hatası, cancelled flow
- Şifre sıfırlama: e-posta gönderimi, geçersiz/expired token, yeni parola kaydı
- Oturum kalıcılığı: refresh, sekmeler arası paylaşım, logout → korunan route'a düşme → `/auth`'a redirect
- Davet linkiyle giriş: yeni kullanıcı, mevcut kullanıcı, expired token, yanlış workspace token'ı
- **Testler:** U (validation), C (form), E (login+logout+protected redirect)

### 1.2 Workspace & Onboarding (`/onboarding`, `WorkspaceGate`)
- İlk giriş → `/onboarding`'e redirect (aktif workspace yoksa)
- 4 adımlı sihirbaz: profil, workspace adı, ekip boyutu, davet
- Workspace oluşturma (`create_workspace` RPC), default izinlerin seed'lenmesi (`seed_default_permissions`)
- Aktif workspace switch (`WorkspaceSwitcher`): çoklu workspace'te veri sızıntısı yok mu?
- Onboarding yarım kaldığında: yeniden login → aynı adımdan devam
- **Testler:** I (wizard state), E (onboarding→dashboard), U (state machine)

### 1.3 Rol & İzin Matrisi (`workspace_permissions`, `has_workspace_permission`)
Her modül × aksiyon (create/read/update/delete/approve) × rol (OW/AD/MG/MB/VW/GS) matrisinin doğrulanması:
- OW/AD tüm modüllere erişir
- MG kendi modülünde CRUD, başka modülde read
- MB kendi kayıtlarında write, başka kayıtlarda read
- VW yalnız read, action buton'ları görünmez
- GS sadece paylaşılan link ile sınırlı erişir
- RLS testi: kullanıcı A'nın workspace'ine kullanıcı B doğrudan API ile ulaşamaz
- **Testler:** I (Supabase RLS), E (rol bazlı UI görünürlüğü)

### 1.4 Global UI (TopBar, AppRail, AppSidebar, ShortcutsProvider)
- TopBar arama: input çalışıyor mu, sonuç dönüyor mu (PRD'de bilinen açık — P1)
- Bildirim zili (`NotificationBell`): unread badge, tıklayınca inbox
- Tema toggle (`ThemeToggle`): light/dark, next-themes persist
- Dil değişimi (`LanguageSwitcher`, `LangContext`): TR/EN string kapsamı
- Klavye kısayolları (`ShortcutsProvider`): `?` yardım, `g p` projects, `g t` tasks, `c` create, `/` search
- AppRail ikonları → doğru rota; aktif rota vurgusu
- **Testler:** C (bileşen), E (kısayol + navigasyon)

### 1.5 Bildirim (`NotificationBell`, `NotifPreferences`, `/notification-settings`)
- In-app bildirim üretimi (task atama, mention, approval)
- Kanal tercihleri: e-posta, push, in-app
- Snooze / mark all as read
- **Testler:** I

### 1.6 PWA / Install
- `InstallPrompt` görünürlüğü (desteklenen tarayıcı)
- Manifest + service worker cache stratejisi
- **Testler:** M (Lighthouse), C (prompt state)

### 1.7 Error boundary + 404
- `ErrorBoundary` beklenmedik hatada fallback render
- `NotFound` sayfası: geçersiz slug, düz metin, geri linki
- **Testler:** C, E

### 1.8 Audit & Aktivite (`/audit`, `activity_log`, `task_activity`)
- Her CRUD kaydı log'a düşüyor mu (user + timestamp + entity)
- Audit sayfasında filtreleme (kullanıcı, tarih, action)
- **Testler:** I, E

---

## 2. Modül Modül İşlevsellik Kapsamı

### 2.1 Founder Home (`/home`)
- Company Pulse metrikleri render
- Bottleneck Radar: 24h/48h bekleyen onay sayısı
- Founder Mirror Card
- Boş durum (yeni workspace, hiç veri yok)
- **Akışlar:** login → home → inbox kart tıkla → onay ekranı

### 2.2 Founder Inbox (`/inbox`)
- Onay tipleri: expense, hiring, contract, discount, budget-change, payment, leave
- Aksiyonlar: Approve / Reject / Request Info / Delegate / Snooze
- Snooze süresi seçimi, delegasyon hedef kullanıcı
- Toplu (bulk) aksiyon
- Filtreleme (tip, öncelik, gönderen)
- **Sınır:** onaydan sonra tekrar tıklama, çakışan iki onaycı
- **Testler:** I (approval RPC), E (approve happy path)

### 2.3 Dashboard (`/dashboard`)
- Kart sıralaması, widget yükleme durumu
- Boş widget → CTA görünürlüğü

### 2.4 Projects (`/projects`, `/projects/new`, `/projects/:id`, `/:id/edit`)
Sekmeler: Overview, Board (Kanban), List, Timeline, Calendar, Dashboard, Files, Messages, Members

**İşlevsellikler:**
- Proje **oluşturma**: ad (zorunlu), açıklama, template seçimi, portfolio bağlantısı, hedef tarih, sahibi
- Proje **düzenleme**: alanları güncelle, archive
- Proje **silme**: onay dialog'u, cascade (tasks, files) uyarısı
- Proje **arşivleme / restore**
- Board sekmesi:
  - Kanban kolonları (`workflow_states` bazlı)
  - Kartı **sürükle bırak** (`@dnd-kit/sortable`), sıra kalıcı mı, status değişti mi
  - Yeni task hızlı ekle (`QuickAddIssue`)
- List sekmesi: sıralama, filtre, çoklu seçim
- Timeline: Gantt görünümü, bar sürükleme
- Calendar: tarih hücresine tıklayarak task oluşturma
- Files: upload, önizleme, silme (Supabase storage)
- Messages: `project_messages`, mention (@), real-time
- Members: ekleme, rol atama, çıkarma
- **Sınır:** aynı isimde iki proje, çok uzun ad, unicode, silinen sahip

**Akışlar:**
1. Yeni proje → template seç → oluştur → board'da default kolonlar görünür
2. Proje detay → member ekle → o üye my tasks'da görebiliyor mu
3. Proje sil → onay → listeden kalkıyor → ilişkili task'lar ne oluyor

### 2.5 Tasks / My Tasks (`/tasks`, `Issues`, `QuickAddIssue`)
- Gruplama: Recently assigned, Today, Upcoming, Next week, Later
- **Bilinen açık:** Unassigned grubu yok (PRD P1) — test regresyon olarak yakalamalı
- Task oluştur: title, açıklama, atama, due date, priority, project, cycle, labels, custom fields
- Task düzenle: inline edit, status değişimi, yeniden atama
- Task silme: soft delete mi hard delete mi
- Alt görev (subtask), bağımlılık (`blocked by`, `blocks`)
- Comments: mention, ek dosya, edit/delete
- Task activity feed
- **Sınır:** geçmiş due date, kendine atama, dairesel bağımlılık

### 2.6 Bugs (`/bugs`, `/bugs/new`, `/bugs/:id`)
- Otomatik `BUG-00001` takip no üretimi (sıra atlamıyor mu)
- Severity: critical / high / medium / low
- Status akışı: open → in-progress → resolved → closed → reopened
- Attachment (bug-attachments bucket, private)
- Comment akışı, atama, prioritization
- Bug'ı task'a veya feature'a bağlama (`object_links`)
- **Sınır:** aynı BUG numarası çakışması (race), 10MB+ attachment

### 2.7 Cycles (`/cycles`)
- Cycle (sprint) oluştur: ad, başlangıç/bitiş tarih, hedef
- Task'ları cycle'a taşıma
- Aktif/planlanan/tamamlanan cycle görünümü
- Burndown / velocity grafiği
- **Sınır:** tarih çakışması, geçmişe cycle açma

### 2.8 Roadmap (`/roadmap`)
- Zaman ekseninde epic/feature çubukları
- Sürükle-bırak yeniden sıralama
- Milestone ekleme

### 2.9 Teams (`/teams`)
- Ekip oluştur, üye ekle/çıkar, team lead atama
- Ekip-proje ilişkilendirme

### 2.10 Templates (`/templates`)
- Proje / task / doc şablonu oluşturma
- Şablondan yeni kayıt üretme

### 2.11 Workload (`/workload`)
- Kullanıcı bazlı iş yükü heatmap
- Aşırı yüklenmiş kişi flag'i

### 2.12 Insights (`/insights`)
- Modül bazlı metrikler
- Zaman aralığı filtresi

### 2.13 Analytics (`/analytics`)
- Modüller arası rapor (PRD bilinen açık P2: sınırlı)
- Rapor kaydetme, paylaşma
- Boş durum

### 2.14 Timesheet (`/timesheet`)
- Zaman girişi (task bazlı)
- Haftalık toplam, onaya gönderme
- **Sınır:** overlap, 24 saatten fazla giriş

### 2.15 Custom Fields (`/custom-fields`)
- Alan tipleri: text, number, select, multiselect, date, user, formula
- Modül seçimi (project/task/bug/…)
- Zorunlu alan / default değer
- Sildiğinde bağlı kayıtlarda ne oluyor
- **Testler:** `CustomFieldRenderer` bileşeni her tipte

### 2.16 Workflow States (`/workflow-states`)
- Custom state oluştur, sıralama, renk, kategori (backlog/started/completed/cancelled)
- Kanban görünümüne yansıma
- Aktif kullanılan state'i silememe

### 2.17 Docs (`/docs`, `/docs/:id`)
- Zengin metin editörü (`RichTextEditor`) — bold/italic/code/heading/list/mention/link/image
- Dokümanı diğer kayıtlara bağlama
- Slash komutları, undo/redo
- Otomatik kaydet, çakışma çözümü
- Paylaşım (public link)

### 2.18 Chat (`/chat`, `/chat/:channelId`)
- Kanal oluştur, DM, member ekleme
- Real-time mesaj (Supabase realtime)
- Mention → bildirim
- Reaction, thread, edit/delete
- Dosya paylaşımı

### 2.19 Automations (`/automations`)
- Kural oluştur: trigger + condition + action
- Trigger tipleri (task created/updated, opportunity won, …)
- Test run
- Aktif/pasif toggle

### 2.20 Forms (`/forms`, `PublicForm` `/f/:slug`)
- Form builder: alan tipleri, sıra, zorunluluk
- Yayınlama, public slug
- Submit → kayıt (task/lead) oluşturuyor
- Spam / rate limit
- **Sınır:** kapatılmış form, silinmiş workspace formu

### 2.21 Whiteboards (`/whiteboards`, `/whiteboards/:id`)
- Yeni board, çizim/nesne ekleme, çoklu kullanıcı
- Kaydet, paylaş

### 2.22 Service Desk (`/desk`, `/desk/:id`, `/support/:workspaceId` public)
- Ticket oluştur (internal / public)
- SLA, assignee, öncelik
- Public destek portalı: form submit, ticket takip

### 2.23 Portfolios (`/portfolios`, `/portfolios/:id`)
- Çok projeyi portföy altında toplama
- Portföy düzeyi metrik

### 2.24 Meeting Notes (`/meetings`, `/meetings/:id`)
- Toplantı oluştur, gündem, notlar, action item → task'a çevir
- Katılımcı ekle

### 2.25 Saved Views (`/views`)
- Filtre + kolon seti kaydetme, isim, kişisel/paylaşımlı
- Modül bazlı (tasks, bugs, crm)

### 2.26 API Tokens (`/api-tokens`)
- Token oluştur, kopyala (yalnız 1 kez göster), scope seçimi
- Revoke
- Last used timestamp

### 2.27 Client Portals (`/portals`, `PublicPortal` `/portal/:token`)
- Müşteri portalı: token'lı erişim, gösterilen içerik seçimi
- Public token expiry, iptal

### 2.28 Agent Runs (`/agent`)
- AI ajan çalışma logları
- Rerun, cancel, output görüntüle

### 2.29 Leaderboard (`/leaderboard`)
- Puanlama kriteri, zaman aralığı, kişisel sıralama

### 2.30 CRM (`/crm`)
- Pipeline board (kanban), stage sürükleme
- Companies (`crm_companies`) CRUD
- Contacts CRUD
- Opportunities: `Q-00001`, `C-00001` numaralandırma
- Quotes: item ekle, toplam hesabı, indirim, KDV
- Contracts, subscriptions
- Forecast görünümü
- **Otomasyon:** "Won deal" → müşteri kaydı oluştur + Inbox'a ilk fatura onayı düş (`crm_opportunity_won_flow`)
- **Sınır:** fırsat aynı anda 2 stage'e düşürme, negatif miktar

### 2.31 Finance (`/finance`)
- Nakit bakiyesi (`fin_cash_balance`)
- Burn rate (`fin_burn_rate`)
- Runway hesabı
- Çok para birimli işlem, FX çevrimi (`fin_lookup_fx`)
- İşlem CRUD (`fin_transactions`)
- Bütçe oluştur, gerçekleşen vs plan
- Proje P&L
- Nakit akışı projeksiyonu grafiği
- **Sınır:** eksik FX oranı, negatif bakiye, geçmiş tarih işlem

### 2.32 Goals (`/goals`)
- OKR oluştur: dönem, hedef değeri, mevcut değeri
- Status: on_track / at_risk / off_track / missed / achieved
- İlerleme yüzdesi otomatik
- Alt hedefler

### 2.33 Risks (`/risks`)
- Risk kaydı: seviye, olasılık, etki, sahip, azaltma planı, status
- Isı haritası

### 2.34 Decisions (`/decisions`, `/decisions/:id`)
- **PRD P0 bilinen açık:** `verdict`, `confidence`, `actual_outcome` kolonları eksik → 400
- Karar oluştur: bağlam, gerekçe, alternatifler, karar, tahmini sonuç
- Review: gerçek sonuç, öğrenim
- Karar silinemez, revize edilir (yeni versiyon)
- Bağlantı (proje, task, bug, opportunity)

### 2.35 Product (`/product`)
Sekmeler: products, features, feedback, releases, incidents
- Ürün CRUD
- Feature CRUD, RICE/ICE skor (PRD P2 bilinen açık: yok)
- Feedback → feature dönüşümü (PRD P2 açık)
- Release: versiyon, notlar, changelog
- Incident: severity, timeline, postmortem

### 2.36 Company (`/company`)
- Legal entity ekle, departman, ekip, modül sahipliği
- İç organizasyon şeması

### 2.37 Employees (`/employees`)
- Çalışan profili, iletişim, iş unvanı, ekip
- Aktif/ayrılan
- İzin bakiyesi (varsa)

### 2.38 Assets (`/assets`, `/assets/new`, `/assets/:id`, `/assets/:id/edit`)
- Asset CRUD (isim, seri no, kategori, satın alma tarihi, değer)
- Kategori yönetimi
- Zimmet (assignment): çalışana ata, iade
- Amortisman hesabı
- CSV içe aktarma (`/import`) — kolon eşleme, hata satırları
- Attachment (fatura)

### 2.39 Integrations (`/integrations`)
- Katalog listesi
- Custom MCP sunucusu ekleme
- OAuth 2.1 PKCE + dynamic client registration
- Bağlantıyı test et
- Disconnect, token yenileme
- **Sınır:** OAuth cancelled, expired token, callback URL uyuşmazlığı

### 2.40 AI Chat (`/ai-chat`)
- Sohbet başlat, geçmiş mesaj listesi
- Şirket verisiyle grounding (RAG)
- Öneriyi "Move to Inbox" ile approval'a çevirme
- Rate limit, uzun context

### 2.41 Workspace Settings (`/workspace/settings`)
- Genel: workspace ad, logo, timezone, dil
- Members: davet gönder (token üret), rol değiştir, çıkar
- Invitations: pending liste, expire, resend
- İzin matrisi: rol × modül × aksiyon toggle
- Fatura / plan (varsa)

### 2.42 Settings (`/settings`)
- Kullanıcı profili: ad, avatar (upload → `avatars` bucket)
- Şifre değişimi
- Bildirim tercihleri
- Tema
- 2FA (varsa)
- Hesap silme

### 2.43 Notification Settings (`/notification-settings`)
- Event bazlı: task assigned, mention, approval, digest
- Kanal: in-app / email / push

### 2.44 Admin (`/admin`)
- Sistem seviyesi (super-admin varsa)
- Kullanıcı listesi, workspace listesi, impersonate (varsa)

### 2.45 Import (`/import`)
- CSV / JSON içe aktarma
- Modül seçimi, kolon eşleme
- Preview, hata satırları, kısmi başarı

### 2.46 Landing / Index (`/`)
- Pazarlama içeriği render
- CTA butonu → `/auth`
- SEO meta tag

### 2.47 Public Sayfalar
- `/f/:slug` (public form) — workspace login gerektirmez, geçersiz slug 404
- `/support/:workspaceId` (public destek) — ticket submit, PII toplaması
- `/portal/:token` (client portal) — token expiry
- `/invite/:token` — mevcut kullanıcı / yeni kullanıcı akışı

---

## 3. Kritik Uçtan-Uca (E2E) Kullanıcı Akışları

### 3.1 Sıfırdan çalışan workspace (5 dk hedefi — PRD 7. başarı kriteri)
1. Sign-up → e-posta doğrulama
2. Onboarding 4 adım tamamla
3. İlk proje oluştur → template seç
4. İlk task oluştur, kendine ata
5. İlk fırsat oluştur (CRM)
6. İlk kararı kaydet (Decisions)
7. Home'da metriklerin görünmesi

### 3.2 Ekip üyesi davet + katılım
1. OW workspace'e davet gönderir (rol: MB)
2. Davet e-postası → `/invite/:token`
3. Yeni kullanıcı sign-up
4. Aktif workspace olarak katıldı
5. My Tasks boş görünür → OW ona task atar → tasks listesinde belirir

### 3.3 Approval loop (Founder Inbox)
1. MB harcama talebi oluşturur
2. Inbox'ta OW için pending görünür
3. OW approve eder → harcama status: approved
4. Reddedilirse → talep sahibine bildirim
5. 48 saat geçerse Bottleneck Radar'da flag

### 3.4 "Won deal" otomasyonu
1. CRM'de opportunity oluştur
2. Pipeline stage'i "Won"'a taşı
3. `crm_opportunity_won_flow` tetiklenir
4. `crm_customers`'a kayıt düşer
5. Founder Inbox'a "ilk fatura onayı" düşer
6. Finance işlem listesinde ilgili kayıt görünür

### 3.5 Kanban board sürükle-bırak (regresyon açısından kritik)
1. Proje detay → Board sekmesi
2. Task'ı "In Progress" kolonuna sürükle
3. Status değişimi + activity log kaydı
4. Refresh sonrası sıra korunmalı

### 3.6 Multi-tenant izolasyon (güvenlik testi)
1. Kullanıcı A workspace X'te task oluşturur
2. Kullanıcı B (workspace Y'de) doğrudan API ile task ID'sine erişmeye çalışır
3. RLS 403 döner
4. UI'da B, task'ı hiçbir listede görmez

### 3.7 Rol bazlı UI görünürlüğü
1. VW ile login
2. Projects sayfasında "New Project" butonu görünmez
3. Task detayında edit/silme aksiyonu disabled
4. Approval aksiyonları yok

### 3.8 Bug lifecycle
1. Public form üzerinden bug submit (ya da `/bugs/new`)
2. `BUG-00001` numarası üretildi
3. Assignee atama, status → in-progress
4. Attachment yükle (private bucket)
5. Resolved → closed

### 3.9 Cycle planning
1. Yeni cycle: iki hafta
2. Backlog'dan task'ları cycle'a taşı
3. Cycle başladığında board güncellenir
4. Cycle bitiminde tamamlanmamış task'lar otomatik nereye gidiyor

### 3.10 CSV import (Assets)
1. `/import` → Assets seç
2. Örnek CSV yükle
3. Kolon eşle (name → asset_name)
4. Preview, 2 hatalı satır → skip / fix
5. Başarılı import sonrası listede görünüyor

### 3.11 AI Chat → Inbox
1. `/ai-chat`'te "Bu ay 50k TL harcama önerdim, onaya gönder"
2. Öneri kartı → "Move to Inbox"
3. Founder Inbox'ta approval olarak belirir

### 3.12 Public form submission
1. Public form linki (giriş yapmadan)
2. Alanları doldur → submit
3. Workspace'de kayıt (lead/task) oluşuyor
4. Rate limit: 10 saniyede 5 submit reddedilir

### 3.13 OAuth entegrasyon bağlama
1. `/integrations` → connector seç
2. OAuth flow başlat → provider'a redirect
3. Callback → token backend'de saklandı
4. Bağlantıyı test et → başarılı

### 3.14 Şifre sıfırlama
1. `/auth` → "Forgot password"
2. E-posta gönderildi
3. Linke tıkla → yeni parola
4. Eski parola artık geçersiz

### 3.15 Tema + Dil kalıcılığı
1. Ayarlar → dil TR → EN
2. Tema light → dark
3. Refresh → seçimler korunuyor

---

## 4. Regresyon / Bilinen Açık Kapsamı (PRD Bölüm 6)

Her açık için bir test **kırık** kalmalı (skip'lenmiş / expected-fail) ki kapatıldığında yeşile dönsün:

| # | Test adı | Modül |
| --- | --- | --- |
| 1 | `decisions` create/list 400 vermemeli | Decisions |
| 2 | Sign-up sonrası `profiles` satırı var mı | Auth |
| 3 | TopBar arama sonuç döndürüyor mu | Global |
| 4 | My Tasks'ta Unassigned grubu var mı | Tasks |
| 5 | Liste ikonları tofu değil, Lucide | UI |
| 6 | Feedback → feature dönüşümü çalışıyor mu | Product |
| 7 | Analytics gerçek metrikler dönüyor mu | Analytics |
| 8 | Approval hatırlatma bildirimi tetikleniyor mu | Bildirim |

---

## 5. Test Katmanı Önerisi

### 5.1 Unit (Vitest)
- `src/lib/*` yardımcı fonksiyonlar (finance hesap, FX, tarih)
- `src/hooks/*` custom hook'lar (state, cache)
- Reducer / state machine (onboarding, kanban)
- Validation (form şemaları)

### 5.2 Component (RTL)
- `QuickAddIssue`, `RichTextEditor`, `CustomFieldRenderer`, `StatusBadge`, `SeverityBadge`
- `AppRail`, `AppSidebar`, `TopBar`, `WorkspaceSwitcher`
- Form bileşenleri (project new, asset new, task quick add)
- Empty states

### 5.3 Integration
- `AuthContext` + `ProtectedRoute` + `WorkspaceGate` zinciri
- Supabase mock ile RLS senaryoları
- Approval RPC + Inbox render
- Kanban drag → status update

### 5.4 E2E (Playwright — `e2e/*.spec.ts`)
Mevcut: `smoke.spec.ts`, `live-signup.spec.ts`, `ux-flows.spec.ts`. Aşağıdaki senaryolar eklenmeli:
- `projects.spec.ts` — bölüm 3.1, 3.5
- `invite.spec.ts` — 3.2
- `approvals.spec.ts` — 3.3
- `crm-won-flow.spec.ts` — 3.4
- `rls-isolation.spec.ts` — 3.6
- `role-visibility.spec.ts` — 3.7
- `bugs.spec.ts` — 3.8
- `cycles.spec.ts` — 3.9
- `import.spec.ts` — 3.10
- `ai-inbox.spec.ts` — 3.11
- `public-form.spec.ts` — 3.12
- `integrations-oauth.spec.ts` — 3.13
- `password-reset.spec.ts` — 3.14
- `theme-lang.spec.ts` — 3.15

### 5.5 Manuel / Görsel
- Storybook (varsa) veya Chromatic snapshot
- Tarayıcı matrisi: Chrome, Safari, Firefox
- Mobil responsive (AppRail collapse)
- PWA install akışı
- Erişilebilirlik: axe-core, klavye navigasyonu, screen reader landmark

---

## 6. Test Verisi & Ortam Stratejisi

- **Seed hesabı:** her rol için deterministik user (owner@test.local, admin@test.local, …)
- **Fixture workspace:** projects/tasks/bugs/crm/finance her modülden 3-5 örnek kayıt
- **DB reset:** her E2E öncesi `pnpm supabase db reset` veya izole schema
- **Zamana bağlı testler:** clock mock (`vi.setSystemTime`)
- **Storage:** test için ayrı bucket, sonda temizlik
- **Realtime:** deterministik test için polling fallback

---

## 7. Kapsam Dışı (Şimdilik)

- Yük / performans testi (k6, JMeter)
- Sözleşme (contract) testleri (Pact)
- Chaos / failover
- Mobil native (yalnız PWA hedeflenir)

---

## 8. Sonraki Adım

1. Bu doküman gözden geçirilecek (özellikle rol matrisi ve otomasyon listesi).
2. Öncelik matrisi: her satır için P0/P1/P2 etiketle.
3. P0 senaryolar için Playwright spec iskeletleri (`test.skip`) açılacak — çalıştırılabilir kapsam.
4. RLS testleri için Supabase test helper (`createTestClient(role, workspaceId)`) yazılacak.
5. CI'ya `test:e2e` matrisi eklenecek (rol × modül).
