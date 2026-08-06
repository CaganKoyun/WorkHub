# E2E hard-crawl raporu

Tarih: 2026-08-06 · Branch: `claude/workhub-customer-analysis-fya7t8` · HEAD: `13bcadf`
Ortam: Playwright + bundled Chromium 1194 · dev server `npm run dev -- --host 127.0.0.1`
Spec: `e2e/hard-crawl.spec.ts`

## 1. Kapsam

| Katman             | Route sayısı | Yürütüldü mü | Not |
| ------------------ | -----------: | ------------ | --- |
| Public (anonim)    | 7            | ✅            | Landing, /auth, geçersiz token dizileri, 404 |
| Signed-in (authed) | 51           | ❌ skipped    | Sign-up email confirmation → auto-login yok (aşağı bkz.) |

Public rota listesi: `/`, `/auth`, `/invite/<bogus>`, `/f/<bogus>`, `/support/<bogus>`, `/portal/<bogus>`, `/nonexistent-page-404`

Signed-in rota listesi (51): `/home`, `/inbox`, `/dashboard`, `/issues`, `/views`, `/cycles`, `/roadmap`, `/projects`, `/projects/new`, `/portfolios`, `/tasks`, `/workload`, `/insights`, `/bugs`, `/bugs/new`, `/product`, `/timesheet`, `/teams`, `/leaderboard`, `/assets`, `/assets/new`, `/employees`, `/company`, `/portals`, `/audit`, `/admin`, `/ai-chat`, `/agent`, `/meetings`, `/chat`, `/docs`, `/automations`, `/forms`, `/whiteboards`, `/desk`, `/templates`, `/integrations`, `/api-tokens`, `/settings`, `/notification-settings`, `/workspace/settings`, `/onboarding`, `/analytics`, `/crm`, `/finance`, `/goals`, `/risks`, `/decisions`, `/import`, `/custom-fields`, `/workflow-states`

## 2. Public crawl sonuçları

Her satır 1500 ms react-query settle bekleyip ekran görüntüsü alıyor
(`test-results/hard-crawl/shot_<path>.png`).

| Path                     | Landed at                | HTTP  | page errors | 4xx/5xx supabase | Notlar |
| ------------------------ | ------------------------ | ----- | ----------- | ---------------- | ------ |
| `/`                      | `/`                      | 200   | 0           | 0                | Landing hero + hero mock render, lime CTA görünür |
| `/auth`                  | `/auth`                  | 200   | 0           | 0                | Google / LinkedIn / Microsoft SSO butonları + tabs |
| `/invite/<bogus>`        | `/invite/<bogus>`        | 200   | 0           | 0                | AcceptInvite fallback ekranı |
| `/f/<bogus>`             | `/f/<bogus>`             | 200   | 0           | 0                | PublicForm 404-benzeri boş |
| `/support/<bogus>`       | `/support/<bogus>`       | 200   | 0           | 0                | Public destek portal boş state |
| `/portal/<bogus>`        | `/portal/<bogus>`        | 200   | 0           | 0                | Client portal token missing/invalid |
| `/nonexistent-page-404`  | `/nonexistent-page-404`  | 200   | 0           | 0                | 404 sayfası |

**Sonuç:** public taraf **temiz**. Hiçbir `pageerror`, hiçbir 4xx/5xx
Supabase çağrısı yok. 60 civarı `console.error` var ama hepsi
`ERR_TUNNEL_CONNECTION_FAILED` / `ERR_CONNECTION_RESET` — bu sandbox
Chromium'ının external CDN'e (Google Fonts, unpkg, sentry ping vs.)
ulaşamamasından. Prod tarayıcıda oluşmaz. Ürün bug'ı **değil**.

## 3. Signed-in crawl — neden skipped

