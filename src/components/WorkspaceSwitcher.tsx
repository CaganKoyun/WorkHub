import { Check, ChevronsUpDown, Plus, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export function WorkspaceSwitcher() {
  const { workspaces, currentWorkspace, switchWorkspace, role } = useWorkspace();
  const navigate = useNavigate();

  if (!currentWorkspace) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 gap-2 max-w-[220px]">
          <div className="h-5 w-5 rounded bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Building2 className="h-3 w-3" />
          </div>
          <span className="truncate text-[13px] font-medium">{currentWorkspace.name}</span>
          <ChevronsUpDown className="h-3 w-3 opacity-60 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Çalışma Alanları
        </DropdownMenuLabel>
        {workspaces.map(w => (
          <DropdownMenuItem key={w.id} onClick={() => switchWorkspace(w.id)} className="justify-between">
            <span className="truncate">{w.name}</span>
            {w.id === currentWorkspace.id && <Check className="h-3.5 w-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/onboarding?new=1")}>
          <Plus className="h-3.5 w-3.5 mr-2" /> Çalışma alanı oluştur
        </DropdownMenuItem>
        {(role === "owner" || role === "admin") && (
          <DropdownMenuItem onClick={() => navigate("/workspace/settings")}>
            Çalışma alanı ayarları
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
