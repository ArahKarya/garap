import { useEffect, useState } from 'react';
import { useSearchParams, Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search as SearchIcon,
  CheckSquare,
  FolderKanban,
  Link as LinkIcon,
  StickyNote,
  FileBox,
  Tag as TagIcon,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useActiveWorkspace } from '@/hooks/useWorkspaces';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/empty-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  totals: Record<string, number>;
}

type EntityKind = 'all' | 'tasks' | 'projects' | 'links' | 'notes' | 'documents' | 'tags';

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const initialQ = params.get('q') ?? '';
  const [query, setQuery] = useState(initialQ);
  const [debounced, setDebounced] = useState(initialQ);
  const [tab, setTab] = useState<EntityKind>('all');
  const { activeWorkspaceId } = useActiveWorkspace();

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(query.trim());
      if (query.trim()) {
        setParams({ q: query.trim() }, { replace: true });
      } else {
        setParams({}, { replace: true });
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, setParams]);

  const { data, isLoading } = useQuery({
    queryKey: ['search', debounced, activeWorkspaceId],
    enabled: debounced.length > 0 && !!activeWorkspaceId,
    queryFn: async () => {
      const res = await api.get('/search', {
        params: {
          q: debounced,
          limit: 20,
          ...(activeWorkspaceId ? { workspaceId: activeWorkspaceId } : {}),
        },
      });
      return res.data.data as SearchResults;
    },
  });

  const r = data?.results;
  const totals = data?.totals ?? {};
  const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pencarian"
        subtitle="Cari di semua tasks, projects, links, notes, documents, dan tags."
      />

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ketik untuk mulai mencari…"
              className="pl-9 text-base"
            />
            {isLoading && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
        </CardContent>
      </Card>

      {!debounced && (
        <EmptyState
          title="Mulai ketik di kotak di atas"
          description="Pencarian otomatis berjalan saat kamu mengetik. Hasilnya difilter ke workspace aktif."
        />
      )}

      {debounced && !isLoading && grandTotal === 0 && (
        <EmptyState
          title={`Tidak ada hasil untuk "${debounced}"`}
          description="Coba kata kunci lain atau ganti workspace."
        />
      )}

      {debounced && r && grandTotal > 0 && (
        <Tabs value={tab} onValueChange={(v) => setTab(v as EntityKind)}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="all">Semua ({grandTotal})</TabsTrigger>
            <TabsTrigger value="tasks">Tasks ({totals.tasks ?? 0})</TabsTrigger>
            <TabsTrigger value="projects">Projects ({totals.projects ?? 0})</TabsTrigger>
            <TabsTrigger value="links">Links ({totals.links ?? 0})</TabsTrigger>
            <TabsTrigger value="notes">Notes ({totals.notes ?? 0})</TabsTrigger>
            <TabsTrigger value="documents">Documents ({totals.documents ?? 0})</TabsTrigger>
            <TabsTrigger value="tags">Tags ({totals.tags ?? 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {r.tasks.length > 0 && <TasksGroup items={r.tasks} />}
            {r.projects.length > 0 && <ProjectsGroup items={r.projects} />}
            {r.links.length > 0 && <LinksGroup items={r.links} />}
            {r.notes.length > 0 && <NotesGroup items={r.notes} />}
            {r.documents.length > 0 && <DocumentsGroup items={r.documents} />}
            {r.tags.length > 0 && <TagsGroup items={r.tags} />}
          </TabsContent>
          <TabsContent value="tasks">
            <TasksGroup items={r.tasks} />
          </TabsContent>
          <TabsContent value="projects">
            <ProjectsGroup items={r.projects} />
          </TabsContent>
          <TabsContent value="links">
            <LinksGroup items={r.links} />
          </TabsContent>
          <TabsContent value="notes">
            <NotesGroup items={r.notes} />
          </TabsContent>
          <TabsContent value="documents">
            <DocumentsGroup items={r.documents} />
          </TabsContent>
          <TabsContent value="tags">
            <TagsGroup items={r.tags} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

interface SectionProps {
  title: string;
  icon: typeof CheckSquare;
  count: number;
  children: React.ReactNode;
}

function Section({ title, icon: Icon, count, children }: SectionProps) {
  if (count === 0) return null;
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Icon className="h-4 w-4" />
          {title} <span className="text-xs font-normal">({count})</span>
        </h3>
        <div className="divide-y">{children}</div>
      </CardContent>
    </Card>
  );
}

function TasksGroup({ items }: { items: SearchResults['results']['tasks'] }) {
  return (
    <Section title="Tasks" icon={CheckSquare} count={items.length}>
      {items.map((t) => (
        <RouterLink
          key={t.id}
          to={`/tasks?id=${t.id}`}
          className="block py-2 hover:bg-muted/40 rounded px-2 -mx-2"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">{t.title}</span>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="text-xs">
                {t.status}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {t.priority}
              </Badge>
            </div>
          </div>
        </RouterLink>
      ))}
    </Section>
  );
}

function ProjectsGroup({ items }: { items: SearchResults['results']['projects'] }) {
  return (
    <Section title="Projects" icon={FolderKanban} count={items.length}>
      {items.map((p) => (
        <RouterLink
          key={p.id}
          to={`/projects/${p.id}`}
          className="block py-2 hover:bg-muted/40 rounded px-2 -mx-2"
        >
          <div className="flex items-center gap-2">
            {p.color && (
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: p.color }}
              />
            )}
            <span className="font-medium flex-1">{p.name}</span>
            <Badge variant="outline" className="text-xs">{p.status}</Badge>
          </div>
        </RouterLink>
      ))}
    </Section>
  );
}

function LinksGroup({ items }: { items: SearchResults['results']['links'] }) {
  return (
    <Section title="Links" icon={LinkIcon} count={items.length}>
      {items.map((l) => (
        <a
          key={l.id}
          href={l.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block py-2 hover:bg-muted/40 rounded px-2 -mx-2"
        >
          <div className="flex items-center gap-2">
            {l.faviconUrl ? (
              <img src={l.faviconUrl} alt="" className="h-4 w-4 shrink-0" />
            ) : (
              <LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{l.title}</div>
              <div className="text-xs text-muted-foreground truncate">{l.url}</div>
            </div>
            <Badge variant="outline" className="text-xs">{l.platform}</Badge>
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </div>
        </a>
      ))}
    </Section>
  );
}

function NotesGroup({ items }: { items: SearchResults['results']['notes'] }) {
  return (
    <Section title="Notes" icon={StickyNote} count={items.length}>
      {items.map((n) => (
        <RouterLink
          key={n.id}
          to={`/notes?id=${n.id}`}
          className="block py-2 hover:bg-muted/40 rounded px-2 -mx-2"
        >
          <span className="font-medium">{n.title}</span>
          {n.pinned && (
            <Badge variant="secondary" className="text-xs ml-2">📌 Pinned</Badge>
          )}
        </RouterLink>
      ))}
    </Section>
  );
}

function DocumentsGroup({ items }: { items: SearchResults['results']['documents'] }) {
  return (
    <Section title="Documents" icon={FileBox} count={items.length}>
      {items.map((d) => (
        <RouterLink
          key={d.id}
          to="/documents"
          className="block py-2 hover:bg-muted/40 rounded px-2 -mx-2"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium flex-1">{d.title}</span>
            <Badge variant="outline" className="text-xs">
              {d.fileUploadId ? 'Upload' : d.externalUrl ? 'External' : '?'}
            </Badge>
          </div>
        </RouterLink>
      ))}
    </Section>
  );
}

function TagsGroup({ items }: { items: SearchResults['results']['tags'] }) {
  return (
    <Section title="Tags" icon={TagIcon} count={items.length}>
      {items.map((t) => (
        <RouterLink
          key={t.id}
          to={`/tags/${t.id}`}
          className="block py-2 hover:bg-muted/40 rounded px-2 -mx-2"
        >
          <Badge
            variant="secondary"
            style={t.color ? { backgroundColor: `${t.color}20`, color: t.color } : undefined}
          >
            {t.name}
          </Badge>
        </RouterLink>
      ))}
    </Section>
  );
}
