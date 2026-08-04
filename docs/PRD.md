# FounderOS — Ürün Gereksinim Dokümanı (PRD)

Sürüm: 1.0 · Tarih: 30 Temmuz 2026
Kaynak: mevcut kod tabanından çıkarılmış (reverse-engineered) gerçek durum + hedef durum.

---

## 1. Ürün Özeti

FounderOS, startup ve KOBİ'ler için **çok kiracılı (multi-tenant) bir Şirket İşletim Sistemi**dir.
Klasik proje yönetimi araçlarından farkı: yalnızca işin sonucunu değil, **kararın kendisini** kayıt altına alır (Decision System of Record — DSoR) ve tüm kayıtları tek bir **Company Graph** üzerinden birbirine bağlar.

Ürün üç katmandan oluşur:

1. **Kayıt katmanı** — projeler, görevler, buglar, fırsatlar, işlemler, varlıklar, kararlar.
2. **Bağlantı katmanı** — `object_links` polimorfik graf tablosu; her kaydın nedeni ve sonucu izlenebilir.
3. **Karar katmanı** — Founder Home (Company Pulse), Founder Inbox (onaylar), Bottleneck Radar, domain uzmanı AI ajanları.

### Hedef kullanıcılar
| Persona | İhtiyaç |
| --- | --- |
| Kurucu / CEO | Tek ekranda şirket nabzı, bekleyen kararlar, darboğazlar |
| Departman lideri | Kendi cockpit'i: alanına ait kayıtlar + uzman AI |
| Ekip üyesi | My Tasks, proje panoları, bug akışı |
| Finans / Operasyon | Nakit, runway, bütçe, varlık envanteri |

---

## 2. Mimari

