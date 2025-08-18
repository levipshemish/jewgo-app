import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    const next = searchParams.get("next") ?? "/";

    // If there's an OAuth error from Google, redirect with error details
    if (error) {
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${error}&description=${errorDescription || 'OAuth error from Google'}`);
    }

    if (code) {
      const supabase = await createSupabaseServerClient();
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (exchangeError) {
        return NextResponse.redirect(`${origin}/auth/auth-code-error?error=exchange_failed&description=${exchangeError.message}`);
      }

      if (data.session) {
        return NextResponse.redirect(`${origin}${next}`);
      } else {
        return NextResponse.redirect(`${origin}/auth/auth-code-error?error=no_session&description=No session returned from code exchange`);
      }
    } else {
      // No code found - this might be a fragment-based OAuth flow
      // Redirect to OAuth success page which will handle the fragment client-side
      return NextResponse.redirect(`${origin}/auth/oauth-success`);
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.redirect(`${origin}/auth/auth-code-error?error=unexpected&description=${errorMessage}`);
  }
}
