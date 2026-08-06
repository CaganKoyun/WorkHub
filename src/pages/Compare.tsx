import { Link } from "react-router-dom";
import { LandingNav } from "./Pricing";
import { Button } from "@/components/ui/button";
import { Check, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Feature = {
  name: string;
  spark: boolean | string;
  notion: boolean | string;
  asana: boolean | string;
  linear: boolean | string;
  monday: boolean | string;
};

const features: Feature[] = [
  { name: "Task management", spark: true, notion: true, asana: true, linear: true, monday: true },
  { name: "Kanban + List + Timeline", spark: true, notion: true, asana: true, linear: true, monday: true },
  { name: "Built-in CRM", spark: true, notion: "Eklenti", asana: false, linear: false, monday: "Eklenti" },
  { name: "Finance & runway", spark: true, notion: false, asana: false, linear: false, monday: false },
  { name: "Goals & OKRs", spark: true, notion: "Manuel", asana: true, linear: "Proje ile", monday: true },
  { name: "Decision System of Record", spark: true, notion: false, asana: false, linear: false, monday: false },
  { name: "Approval workflows", spark: true, notion: false, asana: true, linear: false, monday: true },
  { name: "Risk register", spark: true, notion: false, asana: false, linear: false, monday: false },
  { name: "Docs / Wiki", spark: true, notion: true, asana: false, linear: "Proje dokümanı", monday: "Sınırlı" },
  { name: "Chat & threads", spark: true, notion: false, asana: "Yorum", linear: "Yorum", monday: "Yorum" },
  { name: "Whiteboard", spark: true, notion: false, asana: false, linear: false, monday: true },
  { name: "Forms builder", spark: true, notion: false, asana: true, linear: false, monday: true },
  { name: "Service desk", spark: true, notion: false, asana: false, linear: "Triage", monday: false },
  { name: "Gamification (XP/streak)", spark: true, notion: false, asana: false, linear: false, monday: false },
  { name: "AI Chief of Staff", spark: true, notion: "Notion AI", asana: "AI", linear: false, monday: "AI" },
  { name: "Company Graph", spark: true, notion: false, asana: false, linear: false, monday: false },
  { name: "PWA / offline", spark: true, notion: true, asana: true, linear: true, monday: true },
  { name: "Audit log", spark: true, notion: "Enterprise", asana: "Enterprise", linear: true, monday: "Enterprise" },
  { name: "Custom fields", spark: true, notion: true, asana: true, linear: true, monday: true },
  { name: "Time tracking", spark: true, notion: false, asana: "Eklenti", linear: false, monday: true },
];

const tools = [
  { key: "spark" as const, name: "Spark WorkHub", highlight: true },
  { key: "notion" as const, name: "Notion" },
  { key: "asana" as const, name: "Asana" },
  { key: "linear" as const, name: "Linear" },
  { key: "monday" as const, name: "monday.com" },
];

function CellValue({ val }: { val: boolean | string }) {
  if (val === true) return <Check className="h-4 w-4 text-success mx-auto" />;
  if (val === false) return <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />;
  return <span className="text-[11px] text-muted-foreground">{val}</span>;
}

export default function Compare() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />

      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold tracking-tight">
            Spark WorkHub vs. diğerleri
          </h1>
          <p className="mt-3 text-[15px] text-muted-foreground max-w-2xl mx-auto">
            Tek bir platform, birden fazla aracın yerini tutar. Aşağıdaki tablo, Spark WorkHub'ın
            yerleşik olarak sunduğu özellikleri diğer popüler araçlarla karşılaştırır.
          </p>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border/60 bg-card">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Özellik</th>
                {tools.map((t) => (
                  <th
                    key={t.key}
                    className={cn(
                      "px-4 py-3 text-center font-semibold min-w-[100px]",
                      t.highlight && "bg-primary/5 text-foreground",
                    )}
                  >
                    {t.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map((f, i) => (
                <tr
                  key={f.name}
                  className={cn(
                    "border-b border-border/30 last:border-0",
                    i % 2 === 0 && "bg-secondary/5",
                  )}
                >
                  <td className="px-4 py-2.5 font-medium">{f.name}</td>
                  {tools.map((t) => (
                    <td
                      key={t.key}
                      className={cn(
                        "px-4 py-2.5 text-center",
                        t.highlight && "bg-primary/[0.02]",
                      )}
                    >
                      <CellValue val={f[t.key]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-12 text-center">
          <Link to="/auth">
            <Button size="lg" className="gap-2">
              Spark WorkHub'ı dene <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <p className="mt-3 text-[12.5px] text-muted-foreground">
            14 gün ücretsiz. Kredi kartı gerekmez.
          </p>
        </div>
      </div>
    </div>
  );
}
