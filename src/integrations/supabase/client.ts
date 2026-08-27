import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

function pickEnv(...keys: string[]): string | undefined {
  const env = import.meta.env as Record<string, string | undefined>;
  for (const k of keys) {
    const v = env[k];
    if (v && v.length > 0) return v;
  }
  return undefined;
}

export const SUPABASE_URL = pickEnv(
  'VITE_SUPABASE_URL',
  'NEXT_PUBLIC_workhub_SUPABASE_URL',
  'workhub_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
);

export const SUPABASE_PUBLISHABLE_KEY = pickEnv(
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_workhub_SUPABASE_PUBLISHABLE_KEY',
  'workhub_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_workhub_SUPABASE_ANON_KEY',
  'workhub_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
);

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

// Auth0 → Supabase bridge: AuthProvider registers a getter that returns the
// current Auth0 access token. Supabase forwards it as Bearer on every request
// so RLS policies see the Auth0 `sub` via auth.jwt().
let auth0TokenGetter: (() => Promise<string | null>) | null = null;

export function setSupabaseAuthTokenGetter(getter: (() => Promise<string | null>) | null) {
  auth0TokenGetter = getter;
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return async (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
    }

    if (auth0TokenGetter) {
      try {
        const token = await auth0TokenGetter();
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
        }
      } catch {
        // Not authenticated yet — send request with apikey only.
      }
    }

    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!, {
  global: {
    fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY!),
  },
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: false,
    autoRefreshToken: false,
  },
});
