import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  type CreateWorkspaceInput,
} from '@garap/shared';
import {
  Plus,
  Pencil,
  Trash2,
  Star,
  Archive,
  ArchiveRestore,
  Briefcase,
  Loader2,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useWorkspaces, type WorkspaceRow } from '@/hooks/useWorkspaces';
import { useWorkspaceStore } from '@/stores/workspace';
import { PageHeader } from '@/components/shared/page-header';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertDialog } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type FormShape = CreateWorkspaceInput & { isDefault?: boolean };

export function WorkspacesPage() {
  const qc = useQueryClient();
  const { data: workspaces, isLoading } = useWorkspaces();
  const setActiveWorkspaceId = useWorkspaceStore((s) => s.setActiveWorkspaceId);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WorkspaceRow | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<WorkspaceRow | null>(null);

  const isEditing = !!editing;
  const schema = isEditing ? updateWorkspaceSchema : createWorkspaceSchema;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormShape>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', color: '#10b981' },
  });

  const upsertMutation = useMutation({
    mutationFn: async (input: FormShape) => {
      const payload = { ...input };
      const res = editing
        ? await api.patch(`/workspaces/${editing.id}`, payload)
        : await api.post('/workspaces', payload);
      return res.data.data as WorkspaceRow;
    },
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success(editing ? 'Workspace diperbarui' : 'Workspace dibuat');
      if (!editing) setActiveWorkspaceId(saved.id);
      reset();
      setEditing(null);
      setOpen(false);
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error && 'response' in err
          ? // @ts-expect-error axios shape
            err.response?.data?.error?.message
          : null;
      toast.error(msg ?? 'Gagal menyimpan workspace');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/workspaces/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Workspace dipindah ke trash');
      setDeleteCandidate(null);
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error && 'response' in err
          ? // @ts-expect-error axios shape
            err.response?.data?.error?.message
          : null;
      toast.error(msg ?? 'Gagal menghapus workspace');
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/workspaces/${id}/set-default`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Workspace default diperbarui');
    },
    onError: () => toast.error('Gagal set default'),
  });

  const archiveMutation = useMutation({
    mutationFn: async ({ id, archive }: { id: string; archive: boolean }) => {
      await api.post(`/workspaces/${id}/${archive ? 'archive' : 'unarchive'}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Status workspace diperbarui');
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error && 'response' in err
          ? // @ts-expect-error axios shape
            err.response?.data?.error?.message
          : null;
      toast.error(msg ?? 'Gagal mengubah status');
    },
  });

  const openCreate = (): void => {
    setEditing(null);
    reset({ name: '', color: '#10b981', description: '', icon: '' });
    setOpen(true);
  };

  const openEdit = (w: WorkspaceRow): void => {
    setEditing(w);
    reset({
      name: w.name,
      description: w.description ?? '',
      color: w.color ?? '#10b981',
      icon: w.icon ?? '',
      sortOrder: w.sortOrder,
      isDefault: w.isDefault,
    });
    setOpen(true);
  };

  const onSubmit = (data: FormShape): void => {
    upsertMutation.mutate(data);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Briefcase}
        title="Workspaces"
        subtitle="Kelola context per perusahaan / klien. Project + Task + Note + Link + Document terikat ke workspace."
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Workspace Baru
          </Button>
        }
      />

      {isLoading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="mt-3 h-3 w-full" />
            </Card>
          ))}
        </div>
      )}

      {!isLoading && (!workspaces || workspaces.length === 0) && (
        <Card className="p-0">
          <EmptyState
            icon={Briefcase}
            title="Belum ada workspace"
            description="Klik 'Workspace Baru' untuk mulai mengelola context per perusahaan / klien."
            action={
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Workspace Baru
              </Button>
            }
          />
        </Card>
      )}

      {!isLoading && workspaces && workspaces.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((w) => (
            <Card
              key={w.id}
              className="group relative overflow-hidden p-0 transition-colors hover:border-primary/40"
            >
              <span
                className="absolute inset-x-0 top-0 h-1"
                style={{ backgroundColor: w.color ?? 'var(--primary)' }}
              />
              <div className="p-4 pt-5">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: w.color ?? 'var(--primary)' }}
                  />
                  <h3 className="truncate text-sm font-semibold">{w.name}</h3>
                  {w.isDefault && (
                    <Badge variant="outline" className="gap-1 text-[10px]">
                      <Star className="h-3 w-3 fill-current" /> Default
                    </Badge>
                  )}
                </div>
                <p className="mt-1.5 line-clamp-2 min-h-[2rem] text-xs text-muted-foreground">
                  {w.description || 'Tidak ada deskripsi.'}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-[10px]">
                    {w.archivedAt ? 'Archived' : 'Aktif'}
                  </Badge>
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    {w._count?.projects ?? 0} project
                  </span>
                </div>
              </div>
              <div className="absolute right-2 top-2 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 max-md:opacity-100">
                {!w.isDefault && !w.archivedAt && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setDefaultMutation.mutate(w.id)}
                    disabled={setDefaultMutation.isPending}
                    title="Jadikan default"
                  >
                    <Star className="h-3.5 w-3.5" />
                  </Button>
                )}
                {!w.isDefault && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() =>
                      archiveMutation.mutate({
                        id: w.id,
                        archive: !w.archivedAt,
                      })
                    }
                    disabled={archiveMutation.isPending}
                    title={w.archivedAt ? 'Aktifkan kembali' : 'Arsipkan'}
                  >
                    {w.archivedAt ? (
                      <ArchiveRestore className="h-3.5 w-3.5" />
                    ) : (
                      <Archive className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => openEdit(w)}
                  title="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                {!w.isDefault && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setDeleteCandidate(w)}
                    title="Hapus"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Workspace' : 'Workspace Baru'}</DialogTitle>
            <DialogDescription>
              Workspace memisahkan context per perusahaan. Project tidak bisa pindah workspace.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama</Label>
              <Input id="name" autoFocus placeholder="cth. PT Maju Sentosa" {...register('name')} />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi (opsional)</Label>
              <Textarea
                id="description"
                rows={2}
                placeholder="Konteks workspace ini…"
                {...register('description')}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="color">Warna</Label>
                <Input id="color" type="color" {...register('color')} className="h-10 w-20 p-1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="icon">Icon (emoji opsional)</Label>
                <Input id="icon" placeholder="🏢" maxLength={4} {...register('icon')} />
              </div>
            </div>

            {editing && !editing.isDefault && (
              <label className="flex items-center gap-2 rounded-md border p-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={!!watch('isDefault')}
                  onChange={(e) => setValue('isDefault', e.target.checked)}
                />
                <div className="flex-1">
                  <div className="text-sm font-medium flex items-center gap-1">
                    <Star className="h-3 w-3" /> Jadikan default
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Workspace default jadi pilihan awal saat login.
                  </div>
                </div>
              </label>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteCandidate}
        onOpenChange={(o) => !o && setDeleteCandidate(null)}
        title="Hapus workspace?"
        description={`Workspace "${deleteCandidate?.name ?? ''}" akan dipindah ke trash. Workspace dengan project aktif tidak bisa dihapus — pindahkan project-nya dulu atau arsipkan. Bisa dikembalikan via Trash.`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        onConfirm={() => deleteCandidate && deleteMutation.mutate(deleteCandidate.id)}
      />
    </div>
  );
}
