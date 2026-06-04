import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase();
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  roles: string[];
  lastLoginAt: string | null;
  createdAt: string;
}

export function UsersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async (): Promise<UserRow[]> => {
      const res = await api.get<{ data: UserRow[] }>('/users', {
        params: { page: 1, limit: 50 },
      });
      return res.data.data;
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1>Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">Kelola user dan role</p>
        </div>
        <Button>
          <Plus />
          Tambah User
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Cari nama atau email..." className="pl-9" />
      </div>

      <Card className="overflow-hidden p-0">
        {isLoading && (
          <div className="divide-y">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && (!data || data.length === 0) && (
          <EmptyState
            icon={Users}
            title="Belum ada pengguna"
            description="Pengguna yang ditambahkan akan tampil di sini."
          />
        )}

        {!isLoading && data && data.length > 0 && (
          <div className="divide-y">
            {data.map((u) => (
              <div
                key={u.id}
                className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {getInitials(u.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{u.name}</span>
                    {u.roles.map((r) => (
                      <Badge key={r} variant="outline" className="text-[10px]">
                        {r}
                      </Badge>
                    ))}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                </div>
                <Badge
                  variant={u.isActive ? 'success' : 'outline'}
                  className="shrink-0 text-[10px]"
                >
                  {u.isActive ? 'Aktif' : 'Non-aktif'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
