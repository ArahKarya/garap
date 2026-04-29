import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTagSchema, type CreateTagInput } from '@panggonmikir/shared';
import { Plus, Loader2, Pencil, Trash2 } from 'lucide-react';
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

interface TagRow {
  id: string;
  name: string;
  color: string | null;
  _count?: { taggings: number };
}

function getErrorMessage(err: unknown): string | null {
  if (err && typeof err === 'object' && 'response' in err) {
    return (
      (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
        ?.message ?? null
    );
  }
  return null;
}

export function TagsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const tagsQuery = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const res = await api.get('/tags');
      return res.data.data as TagRow[];
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTagInput>({
    resolver: zodResolver(createTagSchema),
    defaultValues: { name: '', color: '#64748b' },
  });

  const upsertMutation = useMutation({
    mutationFn: async (input: CreateTagInput) => {
      const res = editingId
        ? await api.patch(`/tags/${editingId}`, input)
        : await api.post('/tags', input);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tags'] });
      toast.success(editingId ? 'Tag diperbarui' : 'Tag dibuat');
      reset();
      setEditingId(null);
      setOpen(false);
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err) ?? 'Gagal menyimpan tag'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tags/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tags'] });
      toast.success('Tag dihapus');
    },
  });

  const openCreate = (): void => {
    setEditingId(null);
    reset({ name: '', color: '#64748b' });
    setOpen(true);
  };

  const openEdit = (t: TagRow): void => {
    setEditingId(t.id);
    reset({ name: t.name, color: t.color ?? '#64748b' });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tags"
        description="Tag universal untuk semua entitas (task, project, link, note, document)."
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Tag Baru
          </Button>
        }
      />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead className="text-center">Dipakai</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tagsQuery.isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={3}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {!tagsQuery.isLoading && (!tagsQuery.data || tagsQuery.data.length === 0) && (
              <TableRow>
                <TableCell colSpan={3}>
                  <EmptyState message="Belum ada tag." />
                </TableCell>
              </TableRow>
            )}
            {tagsQuery.data?.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <Badge
                    variant="outline"
                    className="text-xs"
                    style={
                      t.color
                        ? {
                            borderColor: t.color,
                            color: t.color,
                          }
                        : undefined
                    }
                  >
                    {t.name}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">{t._count?.taggings ?? 0}</TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Hapus tag "${t.name}"?`)) deleteMutation.mutate(t.id);
                      }}
                      disabled={deleteMutation.isPending}
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
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Tag' : 'Tag Baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => upsertMutation.mutate(d))} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama</Label>
              <Input id="name" autoFocus {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Warna</Label>
              <Input id="color" type="color" className="h-10 p-1 w-24" {...register('color')} />
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
