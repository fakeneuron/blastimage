'use client';

/**
 * blastimage — hosted-mode auth helpers (BI-022.6)
 *
 * OAuth (Google/GitHub) sign-in, sign-out, and a session-tracking hook over the
 * BI-022.3 Supabase browser client ({@link getSupabaseClient}). The signed-in
 * session is what populates `auth.uid()` for the owner-scoped RLS policies
 * (see `supabase/migrations`).
 *
 * These helpers assume hosted mode — they construct the Supabase client. Callers
 * gate on {@link import('./config').isHostedMode} before mounting them
 * ({@link import('@/components/AuthGate')} /
 * {@link import('@/components/AccountControl')}), so a local build never
 * constructs the client. The implicit OAuth flow needs no callback route: the
 * provider redirects back to the app origin and the browser client's default
 * `detectSessionInUrl` parses the session from the URL on load.
 */

import { useEffect, useState } from 'react';
import type { Session as SupabaseSession } from '@supabase/supabase-js';

import { getSupabaseClient } from './supabaseClient';

/** OAuth providers wired for hosted-mode login. */
export type OAuthProvider = 'google' | 'github';

/**
 * Starts the OAuth redirect flow for the given provider. Resolves once the
 * redirect is initiated (the browser then navigates away); throws if the client
 * rejects the request.
 */
export async function signInWithProvider(provider: OAuthProvider): Promise<void> {
  const { error } = await getSupabaseClient().auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
}

/** Signs the current operator out, clearing the persisted session. */
export async function signOut(): Promise<void> {
  const { error } = await getSupabaseClient().auth.signOut();
  if (error) throw error;
}

/** Current auth state: the active Supabase session (or null) plus a load flag. */
export interface AuthState {
  session: SupabaseSession | null;
  loading: boolean;
}

/**
 * Tracks the active Supabase session: seeds from `getSession()` then follows
 * `onAuthStateChange` (sign-in via the redirect, sign-out, token refresh).
 * Hosted-mode only — mount it behind an {@link import('./config').isHostedMode}
 * gate so local builds never construct the client.
 */
export function useAuthSession(): AuthState {
  const [state, setState] = useState<AuthState>({ session: null, loading: true });

  useEffect(() => {
    const client = getSupabaseClient();
    let active = true;

    void client.auth.getSession().then(({ data }) => {
      if (active) setState({ session: data.session, loading: false });
    });

    const { data } = client.auth.onAuthStateChange((_event, session) => {
      if (active) setState({ session, loading: false });
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return state;
}
