import { prisma } from "@/lib/db/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { syncSupabaseUserToNeon } from "./user-sync";

export interface MigrationStats {
  totalUsers: number;
  migratedUsers: number;
  failedMigrations: number;
  pendingMigrations: number;
  lastMigrationDate?: Date;
}

export interface MigrationLog {
  id: string;
  userId: string;
  email: string;
  status: 'pending' | 'success' | 'failed';
  error?: string;
  migratedAt?: Date;
  createdAt: Date;
}

/**
 * Migration Manager for gradually moving NextAuth users to Supabase
 */
export class MigrationManager {
  private static instance: MigrationManager;
  
  private constructor() {}
  
  static getInstance(): MigrationManager {
    if (!MigrationManager.instance) {
      MigrationManager.instance = new MigrationManager();
    }
    return MigrationManager.instance;
  }

  /**
   * Get migration statistics
   */
  async getMigrationStats(): Promise<MigrationStats> {
    const totalUsers = await prisma.user.count();
    const migratedUsers = await prisma.user.count({
      where: { supabaseId: { not: null } }
    });
    const failedMigrations = await prisma.migrationLog.count({
      where: { status: 'failed' }
    });
    const pendingMigrations = await prisma.migrationLog.count({
      where: { status: 'pending' }
    });
    
    const lastMigration = await prisma.migrationLog.findFirst({
      where: { status: 'success' },
      orderBy: { migratedAt: 'desc' }
    });

    return {
      totalUsers,
      migratedUsers,
      failedMigrations,
      pendingMigrations,
      lastMigrationDate: lastMigration?.migratedAt
    };
  }

  /**
   * Queue a user for migration
   */
  async queueUserForMigration(userId: string, email: string): Promise<void> {
    // Check if already queued or migrated
    const existingLog = await prisma.migrationLog.findFirst({
      where: { userId }
    });

    if (existingLog) {
      return; // Already queued or processed
    }

    await prisma.migrationLog.create({
      data: {
        userId,
        email,
        status: 'pending',
        createdAt: new Date()
      }
    });
  }

  /**
   * Process pending migrations (batch processing)
   */
  async processPendingMigrations(batchSize: number = 10): Promise<{
    processed: number;
    successful: number;
    failed: number;
  }> {
    const pendingMigrations = await prisma.migrationLog.findMany({
      where: { status: 'pending' },
      take: batchSize,
      include: {
        user: true
      }
    });

    let processed = 0;
    let successful = 0;
    let failed = 0;

    for (const migration of pendingMigrations) {
      try {
        await this.migrateUser(migration.user);
        
        await prisma.migrationLog.update({
          where: { id: migration.id },
          data: {
            status: 'success',
            migratedAt: new Date()
          }
        });
        
        successful++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        await prisma.migrationLog.update({
          where: { id: migration.id },
          data: {
            status: 'failed',
            error: errorMessage
          }
        });
        
        failed++;
      }
      
      processed++;
    }

    return { processed, successful, failed };
  }

  /**
   * Migrate a single user from NextAuth to Supabase
   */
  private async migrateUser(user: { id: string; email: string; name?: string; image?: string }): Promise<void> {
    const supabase = await createSupabaseServerClient();
    
    // Check if user already exists in Supabase
    const { data: existingSupabaseUser } = await supabase.auth.admin.listUsers();
    const supabaseUser = existingSupabaseUser.users.find(u => u.email === user.email);
    
    let supabaseId: string;
    
    if (supabaseUser) {
      // User already exists in Supabase, use existing ID
      supabaseId = supabaseUser.id;
    } else {
      // Create new user in Supabase
      const { data: newUser, error } = await supabase.auth.admin.createUser({
        email: user.email,
        email_confirm: true,
        user_metadata: {
          name: user.name,
          image: user.image
        }
      });
      
      if (error) {
        throw new Error(`Failed to create Supabase user: ${error.message}`);
      }
      
      supabaseId = newUser.user.id;
    }
    
    // Update Neon user with Supabase ID
    await prisma.user.update({
      where: { id: user.id },
      data: { supabaseId }
    });
    
    // Sync user data to ensure consistency
    await syncSupabaseUserToNeon({
      id: supabaseId,
      email: user.email,
      user_metadata: {
        name: user.name,
        image: user.image
      }
    });
  }

  /**
   * Get migration logs
   */
  async getMigrationLogs(limit: number = 50): Promise<MigrationLog[]> {
    return await prisma.migrationLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  /**
   * Retry failed migrations
   */
  async retryFailedMigrations(): Promise<{
    retried: number;
    successful: number;
    failed: number;
  }> {
    const failedMigrations = await prisma.migrationLog.findMany({
      where: { status: 'failed' },
      include: { user: true }
    });

    let retried = 0;
    let successful = 0;
    let failed = 0;

    for (const migration of failedMigrations) {
      try {
        await this.migrateUser(migration.user);
        
        await prisma.migrationLog.update({
          where: { id: migration.id },
          data: {
            status: 'success',
            migratedAt: new Date(),
            error: null
          }
        });
        
        successful++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        await prisma.migrationLog.update({
          where: { id: migration.id },
          data: { error: errorMessage }
        });
        
        failed++;
      }
      
      retried++;
    }

    return { retried, successful, failed };
  }
}
