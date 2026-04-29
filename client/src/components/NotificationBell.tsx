import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, BellRing, Check, AlertTriangle, Info } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error' | string;
  link: string | null;
  metadata: unknown;
  readAt: string | null;
  createdAt: string;
}

interface NotificationsResponse {
  items: Notification[];
  unread: number;
}

const typeIcon: Record<string, typeof Bell> = {
  info: Info,
  warning: AlertTriangle,
  success: Check,
  error: AlertTriangle,
};

const typeColor: Record<string, string> = {
  info: 'text-info',
  warning: 'text-warning',
  success: 'text-success',
  error: 'text-destructive',
};

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'baru saja';
  if (minutes < 60) return `${minutes}m lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}j lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}h lalu`;
  return new Date(iso).toLocaleDateString('id-ID');
}

export function NotificationBell() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications', {
        params: { page: 1, limit: 20 },
      });
      return res.data.data as NotificationsResponse;
    },
    // Reminder job runs every 30 min server-side; poll a bit faster so the
    // bell badge stays fresh.
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/notifications/${id}/read`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.post('/notifications/read-all');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const handleClick = (n: Notification): void => {
    if (!n.readAt) markReadMutation.mutate(n.id);
    if (n.link) {
      setOpen(false);
      navigate(n.link);
    }
  };

  const unread = data?.unread ?? 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        aria-label="Notifications"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent transition-colors"
      >
        {unread > 0 ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        {unread > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <h3 className="text-sm font-semibold">Notifikasi</h3>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              Tandai semua dibaca
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          <div className="p-1">
            {isLoading && (
              <>
                <Skeleton className="m-2 h-12" />
                <Skeleton className="m-2 h-12" />
              </>
            )}
            {!isLoading && (!data?.items || data.items.length === 0) && (
              <p className="px-3 py-8 text-center text-xs text-muted-foreground">
                Belum ada notifikasi.
              </p>
            )}
            {data?.items.map((n) => {
              const Icon = typeIcon[n.type] ?? Bell;
              const colorClass = typeColor[n.type] ?? 'text-muted-foreground';
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleClick(n)}
                  className={cn(
                    'flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-xs hover:bg-accent transition-colors',
                    !n.readAt && 'bg-accent/40',
                  )}
                >
                  <Icon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', colorClass)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <p
                        className={cn(
                          'font-medium truncate',
                          !n.readAt && 'font-semibold',
                        )}
                      >
                        {n.title}
                      </p>
                      {!n.readAt && (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-muted-foreground line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                      {formatRelative(n.createdAt)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
