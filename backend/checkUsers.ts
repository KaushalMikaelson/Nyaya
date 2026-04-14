import { prisma } from './src/prisma';
import * as bcrypt from 'bcrypt';

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      isEmailVerified: true,
      isActive: true,
      passwordHash: true,
      createdAt: true,
    },
  });

  if (users.length === 0) {
    console.log('No users found in database.');
    return;
  }

  console.log(`\nFound ${users.length} user(s):\n`);
  for (const u of users) {
    console.log(`Email:         ${u.email}`);
    console.log(`Role:          ${u.role}`);
    console.log(`EmailVerified: ${u.isEmailVerified}`);
    console.log(`Active:        ${u.isActive}`);
    console.log(`HasPassword:   ${!!u.passwordHash}`);
    if (u.passwordHash) {
      // Test against common passwords
      const testPasswords = ['password', 'password123', 'Password123', '12345678', 'admin123', 'password@123'];
      for (const p of testPasswords) {
        const match = await bcrypt.compare(p, u.passwordHash);
        if (match) console.log(`  ⚠️  Password matches common password: "${p}"`);
      }
    }
    console.log(`Created:       ${u.createdAt.toISOString()}`);
    console.log('─'.repeat(50));
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
