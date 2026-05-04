import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import {
  CheckSquare,
  Square,
  Pencil,
  Trash2,
  Calendar,
  Repeat,
  FolderKanban,
  CheckCircle2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { RECURRENCE_LABELS, type TaskRecurrence } from '@panggonmikir/shared';
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
import { TagPicker } from '@/components/TagPicker';

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

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!taskId) return;
      await api.post(`/tasks/${taskId}/complete`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-detail', taskId] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['project-tasks'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
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
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['project-tasks'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
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
              <span className={isDone ? 'line-through text-muted-foreground' : ''}>
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
                          className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-accent transition-colors"
                        >
                          {sDone ? (
                            <CheckSquare className="h-4 w-4 text-primary shrink-0" />
                          ) : (
                            <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <span
                            className={
                              sDone ? 'line-through text-muted-foreground flex-1' : 'flex-1'
                            }
                          >
                            {s.title}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {s.status}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

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
