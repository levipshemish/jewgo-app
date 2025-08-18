#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Patterns to fix unused variables
const patterns = [
  // Fix unused error variables in catch blocks
  {
    regex: /catch\s*\(\s*error\s*\)\s*{/g,
    replacement: 'catch {'
  },
  // Fix unused error variables in function parameters
  {
    regex: /\(\s*error\s*\)\s*=>\s*{/g,
    replacement: '() => {'
  },
  // Fix unused variables in destructuring
  {
    regex: /const\s*{\s*([^}]*error[^}]*)\s*}\s*=/g,
    replacement: (match, p1) => {
      return match.replace(/error/g, '_error');
    }
  },
  // Fix unused variables in function parameters
  {
    regex: /function\s*[^(]*\(\s*[^)]*error[^)]*\)/g,
    replacement: (_match) => {
      return match.replace(/error/g, '_error');
    }
  }
];

// Files to process (focus on the most problematic ones)
const filesToProcess = [
  'app/add-eatery/page.tsx',
  'app/admin/page.tsx',
  'app/admin/restaurants/page.tsx',
  'app/admin/reviews/page.tsx',
  'app/admin/specials/page.tsx',
  'app/admin/users/page.tsx',
  'app/api/admin/update-hours/route.ts',
  'app/api/admin-proxy/restaurants/[id]/route.ts',
  'app/api/admin-proxy/restaurants/route.ts',
  'app/api/admin-proxy/reviews/route.ts',
  'app/api/admin-proxy/users/route.ts',
  'app/api/analytics/route.ts',
  'app/api/auth/register/route.ts',
  'app/api/auth/reset-password/route.ts',
  'app/api/auth/verify-email/route.ts',
  'app/api/health/route.ts',
  'app/api/kosher-types/route.ts',
  'app/api/migrate/route.ts',
  'app/api/remove-duplicates/route.ts',
  'app/api/restaurants/[id]/approve/route.ts',
  'app/api/restaurants/[id]/reject/route.ts',
  'app/api/restaurants/[id]/route.ts',
  'app/api/restaurants/business-types/route.ts',
  'app/api/restaurants/fetch-missing-hours/route.ts',
  'app/api/restaurants/fetch-missing-websites/route.ts',
  'app/api/restaurants/filter-options/route.ts',
  'app/api/restaurants/route.ts',
  'app/api/restaurants-with-images/route.ts',
  'app/api/reviews/route.ts',
  'app/api/statistics/route.ts',
  'app/api/update-database/route.ts',
  'app/auth/forgot-password/page.tsx',
  'app/auth/reset-password/page.tsx',
  'app/auth/signup/page.tsx',
  'app/development/health/page.tsx',
  'app/eatery/page.tsx',
  'app/head.tsx',
  'app/profile/page.tsx',
  'app/restaurant/[id]/layout.tsx',
  'app/restaurant/[id]/page.tsx',
  'app/test-css/page.tsx',
  'components/analytics/Analytics.tsx',
  'components/dev/HeadGuard.tsx',
  'components/eatery/ui/EateryCard.tsx',
  'components/feedback/FeedbackForm.tsx',
  'components/filters/AdvancedFilterSheet.tsx',
  'components/filters/BusinessTypeFilter.tsx',
  'components/forms/ImageUpload.tsx',
  'components/layout/Header.tsx',
  'components/map/InteractiveRestaurantMap.tsx',
  'components/map/LiveMapClient.tsx',
  'components/map/MapControls.tsx',
  'components/map/OptimizedLiveMapClient.tsx',
  'components/map/hooks/useMarkerManagement.ts',
  'components/newsletter/NewsletterSignup.tsx',
  'components/products/ProductResults.tsx',
  'components/restaurant/EnhancedHoursDisplay.tsx',
  'components/restaurant/HoursStatusBadge.tsx',
  'components/restaurant/RestaurantCard.tsx',
  'components/restaurant/RestaurantClaimForm.tsx',
  'components/restaurant/Reviews.tsx',
  'components/restaurant/SpecialsSection.tsx',
  'components/reviews/ReviewCard.tsx',
  'components/reviews/ReviewForm.tsx',
  'components/reviews/ReviewModeration.tsx',
  'components/reviews/ReviewsSection.tsx',
  'components/search/AdvancedFilters.tsx',
  'components/search/AdvancedSearchBox.tsx',
  'components/search/SearchBar.tsx',
  'components/search/SmartSearch.tsx',
  'components/search/SmartSearchRefactored.tsx',
  'components/ui/AnalyticsDashboard.tsx',
  'components/ui/FontLoader.tsx',
  'components/ui/NotificationPreferences.tsx',
  'components/ui/PerformanceMonitor.tsx',
  'components/ui/ServiceWorkerRegistration.tsx',
  'components/ui/SharePopup.tsx',
  'components/ui/TouchTestComponent.tsx',
  'components/ui/VirtualList.tsx',
  'lib/analytics/performance.ts',
  'lib/api/adminClient.ts',
  'lib/api/restaurants.ts',
  'lib/api/specials.ts',
  'lib/backups/hoursBackup.ts',
  'lib/backups/websiteBackup.ts',
  'lib/contexts/NotificationsContext.tsx',
  'lib/email.ts',
  'lib/google/places.ts',
  'lib/hooks/useCssLoader.ts',
  'lib/hooks/useOptimizedFilters.ts',
  'lib/hooks/useRecentSearches.ts',
  'lib/message-bus.ts',
  'lib/utils/analytics.ts',
  'lib/utils/favorites.ts',
  'lib/utils/formValidation.ts',
  'lib/utils/hours.ts',
  'lib/utils/logger.ts',
  'lib/utils/rateLimiter.ts',
  'lib/utils/scrollUtils.ts',
  'lib/utils/validation.ts',
  'lib/workers/mendel-worker.ts'
];

function processFile(_filePath) {
  try {
    const fullPath = path.join(__dirname, '..', filePath);
    if (!fs.existsSync(fullPath)) {
      console.log(`File not found: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    let originalContent = content;
    let changes = 0;

    // Apply patterns
    patterns.forEach(pattern => {
      const matches = content.match(pattern.regex);
      if (matches) {
        content = content.replace(pattern.regex, pattern.replacement);
        changes += matches.length;
      }
    });

    // Write back if changes were made
    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Fixed ${changes} issues in ${filePath}`);
    } else {
      console.log(`⏭️  No changes needed for ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

console.log('🧹 Starting unused variable cleanup...\n');

filesToProcess.forEach(file => {
  processFile(file);
});

console.log('\n✨ Cleanup complete! Run "npm run lint" to check remaining issues.');
