import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth';

interface UserPayload {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
}

/**
 * Lands here after Google redirect-mode OAuth: the server-side callback
 * (/api/auth/google/callback) exchanged the code, issued our JWT, and
 * appended the tokens as URL fragment params. Read them, hydrate Zustand,
 * navigate to /dashboard.
 *
 * Using fragment (#) not query (?) so tokens never enter Referer headers,
 * server logs, or proxy caches.
 */
export function AuthCallbackPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  // Avoid double-execution under React StrictMode dev re-mount.
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const hash = window.location.hash.replace(/^#/, '');
    const params = new URLSearchParams(hash);
    const access = params.get('access');
    const refresh = params.get('refresh');
    const expiresStr = params.get('expires');
    const userB64 = params.get('user');

    if (!access || !refresh || !userB64) {
      toast.error('Token Google tidak diterima');
      navigate('/login', { replace: true });
      return;
    }

    try {
      // base64url → JSON parse.
      const json = atob(userB64.replace(/-/g, '+').replace(/_/g, '/'));
      const user: UserPayload = JSON.parse(json);
      setAuth(user, {
        accessToken: access,
        refreshToken: refresh,
        expiresIn: Number(expiresStr ?? 900),
      });
      // Wipe fragment from URL so tokens don't linger in browser history.
      window.history.replaceState(null, '', '/dashboard');
      navigate('/dashboard', { replace: true });
      toast.success(`Selamat datang, ${user.name}`);
    } catch {
      toast.error('Gagal memproses login Google');
      navigate('/login', { replace: true });
    }
  }, [navigate, setAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Memproses login...
      </div>
    </div>
  );
}
