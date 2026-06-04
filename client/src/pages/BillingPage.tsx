import { useQuery } from '@tanstack/react-query';
import { Check, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface PlanInfo {
  key: string;
  name: string;
  priceMonthly: number;
  tagline: string;
  limits?: Record<string, number>;
}

interface BillingMe {
  plan: PlanInfo;
  limits: Record<string, number>;
  usage: Record<string, number>;
}

const RESOURCE_LABEL: Record<string, string> = {
  workspaces: 'Workspace',
  projects: 'Project',
  tasks: 'Task',
  notes: 'Catatan',
  links: 'Link',
  documents: 'Dokumen',
  references: 'Referensi',
};

function rupiah(n: number): string {
  if (n === 0) return 'Gratis';
  return 'Rp' + n.toLocaleString('id-ID') + '/bln';
}

export function BillingPage() {
  const meQuery = useQuery({
    queryKey: ['billing', 'me'],
    queryFn: async () => {
      const res = await api.get('/billing/me');
      return res.data.data as BillingMe;
    },
  });

  const plansQuery = useQuery({
    queryKey: ['billing', 'plans'],
    queryFn: async () => {
      const res = await api.get('/billing/plans');
      return res.data.data as PlanInfo[];
    },
  });

  const me = meQuery.data;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Paket & Pemakaian</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lihat paket aktif, pemakaian, dan opsi upgrade.
        </p>
      </div>

      {/* Paket aktif + pemakaian */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-base">Paket aktif</CardTitle>
            <CardDescription>
              {meQuery.isLoading ? '—' : (me?.plan.tagline ?? '')}
            </CardDescription>
          </div>
          {me && (
            <Badge className="shrink-0 text-sm" variant={me.plan.key === 'FREE' ? 'secondary' : 'default'}>
              {me.plan.name} · {rupiah(me.plan.priceMonthly)}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {meQuery.isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          )}
          {me &&
            Object.keys(me.usage).map((key) => {
              const used = me.usage[key] ?? 0;
              const limit = me.limits[key] ?? 0;
              const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
              const near = pct >= 80;
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{RESOURCE_LABEL[key] ?? key}</span>
                    <span className="text-muted-foreground">
                      {used.toLocaleString('id-ID')} / {limit.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn('h-full rounded-full transition-all', near ? 'bg-warning' : 'bg-primary')}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </CardContent>
      </Card>

      {/* Katalog paket */}
      <div className="grid gap-4 sm:grid-cols-2">
        {plansQuery.isLoading &&
          Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-6 h-9 w-full" />
            </Card>
          ))}
        {plansQuery.data?.map((plan) => {
          const isCurrent = me?.plan.key === plan.key;
          const isPaid = plan.priceMonthly > 0;
          return (
            <Card
              key={plan.key}
              className={cn('relative flex flex-col', isCurrent && 'border-primary ring-1 ring-primary/30')}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  {plan.name}
                  {plan.key !== 'FREE' && <Sparkles className="h-4 w-4 text-primary" />}
                </CardTitle>
                <CardDescription>{plan.tagline}</CardDescription>
                <p className="pt-2 font-heading text-2xl font-semibold">{rupiah(plan.priceMonthly)}</p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <ul className="flex-1 space-y-1.5 text-sm">
                  {plan.limits &&
                    (['tasks', 'projects', 'documents', 'notes'] as const).map((k) => (
                      <li key={k} className="flex items-center gap-2">
                        <Check className="h-4 w-4 shrink-0 text-success" />
                        {(plan.limits?.[k] ?? 0).toLocaleString('id-ID')} {RESOURCE_LABEL[k]}
                      </li>
                    ))}
                  {plan.limits && (
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0 text-success" />
                      {(plan.limits.storageMb ?? 0).toLocaleString('id-ID')} MB penyimpanan
                    </li>
                  )}
                </ul>
                <div className="mt-4">
                  {isCurrent ? (
                    <Button variant="outline" className="w-full" disabled>
                      Paket kamu saat ini
                    </Button>
                  ) : isPaid ? (
                    <Button
                      className="w-full"
                      onClick={() =>
                        toast.info('Pembayaran online segera hadir. Hubungi admin untuk upgrade manual.')
                      }
                    >
                      Upgrade ke {plan.name}
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full" disabled>
                      Paket dasar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {meQuery.isError && (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <Loader2 className="h-4 w-4" /> Gagal memuat data billing.
        </p>
      )}
    </div>
  );
}
