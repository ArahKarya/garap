import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BRANDING } from '@garap/shared';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  CheckSquare,
  StickyNote,
  Link as LinkIcon,
  FileText,
  BookMarked,
  Search,
  Calendar,
  Command,
  Sparkles,
  Tags,
  Moon,
  Smartphone,
  ArrowRight,
  Github,
} from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { Reveal } from '@/components/reveal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

/** Repo open-source Garap. Catatan: repo masih privat — jadikan publik agar link ini bisa diakses umum. */
const GITHUB_URL = 'https://github.com/ArahKarya/garap';
/** Website induk (branding/portfolio PT Arah Karya Sinergi). */
const ARAHKARYA_URL = 'https://arahkarya.com';

interface Feature {
  icon: typeof CheckSquare;
  label: string;
  desc: string;
}

const FEATURES: Feature[] = [
  {
    icon: CheckSquare,
    label: 'Task & Project',
    desc: 'Kanban drag-drop, sub-task, recurring, dan milestone per project.',
  },
  {
    icon: StickyNote,
    label: 'Notes',
    desc: 'Catatan markdown dengan backlink antar entitas.',
  },
  {
    icon: LinkIcon,
    label: 'Link Aggregator',
    desc: 'Simpan bookmark multi-platform, metadata diambil otomatis.',
  },
  {
    icon: FileText,
    label: 'Documents',
    desc: 'Upload file kerja atau tautkan dokumen eksternal.',
  },
  {
    icon: BookMarked,
    label: 'References',
    desc: 'Bibliografi buku, jurnal, dan paper lengkap dengan DOI/ISBN.',
  },
  {
    icon: Tags,
    label: 'Tag Universal',
    desc: 'Satu sistem tag yang menghubungkan semua jenis konten.',
  },
];

interface Reason {
  icon: typeof Search;
  label: string;
  desc: string;
}

const REASONS: Reason[] = [
  {
    icon: Search,
    label: 'Search global',
    desc: 'Temukan task, note, link, atau dokumen apa pun dari satu kotak pencarian.',
  },
  {
    icon: Command,
    label: 'Command palette ⌘K',
    desc: 'Lompat ke mana saja dan jalankan aksi tanpa lepas dari keyboard.',
  },
  {
    icon: Sparkles,
    label: 'Quick add ⌘⇧A',
    desc: 'Tangkap ide kapan saja sebelum keburu hilang.',
  },
  {
    icon: Calendar,
    label: 'Kalender',
    desc: 'Lihat semua due date dalam satu tampilan kalender.',
  },
  {
    icon: Moon,
    label: 'Dark mode',
    desc: 'Nyaman dipakai siang maupun malam.',
  },
  {
    icon: Smartphone,
    label: 'PWA installable',
    desc: 'Pasang sebagai aplikasi di desktop maupun ponsel.',
  },
];

