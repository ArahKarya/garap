import { useQuery } from '@tanstack/react-query';
import { X, Tag as TagIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface Tag {
  id: string;
  name: string;
  color: string | null;
}

interface TagFilterProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

/**
 * Horizontal scrollable list of tag pills. Clicking toggles selection.
 * Selected pills filled, unselected outlined. Used above list views.
 */
export function TagFilter({ selectedIds, onChange }: TagFilterProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const res = await api.get('/tags');
      return res.data.data as Tag[];
    },
  });

  const toggle = (id: string): void => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );
  };

  if (isLoading) {
    return (
      <div className="flex gap-1.5">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-14" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <TagIcon className="h-3.5 w-3.5 text-muted-foreground mr-1" />
      {data.map((t) => {
        const isSelected = selectedIds.includes(t.id);
        return (
          <Badge
            key={t.id}
            variant={isSelected ? 'default' : 'outline'}
            className="cursor-pointer text-xs hover:opacity-80 transition-opacity"
            style={
              isSelected && t.color
                ? { backgroundColor: t.color, borderColor: t.color, color: '#fff' }
                : !isSelected && t.color
                  ? { borderColor: t.color, color: t.color }
                  : undefined
            }
            onClick={() => toggle(t.id)}
          >
            {t.name}
          </Badge>
        );
      })}
      {selectedIds.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground"
          onClick={() => onChange([])}
        >
          <X className="h-3 w-3" />
          Clear
        </Button>
      )}
    </div>
  );
}
