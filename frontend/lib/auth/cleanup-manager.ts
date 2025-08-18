import { prisma } from "@/lib/db/prisma";

export interface CleanupStats {
  orphanedNextAuthSessions: number;
  orphanedNextAuthAccounts: number;
  duplicateUsers: number;
  unusedMigrationLogs: number;
  totalCleanupItems: number;
}

export interface CleanupResult {
  cleaned: number;
  errors: string[];
  warnings: string[];
}

/**
 * Cleanup Manager for post-migration cleanup and optimization
 */
export class CleanupManager {
  private static instance: CleanupManager;
  
  private constructor() {}
  
  static getInstance(): CleanupManager {
    if (!CleanupManager.instance) {
      CleanupManager.instance = new CleanupManager();
    }
    return CleanupManager.instance;
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStats(): Promise<CleanupStats> {
    // Count orphaned NextAuth sessions (users with Supabase ID but old sessions)
    const orphanedSessions = await prisma.session.count({
      where: {
        user: {
          supabaseId: { not: null }
        }
      }
    });

    // Count orphaned NextAuth accounts (users with Supabase ID but old accounts)
    const orphanedAccounts = await prisma.account.count({
      where: {
        user: {
          supabaseId: { not: null }
        }
      }
    });

    // Count duplicate users (same email, different auth methods)
    const duplicateUsers = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM nextauth."User" u1
      JOIN nextauth."User" u2 ON u1.email = u2.email AND u1.id != u2.id
      WHERE u1.email IS NOT NULL
    `;

    // Count old migration logs (older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const unusedMigrationLogs = await prisma.migrationLog.count({
      where: {
        createdAt: { lt: thirtyDaysAgo },
        status: { in: ['success', 'failed'] }
      }
    });

    return {
      orphanedNextAuthSessions: Number(orphanedSessions),
      orphanedNextAuthAccounts: Number(orphanedAccounts),
      duplicateUsers: Number(duplicateUsers[0]?.count || 0),
      unusedMigrationLogs: Number(unusedMigrationLogs),
      totalCleanupItems: Number(orphanedSessions) + Number(orphanedAccounts) + Number(duplicateUsers[0]?.count || 0) + Number(unusedMigrationLogs)
    };
  }

  /**
   * Clean up orphaned NextAuth sessions
   */
  async cleanupOrphanedSessions(): Promise<CleanupResult> {
    const result: CleanupResult = { cleaned: 0, errors: [], warnings: [] };

    try {
      const deletedSessions = await prisma.session.deleteMany({
        where: {
          user: {
            supabaseId: { not: null }
          }
        }
      });

      result.cleaned = deletedSessions.count;
    } catch (error) {
      result.errors.push(`Failed to cleanup sessions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Clean up orphaned NextAuth accounts
   */
  async cleanupOrphanedAccounts(): Promise<CleanupResult> {
    const result: CleanupResult = { cleaned: 0, errors: [], warnings: [] };

    try {
      const deletedAccounts = await prisma.account.deleteMany({
        where: {
          user: {
            supabaseId: { not: null }
          }
        }
      });

      result.cleaned = deletedAccounts.count;
    } catch (error) {
      result.errors.push(`Failed to cleanup accounts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Clean up old migration logs
   */
  async cleanupOldMigrationLogs(): Promise<CleanupResult> {
    const result: CleanupResult = { cleaned: 0, errors: [], warnings: [] };

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const deletedLogs = await prisma.migrationLog.deleteMany({
        where: {
          createdAt: { lt: thirtyDaysAgo },
          status: { in: ['success', 'failed'] }
        }
      });

      result.cleaned = deletedLogs.count;
    } catch (error) {
      result.errors.push(`Failed to cleanup migration logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Merge duplicate users
   */
  async mergeDuplicateUsers(): Promise<CleanupResult> {
    const result: CleanupResult = { cleaned: 0, errors: [], warnings: [] };

    try {
      // Find duplicate users
      const duplicates = await prisma.$queryRaw<Array<{ email: string; ids: string[] }>>`
        SELECT email, array_agg(id) as ids
        FROM nextauth."User"
        WHERE email IS NOT NULL
        GROUP BY email
        HAVING COUNT(*) > 1
      `;

      for (const duplicate of duplicates) {
        try {
          // Keep the user with the most complete data
          const users = await prisma.user.findMany({
            where: { id: { in: duplicate.ids } },
            include: { accounts: true, sessions: true, profile: true }
          });

                     // Sort by completeness (Supabase ID first, then most recent)
           users.sort((a, b) => {
             if (a.supabaseId && !b.supabaseId) { 
               return -1; 
             }
             if (!a.supabaseId && b.supabaseId) { 
               return 1; 
             }
             return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
           });

          const primaryUser = users[0];
          const duplicateUsers = users.slice(1);

          // Merge data from duplicate users into primary user
          for (const duplicateUser of duplicateUsers) {
            // Merge profiles if needed
            if (duplicateUser.profile && !primaryUser.profile) {
              await prisma.userProfile.update({
                where: { userId: duplicateUser.id },
                data: { userId: primaryUser.id }
              });
            }

            // Delete duplicate user
            await prisma.user.delete({
              where: { id: duplicateUser.id }
            });
          }

          result.cleaned += duplicateUsers.length;
        } catch (error) {
          result.warnings.push(`Failed to merge duplicates for ${duplicate.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      result.errors.push(`Failed to merge duplicate users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Remove NextAuth password fields from migrated users
   */
  async removeNextAuthPasswords(): Promise<CleanupResult> {
    const result: CleanupResult = { cleaned: 0, errors: [], warnings: [] };

    try {
      const updatedUsers = await prisma.user.updateMany({
        where: {
          supabaseId: { not: null },
          password: { not: null }
        },
        data: {
          password: null
        }
      });

      result.cleaned = updatedUsers.count;
    } catch (error) {
      result.errors.push(`Failed to remove passwords: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Perform complete cleanup
   */
  async performCompleteCleanup(): Promise<{
    totalCleaned: number;
    results: Record<string, CleanupResult>;
  }> {
    const results: Record<string, CleanupResult> = {};
    let totalCleaned = 0;

    // Cleanup in order
    results.sessions = await this.cleanupOrphanedSessions();
    results.accounts = await this.cleanupOrphanedAccounts();
    results.migrationLogs = await this.cleanupOldMigrationLogs();
    results.duplicates = await this.mergeDuplicateUsers();
    results.passwords = await this.removeNextAuthPasswords();

    // Calculate total
    for (const result of Object.values(results)) {
      totalCleaned += result.cleaned;
    }

    return { totalCleaned, results };
  }

  /**
   * Validate cleanup safety
   */
  async validateCleanupSafety(): Promise<{
    safe: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    const stats = await this.getCleanupStats();

    // Check if there are users without Supabase IDs
    const usersWithoutSupabase = await prisma.user.count({
      where: { supabaseId: null }
    });

    if (usersWithoutSupabase > 0) {
      issues.push(`${usersWithoutSupabase} users still don't have Supabase IDs`);
      recommendations.push('Complete user migration before cleanup');
    }

    // Check for active NextAuth sessions
    const activeSessions = await prisma.session.count({
      where: {
        expires: { gt: new Date() }
      }
    });

    if (activeSessions > 0) {
      recommendations.push(`Consider waiting for ${activeSessions} active sessions to expire`);
    }

    // Check for recent migration activity
    const recentMigrations = await prisma.migrationLog.count({
      where: {
        createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      }
    });

    if (recentMigrations > 0) {
      recommendations.push('Wait for recent migrations to complete');
    }

    return {
      safe: issues.length === 0,
      issues,
      recommendations
    };
  }
}
