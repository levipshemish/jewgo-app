import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { oauthLogger } from '@/lib/utils/logger';
import { attemptIdentityLinking } from '@/lib/utils/auth-utils.server';

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, targetProvider, targetEmail } = body;

    if (action === 'link') {
      // Handle account linking using official Supabase Link API
      try {
        const linkingResult = await attemptIdentityLinking(user.id, 'any');
        
        if (linkingResult.success) {
          return NextResponse.json({ success: true, message: 'No linking needed' });
        }
        
        if (linkingResult.requiresReAuth) {
          return NextResponse.json({ 
            success: true, 
            message: 'Re-authentication required',
            requiresReAuth: true,
            providers: user.identities?.map(id => id.provider) || []
          });
        }
        
        return NextResponse.json({ error: linkingResult.error || 'Linking failed' }, { status: 500 });

      } catch (linkError) {
        oauthLogger.error('Identity linking failed', { 
          errorType: linkError instanceof Error ? linkError.constructor.name : 'Unknown',
          userId: user.id 
        });
        return NextResponse.json({ error: 'Linking failed' }, { status: 500 });
      }
    }

    if (action === 'reauthenticate') {
      // Handle re-authentication flow
      try {
        const { provider } = body;
        
        if (!provider) {
          return NextResponse.json({ error: 'Provider required' }, { status: 400 });
        }

        // Generate a secure state parameter for the re-authentication
        const state = crypto.randomUUID();
        
        // Store the state in a secure cookie or session
        // For now, we'll redirect to the OAuth flow with a special parameter
        
        const redirectUrl = `${request.nextUrl.origin}/auth/signin?provider=${provider}&reauth=true&state=${state}`;
        
        return NextResponse.json({ 
          success: true, 
          redirectUrl,
          message: 'Re-authentication initiated'
        });

      } catch (reauthError) {
        oauthLogger.error('Re-authentication initiation failed', { 
          errorType: reauthError instanceof Error ? reauthError.constructor.name : 'Unknown',
          userId: user.id 
        });
        return NextResponse.json({ error: 'Re-authentication failed' }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    oauthLogger.error('Account linking API error', { 
      errorType: error instanceof Error ? error.constructor.name : 'Unknown'
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get current user session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
