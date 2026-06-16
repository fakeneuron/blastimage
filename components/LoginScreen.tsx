'use client';

/**
 * blastimage — hosted-mode login screen (BI-022.6)
 *
 * Full-screen centered sign-in card shown to unauthenticated hosted-mode users
 * (gated by {@link import('@/components/AuthGate')}). Each button starts the
 * OAuth redirect for its provider; on success the browser navigates away, so
 * the pending state only clears on error.
 */

import { useState } from 'react';

import { signInWithProvider, type OAuthProvider } from '@/lib/auth';

export default function LoginScreen() {
  const [pending, setPending] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn(provider: OAuthProvider) {
    setError(null);
    setPending(provider);
    try {
      await signInWithProvider(provider);
      // On success the browser redirects to the provider; control does not
      // return here. If it does (no redirect issued), clear the spinner.
      setPending(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed. Please try again.');
      setPending(null);
    }
  }

  return (
    <main className="flex h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-lg border border-black/10 p-8 text-center dark:border-white/10">
        <h1 className="text-lg font-semibold">blastimage</h1>
        <p className="mt-1 text-sm opacity-60">Sign in to your workspace</p>

        <div className="mt-6 flex flex-col gap-2">
          <button
            disabled={pending !== null}
            onClick={() => handleSignIn('google')}
            className="rounded border border-black/15 px-3 py-2 text-sm font-medium hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:hover:bg-white/10"
          >
            {pending === 'google' ? 'Redirecting…' : 'Sign in with Google'}
          </button>
          <button
            disabled={pending !== null}
            onClick={() => handleSignIn('github')}
            className="rounded border border-black/15 px-3 py-2 text-sm font-medium hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:hover:bg-white/10"
          >
            {pending === 'github' ? 'Redirecting…' : 'Sign in with GitHub'}
          </button>
        </div>

        {error && <p className="mt-4 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </main>
  );
}
