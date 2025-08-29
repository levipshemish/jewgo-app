// Middleware client for Next.js middleware
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

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

if (!isValidSupabaseUrl(supabaseUrl)) {
  console.warn('Invalid NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.warn('Expected format: https://your-project-id.supabase.co');
  console.warn('Got:', supabaseUrl);
}

if (!supabaseAnonKey) {
  console.warn('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');
}

export function createSupabaseMiddlewareClient(
  request: NextRequest,
  response: NextResponse
) {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not configured in middleware client.');
    // Return a fallback client that won't cause runtime errors
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
      },
    } as any;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          response.cookies.set(name, value, options);
        },
        remove(name: string, options: any) {
          response.cookies.set(name, "", { ...options, maxAge: 0 });
        },
      },
      // Completely disable realtime on middleware to prevent RealtimeClient errors
      realtime: {
        params: {
          eventsPerSecond: 0,
        },
      },
      global: {
        headers: {
          'X-Client-Info': 'jewgo-middleware',
        },
      },
    }
  );
  return supabase;
}
