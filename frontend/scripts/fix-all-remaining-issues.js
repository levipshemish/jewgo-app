const fs = require('fs');
const path = require('path');

// Files with remaining issues
const filesToFix = [
  'app/api/auth/merge-anonymous/route.ts',
  'app/api/auth/prepare-merge/route.ts',
  'app/api/auth/signout/route.ts',
  'app/api/auth/sync-user/route.ts',
  'app/api/cron/cleanup-anonymous/route.ts',
  'app/api/marketplace/categories/route.ts',
  'app/api/public/admin-info/route.ts',
  'app/api/public/db-info/route.ts',
  'app/auth/signin/actions.ts'
];

function fixAllRemainingIssues(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let originalContent = content;

  // Fix all remaining import and variable name issues
  const replacements = [
    // Import fixes
    [/_verifyMergeCookieVersioned/g, 'verifyMergeCookieVersioned'],
    [/_hashIPForPrivacy/g, 'hashIPForPrivacy'],
    [/_validateCSRFServer/g, 'validateCSRFServer'],
    [/_ALLOWED_ORIGINS/g, 'ALLOWED_ORIGINS'],
    [/_getCORSHeaders/g, 'getCORSHeaders'],
    [/_FEATURE_FLAGS/g, 'FEATURE_FLAGS'],
    [/_initializeServer/g, 'initializeServer'],
    [/_serverInitialized/g, 'serverInitialized'],
    [/_correlationId/g, 'correlationId'],
    [/_realIP/g, 'realIP'],
    [/_forwardedFor/g, 'forwardedFor'],
    [/_validatedIP/g, 'validatedIP'],
    [/_referer/g, 'referer'],
    [/_csrfToken/g, 'csrfToken'],
    [/_adminUser/g, 'adminUser'],
    [/_stats/g, 'stats'],
    [/_response/g, 'response'],
    [/_data/g, 'data'],
    [/_json/g, 'json'],
    [/_params/g, 'params'],
    [/_res/g, 'res'],
    [/_error/g, 'error'],
    [/_e/g, 'e'],
    [/_id/g, 'id'],
    [/_query/g, 'query'],
    [/_provider/g, 'provider'],
    [/_result/g, 'result'],
    [/_getProviderDisplayName/g, 'getProviderDisplayName'],
    [/_handleLinkAccounts/g, 'handleLinkAccounts'],
    [/_handleReAuthenticate/g, 'handleReAuthenticate'],
    [/_handleSkipLinking/g, 'handleSkipLinking'],
    [/_transformMarketplaceToCardData/g, 'transformMarketplaceToCardData'],
    [/_calculateDistance/g, 'calculateDistance'],
    [/_formatDistance/g, 'formatDistance'],
    [/_formatDate/g, 'formatDate'],
    [/_handlePageChange/g, 'handlePageChange'],
    [/_handleSearch/g, 'handleSearch'],
    [/_handleFilterChange/g, 'handleFilterChange'],
    [/_handleTabChange/g, 'handleTabChange'],
    [/_handleCategorySelect/g, 'handleCategorySelect'],
    [/_fetchMarketplaceData/g, 'fetchMarketplaceData'],
    [/_fetchMoreListings/g, 'fetchMoreListings'],
    [/_handleRequestLocation/g, 'handleRequestLocation'],
    [/_sendMessage/g, 'sendMessage'],
    [/_append/g, 'append'],
    [/_lat1/g, 'lat1'],
    [/_lon1/g, 'lon1'],
    [/_lat2/g, 'lat2'],
    [/_lon2/g, 'lon2'],
    [/_distance/g, 'distance'],
    [/_dateString/g, 'dateString'],
    [/_newFilters/g, 'newFilters'],
    [/_tab/g, 'tab'],
    [/_category/g, 'category'],
    [/_roomid/g, 'roomid'],
    [/_minprice/g, 'minprice'],
    [/_maxprice/g, 'maxprice'],
    [/_txntype/g, 'txntype'],
    [/_pricecents/g, 'pricecents'],
    [/_categoryid/g, 'categoryid'],
    [/_categoryname/g, 'categoryname'],
    [/_sellername/g, 'sellername'],
    [/_endorseup/g, 'endorseup'],
    [/_endorsedown/g, 'endorsedown'],
    [/_createdat/g, 'createdat'],
    [/_updatedat/g, 'updatedat'],
    [/_router/g, 'router'],
    [/_searchParams/g, 'searchParams'],
    [/_page/g, 'page'],
    [/_pageSize/g, 'pageSize'],
    [/_search/g, 'search'],
    [/_sortBy/g, 'sortBy'],
    [/_sortOrder/g, 'sortOrder'],
    [/_fetchData/g, 'fetchData'],
    [/_onPageChange/g, 'onPageChange'],
    [/_onPageSizeChange/g, 'onPageSizeChange'],
    [/_onSearch/g, 'onSearch'],
    [/_onSort/g, 'onSort'],
    [/_onEdit/g, 'onEdit'],
    [/_onDelete/g, 'onDelete'],
    [/_onBulkAction/g, 'onBulkAction'],
    [/_onExport/g, 'onExport'],
    [/_handlePromoteUser/g, 'handlePromoteUser'],
    [/_handleRequestLocation/g, 'handleRequestLocation'],
    [/_handleResetPermission/g, 'handleResetPermission'],
    [/_handleSkip/g, 'handleSkip'],
    [/_blob/g, 'blob'],
    [/_url/g, 'url'],
    [/_a/g, 'a']
  ];

  replacements.forEach(([pattern, replacement]) => {
    content = content.replace(pattern, replacement);
  });

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Fixed: ${filePath}`);
  } else {
    console.log(`No changes needed: ${filePath}`);
  }
}

console.log('Fixing all remaining issues...');
filesToFix.forEach(fixAllRemainingIssues);
console.log('All remaining issues fixing complete!');
