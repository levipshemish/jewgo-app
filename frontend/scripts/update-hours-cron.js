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
        // // console.error(`❌ Error updating restaurant ${restaurant.id}:`, error.message);
      }
    }

    } catch (error) {
    // // console.error('💥 Fatal error during hours update:', error);
    process.exit(1);
  }
}

// Run the update
updateStaleHours().then(() => {
  process.exit(0);
}).catch((error) => {
  // // console.error('💥 Script failed:', error);
  process.exit(1);
}); 