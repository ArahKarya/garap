import { Link } from 'react-router-dom';
import { BRANDING } from '@garap/shared';
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
} from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

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
          <Button asChild size="sm">
            <Link to="/login">Masuk</Link>
          </Button>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
        />
        <div className="relative mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" />
            <span>Personal second brain</span>
          </div>
          <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
            Tempat menggarap
            <br />
            <span className="text-primary">task, project, dan file kerja</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Satu rumah untuk task, project, note, link, dokumen, dan referensi — terhubung
            lewat tag universal dan siap dicari kapan saja.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
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
          <p className="mt-4 text-xs text-muted-foreground/70">
            Masuk dengan akun Google. Gratis untuk pemakaian personal.
          </p>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section id="fitur" className="border-t border-border bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
              Semua jenis kerjaan, satu tempat
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Garap menyatukan lima jenis konten inti di bawah satu hierarki workspace yang rapi.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.label} className="h-full transition-colors hover:border-primary/40">
                <CardContent className="p-5">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-heading text-base font-semibold">{f.label}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Kenapa Garap ─────────────────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
              Kenapa Garap?
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Dirancang untuk cepat — tangkap, temukan, dan selesaikan tanpa friksi.
            </p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {REASONS.map((r) => (
              <div key={r.label} className="flex gap-4">
                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <r.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-heading text-base font-semibold">{r.label}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="border-t border-border bg-gradient-to-br from-primary via-primary to-primary/70 text-primary-foreground">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20">
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
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 text-center sm:flex-row sm:justify-between sm:px-6 sm:text-left">
          <div className="inline-flex items-center gap-2.5">
            <BrandLogo className="h-6 w-6" />
            <span className="font-heading text-sm font-semibold">{BRANDING.APP_NAME}</span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/terms" className="hover:text-foreground">
              Ketentuan Layanan
            </Link>
            <Link to="/privacy" className="hover:text-foreground">
              Kebijakan Privasi
            </Link>
          </nav>
          <p className="text-xs text-muted-foreground/70">{BRANDING.COPYRIGHT}</p>
        </div>
      </footer>
    </div>
  );
}
