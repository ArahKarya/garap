import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Upload, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface BaseProps {
  workspaceId: string;
  projectId: string;
}

function getErrorMessage(err: unknown): string {
  if (
    err &&
    typeof err === 'object' &&
    'response' in err &&
    err.response &&
    typeof err.response === 'object' &&
    'data' in err.response
  ) {
    const data = (err.response as { data?: { error?: { message?: string } } }).data;
    if (data?.error?.message) return data.error.message;
  }
  return 'Gagal menyimpan';
}

// ─── Add Task ─────────────────────────────────────────────────────────────

export function AddTaskDialog({ workspaceId, projectId }: BaseProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [dueDate, setDueDate] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post('/tasks', {
        workspaceId,
        projectId,
        title: title.trim(),
        description: description.trim() || null,
        priority,
        dueDate: dueDate || null,
        status: 'TODO',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-tasks', projectId] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Task ditambahkan');
      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
      setDueDate('');
      setOpen(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4" /> Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Task baru</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            mutation.mutate();
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Judul</Label>
            <Input
              id="task-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-desc">Deskripsi</Label>
            <Textarea
              id="task-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Prioritas</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">LOW</SelectItem>
                  <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                  <SelectItem value="HIGH">HIGH</SelectItem>
                  <SelectItem value="URGENT">URGENT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-due">Tenggat</Label>
              <Input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Link ─────────────────────────────────────────────────────────────

export function AddLinkDialog({ workspaceId, projectId }: BaseProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post('/links', {
        workspaceId,
        projectId,
        url: url.trim(),
        title: title.trim() || undefined,
        notes: notes.trim() || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-links', projectId] });
      qc.invalidateQueries({ queryKey: ['links'] });
      toast.success('Link ditambahkan — metadata di-fetch');
      setUrl('');
      setTitle('');
      setNotes('');
      setOpen(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4" /> Link
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link baru</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!url.trim()) return;
            mutation.mutate();
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="link-url">URL</Label>
            <Input
              id="link-url"
              autoFocus
              type="url"
              required
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="link-title">Judul (opsional)</Label>
            <Input
              id="link-title"
              placeholder="Auto-detect dari og:title kalau kosong"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="link-notes">Catatan</Label>
            <Textarea
              id="link-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Note ─────────────────────────────────────────────────────────────

export function AddNoteDialog({ workspaceId, projectId }: BaseProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post('/notes', {
        workspaceId,
        projectId,
        title: title.trim(),
        content,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-notes', projectId] });
      qc.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Note ditambahkan');
      setTitle('');
      setContent('');
      setOpen(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4" /> Note
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Note baru</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            mutation.mutate();
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="note-title">Judul</Label>
            <Input
              id="note-title"
              autoFocus
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note-content">Isi (markdown)</Label>
            <Textarea
              id="note-content"
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="# Heading&#10;- item&#10;[[backlink]]"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Document (upload OR external URL) ───────────────────────────────

export function AddDocumentDialog({ workspaceId, projectId }: BaseProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<'upload' | 'external'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = (): void => {
    setFile(null);
    setTitle('');
    setDescription('');
    setExternalUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const externalMutation = useMutation({
    mutationFn: async () => {
      await api.post('/documents/external', {
        workspaceId,
        projectId,
        title: title.trim(),
        description: description.trim() || null,
        externalUrl: externalUrl.trim(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-documents', projectId] });
      qc.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document ditambahkan');
      reset();
      setOpen(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const handleUpload = async (): Promise<void> => {
    if (!file) {
      toast.error('Pilih file dulu');
      return;
    }
    if (!title.trim()) {
      toast.error('Judul wajib diisi');
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('workspaceId', workspaceId);
      fd.append('projectId', projectId);
      fd.append('title', title.trim());
      if (description.trim()) fd.append('description', description.trim());
      await api.post('/documents/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      qc.invalidateQueries({ queryKey: ['project-documents', projectId] });
      qc.invalidateQueries({ queryKey: ['documents'] });
      toast.success('File terupload');
      reset();
      setOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4" /> Document
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Document baru</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'upload' | 'external')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4" /> Upload
            </TabsTrigger>
            <TabsTrigger value="external">
              <LinkIcon className="h-4 w-4" /> External URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-3 pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="doc-file">File</Label>
              <Input
                id="doc-file"
                ref={fileInputRef}
                type="file"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFile(f);
                  if (f && !title) setTitle(f.name);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-up-title">Judul</Label>
              <Input
                id="doc-up-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-up-desc">Deskripsi</Label>
              <Textarea
                id="doc-up-desc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button type="button" disabled={submitting} onClick={handleUpload}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Upload
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="external" className="space-y-3 pt-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!externalUrl.trim() || !title.trim()) return;
                externalMutation.mutate();
              }}
              className="space-y-3"
            >
              <div className="space-y-1.5">
                <Label htmlFor="doc-ext-url">URL</Label>
                <Input
                  id="doc-ext-url"
                  type="url"
                  required
                  placeholder="https://drive.google.com/..."
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="doc-ext-title">Judul</Label>
                <Input
                  id="doc-ext-title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="doc-ext-desc">Deskripsi</Label>
                <Textarea
                  id="doc-ext-desc"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={externalMutation.isPending}>
                  {externalMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Simpan
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
