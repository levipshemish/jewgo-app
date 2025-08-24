/**
 * Unified Supabase client exports
 * Use createServerSupabaseClient for server-side (SSR, API routes, middleware)
 * Use createClientSupabaseClient for client-side (components, browser)
 */

// Client-side secure client (browser components)
export { createClientSupabaseClient, supabaseClient } from './client-secure';

// Deprecated exports (remove these gradually)
export { supabaseBrowser } from './client';

// Server-side exports (only for server components and API routes)
export type { createServerSupabaseClient } from './server';
