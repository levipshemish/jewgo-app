#!/usr/bin/env tsx

import { randomBytes } from 'crypto';

function generateSecret(length: number = 32): string {
  return randomBytes(length).toString('base64');
}

function generateNextAuthSecret(): void {

  console.log('='.repeat(40));
  
  const secret = generateSecret(32);







}

if (require.main === module) {
  generateNextAuthSecret();
}

export { generateSecret, generateNextAuthSecret };
