import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NeonToggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <Button
      variant={active ? "secondary" : "ghost"}
      size="sm"
      onClick={onToggle}
      className="h-7 gap-1.5 text-[12px]"
      title="Neon grafik stilini değiştir"
    >
      <Sparkles className="h-3 w-3" />
      Neon
    </Button>
  );
}
