import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SparkLogo } from "@/components/SparkLogo";
import {
  FolderKanban, CheckSquare, Bug, Target, Users,
  AlertTriangle, ShieldOff, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardData {
  title: string;
  workspace_name: string;
  active_projects: number;
  total_projects: number;
  open_tasks: number;
  overdue_tasks: number;
  open_bugs: number;
  critical_bugs: number;
  active_goals: number;
  on_track_goals: number;
  total_employees: number;
  generated_at: string;
  config: Record<string, unknown>;
}

function PulseCard({ title, value, subtitle, icon: Icon, tone = "default" }: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ElementType;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  const toneClass = {
    default: "border-border",
    warning: "border-warning/40",
    danger: "border-destructive/50",
    success: "border-success/40",
  }[tone];

  return (
    <Card className={cn(toneClass)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
            <p className="text-2xl font-semibold mt-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function PublicDashboard() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data: result, error: rpcErr } = await supabase.rpc("get_public_dashboard" as any, {
        p_token: token,
      });
      if (rpcErr) throw rpcErr;
      const parsed = result as unknown as DashboardData | { error: string };
      if ("error" in parsed) {
        setError("Dashboard bulunamadı veya süresi dolmuş.");
      } else {
        setData(parsed);
      }
    } catch {
      setError("Dashboard yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-full max-w-4xl px-6 space-y-6">
          <Skeleton className="h-10 w-64 mx-auto" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <ShieldOff className="h-12 w-12 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-semibold">{error ?? "Dashboard bulunamadi"}</h1>
          <p className="text-sm text-muted-foreground">Link geçersiz, süresi dolmuş veya devre dışı bırakılmış olabilir.</p>
        </div>
      </div>
    );
  }

  const healthScore = (() => {
    let score = 100;
    if (data.open_tasks > 0) score -= Math.min(20, (data.overdue_tasks / data.open_tasks) * 40);
    score -= Math.min(20, data.critical_bugs * 4);
    return Math.max(0, Math.round(score));
  })();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SparkLogo size={20} />
            <div>
              <h1 className="text-lg font-semibold">{data.title}</h1>
              <p className="text-xs text-muted-foreground">{data.workspace_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn(
              "text-[10px]",
              healthScore >= 80 ? "text-success" : healthScore >= 60 ? "text-warning" : "text-destructive",
            )}>
              Health: {healthScore}%
            </Badge>
            <button
              onClick={() => void load()}
              className="p-1.5 rounded-md hover:bg-secondary transition-colors"
              title="Yenile"
            >
              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <PulseCard
            title="Aktif Projeler" value={data.active_projects}
            subtitle={`${data.total_projects} toplam`} icon={FolderKanban}
          />
          <PulseCard
            title="Açık Görevler" value={data.open_tasks}
            subtitle={data.overdue_tasks > 0 ? `${data.overdue_tasks} gecikmiş` : "gecikme yok"}
            tone={data.overdue_tasks > 0 ? "warning" : "default"}
            icon={CheckSquare}
          />
          <PulseCard
            title="Açık Buglar" value={data.open_bugs}
            subtitle={data.critical_bugs > 0 ? `${data.critical_bugs} kritik` : "kritik yok"}
            tone={data.critical_bugs > 0 ? "danger" : "default"}
            icon={Bug}
          />
          <PulseCard
            title="Aktif Hedefler" value={data.active_goals}
            subtitle={`${data.on_track_goals} yolunda`}
            tone="success" icon={Target}
          />
          <PulseCard
            title="Çalışanlar" value={data.total_employees}
            icon={Users}
          />
          <PulseCard
            title="Şirket Sağlığı" value={`${healthScore}%`}
            tone={healthScore < 60 ? "danger" : healthScore < 80 ? "warning" : "success"}
            icon={AlertTriangle}
          />
        </div>

        <div className="text-center text-[11px] text-muted-foreground">
          Son güncelleme: {new Date(data.generated_at).toLocaleString("tr-TR")}
          <span className="mx-2">·</span>
          Powered by Spark WorkHub
        </div>
      </main>
    </div>
  );
}
