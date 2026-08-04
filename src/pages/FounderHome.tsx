import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useCompanyPulse, useApprovals } from "@/lib/graph-hooks";
import { useFinSummary } from "@/lib/finance-hooks";
import { formatCurrency } from "@/lib/finance-types";
import { useModuleAccess } from "@/hooks/useWorkspacePermission";
import { freshnessLabel, cashCardState } from "@/lib/provenance-utils";
import {
  FolderKanban, CheckSquare, Bug, Users, Inbox, ShieldAlert,
  Target, AlertTriangle, ArrowRight, Zap, Wallet, Lock,
} from "lucide-react";
import { FounderBottleneckRadar } from "@/components/FounderBottleneckRadar";
import { FounderMirrorCard } from "@/components/FounderMirrorCard";
import { DecisionDebtCard } from "@/components/decisions/DecisionDebtCard";
import { SilentDecisionRadar } from "@/components/decisions/SilentDecisionRadar";
import { APPROVAL_KIND_LABELS, APPROVAL_PRIORITY_COLORS } from "@/lib/graph-types";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ElementType;
  tone?: "default" | "warning" | "danger" | "success";
  to?: string;
  /** Sayı künyesi (PRD Görev 3): "Kaynak · tazelik" satırı */
  provenance?: string;
}

