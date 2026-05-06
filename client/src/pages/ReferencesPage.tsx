import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createReferenceSchema,
  updateReferenceSchema,
  type CreateReferenceInput,
  REFERENCE_TYPES,
  REFERENCE_TYPE_LABELS,
  type ReferenceType,
} from '@panggonmikir/shared';
import {
  Plus,
  Loader2,
  Pencil,
  Trash2,
  ExternalLink,
  BookOpen,
  Search,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TagPicker } from '@/components/TagPicker';
import { TagFilter } from '@/components/TagFilter';

interface ReferenceRow {
  id: string;
  workspaceId: string;
  projectId: string | null;
  type: ReferenceType;
  title: string;
  authors: string | null;
  year: number | null;
  source: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  doi: string | null;
  isbn: string | null;
  url: string | null;
  abstract: string | null;
  notes: string | null;
  citation: string | null;
  createdAt: string;
  updatedAt: string;
  project: { id: string; name: string; color: string | null } | null;
}

const typeColor: Record<ReferenceType, string> = {
  BOOK: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  JOURNAL_ARTICLE: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  CONFERENCE_PAPER: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  THESIS: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  BOOK_CHAPTER: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
  REPORT: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  WEBSITE: 'bg-slate-500/10 text-slate-700 dark:text-slate-300',
  PREPRINT: 'bg-pink-500/10 text-pink-700 dark:text-pink-300',
  OTHER: 'bg-muted text-muted-foreground',
};

