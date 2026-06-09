import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BRANDING } from '@garap/shared';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, XCircle, Mail } from 'lucide-react';
import { api } from '@/lib/api';
import { BrandLogo } from '@/components/BrandLogo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

function getErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const response = (err as { response?: { data?: { error?: { message?: string } } } }).response;
    return response?.data?.error?.message ?? 'Tautan verifikasi tidak valid atau sudah kedaluwarsa.';
  }
  return 'Tautan verifikasi tidak valid atau sudah kedaluwarsa.';
}

type Status = 'loading' | 'success' | 'error' | 'missing';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<Status>(token ? 'loading' : 'missing');
  const [errorMessage, setErrorMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (!token || verifiedRef.current) return;
    verifiedRef.current = true;

    const verify = async (): Promise<void> => {
      try {
        await api.post('/auth/verify-email', { token });
        setStatus('success');
      } catch (err: unknown) {
        setErrorMessage(getErrorMessage(err));
        setStatus('error');
      }
    };

    void verify();
  }, [token]);

  const onResend = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!resendEmail.trim()) {
      toast.error('Masukkan alamat email kamu.');
      return;
    }
    setResending(true);
    try {
      await api.post('/auth/resend-verification', { email: resendEmail.trim() });
      toast.success('Jika email terdaftar, tautan verifikasi baru telah dikirim.');
    } catch {
      toast.success('Jika email terdaftar, tautan verifikasi baru telah dikirim.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-6">
      <div className="absolute right-3 top-3 z-30">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandLogo className="h-12 w-12" />
          <h1 className="mt-3 font-heading text-xl font-semibold">{BRANDING.APP_NAME}</h1>
          <p className="text-xs text-muted-foreground">{BRANDING.TAGLINE}</p>
        </div>

        <Card>
          {status === 'loading' && (
            <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Memverifikasi email…</p>
            </CardContent>
          )}

          {status === 'success' && (
            <>
              <CardHeader className="items-center text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                <CardTitle className="mt-2">Email terverifikasi!</CardTitle>
                <CardDescription>Akunmu sudah aktif. Silakan masuk untuk mulai.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full h-10">
                  <Link to="/login">Masuk ke Garap</Link>
                </Button>
              </CardContent>
            </>
          )}

          {status === 'error' && (
            <>
              <CardHeader className="items-center text-center">
                <XCircle className="h-12 w-12 text-destructive" />
                <CardTitle className="mt-2">Verifikasi gagal</CardTitle>
                <CardDescription>{errorMessage}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={onResend} className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Masukkan email kamu untuk mengirim ulang tautan verifikasi.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="anda@email.com"
                      autoComplete="email"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      className="h-10"
                    />
                    <Button type="submit" variant="secondary" className="h-10" disabled={resending}>
                      {resending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Mail className="h-4 w-4" />
                      )}
                      <span className="ml-1">Kirim ulang</span>
                    </Button>
                  </div>
                </form>
                <Button asChild variant="outline" className="w-full h-10">
                  <Link to="/login">Kembali ke Masuk</Link>
                </Button>
              </CardContent>
            </>
          )}

          {status === 'missing' && (
            <>
              <CardHeader className="items-center text-center">
                <XCircle className="h-12 w-12 text-destructive" />
                <CardTitle className="mt-2">Tautan tidak valid</CardTitle>
                <CardDescription>
                  Tautan verifikasi tidak lengkap. Buka kembali tautan dari email kamu, atau kirim
                  ulang dari halaman masuk.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full h-10">
                  <Link to="/login">Kembali ke Masuk</Link>
                </Button>
              </CardContent>
            </>
          )}
        </Card>

        <p className="mt-8 text-center text-[10px] text-muted-foreground/60">
          {BRANDING.COPYRIGHT}
        </p>
      </div>
    </div>
  );
}
