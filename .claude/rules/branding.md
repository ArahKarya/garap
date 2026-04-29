# Branding Rules

## Identitas

- **Nama Aplikasi**: ArahKarya
- **Nama Legal**: PT Arah Karya Sinergi
- **Copyright**: © ArahKarya — PT Arah Karya Sinergi

## Logo

Dua varian di `client/public/icons/`:
- `icon-arah-bk.png` — hitam (untuk light background)
- `icon-arah-wh.png` — putih (untuk dark background)

PWA icons (di-generate dari source):
- `icon-192.png` — 192x192 (home screen)
- `icon-512.png` — 512x512 (splash screen)
- `icon-maskable-512.png` — 512x512 (adaptive icon)

## Single Source of Truth

Semua branding WAJIB dari `BRANDING` constant, JANGAN hard-code:
```ts
import { BRANDING } from '@arahkarya/shared';

BRANDING.APP_NAME      // nama app
BRANDING.LEGAL_NAME    // nama legal PT
BRANDING.COPYRIGHT     // teks copyright lengkap
BRANDING.LOGO_LIGHT    // path logo untuk light mode
BRANDING.LOGO_DARK     // path logo untuk dark mode
```

## Tempat Wajib Tampil

1. Login page — logo (light/dark) + copyright
2. Sidebar header — logo + nama app
3. Sidebar footer — copyright (saat expanded)
4. PWA manifest — icons
5. Favicon — `client/public/favicon.ico`

## Saat Bikin App Baru

1. Edit `BRANDING` di `packages/shared/src/constants/index.ts`
2. Ganti file icon di `client/public/icons/`
3. Update `manifest.json` (name, short_name, theme_color)
4. Regenerate favicon dari icon baru
