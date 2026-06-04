import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import {
  CalendarDays,
  Clock,
  AlertTriangle,
  FolderKanban,
  Link as LinkIcon,
  ArrowRight,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';
import { useActiveWorkspace } from '@/hooks/useWorkspaces';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

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

function greeting(): string {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 19) return 'Selamat sore';
  return 'Selamat malam';
}

function todayLabel(): string {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

interface StatProps {
  to: string;
  label: string;
  value: string | number;
  icon: typeof CalendarDays;
  tone: 'primary' | 'info' | 'danger' | 'success' | 'warning';
  highlight?: boolean;
}

const toneClasses: Record<StatProps['tone'], string> = {
  primary: 'bg-primary/10 text-primary',
  info: 'bg-info/10 text-info',
  danger: 'bg-destructive/10 text-destructive',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
};

function Stat({ to, label, value, icon: Icon, tone, highlight }: StatProps) {
  return (
    <RouterLink
      to={to}
      className={cn(
        'group rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40',
        highlight && 'border-destructive/40 bg-destructive/5',
      )}
    >
      <div className="flex items-center justify-between">
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', toneClasses[tone])}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <p className="mt-3 font-heading text-2xl font-semibold leading-none">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </RouterLink>
  );
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
  const firstName = user?.name?.split(' ')[0] ?? '';

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {greeting()}{firstName ? `, ${firstName}` : ''}.
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{todayLabel()}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          to="/tasks"
          label="Jatuh tempo hari ini"
          value={isLoading ? '—' : (c?.tasksToday ?? 0)}
          icon={CalendarDays}
          tone="info"
        />
        <Stat
          to="/tasks"
          label="Terlambat"
          value={isLoading ? '—' : (c?.tasksOverdue ?? 0)}
          icon={AlertTriangle}
          tone="danger"
          highlight={!isLoading && (c?.tasksOverdue ?? 0) > 0}
        />
        <Stat
          to="/tasks"
          label="7 hari ke depan"
          value={isLoading ? '—' : (c?.tasksUpcoming7Days ?? 0)}
          icon={Clock}
          tone="primary"
        />
        <Stat
          to="/projects"
          label="Project aktif"
          value={isLoading ? '—' : (c?.projectsActive ?? 0)}
          icon={FolderKanban}
          tone="success"
        />
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Task mendatang</h2>
          <RouterLink
            to="/tasks"
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            Lihat semua <ArrowRight className="h-3 w-3" />
          </RouterLink>
        </div>
        <div className="divide-y">
          {isLoading && (
            <div className="space-y-2 p-4">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/4" />
            </div>
          )}
          {!isLoading && (!data?.recentTasks || data.recentTasks.length === 0) && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Tidak ada task aktif. Nikmati waktumu. 🌿
            </p>
          )}
          {data?.recentTasks?.map((t) => (
            <RouterLink
              key={t.id}
              to={`/tasks/${t.id}`}
              className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/40"
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 shrink-0 rounded-full',
                  t.priority === 'URGENT'
                    ? 'bg-destructive'
                    : t.priority === 'HIGH'
                      ? 'bg-warning'
                      : 'bg-muted-foreground/30',
                )}
              />
              <span className="flex-1 truncate text-sm font-medium">{t.title}</span>
              {t.project && (
                <span className="hidden shrink-0 items-center gap-1.5 sm:flex">
                  {t.project.color && (
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: t.project.color }}
                    />
                  )}
                  <span className="text-xs text-muted-foreground">{t.project.name}</span>
                </span>
              )}
              {t.dueDate && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(t.dueDate).toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: 'short',
                  })}
                </span>
              )}
            </RouterLink>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Link terbaru</h2>
          <RouterLink
            to="/links"
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            Lihat semua <ArrowRight className="h-3 w-3" />
          </RouterLink>
        </div>
        <div className="divide-y">
          {isLoading && (
            <div className="space-y-2 p-4">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-2/3" />
            </div>
          )}
          {!isLoading && (!data?.recentLinks || data.recentLinks.length === 0) && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Belum ada link disimpan.
            </p>
          )}
          {data?.recentLinks?.map((l) => (
            <a
              key={l.id}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/40"
            >
              {l.faviconUrl ? (
                <img src={l.faviconUrl} alt="" className="h-4 w-4 shrink-0 rounded" />
              ) : (
                <LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span className="flex-1 truncate text-sm font-medium">{l.title}</span>
              <span className="hidden truncate text-xs text-muted-foreground sm:block sm:max-w-[40%]">
                {l.url}
              </span>
            </a>
          ))}
        </div>
      </Card>
    </div>
  );
}
