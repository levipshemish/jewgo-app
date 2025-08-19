#!/usr/bin/env node

/**
 * Environment Variables Check Script
 * 
 * This script checks if all required environment variables are properly configured.
 * Run this script to verify your setup before starting the application.
 */

const fs = require('fs');
const path = require('path');

// Required environment variables
const requiredEnvVars = {
  'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY': 'Google Maps API key for maps and places functionality',
  'NEXT_PUBLIC_BACKEND_URL': 'Backend API URL (optional, has default)',
  'NEXTAUTH_URL': 'NextAuth URL (optional, has default)',
  'NEXTAUTH_SECRET': 'NextAuth secret (optional, has default)',
};

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local');
const envExists = fs.existsSync(envPath);

if (!envExists) {
  console.log('❌ .env.local file not found');
  console.log('Please create a .env.local file with the following variables:');
} else {
  // Load and parse .env.local
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  });
  
  let allGood = true;
  
  Object.entries(requiredEnvVars).forEach(([key, description]) => {
    const value = envVars[key];
    const hasValue = value && value !== '';
    
    if (hasValue) {
      console.log(`✅ ${key}: ${description}`);
    } else {
      console.log(`❌ ${key}: ${description} - NOT SET`);
      allGood = false;
    }
  });
  
  if (allGood) {
    console.log('\n🎉 All required environment variables are configured!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some required environment variables are missing.');
  }
}

Object.entries(requiredEnvVars).forEach(([key, description]) => {
  console.log(`${key}=your_${key.toLowerCase().replace(/next_public_/g, '').replace(/_/g, '_')}_here`);
});
process.exit(1); 