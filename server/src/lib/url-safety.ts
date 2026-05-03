import { promises as dns } from 'node:dns';
import net from 'node:net';

const PRIVATE_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /\.local$/i,
  /\.lan$/i,
  /\.internal$/i,
];

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true;
  const [a, b] = parts as [number, number, number, number];
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true; // link-local + AWS metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a >= 224) return true; // multicast + reserved
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::') return true;
  if (lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) return true;
  if (lower === '::ffff:0:0' || /^::ffff:/i.test(lower)) {
    const v4 = lower.replace(/^::ffff:/i, '');
    if (net.isIPv4(v4)) return isPrivateIPv4(v4);
  }
  return false;
}

export interface UrlSafetyResult {
  ok: boolean;
  reason?: string;
  hostname?: string;
}

export function isPublicHttpUrl(raw: string): UrlSafetyResult {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, reason: 'URL tidak valid' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, reason: 'Hanya http(s) yang diizinkan' };
  }
  const host = parsed.hostname;
  if (!host) return { ok: false, reason: 'Hostname kosong' };
  if (PRIVATE_HOSTNAME_PATTERNS.some((re) => re.test(host))) {
    return { ok: false, reason: 'Hostname privat tidak diizinkan' };
  }
  if (net.isIPv4(host) && isPrivateIPv4(host)) {
    return { ok: false, reason: 'Alamat IPv4 privat tidak diizinkan' };
  }
  if (net.isIPv6(host) && isPrivateIPv6(host)) {
    return { ok: false, reason: 'Alamat IPv6 privat tidak diizinkan' };
  }
  return { ok: true, hostname: host };
}

/**
 * Resolve hostname to IP and verify it's not a private/loopback range.
 * Use BEFORE making outbound HTTP requests to defend against DNS rebinding
 * and hostnames pointing at internal services. Returns the array of resolved
 * IPs (so caller can pin requests to those IPs if needed).
 */
export async function assertResolvableAsPublic(hostname: string): Promise<string[]> {
  const lookups = await dns.lookup(hostname, { all: true, verbatim: true });
  if (lookups.length === 0) {
    throw new Error('Hostname tidak bisa di-resolve');
  }
  for (const { address, family } of lookups) {
    if (family === 4 && isPrivateIPv4(address)) {
      throw new Error(`Resolved ke IP privat: ${address}`);
    }
    if (family === 6 && isPrivateIPv6(address)) {
      throw new Error(`Resolved ke IPv6 privat: ${address}`);
    }
  }
  return lookups.map((l) => l.address);
}
