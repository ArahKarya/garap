import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useWorkspaceStore } from '@/stores/workspace';

export interface WorkspaceRow {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  isDefault: boolean;
  sortOrder: number;
  archivedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { projects: number };
}

export function useWorkspaces() {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const res = await api.get('/workspaces');
      return res.data.data as WorkspaceRow[];
    },
  });
}

export function useActiveWorkspace() {
  const { activeWorkspaceId, setActiveWorkspaceId } = useWorkspaceStore();
  const { data: workspaces, isLoading } = useWorkspaces();

  useEffect(() => {
    if (!workspaces || workspaces.length === 0) return;
    const exists = workspaces.find((w) => w.id === activeWorkspaceId);
    if (exists) return;
    const fallback = workspaces.find((w) => w.isDefault) ?? workspaces[0];
    if (fallback) setActiveWorkspaceId(fallback.id);
  }, [workspaces, activeWorkspaceId, setActiveWorkspaceId]);

  const active = workspaces?.find((w) => w.id === activeWorkspaceId) ?? null;
  return { active, activeWorkspaceId, workspaces: workspaces ?? [], isLoading };
}
