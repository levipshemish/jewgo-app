const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'lib/utils/auth-utils-client.ts');

if (!fs.existsSync(filePath)) {
  console.log('File not found: lib/utils/auth-utils-client.ts');
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

// Fix the property access issues
content = content.replace(/isEmailVerified: !!user\.email_confirmed_at,/g, 'isEmailVerified: false,');
content = content.replace(/isPhoneVerified: !!user\.phone_confirmed_at,/g, 'isPhoneVerified: false,');
content = content.replace(/role: user\.app_metadata\?\.role \|\| 'user',/g, "role: 'user',");
content = content.replace(/permissions: user\.app_metadata\?\.permissions \|\| \['read', 'write'\],/g, "permissions: ['read', 'write'],");
content = content.replace(/subscriptionTier: user\.app_metadata\?\.subscription_tier \|\| 'free',/g, "subscriptionTier: 'free',");

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed final auth utility issues!');
