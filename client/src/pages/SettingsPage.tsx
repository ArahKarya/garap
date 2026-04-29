import { useQuery } from '@tanstack/react-query';
import { Download, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface SettingRow {
  key: string;
  value: unknown;
  updatedAt: string;
}

interface BackupSummary {
  tasks: number;
  projects: number;
  links: number;
  notes: number;
  documents: number;
  tags: number;
}

export function SettingsPage() {
  const [downloading, setDownloading] = useState(false);

  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: async (): Promise<SettingRow[]> => {
      const res = await api.get<{ data: SettingRow[] }>('/settings');
      return res.data.data;
    },
  });

  const backupQuery = useQuery({
    queryKey: ['backup', 'summary'],
    queryFn: async (): Promise<BackupSummary> => {
      const res = await api.get<{ data: BackupSummary }>('/backup/summary');
      return res.data.data;
    },
  });

  const handleDownload = async (): Promise<void> => {
    setDownloading(true);
    try {
      const res = await api.get('/backup/export', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `panggon-mikir-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup berhasil diunduh');
    } catch {
      toast.error('Gagal mengunduh backup');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-heading font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Konfigurasi aplikasi & backup data</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Backup Data</CardTitle>
          <CardDescription>
            Unduh seluruh data kamu (task, project, link, note, document, tag) sebagai
            file JSON. Termasuk item yang ada di Trash.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {backupQuery.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : backupQuery.data ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {(
                [
                  ['tasks', 'Tasks'],
                  ['projects', 'Projects'],
                  ['links', 'Links'],
                  ['notes', 'Notes'],
                  ['documents', 'Documents'],
                  ['tags', 'Tags'],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="rounded-md border p-3 text-center">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {label}
                  </p>
                  <p className="font-heading text-xl font-semibold">
                    {backupQuery.data?.[key] ?? 0}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
          <Button onClick={handleDownload} disabled={downloading}>
            {downloading ? <Loader2 className="animate-spin" /> : <Download />}
            Unduh Backup JSON
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Application Settings</CardTitle>
          <CardDescription>Key-value config yang tersimpan di database</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settingsQuery.isLoading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-48" />
                    </TableCell>
                  </TableRow>
                ))}
              {settingsQuery.data?.map((s) => (
                <TableRow key={s.key}>
                  <TableCell className="font-mono text-xs">{s.key}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {JSON.stringify(s.value)}
                  </TableCell>
                </TableRow>
              ))}
              {!settingsQuery.isLoading && settingsQuery.data?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                    Belum ada setting.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
