const fs = require('fs');
const path = require('path');

// Files with remaining issues
const filesToFix = [
  'app/mikvah/page.tsx',
  'app/shuls/page.tsx',
  'lib/utils/auth-utils-client.ts'
];

function fixAllRemainingProperties(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let originalContent = content;

  // Fix all property name issues
  content = content.replace(/feeamount/g, 'fee_amount');
  content = content.replace(/has_hebrewschool/g, 'has_hebrew_school');
  content = content.replace(/has_soapprovided/g, 'has_soap_provided');
  content = content.replace(/hasparking/g, 'has_parking');
  content = content.replace(/acceptscash/g, 'accepts_cash');
  content = content.replace(/hasdelivery/g, 'has_delivery');
  content = content.replace(/has_womensection/g, 'has_women_section');
  content = content.replace(/has_showerfacilities/g, 'has_shower_facilities');
  
  // Fix the providerInfo type issue by removing displayName
  content = content.replace(/displayName: "Email",?\s*/g, '');

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Fixed properties: ${filePath}`);
  } else {
    console.log(`No property changes needed: ${filePath}`);
  }
}

console.log('Fixing all remaining properties...');
filesToFix.forEach(fixAllRemainingProperties);
console.log('All remaining properties fixing complete!');
