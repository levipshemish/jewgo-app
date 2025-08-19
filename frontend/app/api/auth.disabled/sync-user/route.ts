import { NextRequest, NextResponse } from "next/server";

import { ensureUserSynced } from "@/lib/auth/user-sync";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // Get the current Supabase user
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get the request body
    const body = await request.json();
    const { email, name, image } = body;

    // Verify the email matches the authenticated user
    if (email !== user.email) {
      return NextResponse.json(
        { error: "Email mismatch" },
        { status: 400 }
      );
    }

    // Sync the user to Neon database
    const syncedUser = await ensureUserSynced(user);

    return NextResponse.json({
      success: true,
              user: {
          id: syncedUser.id,
          email: syncedUser.email,
          name: syncedUser.name,
          avatar_url: syncedUser.avatar_url,
          isSuperAdmin: syncedUser.isSuperAdmin,
          createdAt: syncedUser.createdAt,
          updatedAt: syncedUser.updatedAt,
        }
    });

  } catch (error) {
    console.error('User sync error:', error);
    return NextResponse.json(
      { error: "Failed to sync user" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get the current Supabase user
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Import the function here to avoid circular dependencies
    const { getNeonUserFromSupabase } = await import("@/lib/auth/user-sync");
    
    // Get the user from Neon database
    const neonUser = await getNeonUserFromSupabase(user);

    if (!neonUser) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
              user: {
          id: neonUser.id,
          email: neonUser.email,
          name: neonUser.name,
          avatar_url: neonUser.avatar_url,
          isSuperAdmin: neonUser.isSuperAdmin,
          createdAt: neonUser.createdAt,
          updatedAt: neonUser.updatedAt,
        }
    });

  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: "Failed to get user" },
      { status: 500 }
    );
  }
}
