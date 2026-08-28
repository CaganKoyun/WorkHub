import { Link } from "react-router-dom";
import {
  ArrowRight, CheckCircle2, LayoutGrid, Users, Target, Sparkles,
  BarChart3, Workflow, Plus, Search, Circle, CheckSquare,
} from "lucide-react";
import { SparkLogo } from "@/components/SparkLogo";

const features = [
  { icon: LayoutGrid, title: "İş yönetimi", desc: "Projeler, görevler ve hatalar Liste, Board, Zaman Çizelgesi ve Takvim'de — Şirket Grafiği ile birbirine bağlı." },
  { icon: Target, title: "Hedefler & OKR'lar", desc: "Altındaki her görev ve projeden otomatik olarak toplanan hedefler ve anahtar sonuçlar." },
  { icon: Users, title: "CRM & Gelir", desc: "Pipeline, teklifler, sözleşmeler ve müşteri sağlığı. Kazanılan anlaşmalar doğrudan Finans ve teslimat projelerine akar." },
  { icon: BarChart3, title: "Finans", desc: "Nakit, yakım, pist ve proje kâr/zarar. Çoklu para birimi, bütçe sapması, gerçek kayıtlarınızdan canlı." },
  { icon: Workflow, title: "Kurucu Gelen Kutusu", desc: "Her onay için tek kuyruk — işe alım, harcama, sözleşmeler. Tam bağlamla karar verin." },
  { icon: Sparkles, title: "Yapay Zeka Asistanı", desc: "Her modülde alan uzmanı bir ajan, kendi çalışma alanı verilerinize dayalı." },
];

const modules = [
  "Projeler", "Görevler", "Hatalar", "Hedefler", "Riskler", "Kararlar",
  "CRM", "Finans", "Varlıklar", "Çalışanlar", "Ürün", "Analitik",
];

const boardColumns = [
  {
    name: "Yapılacak",
    tint: "bg-primary",
    cards: [
      { title: "Q3 fiyat kararı", meta: "Karar · Cuma'ya kadar", tag: "Strateji" },
      { title: "Acme Health onboarding", meta: "Proje · 6 görev", tag: "Teslimat" },
    ],
  },
  {
    name: "Devam ediyor",
    tint: "bg-info",
    cards: [
      { title: "Pist modeli v4", meta: "Finans · Selin", tag: "Finans" },
      { title: "Fatura API sunumu", meta: "Sürüm · %72", tag: "Ürün" },
    ],
  },
  {
    name: "Tamamlandı",
    tint: "bg-success",
    cards: [{ title: "Seed yatırım kapanışı", meta: "Kapandı · 12 Haz", tag: "Gelir" }],
  },
];

const howItWorks = [
  { step: "1", title: "Çalışma alanını kur", desc: "Bir şablon seç ya da sıfırdan başla. Hazır olduğunda ekibini davet et — tek kişi ya da 50 kişiyle çalışır." },
  { step: "2", title: "Her şeyi birbirine bağla", desc: "Projeler, CRM, Finans, Hedefler, Kararlar — Şirket Grafiği ile hepsi bağlı. Artık sekme değiştirme yok." },
  { step: "3", title: "Bağlamla karar ver", desc: "Her onay, her karar neden'i ve sonra ne olduğu'nu yakalar. Şirketin kendi oyun kitabını oluşturur." },
];

