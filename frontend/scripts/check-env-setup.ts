#!/usr/bin/env tsx

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

interface EnvCheck {
  variable: string;
  set: boolean;
  value?: string;
  status: '✅' | '❌' | '⚠️';
  message: string;
}

function checkEnvironmentVariables(): EnvCheck[] {
  const checks: EnvCheck[] = [];
  
  // Supabase variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  checks.push({
    variable: 'NEXT_PUBLIC_SUPABASE_URL',
    set: !!supabaseUrl,
    value: supabaseUrl,
    status: supabaseUrl ? '✅' : '❌',
    message: supabaseUrl ? 'Configured' : 'Missing - required for Supabase'
  });
  
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  checks.push({
    variable: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    set: !!supabaseAnonKey,
    value: `${supabaseAnonKey?.substring(0, 20)  }...`,
    status: supabaseAnonKey ? '✅' : '❌',
    message: supabaseAnonKey ? 'Configured' : 'Missing - required for Supabase'
  });
  
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  checks.push({
    variable: 'SUPABASE_SERVICE_ROLE_KEY',
    set: !!supabaseServiceKey && supabaseServiceKey !== 'your_supabase_service_role_key_here',
    value: `${supabaseServiceKey?.substring(0, 20)  }...`,
    status: supabaseServiceKey && supabaseServiceKey !== 'your_supabase_service_role_key_here' ? '✅' : '❌',
    message: supabaseServiceKey === 'your_supabase_service_role_key_here' ? 'Still placeholder - needs real key' : 'Missing - required for admin operations'
  });
  
  // NextAuth variables
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  checks.push({
    variable: 'NEXTAUTH_URL',
    set: !!nextAuthUrl,
    value: nextAuthUrl,
    status: nextAuthUrl ? '✅' : '❌',
    message: nextAuthUrl ? 'Configured' : 'Missing - required for NextAuth.js'
  });
  
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  checks.push({
    variable: 'NEXTAUTH_SECRET',
    set: !!nextAuthSecret && nextAuthSecret !== 'your-nextauth-secret-key-here',
    value: `${nextAuthSecret?.substring(0, 10)  }...`,
    status: nextAuthSecret && nextAuthSecret !== 'your-nextauth-secret-key-here' ? '✅' : '❌',
    message: nextAuthSecret === 'your-nextauth-secret-key-here' ? 'Still placeholder - needs real secret' : 'Missing - required for NextAuth.js'
  });
  
  // Google OAuth variables
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  checks.push({
    variable: 'GOOGLE_CLIENT_ID',
    set: !!googleClientId && googleClientId !== 'your-google-client-id-here',
    value: `${googleClientId?.substring(0, 20)  }...`,
    status: googleClientId && googleClientId !== 'your-google-client-id-here' ? '✅' : '❌',
    message: googleClientId === 'your-google-client-id-here' ? 'Still placeholder - needs real client ID' : 'Missing - required for Google OAuth'
  });
  
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  checks.push({
    variable: 'GOOGLE_CLIENT_SECRET',
    set: !!googleClientSecret && googleClientSecret !== 'your-google-client-secret-here',
    value: `${googleClientSecret?.substring(0, 10)  }...`,
    status: googleClientSecret && googleClientSecret !== 'your-google-client-secret-here' ? '✅' : '❌',
    message: googleClientSecret === 'your-google-client-secret-here' ? 'Still placeholder - needs real client secret' : 'Missing - required for Google OAuth'
  });
  
  return checks;
}

function printEnvironmentStatus() {

  console.log('='.repeat(50));
  
  const checks = checkEnvironmentVariables();
  
  checks.forEach(check => {


    if (check.value) {

    }

  });
  
  const configured = checks.filter(c => c.status === '✅').length;
  const total = checks.length;



  if (configured === total) {


  } else {


  }
  
  // Specific recommendations
  const missingSupabase = checks.filter(c => c.variable.includes('SUPABASE') && c.status === '❌');
  const missingGoogle = checks.filter(c => c.variable.includes('GOOGLE') && c.status === '❌');
  
  if (missingSupabase.length > 0) {





  }
  
  if (missingGoogle.length > 0) {





  }
}

if (require.main === module) {
  printEnvironmentStatus();
}

export { checkEnvironmentVariables, printEnvironmentStatus };
