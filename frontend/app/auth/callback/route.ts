import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { validateRedirectUrl } from '@/lib/utils/auth-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const next = searchParams.get('next') || searchParams.get('redirectTo') || '/location-access';
    const safeNext = validateRedirectUrl(next);

    console.log('OAuth callback received:', { 
      hasCode: !!code, 
      hasError: !!error, 
      next: safeNext,
      url: request.url 
    });

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error received:', error);
      const errorUrl = new URL('/auth/signin', request.url);
      errorUrl.searchParams.set('error', error);
      return NextResponse.redirect(errorUrl);
    }

    if (!code) {
      console.error('OAuth callback missing authorization code');
      return NextResponse.redirect(new URL('/auth/signin?error=no_code', request.url));
    }

    // Perform server-side code exchange
    const supabase = await createSupabaseServerClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (exchangeError) {
      console.error('OAuth code exchange failed:', exchangeError);
      return NextResponse.redirect(new URL('/auth/signin?error=invalid_grant', request.url));
    }

    // Get user data
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      console.log('OAuth authentication successful for user:', user.id);
    }

    // Redirect to the validated next URL
    console.log('Redirecting to:', safeNext);
    return NextResponse.redirect(new URL(safeNext, request.url));

  } catch (error) {
    console.error('OAuth callback processing failed:', error);
    return NextResponse.redirect(new URL('/auth/signin?error=callback_failed', request.url));
  }
}
