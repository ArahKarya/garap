import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import {
  CheckSquare,
  Pencil,
  Trash2,
  Calendar,
  Repeat,
  FolderKanban,
  CheckCircle2,
  X,
  Link as LinkIcon,
  ExternalLink,
  Plus,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { RECURRENCE_LABELS } from '@garap/shared';
import { api } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { TagPicker } from '@/components/TagPicker';
import { cn } from '@/lib/utils';

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE' | 'CANCELLED';

interface SubTask {
  id: string;
  title: string;
  status: TaskStatus;
}

interface TaskDetail {
  id: string;
  workspaceId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: string;
  dueDate: string | null;
  completedAt: string | null;
  recurrence: string | null;
  projectId: string | null;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  project: { id: string; name: string; color: string | null } | null;
  children: SubTask[];
}

interface TaskDetailDialogProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}

const priorityVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  LOW: 'outline',
  MEDIUM: 'secondary',
  HIGH: 'default',
  URGENT: 'destructive',
};

const statusVariant: Record<TaskStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  TODO: 'outline',
  IN_PROGRESS: 'default',
  BLOCKED: 'destructive',
  DONE: 'secondary',
  CANCELLED: 'secondary',
};

export function TaskDetailDialog({
  taskId,
  open,
  onOpenChange,
  onEdit,
}: TaskDetailDialogProps) {
  const qc = useQueryClient();

  const taskQuery = useQuery({
    queryKey: ['task-detail', taskId],
    enabled: open && !!taskId,
    queryFn: async () => {
      const res = await api.get(`/tasks/${taskId}`);
      return res.data.data as TaskDetail;
    },
  });

  const t = taskQuery.data;

  const invalidateTaskCaches = (): void => {
    qc.invalidateQueries({ queryKey: ['task-detail', taskId] });
    qc.invalidateQueries({ queryKey: ['tasks'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    // Project-scoped cache: prefix-invalidate so any [projectId] permutation
    // is dropped (consistent with how ProjectAddDialogs writes the key).
    qc.invalidateQueries({ queryKey: ['project-tasks'] });
    if (taskQuery.data?.projectId) {
      qc.invalidateQueries({
        queryKey: ['project-tasks', taskQuery.data.projectId],
      });
    }
  };

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!taskId) return;
      await api.post(`/tasks/${taskId}/complete`);
    },
    onSuccess: () => {
      invalidateTaskCaches();
      toast.success('Status task diperbarui');
    },
    onError: () => toast.error('Gagal update status'),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!taskId) return;
      await api.delete(`/tasks/${taskId}`);
    },
    onSuccess: () => {
      invalidateTaskCaches();
      toast.success('Task dipindah ke trash');
      onOpenChange(false);
    },
    onError: () => toast.error('Gagal menghapus'),
  });

  const subtaskToggle = useMutation({
    mutationFn: async (subId: string) => {
      await api.post(`/tasks/${subId}/complete`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-detail', taskId] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const formatDate = (iso: string | null): string =>
    iso ? format(new Date(iso), 'EEEE, d MMM yyyy', { locale: idLocale }) : '—';

  const isDone = t?.status === 'DONE';
  const recLabel =
    t?.recurrence && (RECURRENCE_LABELS as Record<string, string>)[t.recurrence];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl pr-8">
            {taskQuery.isLoading ? (
              <Skeleton className="h-7 w-2/3" />
            ) : (
              <span className={isDone ? 'text-muted-foreground' : ''}>
                {t?.title ?? 'Task'}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {taskQuery.isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {t && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusVariant[t.status]}>{t.status}</Badge>
              <Badge variant={priorityVariant[t.priority]}>{t.priority}</Badge>
              {recLabel && (
                <Badge variant="outline" className="gap-1">
                  <Repeat className="h-3 w-3" />
                  {recLabel}
                </Badge>
              )}
              {t.project && (
                <RouterLink to={`/projects/${t.project.id}`}>
                  <Badge variant="outline" className="gap-1 hover:bg-accent">
                    <FolderKanban className="h-3 w-3" />
                    {t.project.name}
                  </Badge>
                </RouterLink>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground">Tenggat</div>
                  <div className="font-medium">{formatDate(t.dueDate)}</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground">Selesai</div>
                  <div className="font-medium">{formatDate(t.completedAt)}</div>
                </div>
              </div>
            </div>

            {t.description && (
              <>
                <Separator />
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Deskripsi</div>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {t.description}
                  </p>
                </div>
              </>
            )}

            {t.children.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">
                    Sub-task ({t.children.filter((s) => s.status === 'DONE').length}/
                    {t.children.length} selesai)
                  </div>
                  <div className="space-y-1">
                    {t.children.map((s) => {
                      const sDone = s.status === 'DONE';
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => subtaskToggle.mutate(s.id)}
                          disabled={subtaskToggle.isPending}
                          className="group flex w-full items-center gap-2.5 rounded-md p-2 text-left text-sm transition-colors hover:bg-accent"
                        >
                          <span
                            className={cn(
                              'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                              sDone
                                ? 'border-success bg-success text-success-foreground'
                                : 'border-muted-foreground/40 text-transparent group-hover:border-success group-hover:text-success/50',
                            )}
                          >
                            <CheckSquare className="h-3 w-3" strokeWidth={3} />
                          </span>
                          <span
                            className={cn('flex-1', sDone && 'text-muted-foreground line-through')}
                          >
                            {s.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <Separator />
            <TaskLinksSection task={t} />

            <Separator />
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Tags</div>
              <TagPicker entityType="TASK" entityId={t.id} />
            </div>

            <div className="text-xs text-muted-foreground">
              Dibuat {format(new Date(t.createdAt), 'd MMM yyyy, HH:mm', { locale: idLocale })}
              {t.updatedAt !== t.createdAt && (
                <>
                  {' · '}
                  diperbarui{' '}
                  {format(new Date(t.updatedAt), 'd MMM yyyy, HH:mm', { locale: idLocale })}
                </>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex-wrap gap-2 sm:flex-row sm:justify-between">
          <div className="flex gap-2">
            <Button
              variant={isDone ? 'outline' : 'default'}
              size="sm"
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending || !t}
            >
              <CheckSquare className="h-4 w-4" />
              {isDone ? 'Buka kembali' : 'Tandai selesai'}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (t && confirm(`Pindahkan "${t.title}" ke trash?`)) {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending || !t}
            >
              <Trash2 className="h-4 w-4" />
              Hapus
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
              Tutup
            </Button>
            <Button variant="outline" size="sm" onClick={onEdit} disabled={!t}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Links section: list + add form ──────────────────────────────────────

interface TaskLinkRow {
  id: string;
  url: string;
  title: string;
  faviconUrl: string | null;
  platform: string;
}

function TaskLinksSection({ task }: { task: TaskDetail }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');

  const linksQuery = useQuery({
    queryKey: ['task-links', task.id],
    queryFn: async () => {
      const res = await api.get('/links', {
        params: { taskId: task.id, limit: 100 },
      });
      return res.data.data as TaskLinkRow[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      await api.post('/links', {
        workspaceId: task.workspaceId,
        taskId: task.id,
        projectId: task.projectId ?? null,
        url: url.trim(),
        title: title.trim() || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-links', task.id] });
      qc.invalidateQueries({ queryKey: ['links'] });
      qc.invalidateQueries({ queryKey: ['project-links'] });
      toast.success('Link ditambahkan');
      setUrl('');
      setTitle('');
      setAdding(false);
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response
              ?.data?.error?.message
          : null;
      toast.error(msg ?? 'Gagal tambah link');
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (linkId: string) => {
      // Detach from task instead of deleting the link entirely.
      await api.patch(`/links/${linkId}`, { taskId: null });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-links', task.id] });
      qc.invalidateQueries({ queryKey: ['links'] });
      toast.success('Link dilepas dari task');
    },
    onError: () => toast.error('Gagal lepas link'),
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <LinkIcon className="h-3 w-3" />
          Link / URL terkait ({linksQuery.data?.length ?? 0})
        </div>
        {!adding && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setAdding(true)}
            className="h-7 px-2"
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah link
          </Button>
        )}
      </div>

      {adding && (
        <div className="space-y-2 rounded-md border bg-muted/30 p-2">
          <Input
            autoFocus
            type="url"
            placeholder="https://..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (url.trim()) addMutation.mutate();
              }
            }}
            className="h-8"
          />
          <Input
            placeholder="Judul (opsional, auto-fetch jika kosong)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-8"
          />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setAdding(false);
                setUrl('');
                setTitle('');
              }}
              className="h-7 px-2"
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={() => addMutation.mutate()}
              disabled={!url.trim() || addMutation.isPending}
              className="h-7 px-2"
            >
              {addMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Simpan
            </Button>
          </div>
        </div>
      )}

      {linksQuery.isLoading && <Skeleton className="h-10 w-full" />}

      {!linksQuery.isLoading && linksQuery.data && linksQuery.data.length > 0 && (
        <div className="space-y-1">
          {linksQuery.data.map((l) => (
            <div
              key={l.id}
              className="flex items-center gap-2 rounded-md border bg-card px-2 py-1.5 text-sm"
            >
              {l.faviconUrl ? (
                <img src={l.faviconUrl} alt="" className="h-4 w-4 shrink-0 rounded" />
              ) : (
                <LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-w-0 hover:underline"
              >
                <div className="font-medium truncate">{l.title}</div>
                <div className="text-[10px] text-muted-foreground truncate">{l.url}</div>
              </a>
              <Badge variant="outline" className="text-[10px] shrink-0">
                {l.platform}
              </Badge>
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground shrink-0"
                title="Buka di tab baru"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Lepas link "${l.title}" dari task ini?`)) {
                    removeMutation.mutate(l.id);
                  }
                }}
                className="text-muted-foreground hover:text-destructive shrink-0"
                title="Lepas dari task"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
