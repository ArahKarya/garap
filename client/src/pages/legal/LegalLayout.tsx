import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { BRANDING } from '@garap/shared';
import { BrandLogo } from '@/components/BrandLogo';
import { ThemeToggle } from '@/components/theme-toggle';

export interface LegalSection {
  heading: string;
  body: ReactNode;
}

interface LegalLayoutProps {
  title: string;
  effectiveDate: string;
  intro: ReactNode;
  sections: LegalSection[];
}

/**
 * Shared shell for public legal pages (Terms, Privacy). Renders a back-link,
 * disclaimer banner, intro paragraph, and numbered sections. Pure presentation
 * — no external markdown dependency, content passed as React nodes.
 */
export function LegalLayout({ title, effectiveDate, intro, sections }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <BrandLogo className="h-7 w-7" />
            <span className="font-heading text-base font-bold">{BRANDING.APP_NAME}</span>
          </Link>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Beranda
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Berlaku sejak: {effectiveDate}</p>

        <div className="mt-6 flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Template awal, bukan nasihat hukum — mohon ditinjau oleh profesional hukum sebelum
            digunakan di lingkungan produksi.
          </p>
        </div>

        <div className="mt-8 space-y-4 text-sm leading-relaxed text-muted-foreground">{intro}</div>

        <div className="mt-10 space-y-8">
          {sections.map((section, idx) => (
            <section key={section.heading}>
              <h2 className="font-heading text-lg font-semibold text-foreground">
                {idx + 1}. {section.heading}
              </h2>
              <div className="mt-2 space-y-3 text-sm leading-relaxed text-muted-foreground">
                {section.body}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-14 border-t border-border pt-6 text-center text-xs text-muted-foreground/70">
          <div className="mb-3 flex justify-center gap-6">
            <Link to="/terms" className="hover:text-foreground">
              Ketentuan Layanan
            </Link>
            <Link to="/privacy" className="hover:text-foreground">
              Kebijakan Privasi
            </Link>
          </div>
          {BRANDING.COPYRIGHT}
        </footer>
      </main>
    </div>
  );
}
