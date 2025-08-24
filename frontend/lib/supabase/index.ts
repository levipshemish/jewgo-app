/**
 * Unified Supabase client exports
 * Use createServerSupabaseClient for server-side (SSR, API routes, middleware)
 * Use createClientSupabaseClient for client-side (components, browser)
 */

// Server-side client (SSR, API routes, server actions)
export { createServerSupabaseClient } from './server';

// Client-side secure client (browser components)
export { createClientSupabaseClient, supabaseClient } from './client-secure';

// Deprecated exports (remove these gradually)
export { supabaseBrowser } from './client';
export { createSupabaseServerClient } from './server';
