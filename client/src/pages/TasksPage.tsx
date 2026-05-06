import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createTaskSchema,
  type CreateTaskInput,
  TASK_STATUSES,
  TASK_PRIORITIES,
  TASK_RECURRENCES,
  RECURRENCE_LABELS,
  type TaskStatus,
} from '@panggonmikir/shared';
import {
  Plus,
  Loader2,
  Check,
  Pencil,
  Trash2,
  List as ListIcon,
  Columns as KanbanIcon,
  ChevronRight,
  Repeat,
  Search as SearchIcon,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from '@dnd-kit/core';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useActiveWorkspace } from '@/hooks/useWorkspaces';
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
import { TaskDetailDialog } from '@/components/TaskDetailDialog';
import { TagFilter } from '@/components/TagFilter';
import { cn } from '@/lib/utils';

interface TaskRow {
  id: string;
  workspaceId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: string;
  dueDate: string | null;
  projectId: string | null;
  parentId: string | null;
  recurrence: string | null;
  project: { id: string; name: string; color: string | null } | null;
  completedAt: string | null;
}

const priorityVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  LOW: 'outline',
  MEDIUM: 'secondary',
  HIGH: 'default',
  URGENT: 'destructive',
};

const priorityColor: Record<string, string> = {
  LOW: 'border-l-muted-foreground/30',
  MEDIUM: 'border-l-info',
  HIGH: 'border-l-warning',
  URGENT: 'border-l-destructive',
};

const statusLabel: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'Sedang Dikerjakan',
  BLOCKED: 'Tertahan',
  DONE: 'Selesai',
  CANCELLED: 'Dibatalkan',
};

