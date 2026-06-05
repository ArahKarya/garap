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

export function LandingPage() {
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
      <section className="relative overflow-hidden">
        {/* Ambient decorative orbs — slow, subtle, infinite (reduced-motion aware) */}
        <div
          aria-hidden
          className="animate-float absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
        />
        <div
          aria-hidden
          className="animate-breathe pointer-events-none absolute top-10 left-[12%] h-64 w-64 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden
          className="animate-breathe pointer-events-none absolute top-24 right-[8%] h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl"
          style={{ animationDelay: '2s', animationDuration: '9s' }}
        />
        <div className="relative mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <div
            className="animate-fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground"
            style={{ animationDelay: '60ms' }}
          >
            <Sparkles className="h-3 w-3 text-primary" />
            <span>Personal second brain</span>
          </div>
          <h1
            className="animate-fade-up font-heading text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl"
            style={{ animationDelay: '160ms' }}
          >
            Tempat menggarap
            <br />
            <span className="text-primary">task, project, dan file kerja</span>
          </h1>
          <p
            className="animate-fade-up mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
            style={{ animationDelay: '280ms' }}
          >
            Satu rumah untuk task, project, note, link, dokumen, dan referensi — terhubung
            lewat tag universal dan siap dicari kapan saja.
          </p>
          <div
            className="animate-fade-up mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
            style={{ animationDelay: '400ms' }}
          >
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link to="/login">
                Masuk / Mulai
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <a href="#fitur">Lihat fitur</a>
            </Button>
          </div>
          <p
            className="animate-fade-up mt-4 text-xs text-muted-foreground/70"
            style={{ animationDelay: '500ms' }}
          >
            Masuk dengan akun Google. Gratis untuk pemakaian personal.
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
                <Card className="h-full transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <f.icon className="h-5 w-5" />
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
            Masuk dengan akun Google dan rapikan semua kerjaanmu dalam satu tempat.
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
