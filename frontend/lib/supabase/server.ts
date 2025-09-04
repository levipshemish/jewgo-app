// This file is a placeholder to resolve build import errors
// The actual codebase uses PostgreSQL auth from @/lib/server/postgres-auth

console.warn('[DEPRECATED] supabase/server is deprecated. Use postgres-auth instead.');

export async function createServerSupabaseClient() {
  throw new Error('createServerSupabaseClient is deprecated. Use createServerPostgresClient from @/lib/server/postgres-auth instead.');
}

export default createServerSupabaseClient;
