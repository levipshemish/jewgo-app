#!/usr/bin/env tsx

import { randomBytes } from 'crypto';

function generateSecret(length: number = 32): string {
  return randomBytes(length).toString('base64');
}

function generateNextAuthSecret(): void {
  console.log('🔐 Generating NextAuth Secret');
  console.log('='.repeat(40));
  
  const secret = generateSecret(32);
  
  console.log('Generated Secret:');
  console.log(secret);
  console.log('');
  console.log('📝 Add this to your .env.local file:');
  console.log(`NEXTAUTH_SECRET=${secret}`);
  console.log('');
  console.log('⚠️  Keep this secret secure and don\'t share it!');
}

if (require.main === module) {
  generateNextAuthSecret();
}

export { generateSecret, generateNextAuthSecret };
