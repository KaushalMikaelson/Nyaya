const { prisma } = require('./src/prisma.ts');

async function run() {
  const user = await prisma.user.findFirst({ where: { email: 'kaushalmikaelson@gmail.com' }, include: { subscription: true } });
  console.log(user);
}
run();
