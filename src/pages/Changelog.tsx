import { LandingNav } from "./Pricing";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Bug, Wrench, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type EntryKind = "feature" | "fix" | "improvement" | "breaking";

const KIND_CONFIG: Record<EntryKind, { label: string; icon: React.ElementType; className: string }> = {
  feature: { label: "Yeni", icon: Sparkles, className: "bg-success/15 text-success" },
  fix: { label: "Düzeltme", icon: Bug, className: "bg-destructive/15 text-destructive" },
  improvement: { label: "İyileştirme", icon: Wrench, className: "bg-info/15 text-info" },
  breaking: { label: "Kırılma", icon: Zap, className: "bg-warning/15 text-warning" },
};

interface ChangelogEntry {
  date: string;
  version: string;
  items: { kind: EntryKind; text: string }[];
}

const entries: ChangelogEntry[] = [
  {
    date: "6 Ağustos 2026",
    version: "v1.2.0",
    items: [
      { kind: "feature", text: "Karar Kayıt Sistemi (DSoR) — reviewed_by alanı ve gözden geçiren gösterimi" },
      { kind: "feature", text: "Bildirim merkezi genişletildi: onay bildirimleri, push entegrasyonu, tam sayfa /notifications" },
      { kind: "fix", text: "Bildirim kind uyumsuzluğu düzeltildi (dot → underscore)" },
      { kind: "improvement", text: "Marka güncellemesi: Spark WorkHub, Graphite × Lime tasarım sistemi" },
    ],
  },
  {
    date: "5 Ağustos 2026",
    version: "v1.1.0",
    items: [
      { kind: "feature", text: "E2E test altyapısı: 25 Playwright spec, rol bazlı akışlar" },
      { kind: "fix", text: "Sidebar/menü ~30 sayfada kaybolma sorunu düzeltildi (WorkspaceGate → AppLayout)" },
      { kind: "fix", text: "Viewer rolü write CTA'ları gördüğü UX hataları düzeltildi" },
      { kind: "improvement", text: "Task tracking sequence izinleri düzeltildi (member/admin task oluşturma)" },
    ],
  },
  {
    date: "31 Temmuz 2026",
    version: "v1.0.0",
    items: [
      { kind: "feature", text: "Gamification: XP, streak, leaderboard, başarımlar" },
      { kind: "feature", text: "PWA: offline shell, push notifications, installable" },
      { kind: "feature", text: "Yapay Zekâ Ajanı: alan uzmanı çalıştırma motoru" },
      { kind: "feature", text: "Beyaz Tahta: çizim ve diyagram aracı" },
      { kind: "feature", text: "Sohbet: kanallar ve ileti dizileri" },
      { kind: "feature", text: "Dokümanlar/Wiki: sayfa editörü" },
    ],
  },
  {
    date: "28 Temmuz 2026",
    version: "v0.9.0",
    items: [
      { kind: "feature", text: "Şirket Grafiği: kararlar, onaylar, hedefler, riskler arası bağlantı" },
      { kind: "feature", text: "CRM: satış hattı, kişiler, teklifler, sözleşmeler" },
      { kind: "feature", text: "Finans: nakit takibi, bütçe, kâr/zarar" },
      { kind: "feature", text: "Servis Masası: destek talebi yönetimi" },
      { kind: "feature", text: "Portföyler: program yönetimi" },
    ],
  },
  {
    date: "1 Temmuz 2026",
    version: "v0.1.0",
    items: [
      { kind: "feature", text: "İlk sürüm: projeler, görevler, hatalar, kanban, sprint'ler, ekipler" },
      { kind: "feature", text: "Komut paleti (Cmd+K), alt görevler, bağımlılıklar" },
      { kind: "feature", text: "Özel alanlar, zaman takibi, CSV içe aktarma" },
    ],
  },
];

export default function Changelog() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />

      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold tracking-tight">Değişiklik Günlüğü</h1>
          <p className="mt-3 text-[15px] text-muted-foreground">
            Spark WorkHub'daki yenilikler, düzeltmeler ve iyileştirmeler.
          </p>
        </div>

        <div className="space-y-10">
          {entries.map((entry) => (
            <div key={entry.version} className="relative">
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="outline" className="text-[12px] font-mono">
                  {entry.version}
                </Badge>
                <span className="text-[13px] text-muted-foreground">{entry.date}</span>
              </div>
              <div className="space-y-2 pl-1">
                {entry.items.map((item, i) => {
                  const config = KIND_CONFIG[item.kind];
                  return (
                    <div key={i} className="flex items-start gap-2.5">
                      <Badge className={cn("shrink-0 gap-1 text-[10.5px]", config.className)}>
                        <config.icon className="h-3 w-3" /> {config.label}
                      </Badge>
                      <span className="text-[13px] leading-relaxed">{item.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