function MetricCard({ title, value, subtitle, icon: Icon, tone = "default", to, provenance }: MetricCardProps) {
  const toneClass = {
    default: "border-border",
    warning: "border-amber-500/40",
    danger: "border-destructive/50",
    success: "border-emerald-500/40",
  }[tone];

  const body = (
    <Card className={`${toneClass} transition-colors hover:border-primary/60`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground truncate">{title}</p>
            <p className="text-2xl font-semibold mt-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
            {provenance && (
              <p className="text-[10.5px] text-muted-foreground/70 mt-1.5 truncate">{provenance}</p>
            )}
          </div>
          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

/**
 * Nakit pozisyonu kartı (PRD Görev 3): finans yetkisi yoksa sayı sızdırmadan
 * "yetki gerekli"; hesap yoksa "veri yok" (asla yanıltıcı "0" değil).
 */
function PulseCashCard() {
  const { allowed, isLoading: permLoading } = useModuleAccess("finance", "view");
  // Yetki yoksa finans sorgusu hiç atılmaz (UI dürüstlüğü + gereksiz 403 yok)
  const { data: fin, isLoading: finLoading, dataUpdatedAt } = useFinSummary(allowed);

  if (permLoading || (allowed && finLoading)) return <Skeleton className="h-24" />;

  const state = cashCardState({
    allowed,
    accountsCount: fin?.accountsCount,
    cashBase: fin?.cashBase,
  });
  const provenance =
    state.kind === "value"
      ? `FounderOS Finance · ${freshnessLabel(dataUpdatedAt, Date.now())}`
      : "FounderOS Finance";

  if (state.kind === "no_access") {
    return (
      <MetricCard title="Nakit" value="yetki gerekli" subtitle="Finans erişimi kapalı"
        icon={Lock} provenance={provenance} />
    );
  }
  if (state.kind === "no_data") {
    return (
      <MetricCard title="Nakit" value="veri yok" subtitle="Henüz hesap eklenmemiş"
        icon={Wallet} to="/finance" provenance={provenance} />
    );
  }
  return (
    <MetricCard title="Nakit" value={formatCurrency(state.amount, "USD")}
      subtitle={fin?.runwayMonths ? `~${fin.runwayMonths.toFixed(1)} ay runway` : undefined}
      icon={Wallet} to="/finance" provenance={provenance} />
  );
}

export default function FounderHome() {
  const { profile } = useAuth();
  const { data: pulse, isLoading, dataUpdatedAt } = useCompanyPulse();
  const { data: pendingApprovals } = useApprovals({ status: "pending" });
  // Sayı künyesi (PRD Görev 3): kaynak adı + sorgu tazeliği
  const prov = (source: string) =>
    `${source} · ${freshnessLabel(dataUpdatedAt, Date.now())}`;

  const attention = (pendingApprovals ?? [])
    .sort((a, b) => {
      const rank = { urgent: 3, high: 2, normal: 1, low: 0 } as const;
      return rank[b.priority] - rank[a.priority];
    })
    .slice(0, 5);

  const firstName = profile?.full_name?.split(" ")[0] ?? "Founder";
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";

  return (
    <AppLayout>
      <div className="p-4 lg:p-6 space-y-6 max-w-[1400px] mx-auto">
        <div>
          <h1 className="text-2xl font-semibold">
            {greeting}, {firstName}.
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {now.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        {/* Company Pulse */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wide">Company Pulse</h2>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : pulse && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard
                title="Aktif Projeler" value={pulse.activeProjects}
                subtitle={`${pulse.totalProjects} toplam`} icon={FolderKanban} to="/projects"
                provenance={prov("FounderOS Projects")}
              />
              <MetricCard
                title="Açık Görevler" value={pulse.openTasks}
                subtitle={pulse.overdueTasks > 0 ? `${pulse.overdueTasks} gecikmiş` : "gecikme yok"}
                tone={pulse.overdueTasks > 0 ? "warning" : "default"}
                icon={CheckSquare} to="/tasks"
                provenance={prov("FounderOS Work")}
              />
              <MetricCard
                title="Kritik Buglar" value={pulse.criticalBugs}
                subtitle={`${pulse.openBugs} açık toplam`}
                tone={pulse.criticalBugs > 0 ? "danger" : "default"}
                icon={Bug} to="/bugs"
                provenance={prov("FounderOS Bugs")}
              />
              <MetricCard
                title="Bekleyen Onaylar" value={pulse.pendingApprovals}
                subtitle={pulse.urgentApprovals > 0 ? `${pulse.urgentApprovals} acil` : "Founder inbox"}
                tone={pulse.urgentApprovals > 0 ? "danger" : pulse.pendingApprovals > 0 ? "warning" : "default"}
                icon={Inbox} to="/inbox"
                provenance={prov("Founder Inbox")}
              />
              <PulseCashCard />
              <MetricCard
                title="Çalışanlar" value={pulse.totalEmployees} icon={Users} to="/employees"
                provenance={prov("FounderOS People")}
              />
              <MetricCard
                title="Aktif Hedefler" value={pulse.activeGoals}
                subtitle={`${pulse.onTrackGoals} yolunda`}
                tone="success" icon={Target} to="/goals"
                provenance={prov("FounderOS Goals")}
              />
              <MetricCard
                title="Açık Riskler" value={pulse.openRisks}
                subtitle={pulse.criticalRisks > 0 ? `${pulse.criticalRisks} kritik` : "kritik yok"}
                tone={pulse.criticalRisks > 0 ? "danger" : "default"}
                icon={ShieldAlert} to="/risks"
                provenance={prov("FounderOS Risks")}
              />
              <MetricCard
                title="Company Health" value={healthScore(pulse) + "%"}
                subtitle="hesaplanmış" icon={AlertTriangle}
                tone={healthScore(pulse) < 60 ? "danger" : healthScore(pulse) < 80 ? "warning" : "success"}
                provenance="Pulse metriklerinden türetildi"
              />
            </div>
          )}
        </section>

        {/* Karar Borcu (Decision Debt) */}
        <DecisionDebtCard compact />

        {/* Sessiz Karar Radarı — kayda geçmemiş kararlar */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Sessiz Karar Radarı</h2>
          <SilentDecisionRadar limit={3} />
        </section>

        {/* Founder Bottleneck Radar (§3.1) */}
        <FounderBottleneckRadar />

        {/* "Benim Yüzümden" sayacı — radar problemi gösterir, bu ayna tutar */}
        <FounderMirrorCard />

        {/* Attention Required */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wide">Attention Required</h2>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/inbox">
                Tümü <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {(!attention || attention.length === 0) ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Şu an bekleyen kritik bir aksiyon yok. 🎉
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {attention.map(a => (
                    <li key={a.id}>
                      <Link
                        to="/inbox"
                        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
                      >
                        <Badge className={APPROVAL_PRIORITY_COLORS[a.priority]}>
                          {a.priority}
                        </Badge>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{a.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {APPROVAL_KIND_LABELS[a.kind]}
                            {a.amount && ` · ${a.amount.toLocaleString()} ${a.currency ?? ""}`}
                            {" · "}
                            {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: tr })}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Quick Actions */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3">Hızlı Erişim</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <QuickAction to="/projects/new" title="Yeni Proje" />
            <QuickAction to="/bugs/new" title="Bug Bildir" />
            <QuickAction to="/inbox" title="Founder Inbox" />
            <QuickAction to="/ai-chat" title="AI Chief of Staff" />
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

function QuickAction({ to, title }: { to: string; title: string }) {
  return (
    <Link to={to}>
      <Card className="hover:border-primary/60 transition-colors">
        <CardContent className="p-4 flex items-center justify-between">
          <span className="text-sm font-medium">{title}</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
}

function healthScore(p: { activeProjects: number; overdueTasks: number; openTasks: number; criticalBugs: number; urgentApprovals: number; criticalRisks: number }) {
  let score = 100;
  if (p.openTasks > 0) score -= Math.min(20, (p.overdueTasks / p.openTasks) * 40);
  score -= Math.min(20, p.criticalBugs * 4);
  score -= Math.min(20, p.urgentApprovals * 6);
  score -= Math.min(20, p.criticalRisks * 8);
  return Math.max(0, Math.round(score));
}
