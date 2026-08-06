import { LandingNav } from "./Pricing";
import {
  Shield, Lock, Eye, Server, KeyRound, Users, FileCheck, Globe,
} from "lucide-react";

const sections = [
  {
    icon: Lock,
    title: "Uçtan uca şifreleme",
    body: "Tüm veriler transit halinde TLS 1.3, durağan halde AES-256 ile şifrelenir. Supabase altyapısı SOC 2 Type II sertifikalıdır.",
  },
  {
    icon: Shield,
    title: "Row Level Security",
    body: "Her veritabanı sorgusu Postgres RLS politikalarıyla korunur. Kullanıcılar yalnızca kendi workspace verilerine erişebilir — API seviyesinde değil, veritabanı seviyesinde zorunlu.",
  },
  {
    icon: KeyRound,
    title: "Kimlik doğrulama",
    body: "Supabase Auth ile e-posta + şifre, magic link ve OAuth (Google, GitHub) desteği. Enterprise planında SAML/SSO entegrasyonu.",
  },
  {
    icon: Eye,
    title: "Audit log",
    body: "Tüm kritik işlemler (CRUD, üye değişiklikleri, onay kararları) değiştirilemez audit log'a yazılır. Enterprise planında 1 yıl saklama.",
  },
  {
    icon: Server,
    title: "Altyapı",
    body: "Supabase Cloud üzerinde barındırılır — AWS eu-central-1. Vercel Edge Network ile global CDN. Otomatik yedekleme, point-in-time recovery.",
  },
  {
    icon: Users,
    title: "Erişim kontrolü",
    body: "Workspace bazlı roller: Owner, Admin, Member, Viewer. Granüler izinler modül ve eylem bazında yapılandırılabilir.",
  },
  {
    icon: FileCheck,
    title: "Veri koruma",
    body: "KVKK ve GDPR uyumlu veri işleme. Kullanıcı verileri talep üzerine silinir (right to erasure). Veri dışa aktarma her zaman mümkün.",
  },
  {
    icon: Globe,
    title: "Güvenlik açığı bildirimi",
    body: "Sorumlu açıklama politikası. Güvenlik açıklarını security@sparkworkhub.com adresine bildirebilirsiniz.",
  },
];

export default function Security() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />

      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="text-center mb-14">
          <div className="inline-flex items-center justify-center rounded-full bg-primary/10 p-3 mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Güvenlik</h1>
          <p className="mt-3 text-[15px] text-muted-foreground max-w-xl mx-auto">
            Verinin güvende olması bir özellik değil, ön koşul.
            Spark WorkHub güvenliği altyapı seviyesinde sağlar.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {sections.map((s) => (
            <div
              key={s.title}
              className="rounded-lg border border-border/60 bg-card p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="rounded-md bg-primary/10 p-2">
                  <s.icon className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-[14px] font-semibold">{s.title}</h3>
              </div>
              <p className="text-[13px] text-muted-foreground leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
