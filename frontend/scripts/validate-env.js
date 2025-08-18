#!/usr/bin/env node

// Simple, safe environment validation for CI/Vercel

const fs = require('fs');
const path = require('path');

const requiredEnvVars = [
  'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'NEXT_PUBLIC_BACKEND_URL',
];

const optionalEnvVars = [
  'NEXT_PUBLIC_GA_MEASUREMENT_ID',
  'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
];

// Load .env.local if present to assist local checks (non-fatal if missing)
const envPath = path.join(process.cwd(), '.env.local');
let fileVars = {};
if (fs.existsSync(envPath)) {
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {return;}
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim();
        fileVars[key] = value;
      }
    });
  } catch (e) {
    console.warn('Warning: failed to read .env.local:', e.message);
  }
}

function readEnv(key) {
  return process.env[key] ?? fileVars[key] ?? '';
}

const missingRequired = [];
for (const key of requiredEnvVars) {
  const value = readEnv(key);
  if (!value || String(value).trim() === '') {
    missingRequired.push(key);
  }
}

if (missingRequired.length > 0) {
  console.error('Missing required environment variables:');
  for (const key of missingRequired) {
    console.error(`- ${key}`);
  }
  process.exit(1);
}

const missingOptional = optionalEnvVars.filter((k) => {
  const value = readEnv(k);
  return !value || String(value).trim() === '';
});
if (missingOptional.length > 0) {
  for (const key of missingOptional) {
    console.warn(`[optional] ${key} is not set`);
  }
}

 