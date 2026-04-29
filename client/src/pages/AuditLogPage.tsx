import { useQuery } from '@tanstack/react-query';
import { formatDateTimeID } from '@panggonmikir/shared';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-44">Waktu</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead className="w-32">IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                </TableRow>
              ))}
            {data?.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatDateTimeID(r.createdAt)}
                </TableCell>
                <TableCell>{r.userEmail ?? '-'}</TableCell>
                <TableCell>
                  <Badge variant={actionVariant(r.action)}>{r.action}</Badge>
                </TableCell>
                <TableCell>
                  <span className="font-medium">{r.entity}</span>
                  {r.entityId && (
                    <span className="ml-1 text-xs text-muted-foreground">· {r.entityId}</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">
                  {r.ip ?? '-'}
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Belum ada aktivitas.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
