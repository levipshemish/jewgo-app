import { NextRequest, NextResponse } from "next/server";
import { TransitionManager } from "@/lib/auth/transition-manager";

export async function GET(_request: NextRequest) {
  try {
    const transitionManager = TransitionManager.getInstance();
    const config = transitionManager.getConfig();
    const stats = await transitionManager.getTransitionStats();
    const readiness = await transitionManager.validateTransitionReadiness();
    const phase = transitionManager.getTransitionPhase();
    
    return NextResponse.json({
      config,
      stats,
      readiness,
      phase
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to get transition data: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    const transitionManager = TransitionManager.getInstance();
    
    switch (action) {
      case 'enable_redirect':
        transitionManager.updateConfig({ redirectToSupabase: true });
        return NextResponse.json({
          message: "Supabase redirect enabled - users will be redirected to Supabase auth"
        });
        
      case 'disable_redirect':
        transitionManager.updateConfig({ redirectToSupabase: false });
        return NextResponse.json({
          message: "Supabase redirect disabled - users can choose auth method"
        });
        
      case 'complete_transition':
        await transitionManager.completeTransition();
        return NextResponse.json({
          message: "Transition to Supabase-only completed successfully"
        });
        
      case 'rollback':
        await transitionManager.rollbackTransition();
        return NextResponse.json({
          message: "Transition rolled back - NextAuth re-enabled"
        });
        
      case 'update_config':
        const { config } = body;
        if (config) {
          transitionManager.updateConfig(config);
          return NextResponse.json({
            message: "Transition configuration updated"
          });
        } else {
          return NextResponse.json(
            { error: "Configuration object required" },
            { status: 400 }
          );
        }
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: enable_redirect, disable_redirect, complete_transition, rollback, or update_config' },
          { status: 400 }
        );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Transition action failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}
