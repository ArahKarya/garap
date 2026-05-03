import { describe, expect, it } from 'vitest';
import { isPublicHttpUrl } from './url-safety.js';

describe('isPublicHttpUrl', () => {
  it.each([
    ['https://example.com', true],
    ['http://example.com', true],
    ['https://sub.example.co.id/path', true],
  ])('accept %s', (url, expected) => {
    expect(isPublicHttpUrl(url).ok).toBe(expected);
  });

  it.each([
    'http://localhost:3000',
    'http://127.0.0.1',
    'http://10.0.0.1',
    'http://192.168.1.1',
    'http://172.16.0.1',
    'http://169.254.169.254', // AWS metadata
    'http://0.0.0.0',
    'http://my-server.local',
    'http://internal-api.internal',
    'file:///etc/passwd',
    'javascript:alert(1)',
    'ftp://ftp.example.com',
    'not a url',
    '',
  ])('reject %s', (url) => {
    expect(isPublicHttpUrl(url).ok).toBe(false);
  });
});
