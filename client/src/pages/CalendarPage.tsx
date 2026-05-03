import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { api } from '@/lib/api';
import { useActiveWorkspace } from '@/hooks/useWorkspaces';
import { PageHeader } from '@/components/shared/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface CalendarTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string;
  project: { id: string; name: string; color: string | null } | null;
}

const priorityColor: Record<string, string> = {
  LOW: 'bg-muted text-muted-foreground',
  MEDIUM: 'bg-info/15 text-info',
  HIGH: 'bg-warning/15 text-warning',
  URGENT: 'bg-destructive/15 text-destructive',
};

const WEEKDAYS_ID = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

export function CalendarPage() {
  const [cursor, setCursor] = useState(() => new Date());

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  // Monday-first week (ISO).
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const { activeWorkspaceId } = useActiveWorkspace();

  const tasksQuery = useQuery({
    queryKey: ['calendar', 'tasks', format(cursor, 'yyyy-MM'), activeWorkspaceId],
    enabled: !!activeWorkspaceId,
    queryFn: async () => {
      const params: Record<string, string | number | boolean> = {
        limit: 200,
        dueAfter: gridStart.toISOString(),
        dueBefore: gridEnd.toISOString(),
        includeCompleted: true,
      };
      if (activeWorkspaceId) params.workspaceId = activeWorkspaceId;
      const res = await api.get('/tasks', { params });
      return (res.data.data as CalendarTask[]).filter((t) => t.dueDate);
    },
  });

  const days = useMemo(
    () => eachDayOfInterval({ start: gridStart, end: gridEnd }),
    [gridStart, gridEnd],
  );

  const tasksByDay = useMemo(() => {
    const map = new Map<string, CalendarTask[]>();
    if (!tasksQuery.data) return map;
    for (const t of tasksQuery.data) {
      const key = format(parseISO(t.dueDate), 'yyyy-MM-dd');
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    return map;
  }, [tasksQuery.data]);

  const today = new Date();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Kalender"
        subtitle="Task dengan tenggat ditampilkan per hari."
        action={
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCursor(subMonths(cursor, 1))}
              aria-label="Bulan sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
              <CalendarDays className="h-4 w-4" />
              Hari ini
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCursor(addMonths(cursor, 1))}
              aria-label="Bulan berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <div>
        <h2 className="font-heading text-lg font-semibold">
          {format(cursor, 'MMMM yyyy', { locale: localeID })}
        </h2>
      </div>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-7 border-b bg-muted/40 text-xs font-medium text-muted-foreground">
          {WEEKDAYS_ID.map((d) => (
            <div key={d} className="px-2 py-2 text-center">
              {d}
            </div>
          ))}
        </div>

        {tasksQuery.isLoading ? (
          <div className="grid grid-cols-7">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="border-b border-r p-2 min-h-[110px]">
                <Skeleton className="h-3 w-6 mb-2" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const items = tasksByDay.get(key) ?? [];
              const inMonth = isSameMonth(day, cursor);
              const isCurrentDay = isSameDay(day, today) || isToday(day);
              return (
                <div
                  key={key}
                  className={cn(
                    'border-b border-r p-2 min-h-[110px] flex flex-col gap-1',
                    !inMonth && 'bg-muted/20',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'text-xs font-medium',
                        !inMonth && 'text-muted-foreground/50',
                        isCurrentDay &&
                          'flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground',
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    {items.length > 2 && (
                      <Badge variant="outline" className="h-4 text-[10px] px-1">
                        +{items.length - 2}
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1 overflow-hidden">
                    {items.slice(0, 3).map((t) => (
                      <RouterLink
                        key={t.id}
                        to="/tasks"
                        className={cn(
                          'block truncate rounded px-1.5 py-0.5 text-[11px] hover:opacity-80 transition-opacity',
                          t.status === 'DONE'
                            ? 'line-through text-muted-foreground bg-muted/50'
                            : priorityColor[t.priority] ?? 'bg-muted',
                        )}
                        title={`${t.title}${t.project ? ` · ${t.project.name}` : ''}`}
                      >
                        {t.project?.color && (
                          <span
                            className="mr-1 inline-block h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: t.project.color }}
                          />
                        )}
                        {t.title}
                      </RouterLink>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