function toDateInput(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

type DueBucket = 'overdue' | 'today' | 'soon' | 'later' | 'none';

function dueBucket(iso: string | null, status: TaskStatus): DueBucket {
  if (!iso) return 'none';
  // Completed / cancelled tasks shouldn't be flagged as overdue.
  if (status === 'DONE' || status === 'CANCELLED') return 'none';
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(iso);
  const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.round((startOfDue.getTime() - startOfToday.getTime()) / 86400000);
  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'today';
  if (diffDays <= 3) return 'soon';
  return 'later';
}

const dueBucketClass: Record<DueBucket, string> = {
  overdue: 'text-destructive font-medium',
  today: 'text-warning font-medium',
  soon: 'text-info',
  later: 'text-muted-foreground',
  none: 'text-muted-foreground',
};

const dueBucketLabel: Record<DueBucket, string> = {
  overdue: 'Lewat',
  today: 'Hari ini',
  soon: '',
  later: '',
  none: '',
};

interface DueBadgeProps {
  iso: string | null;
  status: TaskStatus;
  short?: boolean;
}

function DueBadge({ iso, status, short = false }: DueBadgeProps) {
  if (!iso) return <span className="text-muted-foreground">—</span>;
  const bucket = dueBucket(iso, status);
  const dt = new Date(iso);
  const dateText = dt.toLocaleDateString(
    'id-ID',
    short ? { day: '2-digit', month: 'short' } : { day: '2-digit', month: 'long', year: 'numeric' },
  );
  const tag = dueBucketLabel[bucket];
  return (
    <span className={dueBucketClass[bucket]}>
      {tag ? `${tag} · ` : ''}
      {dateText}
    </span>
  );
}

type ViewMode = 'list' | 'kanban';

export function TasksPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'ALL'>('ALL');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [view, setView] = useState<ViewMode>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const { activeWorkspaceId } = useActiveWorkspace();

  // Debounce search input by 250ms.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const tasksQuery = useQuery({
    queryKey: [
      'tasks',
      view === 'kanban' ? 'all' : statusFilter,
      selectedTagIds,
      activeWorkspaceId,
      search,
    ],
    enabled: !!activeWorkspaceId,
    queryFn: async () => {
      const params: Record<string, string | number | boolean> = {
        limit: 200,
        // Always include completed/cancelled — user wants to see DONE tasks
        // alongside active ones (with line-through styling).
        includeCompleted: true,
      };
      if (activeWorkspaceId) params.workspaceId = activeWorkspaceId;
      if (view !== 'kanban' && statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      if (search) params.search = search;
      if (selectedTagIds.length > 0) {
        params.tagIds = selectedTagIds.join(',');
      }
      const res = await api.get('/tasks', { params });
      return res.data.data as TaskRow[];
    },
  });

  const projectsQuery = useQuery({
    queryKey: ['projects', 'select', activeWorkspaceId],
    enabled: !!activeWorkspaceId,
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: 100 };
      if (activeWorkspaceId) params.workspaceId = activeWorkspaceId;
      const res = await api.get('/projects', { params });
      return res.data.data as Array<{ id: string; name: string }>;
    },
  });

  const {
    register,
    getValues,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      workspaceId: activeWorkspaceId ?? '',
      title: '',
      status: 'TODO',
      priority: 'MEDIUM',
    },
  });

  // Sync workspaceId once /api/workspaces resolves (prevents silent submit fails).
  useEffect(() => {
    if (activeWorkspaceId) {
      setValue('workspaceId', activeWorkspaceId, { shouldValidate: false });
    }
  }, [activeWorkspaceId, setValue]);

  const upsertMutation = useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const payload = {
        ...input,
        workspaceId: input.workspaceId || activeWorkspaceId || '',
        projectId: input.projectId || null,
        parentId: input.parentId || null,
        recurrence: input.recurrence || null,
      };
      const res = editingId
        ? await api.patch(`/tasks/${editingId}`, payload)
        : await api.post('/tasks', payload);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(editingId ? 'Task diperbarui' : 'Task dibuat');
      reset();
      setEditingId(null);
      setOpen(false);
    },
    onError: () => toast.error('Gagal menyimpan task'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tasks/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Task dipindah ke trash');
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/tasks/${id}/complete`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const setStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      await api.patch(`/tasks/${id}`, { status });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  // Bulk operations — fire one HTTP per item, then invalidate. No batch
  // endpoint on the server side; can revisit if perf becomes an issue.
  const bulkCompleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => api.post(`/tasks/${id}/complete`)));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(`${selectedIds.size} task ditandai`);
      setSelectedIds(new Set());
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => api.delete(`/tasks/${id}`)));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(`${selectedIds.size} task dipindah ke trash`);
      setSelectedIds(new Set());
    },
  });

  const bulkSetStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: TaskStatus }) => {
      await Promise.all(ids.map((id) => api.patch(`/tasks/${id}`, { status })));
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(`${vars.ids.length} task → ${statusLabel[vars.status]}`);
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

  const selectAll = (ids: string[]): void => {
    setSelectedIds((prev) => {
      // Toggle: if everything visible is already selected, clear; else select all visible.
      const allSelected = ids.every((id) => prev.has(id));
      if (allSelected) return new Set();
      return new Set(ids);
    });
  };

  const openCreate = (parentId?: string): void => {
    setEditingId(null);
    reset({
      workspaceId: activeWorkspaceId ?? '',
      title: '',
      status: 'TODO',
      priority: 'MEDIUM',
      parentId: parentId ?? null,
    });
    setOpen(true);
  };

  const openEdit = (t: TaskRow): void => {
    setEditingId(t.id);
    reset({
      workspaceId: t.workspaceId ?? activeWorkspaceId ?? '',
      title: t.title,
      description: t.description ?? null,
      status: t.status,
      priority: t.priority as CreateTaskInput['priority'],
      dueDate: t.dueDate ? new Date(t.dueDate) : null,
      projectId: t.projectId,
      parentId: t.parentId,
      recurrence: t.recurrence ?? null,
    });
    setOpen(true);
  };

  // Build a parent-children tree for the list view + count subtasks for cards.
  // Active tasks ranked above completed/cancelled so the list defaults to
  // showing what still needs work first; DONE/CANCELLED still visible below.
  const { roots, childrenByParent, byId } = useMemo(() => {
    const tasks = tasksQuery.data ?? [];
    const byId = new Map<string, TaskRow>();
    const childrenByParent = new Map<string, TaskRow[]>();
    for (const t of tasks) byId.set(t.id, t);
    for (const t of tasks) {
      if (t.parentId && byId.has(t.parentId)) {
        const arr = childrenByParent.get(t.parentId) ?? [];
        arr.push(t);
        childrenByParent.set(t.parentId, arr);
      }
    }
    const finalRank: Record<TaskStatus, number> = {
      TODO: 0,
      IN_PROGRESS: 0,
      BLOCKED: 0,
      DONE: 1,
      CANCELLED: 1,
    };
    const roots = tasks
      .filter((t) => !t.parentId || !byId.has(t.parentId))
      .slice()
      .sort((a, b) => {
        const ra = finalRank[a.status] ?? 0;
        const rb = finalRank[b.status] ?? 0;
        return ra - rb;
      });
    return { roots, childrenByParent, byId };
  }, [tasksQuery.data]);

  // Group by status for kanban — flat list (sub-tasks shown next to parents in same column).
  const byStatus = useMemo(() => {
    const out: Record<TaskStatus, TaskRow[]> = {
      TODO: [],
      IN_PROGRESS: [],
      BLOCKED: [],
      DONE: [],
      CANCELLED: [],
    };
    for (const t of tasksQuery.data ?? []) {
      out[t.status].push(t);
    }
    return out;
  }, [tasksQuery.data]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tasks"
        subtitle="Daftar pekerjaan kamu — list atau kanban view, dengan sub-task hierarchy."
        action={
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md border bg-muted/30 p-0.5">
              <Button
                size="sm"
                variant={view === 'list' ? 'default' : 'ghost'}
                onClick={() => setView('list')}
                className="h-7 px-2"
              >
                <ListIcon className="h-3.5 w-3.5" />
                List
              </Button>
              <Button
                size="sm"
                variant={view === 'kanban' ? 'default' : 'ghost'}
                onClick={() => setView('kanban')}
                className="h-7 px-2"
              >
                <KanbanIcon className="h-3.5 w-3.5" />
                Kanban
              </Button>
            </div>
            {view === 'list' && (
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as TaskStatus | 'ALL')}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua status</SelectItem>
                  {TASK_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {statusLabel[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button size="sm" onClick={() => openCreate()}>
              <Plus className="h-4 w-4" />
              Tambah Task
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari task (judul atau deskripsi)…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <TagFilter selectedIds={selectedTagIds} onChange={setSelectedTagIds} />

      {selectedIds.size > 0 && view === 'list' && (
        <BulkActionBar
          count={selectedIds.size}
          onClear={() => setSelectedIds(new Set())}
          onComplete={() => bulkCompleteMutation.mutate(Array.from(selectedIds))}
          onDelete={() => {
            if (confirm(`Pindahkan ${selectedIds.size} task ke trash?`))
              bulkDeleteMutation.mutate(Array.from(selectedIds));
          }}
          onChangeStatus={(s) =>
            bulkSetStatusMutation.mutate({ ids: Array.from(selectedIds), status: s })
          }
          busy={
            bulkCompleteMutation.isPending ||
            bulkDeleteMutation.isPending ||
            bulkSetStatusMutation.isPending
          }
        />
      )}

      {view === 'list' ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={
                      (tasksQuery.data?.length ?? 0) > 0 &&
                      tasksQuery.data!.every((t) => selectedIds.has(t.id))
                    }
                    onChange={() => selectAll((tasksQuery.data ?? []).map((t) => t.id))}
                  />
                </TableHead>
                <TableHead className="w-10" />
                <TableHead>Judul</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioritas</TableHead>
                <TableHead>Tenggat</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasksQuery.isLoading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {!tasksQuery.isLoading && roots.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8}>
                    <EmptyState description="Belum ada task. Klik “Tambah Task”." />
                  </TableCell>
                </TableRow>
              )}
              {roots.map((t) => (
                <TaskRowGroup
                  key={t.id}
                  task={t}
                  depth={0}
                  childrenByParent={childrenByParent}
                  selected={selectedIds}
                  onToggleSelect={toggleSelected}
                  onComplete={(id) => completeMutation.mutate(id)}
                  onEdit={openEdit}
                  onDelete={(id, title) => {
                    if (confirm(`Pindah "${title}" ke trash?`)) deleteMutation.mutate(id);
                  }}
                  onAddSubtask={openCreate}
                  onView={setViewingId}
                />
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <KanbanBoard
          byStatus={byStatus}
          loading={tasksQuery.isLoading}
          onView={setViewingId}
          onChangeStatus={(id, s) => setStatusMutation.mutate({ id, status: s })}
          onAdd={(status) => {
            openCreate();
            setTimeout(() => setValue('status', status), 0);
          }}
          subtaskCountFor={(id) => childrenByParent.get(id)?.length ?? 0}
          parentTitleFor={(parentId) =>
            parentId ? (byId.get(parentId)?.title ?? null) : null
          }
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Task' : 'Task Baru'}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const raw = getValues();
              const data = {
                ...raw,
                workspaceId: raw.workspaceId || activeWorkspaceId || '',
              };
              const parsed = createTaskSchema.safeParse(data);
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

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi (opsional)</Label>
              <Textarea id="description" rows={3} {...register('description')} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={watch('status')}
                  onValueChange={(v) => setValue('status', v as CreateTaskInput['status'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {statusLabel[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioritas</Label>
                <Select
                  value={watch('priority')}
                  onValueChange={(v) => setValue('priority', v as CreateTaskInput['priority'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Tenggat (opsional)</Label>
              <Input
                id="dueDate"
                type="date"
                value={toDateInput(
                  watch('dueDate') ? new Date(watch('dueDate') as Date).toISOString() : null,
                )}
                onChange={(e) =>
                  setValue('dueDate', e.target.value ? new Date(e.target.value) : null)
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Project (opsional)</Label>
              <Select
                value={watch('projectId') ?? 'none'}
                onValueChange={(v) => setValue('projectId', v === 'none' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih project..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Tanpa project —</SelectItem>
                  {projectsQuery.data?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Parent task (opsional — bikin sub-task)</Label>
              <Select
                value={watch('parentId') ?? 'none'}
                onValueChange={(v) => setValue('parentId', v === 'none' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih parent task..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Top-level (bukan sub-task) —</SelectItem>
                  {(tasksQuery.data ?? [])
                    .filter((t) => t.id !== editingId)
                    .map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Repeat className="h-3.5 w-3.5" />
                Pengulangan (opsional)
              </Label>
              <Select
                value={watch('recurrence') ?? 'none'}
                onValueChange={(v) => setValue('recurrence', v === 'none' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tidak berulang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Tidak berulang —</SelectItem>
                  {TASK_RECURRENCES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {RECURRENCE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Saat task ditandai selesai, instance baru otomatis dibuat dengan tenggat berikutnya. Butuh tenggat aktif.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <TagPicker entityType="TASK" entityId={editingId} />
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

      <TaskDetailDialog
        taskId={viewingId}
        open={!!viewingId}
        onOpenChange={(o) => !o && setViewingId(null)}
        onEdit={() => {
          const t = tasksQuery.data?.find((x) => x.id === viewingId);
          if (!t) return;
          setViewingId(null);
          openEdit(t);
        }}
      />
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// List view: recursive row that renders a task + its sub-tasks indented.
// ───────────────────────────────────────────────────────────────────────────

interface TaskRowGroupProps {
  task: TaskRow;
  depth: number;
  childrenByParent: Map<string, TaskRow[]>;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onComplete: (id: string) => void;
  onEdit: (t: TaskRow) => void;
  onDelete: (id: string, title: string) => void;
  onAddSubtask: (parentId: string) => void;
  onView: (id: string) => void;
}

function TaskRowGroup({
  task: t,
  depth,
  childrenByParent,
  selected,
  onToggleSelect,
  onComplete,
  onEdit,
  onDelete,
  onAddSubtask,
  onView,
}: TaskRowGroupProps) {
  const children = childrenByParent.get(t.id) ?? [];
  const indent = depth * 20;
  return (
    <>
      <TableRow
        className={cn(t.status === 'DONE' && 'opacity-60', selected.has(t.id) && 'bg-accent/40')}
      >
        <TableCell>
          <input
            type="checkbox"
            aria-label={`Select ${t.title}`}
            checked={selected.has(t.id)}
            onChange={() => onToggleSelect(t.id)}
          />
        </TableCell>
        <TableCell>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onComplete(t.id)}
            title={t.status === 'DONE' ? 'Buka kembali' : 'Tandai selesai'}
          >
            <Check
              className={t.status === 'DONE' ? 'text-success' : 'text-muted-foreground'}
            />
          </Button>
        </TableCell>
        <TableCell className="font-medium">
          <div style={{ paddingLeft: indent }} className="flex items-center gap-2">
            {depth > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            <button
              type="button"
              onClick={() => onView(t.id)}
              className={cn(
                'text-left hover:underline cursor-pointer',
                t.status === 'DONE' && 'line-through',
              )}
            >
              {t.title}
            </button>
            {t.recurrence && (
              <Repeat
                className="h-3 w-3 text-info"
                aria-label={`Berulang ${t.recurrence}`}
              />
            )}
            {children.length > 0 && (
              <Badge variant="outline" className="text-[10px]">
                {children.length} sub
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell>
          {t.project ? (
            <span className="inline-flex items-center gap-2">
              {t.project.color && (
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: t.project.color }}
                />
              )}
              {t.project.name}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell>
          <Badge variant="outline">{t.status}</Badge>
        </TableCell>
        <TableCell>
          <Badge variant={priorityVariant[t.priority] ?? 'outline'}>{t.priority}</Badge>
        </TableCell>
        <TableCell>
          <DueBadge iso={t.dueDate} status={t.status} />
        </TableCell>
        <TableCell className="text-right">
          <div className="inline-flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              title="Tambah sub-task"
              onClick={() => onAddSubtask(t.id)}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" title="Edit" onClick={() => onEdit(t)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Hapus"
              onClick={() => onDelete(t.id, t.title)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {children.map((c) => (
        <TaskRowGroup
          key={c.id}
          task={c}
          depth={depth + 1}
          childrenByParent={childrenByParent}
          selected={selected}
          onToggleSelect={onToggleSelect}
          onComplete={onComplete}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddSubtask={onAddSubtask}
          onView={onView}
        />
      ))}
    </>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Floating bar with bulk actions, shown when ≥1 task is selected.
// ───────────────────────────────────────────────────────────────────────────

interface BulkActionBarProps {
  count: number;
  onClear: () => void;
  onComplete: () => void;
  onDelete: () => void;
  onChangeStatus: (status: TaskStatus) => void;
  busy: boolean;
}

function BulkActionBar({
  count,
  onClear,
  onComplete,
  onDelete,
  onChangeStatus,
  busy,
}: BulkActionBarProps) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
      <span className="text-sm font-medium">
        <strong>{count}</strong> task dipilih
      </span>
      <div className="ml-auto flex items-center gap-1">
        <Button size="sm" variant="outline" onClick={onComplete} disabled={busy}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Tandai selesai
        </Button>
        <Select onValueChange={(v) => onChangeStatus(v as TaskStatus)}>
          <SelectTrigger className="h-8 w-36 text-xs" disabled={busy}>
            <SelectValue placeholder="Pindah status…" />
          </SelectTrigger>
          <SelectContent>
            {TASK_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="text-xs">
                {statusLabel[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={onDelete} disabled={busy}>
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
          Hapus
        </Button>
        <Button size="sm" variant="ghost" onClick={onClear} disabled={busy}>
          Batal
        </Button>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Kanban: drag-and-drop board across 5 status columns. Cards stay clickable
// to open the edit dialog; drag is delayed by a small distance so a click
// doesn't trigger drag.
// ───────────────────────────────────────────────────────────────────────────

interface KanbanBoardProps {
  byStatus: Record<TaskStatus, TaskRow[]>;
  loading: boolean;
  onView: (id: string) => void;
  onChangeStatus: (id: string, status: TaskStatus) => void;
  onAdd: (status: TaskStatus) => void;
  subtaskCountFor: (id: string) => number;
  parentTitleFor: (parentId: string | null) => string | null;
}

function KanbanBoard({
  byStatus,
  loading,
  onView,
  onChangeStatus,
  onAdd,
  subtaskCountFor,
  parentTitleFor,
}: KanbanBoardProps) {
  // 6px activation distance — below this is treated as a click, above as drag.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = (e: DragEndEvent): void => {
    const taskId = e.active.id as string;
    const overId = e.over?.id as TaskStatus | undefined;
    if (!overId) return;
    // Find the dragged task to compare current vs target status.
    for (const status of TASK_STATUSES) {
      const task = byStatus[status].find((t) => t.id === taskId);
      if (task && task.status !== overId) {
        onChangeStatus(taskId, overId);
        return;
      }
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {TASK_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={byStatus[status]}
            loading={loading}
            onView={onView}
            onChangeStatus={onChangeStatus}
            onAdd={() => onAdd(status)}
            subtaskCountFor={subtaskCountFor}
            parentTitleFor={parentTitleFor}
          />
        ))}
      </div>
    </DndContext>
  );
}

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: TaskRow[];
  loading: boolean;
  onView: (id: string) => void;
  onChangeStatus: (id: string, status: TaskStatus) => void;
  onAdd: () => void;
  subtaskCountFor: (id: string) => number;
  parentTitleFor: (parentId: string | null) => string | null;
}

function KanbanColumn({
  status,
  tasks,
  loading,
  onView,
  onChangeStatus,
  onAdd,
  subtaskCountFor,
  parentTitleFor,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-lg bg-muted/30 min-h-[200px] transition-colors',
        isOver && 'bg-primary/10 ring-2 ring-primary/40',
      )}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide">
            {statusLabel[status]}
          </h3>
          <Badge variant="outline" className="text-[10px] h-5 px-1.5">
            {tasks.length}
          </Badge>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onAdd} title="Tambah">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex-1 space-y-2 p-2 overflow-y-auto max-h-[70vh]">
        {loading && (
          <>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </>
        )}
        {!loading && tasks.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-4">
            Tidak ada task
          </p>
        )}
        {tasks.map((t) => (
          <KanbanCard
            key={t.id}
            task={t}
            onView={onView}
            onChangeStatus={onChangeStatus}
            subtaskCount={subtaskCountFor(t.id)}
            parentTitle={parentTitleFor(t.parentId)}
          />
        ))}
      </div>
    </div>
  );
}

interface KanbanCardProps {
  task: TaskRow;
  onView: (id: string) => void;
  onChangeStatus: (id: string, status: TaskStatus) => void;
  subtaskCount: number;
  parentTitle: string | null;
}

function KanbanCard({ task: t, onView, onChangeStatus, subtaskCount, parentTitle }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: t.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onView(t.id)}
      className={cn(
        'group rounded-md border bg-card p-2.5 cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow',
        'border-l-4',
        priorityColor[t.priority] ?? 'border-l-muted-foreground/30',
        t.status === 'DONE' && 'opacity-60',
        isDragging && 'opacity-50 shadow-lg ring-2 ring-primary/40',
      )}
    >
      {parentTitle && (
        <p className="text-[10px] text-muted-foreground truncate mb-1">↳ {parentTitle}</p>
      )}
      <p
        className={cn(
          'text-sm font-medium leading-snug line-clamp-3 flex items-start gap-1.5',
          t.status === 'DONE' && 'line-through',
        )}
      >
        <span className="flex-1">{t.title}</span>
        {t.recurrence && (
          <Repeat className="h-3 w-3 text-info shrink-0 mt-0.5" aria-label="recurring" />
        )}
      </p>
      <div className="mt-2 flex items-center justify-between gap-1">
        <div className="flex flex-wrap items-center gap-1">
          {t.project && (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              {t.project.color && (
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: t.project.color }}
                />
              )}
              {t.project.name}
            </span>
          )}
          {subtaskCount > 0 && (
            <Badge variant="outline" className="text-[9px] h-4 px-1">
              {subtaskCount} sub
            </Badge>
          )}
        </div>
        {t.dueDate && (
          <span className="text-[10px]">
            <DueBadge iso={t.dueDate} status={t.status} short />
          </span>
        )}
      </div>
      {/* Status select stays as a fallback for keyboard / mobile users.
          stopPropagation prevents the surrounding draggable from intercepting clicks. */}
      <div
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="mt-2"
      >
        <Select value={t.status} onValueChange={(v) => onChangeStatus(t.id, v as TaskStatus)}>
          <SelectTrigger className="h-6 text-[10px] px-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TASK_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="text-xs">
                {statusLabel[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
