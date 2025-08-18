// Browser client (for client components)
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if the URL is valid (should be a Supabase project URL, not a database connection string)
const isValidSupabaseUrl = (url: string | undefined): boolean => {
  if (!url) {
    return false;
  }
  // Should be a valid HTTPS URL ending with .supabase.co
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'https:' && urlObj.hostname.endsWith('.supabase.co');
  } catch {
    return false;
  }
};

// Create a fallback client for development when env vars are missing
const createFallbackClient = () => {
  // console.warn('Supabase environment variables not configured. Using fallback client.');
  return createClient(
    'https://placeholder.supabase.co',
    'placeholder-key',
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    }
  );
};

// Singleton pattern to prevent multiple instances
let supabaseBrowserInstance: SupabaseClient | null = null;

export const supabaseBrowser = (() => {
  if (supabaseBrowserInstance) {
    return supabaseBrowserInstance;
  }

  if (!isValidSupabaseUrl(supabaseUrl)) {
    // console.warn('Invalid NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
    // console.warn('Expected format: https://your-project-id.supabase.co');
    supabaseBrowserInstance = createFallbackClient();
    return supabaseBrowserInstance;
  }

  if (!supabaseAnonKey) {
    // console.warn('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');
    supabaseBrowserInstance = createFallbackClient();
    return supabaseBrowserInstance;
  }

  supabaseBrowserInstance = createClient(
    supabaseUrl!,
    supabaseAnonKey!,
    {
      auth: {
        // Keep cookies-first auth; tokens auto-refresh in browser
        persistSession: true,
        autoRefreshToken: true,
      },
    }
  );

  return supabaseBrowserInstance;
})();
