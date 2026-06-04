import { useQuery } from '@tanstack/react-query';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckSquare,
  CheckCircle2,
  Link as LinkIcon,
  StickyNote,
  FileBox,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import type { ProjectStatus, TaskStatus } from '@garap/shared';
import { api } from '@/lib/api';
import {
  AddTaskDialog,
  AddLinkDialog,
  AddNoteDialog,
  AddDocumentDialog,
} from '@/components/project/ProjectAddDialogs';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ProjectDetail {
  id: string;
  name: string;
  workspaceId: string;
  description: string | null;
  status: ProjectStatus;
  color: string | null;
  startDate: string | null;
  dueDate: string | null;
  milestones: Array<{
    id: string;
    name: string;
    dueDate: string | null;
    completedAt: string | null;
  }>;
  _count?: { tasks: number; links: number };
}

interface TaskItem {
  id: string;
  title: string;
  status: TaskStatus;
  priority: string;
  dueDate: string | null;
}

interface LinkItem {
  id: string;
  title: string;
  url: string;
  platform: string;
  faviconUrl: string | null;
}

interface NoteItem {
  id: string;
  title: string;
  pinned: boolean;
  updatedAt: string;
}

interface DocumentItem {
  id: string;
  title: string;
  externalUrl: string | null;
  fileUploadId: string | null;
}

