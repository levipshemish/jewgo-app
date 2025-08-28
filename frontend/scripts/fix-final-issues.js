const fs = require('fs');
const path = require('path');

// Files with final issues
const filesToFix = [
  'app/api/auth/merge-anonymous/route.ts',
  'app/api/auth/prepare-merge/route.ts',
  'app/api/auth/signout/route.ts',
  'app/api/auth/sync-user/route.ts'
];

function fixFinalIssues(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let originalContent = content;

  // Fix all remaining variable name and property issues
  const replacements = [
    // Property name fixes
    [/remainingattempts/g, 'remaining_attempts'],
    [/retryafter/g, 'retry_after'],
    [/ipHash/g, 'ipHash'],
    [/rateLimitResult/g, 'rateLimitResult'],
    [/supabase/g, 'supabase'],
    [/signMergeCookieVersioned/g, 'signMergeCookieVersioned'],
    [/cookiePayload/g, 'cookiePayload'],
    [/getCookieOptions/g, 'getCookieOptions'],
    [/signedCookie/g, 'signedCookie'],
    [/cookieOptions/g, 'cookieOptions'],
    [/baseHeaders/g, 'baseHeaders'],
    [/transformedUser/g, 'transformedUser'],
    [/_ipHash/g, 'ipHash'],
    [/_rateLimitResult/g, 'rateLimitResult'],
    [/_supabase/g, 'supabase'],
    [/_signMergeCookieVersioned/g, 'signMergeCookieVersioned'],
    [/_cookiePayload/g, 'cookiePayload'],
    [/_cookieOptions/g, 'cookieOptions'],
    [/_baseHeaders/g, 'baseHeaders'],
    [/_transformedUser/g, 'transformedUser']
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

console.log('Fixing final issues...');
filesToFix.forEach(fixFinalIssues);
console.log('Final issues fixing complete!');
