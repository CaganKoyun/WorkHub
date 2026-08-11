import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { useCompanyPulse, useRecentActivity } from "@/lib/graph-hooks";
import { useProjects } from "@/lib/projects-hooks";
import { useWorkspaceIssues } from "@/lib/tasks-hooks";
import { useCycles } from "@/lib/cycles-hooks";
import { useGoals } from "@/lib/graph-hooks";
import {
  FolderKanban, CheckSquare, Bug, Users, Target,
  ArrowRight, BarChart3, Calendar, Loader2,
  AlertTriangle, CheckCircle2, Clock, Layers,
  LayoutDashboard, TrendingUp, GitBranch,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "@/lib/tasks-types";

function StatCard({
  title, value, subtitle, icon: Icon, to, tone = "default",
}: {
  title: string; value: number | string; subtitle?: string;
  icon: React.ElementType; to?: string; tone?: "default" | "warning" | "danger" | "success";
}) {
  const toneClass = {
    default: "", warning: "border-warning/30", danger: "border-destructive/40", success: "border-success/30",
  }[tone];

  const body = (
    <Card className={cn("hover:border-primary/50 transition-colors", toneClass)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{title}</p>
            <p className="text-2xl font-semibold mt-1">{value}</p>
            {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <div className="h-8 w-8 rounded-lg bg-muted/60 flex items-center justify-center">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

function TasksByStatus({ tasks }: { tasks: Task[] }) {
  const statusGroups: { key: TaskStatus; label: string; color: string }[] = [
    { key: "todo", label: "To Do", color: "bg-muted-foreground" },
    { key: "in_progress", label: "In Progress", color: "bg-warning" },
    { key: "review", label: "In Review", color: "bg-info" },
    { key: "done", label: "Done", color: "bg-success" },
  ];
  const total = tasks.length || 1;
  return (
    <div className="space-y-2">
      {statusGroups.map(g => {
        const count = tasks.filter(t => t.status === g.key).length;
        const pct = Math.round((count / total) * 100);
        return (
          <div key={g.key} className="flex items-center gap-3">
            <span className="text-[11px] text-muted-foreground w-20 truncate">{g.label}</span>
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div className={cn("h-full rounded-full transition-all", g.color)} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[11px] text-muted-foreground w-8 text-right">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

function UpcomingDeadlines({ tasks }: { tasks: Task[] }) {
  const upcoming = tasks
    .filter(t => t.due_date && t.status !== "done")
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 5);

  if (upcoming.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No upcoming deadlines
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {upcoming.map(t => {
        const due = new Date(t.due_date!);
        const overdue = due < new Date();
        return (
          <li key={t.id} className="flex items-center gap-3 py-2.5 px-1">
            <Clock className={cn("h-3.5 w-3.5 shrink-0", overdue ? "text-destructive" : "text-muted-foreground")} />
            <span className="text-[13px] truncate flex-1">{t.title}</span>
            <span className={cn("text-[11px] shrink-0", overdue ? "text-destructive font-medium" : "text-muted-foreground")}>
              {formatDistanceToNow(due, { addSuffix: true, locale: tr })}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function RecentActivityList() {
  const { data: items, isLoading } = useRecentActivity(6);

  if (isLoading) return <Skeleton className="h-32" />;

  const typeConfig: Record<string, { icon: React.ElementType; color: string }> = {
    task: { icon: CheckSquare, color: "text-info" },
    bug: { icon: Bug, color: "text-destructive" },
    decision: { icon: GitBranch, color: "text-warning" },
  };

  if (!items || items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No recent activity yet
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {items.map(item => {
        const cfg = typeConfig[item.type] ?? { icon: CheckSquare, color: "text-muted-foreground" };
        const Icon = cfg.icon;
        return (
          <li key={`${item.type}-${item.id}`} className="flex items-center gap-3 py-2.5 px-1">
            <Icon className={cn("h-3.5 w-3.5 shrink-0", cfg.color)} />
            <span className="text-[13px] truncate flex-1">{item.title}</span>
            <Badge variant="outline" className="text-[10px] shrink-0">{item.status}</Badge>
            <span className="text-[11px] text-muted-foreground shrink-0">
              {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true, locale: tr })}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default function Dashboard() {
  const { data: pulse, isLoading: pulseLoading, isError: pulseError } = useCompanyPulse();
  const { data: tasks, isLoading: tasksLoading } = useWorkspaceIssues();
  const { data: projects } = useProjects();
  const { data: cycles } = useCycles();
  const { data: goals } = useGoals();

  const allTasks = tasks ?? [];
  const activeTasks = allTasks.filter(t => t.status !== "backlog" && t.status !== "done");
  const overdueTasks = allTasks.filter(t =>
    t.due_date && new Date(t.due_date) < new Date() && t.status !== "done"
  );
  const activeProjects = (projects ?? []).filter(p => p.status === "active");
  const activeCycles = (cycles ?? []).filter(c => c.status === "active");
  const activeGoals = (goals ?? []).filter(g =>
    g.status === "on_track" || g.status === "at_risk" || g.status === "off_track"
  );

  const isLoading = pulseLoading || tasksLoading;

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 md:px-6 h-12 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
            <h1 className="text-sm font-semibold">Dashboard</h1>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
              </div>
            ) : pulseError ? (
              <EmptyState
                icon={AlertTriangle}
                title="Could not load dashboard data"
                description="There was a problem fetching your workspace metrics. Please try refreshing the page."
                action={{ label: "Refresh", onClick: () => window.location.reload() }}
              />
            ) : (
              <>
                {/* Key Metrics */}
                <section>
                  <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Overview</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard
                      title="Active Tasks" value={activeTasks.length}
                      subtitle={overdueTasks.length > 0 ? `${overdueTasks.length} overdue` : "No overdue tasks"}
                      tone={overdueTasks.length > 0 ? "warning" : "default"}
                      icon={CheckSquare} to="/issues"
                    />
                    <StatCard
                      title="Projects" value={activeProjects.length}
                      subtitle={`${(projects ?? []).length} total`}
                      icon={FolderKanban} to="/projects"
                    />
                    <StatCard
                      title="Active Cycles" value={activeCycles.length}
                      subtitle={activeCycles[0]?.name ?? "No active cycle"}
                      icon={Calendar} to="/cycles"
                    />
                    <StatCard
                      title="Goals" value={activeGoals.length}
                      subtitle={`${activeGoals.filter(g => g.status === "on_track").length} on track`}
                      tone={activeGoals.some(g => g.status === "off_track") ? "danger" : "success"}
                      icon={Target} to="/goals"
                    />
                    {pulse && (
                      <>
                        <StatCard
                          title="Open Bugs" value={pulse.openBugs}
                          subtitle={pulse.criticalBugs > 0 ? `${pulse.criticalBugs} critical` : "No critical bugs"}
                          tone={pulse.criticalBugs > 0 ? "danger" : "default"}
                          icon={Bug} to="/bugs"
                        />
                        <StatCard
                          title="Team Members" value={pulse.totalEmployees}
                          icon={Users} to="/employees"
                        />
                        <StatCard
                          title="Pending Approvals" value={pulse.pendingApprovals}
                          subtitle={pulse.urgentApprovals > 0 ? `${pulse.urgentApprovals} urgent` : "Inbox clear"}
                          tone={pulse.urgentApprovals > 0 ? "warning" : "default"}
                          icon={Layers} to="/inbox"
                        />
                        <StatCard
                          title="Open Risks" value={pulse.openRisks}
                          subtitle={pulse.criticalRisks > 0 ? `${pulse.criticalRisks} critical` : "No critical risks"}
                          tone={pulse.criticalRisks > 0 ? "danger" : "default"}
                          icon={AlertTriangle} to="/risks"
                        />
                      </>
                    )}
                  </div>
                </section>

                {/* Two-column layout: Task distribution + Upcoming */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold">Task Distribution</h3>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to="/issues" className="text-xs">
                            View all <ArrowRight className="h-3 w-3 ml-1" />
                          </Link>
                        </Button>
                      </div>
                      {allTasks.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">
                          No tasks created yet. Start by creating your first issue.
                        </p>
                      ) : (
                        <TasksByStatus tasks={allTasks} />
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold">Upcoming Deadlines</h3>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to="/tasks" className="text-xs">
                            My tasks <ArrowRight className="h-3 w-3 ml-1" />
                          </Link>
                        </Button>
                      </div>
                      <UpcomingDeadlines tasks={allTasks} />
                    </CardContent>
                  </Card>
                </div>

                {/* Active Projects */}
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold">Active Projects</h3>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to="/projects" className="text-xs">
                          All projects <ArrowRight className="h-3 w-3 ml-1" />
                        </Link>
                      </Button>
                    </div>
                    {activeProjects.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        No active projects. Create a project to start tracking work.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {activeProjects.slice(0, 6).map(p => (
                          <Link key={p.id} to={`/projects/${p.id}`}>
                            <Card className="hover:border-primary/50 transition-colors">
                              <CardContent className="p-3">
                                <div className="flex items-start gap-2">
                                  <FolderKanban className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-[13px] font-medium truncate">{p.name}</p>
                                    {p.description && (
                                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{p.description}</p>
                                    )}
                                    <div className="flex items-center gap-2 mt-2">
                                      <Badge variant="outline" className="text-[10px]">
                                        {p.status}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold">Recent Activity</h3>
                    </div>
                    <RecentActivityList />
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <section>
                  <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Quick Actions</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { to: "/issues", label: "Create Issue", icon: CheckSquare },
                      { to: "/projects/new", label: "New Project", icon: FolderKanban },
                      { to: "/bugs/new", label: "Report Bug", icon: Bug },
                      { to: "/insights", label: "View Insights", icon: BarChart3 },
                    ].map(q => (
                      <Link key={q.to} to={q.to}>
                        <Card className="hover:border-primary/50 transition-colors">
                          <CardContent className="p-3 flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <q.icon className="h-4 w-4 text-primary" />
                            </div>
                            <span className="text-[13px] font-medium">{q.label}</span>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
