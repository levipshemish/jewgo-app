import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Force logout endpoint that aggressively clears all auth state
 * This is a nuclear option when normal logout isn't working
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Force logout: Starting aggressive logout...');
    
    // Clear all possible auth cookies
    const cookieStore = await cookies();
    
    const authCookieNames = [
      'access_token',
      'refresh_token', 
      'auth_access_token',
      'auth_refresh_token',
      'session',
      'csrf_token',
      'auth_session',
      'jwt_token',
      'user_session'
    ];
    
    // Clear cookies for both current domain and api domain
    const domains = ['', '.jewgo.app', '.api.jewgo.app'];
    const paths = ['/', '/api', '/auth'];
    
    for (const cookieName of authCookieNames) {
      for (const domain of domains) {
        for (const path of paths) {
          try {
            cookieStore.set(cookieName, '', { 
              maxAge: 0, 
              httpOnly: true, 
              secure: true, 
              sameSite: 'lax',
              ...(domain && { domain }),
              path
            });
          } catch (e) {
            // Ignore individual cookie clear failures
          }
        }
      }
    }
    
    console.log('Force logout: All cookies cleared');
    
    return NextResponse.json({
      success: true,
      message: 'Force logout completed - all auth state cleared'
    });
    
  } catch (error) {
    console.error('Force logout error:', error);
    return NextResponse.json({
      success: false,
      error: 'Force logout failed'
    }, { status: 500 });
  }
}
