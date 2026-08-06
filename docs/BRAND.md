# Spark WorkHub — Brand & UI foundations

Tek referans. Renk, tipografi, logo, ton — hepsi burada. Kod bunu tekrar
etmez, bu dosyadan token'a çevrilir (`src/index.css` + `tailwind.config.ts`).

> Durum: **taslak / geçiş.** Aşağıda `TODO(brand):` yazan her yer
> Çağan'ın onayını bekliyor. Onaylar netleşince bu dosya kilitlenir ve
> `src/lib/design-tokens.ts` bundan üretilir.

---

## 1. İsim

- Tam ürün adı: **Spark WorkHub**
- Kısa ad (sidebar rozet, tab title): **Spark**
- Yasal / footer: **Spark WorkHub, © Spark LLC**
- Tag-line (opsiyonel):  TODO(brand)

Kullanım:
- Browser `<title>`: `Spark WorkHub — <sayfa>`
- Sidebar amblem: `S` + StackedLogo, tam metin değil
- Auth ekranı hero: **Spark WorkHub**
- Email/notification "from" adı: **Spark WorkHub**

Eski isim ("FounderOS" / "WorkHub") kalan yerler: `src/pages/Auth.tsx`
hero, `index.html` title, manifest, robot metaları — geçişte hepsi bu
dosyaya göre değişecek.

---

## 2. Renk paleti

### 2.1 Primary (marka)
TODO(brand): mevcut lime `#C6F84F` ve violet `#5E6AD2` değişiyor.
Onay bekleyen alternatifler / yeni hex kodları:

- Primary:      `#______`  (marka rengi, CTA + accent)
- Primary-hover:`#______`
- On-primary:   `#______`  (primary üstünde okunacak text)

### 2.2 Semantik (durum renkleri)

| Slot        | Şu an       | Yeni (TODO) | Kullanım                    |
| ----------- | ----------- | ----------- | --------------------------- |
| success     | #22C55E     | `#______`   | Done, healthy, positive     |
| warning     | #F59E0B     | `#______`   | Blocked, at-risk, medium    |
| destructive | #EF4444     | `#______`   | Delete, error, hard warn    |
| info        | #3B82F6     | `#______`   | Neutral badge, tooltip      |

### 2.3 Yüzeyler (dark-first + light)

Şu anki değerler `src/index.css`'te CSS değişkeni. Yeni palette
netleşince tek yerden update.

- background / foreground
- card / border / muted / muted-foreground
- sidebar-background / sidebar-foreground

---

## 3. Tipografi

Font ailesi: TODO(brand). Şu an system default. Adaylar:
- Inter var (Linear/Vercel benzeri)
- Geist (Vercel)
- SF Pro / system-ui (default)

Ölçek (Linear-esque, mevcut kullanımı koruyoruz):
- `text-[11px]` — meta labels (uppercase tracking-wider)
- `text-[12px]` — chip, secondary
- `text-[13px]` — body / row text
- `text-[14px]` — button, form
- `text-[18-22px]` — page title

Ağırlık: 400 body, 500 emphasized, 600 heading. 700+ kullanılmaz.

---

## 4. Logo

- Şu anki: `src/components/StackedLogo.tsx` — SVG, tek renk
  (currentColor). Boyut `size` prop'u ile.
- Yeni logo asset'i geldiğinde `public/` altına `spark-logo.svg` +
  `spark-icon.svg` (favicon) olarak konur. StackedLogo bu SVG'yi
  import edecek şekilde revize edilir.
- Favicon: `public/favicon.ico` + `apple-touch-icon.png` (180×180).

TODO(brand): Logo SVG'sini ekle veya "mevcutu bu renge boya" de.

---

## 5. Ton & yazı

- Türkçe UI: sen-diline, samimi ama net. "Ekipleri yönet", "Yeni
  proje" gibi.
- İngilizce UI: sentence case, kısa. "New project", "Report bug",
  "Sign in" — Title Case değil.
- Toast / error: fiil + neden. ❌ "Something went wrong." ✅ "Task
  silinemedi — sen owner değilsin."
- Emoji: sadece meta rozetlerinde (📁 projeler, 🎯 hedefler). Text
  içinde kullanılmaz.

---

## 6. Uygulama listesi (rebrand PR'ı buradan yürüyecek)

Değiştirilecek yerler:

- [ ] `index.html` — `<title>`, meta description
- [ ] `public/manifest.json` — name, short_name, theme_color
- [ ] `public/robots.txt` (varsa) — kanonik URL
- [ ] `src/pages/Auth.tsx` — hero "FounderOS" → "Spark WorkHub"
- [ ] `src/pages/Index.tsx` (landing) — hero + meta + og:title
- [ ] `src/components/StackedLogo.tsx` — yeni logo asset'i
- [ ] `src/components/AppSidebar.tsx` — sidebar rozet metni
- [ ] `src/components/AppLayout.tsx` — mobile header "WorkHub" → "Spark"
- [ ] `src/index.css` — CSS değişkenleri (yeni palet)
- [ ] `tailwind.config.ts` — token adları
- [ ] Email template'leri (varsa) — footer, from adı
- [ ] `docs/PRD.md` — ürün adı
- [ ] `docs/ROADMAP.md` — ürün adı
- [ ] `README.md` — ürün adı (varsa)
- [ ] `package.json` — `name` (opsiyonel — bundle adına etki eder)
- [ ] Vercel proje adı — dashboard'dan manual

---

## 7. Yürütme sırası

Palet + isim onaylanınca:

1. Bu dosyanın TODO'ları doldurulur, dosya donar.
2. Tek büyük PR: token'lar → landing → auth → shell → metadata.
   (Component-by-component değil — tek atış, tek Vercel deploy.)
3. Regression: mevcut Playwright suite'i koştur — pageerror /
   layout kayması yakalar.
4. Görsel doğrulama: preview URL üstünden light + dark + mobile.
5. Merge.