export function ReferencesPage() {
  const qc = useQueryClient();
  const { activeWorkspaceId } = useActiveWorkspace();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<ReferenceType | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  const refsQuery = useQuery({
    queryKey: ['references', selectedTagIds, typeFilter, search, activeWorkspaceId],
    enabled: !!activeWorkspaceId,
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: 200 };
      if (activeWorkspaceId) params.workspaceId = activeWorkspaceId;
      if (typeFilter !== 'ALL') params.type = typeFilter;
      if (search.trim()) params.search = search.trim();
      if (selectedTagIds.length > 0) params.tagIds = selectedTagIds.join(',');
      const res = await api.get('/references', { params });
      return res.data.data as ReferenceRow[];
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
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateReferenceInput>({
    resolver: zodResolver(createReferenceSchema),
    defaultValues: {
      workspaceId: activeWorkspaceId ?? '',
      type: 'JOURNAL_ARTICLE',
      title: '',
    },
  });

  useEffect(() => {
    if (activeWorkspaceId) {
      setValue('workspaceId', activeWorkspaceId, { shouldValidate: false });
    }
  }, [activeWorkspaceId, setValue]);

  const upsertMutation = useMutation({
    mutationFn: async (input: CreateReferenceInput) => {
      const payload = {
        ...input,
        workspaceId: input.workspaceId || activeWorkspaceId || '',
        projectId: input.projectId || null,
      };
      const res = editingId
        ? await api.patch(`/references/${editingId}`, payload)
        : await api.post('/references', payload);
      return res.data.data as ReferenceRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['references'] });
      toast.success(editingId ? 'Referensi diperbarui' : 'Referensi ditambahkan');
      reset({ workspaceId: activeWorkspaceId ?? '', type: 'JOURNAL_ARTICLE', title: '' });
      setEditingId(null);
      setOpen(false);
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error && 'response' in err
          ? // @ts-expect-error axios shape
            err.response?.data?.error?.message
          : null;
      toast.error(msg ?? 'Gagal menyimpan referensi');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/references/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['references'] });
      toast.success('Referensi dipindah ke trash');
    },
    onError: () => toast.error('Gagal hapus referensi'),
  });

  const openCreate = (): void => {
    setEditingId(null);
    reset({
      workspaceId: activeWorkspaceId ?? '',
      type: 'JOURNAL_ARTICLE',
      title: '',
      authors: '',
      year: null,
      source: '',
      volume: '',
      issue: '',
      pages: '',
      doi: '',
      isbn: '',
      url: '',
      abstract: '',
      notes: '',
      citation: '',
      projectId: null,
    });
    setOpen(true);
  };

  const openEdit = (r: ReferenceRow): void => {
    setEditingId(r.id);
    reset({
      workspaceId: r.workspaceId ?? activeWorkspaceId ?? '',
      type: r.type,
      title: r.title,
      authors: r.authors,
      year: r.year,
      source: r.source,
      volume: r.volume,
      issue: r.issue,
      pages: r.pages,
      doi: r.doi,
      isbn: r.isbn,
      url: r.url ?? '',
      abstract: r.abstract,
      notes: r.notes,
      citation: r.citation,
      projectId: r.projectId,
    });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        icon={BookOpen}
        title="Jurnal & Referensi"
        subtitle="Buku, artikel jurnal, paper konferensi, thesis — bisa di-tag untuk filter."
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Referensi Baru
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari judul, penulis, DOI…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua jenis</SelectItem>
            {REFERENCE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {REFERENCE_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <TagFilter selectedIds={selectedTagIds} onChange={setSelectedTagIds} />

      <div className="grid gap-3">
        {refsQuery.isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        {!refsQuery.isLoading && (!refsQuery.data || refsQuery.data.length === 0) && (
          <EmptyState
            title="Belum ada referensi"
            description="Tambah artikel jurnal, buku, atau paper untuk mulai membangun bibliografi kamu."
          />
        )}
        {refsQuery.data?.map((r) => (
          <Card
            key={r.id}
            className="p-4 hover:bg-accent/40 transition-colors cursor-pointer"
            onClick={() => openEdit(r)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={`text-[10px] ${typeColor[r.type]}`} variant="secondary">
                    {REFERENCE_TYPE_LABELS[r.type]}
                  </Badge>
                  {r.year && (
                    <Badge variant="outline" className="text-[10px]">{r.year}</Badge>
                  )}
                  {r.project && (
                    <Badge variant="outline" className="text-[10px]">
                      {r.project.name}
                    </Badge>
                  )}
                </div>
                <h3 className="font-semibold leading-snug">{r.title}</h3>
                {r.authors && (
                  <p className="text-xs text-muted-foreground">{r.authors}</p>
                )}
                {r.source && (
                  <p className="text-xs italic text-muted-foreground">
                    {r.source}
                    {r.volume ? `, vol. ${r.volume}` : ''}
                    {r.issue ? `(${r.issue})` : ''}
                    {r.pages ? `, hal. ${r.pages}` : ''}
                  </p>
                )}
                {(r.doi || r.isbn) && (
                  <p className="text-xs text-muted-foreground font-mono">
                    {r.doi && <>DOI: {r.doi} </>}
                    {r.isbn && <>ISBN: {r.isbn}</>}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                {r.url && (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-muted-foreground hover:text-foreground"
                    title="Buka URL"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(r);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Pindahkan "${r.title}" ke trash?`)) {
                      deleteMutation.mutate(r.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Referensi' : 'Referensi Baru'}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const raw = getValues();
              const data = {
                ...raw,
                workspaceId: raw.workspaceId || activeWorkspaceId || '',
              };
              const schema = editingId ? updateReferenceSchema : createReferenceSchema;
              const parsed = schema.safeParse(data);
              if (!parsed.success) {
                const first = parsed.error.errors[0];
                toast.error(first?.message ?? 'Validasi gagal');
                return;
              }
              // updateSchema yields partial; mutationFn handles PATCH vs POST
              upsertMutation.mutate(parsed.data as CreateReferenceInput);
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Jenis</Label>
                <Select
                  value={watch('type') ?? 'JOURNAL_ARTICLE'}
                  onValueChange={(v) => setValue('type', v as ReferenceType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REFERENCE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {REFERENCE_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ref-year">Tahun</Label>
                <Input
                  id="ref-year"
                  type="number"
                  placeholder="cth. 2024"
                  {...register('year', { setValueAs: (v) => (v === '' ? null : Number(v)) })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ref-title">Judul</Label>
              <Textarea id="ref-title" rows={2} autoFocus {...register('title')} />
              {errors.title && (
                <p className="text-xs text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ref-authors">Penulis</Label>
              <Input
                id="ref-authors"
                placeholder="Smith, J.; Doe, A.; Tanaka, K."
                {...register('authors')}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ref-source">Sumber</Label>
                <Input
                  id="ref-source"
                  placeholder="Nama jurnal / penerbit / konferensi"
                  {...register('source')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ref-doi">DOI</Label>
                <Input
                  id="ref-doi"
                  placeholder="10.1234/..."
                  {...register('doi')}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ref-volume">Volume</Label>
                <Input id="ref-volume" {...register('volume')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ref-issue">Issue</Label>
                <Input id="ref-issue" {...register('issue')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ref-pages">Halaman</Label>
                <Input id="ref-pages" placeholder="12-34" {...register('pages')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ref-isbn">ISBN</Label>
                <Input id="ref-isbn" {...register('isbn')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ref-url">URL</Label>
                <Input
                  id="ref-url"
                  type="url"
                  placeholder="https://..."
                  {...register('url')}
                />
              </div>
            </div>

            <div className="space-y-1.5">
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

            <div className="space-y-1.5">
              <Label htmlFor="ref-abstract">Abstrak</Label>
              <Textarea id="ref-abstract" rows={4} {...register('abstract')} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ref-notes">Catatan personal</Label>
              <Textarea id="ref-notes" rows={3} {...register('notes')} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ref-citation">Sitasi terformat (opsional)</Label>
              <Textarea
                id="ref-citation"
                rows={2}
                placeholder="APA / IEEE / dll. Tempel sitasi yang sudah jadi di sini."
                {...register('citation')}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Tags</Label>
              <TagPicker entityType="REFERENCE" entityId={editingId} />
            </div>

            <DialogFooter className="sticky bottom-0 bg-background -mx-6 px-6 py-3 border-t -mb-6">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={upsertMutation.isPending}>
                {upsertMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
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
