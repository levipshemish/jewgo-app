/**
 * Supabase Admin Client with Service Role Key
 * This client should be used for administrative operations that require elevated permissions
 * DO NOT use this for user-specific operations - use the regular server client instead
 */

import { createClient } from "@supabase/supabase-js";

export function createAdminSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables for admin client');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
