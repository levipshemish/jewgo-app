import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { FEATURE_FLAGS } from '@/lib/config/environment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      FEATURE_ANONYMOUS_AUTH: process.env.FEATURE_ANONYMOUS_AUTH,
      FEATURE_FLAGS_ANONYMOUS_AUTH: FEATURE_FLAGS.ANONYMOUS_AUTH
    };

    // Test Supabase client creation
    let supabaseClientOk = false;
    let signInAnonymouslyAvailable = false;
    let errorMessage = null;

    try {
      const cookieStore = await cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value;
            },
            set(name: string, value: string, options: any) {
              cookieStore.set(name, value, options);
            },
            remove(name: string, options: any) {
              cookieStore.set(name, '', { ...options, maxAge: 0 });
            },
          },
        }
      );
      
      supabaseClientOk = true;
      
      // Check if signInAnonymously method exists
      signInAnonymouslyAvailable = typeof supabase.auth.signInAnonymously === 'function';
      
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: envCheck,
      supabase: {
        clientCreated: supabaseClientOk,
        signInAnonymouslyAvailable,
        error: errorMessage
      },
      runtime: 'nodejs',
      headers: {
        origin: request.headers.get('origin'),
        'content-type': request.headers.get('content-type')
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Debug endpoint error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
