import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  loginSchema,
  type LoginInput,
  registerSchema,
  type RegisterInput,
  BRANDING,
} from '@garap/shared';
import { toast } from 'sonner';
import {
  Loader2,
  CheckSquare,
  StickyNote,
  Link as LinkIcon,
  FileText,
  Calendar,
  Tags,
  Command,
  Search,
  Sparkles,
  Eye,
  EyeOff,
  MailCheck,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { BrandLogo } from '@/components/BrandLogo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LoginResponse {
  user: { id: string; email: string; name: string; roles: string[]; permissions: string[] };
  tokens: { accessToken: string; refreshToken: string; expiresIn: number };
}

/** Hasil register: auto-login (perilaku lama) atau wajib verifikasi email dulu. */
type RegisterResponse =
  | ({ requiresVerification?: false } & LoginResponse)
  | { requiresVerification: true; email: string };

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
    return response?.data?.error?.message ?? 'Terjadi kesalahan';
  }
  return 'Terjadi kesalahan';
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const FEATURES: Array<{ icon: typeof CheckSquare; label: string; desc: string }> = [
  {
    icon: CheckSquare,
    label: 'Task & Project',
    desc: 'Kanban drag-drop, sub-task, recurring',
  },
  {
    icon: StickyNote,
    label: 'Notes & Documents',
    desc: 'Markdown editor + file upload',
  },
  {
    icon: LinkIcon,
    label: 'Link Aggregator',
    desc: 'Auto-fetch metadata, multi-platform',
  },
  {
    icon: Search,
    label: 'Search Universal',
    desc: '⌘K cari semua · ⌘⇧A quick add',
  },
];

/** Ikon Garap yang mengambang bebas di panel showcase (gaya hero landing). */
const SHOWCASE_ICONS: (typeof CheckSquare)[] = [
  CheckSquare,
  StickyNote,
  LinkIcon,
  FileText,
  Calendar,
  Tags,
  Command,
  Search,
];

type FloatAnim =
  | 'animate-float-slow'
  | 'animate-float-medium'
  | 'animate-float-fast'
  | 'animate-bob';

interface FloatingIcon {
  id: number;
  Icon: typeof CheckSquare;
  top: string;
  left: string;
  size: number;
  duration: number;
  delay: number;
  tint: string;
  animation: FloatAnim;
}

