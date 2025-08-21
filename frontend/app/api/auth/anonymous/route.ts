import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Simplified anonymous authentication endpoint
 * Node.js runtime required for cookies and Supabase SSR
 */
export const runtime = 'nodejs';

// Simplified CORS headers
function getSimpleCORSHeaders(origin?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Origin, Referer',
    'Access-Control-Allow-Credentials': 'true',
    'Cache-Control': 'no-store',
  };
  
  // Allow common origins
  const allowedOrigins = [
    'https://jewgo.app',
    'https://www.jewgo.app',
    'http://localhost:3000'
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  
  return headers;
}

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  return new Response(null, {
    status: 204,
    headers: getSimpleCORSHeaders(origin || undefined)
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('Anonymous auth POST request received');
    
    // Get origin for CORS
    const origin = request.headers.get('origin');
    
    // Basic environment validation
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Supabase environment variables not configured');
      return NextResponse.json(
        { error: 'CONFIGURATION_ERROR' },
        { 
          status: 500,
          headers: getSimpleCORSHeaders(origin || undefined)
        }
      );
    }
    
    // Create Supabase SSR client
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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
      }
    );
    
    console.log('Attempting anonymous signin...');
    
    // Create anonymous user
    const { data, error: signInError } = await supabase.auth.signInAnonymously();
    
    if (signInError) {
      console.error('Anonymous signin failed:', signInError);
      return NextResponse.json(
        { error: 'SIGNIN_FAILED', details: signInError.message },
        { 
          status: 500,
          headers: getSimpleCORSHeaders(origin || undefined)
        }
      );
    }
    
    console.log('Anonymous signin successful:', data.user?.id);
    
    // Success response
    return NextResponse.json(
      { 
        ok: true, 
        user_id: data.user?.id,
        message: 'Anonymous signin successful'
      },
      { 
        status: 200,
        headers: getSimpleCORSHeaders(origin || undefined)
      }
    );
    
  } catch (error) {
    console.error('Unexpected error in anonymous auth:', error);
    
    return NextResponse.json(
      { 
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { 
        status: 500,
        headers: getSimpleCORSHeaders(request.headers.get('origin') || undefined)
      }
    );
  }
}
