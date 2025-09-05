import { NextRequest, NextResponse } from 'next/server';
// import { cookies } from 'next/headers'; // TODO: Implement cookie handling
import { validateRedirectUrl } from '@/lib/utils/auth-utils';
// import { isPrivateRelayEmail } from '@/lib/utils/auth-utils'; // TODO: Implement email validation

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const error = searchParams.get('error');
    const next = searchParams.get('next') || searchParams.get('redirectTo') || '/location-access';
    const safeNext = validateRedirectUrl(next);

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error received:', error);
      const errorUrl = new URL('/auth/signin', request.url);
      errorUrl.searchParams.set('error', error);
      return NextResponse.redirect(errorUrl);
    }

    // PostgreSQL auth doesn't use OAuth callbacks in the same way as Supabase
    // This endpoint is kept for compatibility but doesn't perform OAuth processing
    console.log('Auth callback endpoint called - PostgreSQL auth doesn\'t require OAuth callback processing');
    
    // Redirect to the validated next URL
    return NextResponse.redirect(new URL(safeNext, request.url));

  } catch (error) {
    console.error('Auth callback processing failed:', error);
    return NextResponse.redirect(new URL('/auth/signin?error=callback_failed', request.url));
  }
}
