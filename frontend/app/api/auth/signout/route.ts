import { NextRequest, NextResponse} from 'next/server';
import { cookies} from 'next/headers';
import { createServerClient} from '@supabase/ssr';
import { getCORSHeaders} from '@/lib/config/environment';

// export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin') || undefined;
  return new Response(null, {
    status: 204,
    headers: getCORSHeaders(origin)
  });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const baseHeaders = getCORSHeaders(origin || undefined);

  try {
    // Create SSR Supabase client bound to cookies
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(name: string, value: string, options: any) { cookieStore.set({ name, value, ...options }); },
          remove(name: string, options: any) { cookieStore.set({ name, value: '', ...options, maxAge: 0 }); },
        },
      }
    );

    // Sign out the user
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Sign out error:', error);
      return NextResponse.json({ error: 'SIGNOUT_FAILED' }, { status: 500, headers: baseHeaders });
    }

    return NextResponse.json({ ok: true }, { status: 200, headers: baseHeaders });

  } catch (error) {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500, headers: baseHeaders });
  }
}
