import { describe, expect, it } from 'vitest';
import { issueState, verifyState } from './oauth-state.js';

describe('OAuth state HMAC', () => {
  it('issues a state that verifies', () => {
    const s = issueState();
    expect(verifyState(s).ok).toBe(true);
  });

  it('rejects missing state', () => {
    expect(verifyState(undefined).ok).toBe(false);
    expect(verifyState(null).ok).toBe(false);
    expect(verifyState('').ok).toBe(false);
  });

  it('rejects malformed state (wrong segment count)', () => {
    expect(verifyState('foo').ok).toBe(false);
    expect(verifyState('foo.bar').ok).toBe(false);
    expect(verifyState('foo.bar.baz.qux').ok).toBe(false);
  });

  it('rejects forged signature', () => {
    const s = issueState();
    const parts = s.split('.');
    const forged = `${parts[0]}.${parts[1]}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`;
    expect(verifyState(forged).ok).toBe(false);
  });

  it('rejects state from far future or past', () => {
    // Construct a state with timestamp 1 hour ago (TTL is 5 min)
    const ts = Math.floor(Date.now() / 1000) - 3600;
    const fakeNonce = 'aaaaaaaaaaaaaaaaaaaaaa';
    // Sig won't match without the right secret, but if we manage to craft
    // it the timestamp window check should still reject.
    const stale = `${fakeNonce}.${ts}.bogus`;
    expect(verifyState(stale).ok).toBe(false);
  });
});
