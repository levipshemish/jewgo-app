/*
  Seed script for admin roles using Supabase.
  Usage:
    - Set ADMIN_SEED_SUPERADMIN_EMAIL to an existing user's email.
    - Run: npx tsx frontend/prisma/seed.ts
*/
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const email = process.env.ADMIN_SEED_SUPERADMIN_EMAIL;
  if (!email) {
    console.log('ADMIN_SEED_SUPERADMIN_EMAIL not set; skipping seed.');
    return;
  }

  // Find user by email
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (userError || !user) {
    console.error(`User with email ${email} not found.`);
    process.exit(1);
  }

  // Check if user already has a super_admin role
  const { data: existingRole, error: existingError } = await supabase
    .from('admin_roles')
    .select('id')
    .eq('user_id', user.id)
    .eq('role', 'super_admin')
    .eq('is_active', true)
    .single();

  if (existingError && existingError.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error checking existing role:', existingError);
    process.exit(1);
  }

  if (existingRole) {
    console.log(`User ${email} already has super_admin role.`);
    return;
  }

  // Create super_admin role
  const { error: insertError } = await supabase
    .from('admin_roles')
    .insert({
      user_id: user.id,
      role: 'super_admin',
      assigned_by: 'seed',
      is_active: true,
      notes: 'Seeded as super_admin',
    });

  if (insertError) {
    console.error('Error creating super_admin role:', insertError);
    process.exit(1);
  }

  console.log(`Seeded super_admin role for ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

