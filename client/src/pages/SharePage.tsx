import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Link as LinkIcon, StickyNote, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useActiveWorkspace } from '@/hooks/useWorkspaces';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

/**
 * Web Share Target endpoint. Mobile browsers + installed PWAs let users
 * "share to" Panggon Mikir from any other app — the OS hands us the
 * `title`/`text`/`url` query params declared in manifest.json's
 * share_target.
 *
 * Heuristic:
 *   - if `url` is present (or `text` looks like a URL) → save as Link
 *   - otherwise → save as Note (text becomes the note body)
 *
 * User can override the choice before submitting.
 */
type ShareKind = 'link' | 'note';

const URL_RE = /^https?:\/\/\S+$/i;

function looksLikeUrl(s: string): boolean {
  return URL_RE.test(s.trim());
}

export function SharePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  // The share target may put the URL into any of the three params depending
  // on the source app — fall back gracefully.
  const incomingUrl = params.get('url') ?? '';
  const incomingTitle = params.get('title') ?? '';
  const incomingText = params.get('text') ?? '';
  const detectedUrl =
    incomingUrl ||
    (looksLikeUrl(incomingText) ? incomingText.trim() : '') ||
    (looksLikeUrl(incomingTitle) ? incomingTitle.trim() : '');

  const initialKind: ShareKind = detectedUrl ? 'link' : 'note';
  const [kind, setKind] = useState<ShareKind>(initialKind);
  const [title, setTitle] = useState(incomingTitle);
  const [body, setBody] = useState(detectedUrl ? incomingText : incomingText || incomingTitle);
  const [url, setUrl] = useState(detectedUrl);
  const handled = useRef(false);

  // Auto-create + redirect immediately if we have enough data and the user
  // landed here from a share intent. This makes "share to Panggon Mikir"
  // feel one-tap. If creation fails, fall through to the manual form.
  const { activeWorkspaceId } = useActiveWorkspace();
  const linkMutation = useMutation({
    mutationFn: async () => {
      if (!activeWorkspaceId) throw new Error('Workspace belum aktif');
      const res = await api.post('/links', {
        workspaceId: activeWorkspaceId,
        url,
        title: title || undefined,
        notes: body || undefined,
      });
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Link tersimpan');
      navigate('/links', { replace: true });
    },
    onError: () => toast.error('Gagal menyimpan link'),
  });

  const noteMutation = useMutation({
    mutationFn: async () => {
      if (!activeWorkspaceId) throw new Error('Workspace belum aktif');
      const noteTitle = title || (body ? body.slice(0, 80) : 'Catatan dari share');
      const res = await api.post('/notes', {
        workspaceId: activeWorkspaceId,
        title: noteTitle,
        content: body,
      });
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Note tersimpan');
      navigate('/notes', { replace: true });
    },
    onError: () => toast.error('Gagal menyimpan note'),
  });

  // Auto-submit if we have a URL on first load (one-tap link save).
  useEffect(() => {
    if (handled.current) return;
    if (initialKind === 'link' && url && (incomingTitle || incomingText)) {
      handled.current = true;
      linkMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (kind === 'link') linkMutation.mutate();
    else noteMutation.mutate();
  };

  const busy = linkMutation.isPending || noteMutation.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-4 w-4" />
            Simpan ke Panggon Mikir
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="inline-flex w-full rounded-md border bg-muted/30 p-0.5">
              <button
                type="button"
                onClick={() => setKind('link')}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs ${kind === 'link' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}
              >
                <LinkIcon className="h-3.5 w-3.5" />
                Link
              </button>
              <button
                type="button"
                onClick={() => setKind('note')}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs ${kind === 'note' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}
              >
                <StickyNote className="h-3.5 w-3.5" />
                Note
              </button>
            </div>

            {kind === 'link' && (
              <div className="space-y-2">
                <Label htmlFor="share-url">URL</Label>
                <Input
                  id="share-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="share-title">Judul</Label>
              <Input
                id="share-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={kind === 'link' ? 'Judul link (opsional)' : 'Judul note'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="share-body">
                {kind === 'link' ? 'Catatan pribadi (opsional)' : 'Konten'}
              </Label>
              <Textarea
                id="share-body"
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/dashboard')}
                disabled={busy}
              >
                Batal
              </Button>
              <Button type="submit" className="flex-1" disabled={busy}>
                {busy && <Loader2 className="animate-spin" />}
                Simpan
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
