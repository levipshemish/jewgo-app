import { NextRequest, NextResponse } from "next/server";
import { MigrationManager } from "@/lib/auth/migration-manager";
import { prisma } from "@/lib/db/prisma";

export async function GET(_request: NextRequest) {
  try {
    const migrationManager = MigrationManager.getInstance();
    const stats = await migrationManager.getMigrationStats();
    const logs = await migrationManager.getMigrationLogs(20);
    
    return NextResponse.json({
      stats,
      recentLogs: logs
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to get migration data: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, batchSize = 10 } = body;
    
    const migrationManager = MigrationManager.getInstance();
    
    switch (action) {
      case 'queue_all_users':
        // Queue all existing NextAuth users for migration
        const users = await prisma.user.findMany({
          where: { supabaseId: null },
          select: { id: true, email: true }
        });
        
        for (const user of users) {
          if (user.email) {
            await migrationManager.queueUserForMigration(user.id, user.email);
          }
        }
        
        return NextResponse.json({
          message: `Queued ${users.length} users for migration`,
          queuedCount: users.length
        });
        
      case 'process_batch':
        // Process a batch of pending migrations
        const result = await migrationManager.processPendingMigrations(batchSize);
        
        return NextResponse.json({
          message: `Processed ${result.processed} migrations`,
          ...result
        });
        
      case 'retry_failed':
        // Retry failed migrations
        const retryResult = await migrationManager.retryFailedMigrations();
        
        return NextResponse.json({
          message: `Retried ${retryResult.retried} failed migrations`,
          ...retryResult
        });
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: queue_all_users, process_batch, or retry_failed' },
          { status: 400 }
        );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Migration action failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}
