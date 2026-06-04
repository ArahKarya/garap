import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createProjectSchema,
  type CreateProjectInput,
  PROJECT_STATUSES,
  type ProjectStatus,
} from '@panggonmikir/shared';
import {
  Plus,
  Loader2,
  Pencil,
  Trash2,
  FolderKanban,
  CheckSquare,
  Link as LinkIcon,
  CalendarDays,
} from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/shared/page-header';
import { Card } from '@/components/ui/card';
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
import { useActiveWorkspace } from '@/hooks/useWorkspaces';

interface ProjectRow {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  color: string | null;
  startDate: string | null;
  dueDate: string | null;
  _count?: { tasks: number; links: number };
}

function toDateInput(iso: string | null | Date | undefined): string {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 10);
}

export function ProjectsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const { activeWorkspaceId } = useActiveWorkspace();

  const projectsQuery = useQuery({
    queryKey: ['projects', selectedTagIds, activeWorkspaceId],
    enabled: !!activeWorkspaceId,
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: 50 };
      if (activeWorkspaceId) params.workspaceId = activeWorkspaceId;
      if (selectedTagIds.length > 0) {
        params.tagIds = selectedTagIds.join(',');
      }
      const res = await api.get('/projects', { params });
      return res.data.data as ProjectRow[];
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      workspaceId: activeWorkspaceId ?? '',
      name: '',
      status: 'ACTIVE',
      color: '#10b981',
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      const res = editingId
        ? await api.patch(`/projects/${editingId}`, input)
        : await api.post('/projects', input);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(editingId ? 'Project diperbarui' : 'Project dibuat');
      reset();
      setEditingId(null);
      setOpen(false);
    },
    onError: () => toast.error('Gagal menyimpan project'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/projects/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Project dipindah ke trash');
    },
  });

  const openCreate = (): void => {
    setEditingId(null);
    reset({
      workspaceId: activeWorkspaceId ?? '',
      name: '',
      status: 'ACTIVE',
      color: '#10b981',
    });
    setOpen(true);
  };

  const openEdit = (p: ProjectRow): void => {
    setEditingId(p.id);
    reset({
      workspaceId: p.workspaceId ?? activeWorkspaceId ?? '',
      name: p.name,
      description: p.description ?? null,
      status: p.status,
      color: p.color ?? null,
      startDate: p.startDate ? new Date(p.startDate) : null,
      dueDate: p.dueDate ? new Date(p.dueDate) : null,
    });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Projects"
        subtitle="Container untuk task, link, dokumen, dan note."
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Project Baru
          </Button>
        }
      />

      <TagFilter selectedIds={selectedTagIds} onChange={setSelectedTagIds} />

      {projectsQuery.isLoading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="mt-3 h-3 w-full" />
              <Skeleton className="mt-4 h-3 w-1/2" />
            </Card>
          ))}
        </div>
      )}

      {!projectsQuery.isLoading &&
        (!projectsQuery.data || projectsQuery.data.length === 0) && (
          <Card className="p-0">
            <EmptyState
              icon={FolderKanban}
              title="Belum ada project"
              description="Buat project untuk mengelompokkan task, link, note, dan dokumen."
              action={
                <Button size="sm" onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  Project Baru
                </Button>
              }
            />
          </Card>
        )}

      {!projectsQuery.isLoading && projectsQuery.data && projectsQuery.data.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projectsQuery.data.map((p) => (
            <Card
              key={p.id}
              className="group relative overflow-hidden p-0 transition-colors hover:border-primary/40"
            >
              <span
                className="absolute inset-x-0 top-0 h-1"
                style={{ backgroundColor: p.color ?? 'var(--primary)' }}
              />
              <RouterLink to={`/projects/${p.id}`} className="block p-4 pt-5">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: p.color ?? 'var(--primary)' }}
                  />
                  <h3 className="truncate text-sm font-semibold">{p.name}</h3>
                </div>
                <p className="mt-1.5 line-clamp-2 min-h-[2rem] text-xs text-muted-foreground">
                  {p.description || 'Tidak ada deskripsi.'}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-[10px]">
                    {p.status}
                  </Badge>
                  <span className="flex items-center gap-1">
                    <CheckSquare className="h-3 w-3" />
                    {p._count?.tasks ?? 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <LinkIcon className="h-3 w-3" />
                    {p._count?.links ?? 0}
                  </span>
                  {p.dueDate && (
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {new Date(p.dueDate).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </span>
                  )}
                </div>
              </RouterLink>
              <div className="absolute right-2 top-2 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 max-md:opacity-100">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="Edit"
                  onClick={() => openEdit(p)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="Hapus"
                  onClick={() => {
                    if (confirm(`Pindah "${p.name}" ke trash?`)) deleteMutation.mutate(p.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Project' : 'Project Baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => upsertMutation.mutate(d))} className="space-y-4">
            <input type="hidden" {...register('workspaceId')} />
            <div className="space-y-2">
              <Label htmlFor="name">Nama</Label>
              <Input id="name" autoFocus {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              {errors.workspaceId && (
                <p className="text-xs text-destructive">{errors.workspaceId.message}</p>
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
                  onValueChange={(v) => setValue('status', v as CreateProjectInput['status'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Warna</Label>
                <Input id="color" type="color" className="h-10 p-1" {...register('color')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="startDate">Mulai</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={toDateInput(watch('startDate'))}
                  onChange={(e) =>
                    setValue('startDate', e.target.value ? new Date(e.target.value) : null)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Tenggat</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={toDateInput(watch('dueDate'))}
                  onChange={(e) =>
                    setValue('dueDate', e.target.value ? new Date(e.target.value) : null)
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <TagPicker entityType="PROJECT" entityId={editingId} />
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
