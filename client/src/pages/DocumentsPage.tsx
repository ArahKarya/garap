import { useState, useRef } from 'react';
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
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

  const externalForm = useForm<CreateExternalDocumentInput>({
    resolver: zodResolver(createExternalDocumentSchema),
    defaultValues: { workspaceId: activeWorkspaceId ?? '', title: '', externalUrl: '' },
  });

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
      await api.post('/documents/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      qc.invalidateQueries({ queryKey: ['documents'] });
      toast.success('File terupload');
      setSelectedFile(null);
      setUploadTitle('');
      setUploadDescription('');
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

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Judul</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Ukuran</TableHead>
              <TableHead>Project</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documentsQuery.isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {!documentsQuery.isLoading &&
              (!documentsQuery.data || documentsQuery.data.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState description="Belum ada document. Upload file atau simpan link." />
                  </TableCell>
                </TableRow>
              )}
            {documentsQuery.data?.map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  {d.upload ? (
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  {d.title}
                  {d.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {d.description}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {d.upload ? 'UPLOAD' : 'EXTERNAL'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {d.upload ? (
                    formatBytes(d.upload.size)
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {d.project?.name ?? <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-1">
                    {d.upload && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Download"
                        onClick={() =>
                          handleDownload(d.id, d.upload?.originalName ?? d.title)
                        }
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    {d.externalUrl && (
                      <Button variant="ghost" size="icon" asChild title="Buka link">
                        <a
                          href={d.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Edit"
                      onClick={() => openEdit(d)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Pindahkan "${d.title}" ke trash?`))
                          deleteMutation.mutate(d.id);
                      }}
                      title="Hapus"
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

      {/* Create dialog (upload or external) */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
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
                onSubmit={externalForm.handleSubmit((d) => externalMutation.mutate(d))}
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
        <DialogContent className="sm:max-w-md">
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
