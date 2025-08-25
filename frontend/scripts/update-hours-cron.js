#!/usr/bin/env node

/**
 * update-hours-cron
 * Wrap function with error handling
 * 
 * This script provides wrap function with error handling for the JewGo application.
 * 
 * @author Development Team
 * @version 1.0.0
 * @created 2025-08-25
 * @lastModified 2025-08-25
 * @category utility
 * 
 * @dependencies Node.js, required npm packages
 * @requires Environment variables, configuration files
 * 
 * @usage * - Manual: node scripts/update-hours-cron.js
 * - CRON: 0 2 * * 0 node scripts/update-hours-cron.js (every Sunday at 2 AM)
 */
 * @options --help, --verbose, --config
 * 
 * @example
 * node update-hours-cron.js --verbose --config=production
 * 
 * @returns Exit code 0 for success, non-zero for errors
 * @throws Common error conditions and their meanings
 * 
 * @see Related scripts in the project
 * @see Links to relevant documentation
 */
function wrapWithErrorHandling(fn, context = {}) {
  return defaultErrorHandler.wrapFunction(fn, context);
}

/**
 * Wrap synchronous function with error handling
 */
function wrapSyncWithErrorHandling(fn, context = {}) {
  return defaultErrorHandler.wrapSyncFunction(fn, context);
}


#!/usr/bin/env node

/**
 * CRON Job: Update Restaurant Hours
 * 
 * This script updates restaurant hours for records that haven't been updated
 * in the last 7 days. It can be run manually or scheduled via CRON.
 * 
 * Usage:
 * - Manual: node scripts/update-hours-cron.js
 * - CRON: 0 2 * * 0 node scripts/update-hours-cron.js (every Sunday at 2 AM)
 */

import { db } from '@/lib/db';
import { updateRestaurantHours } from '@/db/sync/updateHours';

async function updateStaleHours() {
  try {
    // Get restaurants that haven't been updated in 7 days
    const staleRestaurants = await db.restaurant.findMany({
      where: {
        OR: [
          { hours_last_updated: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
          { hours_last_updated: null }
        ],
        google_listing_url: { not: null }
      },
      select: {
        id: true,
        google_listing_url: true
      }
    });

    let updatedCount = 0;
    let errorCount = 0;

    for (const restaurant of staleRestaurants) {
      try {
        // Extract place_id from google_listing_url
        const url = new URL(restaurant.google_listing_url);
        const placeId = url.searchParams.get('place_id') || url.pathname.split('/').pop();
        
        if (!placeId) {
          continue;
        }

        await updateRestaurantHours(restaurant.id, placeId);
        updatedCount++;
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        errorCount++;
        // // defaultLogger.error(`❌ Error updating restaurant ${restaurant.id}:`, error.message);
      }
    }

    } catch (error) {
    // // defaultLogger.error('💥 Fatal error during hours update:', error);
    wrapSyncWithErrorHandling(() => process.exit)(1);
  }
}

// Run the update
updateStaleHours().then(() => {
  wrapSyncWithErrorHandling(() => process.exit)(0);
}).catch((error) => {
  // // defaultLogger.error('💥 Script failed:', error);
  wrapSyncWithErrorHandling(() => process.exit)(1);
}); 