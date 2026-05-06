import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createWorkspaceSchema,
  type CreateWorkspaceInput,
} from '@panggonmikir/shared';
import {
  Briefcase,
  Check,
  ChevronsUpDown,
  Plus,
  Loader2,
  Settings as SettingsIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useActiveWorkspace } from '@/hooks/useWorkspaces';
import { useWorkspaceStore } from '@/stores/workspace';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

interface WorkspaceSwitcherProps {
  collapsed?: boolean;
}

export function WorkspaceSwitcher({ collapsed }: WorkspaceSwitcherProps) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { active, workspaces, isLoading } = useActiveWorkspace();
  const setActiveWorkspaceId = useWorkspaceStore((s) => s.setActiveWorkspaceId);
  const [createOpen, setCreateOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateWorkspaceInput>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: { name: '', color: '#2563ab' },
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateWorkspaceInput) => {
      const res = await api.post('/workspaces', input);
      return res.data.data as { id: string };
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['workspaces'] });
      setActiveWorkspaceId(created.id);
      toast.success('Workspace dibuat');
      reset();
      setCreateOpen(false);
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error && 'response' in err
          ? // @ts-expect-error axios error shape
            err.response?.data?.error?.message
          : null;
      toast.error(msg ?? 'Gagal membuat workspace');
    },
  });

  const initial = (active?.name ?? 'P').charAt(0).toUpperCase();
  const accentStyle = active?.color
    ? { backgroundColor: active.color }
    : undefined;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
              collapsed && 'justify-center px-2',
            )}
            aria-label="Switch workspace"
          >
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[11px] font-bold text-white"
              style={accentStyle ?? { backgroundColor: '#475569' }}
            >
              {isLoading ? '…' : initial}
            </span>
            {!collapsed && (
              <>
                <span className="flex-1 truncate text-left text-sm font-medium">
                  {active?.name ?? 'Pilih workspace'}
                </span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuLabel className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Workspaces
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {workspaces.length === 0 && (
            <DropdownMenuItem disabled>Tidak ada workspace</DropdownMenuItem>
          )}
          {workspaces.map((w) => (
            <DropdownMenuItem
              key={w.id}
              onClick={() => {
                if (w.id === active?.id) return;
                setActiveWorkspaceId(w.id);
                // Safety net: every list page bakes activeWorkspaceId into
                // its queryKey, but invalidate-all guarantees no stale
                // cross-workspace data flashes during the swap.
                qc.invalidateQueries();
              }}
              className="flex items-center gap-2"
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white"
                style={{ backgroundColor: w.color ?? '#475569' }}
              >
                {w.name.charAt(0).toUpperCase()}
              </span>
              <span className="flex-1 truncate">{w.name}</span>
              {w.id === active?.id && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Workspace baru
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/workspaces')}>
            <SettingsIcon className="h-4 w-4" />
            Kelola workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buat workspace baru</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit((data) => createMutation.mutate(data))}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="name">Nama</Label>
              <Input id="name" placeholder="cth. PT Maju Sentosa" {...register('name')} />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi (opsional)</Label>
              <Textarea
                id="description"
                placeholder="Konteks workspace ini…"
                {...register('description')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Warna (hex)</Label>
              <Input id="color" type="color" {...register('color')} className="h-10 w-20 p-1" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
