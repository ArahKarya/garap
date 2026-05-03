import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import {
  CheckSquare,
  FolderKanban,
  Link as LinkIcon,
  Tag as TagIcon,
  Search as SearchIcon,
  Loader2,
  StickyNote,
  FileBox,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useActiveWorkspace } from '@/hooks/useWorkspaces';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface SearchResults {
  query: string;
  results: {
    tasks: Array<{ id: string; title: string; status: string; priority: string }>;
    projects: Array<{ id: string; name: string; status: string; color: string | null }>;
    links: Array<{
      id: string;
      title: string;
      url: string;
      platform: string;
      faviconUrl: string | null;
    }>;
    notes: Array<{ id: string; title: string; pinned: boolean }>;
    documents: Array<{
      id: string;
      title: string;
      externalUrl: string | null;
      fileUploadId: string | null;
    }>;
    tags: Array<{ id: string; name: string; color: string | null }>;
  };
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { activeWorkspaceId } = useActiveWorkspace();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [results, setResults] = useState<SearchResults['results'] | null>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Debounce the query input.
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(query.trim()), 200);
    return () => clearTimeout(handle);
  }, [query]);

  // Run search whenever debounced query changes.
  useEffect(() => {
    if (debounced.length < 1) {
      setResults(null);
      setLoading(false);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    api
      .get<{ data: SearchResults }>('/search', {
        params: {
          q: debounced,
          limit: 6,
          ...(activeWorkspaceId ? { workspaceId: activeWorkspaceId } : {}),
        },
        signal: controller.signal,
      })
      .then((res) => {
        if (!controller.signal.aborted) {
          setResults(res.data.data.results);
        }
      })
      .catch((err: unknown) => {
        if (
          err &&
          typeof err === 'object' &&
          'code' in err &&
          (err as { code?: string }).code === 'ERR_CANCELED'
        ) {
          return;
        }
        setResults(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [debounced, activeWorkspaceId]);

  // Reset state on close.
  useEffect(() => {
    if (!open) {
      setQuery('');
      setDebounced('');
      setResults(null);
    }
  }, [open]);

  const go = (path: string): void => {
    navigate(path);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">Cari</DialogTitle>
        <Command shouldFilter={false} className="bg-popover text-popover-foreground">
          <div className="flex items-center border-b px-3">
            <SearchIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <Command.Input
              autoFocus
              placeholder="Cari task, project, link, note, document, tag..."
              value={query}
              onValueChange={setQuery}
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
            {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin text-muted-foreground" />}
          </div>

          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            {!debounced && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Mulai mengetik untuk mencari...
              </p>
            )}

            {debounced && !loading && results && (
              <Command.Empty
                className={cn(
                  'px-3 py-6 text-center text-sm text-muted-foreground',
                  (results.tasks.length ||
                    results.projects.length ||
                    results.links.length ||
                    results.notes.length ||
                    results.documents.length ||
                    results.tags.length) &&
                    'hidden',
                )}
              >
                Tidak ada hasil untuk "{debounced}"
              </Command.Empty>
            )}

            {results && results.tasks.length > 0 && (
              <Command.Group
                heading="Tasks"
                className="text-xs font-semibold text-muted-foreground px-2 pb-1 pt-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
              >
                {results.tasks.map((t) => (
                  <Command.Item
                    key={t.id}
                    value={`task-${t.id}`}
                    onSelect={() => go('/tasks')}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <CheckSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{t.title}</span>
                    <span className="text-xs text-muted-foreground">{t.priority}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {results && results.projects.length > 0 && (
              <Command.Group
                heading="Projects"
                className="text-xs font-semibold text-muted-foreground px-2 pb-1 pt-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
              >
                {results.projects.map((p) => (
                  <Command.Item
                    key={p.id}
                    value={`project-${p.id}`}
                    onSelect={() => go('/projects')}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    {p.color ? (
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: p.color }}
                      />
                    ) : (
                      <FolderKanban className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="text-xs text-muted-foreground">{p.status}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {results && results.links.length > 0 && (
              <Command.Group
                heading="Links"
                className="text-xs font-semibold text-muted-foreground px-2 pb-1 pt-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
              >
                {results.links.map((l) => (
                  <Command.Item
                    key={l.id}
                    value={`link-${l.id}`}
                    onSelect={() => go('/links')}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    {l.faviconUrl ? (
                      <img src={l.faviconUrl} alt="" className="h-4 w-4 rounded" />
                    ) : (
                      <LinkIcon className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="flex-1 truncate">{l.title}</span>
                    <span className="text-xs text-muted-foreground">{l.platform}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {results && results.notes.length > 0 && (
              <Command.Group
                heading="Notes"
                className="text-xs font-semibold text-muted-foreground px-2 pb-1 pt-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
              >
                {results.notes.map((n) => (
                  <Command.Item
                    key={n.id}
                    value={`note-${n.id}`}
                    onSelect={() => go('/notes')}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <StickyNote className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{n.title}</span>
                    {n.pinned && <span className="text-xs">📌</span>}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {results && results.documents.length > 0 && (
              <Command.Group
                heading="Documents"
                className="text-xs font-semibold text-muted-foreground px-2 pb-1 pt-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
              >
                {results.documents.map((d) => (
                  <Command.Item
                    key={d.id}
                    value={`document-${d.id}`}
                    onSelect={() => go('/documents')}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <FileBox className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{d.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {d.fileUploadId ? 'UPLOAD' : 'EXTERNAL'}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {results && results.tags.length > 0 && (
              <Command.Group
                heading="Tags"
                className="text-xs font-semibold text-muted-foreground px-2 pb-1 pt-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
              >
                {results.tags.map((t) => (
                  <Command.Item
                    key={t.id}
                    value={`tag-${t.id}`}
                    onSelect={() => go(`/tags/${t.id}`)}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <TagIcon
                      className="h-4 w-4"
                      style={t.color ? { color: t.color } : undefined}
                    />
                    <span className="flex-1 truncate">{t.name}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>

          <div className="border-t px-3 py-2 text-xs text-muted-foreground">
            <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px]">↑↓</kbd> navigasi ·{' '}
            <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px]">Enter</kbd> buka ·{' '}
            <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px]">Esc</kbd> tutup
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

/** Hook that wires the global Cmd/Ctrl+K shortcut to open the palette. */
export function useCommandPaletteShortcut(setOpen: (open: boolean) => void): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [setOpen]);
}
