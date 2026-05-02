const { prisma } = require('./src/prisma.ts');

async function run() {
  const users = await prisma.user.findMany({ select: { id: true, email: true, isPro: true } });
  console.log(users);
}
run();
