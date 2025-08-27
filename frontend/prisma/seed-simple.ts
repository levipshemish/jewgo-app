/*
  Simple seed script for admin roles using regular PostgreSQL.
  Usage:
    - Set ADMIN_SEED_SUPERADMIN_EMAIL to an existing user's email.
    - Run: npx tsx frontend/prisma/seed-simple.ts
*/
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_SEED_SUPERADMIN_EMAIL;
  if (!email) {

    return;
  }

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) {
    console.error(`User with email ${email} not found.`);
    process.exit(1);
  }

  // Check if user already has a super_admin role
  const existingRole = await prisma.$queryRaw<any[]>`
    SELECT id FROM admin_roles 
    WHERE user_id = ${user.id} 
    AND role = 'super_admin' 
    AND is_active = true
  `;

  if (existingRole && existingRole.length > 0) {

    return;
  }

  // Create super_admin role using raw SQL
  try {
    await prisma.$executeRaw`
      INSERT INTO admin_roles (
        user_id, 
        role, 
        assigned_by, 
        is_active, 
        notes
      ) VALUES (
        ${user.id}, 
        'super_admin', 
        'seed', 
        true, 
        'Seeded as super_admin'
      )
    `;

  } catch (error) {
    console.error('Error creating super_admin role:', error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
