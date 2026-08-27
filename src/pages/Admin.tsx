import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  useBilling, useAdminSummary, useUpdatePlan, PLAN_META, type PlanTier,
} from '@/lib/admin-hooks';
import { formatBytes } from '@/lib/attachments-utils';
import { DomainWorkspace } from '@/components/DomainWorkspace';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Shield, Users, HardDrive, Zap, Mail, Check, AlertTriangle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function StatTile({
  icon: Icon, label, value, hint, tone = 'neutral',
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: 'neutral' | 'warn';
}) {
  return (
    <div className={cn(
      'rounded-xl border border-border bg-card p-4 elevation-1',
      tone === 'warn' && 'border-warning/40',
    )}>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-1.5 text-[24px] font-semibold tabular-nums leading-none">{value}</div>
      {hint && <div className="mt-1.5 text-[11.5px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

export default function Admin() {
  const { role, currentWorkspace } = useWorkspace();
  const { data: billing, isLoading: bLoading } = useBilling();
  const { data: summary, isLoading: sLoading } = useAdminSummary();
  const update = useUpdatePlan();

  const isAdmin = role === 'owner' || role === 'admin';
  const seatPct = useMemo(() => {
    if (!billing || !summary) return 0;
    return Math.min(100, Math.round((summary.seats_used / Math.max(1, billing.seat_limit)) * 100));
  }, [billing, summary]);

  const seatWarn = seatPct >= 80;

  const changePlan = async (plan: PlanTier) => {
    if (!isAdmin) return;
    try {
      await update.mutateAsync({ plan });
      toast.success(`Plan güncellendi: ${PLAN_META[plan].label}`);
    } catch (e: any) {
      toast.error(e.message ?? 'Plan güncellenemedi');
    }
  };

  if (!currentWorkspace) return null;

  return (
    <DomainWorkspace
      domain="company"
      title="Yönetim Paneli"
      subtitle="Çalışma alanı sağlığı, üyeler ve plan. Yalnızca owner/admin değiştirebilir."
      showAgent={false}
      headerActions={
        !isAdmin ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 text-[11px] text-warning">
            <AlertTriangle className="h-3 w-3" /> Salt okunur — admin değilsin
          </span>
        ) : undefined
      }
    >
      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {sLoading || !summary ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : (
          <>
            <StatTile
              icon={Users}
              label="Aktif üye"
              value={summary.seats_used}
              hint={billing ? `${billing.seat_limit} kişilik kontenjan` : undefined}
              tone={seatWarn ? 'warn' : 'neutral'}
            />
            <StatTile
              icon={HardDrive}
              label="Depolama"
              value={formatBytes(summary.storage_bytes)}
              hint="Task ekleri toplam"
            />
            <StatTile
              icon={Zap}
              label="Otomasyon (24s)"
              value={summary.automation_runs_24h}
              hint="Son gün tetiklenen kurallar"
            />
            <StatTile
              icon={Mail}
              label="Bekleyen e-posta"
              value={summary.email_queue_pending}
              hint="Kuyrukta pending"
              tone={summary.email_queue_pending > 20 ? 'warn' : 'neutral'}
            />
          </>
        )}
      </div>

      {/* Seat usage bar */}
      {billing && summary && (
        <div className="mt-4 rounded-xl border border-border bg-card p-4 elevation-1">
          <div className="flex items-center justify-between text-[12.5px]">
            <span className="font-medium">Koltuk kullanımı</span>
            <span className="font-mono tabular-nums text-muted-foreground">
              {summary.seats_used} / {billing.seat_limit}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                seatWarn ? 'bg-warning' : 'bg-primary',
              )}
              style={{ width: `${seatPct}%` }}
            />
          </div>
          {seatWarn && (
            <p className="mt-2 text-[11.5px] text-warning">
              Kontenjan neredeyse dolu — üst plana geçmeyi düşün.
            </p>
          )}
        </div>
      )}

      {/* Plans */}
      <h2 className="mb-3 mt-8 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Planlar
      </h2>
      {bLoading ? (
        <Skeleton className="h-40" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          {(['free', 'pro', 'business'] as PlanTier[]).map((tier) => {
            const meta = PLAN_META[tier];
            const active = billing?.plan === tier;
            return (
              <div
                key={tier}
                className={cn(
                  'flex flex-col rounded-xl border border-border bg-card p-4 elevation-1',
                  active && 'ring-1 ring-primary',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', meta.tint)}>
                    {meta.label}
                  </span>
                  {active && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-primary">
                      <Check className="h-3 w-3" /> Mevcut
                    </span>
                  )}
                </div>
                <div className="mt-3 text-[22px] font-semibold tabular-nums">{meta.price}</div>
                <p className="mt-1 text-[12px] text-muted-foreground">Kadar {meta.seats} kullanıcı</p>
                <Button
                  className="mt-auto"
                  variant={active ? 'ghost' : 'default'}
                  size="sm"
                  disabled={active || !isAdmin || update.isPending}
                  onClick={() => changePlan(tier)}
                >
                  {active ? 'Aktif' : 'Bu plana geç'}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Stripe hint */}
      <div className="mt-6 rounded-md border border-border/60 bg-secondary/10 p-4 text-[12px] text-muted-foreground">
        <div className="mb-1 text-[11px] uppercase tracking-wider">Ödeme (Stripe)</div>
        <p className="leading-relaxed">
          Plan değişiklikleri şu anda yerel olarak uygulanıyor. Prod için Stripe müşteri
          + subscription oluşturan bir Edge Function ekle ve <code className="rounded border border-border bg-background px-1 font-mono text-[10.5px]">stripe_customer_id</code> /
          <code className="mx-1 rounded border border-border bg-background px-1 font-mono text-[10.5px]">stripe_subscription_id</code>
          alanlarını webhook'la güncelle. Kurulum tamamlanınca burada portal linki gösterilecek.
        </p>
      </div>

      {/* Quick links */}
      <div className="mt-6 flex flex-wrap gap-2 text-[12.5px]">
        <Link to="/workspace/settings" className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/40 px-3 py-1.5 hover:bg-secondary">
          Üyeler ve davetler <ArrowRight className="h-3 w-3" />
        </Link>
        <Link to="/audit" className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/40 px-3 py-1.5 hover:bg-secondary">
          Audit log <ArrowRight className="h-3 w-3" />
        </Link>
        <Link to="/notification-settings" className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/40 px-3 py-1.5 hover:bg-secondary">
          Bildirim ayarları <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </DomainWorkspace>
  );
}
