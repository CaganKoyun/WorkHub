import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type StatTone = "default" | "warning" | "danger" | "success" | "info";

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ElementType;
  to?: string;
  tone?: StatTone;
}

const TONE_CLASS: Record<StatTone, string> = {
  default: "",
  warning: "border-warning/30",
  danger: "border-destructive/40",
  success: "border-success/30",
  info: "border-info/30",
};

export function StatCard({ title, value, subtitle, icon: Icon, to, tone = "default" }: StatCardProps) {
  const body = (
    <Card className={cn("hover:border-primary/50 transition-colors", TONE_CLASS[tone])}>
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
