Title: Frontend duplication and logic-smell remediation (2025-09-04)

Summary
- Addressed high-risk UI issues first: stabilized list keys and removed a duplicate component implementation via re-export.
- Did not delete any files yet. A dry-run list of exact duplicate groups is available via the commands below for review/confirmation.

Changes
- frontend/components/ui/Pagination.tsx: replace index-based keys with stable keys (page number vs dots).
- frontend/app/favorites/page.tsx: use composite stable key for tags (restaurant.id-tag).
- frontend/components/admin/DashboardOverview.tsx: use action.href/title as key instead of index.
- frontend/components/admin/AnalyticsDashboard.tsx: re-export canonical component from components/ui/AnalyticsDashboard to remove duplicate implementation and index-keys in admin variant.
- frontend/components/search/SearchBar.tsx: stabilize suggestion keys using suggestion.value/label.
- frontend/components/reviews/ReviewCard.tsx: use image URL as key for review images.
- frontend/components/ui/VirtualList.tsx: add optional getKey prop; VirtualRestaurantList now sets getKey={(r) => r.id}.
 - frontend/components/shtel/dashboard/MessagingCenter.tsx: add AbortController for fetch in effects and abort on cleanup.
 - frontend/components/listing/*image*.tsx and image popups: use image URL or composite key for thumbnails.
 - frontend/components/admin/StoreAdminDashboard.tsx: use action href/title for QuickAction keys.
 - frontend/lib/api/restaurants.ts + map/UnifiedLiveMapClient.tsx: support AbortSignal in `fetchRestaurants` and pass it in the map client.
 - Admin DB clients now cancel fetches:
   - components/admin/UserDatabaseClient.tsx
   - components/admin/ReviewDatabaseClient.tsx
   - components/admin/ImageDatabaseClient.tsx
   - components/admin/KosherPlacesDatabaseClient.tsx
   (add AbortController and ignore abort errors)
 - More key stabilizations:
   - reviews/Reviews.tsx, ReviewForm.tsx, ReviewSnippets.tsx, ReviewCard.tsx
   - marketplace/ProductDetailPage.tsx
   - listing-details-utility/image-carousel-popup.tsx
   - listing-details-utility/listing-actions.tsx
   - restaurant/OrderForm.tsx, EnhancedHoursDisplay.tsx, RestaurantGrid.tsx
   - feedback/FeedbackForm.tsx
   - search/AdvancedSearchBox.tsx recent/suggestion entries
- Duplicate consolidation by re-export:
  - frontend/components/ui-listing-utility/spacing.tsx → re-export from ../ui/spacing-utility
  - frontend/components/ui-listing-utility/use-mobile.tsx → re-export from ../../hooks/use-mobile
  - frontend/lib-listing-utility/utils.ts and frontend/lib/utils-utility.ts → re-export cn from lib/utils/cn

Validation
- TypeScript: earlier run passed; latest run exceeded 90s guardrail. Please run locally: `cd frontend && npx tsc --noEmit`.

Duplicate detection (exact matches)
- Quick regeneration command:
  rg --null --files frontend -g '!frontend/node_modules/**' -g '!frontend/coverage/**' -g '!frontend/public/**' -g '!frontend/.next/**' -g '!**/*.d.ts' -g '!**/*.map' -g '**/*.{ts,tsx,js,jsx,css,scss}' \
  | xargs -0 -I{} sh -c 'sha=$(shasum -a 256 "{}" | awk "{print \$1}"); printf "%s\t%s\n" "$sha" "{}"' \
  | sort \
  | awk -F"\t" 'BEGIN{prev=""; n=0} {if($1!=prev && n>1){print "count="n"\tsha="prev; for(i=1;i<=n;i++) print files[i]; print "---"; n=0} if($1!=prev){prev=$1} files[++n]=$2} END{if(n>1){print "count="n"\tsha="prev; for(i=1;i<=n;i++) print files[i]; print "---"}}'

Notes
- Per G-OPS-3, deletions require explicit confirmation. The above dry-run shows candidates; propose keeping canonical copies under components/ui or lib where applicable, and replacing forks with re-exports before removal.
