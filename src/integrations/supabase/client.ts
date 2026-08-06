import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

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

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  global: {
    fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
  },
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: false,
    autoRefreshToken: false,
  },
});
