const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

(async () => {
  const prisma = new PrismaClient();
  try {
    const count = await prisma.user.count();
    const email = `statuscheck+${Date.now()}@jewgo.com`;
    const hashed = await bcrypt.hash('password123', 10);
    const user = await prisma.user.create({ data: { email, name: 'Status Check', password: hashed } });
    // Create profile row too
    await prisma.userProfile.create({ data: { userId: user.id, location: 'Miami, FL' } }).catch(() => {});
    } catch (e) {
    // console.error('script_error', e && e.message ? e.message : e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
