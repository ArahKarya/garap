import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Loader2, Tag as TagIcon, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import type { TaggableEntity } from '@panggonmikir/shared';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Tag {
  id: string;
  name: string;
  color: string | null;
}

interface TagPickerProps {
  entityType: TaggableEntity;
  entityId: string | null;
}

/**
 * Inline tag picker: shows currently-attached tags + a + button. Opens a
 * popover with all available tags (toggleable) and an inline "create new"
 * input. Attach/detach happens immediately.
 *
 * Requires `entityId` — for create dialogs, render a placeholder while the
 * entity hasn't been saved yet.
 */
export function TagPicker({ entityType, entityId }: TagPickerProps) {
  const qc = useQueryClient();
  const [panelOpen, setPanelOpen] = useState(false);
  const [search, setSearch] = useState('');

  const allTagsQuery = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const res = await api.get('/tags');
      return res.data.data as Tag[];
    },
    enabled: panelOpen && !!entityId, // lazy fetch on first expand
  });

  const attachedQuery = useQuery({
    queryKey: ['tags', 'by-entity', entityType, entityId],
    enabled: !!entityId,
    queryFn: async () => {
      const res = await api.get('/tags/by-entity', {
        params: { entityType, entityId },
      });
      return res.data.data as Tag[];
    },
  });

  const attachedIds = new Set(attachedQuery.data?.map((t) => t.id) ?? []);

  const invalidate = (): void => {
    qc.invalidateQueries({ queryKey: ['tags', 'by-entity', entityType, entityId] });
    qc.invalidateQueries({ queryKey: ['tags'] }); // _count may change
  };

  const attachMutation = useMutation({
    mutationFn: async (tagId: string) => {
      await api.post('/tags/attach', { tagId, entityType, entityId });
    },
    onSuccess: () => {
      invalidate();
      toast.success('Tag dipasang');
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response
              ?.data?.error?.message
          : null;
      toast.error(msg ?? 'Gagal pasang tag');
    },
  });

  const detachMutation = useMutation({
    mutationFn: async (tagId: string) => {
      await api.post('/tags/detach', { tagId, entityType, entityId });
    },
    onSuccess: () => {
      invalidate();
      toast.success('Tag dilepas');
    },
    onError: () => toast.error('Gagal lepas tag'),
  });

  const createAndAttachMutation = useMutation({
    mutationFn: async (name: string) => {
      const created = await api.post('/tags', { name: name.trim(), color: null });
      const tag = created.data.data as Tag;
      await api.post('/tags/attach', { tagId: tag.id, entityType, entityId });
      return tag;
    },
    onSuccess: () => {
      setSearch('');
      invalidate();
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response
              ?.data?.error?.message
          : null;
      toast.error(msg ?? 'Gagal buat tag');
    },
  });

  const filtered = (allTagsQuery.data ?? []).filter((t) =>
    search ? t.name.toLowerCase().includes(search.toLowerCase()) : true,
  );

  const exactMatch =
    search.trim() &&
    (allTagsQuery.data ?? []).some(
      (t) => t.name.toLowerCase() === search.trim().toLowerCase(),
    );

  if (!entityId) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Tag tersedia setelah disimpan.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {attachedQuery.data?.map((t) => (
          <Badge
            key={t.id}
            variant="outline"
            className="text-xs gap-1"
            style={t.color ? { borderColor: t.color, color: t.color } : undefined}
          >
            {t.name}
            <button
              type="button"
              onClick={() => detachMutation.mutate(t.id)}
              disabled={detachMutation.isPending}
              className="ml-0.5 hover:bg-destructive/10 rounded-full"
              title="Lepas tag"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}

        <button
          type="button"
          onClick={() => setPanelOpen((v) => !v)}
          className="inline-flex h-6 items-center gap-1 rounded-md border border-dashed border-input bg-background px-2 text-xs hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Plus className="h-3 w-3" />
          Tag
          <ChevronDown
            className={cn('h-3 w-3 transition-transform', panelOpen && 'rotate-180')}
          />
        </button>
      </div>

      {panelOpen && (
        <div className="rounded-md border bg-popover p-2">
          <Input
            autoFocus
            placeholder="Cari atau buat tag baru..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === 'Enter' &&
                search.trim() &&
                !exactMatch &&
                !createAndAttachMutation.isPending
              ) {
                e.preventDefault();
                createAndAttachMutation.mutate(search.trim());
              }
            }}
            className="h-8 mb-2"
          />
          <ScrollArea className="max-h-48">
            <div className="space-y-0.5">
              {allTagsQuery.isLoading && (
                <div className="flex items-center justify-center py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {!allTagsQuery.isLoading && filtered.length === 0 && !search && (
                <p className="text-xs text-muted-foreground py-2 text-center">
                  Belum ada tag.
                </p>
              )}
              {filtered.map((t) => {
                const isAttached = attachedIds.has(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      if (isAttached) {
                        detachMutation.mutate(t.id);
                      } else {
                        attachMutation.mutate(t.id);
                      }
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent text-left"
                  >
                    <input
                      type="checkbox"
                      checked={isAttached}
                      readOnly
                      className="pointer-events-none"
                    />
                    <TagIcon
                      className="h-3.5 w-3.5"
                      style={t.color ? { color: t.color } : undefined}
                    />
                    <span className="flex-1 truncate">{t.name}</span>
                  </button>
                );
              })}
              {search.trim() && !exactMatch && (
                <button
                  type="button"
                  onClick={() => {
                    if (!createAndAttachMutation.isPending) {
                      createAndAttachMutation.mutate(search.trim());
                    }
                  }}
                  disabled={createAndAttachMutation.isPending}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent text-left text-primary"
                >
                  {createAndAttachMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  Buat tag "{search.trim()}"
                </button>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
