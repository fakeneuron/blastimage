'use client';

/**
 * blastimage — hosted-mode auth gate (BI-022.6)
 *
 * Wraps the workspace. In local mode it renders children straight through and
 * never touches Supabase (so local/submodule builds stay byte-identical). In
 * hosted mode it tracks the session: a neutral shell while loading, the
 * {@link LoginScreen} when signed out, the children once signed in.
 *
 * The mode branch lives in the outer component (no hooks) and the session hook
 * lives in {@link HostedGate} (always called when mounted), keeping the
 * rules-of-hooks intact while ensuring local mode never constructs the client.
 */

import type { ReactNode } from 'react';

import { isHostedMode } from '@/lib/config';
import { useAuthSession } from '@/lib/auth';
import LoginScreen from '@/components/LoginScreen';

export default function AuthGate({ children }: { children: ReactNode }) {
  if (!isHostedMode()) return <>{children}</>;
  return <HostedGate>{children}</HostedGate>;
}

function HostedGate({ children }: { children: ReactNode }) {
  const { session, loading } = useAuthSession();

  if (loading) {
    return (
      <main className="flex h-screen items-center justify-center">
        <p className="text-sm opacity-50">Loading…</p>
      </main>
    );
  }

  if (!session) return <LoginScreen />;

  return <>{children}</>;
}
