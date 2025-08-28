const fs = require('fs');
const path = require('path');

// Files with remaining issues
const filesToFix = [
  'app/mikvah/page.tsx',
  'app/shuls/page.tsx',
  'lib/utils/auth-utils-client.ts'
];

function fixFinal9Errors(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let originalContent = content;

  // Fix property name issues
  content = content.replace(/isverified/g, 'is_verified');
  content = content.replace(/has_youthprograms/g, 'has_youth_programs');
  
  // Fix the TransformedUser type issue by removing the extra properties
  content = content.replace(/isEmailVerified: true,\s*/g, '');
  content = content.replace(/isPhoneVerified: false,\s*/g, '');
  content = content.replace(/role: 'user',\s*/g, '');
  content = content.replace(/permissions: \[\],\s*/g, '');
  content = content.replace(/subscriptionTier: 'free'\s*/g, '');

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Fixed final errors: ${filePath}`);
  } else {
    console.log(`No changes needed: ${filePath}`);
  }
}

console.log('Fixing final 9 errors...');
filesToFix.forEach(fixFinal9Errors);
console.log('Final 9 errors fixing complete!');
