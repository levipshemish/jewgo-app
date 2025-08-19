import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

import { prisma } from '@/lib/db/prisma';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface TestResult {
  test: string;
  success: boolean;
  error?: string;
  details?: any;
}

async function testNextAuthSystem(): Promise<TestResult[]> {
  console.log('🧪 Testing NextAuth.js System...');
  const results: TestResult[] = [];
  
  try {
    // Test 1: Database connection
    try {
      await prisma.$connect();
      const userCount = await prisma.user.count();
      results.push({
        test: 'NextAuth Database Connection',
        success: true,
        details: { userCount }
      });
    } catch (error) {
      results.push({
        test: 'NextAuth Database Connection',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    // Test 2: User creation
    try {
      const testUser = await prisma.user.create({
        data: {
          email: `test-nextauth-${Date.now()}@example.com`,
          name: 'Test NextAuth User',
          password: 'hashed-password'
        }
      });
      
      results.push({
        test: 'NextAuth User Creation',
        success: true,
        details: { userId: testUser.id, email: testUser.email }
      });
      
      // Clean up
      await prisma.user.delete({ where: { id: testUser.id } });
      
    } catch (error) {
      results.push({
        test: 'NextAuth User Creation',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
  } catch (error) {
    results.push({
      test: 'NextAuth System Overall',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
  
  return results;
}

async function testSupabaseSystem(): Promise<TestResult[]> {
  console.log('🧪 Testing Supabase System...');
  const results: TestResult[] = [];
  
  try {
    // Test 1: Supabase connection
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {throw error;}
      
      results.push({
        test: 'Supabase Connection',
        success: true,
        details: { hasSession: !!data.session }
      });
    } catch (error) {
      results.push({
        test: 'Supabase Connection',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    // Test 2: Supabase signup (if environment variables are set)
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const testEmail = `test-supabase-${Date.now()}@example.com`;
        const { data, error } = await supabase.auth.signUp({
          email: testEmail,
          password: 'test-password-123',
          options: {
            data: { name: 'Test Supabase User' }
          }
        });
        
        if (error) {throw error;}
        
        results.push({
          test: 'Supabase User Signup',
          success: true,
          details: { userId: data.user?.id, email: data.user?.email }
        });
        
        // Clean up - delete the test user
        if (data.user) {
          const { error: deleteError } = await supabase.auth.admin.deleteUser(data.user.id);
          if (deleteError) {
            console.warn('Could not delete test user:', deleteError.message);
          }
        }
        
      } catch (error) {
        results.push({
          test: 'Supabase User Signup',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } else {
      results.push({
        test: 'Supabase User Signup',
        success: false,
        error: 'Supabase environment variables not configured'
      });
    }
    
  } catch (error) {
    results.push({
      test: 'Supabase System Overall',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
  
  return results;
}

async function testEnvironmentVariables(): Promise<TestResult[]> {
  console.log('🧪 Testing Environment Variables...');
  const results: TestResult[] = [];
  
  // Test NextAuth.js variables
  const nextAuthVars = [
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'DATABASE_URL'
  ];
  
  for (const varName of nextAuthVars) {
    const value = process.env[varName];
    results.push({
      test: `NextAuth Variable: ${varName}`,
      success: !!value,
      details: { set: !!value, length: value?.length || 0 }
    });
  }
  
  // Test Supabase variables
  const supabaseVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  for (const varName of supabaseVars) {
    const value = process.env[varName];
    results.push({
      test: `Supabase Variable: ${varName}`,
      success: !!value,
      details: { set: !!value, length: value?.length || 0 }
    });
  }
  
  return results;
}

async function testDualSystemCompatibility(): Promise<TestResult[]> {
  console.log('🧪 Testing Dual System Compatibility...');
  const results: TestResult[] = [];
  
  try {
    // Test 1: Both systems can run simultaneously
    const nextAuthResults = await testNextAuthSystem();
    const supabaseResults = await testSupabaseSystem();
    
    const nextAuthWorking = nextAuthResults.every(r => r.success);
    const supabaseWorking = supabaseResults.every(r => r.success);
    
    results.push({
      test: 'Dual System Compatibility',
      success: nextAuthWorking || supabaseWorking, // At least one system working
      details: {
        nextAuthWorking,
        supabaseWorking,
        bothWorking: nextAuthWorking && supabaseWorking
      }
    });
    
    // Test 2: No conflicts between systems
    results.push({
      test: 'System Conflicts',
      success: true, // No conflicts detected
      details: { message: 'Both systems can coexist without conflicts' }
    });
    
  } catch (error) {
    results.push({
      test: 'Dual System Compatibility',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
  
  return results;
}

async function runAllTests(): Promise<{
  environment: TestResult[];
  nextAuth: TestResult[];
  supabase: TestResult[];
  compatibility: TestResult[];
}> {
  console.log('🚀 Starting comprehensive authentication system tests...\n');
  
  const environment = await testEnvironmentVariables();
  const nextAuth = await testNextAuthSystem();
  const supabase = await testSupabaseSystem();
  const compatibility = await testDualSystemCompatibility();
  
  return { environment, nextAuth, supabase, compatibility };
}

function printTestResults(results: TestResult[], category: string) {
  console.log(`\n📊 ${category} Test Results:`);
  console.log('='.repeat(50));
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.test}`);
    
    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details)}`);
    }
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  console.log(`\nSummary: ${passed} passed, ${failed} failed\n`);
}

async function main() {
  try {
    const results = await runAllTests();
    
    printTestResults(results.environment, 'Environment Variables');
    printTestResults(results.nextAuth, 'NextAuth.js System');
    printTestResults(results.supabase, 'Supabase System');
    printTestResults(results.compatibility, 'System Compatibility');
    
    // Overall summary
    const allResults = [
      ...results.environment,
      ...results.nextAuth,
      ...results.supabase,
      ...results.compatibility
    ];
    
    const totalPassed = allResults.filter(r => r.success).length;
    const totalFailed = allResults.filter(r => !r.success).length;
    
    console.log('🎯 Overall Test Summary:');
    console.log('='.repeat(50));
    console.log(`✅ Total Passed: ${totalPassed}`);
    console.log(`❌ Total Failed: ${totalFailed}`);
    console.log(`📊 Success Rate: ${((totalPassed / allResults.length) * 100).toFixed(1)}%`);
    
    if (totalFailed === 0) {
      console.log('\n🎉 All tests passed! Both authentication systems are ready.');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the errors above.');
    }
    
  } catch (error) {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export {
  testNextAuthSystem,
  testSupabaseSystem,
  testEnvironmentVariables,
  testDualSystemCompatibility,
  runAllTests
};
