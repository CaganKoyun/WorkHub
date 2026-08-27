import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useCompanyPulse, useApprovals, useWeekTrend, useRecentActivity } from "@/lib/graph-hooks";
import { useFinSummary } from "@/lib/finance-hooks";
import { formatCurrency } from "@/lib/finance-types";
import { useModuleAccess } from "@/hooks/useWorkspacePermission";
import { freshnessLabel, cashCardState } from "@/lib/provenance-utils";
import {
  FolderKanban, CheckSquare, Bug, Users, Inbox, ShieldAlert,
  Target, AlertTriangle, ArrowRight, Zap, Wallet, Lock,
  TrendingUp, TrendingDown, Minus, Brain, Activity,
  ListTodo, GitBranch, Gavel,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { FounderBottleneckRadar } from "@/components/FounderBottleneckRadar";
import { FounderMirrorCard } from "@/components/FounderMirrorCard";
import { DecisionDebtCard } from "@/components/decisions/DecisionDebtCard";
import { SilentDecisionRadar } from "@/components/decisions/SilentDecisionRadar";
import { APPROVAL_KIND_LABELS, APPROVAL_PRIORITY_COLORS } from "@/lib/graph-types";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ElementType;
  tone?: "default" | "warning" | "danger" | "success";
  to?: string;
  provenance?: string;
  trend?: { current: number; previous: number };
}

function trendIndicator(current: number, previous: number) {
  if (previous === 0 && current === 0) return { icon: Minus, label: "—", className: "text-muted-foreground" };
  if (previous === 0) return { icon: TrendingUp, label: `+${current}`, className: "text-success" };
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct > 0) return { icon: TrendingUp, label: `+${pct}%`, className: "text-success" };
  if (pct < 0) return { icon: TrendingDown, label: `${pct}%`, className: "text-destructive" };
  return { icon: Minus, label: "0%", className: "text-muted-foreground" };
}

