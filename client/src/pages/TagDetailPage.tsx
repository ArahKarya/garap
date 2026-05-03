import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckSquare,
  FolderKanban,
  Link as LinkIcon,
  StickyNote,
  FileBox,
  ExternalLink,
  Tag as TagIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useActiveWorkspace } from '@/hooks/useWorkspaces';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';

interface TagEntitiesResponse {
  tag: { id: string; name: string; color: string | null };
  counts: Record<string, number>;
  items: {
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
  };
}

export function TagDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { activeWorkspaceId } = useActiveWorkspace();

  const { data, isLoading } = useQuery({
    queryKey: ['tag', id, 'entities', activeWorkspaceId],
    enabled: !!id && !!activeWorkspaceId,
    queryFn: async () => {
      const res = await api.get(`/tags/${id}/entities`, {
        params: activeWorkspaceId ? { workspaceId: activeWorkspaceId } : {},
      });
      return res.data.data as TagEntitiesResponse;
    },
  });

  const total =
    (data?.counts.tasks ?? 0) +
    (data?.counts.projects ?? 0) +
    (data?.counts.links ?? 0) +
    (data?.counts.notes ?? 0) +
    (data?.counts.documents ?? 0);

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate('/tags')}>
        <ArrowLeft className="h-4 w-4" /> Kembali ke Tags
      </Button>

      <PageHeader
        icon={TagIcon}
        title={data?.tag?.name ?? 'Tag'}
        subtitle={
          isLoading
            ? 'Memuat...'
            : `${total} item bertanda tag ini${activeWorkspaceId ? ' di workspace aktif' : ''}.`
        }
        action={
          data?.tag ? (
            <Badge
              variant="secondary"
              className="text-sm px-3 py-1"
              style={
                data.tag.color
                  ? { backgroundColor: `${data.tag.color}20`, color: data.tag.color }
                  : undefined
              }
            >
              {data.tag.name}
            </Badge>
          ) : null
        }
      />

      {isLoading && <Skeleton className="h-40 w-full" />}

      {!isLoading && total === 0 && (
        <EmptyState
          title="Belum ada item dengan tag ini"
          description="Buka entity (task/project/link/note/document) lalu pasangkan tag dari panel TagPicker."
        />
      )}

      {!isLoading && data && (
        <>
          {data.items.tasks.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <CheckSquare className="h-4 w-4" />
                  Tasks ({data.counts.tasks})
                </h3>
                <div className="divide-y">
                  {data.items.tasks.map((t) => (
                    <RouterLink
                      key={t.id}
                      to={`/tasks?id=${t.id}`}
                      className="block py-2 hover:bg-muted/40 rounded px-2 -mx-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{t.title}</span>
                        <div className="flex gap-2 shrink-0">
                          <Badge variant="outline" className="text-xs">{t.status}</Badge>
                          <Badge variant="secondary" className="text-xs">{t.priority}</Badge>
                        </div>
                      </div>
                    </RouterLink>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {data.items.projects.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <FolderKanban className="h-4 w-4" />
                  Projects ({data.counts.projects})
                </h3>
                <div className="divide-y">
                  {data.items.projects.map((p) => (
                    <RouterLink
                      key={p.id}
                      to={`/projects/${p.id}`}
                      className="block py-2 hover:bg-muted/40 rounded px-2 -mx-2"
                    >
                      <div className="flex items-center gap-2">
                        {p.color && (
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: p.color }}
                          />
                        )}
                        <span className="font-medium flex-1">{p.name}</span>
                        <Badge variant="outline" className="text-xs">{p.status}</Badge>
                      </div>
                    </RouterLink>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {data.items.links.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <LinkIcon className="h-4 w-4" />
                  Links ({data.counts.links})
                </h3>
                <div className="divide-y">
                  {data.items.links.map((l) => (
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
                </div>
              </CardContent>
            </Card>
          )}

          {data.items.notes.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <StickyNote className="h-4 w-4" />
                  Notes ({data.counts.notes})
                </h3>
                <div className="divide-y">
                  {data.items.notes.map((n) => (
                    <RouterLink
                      key={n.id}
                      to={`/notes?id=${n.id}`}
                      className="block py-2 hover:bg-muted/40 rounded px-2 -mx-2"
                    >
                      <span className="font-medium">{n.title}</span>
                      {n.pinned && (
                        <Badge variant="secondary" className="text-xs ml-2">📌</Badge>
                      )}
                    </RouterLink>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {data.items.documents.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <FileBox className="h-4 w-4" />
                  Documents ({data.counts.documents})
                </h3>
                <div className="divide-y">
                  {data.items.documents.map((d) => (
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
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
