import { NextRequest, NextResponse } from "next/server";
import { CleanupManager } from "@/lib/auth/cleanup-manager";

export async function GET(_request: NextRequest) {
  try {
    const cleanupManager = CleanupManager.getInstance();
    const stats = await cleanupManager.getCleanupStats();
    const safety = await cleanupManager.validateCleanupSafety();
    
    return NextResponse.json({
      stats,
      safety
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to get cleanup data: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    const cleanupManager = CleanupManager.getInstance();
    
    switch (action) {
      case 'cleanup_sessions':
        const sessionsResult = await cleanupManager.cleanupOrphanedSessions();
        return NextResponse.json({
          message: `Cleaned up ${sessionsResult.cleaned} orphaned sessions`,
          ...sessionsResult
        });
        
      case 'cleanup_accounts':
        const accountsResult = await cleanupManager.cleanupOrphanedAccounts();
        return NextResponse.json({
          message: `Cleaned up ${accountsResult.cleaned} orphaned accounts`,
          ...accountsResult
        });
        
      case 'merge_duplicates':
        const duplicatesResult = await cleanupManager.mergeDuplicateUsers();
        return NextResponse.json({
          message: `Merged ${duplicatesResult.cleaned} duplicate users`,
          ...duplicatesResult
        });
        
      case 'cleanup_logs':
        const logsResult = await cleanupManager.cleanupOldMigrationLogs();
        return NextResponse.json({
          message: `Cleaned up ${logsResult.cleaned} old migration logs`,
          ...logsResult
        });
        
      case 'remove_passwords':
        const passwordsResult = await cleanupManager.removeNextAuthPasswords();
        return NextResponse.json({
          message: `Removed passwords from ${passwordsResult.cleaned} users`,
          ...passwordsResult
        });
        
      case 'complete_cleanup':
        const completeResult = await cleanupManager.performCompleteCleanup();
        return NextResponse.json({
          message: `Complete cleanup finished: ${completeResult.totalCleaned} items cleaned`,
          ...completeResult
        });
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: cleanup_sessions, cleanup_accounts, merge_duplicates, cleanup_logs, remove_passwords, or complete_cleanup' },
          { status: 400 }
        );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Cleanup action failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}
