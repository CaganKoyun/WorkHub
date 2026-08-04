import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  FolderKanban, CheckSquare, Bug, ScrollText, Inbox, Building2, Loader2,
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

/** Tüm çekirdek varlıklarda başlık araması. RLS workspace kapsamını sağlar. */
function useGlobalSearch(term: string) {
  return useQuery({
    queryKey: ["global-search", term],
    enabled: term.trim().length >= 2,
    staleTime: 30_000,
    queryFn: async (): Promise<SearchResults> => {
      const q = `%${term.trim()}%`;
      const [projects, tasks, bugs, decisions, approvals, companies] = await Promise.all([
        supabase.from("projects").select("id,name,status").ilike("name", q).limit(5),
        supabase.from("tasks").select("id,title,status").ilike("title", q).limit(5),
        supabase.from("bugs").select("id,title,severity").ilike("title", q).limit(5),
        supabase.from("decisions").select("id,title,status").ilike("title", q).limit(5),
        supabase.from("approvals").select("id,title,status").ilike("title", q).limit(5),
        supabase.from("crm_companies").select("id,name").ilike("name", q).limit(5),
      ]);
      return {
        projects: (projects.data ?? []).map((p) => ({
          id: p.id, label: p.name, sublabel: p.status, to: `/projects/${p.id}`,
        })),
        tasks: (tasks.data ?? []).map((t) => ({
          id: t.id, label: t.title, sublabel: t.status, to: "/tasks",
        })),
        bugs: (bugs.data ?? []).map((b) => ({
          id: b.id, label: b.title, sublabel: b.severity, to: `/bugs/${b.id}`,
        })),
        decisions: (decisions.data ?? []).map((d) => ({
          id: d.id, label: d.title, sublabel: d.status, to: "/decisions",
        })),
        approvals: (approvals.data ?? []).map((a) => ({
          id: a.id, label: a.title, sublabel: a.status, to: "/inbox",
        })),
        companies: (companies.data ?? []).map((c) => ({
          id: c.id, label: c.name, to: "/crm",
        })),
      };
    },
  });
}

const GROUPS: { key: keyof SearchResults; heading: string; icon: React.ElementType }[] = [
  { key: "projects", heading: "Projeler", icon: FolderKanban },
  { key: "tasks", heading: "Görevler", icon: CheckSquare },
  { key: "bugs", heading: "Buglar", icon: Bug },
  { key: "decisions", heading: "Kararlar", icon: ScrollText },
  { key: "approvals", heading: "Onaylar", icon: Inbox },
  { key: "companies", heading: "CRM Şirketleri", icon: Building2 },
];

export function GlobalSearch({ open, onOpenChange }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const debounced = useDebounced(term, 250);
  const { data, isFetching } = useGlobalSearch(debounced);

  const go = (to: string) => {
    onOpenChange(false);
    setTerm("");
    navigate(to);
  };

  const total = data ? GROUPS.reduce((s, g) => s + data[g.key].length, 0) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 shadow-lg sm:max-w-xl">
        {/* Filtre sunucuda (ilike) — cmdk'nın fuzzy filtresi kapalı, yoksa
            Türkçe büyük/küçük harf (İ/i) eşleşmeleri sonuçları gizler */}
        <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3">
          <CommandInput
            placeholder="Proje, görev, karar, onay, bug, şirket ara…"
            value={term}
            onValueChange={setTerm}
          />
      <CommandList>
        {debounced.trim().length < 2 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aramak için en az 2 karakter yaz.
          </p>
        ) : isFetching && !data ? (
          <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Aranıyor…
          </p>
        ) : total === 0 ? (
          <CommandEmpty>Sonuç yok.</CommandEmpty>
        ) : (
          GROUPS.filter((g) => (data?.[g.key].length ?? 0) > 0).map((g) => (
            <CommandGroup key={g.key} heading={g.heading}>
              {data![g.key].map((hit) => (
                <CommandItem
                  key={`${g.key}-${hit.id}`}
                  value={`${g.heading} ${hit.label} ${hit.id}`}
                  onSelect={() => go(hit.to)}
                >
                  <g.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{hit.label}</span>
                  {hit.sublabel && (
                    <span className="ml-auto pl-3 text-xs text-muted-foreground">{hit.sublabel}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          ))
        )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