const testimonials = [
  { name: "Selin Aydın", role: "CEO, Kestrel Labs", quote: "Notion, Asana ve bir tablo yerine tek bir araç kullanıyoruz. Karar günlüğü tek başına parasını hak etti." },
  { name: "Ahmet Yılmaz", role: "COO, Volta", quote: "Kurucu Gelen Kutusu kararlarımızı nasıl aldığımızı değiştirdi. Her şeyin bağlamı var, hiçbir şey kaybolmuyor." },
  { name: "Elif Demir", role: "Operasyon Müdürü, Bright & Co", quote: "Finans modülü bana pist ve yakımı gerçek zamanlı veriyor. Artık aylık kapanışı beklemek yok." },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1180px] items-center justify-between px-6">
          <Link to="/" className="flex items-center">
            <SparkLogo size={17} />
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            <a href="#features" className="rounded-md px-3 py-1.5 text-[13.5px] font-medium text-muted-foreground transition-colors hover:text-foreground">
              Ürün
            </a>
            <Link to="/pricing" className="rounded-md px-3 py-1.5 text-[13.5px] font-medium text-muted-foreground transition-colors hover:text-foreground">
              Fiyatlandırma
            </Link>
            <Link to="/compare" className="rounded-md px-3 py-1.5 text-[13.5px] font-medium text-muted-foreground transition-colors hover:text-foreground">
              Karşılaştır
            </Link>
            <Link to="/security" className="rounded-md px-3 py-1.5 text-[13.5px] font-medium text-muted-foreground transition-colors hover:text-foreground">
              Güvenlik
            </Link>
            <Link to="/changelog" className="rounded-md px-3 py-1.5 text-[13.5px] font-medium text-muted-foreground transition-colors hover:text-foreground">
              Değişiklik Günlüğü
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/auth" className="hidden rounded-md px-3 py-1.5 text-[13.5px] font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-block">
              Giriş yap
            </Link>
            <Link
              to="/auth"
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-[13.5px] font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              Ücretsiz başla
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-canvas px-6 pb-0 pt-20">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] glow-primary" aria-hidden />
        <div className="relative mx-auto max-w-[1000px] text-center">
          <div className="inline-flex h-7 items-center gap-2 rounded-full border border-border bg-background px-3 text-[11.5px] font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            100+ kurucu bekleme listesinde
          </div>

          <h1 className="mx-auto mt-6 max-w-[860px] text-[clamp(2.5rem,5.4vw,4.25rem)] font-semibold leading-[1.03] tracking-[-0.035em]">
            Şirketinizin işleri<br className="hidden sm:block" /> gerçekten burada yaşıyor
          </h1>

          <p className="mx-auto mt-5 max-w-[600px] text-[16.5px] leading-relaxed text-muted-foreground">
            Projeler, CRM, Finans, Hedefler ve Kararlar tek bir çalışma alanında — Şirket Grafiği
            ve işinizi bilen bir AI ile birbirine bağlı.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/auth"
              className="btn-lime inline-flex h-11 items-center gap-2 rounded-md px-6 text-[14.5px] font-semibold shadow-lg shadow-[hsl(var(--accent-lime)/0.25)]"
            >
              Ücretsiz başla
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#features"
              className="glass-panel inline-flex h-11 items-center gap-2 rounded-md px-6 text-[14.5px] font-medium transition-colors hover:bg-secondary/70"
            >
              Özellikleri keşfet
            </a>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12.5px] text-muted-foreground">
            {["Ücretsiz başla", "Kredi kartı yok", "2 dakikada kurulum"].map(t => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Product mock */}
        <div className="relative mx-auto mt-16 max-w-[1120px]">
          <div className="overflow-hidden rounded-t-xl border border-b-0 border-border bg-background elevation-2">
            <div className="flex">
              {/* rail */}
              <div className="hidden w-[52px] shrink-0 flex-col items-center gap-3 bg-sidebar py-3 sm:flex">
                <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
                  <SparkLogo variant="mark" size={12} />
                </span>
                {[0, 1, 2, 3, 4].map(i => (
                  <span key={i} className={`h-6 w-6 rounded-md ${i === 1 ? "bg-sidebar-accent" : "bg-sidebar-accent/40"}`} />
                ))}
              </div>
              {/* sidebar */}
              <div className="hidden w-[176px] shrink-0 flex-col gap-2 bg-sidebar px-3 py-3 md:flex">
                <div className="flex h-7 items-center justify-center gap-1.5 rounded-full bg-primary text-[11.5px] font-medium text-primary-foreground">
                  <Plus className="h-3 w-3" /> Oluştur
                </div>
                <div className="mt-2 space-y-1">
                  {modules.slice(0, 7).map((m, i) => (
                    <div
                      key={m}
                      className={`flex h-7 items-center gap-2 rounded-md px-2 text-[11.5px] ${
                        i === 0 ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground"
                      }`}
                    >
                      <span className="h-2.5 w-2.5 rounded-sm bg-current opacity-50" />
                      {m}
                    </div>
                  ))}
                </div>
              </div>
              {/* content */}
              <div className="min-w-0 flex-1">
                <div className="flex h-11 items-center gap-3 border-b border-border px-4">
                  <span className="text-[12px] text-muted-foreground">İş</span>
                  <span className="text-[12px] text-muted-foreground">/</span>
                  <span className="text-[12px] font-medium">Büyüme yol haritası</span>
                  <div className="ml-auto hidden h-7 w-[240px] items-center gap-2 rounded-full bg-secondary px-3 text-[11.5px] text-muted-foreground sm:flex">
                    <Search className="h-3 w-3" /> Ara
                  </div>
                </div>
                <div className="flex h-10 items-center gap-1 border-b border-border px-4">
                  {["Genel Bakış", "Pano", "Liste", "Zaman Çizelgesi", "Kontrol Paneli"].map((t, i) => (
                    <span key={t} className="asana-tab !h-10 !px-2.5 !text-[12px]" data-active={i === 1}>
                      {t}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3 bg-canvas p-4">
                  {boardColumns.map(col => (
                    <div key={col.name} className="space-y-2">
                      <div className="flex items-center gap-1.5 text-[11.5px] font-medium">
                        <span className={`h-2 w-2 rounded-full ${col.tint}`} />
                        {col.name}
                      </div>
                      {col.cards.map(c => (
                        <div key={c.title} className="rounded-lg border border-border bg-background p-2.5 shadow-sm">
                          <div className="flex items-start gap-1.5">
                            <Circle className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                            <span className="text-[11.5px] font-medium leading-snug">{c.title}</span>
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">{c.meta}</span>
                            <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[9.5px] font-medium text-muted-foreground">
                              {c.tag}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-border px-6 py-20">
        <div className="mx-auto max-w-[1120px]">
          <div className="text-center">
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-primary">
              Nasıl çalışır
            </span>
            <h2 className="mt-3 text-[clamp(1.8rem,3.4vw,2.6rem)] font-semibold leading-tight tracking-[-0.03em]">
              Kayıt oldan ilk kararınıza 3 adımda
            </h2>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {howItWorks.map(s => (
              <div key={s.step} className="text-center">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
                  {s.step}
                </span>
                <h3 className="mt-4 text-[15px] font-semibold">{s.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-20">
        <div className="mx-auto max-w-[1120px]">
          <div className="max-w-[620px]">
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-primary">
              Tek çalışma alanı
            </span>
            <h2 className="mt-3 text-[clamp(1.8rem,3.4vw,2.6rem)] font-semibold leading-tight tracking-[-0.03em]">
              Şirketin her parçası, aynı sistemde
            </h2>
            <p className="mt-4 text-[15.5px] leading-relaxed text-muted-foreground">
              Beş aracı birbirine bağlamayı bırakın. Spark WorkHub bir projeyi müşterisine, bütçesine,
              hedefine, riskine ve onu başlatan karara bağlar.
            </p>
          </div>

          <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {features.map(f => (
              <div key={f.title} className="group relative bg-background p-6 transition-colors hover:bg-canvas">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15 transition-colors group-hover:bg-primary/15">
                  <f.icon className="h-[18px] w-[18px]" />
                </span>
                <h3 className="mt-5 text-[15px] font-semibold tracking-tight">{f.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DSoR split section */}
      <section className="border-y border-border bg-canvas px-6 py-20">
        <div className="mx-auto grid max-w-[1120px] items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-primary">
              Karar kayıt sistemi
            </span>
            <h2 className="mt-3 text-[clamp(1.7rem,3.2vw,2.4rem)] font-semibold leading-tight tracking-[-0.03em]">
              Şirketler sonuçları kaydeder. Biz kararın kendisini kaydederiz.
            </h2>
            <p className="mt-4 text-[15.5px] leading-relaxed text-muted-foreground">
              Bağlamı, seçenekleri, güven seviyesini ve beklenen sonucu yakalayın — sonra
              Spark WorkHub'ın aylar sonra gerçekte ne olduğunu göstermesine izin verin.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Karar anında dondurulan bağlam görüntüsü",
                "Beklenen ve gerçekleşen sonuç karşılaştırmaları",
                "Her görev, harcama ve risk kararına bağlı",
              ].map(t => (
                <li key={t} className="flex items-start gap-2.5 text-[14px]">
                  <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {t}
                </li>
              ))}
            </ul>
            <Link
              to="/auth"
              className="mt-7 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Ücretsiz başla <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="rounded-xl border border-border bg-background p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold">Fiyat değişikliği — AB segmenti</span>
              <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                İncelendi
              </span>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              Döviz değişimi sonrası marjı korumak için AB liste fiyatını %12 artır. Karar anında güven: %70.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4">
              {[
                { k: "Beklenen ARR", v: "+$180k" },
                { k: "Gerçekleşen", v: "+$146k" },
                { k: "Kayıp farkı", v: "+0.8pt" },
              ].map(m => (
                <div key={m.k}>
                  <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">{m.k}</div>
                  <div className="mt-0.5 text-[15px] font-semibold tabular">{m.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-[1120px]">
          <div className="text-center">
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-primary">
              Kurucular ne diyor
            </span>
            <h2 className="mt-3 text-[clamp(1.5rem,2.6vw,2rem)] font-semibold tracking-[-0.03em]">
              Kurucular tarafından, kurucular için
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {testimonials.map(t => (
              <div key={t.name} className="rounded-xl border border-border bg-background p-6">
                <p className="text-[14px] leading-relaxed text-muted-foreground">"{t.quote}"</p>
                <div className="mt-4 border-t border-border pt-4">
                  <p className="text-[13px] font-semibold">{t.name}</p>
                  <p className="text-[12px] text-muted-foreground">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules */}
      <section className="border-t border-border px-6 py-16">
        <div className="mx-auto max-w-[900px] text-center">
          <h2 className="text-[clamp(1.5rem,2.6vw,2rem)] font-semibold tracking-[-0.03em]">
            Tüm modüller dahil
          </h2>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {modules.map(m => (
              <span key={m} className="rounded-full border border-border bg-secondary px-3.5 py-1.5 text-[13px] font-medium text-muted-foreground">
                {m}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-20">
        <div className="relative mx-auto max-w-[1120px] overflow-hidden rounded-2xl border border-border bg-sidebar px-8 py-14 text-center elevation-2">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-full glow-primary opacity-70" aria-hidden />
          <div className="relative">
            <h2 className="mx-auto max-w-[620px] text-[clamp(1.7rem,3.2vw,2.4rem)] font-semibold leading-tight tracking-[-0.03em] text-sidebar-accent-foreground">
              Tüm şirketi tek yerden yönetin
            </h2>
            <p className="mx-auto mt-3 max-w-[520px] text-[15px] text-sidebar-foreground">
              Çalışma alanınızı iki dakikada kurun. Hazır olduğunuzda ekibinizi davet edin.
            </p>
            <Link
              to="/auth"
              className="mt-7 inline-flex h-11 items-center gap-2 rounded-md bg-primary px-6 text-[14.5px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Hemen başla <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-10">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-4">
          <div className="flex items-center">
            <SparkLogo size={16} />
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-muted-foreground">
            <a href="#features" className="transition-colors hover:text-foreground">Ürün</a>
            <Link to="/pricing" className="transition-colors hover:text-foreground">Fiyatlandırma</Link>
            <Link to="/security" className="transition-colors hover:text-foreground">Güvenlik</Link>
            <Link to="/changelog" className="transition-colors hover:text-foreground">Değişiklik Günlüğü</Link>
          </div>
          <span className="text-[12.5px] text-muted-foreground">&copy; {new Date().getFullYear()} Spark WorkHub</span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