interface Particle {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const completeLogin = (data: LoginResponse): void => {
    setAuth(data.user, data.tokens);
    const state = location.state as LocationState | null;
    const from = state?.from?.pathname ?? '/tasks';
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
    register: registerLoginField,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const {
    register: registerField,
    handleSubmit: handleRegisterSubmit,
    formState: { errors: registerErrors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onLoginSubmit = async (input: LoginInput): Promise<void> => {
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

  const onRegisterSubmit = async (input: RegisterInput): Promise<void> => {
    setLoading(true);
    try {
      const res = await api.post<{ data: RegisterResponse }>('/auth/register', input);
      const data = res.data.data;
      if (data.requiresVerification) {
        // Tidak auto-login — tampilkan state "cek email".
        setPendingEmail(data.email);
      } else {
        completeLogin(data);
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const onResendVerification = async (): Promise<void> => {
    if (!pendingEmail) return;
    setLoading(true);
    try {
      await api.post('/auth/resend-verification', { email: pendingEmail });
      toast.success('Email verifikasi telah dikirim ulang.');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const backToLogin = (): void => {
    setPendingEmail(null);
    setMode('login');
    setShowPassword(false);
  };

  const isRegister = mode === 'register';

  const toggleMode = (): void => {
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    setShowPassword(false);
  };

  return (
    <div className="relative min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="absolute right-3 top-3 z-30">
        <ThemeToggle />
      </div>
      {/* ── Left: brand showcase (hidden on small screens) ─────────────── */}
      <BrandShowcase />

      {/* ── Right: actual login form ─────────────────────────────────── */}
      <div className="flex items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-sm">
          {/* Mobile-only compact header */}
          <div className="lg:hidden mb-6 flex flex-col items-center text-center">
            <BrandLogo className="h-12 w-12" />
            <h1 className="mt-3 font-heading text-xl font-semibold">{BRANDING.APP_NAME}</h1>
            <p className="text-xs text-muted-foreground">{BRANDING.TAGLINE}</p>
          </div>

          {pendingEmail ? (
            <CheckEmailPanel
              email={pendingEmail}
              loading={loading}
              onResend={onResendVerification}
              onBack={backToLogin}
            />
          ) : (
          <>
          <div className="space-y-1 mb-6">
            <h2 className="font-heading text-2xl font-semibold tracking-tight">
              {isRegister ? 'Buat akun Garap' : 'Selamat datang'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isRegister
                ? 'Daftar dengan akun Google atau email-mu untuk mulai.'
                : 'Masuk dengan akun Google atau email-mu untuk lanjut.'}
            </p>
          </div>

          <div className="space-y-4">
            {/* Google sign-in */}
            {GOOGLE_CLIENT_ID ? (
              <div className="flex justify-center">
                <div ref={googleButtonRef} />
              </div>
            ) : (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                <code>VITE_GOOGLE_CLIENT_ID</code> belum di-set di{' '}
                <code>client/.env</code> — tombol Google tidak muncul. Pakai email/password
                di bawah.
              </div>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                atau
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Email/password form — login vs register */}
            {isRegister ? (
              <form onSubmit={handleRegisterSubmit(onRegisterSubmit)} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="register-name" className="text-xs">
                    Nama
                  </Label>
                  <Input
                    id="register-name"
                    type="text"
                    placeholder="Nama lengkap"
                    autoComplete="name"
                    aria-invalid={!!registerErrors.name}
                    className="h-10"
                    {...registerField('name')}
                  />
                  {registerErrors.name && (
                    <p className="text-xs text-destructive">{registerErrors.name.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="register-email" className="text-xs">
                    Email
                  </Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="anda@email.com"
                    autoComplete="email"
                    aria-invalid={!!registerErrors.email}
                    className="h-10"
                    {...registerField('email')}
                  />
                  {registerErrors.email && (
                    <p className="text-xs text-destructive">{registerErrors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="register-password" className="text-xs">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="register-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      aria-invalid={!!registerErrors.password}
                      className="h-10 pr-10"
                      {...registerField('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  {registerErrors.password && (
                    <p className="text-xs text-destructive">{registerErrors.password.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full h-10" disabled={loading}>
                  {loading && <Loader2 className="animate-spin" />}
                  {loading ? 'Memproses…' : 'Daftar dengan email'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleLoginSubmit(onLoginSubmit)} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="anda@email.com"
                    autoComplete="email"
                    aria-invalid={!!loginErrors.email}
                    className="h-10"
                    {...registerLoginField('email')}
                  />
                  {loginErrors.email && (
                    <p className="text-xs text-destructive">{loginErrors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs">
                      Password
                    </Label>
                    <span className="text-[10px] text-muted-foreground">
                      Reset di Settings setelah login
                    </span>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      aria-invalid={!!loginErrors.password}
                      className="h-10 pr-10"
                      {...registerLoginField('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  {loginErrors.password && (
                    <p className="text-xs text-destructive">{loginErrors.password.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full h-10" disabled={loading}>
                  {loading && <Loader2 className="animate-spin" />}
                  {loading ? 'Memproses…' : 'Masuk dengan email'}
                </Button>
              </form>
            )}

            {/* Toggle login <-> register */}
            <p className="text-center text-xs text-muted-foreground">
              {isRegister ? 'Sudah punya akun? ' : 'Belum punya akun? '}
              <button
                type="button"
                onClick={toggleMode}
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                {isRegister ? 'Masuk' : 'Daftar'}
              </button>
            </p>
          </div>
          </>
          )}

          <p className="mt-8 text-center text-[10px] text-muted-foreground/60">
            {BRANDING.COPYRIGHT}
          </p>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Check-email panel — ditampilkan setelah register bila server meminta
// verifikasi email (requiresVerification: true). User TIDAK auto-login.
// ───────────────────────────────────────────────────────────────────────────

interface CheckEmailPanelProps {
  email: string;
  loading: boolean;
  onResend: () => void;
  onBack: () => void;
}

function CheckEmailPanel({ email, loading, onResend, onBack }: CheckEmailPanelProps) {
  return (
    <div className="space-y-5 text-center">
      <div className="flex justify-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MailCheck className="h-7 w-7" />
        </div>
      </div>
      <div className="space-y-1.5">
        <h2 className="font-heading text-2xl font-semibold tracking-tight">Cek email kamu</h2>
        <p className="text-sm text-muted-foreground">
          Kami telah mengirim link verifikasi ke{' '}
          <span className="font-medium text-foreground">{email}</span>. Klik link itu untuk
          mengaktifkan akun.
        </p>
      </div>
      <div className="space-y-2">
        <Button
          type="button"
          variant="secondary"
          className="w-full h-10"
          onClick={onResend}
          disabled={loading}
        >
          {loading && <Loader2 className="animate-spin" />}
          {loading ? 'Mengirim…' : 'Kirim ulang email'}
        </Button>
        <Button type="button" variant="ghost" className="w-full h-10" onClick={onBack}>
          Kembali ke Masuk
        </Button>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Brand showcase pane — only visible at lg+ breakpoint. Aesthetic + feature
// highlights. Decorative blurred orbs + subtle dot grid bg.
// ───────────────────────────────────────────────────────────────────────────

function BrandShowcase() {
  // Ikon mengambang + partikel naik — di-memo sekali agar posisi acak stabil.
  const floatingIcons: FloatingIcon[] = useMemo(() => {
    const anims: FloatAnim[] = [
      'animate-float-slow',
      'animate-float-medium',
      'animate-float-fast',
      'animate-bob',
    ];
    const tints = [
      'text-white/10',
      'text-white/[0.14]',
      'text-emerald-100/20',
      'text-teal-100/15',
    ];
    return Array.from({ length: 9 }).map((_, i) => ({
      id: i,
      Icon: SHOWCASE_ICONS[i % SHOWCASE_ICONS.length]!,
      top: `${6 + Math.random() * 82}%`,
      left: `${4 + Math.random() * 88}%`,
      size: 24 + Math.random() * 30,
      duration: 5 + Math.random() * 7,
      delay: -Math.random() * 6,
      tint: tints[i % tints.length]!,
      animation: anims[i % anims.length]!,
    }));
  }, []);

  const particles: Particle[] = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 3 + Math.random() * 5,
        duration: 11 + Math.random() * 12,
        delay: -Math.random() * 16,
      })),
    [],
  );

  return (
    <div
      className="animate-gradient-flow hidden lg:flex relative overflow-hidden text-primary-foreground"
      style={{
        backgroundImage:
          'linear-gradient(135deg, #022c22 0%, #064e3b 22%, #0f766e 48%, #047857 72%, #0d9488 100%)',
        backgroundSize: '200% 200%',
      }}
    >
      {/* Cincin besar berputar lambat di belakang panel */}
      <div
        aria-hidden
        className="animate-spin-slow pointer-events-none absolute -top-1/3 -left-1/4 h-[140%] w-[140%] opacity-40"
        style={{
          background:
            'conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(255,255,255,0.06) 60deg, transparent 120deg, rgba(255,255,255,0.06) 200deg, transparent 260deg, rgba(255,255,255,0.06) 320deg, transparent 360deg)',
        }}
      />

      <div
        aria-hidden
        className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/10 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-white/5 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Partikel naik dari bawah */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {particles.map((p) => (
          <span
            key={p.id}
            className="animate-drift-up absolute bottom-[-20px] rounded-full bg-white/40"
            style={{
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Ikon Garap mengambang */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {floatingIcons.map((f) => {
          const Icon = f.Icon;
          return (
            <Icon
              key={f.id}
              className={`absolute ${f.tint} ${f.animation}`}
              style={{
                top: f.top,
                left: f.left,
                width: f.size,
                height: f.size,
                animationDuration: `${f.duration}s`,
                animationDelay: `${f.delay}s`,
              }}
            />
          );
        })}
      </div>

      <div className="relative z-10 flex flex-col justify-between p-12 w-full">
        {/* Top: logo + name. Showcase pane is always primary-tinted, so
            force the white-ink logo regardless of OS dark/light mode. */}
        <div className="animate-in fade-in slide-in-from-top-3 duration-700 inline-flex items-center gap-3">
          <BrandLogo forceDark className="animate-pulse-soft h-10 w-10" />
          <div>
            <p className="font-heading text-2xl font-bold leading-none">
              {BRANDING.APP_NAME}
            </p>
            <p className="text-xs text-primary-foreground/70 mt-1">{BRANDING.TAGLINE}</p>
          </div>
        </div>

        {/* Middle: hero */}
        <div className="space-y-6 my-8">
          <div className="animate-in fade-in slide-in-from-bottom-3 duration-700 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
            </span>
            <Sparkles className="h-3 w-3" />
            <span>Personal second brain</span>
          </div>
          <h1 className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 font-heading text-4xl font-bold leading-tight">
            Tempat berpikir,
            <br />
            mengelola, dan menyimpan.
          </h1>
          <p className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 text-sm text-primary-foreground/80 max-w-md leading-relaxed">
            Satu tempat untuk task, project, link, note, dan dokumen — terhubung
            via tag universal, siap dicari kapan saja.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-2 gap-3">
          {FEATURES.map((f, i) => (
            <div
              key={f.label}
              className="animate-in fade-in slide-in-from-bottom-4 duration-700 rounded-lg border border-white/10 bg-white/5 p-3 backdrop-blur-sm"
              style={{ animationDelay: `${450 + i * 100}ms` }}
            >
              <f.icon className="h-4 w-4 mb-1.5 text-primary-foreground/90" />
              <p className="text-sm font-semibold">{f.label}</p>
              <p className="text-[11px] text-primary-foreground/70 leading-snug mt-0.5">
                {f.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom copyright */}
        <p className="text-[10px] text-primary-foreground/50 mt-8">{BRANDING.COPYRIGHT}</p>
      </div>
    </div>
  );
}