- **Frontend:** React 18 + Vite 5 + TypeScript + Tailwind (Asana-esintili tasarım sistemi, `src/index.css` semantik token'ları).
- **Backend:** Lovable Cloud (Postgres + Auth + Storage + Edge Functions).
- **Edge Functions:** `ai-chat`, `mcp-connections`, `mcp-oauth-callback`, ortak yardımcılar (`_shared`).
- **Erişim kontrolü:** her public tabloda `workspace_id`; RLS `is_workspace_member()` ve `has_workspace_permission()` üzerinden; roller `workspace_role` enum (owner, admin, manager, member, viewer, guest).
- **Uygulama kabuğu:** çift raylı Asana benzeri shell — 56px ikon rayı (`AppRail`) + kümelenmiş iç sidebar (`AppSidebar`, `nav-config.ts`) + `TopBar` + `DomainWorkspace` (65/35 içerik + AI rayı).

### Guard zinciri
`ProtectedRoute` (oturum) → `WorkspaceGate` (aktif workspace / onboarding yönlendirmesi) → sayfa.

---

## 3. Modüller ve İşlevsellik

### 3.1 Overview
| Ekran | Rota | İşlev |
| --- | --- | --- |
| Founder Home | `/home` | Company Pulse metrikleri, sağlık skoru, Bottleneck Radar (bekleyen onayların bekleme süresi) |
| Founder Inbox | `/inbox` | Onay akışı: harcama, işe alım, sözleşme, iskonto, bütçe değişikliği, ödeme, izin; approve/reject/info/delegate/snooze |
| Dashboard | `/dashboard` | Operasyonel özet kartları |

### 3.2 Work
| Ekran | Rota | İşlev |
| --- | --- | --- |
| Projects | `/projects`, `/projects/new`, `/projects/:id`, `/:id/edit` | Proje listesi/portföy; detayda Overview, Board (Kanban, sürükle-bırak), List, Timeline, Calendar, Dashboard, Files, Messages, Members sekmeleri |
| My Tasks | `/tasks` | Zamana göre gruplama (Recently assigned, Today, Upcoming, Next week, Later) |
| Bugs | `/bugs`, `/bugs/new`, `/bugs/:id` | `BUG-00001` otomatik takip no, severity/status akışı, ek dosyalar |
| Product | `/product` | Ürün & mühendislik: products, features, feedback, releases, incidents sekmeleri |

### 3.3 Revenue
| Ekran | Rota | İşlev |
| --- | --- | --- |
| CRM | `/crm` | Pipeline board, şirketler, kişiler, fırsatlar, teklifler (`Q-00001`), sözleşmeler (`C-00001`), abonelikler, forecast; "Won deal" otomasyonu fırsatı müşteriye çevirir ve Inbox'a ilk fatura onayı düşer |
| Finance | `/finance` | Nakit bakiyesi, burn rate, runway, çok para birimli FX çevrimi, işlemler, bütçeler, proje P&L, nakit akışı projeksiyonu |
| Analytics | `/analytics` | Modüller arası raporlama |

### 3.4 Strategy & Governance
| Ekran | Rota | İşlev |
| --- | --- | --- |
| Goals | `/goals` | OKR: dönem, hedef/gerçekleşen, durum (on_track…missed) |
| Risks | `/risks` | Risk merkezi: seviye, sahip, azaltma durumu |
| Decisions | `/decisions` | DSoR: bağlam, gerekçe, alternatifler, karar, sonuç takibi ve gözden geçirme |

### 3.5 Company & Operations
| Ekran | Rota | İşlev |
| --- | --- | --- |
| Company | `/company` | Legal entity, departman, ekip, modül sahipliği |
| Employees | `/employees` | Çalışan kayıtları, profiller, roller |
| Assets | `/assets/*` | Varlık envanteri, kategori, zimmet (assignment), amortisman, CSV içe aktarma |

### 3.6 Platform
| Ekran | Rota | İşlev |
| --- | --- | --- |
| Integrations | `/integrations` | Hazır connector kataloğu + custom MCP sunucusu; OAuth 2.1 PKCE + dynamic client registration, token'lar backend'de saklanır |
| Workspace Settings | `/workspace/settings` | Üyeler, davetler (token'lı), izin matrisi (rol × modül × aksiyon) |
| Settings | `/settings` | Kullanıcı tercihleri, bildirimler, tema |
| AI Chat | `/ai-chat` | Şirket verisine erişen asistan; öneriyi "Move to Inbox" ile onaya dönüştürme |
| Onboarding | `/onboarding` | 4 adımlı workspace kurulum sihirbazı |
| Auth / Invite / Landing | `/auth`, `/invite/:token`, `/` | Giriş, davet kabulü, pazarlama sayfası |

---

## 4. Veri Modeli (özet)

~66 tablo, başlıca kümeler:

- **Tenancy:** `workspaces`, `workspace_members`, `workspace_permissions`, `workspace_invitations`, `workspace_onboarding`, `user_active_workspace`, `user_roles`, `profiles`
- **Work:** `projects`, `project_members`, `project_messages`, `project_files`, `tasks`, `task_comments`, `task_activity`, `bugs`, `attachments`, `comments`, `activity_log`
- **Product:** `products`, `features`, `feedback`, `releases`, `incidents`
- **CRM:** `crm_companies`, `crm_contacts`, `crm_opportunities`, `crm_pipelines`, `crm_pipeline_stages`, `crm_quotes`, `crm_quote_items`, `crm_contracts`, `crm_subscriptions`, `crm_customers`, `crm_activities`
- **Finance:** `fin_accounts`, `fin_transactions`, `fin_categories`, `fin_budgets`, `fin_fx_rates`
- **Governance:** `goals`, `risks`, `decisions`, `approvals`
- **Company:** `legal_entities`, `departments`, `teams`, `job_titles`, `employees`, `business_functions`, `module_ownership`, `permission_sets`
- **Assets:** `assets`, `asset_categories`, `asset_assignments`
- **Graph & Platform:** `object_links`, `integrations_catalog`, `workspace_connections`, `user_mcp_servers`, `mcp_oauth_states`, `notification_preferences`

**Kritik fonksiyonlar:** `create_workspace`, `accept_workspace_invitation`, `seed_default_permissions`, `has_workspace_permission`, `is_workspace_member`, `fin_cash_balance`, `fin_burn_rate`, `fin_lookup_fx`, `crm_opportunity_won_flow`, `has_role`.

**Storage:** `avatars` (public), `bug-attachments` (private).

---

## 5. Kesişen (cross-cutting) İlkeler

1. **Her kayıt bir workspace'e aittir.** `workspace_id` olmayan yazma yolu kabul edilmez.
2. **Her tablo RLS + GRANT.** Politika yoksa tablo kilitlidir.
3. **Her modül Company Graph'a bağlanabilir** (`RelatedObjectsPanel`).
4. **Her domain'in bir uzman AI ajanı vardır** (`src/lib/domain-agents.ts`), çıktısı Inbox'a aksiyon olarak taşınabilir.
5. **Kararlar silinmez**, revize edilir ve sonucu ölçülür.

---

## 6. Bilinen Açıklar / Yapılacaklar

| # | Konu | Etki | Öncelik |
| --- | --- | --- | --- |
| 1 | `decisions` tablosunda `verdict`, `confidence`, `actual_outcome` kolonları eksik → `/decisions` 400 dönüyor | DSoR çekirdeği kırık | P0 |
| 2 | Signup'ta `profiles` satırı oluşturan trigger bağlı değil → 406 hataları, boş avatarlar | Kimlik/atama UX'i | P0 |
| 3 | TopBar global arama yalnızca görsel placeholder | Keşfedilebilirlik | P1 |
| 4 | Atanmamış görevler My Tasks'ta görünmüyor (Unassigned grubu yok) | Veri kaybı hissi | P1 |
| 5 | Bazı listelerde emoji ikonlar "tofu" kutusu olarak render ediliyor → Lucide'a geçilmeli | Görsel kalite | P2 |
| 6 | Product modülünde feedback → feature dönüşümü ve RICE/ICE skorlaması yok | Ürün karar akışı | P2 |
| 7 | Analytics modüller arası gerçek metrik yerine kısmi kartlarla sınırlı | Raporlama | P2 |
| 8 | Bildirim/e-posta katmanı (onay hatırlatmaları) yok | Onay döngüsü yavaş | P2 |

---

## 7. Başarı Kriterleri

- Yeni bir workspace, onboarding'den sonra 5 dakika içinde ilk projeyi, ilk fırsatı ve ilk kararı kaydedebiliyor.
- Bekleyen her onay Founder Home'da bekleme süresiyle görünür; 48 saati aşan hiçbir onay gizli kalmaz.
- Her "won" fırsat otomatik olarak müşteri kaydı + fatura onayı üretir.
- Tüm modüllerde RLS ihlali sıfır; workspace dışı veri sızıntısı testte yakalanmaz.
- P0 açıkları kapandığında tüm 21 rota konsol hatası olmadan yükleniyor.
