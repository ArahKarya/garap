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
import { Plus, Loader2, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';
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
      color: '#2563ab',
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
      color: '#2563ab',
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

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Tasks</TableHead>
              <TableHead className="text-center">Links</TableHead>
              <TableHead>Tenggat</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projectsQuery.isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {!projectsQuery.isLoading &&
              (!projectsQuery.data || projectsQuery.data.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState description="Belum ada project." />
                  </TableCell>
                </TableRow>
              )}
            {projectsQuery.data?.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">
                  <span className="inline-flex items-center gap-2">
                    {p.color && (
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: p.color }}
                      />
                    )}
                    {p.name}
                  </span>
                  {p.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {p.description}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{p.status}</Badge>
                </TableCell>
                <TableCell className="text-center">{p._count?.tasks ?? 0}</TableCell>
                <TableCell className="text-center">{p._count?.links ?? 0}</TableCell>
                <TableCell>
                  {p.dueDate ? (
                    new Date(p.dueDate).toLocaleDateString('id-ID')
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-1">
                    <Button variant="ghost" size="icon" asChild title="Buka detail">
                      <RouterLink to={`/projects/${p.id}`}>
                        <ExternalLink className="h-4 w-4" />
                      </RouterLink>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Pindah "${p.name}" ke trash?`))
                          deleteMutation.mutate(p.id);
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
