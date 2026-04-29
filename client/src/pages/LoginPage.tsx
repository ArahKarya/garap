import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput, BRANDING } from '@panggonmikir/shared';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

interface LoginResponse {
  user: { id: string; email: string; name: string; roles: string[]; permissions: string[] };
  tokens: { accessToken: string; refreshToken: string; expiresIn: number };
}

interface LocationState {
  from?: { pathname?: string };
}

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }) => void;
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

function getErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const response = (err as { response?: { data?: { error?: { message?: string } } } }).response;
    return response?.data?.error?.message ?? 'Login gagal';
  }
  return 'Login gagal';
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [loading, setLoading] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const completeLogin = (data: LoginResponse): void => {
    setAuth(data.user, data.tokens);
    const state = location.state as LocationState | null;
    const from = state?.from?.pathname ?? '/dashboard';
    navigate(from, { replace: true });
    toast.success(`Selamat datang, ${data.user.name}`);
  };

  const handleGoogleCredential = async (response: GoogleCredentialResponse): Promise<void> => {
    setLoading(true);
    try {
      const res = await api.post<{ data: LoginResponse }>('/auth/google', {
        idToken: response.credential,
      });
      completeLogin(res.data.data);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Load Google Identity Services script and render the sign-in button.
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const renderButton = (): void => {
      if (!window.google || !googleButtonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: 320,
      });
    };

    if (window.google?.accounts) {
      renderButton();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[src*="gsi/client"]');
    if (existing) {
      existing.addEventListener('load', renderButton, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = renderButton;
    document.head.appendChild(script);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (input: LoginInput): Promise<void> => {
    setLoading(true);
    try {
      const res = await api.post<{ data: LoginResponse }>('/auth/login', input);
      completeLogin(res.data.data);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md shadow-md">
        <CardHeader className="space-y-1 text-center pb-6">
          <img
            src={BRANDING.LOGO_LIGHT}
            alt={BRANDING.APP_NAME}
            className="mx-auto mb-1 h-14 w-14 dark:hidden"
          />
          <img
            src={BRANDING.LOGO_DARK}
            alt={BRANDING.APP_NAME}
            className="mx-auto mb-1 h-14 w-14 hidden dark:block"
          />
          <CardTitle className="text-xl">{BRANDING.APP_NAME}</CardTitle>
          <CardDescription>Masuk dengan akun Google Anda</CardDescription>
          <p className="text-[10px] text-muted-foreground/60 pt-1">{BRANDING.COPYRIGHT}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {GOOGLE_CLIENT_ID ? (
            <div className="flex justify-center">
              <div ref={googleButtonRef} />
            </div>
          ) : (
            <p className="text-xs text-center text-destructive">
              VITE_GOOGLE_CLIENT_ID belum di-set di .env client.
            </p>
          )}

          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowFallback((v) => !v)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showFallback ? 'Sembunyikan' : 'Login dengan email/password (fallback)'}
            </button>
          </div>

          {showFallback && (
            <>
              <Separator />
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@panggonmikir.local"
                    autoComplete="email"
                    aria-invalid={!!errors.email}
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    aria-invalid={!!errors.password}
                    {...register('password')}
                  />
                  {errors.password && (
                    <p className="text-xs text-destructive">{errors.password.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="animate-spin" />}
                  {loading ? 'Memproses...' : 'Masuk'}
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
