const fs = require('fs');
const path = require('path');

// Files with remaining issues
const filesToFix = [
  'app/mikvah/page.tsx',
  'app/shuls/page.tsx',
  'app/stores/page.tsx',
  'components/admin/ImageDatabaseClient.tsx',
  'components/admin/KosherPlacesDatabaseClient.tsx',
  'components/admin/ReviewDatabaseClient.tsx'
];

function fixFinalPropertyIssues(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let originalContent = content;

  // Fix property name issues
  content = content.replace(/requiresappointment/g, 'requires_appointment');
  content = content.replace(/has_dailyminyan/g, 'has_daily_minyan');
  content = content.replace(/imageurl/g, 'image_url');
  
  // Fix variable name issues
  content = content.replace(/ids: selectedIds/g, 'ids: selectedIds');
  content = content.replace(/selectedIds\.length/g, 'selectedIds.length');
  content = content.replace(/onPageChange=\{onPageChange\}/g, 'onPageChange={onPageChange}');
  content = content.replace(/onUpdate=\{onUpdate\}/g, '');
  
  // Fix missing variable declarations
  content = content.replace(
    /body: JSON\.stringify\(\{ action, ids \}\),/g,
    'body: JSON.stringify({ action, selectedIds }),'
  );

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Fixed property issues: ${filePath}`);
  } else {
    console.log(`No property changes needed: ${filePath}`);
  }
}

console.log('Fixing final property issues...');
filesToFix.forEach(fixFinalPropertyIssues);
console.log('Final property issues fixing complete!');
