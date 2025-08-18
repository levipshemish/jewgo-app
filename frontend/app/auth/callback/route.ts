import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    try {
      const supabase = await createSupabaseServerClient();
      
      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('Auth callback error:', error);
        return NextResponse.redirect(`${origin}/auth/signin?error=auth_callback_failed`);
      }

      if (data.session) {
        // Successful authentication
        return NextResponse.redirect(`${origin}${next}`);
      }
    } catch (error) {
      console.error('Auth callback exception:', error);
      return NextResponse.redirect(`${origin}/auth/signin?error=auth_callback_exception`);
    }
  }

  // If no code or error occurred, redirect to sign in
  return NextResponse.redirect(`${origin}/auth/signin?error=no_code`);
}
