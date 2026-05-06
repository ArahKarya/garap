import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createNoteSchema, type CreateNoteInput } from '@panggonmikir/shared';
import { Plus, Loader2, Pin, PinOff, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useActiveWorkspace } from '@/hooks/useWorkspaces';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TagPicker } from '@/components/TagPicker';
import { TagFilter } from '@/components/TagFilter';

interface NoteRow {
  id: string;
  workspaceId: string;
  projectId: string | null;
  title: string;
  content: string;
  pinned: boolean;
  updatedAt: string;
  project: { id: string; name: string; color: string | null } | null;
}

import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ breaks: true, gfm: true });

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    const href = node.getAttribute('href') ?? '';
    if (/^https?:\/\//i.test(href)) {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
    node.classList.add('text-primary', 'underline');
  }
  if (node.tagName === 'SPAN' && node.classList.contains('wikilink')) {
    node.classList.add(
      'inline-flex', 'items-center', 'rounded', 'bg-info/10',
      'px-1.5', 'py-0.5', 'text-xs', 'text-info',
    );
  }
});

function renderMarkdown(src: string): string {
  const wikilinkExpanded = src.replace(
    /\[\[([^\]]+)\]\]/g,
    (_, title: string) =>
      `<span class="wikilink" data-title="${title.replace(/"/g, '&quot;')}">🔗 ${title}</span>`,
  );
  const html = marked.parse(wikilinkExpanded, { async: false }) as string;
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'code', 'pre', 'blockquote',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'a', 'span', 'hr', 'del', 's',
    ],
    ALLOWED_ATTR: ['href', 'class', 'target', 'rel', 'title', 'data-title', 'data-spa-link'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|\/)/i,
    ADD_ATTR: ['target'],
  });
}

