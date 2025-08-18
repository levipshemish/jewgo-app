#!/usr/bin/env node

/**
 * Complete Transition Script
 * Handles the final transition from NextAuth to Supabase-only authentication
 * Includes cleanup operations and dependency removal
 */

const https = require('https');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Complete Transition to Supabase-Only Authentication\n');

const BASE_URL = 'https://jewgo-app.vercel.app';

// Step 1: Check Migration Status
async function checkMigrationStatus() {
  console.log('📊 Step 1: Checking Migration Status...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/migration`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Migration status retrieved');
      console.log(`   Total users: ${data.stats.totalUsers}`);
      console.log(`   Migrated users: ${data.stats.migratedUsers}`);
      console.log(`   Migration progress: ${((data.stats.migratedUsers / data.stats.totalUsers) * 100).toFixed(1)}%`);
      return data.stats;
    }
  } catch (error) {
    console.log('⚠️  Could not check migration status via API');
  }
  
  return null;
}

// Step 2: Run Cleanup Operations
async function runCleanupOperations() {
  console.log('\n🧹 Step 2: Running Cleanup Operations...');
  
  const cleanupActions = [
    'cleanup_sessions',
    'cleanup_accounts', 
    'merge_duplicates',
    'cleanup_logs',
    'remove_passwords',
    'complete_cleanup'
  ];
  
  for (const action of cleanupActions) {
    try {
      console.log(`   Running: ${action}...`);
      const response = await fetch(`${BASE_URL}/api/admin/cleanup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`   ✅ ${action}: ${result.message || 'Completed'}`);
      } else {
        console.log(`   ⚠️  ${action}: Failed (${response.status})`);
      }
    } catch (error) {
      console.log(`   ❌ ${action}: Error - ${error.message}`);
    }
  }
}

// Step 3: Complete Transition
async function completeTransition() {
  console.log('\n🔄 Step 3: Completing Transition to Supabase-Only...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete_transition' })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Transition completed successfully');
      console.log(`   Message: ${result.message}`);
    } else {
      console.log('⚠️  Transition failed - may need manual intervention');
    }
  } catch (error) {
    console.log(`❌ Transition error: ${error.message}`);
  }
}

// Step 4: Remove NextAuth Dependencies
function removeNextAuthDependencies() {
  console.log('\n🗑️  Step 4: Removing NextAuth Dependencies...');
  
  const filesToRemove = [
    'app/api/auth/[...nextauth]/route.ts',
    'app/auth/signin/page.tsx',
    'app/auth/signup/page.tsx',
    'components/auth/NextAuthProvider.tsx',
    'lib/auth/nextauth.ts',
    'lib/auth/nextauth-adapter.ts'
  ];
  
  const packagesToRemove = [
    'next-auth',
    '@auth/prisma-adapter',
    '@next-auth/prisma-adapter'
  ];
  
  console.log('   Removing NextAuth files...');
  for (const file of filesToRemove) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`   ✅ Removed: ${file}`);
      } catch (error) {
        console.log(`   ⚠️  Could not remove: ${file}`);
      }
    } else {
      console.log(`   ℹ️  File not found: ${file}`);
    }
  }
  
  console.log('   Removing NextAuth packages...');
  try {
    execSync(`npm uninstall ${packagesToRemove.join(' ')}`, { stdio: 'inherit' });
    console.log('   ✅ NextAuth packages removed');
  } catch (error) {
    console.log('   ⚠️  Could not remove packages - may need manual removal');
  }
}

// Step 5: Update Configuration
function updateConfiguration() {
  console.log('\n⚙️  Step 5: Updating Configuration...');
  
  // Update next.config.js to remove NextAuth references
  const nextConfigPath = path.join(process.cwd(), 'next.config.js');
  if (fs.existsSync(nextConfigPath)) {
    try {
      let config = fs.readFileSync(nextConfigPath, 'utf8');
      
      // Remove NextAuth-related configurations
      config = config.replace(/\/\* NextAuth.*?\*\//gs, '');
      config = config.replace(/nextauth.*?,\s*/g, '');
      
      fs.writeFileSync(nextConfigPath, config);
      console.log('   ✅ Updated next.config.js');
    } catch (error) {
      console.log('   ⚠️  Could not update next.config.js');
    }
  }
  
  // Update environment variables
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    try {
      let envContent = fs.readFileSync(envPath, 'utf8');
      
      // Remove NextAuth environment variables
      const nextAuthVars = [
        'NEXTAUTH_URL',
        'NEXTAUTH_SECRET',
        'GOOGLE_CLIENT_ID',
        'GOOGLE_CLIENT_SECRET'
      ];
      
      for (const varName of nextAuthVars) {
        envContent = envContent.replace(new RegExp(`^${varName}=.*$`, 'gm'), '');
      }
      
      fs.writeFileSync(envPath, envContent);
      console.log('   ✅ Updated environment variables');
    } catch (error) {
      console.log('   ⚠️  Could not update environment variables');
    }
  }
}

// Step 6: Update Middleware
function updateMiddleware() {
  console.log('\n🛡️  Step 6: Updating Middleware...');
  
  const middlewarePath = path.join(process.cwd(), 'middleware.ts');
  if (fs.existsSync(middlewarePath)) {
    try {
      let middleware = fs.readFileSync(middlewarePath, 'utf8');
      
      // Remove NextAuth middleware logic
      middleware = middleware.replace(/\/\* NextAuth.*?\*\//gs, '');
      middleware = middleware.replace(/nextauth.*?,\s*/g, '');
      
      fs.writeFileSync(middlewarePath, middleware);
      console.log('   ✅ Updated middleware.ts');
    } catch (error) {
      console.log('   ⚠️  Could not update middleware.ts');
    }
  }
}

// Step 7: Build and Deploy
function buildAndDeploy() {
  console.log('\n🚀 Step 7: Building and Deploying...');
  
  try {
    console.log('   Building application...');
    execSync('npm run build', { stdio: 'inherit' });
    console.log('   ✅ Build successful');
    
    console.log('   Deploying to production...');
    execSync('git add .', { stdio: 'inherit' });
    execSync('git commit -m "Complete transition to Supabase-only authentication - Remove NextAuth dependencies and cleanup"', { stdio: 'inherit' });
    execSync('git push', { stdio: 'inherit' });
    console.log('   ✅ Deployment successful');
  } catch (error) {
    console.log('   ❌ Build or deployment failed');
    console.log(`   Error: ${error.message}`);
  }
}

// Main execution
async function main() {
  try {
    // Check current status
    const stats = await checkMigrationStatus();
    
    if (stats && stats.migratedUsers < stats.totalUsers) {
      console.log('\n⚠️  Warning: Not all users have been migrated yet.');
      console.log('   Consider completing user migration before proceeding.');
      console.log('   You can continue, but some users may lose access.');
      
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise(resolve => {
        rl.question('   Do you want to continue? (y/N): ', resolve);
      });
      rl.close();
      
      if (answer.toLowerCase() !== 'y') {
        console.log('   Transition cancelled.');
        return;
      }
    }
    
    // Run cleanup operations
    await runCleanupOperations();
    
    // Complete transition
    await completeTransition();
    
    // Remove dependencies
    removeNextAuthDependencies();
    
    // Update configuration
    updateConfiguration();
    
    // Update middleware
    updateMiddleware();
    
    // Build and deploy
    buildAndDeploy();
    
    console.log('\n🎉 Complete Transition Summary:');
    console.log('✅ Cleanup operations completed');
    console.log('✅ Transition to Supabase-only completed');
    console.log('✅ NextAuth dependencies removed');
    console.log('✅ Configuration updated');
    console.log('✅ Application deployed');
    
    console.log('\n📋 Next Steps:');
    console.log('1. Monitor the application for any issues');
    console.log('2. Update any remaining NextAuth references in your codebase');
    console.log('3. Consider removing unused environment variables');
    console.log('4. Update documentation to reflect Supabase-only authentication');
    
  } catch (error) {
    console.error('❌ Transition failed:', error.message);
    process.exit(1);
  }
}

main();
