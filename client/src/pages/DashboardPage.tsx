import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import {
  CalendarDays,
  Clock,
  AlertTriangle,
  FolderKanban,
  Link as LinkIcon,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';
import { useActiveWorkspace } from '@/hooks/useWorkspaces';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: typeof CalendarDays;
  iconColor: string;
}

function StatCard({ label, value, icon: Icon, iconColor }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${iconColor}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="font-heading text-2xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface DashboardSummary {
  counts: {
    tasksToday: number;
    tasksUpcoming7Days: number;
    tasksOverdue: number;
    projectsActive: number;
    linksTotal: number;
  };
  recentLinks: Array<{
    id: string;
    title: string;
    url: string;
    platform: string;
    faviconUrl: string | null;
    createdAt: string;
  }>;
  recentTasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: string | null;
    project: { id: string; name: string; color: string | null } | null;
  }>;
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { activeWorkspaceId } = useActiveWorkspace();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'summary', activeWorkspaceId],
    enabled: !!activeWorkspaceId,
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (activeWorkspaceId) params.workspaceId = activeWorkspaceId;
      const res = await api.get('/dashboard/summary', { params });
      return res.data.data as DashboardSummary;
    },
  });

  const c = data?.counts;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Halo, {user?.name} — selamat bekerja.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label="Hari Ini"
          value={isLoading ? '—' : (c?.tasksToday ?? 0)}
          icon={CalendarDays}
          iconColor="bg-info/10 text-info"
        />
        <StatCard
          label="7 Hari ke Depan"
          value={isLoading ? '—' : (c?.tasksUpcoming7Days ?? 0)}
          icon={Clock}
          iconColor="bg-primary/10 text-primary"
        />
        <StatCard
          label="Overdue"
          value={isLoading ? '—' : (c?.tasksOverdue ?? 0)}
          icon={AlertTriangle}
          iconColor="bg-destructive/10 text-destructive"
        />
        <StatCard
          label="Project Aktif"
          value={isLoading ? '—' : (c?.projectsActive ?? 0)}
          icon={FolderKanban}
          iconColor="bg-success/10 text-success"
        />
        <StatCard
          label="Total Links"
          value={isLoading ? '—' : (c?.linksTotal ?? 0)}
          icon={LinkIcon}
          iconColor="bg-warning/10 text-warning"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Task Mendatang</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading && <Skeleton className="h-16 w-full" />}
            {!isLoading && (!data?.recentTasks || data.recentTasks.length === 0) && (
              <p className="text-sm text-muted-foreground">Belum ada task aktif.</p>
            )}
            {data?.recentTasks?.map((t) => (
              <RouterLink
                key={t.id}
                to={`/tasks/${t.id}`}
                className="block rounded-md border p-3 hover:bg-accent transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{t.title}</p>
                    {t.project && (
                      <p className="text-xs text-muted-foreground truncate">
                        {t.project.name}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant="outline" className="text-xs">
                      {t.priority}
                    </Badge>
                    {t.dueDate && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(t.dueDate).toLocaleDateString('id-ID')}
                      </span>
                    )}
                  </div>
                </div>
              </RouterLink>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Link Terbaru</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading && <Skeleton className="h-16 w-full" />}
            {!isLoading && (!data?.recentLinks || data.recentLinks.length === 0) && (
              <p className="text-sm text-muted-foreground">Belum ada link disimpan.</p>
            )}
            {data?.recentLinks?.map((l) => (
              <a
                key={l.id}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-md border p-3 hover:bg-accent transition-colors"
              >
                {l.faviconUrl ? (
                  <img src={l.faviconUrl} alt="" className="h-5 w-5 shrink-0 rounded" />
                ) : (
                  <LinkIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{l.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{l.url}</p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">
                  {l.platform}
                </Badge>
              </a>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
