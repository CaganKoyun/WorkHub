import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Role fixture helper — returns a Supabase client authenticated as one of
 * the seeded test users. Every RLS spec funnels through this so we never
 * hand-craft an auth flow inside a test.
 *
 * Env expected in .env.test.local (never checked in):
 *   SUPABASE_URL
 *   SUPABASE_PUBLISHABLE_KEY
 *   TEST_USER_<ROLE>_EMAIL / _PASSWORD  (per role in ROLES)
 *
 * Seed the users once via `supabase/seed/e2e-users.sql` (TBD). If any env
 * is missing, tests using this helper must skip — see `roleSpec()`.
 */

export const ROLES = ['owner', 'admin', 'manager', 'member', 'viewer'] as const;
export type Role = typeof ROLES[number];

export function envForRole(role: Role): { email?: string; password?: string } {
  const upper = role.toUpperCase();
  return {
    email: process.env[`TEST_USER_${upper}_EMAIL`],
    password: process.env[`TEST_USER_${upper}_PASSWORD`],
  };
}

export function hasRoleFixtures(...roles: Role[]): boolean {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) return false;
  return roles.every((r) => {
    const e = envForRole(r);
    return !!e.email && !!e.password;
  });
}

/** Fresh anon client + sign-in as the requested role. Fails fast if env missing. */
export async function clientAsRole(role: Role): Promise<SupabaseClient> {
  const { email, password } = envForRole(role);
  if (!email || !password) throw new Error(`No env for role ${role}`);
  const client = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}
