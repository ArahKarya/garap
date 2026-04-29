import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createTaskSchema,
  type CreateTaskInput,
  TASK_STATUSES,
  TASK_PRIORITIES,
  type TaskStatus,
} from '@panggonmikir/shared';
import { Plus, Loader2, Check, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/shared/page-header';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TagPicker } from '@/components/TagPicker';
import { TagFilter } from '@/components/TagFilter';

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: string;
  dueDate: string | null;
  projectId: string | null;
  project: { id: string; name: string; color: string | null } | null;
  completedAt: string | null;
}

const priorityVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  LOW: 'outline',
  MEDIUM: 'secondary',
  HIGH: 'default',
  URGENT: 'destructive',
};

function toDateInput(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

export function TasksPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'ALL'>('ALL');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const tasksQuery = useQuery({
    queryKey: ['tasks', statusFilter, selectedTagIds],
    queryFn: async () => {
      const params: Record<string, string | number | boolean> = { limit: 100 };
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
        params.includeCompleted = true;
      }
      if (selectedTagIds.length > 0) {
        params.tagIds = selectedTagIds.join(',');
      }
      const res = await api.get('/tasks', { params });
      return res.data.data as TaskRow[];
    },
  });

  const projectsQuery = useQuery({
    queryKey: ['projects', 'select'],
    queryFn: async () => {
      const res = await api.get('/projects', { params: { limit: 100 } });
      return res.data.data as Array<{ id: string; name: string }>;
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: { title: '', status: 'TODO', priority: 'MEDIUM' },
  });

  const upsertMutation = useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const payload = { ...input, projectId: input.projectId || null };
      const res = editingId
        ? await api.patch(`/tasks/${editingId}`, payload)
        : await api.post('/tasks', payload);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(editingId ? 'Task diperbarui' : 'Task dibuat');
      reset();
      setEditingId(null);
      setOpen(false);
    },
    onError: () => toast.error('Gagal menyimpan task'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tasks/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Task dipindah ke trash');
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/tasks/${id}/complete`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const openCreate = (): void => {
    setEditingId(null);
    reset({ title: '', status: 'TODO', priority: 'MEDIUM' });
    setOpen(true);
  };

  const openEdit = (t: TaskRow): void => {
    setEditingId(t.id);
    reset({
      title: t.title,
      description: t.description ?? null,
      status: t.status,
      priority: t.priority as CreateTaskInput['priority'],
      dueDate: t.dueDate ? new Date(t.dueDate) : null,
      projectId: t.projectId,
    });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tasks"
        subtitle="Daftar pekerjaan kamu, urut berdasarkan prioritas dan tenggat."
        action={
          <div className="flex items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as TaskStatus | 'ALL')}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua aktif</SelectItem>
                {TASK_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Tambah Task
            </Button>
          </div>
        }
      />

      <TagFilter selectedIds={selectedTagIds} onChange={setSelectedTagIds} />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Judul</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Prioritas</TableHead>
              <TableHead>Tenggat</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasksQuery.isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {!tasksQuery.isLoading && (!tasksQuery.data || tasksQuery.data.length === 0) && (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState description="Belum ada task. Klik “Tambah Task”." />
                </TableCell>
              </TableRow>
            )}
            {tasksQuery.data?.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => completeMutation.mutate(t.id)}
                    disabled={completeMutation.isPending}
                    title={t.status === 'DONE' ? 'Buka kembali' : 'Tandai selesai'}
                  >
                    <Check
                      className={
                        t.status === 'DONE' ? 'text-success' : 'text-muted-foreground'
                      }
                    />
                  </Button>
                </TableCell>
                <TableCell className="font-medium">{t.title}</TableCell>
                <TableCell>
                  {t.project ? (
                    <span className="inline-flex items-center gap-2">
                      {t.project.color && (
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: t.project.color }}
                        />
                      )}
                      {t.project.name}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{t.status}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={priorityVariant[t.priority] ?? 'outline'}>{t.priority}</Badge>
                </TableCell>
                <TableCell>
                  {t.dueDate ? (
                    new Date(t.dueDate).toLocaleDateString('id-ID')
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Pindah "${t.title}" ke trash?`)) deleteMutation.mutate(t.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Task' : 'Task Baru'}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit((d) => upsertMutation.mutate(d))}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="title">Judul</Label>
              <Input id="title" autoFocus {...register('title')} />
              {errors.title && (
                <p className="text-xs text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi (opsional)</Label>
              <Textarea id="description" rows={3} {...register('description')} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={watch('status')}
                  onValueChange={(v) => setValue('status', v as CreateTaskInput['status'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioritas</Label>
                <Select
                  value={watch('priority')}
                  onValueChange={(v) => setValue('priority', v as CreateTaskInput['priority'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Tenggat (opsional)</Label>
              <Input
                id="dueDate"
                type="date"
                value={toDateInput(
                  watch('dueDate') ? new Date(watch('dueDate') as Date).toISOString() : null,
                )}
                onChange={(e) =>
                  setValue('dueDate', e.target.value ? new Date(e.target.value) : null)
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Project (opsional)</Label>
              <Select
                value={watch('projectId') ?? 'none'}
                onValueChange={(v) => setValue('projectId', v === 'none' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih project..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Tanpa project —</SelectItem>
                  {projectsQuery.data?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <TagPicker entityType="TASK" entityId={editingId} />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting || upsertMutation.isPending}>
                {(isSubmitting || upsertMutation.isPending) && (
                  <Loader2 className="animate-spin" />
                )}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
