import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { oauthLogger } from '@/lib/utils/logger';
import { attemptIdentityLinking } from '@/lib/utils/auth-utils.server';
import { errorResponses, createSuccessResponse } from '@/lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get current user session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      oauthLogger.error('User not authenticated for linking API', { error: userError?.message });
      return errorResponses.unauthorized();
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'link') {
      // Handle account linking using official Supabase Link API
      try {
        const linkingResult = await attemptIdentityLinking(user.id, 'any');
        
        if (linkingResult.success) {
          return createSuccessResponse({ message: 'Account linked successfully' });
        }
        
        if (linkingResult.requiresReAuth) {
          return createSuccessResponse({ message: 'Re-authentication required' });
        }
        
        return NextResponse.json({ error: linkingResult.error || 'Linking failed' }, { status: 500 });

      } catch (linkError) {
        oauthLogger.error('Identity linking failed', { 
          errorType: linkError instanceof Error ? linkError.constructor.name : 'Unknown',
          userId: user.id 
        });
        return errorResponses.internalError();
      }
    }

    if (action === 'reauthenticate') {
      // Handle re-authentication flow
      try {
        const { provider } = body;
        
        if (!provider) {
          return errorResponses.badRequest();
        }

        // Generate a secure state parameter for the re-authentication
        const state = crypto.randomUUID();
        
        // Store the state in a secure cookie or session
        // For now, we'll redirect to the OAuth flow with a special parameter
        
        const redirectUrl = `${request.nextUrl.origin}/auth/signin?provider=${provider}&reauth=true&state=${state}`;
        
        return createSuccessResponse({ message: 'Re-authentication initiated successfully' });

      } catch (reauthError) {
        oauthLogger.error('Re-authentication initiation failed', { 
          errorType: reauthError instanceof Error ? reauthError.constructor.name : 'Unknown',
          userId: user.id 
        });
        return errorResponses.internalError();
      }
    }

    return errorResponses.badRequest();

  } catch (error) {
    oauthLogger.error('Account linking API error', { 
      errorType: error instanceof Error ? error.constructor.name : 'Unknown'
    });
    return errorResponses.internalError();
  }
}

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get current user session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return errorResponses.unauthorized();
    }

    // Return user's current identity information
    return NextResponse.json({
      userId: user.id,
      email: user.email,
      identities: user.identities || [],
      hasMultipleIdentities: user.identities && user.identities.length > 1
    });

  } catch (error) {
    oauthLogger.error('Account linking GET error', { 
      errorType: error instanceof Error ? error.constructor.name : 'Unknown'
    });
    return errorResponses.internalError();
  }
}
