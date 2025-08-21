import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { 
  generateCorrelationId, 
  scrubPII 
} from '@/lib/utils/auth-utils';
import { 
  CLEANUP_CRON_SECRET,
  CLEANUP_DRY_RUN_MODE,
  CLEANUP_SAFETY_CHECKS_ENABLED,
  IS_PRODUCTION 
} from '@/lib/config/environment';

export const runtime = 'nodejs';

// Anonymous user cleanup configuration
const CLEANUP_CONFIG = {
  batch_size: 100,
  max_age_days: 30, // Clean up anonymous users older than 30 days
  safety_checks: true,
  dry_run: CLEANUP_DRY_RUN_MODE
};

/**
 * Cleanup anonymous users API with dry-run mode and comprehensive safety measures
 * Handles POST requests for maintenance operations with secret validation
 */
export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  const startTime = Date.now();
  
  try {
    // Validate cleanup secret
    const authHeader = request.headers.get('authorization');
    const expectedSecret = `Bearer ${CLEANUP_CRON_SECRET}`;
    
    if (!authHeader || authHeader !== expectedSecret) {
      console.error(`Invalid cleanup secret for correlation ID: ${correlationId}`, {
        correlationId
      });
      
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse request body for configuration overrides
    const body = await request.json().catch(() => ({}));
    const dryRun = body.dry_run ?? CLEANUP_CONFIG.dry_run;
    const batchSize = body.batch_size ?? CLEANUP_CONFIG.batch_size;
    const maxAgeDays = body.max_age_days ?? CLEANUP_CONFIG.max_age_days;
    
    // Comprehensive safety checks
    if (CLEANUP_SAFETY_CHECKS_ENABLED) {
      if (batchSize > 1000) {
        console.error(`Batch size too large for correlation ID: ${correlationId}`, {
          batch_size: batchSize,
          correlationId
        });
        
        return NextResponse.json(
          { error: 'Batch size too large' },
          { status: 400 }
        );
      }
      
      if (maxAgeDays < 1 || maxAgeDays > 365) {
        console.error(`Invalid max age for correlation ID: ${correlationId}`, {
          max_age_days: maxAgeDays,
          correlationId
        });
        
        return NextResponse.json(
          { error: 'Invalid max age' },
          { status: 400 }
        );
      }
    }
    
    // Create service role client for database operations
    const cookieStore = await cookies();
    const serviceRoleClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: "", ...options, maxAge: 0 });
          },
        },
      }
    );
    
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
    
    // Find anonymous users to clean up
    const { data: anonymousUsers, error: findError } = await serviceRoleClient
      .from('auth.users')
      .select('id, created_at, user_metadata')
      .eq('user_metadata->is_anonymous', true)
      .lt('created_at', cutoffDate.toISOString())
      .limit(batchSize);
    
    if (findError) {
      console.error(`Failed to find anonymous users for correlation ID: ${correlationId}`, {
        error: findError,
        correlationId
      });
      
      return NextResponse.json(
        { error: 'Database query failed' },
        { status: 500 }
      );
    }
    
    if (!anonymousUsers || anonymousUsers.length === 0) {
      console.log(`No anonymous users to clean up for correlation ID: ${correlationId}`, {
        correlationId,
        cutoff_date: cutoffDate.toISOString()
      });
      
      return NextResponse.json(
        { 
          ok: true, 
          deleted: 0, 
          archived: 0, 
          processed: 0, 
          dry_run: dryRun,
          correlation_id: correlationId
        },
        { status: 200 }
      );
    }
    
    let deletedCount = 0;
    let archivedCount = 0;
    const processedUsers = anonymousUsers.map(user => user.id);
    
    if (dryRun) {
      // Dry run mode - log what would be deleted without actual operations
      console.log(`DRY RUN: Would clean up ${anonymousUsers.length} anonymous users for correlation ID: ${correlationId}`, {
        user_ids: processedUsers,
        correlationId,
        cutoff_date: cutoffDate.toISOString()
      });
      
      return NextResponse.json(
        { 
          ok: true, 
          deleted: 0, 
          archived: 0, 
          processed: processedUsers.length, 
          dry_run: true,
          would_delete: processedUsers.length,
          correlation_id: correlationId
        },
        { status: 200 }
      );
    }
    
    // Production mode - perform actual cleanup
    for (const user of anonymousUsers) {
      try {
        // Check if user has any data before deletion
        const { data: userData, error: dataError } = await serviceRoleClient
          .from('user_profiles')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);
        
        if (dataError) {
          console.error(`Failed to check user data for correlation ID: ${correlationId}`, {
            user_id: user.id,
            error: dataError,
            correlationId
          });
          continue;
        }
        
        if (userData && userData.length > 0) {
          // User has data - archive instead of delete
          const { error: archiveError } = await serviceRoleClient
            .from('auth.users')
            .update({ 
              user_metadata: { 
                ...user.user_metadata, 
                archived_at: new Date().toISOString(),
                archived_reason: 'cleanup_anonymous'
              }
            })
            .eq('id', user.id);
          
          if (archiveError) {
            console.error(`Failed to archive user for correlation ID: ${correlationId}`, {
              user_id: user.id,
              error: archiveError,
              correlationId
            });
          } else {
            archivedCount++;
          }
        } else {
          // No data - safe to delete
          const { error: deleteError } = await serviceRoleClient.auth.admin.deleteUser(user.id);
          
          if (deleteError) {
            console.error(`Failed to delete user for correlation ID: ${correlationId}`, {
              user_id: user.id,
              error: deleteError,
              correlationId
            });
          } else {
            deletedCount++;
          }
        }
        
      } catch (userError) {
        console.error(`Error processing user for correlation ID: ${correlationId}`, {
          user_id: user.id,
          error: userError,
          correlationId
        });
      }
    }
    
    // Log cleanup statistics
    console.log(`Cleanup completed for correlation ID: ${correlationId}`, {
      deleted: deletedCount,
      archived: archivedCount,
      processed: processedUsers.length,
      correlationId,
      duration_ms: Date.now() - startTime
    });
    
    return NextResponse.json(
      { 
        ok: true, 
        deleted: deletedCount, 
        archived: archivedCount, 
        processed: processedUsers.length, 
        dry_run: false,
        correlation_id: correlationId,
        duration_ms: Date.now() - startTime
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error(`Unexpected error in cleanup for correlation ID: ${correlationId}`, {
      error: scrubPII(error),
      correlationId,
      duration_ms: Date.now() - startTime
    });
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        correlation_id: correlationId
      },
      { status: 500 }
    );
  }
}
