import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  FolderKanban, CheckSquare, Bug, ScrollText, Inbox, Building2, Loader2,
  Plus, Home, Layers, Sparkles, Target, DollarSign, Package, Users,
  Settings, ArrowRight, RefreshCw, FileText, BarChart3,
} from "lucide-react";

interface SearchHit {
  id: string;
  label: string;
  sublabel?: string;
  to: string;
}

interface SearchResults {
  projects: SearchHit[];
  tasks: SearchHit[];
  bugs: SearchHit[];
  decisions: SearchHit[];
  approvals: SearchHit[];
  companies: SearchHit[];
}

function useDebounced(value: string, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/**
 * Full-text search across tasks/projects/bugs/decisions/companies.
 * Each searchable table has a generated `fts` tsvector column + GIN index
 * (see 20260804180000_fts_search.sql). We build a prefix-friendly tsquery
 * so "auth" matches "authentication".
 */
function buildTsQuery(raw: string): string {
  // Escape reserved chars, split on whitespace, add :* prefix operator per term.
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/[&|!():*]/g, ""))
    .filter(Boolean)
    .map((w) => `${w}:*`)
    .join(" & ");
}

function useGlobalSearch(term: string) {
  return useQuery({
    queryKey: ["global-search", term],
    enabled: term.trim().length >= 2,
    staleTime: 30_000,
    queryFn: async (): Promise<SearchResults> => {
      const t = term.trim();
      const ilike = `%${t}%`;
      const tsq = buildTsQuery(t);
      const ts = { config: "simple" } as const;

      // Tasks + bugs: FTS pass + tracking_id ilike pass, merged and deduped.
      const [projects, tasksFts, tasksTrack, bugsFts, bugsTrack, decisions, approvals, companies] = await Promise.all([
        supabase.from("projects").select("id,name,status").textSearch("fts", tsq, ts).limit(5),
        supabase.from("tasks").select("id,title,status,tracking_id,project_id").textSearch("fts", tsq, ts).limit(6),
        supabase.from("tasks").select("id,title,status,tracking_id,project_id").ilike("tracking_id", ilike).limit(3),
        supabase.from("bugs").select("id,title,severity,tracking_id").textSearch("fts", tsq, ts).limit(5),
        supabase.from("bugs").select("id,title,severity,tracking_id").ilike("tracking_id", ilike).limit(3),
        supabase.from("decisions").select("id,title,status").textSearch("fts", tsq, ts).limit(5),
        supabase.from("approvals").select("id,title,status").ilike("title", ilike).limit(5),
        supabase.from("crm_companies").select("id,name").textSearch("fts", tsq, ts).limit(5),
      ]);

      const mergeById = <T extends { id: string }>(...batches: (T[] | null | undefined)[]): T[] => {
        const seen = new Set<string>();
        const out: T[] = [];
        for (const batch of batches) {
          for (const r of batch ?? []) {
            if (!seen.has(r.id)) { seen.add(r.id); out.push(r); }
          }
        }
        return out;
      };

      const tasks = { data: mergeById(tasksFts.data as any[], tasksTrack.data as any[]) };
      const bugs  = { data: mergeById(bugsFts.data as any[],  bugsTrack.data as any[]) };
      return {
        projects: (projects.data ?? []).map((p: any) => ({
          id: p.id, label: p.name, sublabel: p.status, to: `/projects/${p.id}`,
        })),
        tasks: (tasks.data ?? []).map((t: any) => ({
          id: t.id,
          label: t.title,
          sublabel: t.tracking_id ?? t.status,
          to: t.project_id ? `/projects/${t.project_id}` : "/tasks",
        })),
        bugs: (bugs.data ?? []).map((b: any) => ({
          id: b.id, label: b.title, sublabel: b.tracking_id ?? b.severity, to: `/bugs/${b.id}`,
        })),
        decisions: (decisions.data ?? []).map((d: any) => ({
          id: d.id, label: d.title, sublabel: d.status, to: "/decisions",
        })),
        approvals: (approvals.data ?? []).map((a: any) => ({
          id: a.id, label: a.title, sublabel: a.status, to: "/inbox",
        })),
        companies: (companies.data ?? []).map((c: any) => ({
          id: c.id, label: c.name, to: "/crm",
        })),
      };
    },
  });
}

const HIT_GROUPS: { key: keyof SearchResults; heading: string; icon: React.ElementType }[] = [
  { key: "tasks",     heading: "Issues",       icon: CheckSquare },
  { key: "projects",  heading: "Projects",     icon: FolderKanban },
  { key: "bugs",      heading: "Bugs",         icon: Bug },
  { key: "decisions", heading: "Decisions",    icon: ScrollText },
  { key: "approvals", heading: "Approvals",    icon: Inbox },
  { key: "companies", heading: "CRM Companies",icon: Building2 },
];

