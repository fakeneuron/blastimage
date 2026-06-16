/**
 * auth helper tests (BI-022.6).
 *
 * Pins the OAuth wiring over the Supabase client: the provider + origin-redirect
 * passed to `signInWithOAuth`, and that client errors surface as throws. The
 * client is mocked — no real Supabase. `useAuthSession` is a React hook exercised
 * via the live local stack at verification, not here.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

const signInWithOAuth = vi.fn();
const signOutFn = vi.fn();

vi.mock('./supabaseClient', () => ({
  getSupabaseClient: () => ({ auth: { signInWithOAuth, signOut: signOutFn } }),
}));

import { signInWithProvider, signOut } from './auth';

afterEach(() => vi.clearAllMocks());

describe('signInWithProvider', () => {
  it('starts the OAuth flow with the provider and an origin redirect', async () => {
    signInWithOAuth.mockResolvedValue({ error: null });

    await signInWithProvider('google');

    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  });

  it('throws when the client rejects the request', async () => {
    signInWithOAuth.mockResolvedValue({ error: new Error('provider down') });

    await expect(signInWithProvider('github')).rejects.toThrow('provider down');
  });
});

describe('signOut', () => {
  it('delegates to the client', async () => {
    signOutFn.mockResolvedValue({ error: null });

    await signOut();

    expect(signOutFn).toHaveBeenCalledTimes(1);
  });

  it('throws when the client returns an error', async () => {
    signOutFn.mockResolvedValue({ error: new Error('sign-out failed') });

    await expect(signOut()).rejects.toThrow('sign-out failed');
  });
});
