import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createExternalDocumentSchema,
  updateDocumentSchema,
  type CreateExternalDocumentInput,
  type UpdateDocumentInput,
} from '@panggonmikir/shared';
import {
  Plus,
  Loader2,
  Upload,
  ExternalLink,
  Download,
  Trash2,
  FileText,
  Link2,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useActiveWorkspace } from '@/hooks/useWorkspaces';
import { PageHeader } from '@/components/shared/page-header';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TagPicker } from '@/components/TagPicker';
import { TagFilter } from '@/components/TagFilter';

interface DocumentRow {
  id: string;
  title: string;
  description: string | null;
  externalUrl: string | null;
  fileUploadId: string | null;
  upload: {
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
  } | null;
  project: { id: string; name: string; color: string | null } | null;
  createdAt: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentsPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const { activeWorkspaceId } = useActiveWorkspace();

  const documentsQuery = useQuery({
    queryKey: ['documents', selectedTagIds, activeWorkspaceId],
    enabled: !!activeWorkspaceId,
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: 50 };
      if (activeWorkspaceId) params.workspaceId = activeWorkspaceId;
      if (selectedTagIds.length > 0) params.tagIds = selectedTagIds.join(',');
      const res = await api.get('/documents', { params });
      return res.data.data as DocumentRow[];
    },
  });

  const projectsQuery = useQuery({
    queryKey: ['projects', 'select', activeWorkspaceId],
    enabled: !!activeWorkspaceId,
    queryFn: async () => {
      const res = await api.get('/projects', {
        params: { limit: 100, workspaceId: activeWorkspaceId },
      });
      return res.data.data as Array<{ id: string; name: string }>;
    },
  });

  const [uploadProjectId, setUploadProjectId] = useState<string | null>(null);

  const externalForm = useForm<CreateExternalDocumentInput>({
    resolver: zodResolver(createExternalDocumentSchema),
    defaultValues: { workspaceId: activeWorkspaceId ?? '', title: '', externalUrl: '' },
  });

  useEffect(() => {
    if (activeWorkspaceId) {
      externalForm.setValue('workspaceId', activeWorkspaceId, { shouldValidate: false });
    }
  }, [activeWorkspaceId, externalForm]);

  const editForm = useForm<UpdateDocumentInput>({
    resolver: zodResolver(updateDocumentSchema),
  });

  const externalMutation = useMutation({
    mutationFn: async (input: CreateExternalDocumentInput) => {
      const payload = { ...input, workspaceId: input.workspaceId || activeWorkspaceId || '' };
      const res = await api.post('/documents/external', payload);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document tersimpan');
      externalForm.reset();
      setCreateOpen(false);
    },
    onError: () => toast.error('Gagal menyimpan document'),
  });

  const editMutation = useMutation({
    mutationFn: async (input: UpdateDocumentInput) => {
      if (!editingId) throw new Error('No editing id');
      const res = await api.patch(`/documents/${editingId}`, input);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document diperbarui');
      editForm.reset();
      setEditingId(null);
    },
    onError: () => toast.error('Gagal memperbarui document'),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (file && !uploadTitle) setUploadTitle(file.name);
  };

  const handleUpload = async (): Promise<void> => {
    if (!selectedFile) {
      toast.error('Pilih file dulu');
      return;
    }
    if (!uploadTitle.trim()) {
      toast.error('Judul wajib diisi');
      return;
    }
    setUploading(true);
    try {
      if (!activeWorkspaceId) {
        toast.error('Pilih workspace dulu');
        return;
      }
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('workspaceId', activeWorkspaceId);
      fd.append('title', uploadTitle.trim());
      if (uploadDescription.trim()) fd.append('description', uploadDescription.trim());
      if (uploadProjectId) fd.append('projectId', uploadProjectId);
      await api.post('/documents/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      qc.invalidateQueries({ queryKey: ['documents'] });
      toast.success('File terupload');
      setSelectedFile(null);
      setUploadTitle('');
      setUploadDescription('');
      setUploadProjectId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setCreateOpen(false);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response
              ?.data?.error?.message
          : null;
      toast.error(msg ?? 'Upload gagal');
    } finally {
      setUploading(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/documents/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document dipindah ke trash');
    },
  });

  const handleDownload = (id: string, name: string): void => {
    api
      .get(`/documents/${id}/download`, { responseType: 'blob' })
      .then((res) => {
        // Axios v1 headers can be string | string[] | AxiosHeaders; coerce.
        const ct = res.headers['content-type'];
        const blob = new Blob([res.data], {
          type: typeof ct === 'string' ? ct : 'application/octet-stream',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => toast.error('Download gagal'));
  };

  const openEdit = (d: DocumentRow): void => {
    setEditingId(d.id);
    editForm.reset({
      title: d.title,
      description: d.description ?? null,
      projectId: d.project?.id ?? null,
    });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Documents"
        subtitle="Upload file lokal atau simpan link ke file di GDrive/lainnya."
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Tambah Document
          </Button>
        }
      />

      <TagFilter selectedIds={selectedTagIds} onChange={setSelectedTagIds} />

      <Card className="overflow-hidden p-0">
        {documentsQuery.isLoading && (
          <div className="divide-y">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        )}
        {!documentsQuery.isLoading &&
          (!documentsQuery.data || documentsQuery.data.length === 0) && (
            <EmptyState
              icon={FileText}
              title="Belum ada document"
              description="Upload file lokal atau simpan link ke file di GDrive/lainnya."
              action={
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Tambah Document
                </Button>
              }
            />
          )}
        {!documentsQuery.isLoading && documentsQuery.data && documentsQuery.data.length > 0 && (
          <div className="divide-y">
            {documentsQuery.data.map((d) => (
              <div
                key={d.id}
                className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  {d.upload ? (
                    <FileText className="h-4 w-4" />
                  ) : (
                    <Link2 className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{d.title}</span>
                    {d.upload && (
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {formatBytes(d.upload.size)}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{d.upload ? 'File upload' : 'Link eksternal'}</span>
                    {d.project && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          {d.project.color && (
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: d.project.color }}
                            />
                          )}
                          {d.project.name}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 max-md:opacity-100">
                  {d.upload && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Download"
                      onClick={() => handleDownload(d.id, d.upload?.originalName ?? d.title)}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {d.externalUrl && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" asChild title="Buka link">
                      <a href={d.externalUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Edit"
                    onClick={() => openEdit(d)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Hapus"
                    onClick={() => {
                      if (confirm(`Pindahkan "${d.title}" ke trash?`)) deleteMutation.mutate(d.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create dialog (upload or external) */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Document</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="upload">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">
                <Upload className="h-4 w-4" />
                Upload File
              </TabsTrigger>
              <TabsTrigger value="external">
                <Link2 className="h-4 w-4" />
                Link Eksternal
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="file">File (max 50MB)</Label>
                <Input
                  id="file"
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                />
                {selectedFile && (
                  <p className="text-xs text-muted-foreground">
                    {selectedFile.name} · {formatBytes(selectedFile.size)}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="upload-title">Judul</Label>
                <Input
                  id="upload-title"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="upload-desc">Deskripsi (opsional)</Label>
                <Textarea
                  id="upload-desc"
                  rows={3}
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Project (opsional)</Label>
                <Select
                  value={uploadProjectId ?? '__none__'}
                  onValueChange={(v) => setUploadProjectId(v === '__none__' ? null : v)}
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
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setCreateOpen(false)}
                  disabled={uploading}
                >
                  Batal
                </Button>
                <Button onClick={handleUpload} disabled={uploading || !selectedFile}>
                  {uploading && <Loader2 className="animate-spin" />}
                  Upload
                </Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="external" className="space-y-4 pt-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const raw = externalForm.getValues();
                  const data = {
                    ...raw,
                    workspaceId: raw.workspaceId || activeWorkspaceId || '',
                  };
                  const parsed = createExternalDocumentSchema.safeParse(data);
                  if (!parsed.success) {
                    const first = parsed.error.errors[0];
                    toast.error(first?.message ?? 'Validasi gagal');
                    return;
                  }
                  externalMutation.mutate(parsed.data);
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="ext-title">Judul</Label>
                  <Input id="ext-title" {...externalForm.register('title')} />
                  {externalForm.formState.errors.title && (
                    <p className="text-xs text-destructive">
                      {externalForm.formState.errors.title.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ext-url">URL</Label>
                  <Input
                    id="ext-url"
                    placeholder="https://drive.google.com/..."
                    {...externalForm.register('externalUrl')}
                  />
                  {externalForm.formState.errors.externalUrl && (
                    <p className="text-xs text-destructive">
                      {externalForm.formState.errors.externalUrl.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ext-desc">Deskripsi (opsional)</Label>
                  <Textarea
                    id="ext-desc"
                    rows={3}
                    {...externalForm.register('description')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Project (opsional)</Label>
                  <Select
                    value={externalForm.watch('projectId') ?? '__none__'}
                    onValueChange={(v) =>
                      externalForm.setValue('projectId', v === '__none__' ? null : v)
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
                <DialogFooter>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setCreateOpen(false)}
                  >
                    Batal
                  </Button>
                  <Button type="submit" disabled={externalMutation.isPending}>
                    {externalMutation.isPending && <Loader2 className="animate-spin" />}
                    Simpan
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Edit dialog (metadata + tags) */}
      <Dialog open={editingId !== null} onOpenChange={(o) => !o && setEditingId(null)}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={editForm.handleSubmit((d) => editMutation.mutate(d))}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="edit-title">Judul</Label>
              <Input id="edit-title" autoFocus {...editForm.register('title')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Deskripsi</Label>
              <Textarea id="edit-desc" rows={3} {...editForm.register('description')} />
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
              <TagPicker entityType="DOCUMENT" entityId={editingId} />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingId(null)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={editMutation.isPending}>
                {editMutation.isPending && <Loader2 className="animate-spin" />}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
