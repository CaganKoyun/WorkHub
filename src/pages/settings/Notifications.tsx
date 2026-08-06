import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell } from "lucide-react";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/notification-hooks";

const TRIGGERS: { key: keyof NotificationPreferences; label: string; description: string }[] = [
  { key: "approval_created", label: "Yeni onay talebi", description: "Sana atanan onay talepleri" },
  { key: "approval_overdue", label: "Geciken onay", description: "48 saati asan bekleyen onaylar" },
  { key: "decision_review_due", label: "Karar gozden gecirme", description: "90 gunu dolan kararlar" },
  { key: "task_assigned", label: "Gorev atamasi", description: "Sana atanan yeni gorevler" },
  { key: "mention_in_comment", label: "Bahsetme", description: "Yorumlarda @bahsedilme" },
  { key: "signal_scan_detected", label: "Sinyal algilama", description: "AI sinyal taramasi sonuclari" },
];

export default function NotificationSettings() {
  const { data: prefs, isLoading } = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();

  const defaults: NotificationPreferences = {
    approval_created: true,
    approval_overdue: true,
    decision_review_due: true,
    task_assigned: true,
    mention_in_comment: true,
    signal_scan_detected: true,
  };

  const current = prefs ?? defaults;

  const toggle = (key: keyof NotificationPreferences) => {
    update.mutate({ [key]: !current[key] });
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold">Bildirim Ayarlari</h1>
          <p className="text-sm text-muted-foreground">
            Hangi olaylarda uygulama ici bildirim almak istediginizi secin.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" />
              Uygulama Ici Bildirimler
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {TRIGGERS.map((t) => (
                  <div key={t.key} className="flex items-center justify-between py-3">
                    <div className="space-y-0.5">
                      <Label htmlFor={t.key} className="text-sm font-medium">
                        {t.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">{t.description}</p>
                    </div>
                    <Switch
                      id={t.key}
                      checked={current[t.key]}
                      onCheckedChange={() => toggle(t.key)}
                      disabled={update.isPending}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
