import { BRANDING } from '@panggonmikir/shared';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  className?: string;
  /** When true, swap to dark-mode logo regardless of theme — useful for
   *  always-dark surfaces (e.g. login showcase pane). */
  forceDark?: boolean;
}

/**
 * Theme-aware app logo. Renders both variants (black-on-light, white-on-dark)
 * and swaps via Tailwind `dark:` variant. The two icons are in
 * `client/public/icons/` and configured in `BRANDING.LOGO_LIGHT/DARK`.
 *
 * Convention: LOGO_LIGHT = logo for LIGHT mode (dark-colored ink),
 *             LOGO_DARK  = logo for DARK mode (white ink).
 */
export function BrandLogo({ className, forceDark = false }: BrandLogoProps) {
  if (forceDark) {
    return (
      <img
        src={BRANDING.LOGO_DARK}
        alt={BRANDING.APP_NAME}
        className={className}
      />
    );
  }
  return (
    <>
      <img
        src={BRANDING.LOGO_LIGHT}
        alt={BRANDING.APP_NAME}
        className={cn('block dark:hidden', className)}
      />
      <img
        src={BRANDING.LOGO_DARK}
        alt={BRANDING.APP_NAME}
        className={cn('hidden dark:block', className)}
      />
    </>
  );
}
