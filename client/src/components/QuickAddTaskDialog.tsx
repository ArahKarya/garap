import { useEffect, useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createTaskSchema,
  type CreateTaskInput,
  TASK_PRIORITIES,
} from '@panggonmikir/shared';
import { Loader2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useActiveWorkspace } from '@/hooks/useWorkspaces';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface QuickAddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Global "create task quickly" dialog reachable from anywhere via
 * Cmd/Ctrl+Shift+A. Minimal fields (title, priority, optional project) —
 * user goes to /tasks for everything else.
 */
export function QuickAddTaskDialog({ open, onOpenChange }: QuickAddTaskDialogProps) {
  const qc = useQueryClient();
  const { activeWorkspaceId } = useActiveWorkspace();

  const projectsQuery = useQuery({
    queryKey: ['projects', 'select', activeWorkspaceId],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: 100 };
      if (activeWorkspaceId) params.workspaceId = activeWorkspaceId;
      const res = await api.get('/projects', { params });
      return res.data.data as Array<{ id: string; name: string }>;
    },
    enabled: open && !!activeWorkspaceId,
  });

  const {
    register,
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

  // Reset whenever the dialog opens.
  useEffect(() => {
    if (open) {
      reset({
        workspaceId: activeWorkspaceId ?? '',
        title: '',
        status: 'TODO',
        priority: 'MEDIUM',
      });
    }
  }, [open, reset, activeWorkspaceId]);

  const createMutation = useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const res = await api.post('/tasks', {
        ...input,
        workspaceId: input.workspaceId || activeWorkspaceId || '',
        projectId: input.projectId || null,
      });
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Task dibuat');
      onOpenChange(false);
    },
    onError: () => toast.error('Gagal membuat task'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-warning" />
            Quick Add Task
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quick-title">Judul</Label>
            <Input
              id="quick-title"
              autoFocus
              placeholder="Apa yang harus dikerjakan?"
              {...register('title')}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
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
            <div className="space-y-2">
              <Label htmlFor="quick-due">Tenggat (opsional)</Label>
              <Input
                id="quick-due"
                type="date"
                onChange={(e) =>
                  setValue('dueDate', e.target.value ? new Date(e.target.value) : null)
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Project (opsional)</Label>
            <Select
              value={watch('projectId') ?? 'none'}
              onValueChange={(v) => setValue('projectId', v === 'none' ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tanpa project" />
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

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
              {(isSubmitting || createMutation.isPending) && (
                <Loader2 className="animate-spin" />
              )}
              Tambah
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Cmd/Ctrl+Shift+A → open the dialog. */
export function useQuickAddShortcut(setOpen: (open: boolean) => void): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      // Skip if user is mid-typing in an input / textarea (avoid clobber).
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [setOpen]);
}
