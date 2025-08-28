const fs = require('fs');
const path = require('path');

// Files with remaining underscore issues
const filesToFix = [
  'app/account/link/LinkAccountForm.tsx',
  'app/admin/database/images/page.tsx',
  'app/admin/database/kosher-places/page.tsx',
  'app/admin/database/restaurants/page.tsx',
  'app/admin/database/reviews/page.tsx',
  'app/api/admin/system/stats/route.ts',
  'app/api/auth/merge-anonymous/route.ts',
  'app/api/auth/prepare-merge/route.ts',
  'app/api/auth/signout/route.ts',
  'app/api/auth/sync-user/route.ts',
  'app/api/cron/cleanup-anonymous/route.ts',
  'app/api/marketplace/categories/route.ts',
  'app/api/public/admin-info/route.ts',
  'app/api/public/db-info/route.ts',
  'app/auth/signin/actions.ts',
  'app/favorites/page.tsx',
  'app/marketplace/page.tsx',
  'app/mikvah/page.tsx',
  'app/profile/settings/page.tsx',
  'app/shuls/page.tsx',
  'app/stores/page.tsx',
  'components/admin/DataTable.tsx',
  'components/admin/ImageDatabaseClient.tsx',
  'components/admin/KosherPlacesDatabaseClient.tsx',
  'components/admin/RestaurantDatabaseClient.tsx',
  'components/map/UnifiedLiveMapClient.tsx'
];

