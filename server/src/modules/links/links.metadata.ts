import type { LinkPlatform } from '@prisma/client';
import { logger } from '../../lib/logger.js';
import { isPublicHttpUrl, assertResolvableAsPublic } from '../../lib/url-safety.js';

export interface LinkMetadata {
  title: string;
  description: string | null;
  faviconUrl: string | null;
  thumbnailUrl: string | null;
  canonicalUrl: string | null;
  platform: LinkPlatform;
}

const FETCH_TIMEOUT_MS = 5000;

/** Best-guess platform from hostname. */
export function detectPlatform(url: string): LinkPlatform {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.endsWith('drive.google.com') || host.endsWith('docs.google.com')) return 'GOOGLE_DRIVE';
    if (host === 'github.com' || host.endsWith('.github.com')) return 'GITHUB';
    if (host.endsWith('figma.com')) return 'FIGMA';
    if (host.endsWith('notion.so') || host.endsWith('notion.site')) return 'NOTION';
    if (host.endsWith('youtube.com') || host === 'youtu.be') return 'YOUTUBE';
    return 'GENERIC';
  } catch {
    return 'GENERIC';
  }
}

function pickAttr(html: string, regex: RegExp): string | null {
  const m = html.match(regex);
  return m?.[1]?.trim() || null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function absolute(rawUrl: string | null, base: string): string | null {
  if (!rawUrl) return null;
  try {
    return new URL(rawUrl, base).toString();
  } catch {
    return null;
  }
}

/**
 * Best-effort metadata fetch. Returns sane defaults on any failure (404,
 * timeout, parse error, etc.) — the link is still saved with whatever the
 * caller provided.
 */
export async function fetchMetadata(url: string): Promise<LinkMetadata> {
  const platform = detectPlatform(url);
  const fallback: LinkMetadata = {
    title: url,
    description: null,
    faviconUrl: null,
    thumbnailUrl: null,
    canonicalUrl: null,
    platform,
  };

  const safety = isPublicHttpUrl(url);
  if (!safety.ok || !safety.hostname) {
    logger.warn({ url, reason: safety.reason }, 'metadata fetch blocked (SSRF guard)');
    return fallback;
  }
  try {
    await assertResolvableAsPublic(safety.hostname);
  } catch (err) {
    logger.warn({ url, err: (err as Error).message }, 'metadata fetch blocked (DNS guard)');
    return fallback;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'PanggonMikirBot/0.1 (+https://panggonmikir.arahkarya.com)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!res.ok) {
      logger.warn({ url, status: res.status }, 'metadata fetch non-2xx');
      return fallback;
    }
    const html = (await res.text()).slice(0, 200_000); // cap at 200KB

    const ogTitle = pickAttr(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
    const titleTag = pickAttr(html, /<title[^>]*>([^<]+)<\/title>/i);
    const ogDesc =
      pickAttr(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ??
      pickAttr(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    const ogImage = pickAttr(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    const canonical = pickAttr(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
    const iconHref =
      pickAttr(html, /<link[^>]+rel=["'](?:shortcut icon|icon)["'][^>]+href=["']([^"']+)["']/i) ??
      '/favicon.ico';

    const finalUrl = res.url || url;
    return {
      title: decodeEntities((ogTitle ?? titleTag ?? url).slice(0, 500)),
      description: ogDesc ? decodeEntities(ogDesc).slice(0, 5000) : null,
      faviconUrl: absolute(iconHref, finalUrl),
      thumbnailUrl: absolute(ogImage, finalUrl),
      canonicalUrl: absolute(canonical, finalUrl),
      platform,
    };
  } catch (err) {
    logger.warn({ url, err: (err as Error).message }, 'metadata fetch failed');
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}
