import { useQuery } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { formatDateTimeID } from '@garap/shared';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';

interface AuditRow {
  id: string;
  userEmail: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  ip: string | null;
  createdAt: string;
}

function actionVariant(action: string) {
  if (action.startsWith('CREATE')) return 'success' as const;
  if (action.startsWith('DELETE')) return 'destructive' as const;
  if (action.startsWith('UPDATE')) return 'info' as const;
  if (action === 'LOGIN') return 'secondary' as const;
  if (action === 'LOGIN_FAILED') return 'warning' as const;
  return 'outline' as const;
}

export function AuditLogPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async (): Promise<AuditRow[]> => {
      const res = await api.get<{ data: AuditRow[] }>('/audit-logs', {
        params: { page: 1, limit: 100 },
      });
      return res.data.data;
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1>Audit Log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Riwayat aktivitas sistem — mutasi, login, dan export
        </p>
      </div>

      <Card className="overflow-hidden p-0">
        {isLoading && (
          <div className="divide-y">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        )}
        {!isLoading && (!data || data.length === 0) && (
          <EmptyState
            icon={FileText}
            title="Belum ada aktivitas"
            description="Aktivitas sistem — mutasi, login, dan export — akan muncul di sini."
          />
        )}
        {!isLoading && data && data.length > 0 && (
          <div className="divide-y">
            {data.map((log) => (
              <div key={log.id} className="flex items-start gap-3 px-4 py-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant={actionVariant(log.action)} className="text-[10px]">
                      {log.action}
                    </Badge>
                    <span className="font-medium">{log.entity}</span>
                    {log.entityId && (
                      <span className="text-xs text-muted-foreground">· {log.entityId}</span>
                    )}
                    {log.userEmail && (
                      <span className="text-xs text-muted-foreground">{log.userEmail}</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDateTimeID(log.createdAt)}
                    {log.ip && (
                      <span className="ml-2 font-mono">{log.ip}</span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