function fixRemainingUnderscores(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let originalContent = content;

  // Fix import statements with underscores
  content = content.replace(/_useState/g, 'useState');
  content = content.replace(/_useRouter/g, 'useRouter');
  content = content.replace(/_useSearchParams/g, 'useSearchParams');
  content = content.replace(/_useAdminCsrf/g, 'useAdminCsrf');
  content = content.replace(/_useToast/g, 'useToast');
  content = content.replace(/_useLocation/g, 'useLocation');
  content = content.replace(/_LoadingButton/g, 'LoadingButton');
  content = content.replace(/_Loader2/g, 'Loader2');
  content = content.replace(/_UserPlus/g, 'UserPlus');
  content = content.replace(/_Shield/g, 'Shield');
  content = content.replace(/_CheckCircle/g, 'CheckCircle');
  content = content.replace(/_XCircle/g, 'XCircle');
  content = content.replace(/_throttleFn/g, 'throttle');
  
  // Fix variable names with underscores
  content = content.replace(/\b_router\b/g, 'router');
  content = content.replace(/\b_searchParams\b/g, 'searchParams');
  content = content.replace(/\b_page\b/g, 'page');
  content = content.replace(/\b_pageSize\b/g, 'pageSize');
  content = content.replace(/\b_search\b/g, 'search');
  content = content.replace(/\b_sortBy\b/g, 'sortBy');
  content = content.replace(/\b_sortOrder\b/g, 'sortOrder');
  content = content.replace(/\b_fetchData\b/g, 'fetchData');
  content = content.replace(/\b_onPageChange\b/g, 'onPageChange');
  content = content.replace(/\b_onPageSizeChange\b/g, 'onPageSizeChange');
  content = content.replace(/\b_onSearch\b/g, 'onSearch');
  content = content.replace(/\b_onSort\b/g, 'onSort');
  content = content.replace(/\b_onEdit\b/g, 'onEdit');
  content = content.replace(/\b_onDelete\b/g, 'onDelete');
  content = content.replace(/\b_onBulkAction\b/g, 'onBulkAction');
  content = content.replace(/\b_onExport\b/g, 'onExport');
  content = content.replace(/\b_handlePromoteUser\b/g, 'handlePromoteUser');
  content = content.replace(/\b_handleRequestLocation\b/g, 'handleRequestLocation');
  content = content.replace(/\b_handleResetPermission\b/g, 'handleResetPermission');
  content = content.replace(/\b_handleSkip\b/g, 'handleSkip');
  content = content.replace(/\b_response\b/g, 'response');
  content = content.replace(/\b_data\b/g, 'data');
  content = content.replace(/\b_json\b/g, 'json');
  content = content.replace(/\b_params\b/g, 'params');
  content = content.replace(/\b_res\b/g, 'res');
  content = content.replace(/\b_blob\b/g, 'blob');
  content = content.replace(/\b_url\b/g, 'url');
  content = content.replace(/\b_a\b/g, 'a');
  content = content.replace(/\b_error\b/g, 'error');
  content = content.replace(/\b_e\b/g, 'e');
  content = content.replace(/\b_id\b/g, 'id');
  content = content.replace(/\b_query\b/g, 'query');
  content = content.replace(/\b_provider\b/g, 'provider');
  content = content.replace(/\b_result\b/g, 'result');
  content = content.replace(/\b_getProviderDisplayName\b/g, 'getProviderDisplayName');
  content = content.replace(/\b_handleLinkAccounts\b/g, 'handleLinkAccounts');
  content = content.replace(/\b_handleReAuthenticate\b/g, 'handleReAuthenticate');
  content = content.replace(/\b_handleSkipLinking\b/g, 'handleSkipLinking');
  content = content.replace(/\b_transformMarketplaceToCardData\b/g, 'transformMarketplaceToCardData');
  content = content.replace(/\b_calculateDistance\b/g, 'calculateDistance');
  content = content.replace(/\b_formatDistance\b/g, 'formatDistance');
  content = content.replace(/\b_formatDate\b/g, 'formatDate');
  content = content.replace(/\b_handlePageChange\b/g, 'handlePageChange');
  content = content.replace(/\b_handleSearch\b/g, 'handleSearch');
  content = content.replace(/\b_handleFilterChange\b/g, 'handleFilterChange');
  content = content.replace(/\b_handleTabChange\b/g, 'handleTabChange');
  content = content.replace(/\b_handleCategorySelect\b/g, 'handleCategorySelect');
  content = content.replace(/\b_fetchMarketplaceData\b/g, 'fetchMarketplaceData');
  content = content.replace(/\b_fetchMoreListings\b/g, 'fetchMoreListings');
  content = content.replace(/\b_handleRequestLocation\b/g, 'handleRequestLocation');
  content = content.replace(/\b_sendMessage\b/g, 'sendMessage');
  content = content.replace(/\b_append\b/g, 'append');
  content = content.replace(/\b_lat1\b/g, 'lat1');
  content = content.replace(/\b_lon1\b/g, 'lon1');
  content = content.replace(/\b_lat2\b/g, 'lat2');
  content = content.replace(/\b_lon2\b/g, 'lon2');
  content = content.replace(/\b_distance\b/g, 'distance');
  content = content.replace(/\b_dateString\b/g, 'dateString');
  content = content.replace(/\b_newFilters\b/g, 'newFilters');
  content = content.replace(/\b_tab\b/g, 'tab');
  content = content.replace(/\b_category\b/g, 'category');
  content = content.replace(/\b_roomid\b/g, 'roomid');
  content = content.replace(/\b_minprice\b/g, 'minprice');
  content = content.replace(/\b_maxprice\b/g, 'maxprice');
  content = content.replace(/\b_txntype\b/g, 'txntype');
  content = content.replace(/\b_pricecents\b/g, 'pricecents');
  content = content.replace(/\b_categoryid\b/g, 'categoryid');
  content = content.replace(/\b_categoryname\b/g, 'categoryname');
  content = content.replace(/\b_sellername\b/g, 'sellername');
  content = content.replace(/\b_endorseup\b/g, 'endorseup');
  content = content.replace(/\b_endorsedown\b/g, 'endorsedown');
  content = content.replace(/\b_createdat\b/g, 'createdat');
  content = content.replace(/\b_updatedat\b/g, 'updatedat');

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Fixed: ${filePath}`);
  } else {
    console.log(`No changes needed: ${filePath}`);
  }
}

console.log('Fixing remaining underscore issues...');
filesToFix.forEach(fixRemainingUnderscores);
console.log('Remaining underscore fixing complete!');
