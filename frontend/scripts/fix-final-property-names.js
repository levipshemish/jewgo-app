const fs = require('fs');
const path = require('path');

// Files with remaining issues
const filesToFix = [
  'app/mikvah/page.tsx',
  'app/shuls/page.tsx',
  'app/stores/page.tsx',
  'components/admin/ReviewDatabaseClient.tsx',
  'lib/utils/auth-utils-client.ts'
];

function fixFinalPropertyNames(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let originalContent = content;

  // Fix property name issues
  content = content.replace(/has_showerfacilities/g, 'has_shower_facilities');
  content = content.replace(/has_womensection/g, 'has_women_section');
  content = content.replace(/hasdelivery/g, 'has_delivery');
  
  // Fix variable name issues
  content = content.replace(/selectedIds\.length/g, 'selectedIds.length');
  content = content.replace(/onPageChange=\{onPageChange\}/g, 'onPageChange={onPageChange}');
  content = content.replace(/body: JSON\.stringify\(\{ action, selectedIds \}\),/g, 'body: JSON.stringify({ action, selectedIds }),');
  
  // Fix providerInfo type issue
  content = content.replace(/displayName: 'Email'/g, 'displayName: "Email"');

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Fixed property names: ${filePath}`);
  } else {
    console.log(`No property name changes needed: ${filePath}`);
  }
}

console.log('Fixing final property names...');
filesToFix.forEach(fixFinalPropertyNames);
console.log('Final property names fixing complete!');
