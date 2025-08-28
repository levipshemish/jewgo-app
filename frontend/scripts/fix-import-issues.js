const fs = require('fs');
const path = require('path');

// Files with remaining import issues
const filesToFix = [
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
  'components/admin/DataTable.tsx',
  'components/admin/ImageDatabaseClient.tsx',
  'components/admin/KosherPlacesDatabaseClient.tsx',
  'components/admin/RestaurantDatabaseClient.tsx',
  'components/map/UnifiedLiveMapClient.tsx'
];

function fixImportIssues(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let originalContent = content;

  // Fix import statements with underscores
  content = content.replace(/_NextRequest/g, 'NextRequest');
  content = content.replace(/_NextResponse/g, 'NextResponse');
  content = content.replace(/_createServerClient/g, 'createServerClient');
  content = content.replace(/_createClient/g, 'createClient');
  content = content.replace(/_cookies/g, 'cookies');
  content = content.replace(/_checkRateLimit/g, 'checkRateLimit');
  content = content.replace(/_validateTrustedIP/g, 'validateTrustedIP');
  content = content.replace(/_generateCorrelationId/g, 'generateCorrelationId');
  content = content.replace(/_extractIsAnonymous/g, 'extractIsAnonymous');
  content = content.replace(/_AdminDatabaseService/g, 'AdminDatabaseService');
  content = content.replace(/_prisma/g, 'prisma');
  content = content.replace(/_requireAdmin/g, 'requireAdmin');
  content = content.replace(/_corsHeaders/g, 'corsHeaders');
  content = content.replace(/_adminUser/g, 'adminUser');
  content = content.replace(/_stats/g, 'stats');
  content = content.replace(/_throttleFn/g, 'throttle');
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

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Fixed imports: ${filePath}`);
  } else {
    console.log(`No import changes needed: ${filePath}`);
  }
}

console.log('Fixing import issues...');
filesToFix.forEach(fixImportIssues);
console.log('Import fixing complete!');
