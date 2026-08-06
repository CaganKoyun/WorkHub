import { useState } from 'react';
import { useReferrals, useReferralStats, useCreateReferral, type Referral } from '@/lib/referral-hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Copy, Plus, Users, UserCheck, TrendingUp, Gift, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  pending: { label: 'Bekliyor', variant: 'outline' },
  signed_up: { label: 'Kayit oldu', variant: 'secondary' },
  activated: { label: 'Aktif', variant: 'default' },
  rewarded: { label: 'Odullendirildi', variant: 'default' },
};

function StatCard({ title, value, icon: Icon }: { title: string; value: number | string; icon: React.ElementType }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{title}</p>
            <p className="text-xl font-semibold mt-1">{value}</p>
          </div>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

export function ReferralPanel() {
  const { data: referrals, isLoading } = useReferrals();
  const stats = useReferralStats();
  const createReferral = useCreateReferral();
  const [email, setEmail] = useState('');

  const handleCreate = async () => {
    try {
      const ref = await createReferral.mutateAsync(email || undefined);
      setEmail('');
      const link = `${window.location.origin}/auth?ref=${ref.code}`;
      void navigator.clipboard.writeText(link);
      toast.success('Referral linki olusturuldu ve kopyalandi');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const copyLink = (code: string) => {
    const link = `${window.location.origin}/auth?ref=${code}`;
    void navigator.clipboard.writeText(link);
    toast.success('Link kopyalandi');
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="Gonderilen" value={stats.totalSent} icon={Users} />
        <StatCard title="Kayit olan" value={stats.signedUp} icon={UserCheck} />
        <StatCard title="Aktif" value={stats.activated} icon={TrendingUp} />
        <StatCard title="Donusum" value={`${stats.conversionRate}%`} icon={Gift} />
      </div>

      {/* Create referral */}
      <div className="rounded-md border border-border/60 bg-card p-4">
        <h3 className="text-[13px] font-semibold mb-3">Yeni referral olustur</h3>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Input
              type="email"
              placeholder="Email (opsiyonel — bos birakabilirsin)"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="h-9 text-[13px]"
            />
          </div>
          <Button onClick={handleCreate} disabled={createReferral.isPending} className="h-9 gap-1.5">
            {createReferral.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Olustur ve kopyala
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Link otomatik olarak panoya kopyalanir. Email belirtirsen, davet icin takip edilir.
        </p>
      </div>

      {/* Referral list */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Yukleniyor...</p>
      ) : (referrals ?? []).length === 0 ? (
        <div className="rounded-md border border-dashed border-border/60 py-10 text-center text-[13px] text-muted-foreground">
          Henuz referral yok. Yukardaki form ile ilk davet linkini olustur.
        </div>
      ) : (
        <div className="rounded-md border border-border/60 overflow-hidden divide-y divide-border/40">
          {(referrals ?? []).map((r: Referral) => {
            const badge = STATUS_BADGE[r.status] ?? STATUS_BADGE.pending;
            return (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[12px] font-medium">{r.code}</span>
                    <Badge variant={badge.variant} className="text-[10px]">{badge.label}</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {r.referred_email ?? 'genel link'}
                    <span className="mx-1.5">·</span>
                    {new Date(r.created_at).toLocaleDateString('tr-TR')}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => copyLink(r.code)} title="Linki kopyala">
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
