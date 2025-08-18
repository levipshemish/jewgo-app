import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";

export interface TransitionConfig {
  enableSupabaseAuth: boolean;
  enableNextAuthAuth: boolean;
  redirectToSupabase: boolean;
  showMigrationBanner: boolean;
  migrationComplete: boolean;
}

export interface TransitionStats {
  totalUsers: number;
  supabaseUsers: number;
  nextAuthUsers: number;
  dualUsers: number;
  transitionProgress: number;
}

/**
 * Transition Manager for complete migration from NextAuth to Supabase
 */
export class TransitionManager {
  private static instance: TransitionManager;
  private config: TransitionConfig = {
    enableSupabaseAuth: true,
    enableNextAuthAuth: true,
    redirectToSupabase: false,
    showMigrationBanner: true,
    migrationComplete: false
  };
  
  private constructor() {}
  
  static getInstance(): TransitionManager {
    if (!TransitionManager.instance) {
      TransitionManager.instance = new TransitionManager();
    }
    return TransitionManager.instance;
  }

  /**
   * Get current transition configuration
   */
  getConfig(): TransitionConfig {
    return { ...this.config };
  }

  /**
   * Update transition configuration
   */
  updateConfig(updates: Partial<TransitionConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get transition statistics
   */
  async getTransitionStats(): Promise<TransitionStats> {
    const totalUsers = await prisma.user.count();
    const supabaseUsers = await prisma.user.count({
      where: { supabaseId: { not: null } }
    });
    const nextAuthUsers = await prisma.user.count({
      where: { 
        OR: [
          { password: { not: null } },
          { accounts: { some: {} } }
        ]
      }
    });
    const dualUsers = await prisma.user.count({
      where: { 
        supabaseId: { not: null },
        OR: [
          { password: { not: null } },
          { accounts: { some: {} } }
        ]
      }
    });

    const transitionProgress = totalUsers > 0 ? (supabaseUsers / totalUsers) * 100 : 0;

    return {
      totalUsers,
      supabaseUsers,
      nextAuthUsers,
      dualUsers,
      transitionProgress
    };
  }

  /**
   * Check if user should be redirected to Supabase auth
   */
  shouldRedirectToSupabase(userId: string): boolean {
    if (!this.config.redirectToSupabase) {
      return false;
    }

    // Check if user has Supabase ID
    return prisma.user.findUnique({
      where: { id: userId },
      select: { supabaseId: true }
    }).then(user => !!user?.supabaseId);
  }

  /**
   * Get recommended auth method for user
   */
  async getRecommendedAuthMethod(email: string): Promise<'supabase' | 'nextauth' | 'both'> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { 
        supabaseId: true,
        password: true,
        accounts: { select: { provider: true } }
      }
    });

    if (!user) {
      return 'supabase'; // New users should use Supabase
    }

    const hasSupabase = !!user.supabaseId;
    const hasNextAuth = !!(user.password || user.accounts.length > 0);

    if (hasSupabase && hasNextAuth) {
      return 'both';
    } else if (hasSupabase) {
      return 'supabase';
    } else {
      return 'nextauth';
    }
  }

  /**
   * Complete transition to Supabase-only
   */
  async completeTransition(): Promise<void> {
    // Update configuration
    this.updateConfig({
      enableNextAuthAuth: false,
      redirectToSupabase: true,
      showMigrationBanner: false,
      migrationComplete: true
    });

    // Verify all users have been migrated
    const stats = await this.getTransitionStats();
    if (stats.transitionProgress < 100) {
      throw new Error(`Cannot complete transition: ${stats.transitionProgress.toFixed(1)}% of users migrated`);
    }
  }

  /**
   * Rollback transition (emergency)
   */
  async rollbackTransition(): Promise<void> {
    this.updateConfig({
      enableSupabaseAuth: false,
      enableNextAuthAuth: true,
      redirectToSupabase: false,
      showMigrationBanner: true,
      migrationComplete: false
    });
  }

  /**
   * Get transition phase
   */
  getTransitionPhase(): 'dual' | 'migration' | 'supabase-only' | 'complete' {
    if (this.config.migrationComplete) {
      return 'complete';
    }
    
    if (this.config.enableSupabaseAuth && this.config.enableNextAuthAuth) {
      return this.config.redirectToSupabase ? 'migration' : 'dual';
    }
    
    if (this.config.enableSupabaseAuth && !this.config.enableNextAuthAuth) {
      return 'supabase-only';
    }
    
    return 'dual';
  }

  /**
   * Validate transition readiness
   */
  async validateTransitionReadiness(): Promise<{
    ready: boolean;
    issues: string[];
    warnings: string[];
  }> {
    const issues: string[] = [];
    const warnings: string[] = [];
    
    const stats = await this.getTransitionStats();
    
    // Check migration progress
    if (stats.transitionProgress < 95) {
      issues.push(`Only ${stats.transitionProgress.toFixed(1)}% of users migrated`);
    }
    
    // Check for users without Supabase accounts
    const unmigratedUsers = stats.totalUsers - stats.supabaseUsers;
    if (unmigratedUsers > 0) {
      warnings.push(`${unmigratedUsers} users still need migration`);
    }
    
    // Check for dual users (should be cleaned up)
    if (stats.dualUsers > 0) {
      warnings.push(`${stats.dualUsers} users have both auth methods`);
    }
    
    // Validate Supabase connection
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.admin.listUsers();
    } catch (error) {
      issues.push('Supabase connection failed');
    }
    
    return {
      ready: issues.length === 0,
      issues,
      warnings
    };
  }
}
