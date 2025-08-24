// RSC-safe server client for Server Components & Server Actions
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  
  // Fail fast on invalid configuration to avoid creating placeholder clients
  if (!isValidSupabaseUrl(supabaseUrl)) {
    throw new Error('Invalid NEXT_PUBLIC_SUPABASE_URL. Expected https://<project>.supabase.co');
  }
  if (!supabaseAnonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
  }
  
  const supabase = createServerClient(
    supabaseUrl!,
    supabaseAnonKey!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
      // Completely disable realtime on server side to prevent RealtimeClient errors
      realtime: {
        params: {
          eventsPerSecond: 0,
        },
      },
      global: {
        headers: {
          'X-Client-Info': 'jewgo-server',
        },
      },
    }
  );
  return supabase;
}
