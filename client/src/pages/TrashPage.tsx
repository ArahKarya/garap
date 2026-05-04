import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  Undo2,
  Trash2,
  CheckSquare,
  FolderKanban,
  Link as LinkIcon,
  StickyNote,
  FileBox,
  Briefcase,
  BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TrashItem {
  id: string;
  title?: string;
  name?: string;
  url?: string;
  deletedAt: string;
}

interface TrashGroupConfig {
  key: string;
  label: string;
  icon: typeof CheckSquare;
  endpoint: string;
  /** API path for restore — `${endpoint}/${id}/restore` */
  labelOf: (item: TrashItem) => string;
}

const groups: TrashGroupConfig[] = [
  {
    key: 'workspaces',
    label: 'Workspaces',
    icon: Briefcase,
    endpoint: '/workspaces',
    labelOf: (i) => i.name ?? '(tanpa nama)',
  },
  {
    key: 'tasks',
    label: 'Tasks',
    icon: CheckSquare,
    endpoint: '/tasks',
    labelOf: (i) => i.title ?? '(tanpa judul)',
  },
  {
    key: 'projects',
    label: 'Projects',
    icon: FolderKanban,
    endpoint: '/projects',
    labelOf: (i) => i.name ?? '(tanpa nama)',
  },
  {
    key: 'links',
    label: 'Links',
    icon: LinkIcon,
    endpoint: '/links',
    labelOf: (i) => i.title ?? i.url ?? '(tanpa judul)',
  },
  {
    key: 'notes',
    label: 'Notes',
    icon: StickyNote,
    endpoint: '/notes',
    labelOf: (i) => i.title ?? '(tanpa judul)',
  },
  {
    key: 'documents',
    label: 'Documents',
    icon: FileBox,
    endpoint: '/documents',
    labelOf: (i) => i.title ?? '(tanpa judul)',
  },
  {
    key: 'references',
    label: 'References',
    icon: BookOpen,
    endpoint: '/references',
    labelOf: (i) => i.title ?? '(tanpa judul)',
  },
];

interface TrashGroupProps {
  config: TrashGroupConfig;
}

function TrashGroup({ config }: TrashGroupProps) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['trash', config.key],
    queryFn: async () => {
      const res = await api.get(config.endpoint, {
        params: { limit: 100, deletedOnly: true, includeCompleted: true, includeArchived: true },
      });
      return res.data.data as TrashItem[];
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`${config.endpoint}/${id}/restore`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trash', config.key] });
      qc.invalidateQueries({ queryKey: [config.key] });
      toast.success(`${config.label.slice(0, -1)} dipulihkan`);
    },
    onError: () => toast.error('Gagal restore'),
  });

  const purgeMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${config.endpoint}/${id}/purge`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trash', config.key] });
      qc.invalidateQueries({ queryKey: [config.key] });
      toast.success(`${config.label.slice(0, -1)} dihapus permanen`);
    },
    onError: () => toast.error('Gagal hapus permanen'),
  });

  const Icon = config.icon;
  const count = data?.length ?? 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4" />
          {config.label}
        </CardTitle>
        <Badge variant="outline" className="text-xs">
          {count}
        </Badge>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-12 w-full" />}
        {!isLoading && count === 0 && (
          <EmptyState description={`Tidak ada ${config.label.toLowerCase()} di trash.`} />
        )}
        {!isLoading && data && data.length > 0 && (
          <div className="space-y-2">
            {data.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-md border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{config.labelOf(item)}</p>
                  <p className="text-xs text-muted-foreground">
                    Dihapus {new Date(item.deletedAt).toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => restoreMutation.mutate(item.id)}
                    disabled={restoreMutation.isPending}
                  >
                    {restoreMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Undo2 className="h-3.5 w-3.5" />
                    )}
                    Restore
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const label = config.labelOf(item);
                      if (
                        confirm(
                          `Hapus permanen "${label}"? Tidak bisa di-undo.`,
                        )
                      ) {
                        purgeMutation.mutate(item.id);
                      }
                    }}
                    disabled={purgeMutation.isPending}
                    className="text-destructive hover:bg-destructive/10"
                    title="Hapus permanen"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function TrashPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Trash"
        subtitle="Item yang dihapus tetap ada di sini sampai kamu pulihkan. Tidak ada auto-purge."
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {groups.map((g) => (
          <TrashGroup key={g.key} config={g} />
        ))}
      </div>
    </div>
  );
}
