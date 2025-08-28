import { _NextRequest, _NextResponse} from 'next/server';
import { _createServerClient} from '@supabase/ssr';
import { _cookies} from 'next/headers';
import { _generateCorrelationId, _scrubPII} from '@/lib/utils/auth-utils';

// export const runtime = 'nodejs';

// Cleanup configuration
const _CLEANUP_CONFIG = {
  // Anonymous users older than 30 days will be cleaned up
  ANONYMOUS_USER_AGE_DAYS: 30,
  // Batch size for processing
  BATCH_SIZE: 100,
  // Maximum users to process in one run
  MAX_USERS_PER_RUN: 1000,
  // Dry run mode (set to false for production)
  DRY_RUN: process.env.NODE_ENV === 'development' || process.env.CLEANUP_DRY_RUN === 'true'
};

/**
 * Vercel Cron Job: Cleanup Anonymous Users
 * Runs weekly to clean up old anonymous users
 * 
 * Cron schedule: 0 2 * * 0 (Every Sunday at 2 AM)
 * 
 * Environment variables:
 * - CLEANUP_CRON_SECRET: Secret to protect the endpoint
 * - CLEANUP_DRY_RUN: Set to 'true' for dry-run mode
 */
export async function GET(request: NextRequest) {
  const _correlationId = generateCorrelationId();
  const _startTime = Date.now();
  
  try {
    // Verify cron secret for security
    const _authHeader = request.headers.get('authorization');
    const _expectedSecret = process.env.CLEANUP_CRON_SECRET;
    
    if (!expectedSecret) {
      console.error(`[Cleanup Cron] CLEANUP_CRON_SECRET not configured (${correlationId})`);
      return NextResponse.json(
        { error: 'Cron secret not configured' },
        { status: 500 }
      );
    }
    
    if (authHeader !== `Bearer ${expectedSecret}`) {
      console.error(`[Cleanup Cron] Invalid authorization (${correlationId})`);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create Supabase service role client
    const _cookieStore = await cookies();
    const _supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(_name: string) {
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
    const _cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CLEANUP_CONFIG.ANONYMOUS_USER_AGE_DAYS);

    // Find anonymous users older than cutoff date
    const { data: oldAnonymousUsers, error: queryError } = await supabase
      .from('auth.users')
      .select('id, email, created_at, raw_user_meta_data')
      .eq('raw_user_meta_data->is_anonymous', 'true')
      .lt('created_at', cutoffDate.toISOString())
      .limit(CLEANUP_CONFIG.MAX_USERS_PER_RUN);

    if (queryError) {
      console.error(`[Cleanup Cron] Failed to query anonymous users (${correlationId})`, queryError);
      return NextResponse.json(
        { error: 'Failed to query anonymous users' },
        { status: 500 }
      );
    }

    if (!oldAnonymousUsers || oldAnonymousUsers.length === 0) {

      return NextResponse.json({
        success: true,
        message: 'No old anonymous users found',
        processed: 0,
        deleted: 0,
        correlation_id: correlationId,
        dry_run: CLEANUP_CONFIG.DRY_RUN
      });
    }

    // Process users in batches
    const _results = {
      processed: 0,
      deleted: 0,
      errors: 0,
      userIds: [] as string[]
    };

    for (let i = 0; i < oldAnonymousUsers.length; i += CLEANUP_CONFIG.BATCH_SIZE) {
      const _batch = oldAnonymousUsers.slice(i, i + CLEANUP_CONFIG.BATCH_SIZE);
      
      for (const user of batch) {
        try {
          results.processed++;
          
          if (CLEANUP_CONFIG.DRY_RUN) {
            // Dry run - just log what would be deleted

            results.userIds.push(user.id);
          } else {
            // Production - actually delete the user
            const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
            
            if (deleteError) {
              // Failed to delete user - log for debugging
              // console.error(`[Cleanup Cron] Failed to delete user ${user.id} (${correlationId})`, deleteError);
              results.errors++;
            } else {

              results.deleted++;
              results.userIds.push(user.id);
            }
          }
          
        } catch (_error) {
          // Error processing user - log for debugging
          // console.error(`[Cleanup Cron] Error processing user ${user.id} (${correlationId})`, error);
          results.errors++;
        }
      }
      
      // Small delay between batches to avoid overwhelming the database
      if (i + CLEANUP_CONFIG.BATCH_SIZE < oldAnonymousUsers.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const _duration = Date.now() - startTime;
    
    // Cleanup completed - log for monitoring
    // console.log(`[Cleanup Cron] Cleanup completed (${correlationId})`, {
    //   processed: results.processed,
    //   deleted: results.deleted,
    //   errors: results.errors,
    //   duration_ms: duration,
    //   dry_run: CLEANUP_CONFIG.DRY_RUN
    // });

    // Log to Sentry if available
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureMessage('Anonymous user cleanup completed', {
        level: 'info',
        tags: { correlationId, component: 'cleanup_cron' },
        extra: {
          processed: results.processed,
          deleted: results.deleted,
          errors: results.errors,
          duration_ms: duration,
          dry_run: CLEANUP_CONFIG.DRY_RUN
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Anonymous user cleanup completed',
      processed: results.processed,
      deleted: results.deleted,
      errors: results.errors,
      duration_ms: duration,
      correlation_id: correlationId,
      dry_run: CLEANUP_CONFIG.DRY_RUN,
      user_ids: results.userIds
    });

  } catch (_error) {
    // Unexpected error - log for debugging
    // console.error(`[Cleanup Cron] Unexpected error (${correlationId})`, error);
    
    // Log to Sentry if available
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        tags: { correlationId, component: 'cleanup_cron' },
        extra: { error: scrubPII(error) }
      });
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        correlation_id: correlationId
      },
      { status: 500 }
    );
  }
}

/**
 * Manual trigger endpoint (for testing)
 */
export async function POST(request: NextRequest) {
  // For manual triggers, we can accept additional parameters
  const _body = await request.json().catch(() => ({}));
  const { dry_run = CLEANUP_CONFIG.DRY_RUN } = body;
  
  // Override dry run mode for manual triggers
  CLEANUP_CONFIG.DRY_RUN = dry_run;
  
  return GET(request);
}