function MetricCard({ title, value, subtitle, icon: Icon, tone = "default", to, provenance, trend }: MetricCardProps) {
  const toneClass = {
    default: "border-border",
    warning: "border-warning/40",
    danger: "border-destructive/50",
    success: "border-success/40",
  }[tone];

  const body = (
    <Card className={cn(toneClass, "transition-colors hover:border-primary/60")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground truncate">{title}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-2xl font-semibold">{value}</p>
              {trend && (() => {
                const t = trendIndicator(trend.current, trend.previous);
                return (
                  <span className={cn("inline-flex items-center gap-0.5 text-[11px] font-medium", t.className)}>
                    <t.icon className="h-3 w-3" /> {t.label}
                  </span>
                );
              })()}
            </div>
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

function PulseCashCard() {
  const { allowed, isLoading: permLoading } = useModuleAccess("finance", "view");
  const { data: fin, isLoading: finLoading, dataUpdatedAt } = useFinSummary(allowed);

  if (permLoading || (allowed && finLoading)) return <Skeleton className="h-24" />;

  const state = cashCardState({
    allowed,
    accountsCount: fin?.accountsCount,
    cashBase: fin?.cashBase,
  });
  const provenance =
    state.kind === "value"
      ? `Spark WorkHub Finance · ${freshnessLabel(dataUpdatedAt, Date.now())}`
      : "Spark WorkHub Finance";

  if (state.kind === "no_access") {
    return (
      <MetricCard title="Nakit" value="yetki gerekli" subtitle="Finans erisimi kapali"
        icon={Lock} provenance={provenance} />
    );
  }
  if (state.kind === "no_data") {
    return (
      <MetricCard title="Nakit" value="veri yok" subtitle="Henuz hesap eklenmemis"
        icon={Wallet} to="/finance" provenance={provenance} />
    );
  }
  return (
    <MetricCard title="Nakit" value={formatCurrency(state.amount, "USD")}
      subtitle={fin?.runwayMonths ? `~${fin.runwayMonths.toFixed(1)} ay runway` : undefined}
      icon={Wallet} to="/finance" provenance={provenance} />
  );
}

function DailyBriefing({ pulse, trends }: {
  pulse: ReturnType<typeof useCompanyPulse>["data"];
  trends: ReturnType<typeof useWeekTrend>["data"];
}) {
  if (!pulse) return null;

  const alerts: string[] = [];
  if (pulse.overdueTasks > 0) alerts.push(`${pulse.overdueTasks} gecikmiş görev var`);
  if (pulse.criticalBugs > 0) alerts.push(`${pulse.criticalBugs} kritik bug açık`);
  if (pulse.urgentApprovals > 0) alerts.push(`${pulse.urgentApprovals} acil onay bekliyor`);
  if (pulse.criticalRisks > 0) alerts.push(`${pulse.criticalRisks} kritik risk izleniyor`);

  const wins: string[] = [];
  if (trends) {
    if (trends.tasksCompleted > 0) wins.push(`Bu hafta ${trends.tasksCompleted} görev tamamlandı`);
    if (trends.bugsFixed > 0) wins.push(`${trends.bugsFixed} bug düzeltildi`);
    if (trends.decisionsRecorded > 0) wins.push(`${trends.decisionsRecorded} karar kaydedildi`);
  }

  const score = healthScore(pulse);
  const mood = score >= 80 ? "Güçlü" : score >= 60 ? "Dikkatli" : "Kritik";
  const moodColor = score >= 80 ? "text-success" : score >= 60 ? "text-warning" : "text-destructive";

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">Günlük Özet</h3>
              <Badge variant="outline" className={cn("text-[10px]", moodColor)}>
                {mood} · {score}%
              </Badge>
            </div>
            {alerts.length > 0 && (
              <div className="space-y-1">
                {alerts.map((a, i) => (
                  <p key={i} className="text-[13px] text-warning flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3 shrink-0" /> {a}
                  </p>
                ))}
              </div>
            )}
            {wins.length > 0 && (
              <div className="space-y-1">
                {wins.map((w, i) => (
                  <p key={i} className="text-[13px] text-success flex items-center gap-1.5">
                    <TrendingUp className="h-3 w-3 shrink-0" /> {w}
                  </p>
                ))}
              </div>
            )}
            {alerts.length === 0 && wins.length === 0 && (
              <p className="text-[13px] text-muted-foreground">Her şey yolunda. Tebrikler!</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function WeeklyVelocity({ trends }: { trends: ReturnType<typeof useWeekTrend>["data"] }) {
  if (!trends) return null;
  const items = [
    { label: "Görev", current: trends.tasksCompleted, prev: trends.tasksCompletedPrev, icon: ListTodo },
    { label: "Bug", current: trends.bugsFixed, prev: trends.bugsFixedPrev, icon: Bug },
    { label: "Karar", current: trends.decisionsRecorded, prev: trends.decisionsRecordedPrev, icon: Gavel },
  ];
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-wide">Haftalık Hız</h2>
        <span className="text-[10.5px] text-muted-foreground">(son 7 gün vs önceki 7 gün)</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {items.map(item => {
          const t = trendIndicator(item.current, item.prev);
          return (
            <Card key={item.label}>
              <CardContent className="p-4 text-center">
                <item.icon className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                <p className="text-2xl font-semibold">{item.current}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <span className={cn("inline-flex items-center gap-0.5 text-[11px] font-medium mt-1", t.className)}>
                  <t.icon className="h-3 w-3" /> {t.label}
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function RecentActivityFeed() {
  const { data: items, isLoading } = useRecentActivity(8);
  if (isLoading) return <Skeleton className="h-40" />;
  if (!items || items.length === 0) return null;

  const typeConfig = {
    task: { icon: CheckSquare, label: "Görev", color: "text-info" },
    bug: { icon: Bug, label: "Bug", color: "text-destructive" },
    decision: { icon: Gavel, label: "Karar", color: "text-warning" },
  };

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <GitBranch className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-wide">Son Hareketler</h2>
      </div>
      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {items.map(item => {
              const cfg = typeConfig[item.type];
              const Icon = cfg.icon;
              return (
                <li key={`${item.type}-${item.id}`} className="flex items-center gap-3 px-4 py-2.5">
                  <Icon className={cn("h-3.5 w-3.5 shrink-0", cfg.color)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium truncate">{item.title}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">{item.status}</Badge>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true, locale: tr })}
                  </span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}

export default function FounderHome() {
  const { profile } = useAuth();
  const { data: pulse, isLoading, isError, dataUpdatedAt } = useCompanyPulse();
  const { data: pendingApprovals } = useApprovals({ status: "pending" });
  const { data: trends } = useWeekTrend();
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
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold">
            {greeting}, {firstName}.
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {now.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        {isError && (
          <EmptyState
            icon={AlertTriangle}
            title="Çalışma alanı verileri yüklenemedi"
            description="Metrikler alınırken bir sorun oluştu. Lütfen sayfayı yenileyin."
            action={{ label: "Yenile", onClick: () => window.location.reload() }}
            compact
          />
        )}

        {/* AI Daily Briefing */}
        <DailyBriefing pulse={pulse} trends={trends} />

        {/* Weekly Velocity */}
        <WeeklyVelocity trends={trends} />

        {/* Şirket Nabzı */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wide">Şirket Nabzı</h2>
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
                provenance={prov("Spark WorkHub Projects")}
              />
              <MetricCard
                title="Açık Görevler" value={pulse.openTasks}
                subtitle={pulse.overdueTasks > 0 ? `${pulse.overdueTasks} gecikmiş` : "gecikme yok"}
                tone={pulse.overdueTasks > 0 ? "warning" : "default"}
                icon={CheckSquare} to="/tasks"
                provenance={prov("Spark WorkHub Work")}
              />
              <MetricCard
                title="Kritik Buglar" value={pulse.criticalBugs}
                subtitle={`${pulse.openBugs} açık toplam`}
                tone={pulse.criticalBugs > 0 ? "danger" : "default"}
                icon={Bug} to="/bugs"
                provenance={prov("Spark WorkHub Bugs")}
              />
              <MetricCard
                title="Bekleyen Onaylar" value={pulse.pendingApprovals}
                subtitle={pulse.urgentApprovals > 0 ? `${pulse.urgentApprovals} acil` : "Founder İnbox"}
                tone={pulse.urgentApprovals > 0 ? "danger" : pulse.pendingApprovals > 0 ? "warning" : "default"}
                icon={Inbox} to="/inbox"
                provenance={prov("Founder Inbox")}
              />
              <PulseCashCard />
              <MetricCard
                title="Çalışanlar" value={pulse.totalEmployees} icon={Users} to="/employees"
                provenance={prov("Spark WorkHub People")}
              />
              <MetricCard
                title="Aktif Hedefler" value={pulse.activeGoals}
                subtitle={`${pulse.onTrackGoals} yolunda`}
                tone="success" icon={Target} to="/goals"
                provenance={prov("Spark WorkHub Goals")}
              />
              <MetricCard
                title="Açık Riskler" value={pulse.openRisks}
                subtitle={pulse.criticalRisks > 0 ? `${pulse.criticalRisks} kritik` : "kritik yok"}
                tone={pulse.criticalRisks > 0 ? "danger" : "default"}
                icon={ShieldAlert} to="/risks"
                provenance={prov("Spark WorkHub Risks")}
              />
              <MetricCard
                title="Şirket Sağlığı" value={healthScore(pulse) + "%"}
                subtitle="hesaplanmış" icon={AlertTriangle}
                tone={healthScore(pulse) < 60 ? "danger" : healthScore(pulse) < 80 ? "warning" : "success"}
                provenance="Pulse metriklerinden türetildi"
              />
            </div>
          )}
        </section>

        {/* Decision Debt */}
        <DecisionDebtCard compact />

        {/* Silent Decision Radar */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Sessiz Karar Radarı</h2>
          <SilentDecisionRadar limit={3} />
        </section>

        {/* Founder Bottleneck Radar */}
        <FounderBottleneckRadar />

        {/* "Because of me" counter */}
        <FounderMirrorCard />

        {/* Recent Activity Feed */}
        <RecentActivityFeed />

        {/* Dikkat Gerekli */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <h2 className="text-sm font-semibold uppercase tracking-wide">Dikkat Gerekli</h2>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/inbox">
                Tumu <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {(!attention || attention.length === 0) ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Şu an bekleyen kritik bir aksiyon yok.
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
