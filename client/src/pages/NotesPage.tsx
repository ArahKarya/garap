import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createNoteSchema, type CreateNoteInput } from '@panggonmikir/shared';
import { Plus, Loader2, Pin, PinOff, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TagPicker } from '@/components/TagPicker';
import { TagFilter } from '@/components/TagFilter';

interface NoteRow {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  updatedAt: string;
  project: { id: string; name: string; color: string | null } | null;
}

/** Minimal markdown → HTML — escape, then render headings, bold, italic, code, links, lists.
 * Not a full markdown parser; good enough for personal notes preview. */
function renderMarkdown(src: string): string {
  const escaped = src
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const lines = escaped.split('\n');
  const out: string[] = [];
  let inList = false;
  for (const raw of lines) {
    const line = raw;
    if (/^\s*[-*]\s+/.test(line)) {
      if (!inList) {
        out.push('<ul class="list-disc pl-5 my-2 space-y-1">');
        inList = true;
      }
      out.push(`<li>${line.replace(/^\s*[-*]\s+/, '')}</li>`);
      continue;
    }
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
    if (/^### /.test(line)) {
      out.push(`<h3 class="text-base font-semibold mt-3 mb-1">${line.replace(/^### /, '')}</h3>`);
    } else if (/^## /.test(line)) {
      out.push(`<h2 class="text-lg font-semibold mt-4 mb-2">${line.replace(/^## /, '')}</h2>`);
    } else if (/^# /.test(line)) {
      out.push(`<h1 class="text-xl font-bold mt-4 mb-2">${line.replace(/^# /, '')}</h1>`);
    } else if (line.trim() === '') {
      out.push('<div class="h-2"></div>');
    } else {
      out.push(`<p class="my-1 leading-relaxed">${line}</p>`);
    }
  }
  if (inList) out.push('</ul>');
  return out
    .join('')
    .replace(/`([^`]+)`/g, '<code class="rounded bg-muted px-1 py-0.5 text-xs">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline">$1</a>',
    );
}

export function NotesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const notesQuery = useQuery({
    queryKey: ['notes', selectedTagIds],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: 50 };
      if (selectedTagIds.length > 0) params.tagIds = selectedTagIds.join(',');
      const res = await api.get('/notes', { params });
      return res.data.data as NoteRow[];
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateNoteInput>({
    resolver: zodResolver(createNoteSchema),
    defaultValues: { title: '', content: '', pinned: false },
  });

  const upsertMutation = useMutation({
    mutationFn: async (input: CreateNoteInput) => {
      const res = editingId
        ? await api.patch(`/notes/${editingId}`, input)
        : await api.post('/notes', input);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notes'] });
      toast.success(editingId ? 'Note diperbarui' : 'Note dibuat');
      reset();
      setEditingId(null);
      setOpen(false);
    },
    onError: () => toast.error('Gagal menyimpan note'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/notes/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Note dipindah ke trash');
    },
  });

  const pinMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/notes/${id}/toggle-pin`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
  });

  const openCreate = (): void => {
    setEditingId(null);
    reset({ title: '', content: '', pinned: false });
    setOpen(true);
  };

  const openEdit = (n: NoteRow): void => {
    setEditingId(n.id);
    reset({ title: n.title, content: n.content, pinned: n.pinned });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notes"
        description="Catatan markdown — pin yang penting di atas."
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Note Baru
          </Button>
        }
      />

      <TagFilter selectedIds={selectedTagIds} onChange={setSelectedTagIds} />

      {notesQuery.isLoading && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      )}

      {!notesQuery.isLoading && (!notesQuery.data || notesQuery.data.length === 0) && (
        <Card className="p-8">
          <EmptyState message="Belum ada catatan. Klik “Note Baru” untuk mulai." />
        </Card>
      )}

      {notesQuery.data && notesQuery.data.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {notesQuery.data.map((n) => (
            <Card
              key={n.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => openEdit(n)}
            >
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2 space-y-0">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm truncate">{n.title}</h3>
                  {n.project && (
                    <p className="text-xs text-muted-foreground truncate">
                      {n.project.name}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      pinMutation.mutate(n.id);
                    }}
                    title={n.pinned ? 'Unpin' : 'Pin'}
                  >
                    {n.pinned ? (
                      <Pin className="h-3.5 w-3.5 text-warning" />
                    ) : (
                      <PinOff className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Pindahkan "${n.title}" ke trash?`))
                        deleteMutation.mutate(n.id);
                    }}
                    title="Hapus"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                  {n.content || '(kosong)'}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  {n.pinned && <Badge variant="outline" className="text-xs">Pinned</Badge>}
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {new Date(n.updatedAt).toLocaleDateString('id-ID')}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Note' : 'Note Baru'}</DialogTitle>
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

            <Tabs defaultValue="edit" className="w-full">
              <TabsList>
                <TabsTrigger value="edit">Edit</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="edit" className="space-y-2">
                <Label htmlFor="content">
                  Konten (Markdown — heading <code>#</code>, bold <code>**x**</code>, list{' '}
                  <code>- item</code>)
                </Label>
                <Textarea
                  id="content"
                  rows={14}
                  className="font-mono text-sm"
                  {...register('content')}
                />
              </TabsContent>
              <TabsContent value="preview">
                <div
                  className="prose prose-sm max-w-none rounded-md border p-4 text-sm min-h-[300px] dark:prose-invert"
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(watch('content') ?? ''),
                  }}
                />
              </TabsContent>
            </Tabs>

            <div className="space-y-2">
              <Label>Tags</Label>
              <TagPicker entityType="NOTE" entityId={editingId} />
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
