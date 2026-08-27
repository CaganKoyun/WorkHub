import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DomainWorkspace } from "@/components/DomainWorkspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SeverityBadge } from "@/components/SeverityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, Plus, Search, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { Constants } from "@/integrations/supabase/types";
import { formatDistanceToNow, differenceInDays, startOfDay } from "date-fns";
import { useWorkspacePermission } from "@/hooks/useWorkspacePermission";
import { useBugs } from "@/lib/bugs-hooks";
import { useAllProfiles, useProjects } from "@/lib/projects-hooks";
import { cn } from "@/lib/utils";

type SortField = 'created_at' | 'severity' | 'updated_at';
type SortDir = 'asc' | 'desc';

const SEVERITY_RANK: Record<string, number> = {
  critical: 4, high: 3, medium: 2, low: 1,
};

export default function BugList() {
  const navigate = useNavigate();
  const { data: bugs = [], isLoading, isError } = useBugs();
  const { data: profiles } = useAllProfiles();
  const { data: projects } = useProjects();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const canCreate = useWorkspacePermission("bugs", "create");

  const profileMap = useMemo(
    () => new Map((profiles ?? []).map(p => [p.user_id, p.full_name])),
    [profiles],
  );

  const projectMap = useMemo(
    () => new Map((projects ?? []).map(p => [p.id, p.name])),
    [projects],
  );

  const filtered = useMemo(() => {
    const result = bugs.filter(b => {
      const matchesSearch = b.title.toLowerCase().includes(search.toLowerCase()) ||
        b.tracking_id.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || b.status === statusFilter;
      const matchesSeverity = severityFilter === "all" || b.severity === severityFilter;
      return matchesSearch && matchesStatus && matchesSeverity;
    });

    const dir = sortDir === 'asc' ? 1 : -1;
    result.sort((a, b) => {
      if (sortField === 'severity') {
        return ((SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0)) * dir;
      }
      if (sortField === 'updated_at') {
        return (new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()) * dir;
      }
      return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
    });

    return result;
  }, [bugs, search, statusFilter, severityFilter, sortField, sortDir]);

  const summary = useMemo(() => {
    const open = bugs.filter(b => b.status === 'new' || b.status === 'assigned' || b.status === 'in_progress').length;
    const critical = bugs.filter(b => (b.severity === 'critical' || b.severity === 'high') && b.status !== 'closed' && b.status !== 'resolved').length;
    return { open, critical };
  }, [bugs]);

  if (isLoading) {
    return (
      <DomainWorkspace domain="bugs" title="Bugs" subtitle="Kalite çalışma alanı: açık bug, önem, atama.">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </DomainWorkspace>
    );
  }

  if (isError) {
    return (
      <DomainWorkspace domain="bugs" title="Bugs" subtitle="Kalite çalışma alanı: açık bug, önem, atama.">
        <div className="p-6">
          <EmptyState
            icon={AlertTriangle}
            title="Bug verileri yüklenemedi"
            description="Lütfen sayfayı yenileyin."
            action={{ label: "Yenile", onClick: () => window.location.reload() }}
          />
        </div>
      </DomainWorkspace>
    );
  }

  return (
    <DomainWorkspace domain="bugs" title="Bugs" subtitle="Kalite çalışma alanı: açık bug, önem, atama.">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-6 h-11 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-[13px] font-medium">Tüm Buglar</h1>
            <div className="flex items-center gap-2 text-[11px]">
              {summary.open > 0 && (
                <span className="tabular-nums text-muted-foreground">{summary.open} açık</span>
              )}
              {summary.critical > 0 && (
                <span className="tabular-nums text-red-400 font-medium">{summary.critical} kritik/yüksek</span>
              )}
            </div>
          </div>
          {canCreate && (
            <Button asChild size="sm" className="h-7 text-[12px] gap-1.5">
              <Link to="/bugs/new">
                <Plus className="h-3.5 w-3.5" /> Bug Bildir
              </Link>
            </Button>
          )}
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-2 px-4 md:px-6 py-2 border-b border-border shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Bug ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-7 text-[13px] bg-transparent border-none shadow-none focus-visible:ring-0"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px] h-7 text-[12px]">
              <SelectValue placeholder="Durum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm durumlar</SelectItem>
              {Constants.public.Enums.bug_status.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[120px] h-7 text-[12px]">
              <SelectValue placeholder="Önem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm önemler</SelectItem>
              {Constants.public.Enums.bug_severity.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1 ml-auto">
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
            <Select value={sortField} onValueChange={v => setSortField(v as SortField)}>
              <SelectTrigger className="w-28 h-7 text-[11px] border-dashed">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Oluşturma</SelectItem>
                <SelectItem value="severity">Önem</SelectItem>
                <SelectItem value="updated_at">Güncelleme</SelectItem>
              </SelectContent>
            </Select>
            <button
              type="button"
              onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
              className="h-7 w-7 inline-flex items-center justify-center rounded border border-dashed border-border text-muted-foreground hover:text-foreground transition-colors"
            >
              {sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 bg-background z-10">
              <tr className="border-b border-border">
                <th className="text-left font-medium text-muted-foreground px-4 md:px-6 py-2 w-20">ID</th>
                <th className="text-left font-medium text-muted-foreground px-3 py-2">Başlık</th>
                <th className="text-left font-medium text-muted-foreground px-3 py-2 w-24">Durum</th>
                <th className="text-left font-medium text-muted-foreground px-3 py-2 w-20">Önem</th>
                <th className="text-left font-medium text-muted-foreground px-3 py-2 w-28 hidden md:table-cell">Proje</th>
                <th className="text-left font-medium text-muted-foreground px-3 py-2 w-10">Kişi</th>
                <th className="text-left font-medium text-muted-foreground px-3 py-2 w-28">Oluşturulma</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">Bug bulunamadı</td>
                </tr>
              ) : (
                filtered.map((bug) => {
                  const assigneeName = bug.assignee_id ? profileMap.get(bug.assignee_id) : null;
                  const projectName = bug.project_id ? projectMap.get(bug.project_id) : null;
                  const initials = assigneeName
                    ? assigneeName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                    : '';
                  const ageDays = differenceInDays(new Date(), new Date(bug.created_at));
                  const isStale = ageDays > 14 && bug.status !== 'closed' && bug.status !== 'resolved';

                  return (
                    <tr
                      key={bug.id}
                      className={cn(
                        "border-b border-border hover:bg-muted/30 cursor-pointer transition-colors",
                        isStale && "bg-amber-500/5"
                      )}
                      onClick={() => navigate(`/bugs/${bug.id}`)}
                    >
                      <td className="px-4 md:px-6 py-2 text-muted-foreground font-mono text-[12px]">{bug.tracking_id}</td>
                      <td className="px-3 py-2 font-medium">
                        <div className="flex items-center gap-2">
                          <span className="truncate">{bug.title}</span>
                          {isStale && (
                            <span className="text-[9px] font-medium text-amber-400/80 bg-amber-500/10 rounded px-1 py-0.5 shrink-0">
                              {ageDays}g
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2"><StatusBadge status={bug.status} /></td>
                      <td className="px-3 py-2"><SeverityBadge severity={bug.severity} /></td>
                      <td className="px-3 py-2 hidden md:table-cell">
                        {projectName && (
                          <span className="text-[11.5px] text-muted-foreground truncate block max-w-[120px]">{projectName}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="bg-sidebar-accent text-[8px] font-semibold text-sidebar-accent-foreground">
                                {initials || '·'}
                              </AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-[11px]">
                            {assigneeName ?? 'Atanmamış'}
                          </TooltipContent>
                        </Tooltip>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground text-[12px] whitespace-nowrap">
                        {formatDistanceToNow(new Date(bug.created_at), { addSuffix: true })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DomainWorkspace>
  );
}
