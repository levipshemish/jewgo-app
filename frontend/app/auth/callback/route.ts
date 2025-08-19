import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const accessToken = searchParams.get("access_token");
  const refreshToken = searchParams.get("refresh_token");
  const redirectTo = searchParams.get("redirectTo") ?? "/";

  console.log('Auth callback received:', { 
    hasCode: !!code, 
    hasAccessToken: !!accessToken, 
    hasRefreshToken: !!refreshToken,
    redirectTo 
  });

  // Handle OAuth code flow (standard Supabase flow)
  if (code) {
    try {
      const supabase = await createSupabaseServerClient();
      
      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('Auth callback error:', error);
        return NextResponse.redirect(`${origin}/auth/signin?error=auth_callback_failed&redirectTo=${encodeURIComponent(redirectTo)}`);
      }

      if (data.session) {
        console.log('Session established via code exchange');
        // Successful authentication - redirect to the intended page
        return NextResponse.redirect(`${origin}${redirectTo}`);
      }
    } catch (error) {
      console.error('Auth callback exception:', error);
      return NextResponse.redirect(`${origin}/auth/signin?error=auth_callback_exception&redirectTo=${encodeURIComponent(redirectTo)}`);
    }
  }

  // Handle direct token flow (Google OAuth returning tokens directly)
  if (accessToken && refreshToken) {
    try {
      const supabase = await createSupabaseServerClient();
      
      // Set the session with the provided tokens
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      
      if (error) {
        console.error('Token session error:', error);
        return NextResponse.redirect(`${origin}/auth/signin?error=token_session_failed&redirectTo=${encodeURIComponent(redirectTo)}`);
      }

      if (data.session) {
        console.log('Session established via direct tokens');
        // Successful authentication - redirect to the intended page
        return NextResponse.redirect(`${origin}${redirectTo}`);
      }
    } catch (error) {
      console.error('Token session exception:', error);
      return NextResponse.redirect(`${origin}/auth/signin?error=token_session_exception&redirectTo=${encodeURIComponent(redirectTo)}`);
    }
  }

  // If no code or tokens, redirect to sign in
  console.log('No authentication code or tokens found');
  return NextResponse.redirect(`${origin}/auth/signin?error=no_code&redirectTo=${encodeURIComponent(redirectTo)}`);
}