const QUICK_ACTIONS = [
  { label: "New issue",    icon: Plus,          to: "/tasks?new=1",    hint: "C" },
  { label: "New project",  icon: FolderKanban,  to: "/projects/new",   hint: "P" },
  { label: "New bug",      icon: Bug,           to: "/bugs/new",       hint: "B" },
  { label: "New approval", icon: Inbox,         to: "/inbox?new=1",    hint: "A" },
  { label: "New asset",    icon: Package,       to: "/assets/new",     hint: "S" },
];

const NAV_JUMPS = [
  { label: "Home",           icon: Home,          to: "/home",     hint: "G H" },
  { label: "Inbox",          icon: Inbox,         to: "/inbox",    hint: "G I" },
  { label: "My issues",      icon: CheckSquare,   to: "/tasks",    hint: "G M" },
  { label: "Issues",         icon: Layers,        to: "/issues",   hint: "G T" },
  { label: "Cycles",         icon: RefreshCw,     to: "/cycles",   hint: "G C" },
  { label: "Workload",       icon: BarChart3,     to: "/workload" },
  { label: "Teams",          icon: Users,         to: "/teams" },
  { label: "Projects",       icon: FolderKanban,  to: "/projects", hint: "G P" },
  { label: "Bugs",           icon: Bug,           to: "/bugs" },
  { label: "CRM",            icon: Building2,     to: "/crm" },
  { label: "Finance",        icon: DollarSign,    to: "/finance" },
  { label: "Goals",          icon: Target,        to: "/goals" },
  { label: "Decisions",      icon: ScrollText,    to: "/decisions" },
  { label: "Chief of Staff", icon: Sparkles,      to: "/ai-chat",  hint: "G A" },
  { label: "Templates",      icon: FileText,      to: "/templates" },
  { label: "Import",         icon: Plus,          to: "/import" },
  { label: "Settings",       icon: Settings,      to: "/settings" },
];

export function GlobalSearch({ open, onOpenChange }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const debounced = useDebounced(term, 200);
  const { data, isFetching } = useGlobalSearch(debounced);

  const go = (to: string) => {
    onOpenChange(false);
    setTerm("");
    navigate(to);
  };

  const total = data ? HIT_GROUPS.reduce((s, g) => s + data[g.key].length, 0) : 0;
  const showResults = debounced.trim().length >= 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 shadow-2xl sm:max-w-xl border-border">
        <Command
          shouldFilter={!showResults /* fuzzy for actions, server ilike for results */}
          className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-muted-foreground/70 [&_[cmdk-group]]:px-1 [&_[cmdk-input-wrapper]_svg]:h-4 [&_[cmdk-input-wrapper]_svg]:w-4 [&_[cmdk-input]]:h-11 [&_[cmdk-item]]:h-9 [&_[cmdk-item]]:px-2.5 [&_[cmdk-item]]:rounded-md [&_[cmdk-item]]:text-[13px]"
        >
          <CommandInput
            placeholder="Type a command or search…"
            value={term}
            onValueChange={setTerm}
          />
          <CommandList className="max-h-[420px]">
            {!showResults ? (
              <>
                <CommandGroup heading="Create">
                  {QUICK_ACTIONS.map((a) => (
                    <CommandItem key={a.to} value={`create ${a.label}`} onSelect={() => go(a.to)}>
                      <a.icon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                      <span>{a.label}</span>
                      {a.hint && <kbd className="kbd ml-auto">{a.hint}</kbd>}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Jump to">
                  {NAV_JUMPS.map((n) => (
                    <CommandItem key={n.to} value={`jump ${n.label}`} onSelect={() => go(n.to)}>
                      <n.icon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                      <span>{n.label}</span>
                      {n.hint && <kbd className="kbd ml-auto">{n.hint}</kbd>}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            ) : isFetching && !data ? (
              <p className="flex items-center justify-center gap-2 py-6 text-[13px] text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Aranıyor…
              </p>
            ) : total === 0 ? (
              <CommandEmpty>Sonuç yok.</CommandEmpty>
            ) : (
              HIT_GROUPS.filter((g) => (data?.[g.key].length ?? 0) > 0).map((g) => (
                <CommandGroup key={g.key} heading={g.heading}>
                  {data![g.key].map((hit) => (
                    <CommandItem
                      key={`${g.key}-${hit.id}`}
                      value={`${g.heading} ${hit.label} ${hit.sublabel ?? ""} ${hit.id}`}
                      onSelect={() => go(hit.to)}
                    >
                      <g.icon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate">{hit.label}</span>
                      {hit.sublabel && (
                        <span className="ml-auto pl-3 font-mono text-[11px] tabular-nums text-muted-foreground/80">
                          {hit.sublabel}
                        </span>
                      )}
                      <ArrowRight className="ml-1.5 h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))
            )}
          </CommandList>
          <div className="flex items-center justify-between border-t border-border bg-secondary/30 px-3 py-1.5 text-[10.5px] text-muted-foreground">
            <div className="flex items-center gap-2">
              <span><kbd className="kbd">↑↓</kbd> navigate</span>
              <span><kbd className="kbd">↵</kbd> select</span>
              <span><kbd className="kbd">esc</kbd> close</span>
            </div>
            <span>WorkHub</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
