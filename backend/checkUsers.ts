import { prisma } from './src/prisma';
import bcrypt from 'bcrypt';

async function main() {
  const users = await prisma.user.findMany();
  console.log('Total users:', users.length);
  for (const user of users) {
    if (user.passwordHash) {
      console.log(`User: ${user.email}, Role: ${user.role}`);
    } else {
      console.log(`User: ${user.email}, HasHash: false`);
    }
  }

  // Force seed admin@nyaay.in if missing or mismatched password
  const exists = await prisma.user.findUnique({ where: { email: 'admin@nyaay.in' }});
  const passwordHash = await bcrypt.hash('password123', 12);

  if (!exists) {
    await prisma.user.create({
      data: {
        email: 'admin@nyaay.in',
        passwordHash,
        role: 'ADMIN',
        isActive: true,
        isEmailVerified: true,
        adminProfile: {
          create: {
             fullName: 'Nyaya Admin',
             permissions: ['verify_lawyers', 'verify_judges', 'manage_content']
          }
        }
      }
    });
    console.log("SEEDED admin@nyaay.in with password123");
  } else {
    // Force reset the password to ensure it matches 'password123'
    await prisma.user.update({
      where: { email: 'admin@nyaay.in' },
      data: { passwordHash }
    });
    console.log("UPDATED admin@nyaay.in with password123");
  }
}
main().finally(() => prisma.$disconnect());
