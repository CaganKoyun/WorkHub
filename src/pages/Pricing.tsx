import { Link } from "react-router-dom";
import { SparkLogo } from "@/components/SparkLogo";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const tiers = [
  {
    name: "Starter",
    price: "Ücretsiz",
    period: "",
    desc: "Küçük ekipler ve solo kurucular için.",
    cta: "Hemen başla",
    highlight: false,
    features: [
      "3 kullanıcıya kadar",
      "Sınırsız proje & task",
      "Kanban, liste, takvim",
      "Bug tracker",
      "Temel CRM (100 kişi)",
      "1 GB dosya depolama",
      "Topluluk desteği",
    ],
  },
  {
    name: "Pro",
    price: "$12",
    period: "/ kullanıcı / ay",
    desc: "Büyüyen startup'lar ve ölçeklenen ekipler.",
    cta: "14 gün ücretsiz dene",
    highlight: true,
    features: [
      "Sınırsız kullanıcı",
      "Goals & OKRs",
      "Decision System of Record",
      "Finance & runway tracking",
      "Gantt timeline",
      "Custom fields & workflows",
      "Otomasyon kuralları",
      "Chief of Staff AI",
      "10 GB dosya depolama",
      "E-posta desteği (24 saat)",
    ],
  },
  {
    name: "Enterprise",
    price: "Özel",
    period: "",
    desc: "Büyük organizasyonlar ve özel ihtiyaçlar.",
    cta: "Bize ulaş",
    highlight: false,
    features: [
      "Pro'daki her şey",
      "SSO / SAML",
      "Audit log genişletilmiş",
      "Özel SLA",
      "Dedicated success manager",
      "On-premise seçeneği",
      "Sınırsız depolama",
      "API rate limit artırımı",
    ],
  },
];

function LandingNav() {
  return (
    <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
      <Link to="/" className="flex items-center gap-2">
        <SparkLogo size={18} />
      </Link>
      <div className="flex items-center gap-4 text-[13px]">
        <Link to="/pricing" className="text-foreground font-medium">Fiyatlandırma</Link>
        <Link to="/compare" className="text-muted-foreground hover:text-foreground">Karşılaştır</Link>
        <Link to="/security" className="text-muted-foreground hover:text-foreground">Güvenlik</Link>
        <Link to="/changelog" className="text-muted-foreground hover:text-foreground">Changelog</Link>
        <Link to="/auth">
          <Button size="sm" className="h-8">Giriş yap</Button>
        </Link>
      </div>
    </nav>
  );
}

export { LandingNav };

export default function Pricing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />

      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold tracking-tight">
            Basit, şeffaf fiyatlandırma
          </h1>
          <p className="mt-3 text-[15px] text-muted-foreground max-w-xl mx-auto">
            Gizli ücret yok. Kullandığın kadar öde, büyüdükçe ölçekle.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={cn(
                "relative rounded-xl border p-6 flex flex-col",
                t.highlight
                  ? "border-primary/50 bg-primary/[0.03] shadow-lg shadow-primary/5"
                  : "border-border/60 bg-card",
              )}
            >
              {t.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="flex items-center gap-1 rounded-full bg-primary px-3 py-0.5 text-[11px] font-semibold text-primary-foreground">
                    <Zap className="h-3 w-3" /> En popüler
                  </span>
                </div>
              )}
              <div className="mb-4">
                <h3 className="text-[16px] font-semibold">{t.name}</h3>
                <p className="mt-1 text-[12.5px] text-muted-foreground">{t.desc}</p>
              </div>
              <div className="mb-6">
                <span className="text-3xl font-bold">{t.price}</span>
                {t.period && <span className="text-[13px] text-muted-foreground ml-1">{t.period}</span>}
              </div>
              <ul className="mb-8 flex-1 space-y-2">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[13px]">
                    <Check className="h-4 w-4 shrink-0 text-success mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link to="/auth">
                <Button
                  className="w-full gap-1.5"
                  variant={t.highlight ? "default" : "outline"}
                >
                  {t.cta} <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-[13px] text-muted-foreground">
            Tüm planlar 14 gün ücretsiz deneme ile gelir. Kredi kartı gerekmez.
          </p>
        </div>
      </div>
    </div>
  );
}
