/**
 * blastimage — Supabase browser client (BI-022.3)
 *
 * A lazily-constructed singleton `SupabaseClient` for hosted mode. The client
 * persists its auth session in localStorage and attaches the logged-in
 * operator's JWT to every request, so the owner-scoped RLS policies
 * (see `supabase/migrations`) resolve `auth.uid()` to that operator.
 *
 * The login flow that populates the session is BI-022.6; this task only needs
 * the client to exist and carry whatever session is present. The client is
 * built lazily so local mode (which never imports the resolved Supabase
 * adapter) never constructs it and never needs the Supabase env.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { supabaseConfig } from './config';

let client: SupabaseClient | null = null;

/** Returns the singleton Supabase client, constructing it on first use. */
export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    const { url, anonKey } = supabaseConfig();
    client = createClient(url, anonKey);
  }
  return client;
}
