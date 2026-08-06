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

## 2. Renk paleti — **Graphite × Lime** (ONAYLANDI, 2026-08-06)

Kaynak: Graphite × Lime design system dokümanı. Yedi kural:
1. Hiyerarşi border'la değil yüzey açıklığıyla.
2. Tek sesli renk: neon lime — ekranın ~%3'ünü geçmez.
3. Anlam pastel pill'lerde yaşar, renkli düz metinde değil.
4. Üç gri metin tonu; vurgu boyut/ağırlıkla.
5. Yumuşak radius: kart 12-14, buton/input 10, modal 16, pill full.
6. 4px grid, yoğun ama disiplinli.
7. Hareket geri bildirimdir (150-250ms ease-out), gösteri değil.

### 2.1 Yüzeyler (koyudan açığa — elevation = lightness)

| Katman | Hex       | CSS var                |
| ------ | --------- | ---------------------- |
| shell  | `#0E0E10` | `--sidebar-background` |
| canvas | `#17171A` | `--background`         |
| panel  | `#1C1C1F` | `--muted`              |
| card   | `#232327` | `--card` `--secondary` |
| hover  | `#2A2A2F` | `--accent`             |
| float  | `#2E2E33` | `--popover`            |
| input  | `#1A1A1E` | `--input`              |

### 2.2 Vurgu + metin

- Primary: **`#C6F432`** (neon lime) · hover `#D4FF4A` · üstünde
  daima koyu `#0E0E10`, asla beyaz
- Text: `#F5F5F7` (primary) / `#A8A8B0` (secondary) / `#6E6E76` (meta)
- Border: `rgba(255,255,255,0.06)` eşdeğeri

### 2.3 Semantik

| Slot        | Hex       |
| ----------- | --------- |
| success     | `#4ADE80` |
| warning     | `#FBBF24` |
| destructive | `#FF6B5E` |
| info        | mavi `213 90% 65%` |

### 2.4 Pastel pill çiftleri (anlam rozetleri — `.pill .pill-*`)

orange `#FFD9B0/#7A3E00` · yellow `#F7F0A0/#5C5200` · red
`#FFB4A8/#7A1200` · teal `#B8F0E4/#00524A` · green `#C8EFC0/#1E5214`
· blue `#BFD9FF/#143A7A` · pink `#F5C6E8/#6B1E56` · subtle
`white/7% + #C9C9D1`

**Mor/violet/indigo bu sistemde YOK.** Eski `--accent-violet` alias'ı
maviye remap edildi (legacy class'lar derlenmeye devam etsin diye).

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
