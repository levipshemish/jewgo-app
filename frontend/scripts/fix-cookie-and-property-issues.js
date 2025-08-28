const fs = require('fs');
const path = require('path');

// Files with remaining issues
const filesToFix = [
  'app/api/auth/prepare-merge/route.ts',
  'app/api/auth/signout/route.ts',
  'app/api/auth/sync-user/route.ts',
  'app/api/cron/cleanup-anonymous/route.ts',
  'app/api/maintenance/cleanup-anonymous/route.ts',
  'app/mikvah/page.tsx',
  'app/shuls/page.tsx'
];

function fixCookieAndPropertyIssues(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let originalContent = content;

  // Fix cookie handling issues
  content = content.replace(
    /return await cookieStore\.get\(name\)\?\.value;/g,
    'return cookieStore.get(name)?.value;'
  );
  
  content = content.replace(
    /\.get\(_name: string\) \{ return await cookieStore\.get\(name\)\?\.value; \}/g,
    '.get(_name: string) { return cookieStore.get(name)?.value; }'
  );

  // Fix property name issues
  content = content.replace(/mikvahcategory/g, 'mikvah_category');
  content = content.replace(/shulcategory/g, 'shul_category');
  content = content.replace(/getCookieOptions/g, 'getCookieOptions');
  content = content.replace(/_batch/g, 'batch');
  content = content.replace(/_body/g, 'body');

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Fixed cookie/property issues: ${filePath}`);
  } else {
    console.log(`No cookie/property changes needed: ${filePath}`);
  }
}

console.log('Fixing cookie and property issues...');
filesToFix.forEach(fixCookieAndPropertyIssues);
console.log('Cookie and property issues fixing complete!');