Spec sign-up formunu doğru dolduruyor (fix commit'te), submit sonrası
`waitForURL(≠ /auth, 15s)` bekliyor. Prod Supabase project'inde
(`vpbijxgebwoshvulmeds`) **Auth → Email confirmation açık**; kullanıcı
kaydolduktan sonra oturum otomatik açılmıyor, e-posta doğrulama linkine
tıklanana kadar bekliyor. Test bunu doğru okuyup `test.skip()` ediyor.

51 rotanın hiçbiri **denenmedi** — yani şu an "orası sağlam" veya
"kırık" diye tanı yapılamaz. Denemek için üçünden biri lazım:

**A. En hızlı (yönetici tercihi):** Supabase Dashboard → Authentication
→ Providers → Email → **Confirm email = OFF** (dev/staging için;
prod'da tekrar aç). Sonra bu spec kırmızıya döner, hangi rotalar
kırık ise onlar rapora düşer.

**B. Doğru yol (CI için):** Supabase MCP'de servis-role verilirse ben
`admin_create_test_user` diye tek seferlik bir edge function yazıp
random test user'ı `email_confirm: true` ile provision ederim,
spec ondan sonra login olur. Bir CI için istikrarlı yol.

**C. Elle bir kez:** Prod'ta önceden bir "e2e-crawler@…" user'ı
oluşturup şifresini `.env.local`'e koy, spec'i düzenleyip UI-signup
yerine UI-signin yaptırırım. Bir seferlik doğrulama için yeter, CI
için değil.

## 4. Ekran görüntüleri

`test-results/hard-crawl/shot_*.png` altında 7 dosya. Her biri
`waitUntil: 'domcontentloaded' + 1500ms` sonrası — react-query fetch
biten dokümanı yakalar.

Öne çıkan görsel bulgular (public):
- `/` — landing hero, lime "Get started" CTA, glass "See how it works"
- `/auth` — 3 SSO butonu (G/LinkedIn/MS), tabs, form validation aktif
- `/invite/<bogus>` — muhtemelen "loading" veya "invalid token" ekranı
  (spec bunu kaydediyor; görsel doğrulama ile son karar ver)
- `/portal/<bogus>` — public client portal fallback

## 5. Bilinen açıklar (bu turdaki crawl'ın açığa çıkardığı)

| # | Öncelik | Bulgu | Kanıt |
| - | ------- | ----- | ----- |
| 1 | P0      | Signed-in crawl blocked — email confirmation | test log: `email confirmation on; cannot auto-log-in` |
| 2 | P2      | Public sayfalar hiçbir "beklenmedik" hata üretmiyor | 0 pageerror × 7 route |
| 3 | P2      | External CDN çağrıları sandbox'ta düşüyor | 60+ `ERR_TUNNEL_CONNECTION_FAILED` — env noise, prod'da oluşmaz |
| 4 | P1      | `/invite/<bogus>` için görünür bir "invalid token" UX'i var mı? | ekran doğrulaması yapılmadı — sonraki turda |

**Not:** PRD §6'daki bilinen açıklar (decisions 400, unassigned bucket,
TopBar search, feedback→feature, analytics) bu crawl **doğrudan test
etmedi** çünkü hepsi authenticated yolda. §3'teki skeleton red-testler
onları kapsıyor; auth crawl açılınca çalıştırılabilir.

## 6. Sonraki adım

1. **Email confirmation kararı** (A/B/C'den birini seç).
2. Auth crawl'ı ilk çalıştırma → çıkan pageerror / 4xx / 5xx listesi
   burada §3 tablosuna eklenecek.
3. `test-results/hard-crawl/*.png` PR açıklamasına yüklenebilir —
   görsel regresyon için baseline.
4. Bu spec'i CI'a alacaksak `.github/workflows`'a matrix job olarak
   ekle; her PR'da diff-only public route'lar çalışsın, auth crawl
   nightly.

## 8. Role-flow spec — 2026-08-06 çalıştırma

Seed uygulandı (6 kullanıcı, 2 proje, 10 task — user "geçti" dedi).
`e2e/role-flows.spec.ts` bu sandbox'ta **çalışamadı**: agent proxy'nin
network policy'si `vpbijxgebwoshvulmeds.supabase.co` host'unu 403 ile
reddediyor (hem Chromium hem Node). Yani spec skipped (login timeout),
bug değil environment limiti.

**Nerede çalıştırılabilir:**

- **Yerelde (senin makinen):** `.env` zaten prod'a bakıyor. Şu komut
  yeter:
  ```
  PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=... npx playwright test role-flows.spec.ts
  ```
- **GitHub Actions:** `.github/workflows/e2e-role-flows.yml` eklendi.
  Manual dispatch veya `role-flows.spec.ts` / seed dosyası değiştikçe
  otomatik. `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`
  repo secret'ları set edilmeli. CI runner'ları outbound serbest,
  Supabase'e ulaşır.

**Beklenen sonuç (5 test):**

| Test                                            | Beklenen |
| ----------------------------------------------- | -------- |
| owner: home + issues + create task              | pass     |
| admin1: opens platform-debt + sees own task     | pass     |
| member1: sees only assigned tasks + comment     | pass     |
| viewer: no "New project" button                 | pass     |
| RLS: unauth REST hit returns empty              | pass     |

Bunlardan biri kırmızı olursa: (a) seed'de o role için row eksik, ya
da (b) RLS policy o rolü beklenmedik şekilde engelliyor. Runbook için
§7'ye bak.

## 7. Runbook

Lokal çalıştırma:
```
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
  npm run test:e2e -- hard-crawl.spec.ts
```

Sadece anonim tur:
```
… npm run test:e2e -- hard-crawl.spec.ts -g "anonymous"
```

Sadece auth tur:
```
… npm run test:e2e -- hard-crawl.spec.ts -g "signed-in"
```

Çıktı: `test-results/hard-crawl/{public,auth}.json` + `shot_*.png`.
