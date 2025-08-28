const fs = require('fs');
const path = require('path');

// Files with remaining issues
const filesToFix = [
  'app/api/auth/prepare-merge/route.ts',
  'app/api/auth/signout/route.ts',
  'app/api/auth/sync-user/route.ts',
  'app/api/cron/cleanup-anonymous/route.ts',
  'app/api/marketplace/categories/route.ts',
  'app/api/public/admin-info/route.ts',
  'app/api/public/db-info/route.ts',
  'app/auth/signin/actions.ts',
  'app/marketplace/page.tsx',
  'app/mikvah/page.tsx',
  'app/shuls/page.tsx',
  'app/stores/page.tsx',
  'components/admin/ImageDatabaseClient.tsx',
  'components/admin/KosherPlacesDatabaseClient.tsx',
  'components/admin/ReviewDatabaseClient.tsx'
];

function fixAllRemainingIssuesFinal(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let originalContent = content;

  // Fix all remaining import, variable name, and property issues
  const replacements = [
    // Import fixes
    [/_scrubPII/g, 'scrubPII'],
    [/_Prisma/g, 'Prisma'],
    [/_getCookieOptions/g, 'getCookieOptions'],
    
    // Variable name fixes
    [/_signedCookie/g, 'signedCookie'],
    [/_display_name/g, 'display_name'],
    [/_defaultPreferences/g, 'defaultPreferences'],
    [/_cutoffDate/g, 'cutoffDate'],
    [/_CLEANUP_CONFIG/g, 'CLEANUP_CONFIG'],
    [/_duration/g, 'duration'],
    [/_batch/g, 'batch'],
    [/_startTime/g, 'startTime'],
    [/_supabase/g, 'supabase'],
    [/_body/g, 'body'],
    [/_backendUrl/g, 'backendUrl'],
    [/_backendResponse/g, 'backendResponse'],
    [/_contentType/g, 'contentType'],
    [/_transformedData/g, 'transformedData'],
    [/_superAdminsCount/g, 'superAdminsCount'],
    [/_superAdmins/g, 'superAdmins'],
    [/_dbError/g, 'dbError'],
    [/_connectionInfo/g, 'connectionInfo'],
    [/_count/g, 'count'],
    [/_rateLimitResult/g, 'rateLimitResult'],
    [/_filterType/g, 'filterType'],
    [/_value/g, 'value'],
    [/_restaurantId/g, 'restaurantId'],
    
    // Property name fixes
    [/createdat/g, 'created_at'],
    [/updatedat/g, 'updated_at'],
    [/txntype/g, 'txn_type'],
    [/pricecents/g, 'price_cents'],
    [/categoryid/g, 'category_id'],
    [/categoryname/g, 'category_name'],
    [/sellername/g, 'seller_name'],
    [/endorseup/g, 'endorse_up'],
    [/endorsedown/g, 'endorse_down'],
    [/createdat/g, 'created_at'],
    [/updatedat/g, 'updated_at'],
    [/mikvahtype/g, 'mikvah_type'],
    [/shultype/g, 'shul_type'],
    [/storetype/g, 'store_type'],
    [/minprice/g, 'min_price'],
    [/maxprice/g, 'max_price'],
    [/roomid/g, 'room_id'],
    
    // Cookie handling fixes
    [/cookieStore\.get\(name\)\?\.value/g, 'await cookieStore.get(name)?.value'],
    [/\.get\(_name: string\) \{ return cookieStore\.get\(name\)\?\.value; \}/g, '.get(_name: string) { return cookieStore.get(name)?.value; }'],
    
    // Column property fixes
    [/label: '([^']+)'/g, 'title: "$1"'],
    
    // Bulk action type fixes
    [/onBulkAction: \(action: string, ids: number\[\]\) => Promise<void>/g, 'onBulkAction: (action: string, selectedIds: string[]) => Promise<void>'],
    [/ids: number\[\]/g, 'selectedIds: string[]'],
    [/ids\.length/g, 'selectedIds.length'],
    [/for \(const user of batch\)/g, 'for (const user of _batch)'],
    
    // Missing function fixes
    [/onPageChange=\{onPageChange\}/g, 'onPageChange={onPageChange}'],
    [/onEdit=\{onEdit\}/g, ''],
    [/onDelete=\{onDelete\}/g, '']
  ];

  replacements.forEach(([pattern, replacement]) => {
    content = content.replace(pattern, replacement);
  });

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Fixed final issues: ${filePath}`);
  } else {
    console.log(`No final changes needed: ${filePath}`);
  }
}

console.log('Fixing all remaining issues (final)...');
filesToFix.forEach(fixAllRemainingIssuesFinal);
console.log('All remaining issues fixing complete!');