function priorityVariant(p: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (p === 'URGENT') return 'destructive';
  if (p === 'HIGH') return 'default';
  if (p === 'MEDIUM') return 'secondary';
  return 'outline';
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const projectQuery = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const res = await api.get(`/projects/${id}`);
      return res.data.data as ProjectDetail;
    },
    enabled: !!id,
  });

  // Children fetched in parallel — each scoped by projectId.
  const tasksQuery = useQuery({
    queryKey: ['project-tasks', id],
    queryFn: async () => {
      const res = await api.get('/tasks', {
        params: { projectId: id, includeCompleted: true, limit: 100 },
      });
      return res.data.data as TaskItem[];
    },
    enabled: !!id,
  });

  const linksQuery = useQuery({
    queryKey: ['project-links', id],
    queryFn: async () => {
      const res = await api.get('/links', { params: { projectId: id, limit: 100 } });
      return res.data.data as LinkItem[];
    },
    enabled: !!id,
  });

  const notesQuery = useQuery({
    queryKey: ['project-notes', id],
    queryFn: async () => {
      const res = await api.get('/notes', { params: { projectId: id, limit: 100 } });
      return res.data.data as NoteItem[];
    },
    enabled: !!id,
  });

  const documentsQuery = useQuery({
    queryKey: ['project-documents', id],
    queryFn: async () => {
      const res = await api.get('/documents', { params: { projectId: id, limit: 100 } });
      return res.data.data as DocumentItem[];
    },
    enabled: !!id,
  });

  if (projectQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (projectQuery.isError || !projectQuery.data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Button>
        <EmptyState description="Project tidak ditemukan." />
      </div>
    );
  }

  const project = projectQuery.data;
  const allTasks = tasksQuery.data ?? [];
  const activeTasks = allTasks.filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED');
  const doneTasksList = allTasks.filter((t) => t.status === 'DONE' || t.status === 'CANCELLED');
  const totalTasks = allTasks.length;
  const doneTasks = doneTasksList.length;

  return (
    <div className="space-y-4">
      <PageHeader
        title={project.name}
        subtitle={project.description ?? undefined}
        action={
          <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Projects
          </Button>
        }
      />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          {project.color && (
            <span
              className="inline-block h-6 w-6 rounded-full"
              style={{ backgroundColor: project.color }}
            />
          )}
          <Badge variant="outline">{project.status}</Badge>
          {project.startDate && (
            <span className="text-xs text-muted-foreground">
              Mulai: {new Date(project.startDate).toLocaleDateString('id-ID')}
            </span>
          )}
          {project.dueDate && (
            <span className="text-xs text-muted-foreground">
              Tenggat: {new Date(project.dueDate).toLocaleDateString('id-ID')}
            </span>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {doneTasks}/{totalTasks} task selesai
          </span>
        </CardContent>
      </Card>

      {project.milestones && project.milestones.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Milestones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {project.milestones.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
              >
                <span className={m.completedAt ? 'line-through text-muted-foreground' : ''}>
                  {m.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {m.dueDate ? new Date(m.dueDate).toLocaleDateString('id-ID') : '—'}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks">
            <CheckSquare className="h-3.5 w-3.5" />
            Tasks ({activeTasks.length})
          </TabsTrigger>
          <TabsTrigger value="tasks-done">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Selesai ({doneTasks})
          </TabsTrigger>
          <TabsTrigger value="links">
            <LinkIcon className="h-3.5 w-3.5" />
            Links ({linksQuery.data?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="notes">
            <StickyNote className="h-3.5 w-3.5" />
            Notes ({notesQuery.data?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileBox className="h-3.5 w-3.5" />
            Documents ({documentsQuery.data?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-2">
          {projectQuery.data && (
            <div className="flex justify-end">
              <AddTaskDialog
                workspaceId={projectQuery.data.workspaceId}
                projectId={projectQuery.data.id}
              />
            </div>
          )}
          {tasksQuery.isLoading && <Skeleton className="h-12 w-full" />}
          {!tasksQuery.isLoading && activeTasks.length === 0 && (
            <EmptyState description="Belum ada task aktif di project ini." />
          )}
          {activeTasks.map((t) => (
            <RouterLink
              key={t.id}
              to={`/tasks?id=${t.id}`}
              className="flex items-center justify-between gap-2 rounded-md border p-3 hover:bg-accent transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{t.title}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="text-xs">
                  {t.status}
                </Badge>
                <Badge variant={priorityVariant(t.priority)} className="text-xs">
                  {t.priority}
                </Badge>
                {t.dueDate && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(t.dueDate).toLocaleDateString('id-ID')}
                  </span>
                )}
              </div>
            </RouterLink>
          ))}
        </TabsContent>

        <TabsContent value="tasks-done" className="space-y-2">
          {tasksQuery.isLoading && <Skeleton className="h-12 w-full" />}
          {!tasksQuery.isLoading && doneTasksList.length === 0 && (
            <EmptyState description="Belum ada task yang selesai. Tandai task sebagai selesai untuk muncul di sini." />
          )}
          {doneTasksList.map((t) => (
            <RouterLink
              key={t.id}
              to={`/tasks?id=${t.id}`}
              className="flex items-center justify-between gap-2 rounded-md border p-3 hover:bg-accent transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate text-muted-foreground">
                  {t.title}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="secondary" className="text-xs">
                  {t.status}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {t.priority}
                </Badge>
                {t.dueDate && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(t.dueDate).toLocaleDateString('id-ID')}
                  </span>
                )}
              </div>
            </RouterLink>
          ))}
        </TabsContent>

        <TabsContent value="links" className="space-y-2">
          {projectQuery.data && (
            <div className="flex justify-end">
              <AddLinkDialog
                workspaceId={projectQuery.data.workspaceId}
                projectId={projectQuery.data.id}
              />
            </div>
          )}
          {linksQuery.isLoading && <Skeleton className="h-12 w-full" />}
          {!linksQuery.isLoading && (!linksQuery.data || linksQuery.data.length === 0) && (
            <EmptyState description="Belum ada link di project ini." />
          )}
          {linksQuery.data?.map((l) => (
            <a
              key={l.id}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-md border p-3 hover:bg-accent transition-colors"
            >
              {l.faviconUrl ? (
                <img src={l.faviconUrl} alt="" className="h-5 w-5 shrink-0 rounded" />
              ) : (
                <LinkIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{l.title}</p>
                <p className="text-xs text-muted-foreground truncate">{l.url}</p>
              </div>
              <Badge variant="outline" className="text-xs shrink-0">
                {l.platform}
              </Badge>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </a>
          ))}
        </TabsContent>

        <TabsContent value="notes" className="space-y-2">
          {projectQuery.data && (
            <div className="flex justify-end">
              <AddNoteDialog
                workspaceId={projectQuery.data.workspaceId}
                projectId={projectQuery.data.id}
              />
            </div>
          )}
          {notesQuery.isLoading && <Skeleton className="h-12 w-full" />}
          {!notesQuery.isLoading && (!notesQuery.data || notesQuery.data.length === 0) && (
            <EmptyState description="Belum ada note di project ini." />
          )}
          {notesQuery.data?.map((n) => (
            <RouterLink
              key={n.id}
              to="/notes"
              className="flex items-center justify-between gap-2 rounded-md border p-3 hover:bg-accent transition-colors"
            >
              <div className="min-w-0 flex-1 flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium truncate">{n.title}</p>
                {n.pinned && <span className="text-xs">📌</span>}
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {new Date(n.updatedAt).toLocaleDateString('id-ID')}
              </span>
            </RouterLink>
          ))}
        </TabsContent>

        <TabsContent value="documents" className="space-y-2">
          {projectQuery.data && (
            <div className="flex justify-end">
              <AddDocumentDialog
                workspaceId={projectQuery.data.workspaceId}
                projectId={projectQuery.data.id}
              />
            </div>
          )}
          {documentsQuery.isLoading && <Skeleton className="h-12 w-full" />}
          {!documentsQuery.isLoading &&
            (!documentsQuery.data || documentsQuery.data.length === 0) && (
              <EmptyState description="Belum ada document di project ini." />
            )}
          {documentsQuery.data?.map((d) => (
            <RouterLink
              key={d.id}
              to="/documents"
              className="flex items-center justify-between gap-2 rounded-md border p-3 hover:bg-accent transition-colors"
            >
              <div className="min-w-0 flex-1 flex items-center gap-2">
                <FileBox className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium truncate">{d.title}</p>
              </div>
              <Badge variant="outline" className="text-xs shrink-0">
                {d.fileUploadId ? 'UPLOAD' : 'EXTERNAL'}
              </Badge>
            </RouterLink>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Suppress unused warning when referenced only inside JSX expressions.
void Loader2;
