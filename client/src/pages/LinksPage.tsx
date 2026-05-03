import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createLinkSchema,
  updateLinkSchema,
  type CreateLinkInput,
  type UpdateLinkInput,
  LINK_PLATFORMS,
  type LinkPlatform,
} from '@panggonmikir/shared';
import {
  Plus,
  Loader2,
  ExternalLink,
  Link as LinkIcon,
  RefreshCw,
  Pencil,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useActiveWorkspace } from '@/hooks/useWorkspaces';
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

interface LinkRow {
  id: string;
  url: string;
  title: string;
  description: string | null;
  faviconUrl: string | null;
  platform: LinkPlatform;
  notes: string | null;
  accessCount: number;
  project: { id: string; name: string; color: string | null } | null;
  createdAt: string;
}

export function LinksPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<LinkPlatform | 'ALL'>('ALL');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { activeWorkspaceId } = useActiveWorkspace();

  const linksQuery = useQuery({
    queryKey: ['links', platformFilter, selectedTagIds, activeWorkspaceId],
    enabled: !!activeWorkspaceId,
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: 50 };
      if (activeWorkspaceId) params.workspaceId = activeWorkspaceId;
      if (platformFilter !== 'ALL') params.platform = platformFilter;
      if (selectedTagIds.length > 0) params.tagIds = selectedTagIds.join(',');
      const res = await api.get('/links', { params });
      return res.data.data as LinkRow[];
    },
  });

  const projectsQuery = useQuery({
    queryKey: ['projects', 'select', activeWorkspaceId],
    enabled: !!activeWorkspaceId,
    queryFn: async () => {
      const res = await api.get('/projects', {
        params: { limit: 100, workspaceId: activeWorkspaceId },
      });
      return res.data.data as Array<{ id: string; name: string; color: string | null }>;
    },
  });

  // Use createLinkSchema for create, updateLinkSchema for edit (no url field on edit).
  const createForm = useForm<CreateLinkInput>({
    resolver: zodResolver(createLinkSchema),
    defaultValues: { workspaceId: activeWorkspaceId ?? '', url: '' },
  });

  // Sync form's workspaceId once the workspace becomes available (or changes).
  useEffect(() => {
    if (activeWorkspaceId) {
      createForm.setValue('workspaceId', activeWorkspaceId, { shouldValidate: false });
    }
  }, [activeWorkspaceId, createForm]);

  const editForm = useForm<UpdateLinkInput>({
    resolver: zodResolver(updateLinkSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateLinkInput) => {
      const payload = { ...input, workspaceId: input.workspaceId || activeWorkspaceId || '' };
      const res = await api.post('/links', payload);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['links'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Link disimpan — metadata di-fetch otomatis');
      createForm.reset();
      setOpen(false);
    },
    onError: () => toast.error('Gagal menyimpan link'),
  });

  const updateMutation = useMutation({
    mutationFn: async (input: UpdateLinkInput) => {
      if (!editingId) throw new Error('No editing id');
      const res = await api.patch(`/links/${editingId}`, input);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['links'] });
      toast.success('Link diperbarui');
      editForm.reset();
      setEditingId(null);
      setOpen(false);
    },
    onError: () => toast.error('Gagal memperbarui link'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/links/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['links'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Link dipindah ke trash');
    },
  });

  const visitMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/links/${id}/visit`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['links'] }),
  });

  const refreshMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/links/${id}/refresh-metadata`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['links'] });
      toast.success('Metadata di-refresh');
    },
  });

  // Bulk delete + bulk metadata refresh.
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => api.delete(`/links/${id}`)));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['links'] });
      toast.success(`${selectedIds.size} link dipindah ke trash`);
      setSelectedIds(new Set());
    },
  });

  const bulkRefreshMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => api.post(`/links/${id}/refresh-metadata`)));
    },
    onSuccess: (_d, ids) => {
      qc.invalidateQueries({ queryKey: ['links'] });
      toast.success(`Metadata ${ids.length} link di-refresh`);
      setSelectedIds(new Set());
    },
  });

  const toggleSelected = (id: string): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleVisit = (link: LinkRow): void => {
    visitMutation.mutate(link.id);
    window.open(link.url, '_blank', 'noopener,noreferrer');
  };

  const openCreate = (): void => {
    setEditingId(null);
    createForm.reset({ url: '' });
    setOpen(true);
  };

  const openEdit = (l: LinkRow): void => {
    setEditingId(l.id);
    editForm.reset({
      title: l.title,
      description: l.description ?? null,
      notes: l.notes ?? null,
      platform: l.platform,
      projectId: l.project?.id ?? null,
    });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Links"
        subtitle="Bookmark multi-platform dengan metadata otomatis."
        action={
          <div className="flex items-center gap-2">
            <Select
              value={platformFilter}
              onValueChange={(v) => setPlatformFilter(v as LinkPlatform | 'ALL')}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua platform</SelectItem>
                {LINK_PLATFORMS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Simpan Link
            </Button>
          </div>
        }
      />

      <TagFilter selectedIds={selectedTagIds} onChange={setSelectedTagIds} />

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
          <span className="text-sm">
            <strong>{selectedIds.size}</strong> link dipilih
          </span>
          <div className="ml-auto flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => bulkRefreshMutation.mutate(Array.from(selectedIds))}
              disabled={bulkRefreshMutation.isPending}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh metadata
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (confirm(`Pindahkan ${selectedIds.size} link ke trash?`))
                  bulkDeleteMutation.mutate(Array.from(selectedIds));
              }}
              disabled={bulkDeleteMutation.isPending}
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
              Hapus
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
              Batal
            </Button>
          </div>
        </div>
      )}

      {linksQuery.isLoading && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      )}

      {!linksQuery.isLoading && (!linksQuery.data || linksQuery.data.length === 0) && (
        <Card className="p-8">
          <EmptyState description="Belum ada link disimpan. Paste URL apa saja, judul & favicon otomatis terisi." />
        </Card>
      )}

      {linksQuery.data && linksQuery.data.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {linksQuery.data.map((l) => (
            <Card
              key={l.id}
              className={`group p-4 space-y-2 hover:bg-accent/50 transition-colors relative ${selectedIds.has(l.id) ? 'ring-2 ring-primary' : ''}`}
            >
              <input
                type="checkbox"
                aria-label="Select link"
                checked={selectedIds.has(l.id)}
                onChange={() => toggleSelected(l.id)}
                onClick={(e) => e.stopPropagation()}
                className={`absolute top-2 left-2 z-10 ${
                  selectedIds.has(l.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                } transition-opacity`}
              />
              <div className="flex items-start gap-3 pl-5">
                {l.faviconUrl ? (
                  <img src={l.faviconUrl} alt="" className="h-6 w-6 rounded shrink-0 mt-0.5" />
                ) : (
                  <LinkIcon className="h-6 w-6 text-muted-foreground shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm line-clamp-2">{l.title}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{l.url}</p>
                </div>
              </div>

              {l.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{l.description}</p>
              )}

              <div className="flex items-center justify-between gap-2 pt-1">
                <Badge variant="outline" className="text-xs">
                  {l.platform}
                </Badge>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Refresh metadata"
                    onClick={() => refreshMutation.mutate(l.id)}
                    disabled={refreshMutation.isPending}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Edit"
                    onClick={() => openEdit(l)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Hapus"
                    onClick={() => {
                      if (confirm(`Hapus link "${l.title}"?`)) deleteMutation.mutate(l.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Buka link"
                    onClick={() => handleVisit(l)}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Link' : 'Simpan Link'}</DialogTitle>
          </DialogHeader>

          {!editingId ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const raw = createForm.getValues();
                const data = {
                  ...raw,
                  workspaceId: raw.workspaceId || activeWorkspaceId || '',
                };
                const parsed = createLinkSchema.safeParse(data);
                if (!parsed.success) {
                  const first = parsed.error.errors[0];
                  toast.error(first?.message ?? 'Validasi gagal');
                  return;
                }
                createMutation.mutate(parsed.data);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  autoFocus
                  placeholder="https://..."
                  {...createForm.register('url')}
                />
                {createForm.formState.errors.url && (
                  <p className="text-xs text-destructive">
                    {createForm.formState.errors.url.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Judul, deskripsi, favicon akan di-fetch otomatis. Platform terdeteksi dari domain.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Judul (opsional, override otomatis)</Label>
                <Input id="title" {...createForm.register('title')} />
              </div>

              <div className="space-y-2">
                <Label>Project (opsional)</Label>
                <Select
                  value={createForm.watch('projectId') ?? '__none__'}
                  onValueChange={(v) =>
                    createForm.setValue('projectId', v === '__none__' ? null : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tanpa project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Tanpa project</SelectItem>
                    {projectsQuery.data?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Catatan pribadi (opsional)</Label>
                <Textarea id="notes" rows={3} {...createForm.register('notes')} />
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="animate-spin" />}
                  Simpan
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <form
              onSubmit={editForm.handleSubmit((d) => updateMutation.mutate(d))}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="edit-title">Judul</Label>
                <Input id="edit-title" autoFocus {...editForm.register('title')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-desc">Deskripsi</Label>
                <Textarea id="edit-desc" rows={2} {...editForm.register('description')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-notes">Catatan pribadi</Label>
                <Textarea id="edit-notes" rows={3} {...editForm.register('notes')} />
              </div>

              <div className="space-y-2">
                <Label>Platform</Label>
                <Select
                  value={editForm.watch('platform') ?? 'GENERIC'}
                  onValueChange={(v) =>
                    editForm.setValue('platform', v as LinkPlatform)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LINK_PLATFORMS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Project</Label>
                <Select
                  value={editForm.watch('projectId') ?? '__none__'}
                  onValueChange={(v) =>
                    editForm.setValue('projectId', v === '__none__' ? null : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tanpa project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Tanpa project</SelectItem>
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
                <TagPicker entityType="LINK" entityId={editingId} />
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="animate-spin" />}
                  Simpan
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
