import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { changePasswordSchema, type ChangePasswordInput } from '@garap/shared';
import {
  Download,
  Loader2,
  KeyRound,
  AlertTriangle,
  Trash2,
  Briefcase,
  Users,
  FileText,
  ChevronRight,
  Calendar as CalendarIcon,
  CreditCard,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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

interface ResetResult {
  reset: boolean;
  tasks: number;
  projects: number;
  links: number;
  notes: number;
  documents: number;
  tags: number;
}

function getErrorMessage(err: unknown): string | null {
  if (err && typeof err === 'object' && 'response' in err) {
    return (
      (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
        ?.message ?? null
    );
  }
  return null;
}

interface SectionLink {
  to: string;
  icon: typeof Trash2;
  label: string;
  description: string;
  permission: string | null;
}

const contentLinks: SectionLink[] = [
  {
    to: '/calendar',
    icon: CalendarIcon,
    label: 'Kalender',
    description: 'Tampilan kalender semua task dengan tenggat',
    permission: 'task:read',
  },
];

const managementLinks: SectionLink[] = [
  {
    to: '/trash',
    icon: Trash2,
    label: 'Trash',
    description: 'Item yang telah dihapus — bisa dipulihkan',
    permission: null,
  },
  {
    to: '/workspaces',
    icon: Briefcase,
    label: 'Workspaces',
    description: 'Kelola workspace (container untuk task, project, note)',
    permission: 'workspace:read',
  },
  {
    to: '/users',
    icon: Users,
    label: 'Pengguna',
    description: 'Daftar user yang punya akses ke aplikasi',
    permission: 'user:read',
  },
  {
    to: '/audit-logs',
    icon: FileText,
    label: 'Audit Log',
    description: 'Riwayat perubahan data untuk audit',
    permission: 'audit:read',
  },
];

interface LinkSectionProps {
  title: string;
  description: string;
  links: SectionLink[];
}

function LinkSection({ title, description, links }: LinkSectionProps) {
  if (links.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="flex items-center gap-3 px-6 py-3 hover:bg-accent/50 transition-colors"
            >
              <link.icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{link.label}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {link.description}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function SettingsPage() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [downloading, setDownloading] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');

  const visibleContent = contentLinks.filter(
    (l) => !l.permission || hasPermission(l.permission),
  );
  const visibleManagement = managementLinks.filter(
    (l) => !l.permission || hasPermission(l.permission),
  );

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
      a.download = `garap-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup berhasil diunduh');
    } catch {
      toast.error('Gagal mengunduh backup');
    } finally {
      setDownloading(false);
    }
  };

  // ── Change password ──────────────────────────────────────────────────────
  const pwForm = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const pwMutation = useMutation({
    mutationFn: async (input: ChangePasswordInput) => {
      await api.post('/auth/change-password', input);
    },
    onSuccess: () => {
      toast.success('Password berhasil diubah');
      pwForm.reset();
      setPwOpen(false);
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err) ?? 'Gagal mengubah password');
    },
  });

  // ── Factory reset ────────────────────────────────────────────────────────
  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ data: ResetResult }>('/backup/reset', { confirm: 'RESET' });
      return res.data.data;
    },
    onSuccess: (data) => {
      toast.success(
        `Reset selesai: ${data.tasks} task, ${data.projects} project, ${data.notes} note dihapus`,
      );
      setResetConfirmText('');
      setResetOpen(false);
      // Invalidate every cached query so list pages immediately reflect empty state.
      qc.invalidateQueries();
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err) ?? 'Gagal reset data');
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-heading font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Profil, backup, reset data, dan konfigurasi aplikasi
        </p>
      </div>

      {/* ── Account ──────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Akun</CardTitle>
          <CardDescription>Profil dan password lokal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Nama</p>
              <p className="font-medium">{user?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
              <p className="font-medium">{user?.email ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Role</p>
              <p className="font-medium">{user?.roles.join(', ') ?? '—'}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setPwOpen(true)}>
            <KeyRound className="h-4 w-4" />
            Ganti password lokal
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Untuk akun yang login lewat Google, password lokal tidak dipakai —
            password reset cukup di Google Account langsung.
          </p>
        </CardContent>
      </Card>

      {/* ── Langganan / billing ──────────────────────────────────────────── */}
      <LinkSection
        title="Langganan"
        description="Paket aktif, pemakaian, dan opsi upgrade"
        links={[
          {
            to: '/billing',
            icon: CreditCard,
            label: 'Paket & Pemakaian',
            description: 'Lihat paket, kuota terpakai, dan upgrade',
            permission: null,
          },
        ]}
      />

      {/* ── Tampilan tambahan ────────────────────────────────────────────── */}
      <LinkSection
        title="Tampilan tambahan"
        description="View alternatif yang tidak ditaruh di sidebar utama"
        links={visibleContent}
      />

      {/* ── Pengelolaan (admin/maintenance links) ────────────────────────── */}
      <LinkSection
        title="Pengelolaan"
        description="Akses cepat ke menu admin & pemulihan data"
        links={visibleManagement}
      />

      {/* ── Backup data ──────────────────────────────────────────────────── */}
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

      {/* ── Danger zone ──────────────────────────────────────────────────── */}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Operasi irreversible. Pastikan unduh backup dulu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            size="sm"
            className="border-destructive/50 text-destructive hover:bg-destructive/10"
            onClick={() => {
              setResetConfirmText('');
              setResetOpen(true);
            }}
          >
            <AlertTriangle className="h-4 w-4" />
            Reset semua data
          </Button>
        </CardContent>
      </Card>

      {/* ── Application settings (raw key-value) ─────────────────────────── */}
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

      {/* ── Change password dialog ───────────────────────────────────────── */}
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ganti Password</DialogTitle>
            <DialogDescription>Minimal 8 karakter, ada huruf + angka.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={pwForm.handleSubmit((d) => pwMutation.mutate(d))}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="curr-pw">Password sekarang</Label>
              <Input
                id="curr-pw"
                type="password"
                autoComplete="current-password"
                {...pwForm.register('currentPassword')}
              />
              {pwForm.formState.errors.currentPassword && (
                <p className="text-xs text-destructive">
                  {pwForm.formState.errors.currentPassword.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-pw">Password baru</Label>
              <Input
                id="new-pw"
                type="password"
                autoComplete="new-password"
                {...pwForm.register('newPassword')}
              />
              {pwForm.formState.errors.newPassword && (
                <p className="text-xs text-destructive">
                  {pwForm.formState.errors.newPassword.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pw">Konfirmasi password baru</Label>
              <Input
                id="confirm-pw"
                type="password"
                autoComplete="new-password"
                {...pwForm.register('confirmPassword')}
              />
              {pwForm.formState.errors.confirmPassword && (
                <p className="text-xs text-destructive">
                  {pwForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setPwOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={pwMutation.isPending}>
                {pwMutation.isPending && <Loader2 className="animate-spin" />}
                Ubah password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Reset all data dialog ────────────────────────────────────────── */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Reset semua data
            </DialogTitle>
            <DialogDescription>
              Ini akan menghapus <strong>permanen</strong> seluruh task, project,
              link, note, document, dan tag kamu. Akun + login tetap. Tidak bisa
              di-undo.
            </DialogDescription>
          </DialogHeader>

          {backupQuery.data && (
            <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
              <p className="font-medium">Yang akan dihapus:</p>
              <p>
                {backupQuery.data.tasks} task · {backupQuery.data.projects} project ·{' '}
                {backupQuery.data.links} link · {backupQuery.data.notes} note ·{' '}
                {backupQuery.data.documents} document · {backupQuery.data.tags} tag
              </p>
            </div>
          )}

          <div className="rounded-md border-2 border-warning/40 bg-warning/5 p-3 text-xs">
            ⚠️ <strong>Disarankan unduh backup dulu</strong> sebelum lanjut.{' '}
            <button
              type="button"
              className="underline"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? 'Mengunduh...' : 'Klik di sini untuk unduh sekarang'}
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reset-confirm">
              Ketik <code className="font-mono bg-muted px-1">RESET</code> untuk konfirmasi
            </Label>
            <Input
              id="reset-confirm"
              autoComplete="off"
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              placeholder="RESET"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setResetOpen(false)}>
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={resetConfirmText !== 'RESET' || resetMutation.isPending}
              onClick={() => resetMutation.mutate()}
            >
              {resetMutation.isPending && <Loader2 className="animate-spin" />}
              Reset semua data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
