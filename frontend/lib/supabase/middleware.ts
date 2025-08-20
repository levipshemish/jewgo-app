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
  console.error('Invalid NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.error('Expected format: https://your-project-id.supabase.co');
  console.error('Got:', supabaseUrl);
  throw new Error('Invalid NEXT_PUBLIC_SUPABASE_URL. Expected Supabase project URL, got database connection string.');
}

if (!supabaseAnonKey) {
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
}

export function createSupabaseMiddlewareClient(
  request: NextRequest,
  response: NextResponse
) {
  const supabase = createServerClient(
    supabaseUrl!,
    supabaseAnonKey!,
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
      // Disable realtime on middleware to prevent RealtimeClient errors
      realtime: {
        params: {
          eventsPerSecond: 10,
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
