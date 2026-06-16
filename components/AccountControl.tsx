'use client';

/**
 * blastimage — hosted-mode account control (BI-022.6)
 *
 * Signed-in operator's email + a sign-out button, pinned to the bottom of the
 * {@link Sidebar}. Renders nothing in local mode (no hook, no client) so the
 * local sidebar is byte-identical; the mode branch sits in the outer component
 * and the session hook in {@link HostedAccountControl}, per the AuthGate split.
 */

import { isHostedMode } from '@/lib/config';
import { signOut, useAuthSession } from '@/lib/auth';

export default function AccountControl() {
  if (!isHostedMode()) return null;
  return <HostedAccountControl />;
}

function HostedAccountControl() {
  const { session } = useAuthSession();
  if (!session) return null;

  const email = session.user.email ?? session.user.id;

  return (
    <div className="flex items-center gap-2 border-t border-black/10 p-3 dark:border-white/10">
      <span className="flex-1 truncate text-xs opacity-60" title={email}>
        {email}
      </span>
      <button
        className="rounded border border-black/15 px-2 py-1 text-xs hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
        onClick={() => void signOut()}
      >
        Sign out
      </button>
    </div>
  );
}
