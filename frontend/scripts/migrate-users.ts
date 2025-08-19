import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

import { prisma } from '@/lib/db/prisma';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface MigrationResult {
  success: boolean;
  email: string;
  error?: string;
  supabaseUserId?: string;
}

async function migrateUsers(): Promise<MigrationResult[]> {
  console.log('🚀 Starting user migration from NextAuth.js to Supabase...');
  
  try {
    // Get all users from Prisma (NextAuth.js)
    const users = await prisma.user.findMany();
    console.log(`📊 Found ${users.length} users to migrate`);
    
    const results: MigrationResult[] = [];
    
    for (const user of users) {
      try {
        console.log(`🔄 Migrating user: ${user.email}`);
        
        // Check if user already exists in Supabase
        const { data: existingUser } = await supabase.auth.admin.listUsers();
        const userExists = existingUser.users.find((u: any) => u.email === user.email);
        
        if (userExists) {
          console.log(`⚠️  User ${user.email} already exists in Supabase, skipping...`);
          results.push({
            success: true,
            email: user.email,
            supabaseUserId: userExists.id
          });
          continue;
        }
        
        // Create user in Supabase Auth
        const { data, error } = await supabase.auth.admin.createUser({
          email: user.email,
          password: `temporary-password-${  Math.random().toString(36).substring(7)}`, // User will reset this
          email_confirm: true,
          user_metadata: { 
            name: user.name,
            migrated_from_nextauth: true,
            migration_date: new Date().toISOString()
          }
        });
        
        if (error) {
          console.error(`❌ Failed to migrate user ${user.email}:`, error.message);
          results.push({
            success: false,
            email: user.email,
            error: error.message
          });
          continue;
        }
        
        // Update user profile with additional data
        await supabase
          .from('user_profiles')
          .update({ 
            is_super_admin: user.isSuperAdmin,
            migrated_from_nextauth: true,
            original_nextauth_id: user.id
          })
          .eq('id', data.user.id);
        
        console.log(`✅ Successfully migrated user: ${user.email}`);
        results.push({
          success: true,
          email: user.email,
          supabaseUserId: data.user.id
        });
        
      } catch (err) {
        console.error(`❌ Error migrating user ${user.email}:`, err);
        results.push({
          success: false,
          email: user.email,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }
    
    // Print summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log('\n📈 Migration Summary:');
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${results.length}`);
    
    if (failed > 0) {
      console.log('\n❌ Failed migrations:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`  - ${r.email}: ${r.error}`);
      });
    }
    
    return results;
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    throw error;
  }
}

// Function to send migration notification emails
async function sendMigrationNotifications(results: MigrationResult[]) {
  console.log('📧 Sending migration notifications...');
  
  for (const result of results) {
    if (result.success) {
      try {
        // Send email notification to user
        const { sendEmail } = await import('@/lib/email');
        
        await sendEmail({
          to: result.email,
          subject: 'Your JewGo account has been updated',
          html: `
            <h2>Account Migration Complete</h2>
            <p>Hello!</p>
            <p>Your JewGo account has been successfully migrated to our new authentication system.</p>
            <p>You can continue using the app as normal. If you experience any issues, please contact support.</p>
            <p>Best regards,<br>The JewGo Team</p>
          `
        });
        
        console.log(`📧 Notification sent to: ${result.email}`);
      } catch (error) {
        console.error(`❌ Failed to send notification to ${result.email}:`, error);
      }
    }
  }
}

// Main execution function
async function main() {
  try {
    console.log('🔧 Starting JewGo NextAuth.js to Supabase migration...');
    
    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required Supabase environment variables');
    }
    
    // Run migration
    const results = await migrateUsers();
    
    // Send notifications
    await sendMigrationNotifications(results);
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { migrateUsers, sendMigrationNotifications };