export function NotesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { activeWorkspaceId } = useActiveWorkspace();

  const notesQuery = useQuery({
    queryKey: ['notes', selectedTagIds, activeWorkspaceId],
    enabled: !!activeWorkspaceId,
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: 50 };
      if (activeWorkspaceId) params.workspaceId = activeWorkspaceId;
      if (selectedTagIds.length > 0) params.tagIds = selectedTagIds.join(',');
      const res = await api.get('/notes', { params });
      return res.data.data as NoteRow[];
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

  const {
    register,
    getValues,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateNoteInput>({
    resolver: zodResolver(createNoteSchema),
    defaultValues: {
      workspaceId: activeWorkspaceId ?? '',
      title: '',
      content: '',
      pinned: false,
    },
  });

  useEffect(() => {
    if (activeWorkspaceId) {
      setValue('workspaceId', activeWorkspaceId, { shouldValidate: false });
    }
  }, [activeWorkspaceId, setValue]);

  const upsertMutation = useMutation({
    mutationFn: async (input: CreateNoteInput) => {
      const payload = { ...input, workspaceId: input.workspaceId || activeWorkspaceId || '' };
      const res = editingId
        ? await api.patch(`/notes/${editingId}`, payload)
        : await api.post('/notes', payload);
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

  // ── Bulk operations ───────────────────────────────────────────────────
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => api.delete(`/notes/${id}`)));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notes'] });
      toast.success(`${selectedIds.size} note dipindah ke trash`);
      setSelectedIds(new Set());
    },
  });

  const bulkPinMutation = useMutation({
    mutationFn: async ({ ids, pin }: { ids: string[]; pin: boolean }) => {
      await Promise.all(
        ids.map((id) => api.patch(`/notes/${id}`, { pinned: pin })),
      );
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['notes'] });
      toast.success(
        `${vars.ids.length} note ${vars.pin ? 'di-pin' : 'di-unpin'}`,
      );
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

  const openCreate = (): void => {
    setEditingId(null);
    reset({
      workspaceId: activeWorkspaceId ?? '',
      title: '',
      content: '',
      pinned: false,
      projectId: null,
    });
    setOpen(true);
  };

  const openEdit = (n: NoteRow): void => {
    setEditingId(n.id);
    reset({
      workspaceId: n.workspaceId ?? activeWorkspaceId ?? '',
      title: n.title,
      content: n.content,
      pinned: n.pinned,
      projectId: n.projectId,
    });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notes"
        subtitle="Catatan markdown — pin yang penting di atas."
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Note Baru
          </Button>
        }
      />

      <TagFilter selectedIds={selectedTagIds} onChange={setSelectedTagIds} />

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
          <span className="text-sm">
            <strong>{selectedIds.size}</strong> note dipilih
          </span>
          <div className="ml-auto flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                bulkPinMutation.mutate({ ids: Array.from(selectedIds), pin: true })
              }
              disabled={bulkPinMutation.isPending}
            >
              <Pin className="h-3.5 w-3.5" />
              Pin
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                bulkPinMutation.mutate({ ids: Array.from(selectedIds), pin: false })
              }
              disabled={bulkPinMutation.isPending}
            >
              <PinOff className="h-3.5 w-3.5" />
              Unpin
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (confirm(`Pindahkan ${selectedIds.size} note ke trash?`))
                  bulkDeleteMutation.mutate(Array.from(selectedIds));
              }}
              disabled={bulkDeleteMutation.isPending}
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
              Hapus
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
            >
              Batal
            </Button>
          </div>
        </div>
      )}

      {notesQuery.isLoading && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      )}

      {!notesQuery.isLoading && (!notesQuery.data || notesQuery.data.length === 0) && (
        <Card className="p-8">
          <EmptyState description="Belum ada catatan. Klik “Note Baru” untuk mulai." />
        </Card>
      )}

      {notesQuery.data && notesQuery.data.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {notesQuery.data.map((n) => (
            <Card
              key={n.id}
              className={`group cursor-pointer hover:shadow-md transition-shadow relative ${selectedIds.has(n.id) ? 'ring-2 ring-primary' : ''}`}
              onClick={() => openEdit(n)}
            >
              <input
                type="checkbox"
                aria-label="Select note"
                checked={selectedIds.has(n.id)}
                onChange={() => toggleSelected(n.id)}
                onClick={(e) => e.stopPropagation()}
                className={`absolute top-2 left-2 z-10 ${
                  selectedIds.has(n.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                } transition-opacity`}
              />
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2 space-y-0">
                <div className="min-w-0 flex-1 pl-5">
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Note' : 'Note Baru'}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const raw = getValues();
              const data = {
                ...raw,
                workspaceId: raw.workspaceId || activeWorkspaceId || '',
              };
              const parsed = createNoteSchema.safeParse(data);
              if (!parsed.success) {
                const first = parsed.error.errors[0];
                toast.error(first?.message ?? 'Validasi gagal');
                return;
              }
              upsertMutation.mutate(parsed.data);
            }}
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
                  Konten (Markdown)
                </Label>
                <Textarea
                  id="content"
                  rows={14}
                  className="font-mono text-sm"
                  {...register('content')}
                />
                <p className="text-[11px] text-muted-foreground">
                  Heading <code>#</code> · bold <code>**x**</code> · list{' '}
                  <code>- item</code> · link <code>[label](https://…)</code> · backlink{' '}
                  <code>[Tasks](/tasks)</code> · wikilink <code>[[Topic]]</code>
                </p>
              </TabsContent>
              <TabsContent value="preview">
                <div
                  className="prose prose-sm max-w-none rounded-md border p-4 text-sm min-h-[300px] dark:prose-invert"
                  onClick={(e) => {
                    // Intercept clicks on internal SPA links so we don't
                    // trigger a full reload. data-spa-link attribute is added
                    // by the markdown renderer for /-prefixed hrefs.
                    const target = (e.target as HTMLElement).closest(
                      'a[data-spa-link="true"]',
                    ) as HTMLAnchorElement | null;
                    if (target) {
                      e.preventDefault();
                      window.history.pushState(null, '', target.getAttribute('href') ?? '/');
                      // Trigger React Router popstate listener.
                      window.dispatchEvent(new PopStateEvent('popstate'));
                      setOpen(false);
                    }
                  }}
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(watch('content') ?? ''),
                  }}
                />
              </TabsContent>
            </Tabs>

            <div className="space-y-2">
              <Label>Project (opsional)</Label>
              <Select
                value={watch('projectId') ?? '__none__'}
                onValueChange={(v) =>
                  setValue('projectId', v === '__none__' ? null : v)
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
              <TagPicker entityType="NOTE" entityId={editingId} />
            </div>

            <DialogFooter className="sticky bottom-0 bg-background -mx-6 px-6 py-3 border-t -mb-6">
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