/** Ikon Garap yang mengambang bebas di hero (gaya Artani). */
const HERO_ICONS: (typeof CheckSquare)[] = [
  CheckSquare,
  StickyNote,
  LinkIcon,
  FileText,
  Calendar,
  Tags,
  BookMarked,
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

export function LandingPage() {
  // Ikon mengambang + partikel naik — di-memo sekali agar posisi acak stabil.
  const floatingIcons: FloatingIcon[] = useMemo(() => {
    const anims: FloatAnim[] = [
      'animate-float-slow',
      'animate-float-medium',
      'animate-float-fast',
      'animate-bob',
    ];
    const tints = ['text-white/10', 'text-white/[0.14]', 'text-emerald-100/20', 'text-teal-100/15'];
    return Array.from({ length: 11 }).map((_, i) => ({
      id: i,
      Icon: HERO_ICONS[i % HERO_ICONS.length]!,
      top: `${6 + Math.random() * 80}%`,
      left: `${3 + Math.random() * 90}%`,
      size: 26 + Math.random() * 34,
      duration: 5 + Math.random() * 7,
      delay: -Math.random() * 6,
      tint: tints[i % tints.length]!,
      animation: anims[i % anims.length]!,
    }));
  }, []);

  const particles: Particle[] = useMemo(
    () =>
      Array.from({ length: 26 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 3 + Math.random() * 6,
        duration: 11 + Math.random() * 13,
        delay: -Math.random() * 16,
      })),
    [],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Top nav ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="inline-flex items-center gap-2.5">
            <BrandLogo className="h-8 w-8" />
            <span className="font-heading text-lg font-bold">{BRANDING.APP_NAME}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button asChild variant="ghost" size="icon" aria-label="GitHub (open source)">
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                <Github className="h-4 w-4" />
              </a>
            </Button>
            <ThemeToggle />
            <Button asChild size="sm">
              <Link to="/login">Masuk</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section
        className="animate-gradient-flow relative overflow-hidden text-white"
        style={{
          backgroundImage:
            'linear-gradient(135deg, #022c22 0%, #064e3b 22%, #0f766e 48%, #047857 72%, #0d9488 100%)',
          backgroundSize: '200% 200%',
        }}
      >
        {/* Cincin besar berputar lambat di belakang hero */}
        <div
          aria-hidden
          className="animate-spin-slow pointer-events-none absolute -top-1/3 -left-1/4 h-[140%] w-[140%] opacity-40"
          style={{
            background:
              'conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(255,255,255,0.06) 60deg, transparent 120deg, rgba(255,255,255,0.06) 200deg, transparent 260deg, rgba(255,255,255,0.06) 320deg, transparent 360deg)',
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

        {/* Gelombang transisi di bawah hero */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 overflow-hidden sm:h-32"
        >
          <svg
            className="animate-wave-x absolute inset-x-0 bottom-0 h-full w-[200%]"
            viewBox="0 0 1440 120"
            preserveAspectRatio="none"
          >
            <path
              d="M0,64 C240,96 480,32 720,64 C960,96 1200,32 1440,64 L1440,120 L0,120 Z"
              fill="rgba(255,255,255,0.06)"
            />
            <path
              d="M0,80 C240,48 480,112 720,80 C960,48 1200,112 1440,80 L1440,120 L0,120 Z"
              fill="rgba(255,255,255,0.04)"
            />
          </svg>
        </div>

        <div className="relative mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <div className="animate-in fade-in slide-in-from-bottom-3 mb-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs text-white/90 backdrop-blur-sm duration-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
            </span>
            <span>Personal second brain</span>
          </div>
          <h1 className="animate-in fade-in slide-in-from-bottom-4 font-heading text-4xl font-bold leading-tight tracking-tight text-white duration-700 sm:text-5xl md:text-6xl">
            Tempat menggarap
            <br />
            <span
              style={{
                backgroundImage:
                  'linear-gradient(120deg, #ffffff 0%, #d1fae5 40%, #a7f3d0 60%, #ccfbf1 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              task, project, dan file kerja
            </span>
          </h1>
          <p className="animate-in fade-in slide-in-from-bottom-4 mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/90 delay-150 duration-700 sm:text-lg">
            Satu rumah untuk task, project, note, link, dokumen, dan referensi — terhubung
            lewat tag universal dan siap dicari kapan saja.
          </p>
          <div className="animate-in fade-in slide-in-from-bottom-4 mt-8 flex flex-col items-center justify-center gap-3 delay-300 duration-700 sm:flex-row">
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="w-full bg-white text-emerald-800 shadow-xl shadow-black/10 hover:bg-white/90 sm:w-auto"
            >
              <Link to="/login">
                Masuk / Mulai
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full border-2 border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white sm:w-auto"
            >
              <a href="#fitur">Lihat fitur</a>
            </Button>
          </div>
          <p className="animate-in fade-in slide-in-from-bottom-4 mt-4 text-xs text-white/70 delay-500 duration-700">
            Daftar dengan email. Gratis untuk pemakaian personal.
          </p>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section id="fitur" className="border-t border-border bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
              Semua jenis kerjaan, satu tempat
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Garap menyatukan lima jenis konten inti di bawah satu hierarki workspace yang rapi.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.label} index={i} className="h-full">
                <Card className="group h-full transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110">
                      <f.icon className="h-5 w-5 group-hover:animate-bob" />
                    </div>
                    <h3 className="font-heading text-base font-semibold">{f.label}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Kenapa Garap ─────────────────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
              Kenapa Garap?
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Dirancang untuk cepat — tangkap, temukan, dan selesaikan tanpa friksi.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {REASONS.map((r, i) => (
              <Reveal key={r.label} index={i} className="flex gap-4">
                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <r.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-heading text-base font-semibold">{r.label}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{r.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="border-t border-border bg-gradient-to-br from-primary via-primary to-primary/70 text-primary-foreground">
        <Reveal className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            Mulai menggarap hari ini
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-primary-foreground/80 sm:text-base">
            Masuk dengan email dan rapikan semua kerjaanmu dalam satu tempat.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-8">
            <Link to="/login">
              Masuk / Mulai
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </Reveal>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 text-center sm:flex-row sm:justify-between sm:px-6 sm:text-left">
          <div className="inline-flex items-center gap-2.5">
            <BrandLogo className="h-6 w-6" />
            <span className="font-heading text-sm font-semibold">{BRANDING.APP_NAME}</span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link to="/terms" className="hover:text-foreground">
              Ketentuan Layanan
            </Link>
            <Link to="/privacy" className="hover:text-foreground">
              Kebijakan Privasi
            </Link>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-foreground"
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
          </nav>
          <a
            href={ARAHKARYA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground/70 transition-colors hover:text-foreground"
            title="Kunjungi arahkarya.com"
          >
            {BRANDING.COPYRIGHT}
          </a>
        </div>
      </footer>
    </div>
  );
}
