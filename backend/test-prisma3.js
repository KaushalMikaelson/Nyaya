const { prisma } = require('./src/prisma.ts');

async function run() {
  const sub = await prisma.subscription.findFirst({ where: { user: { email: 'kaushalstark1@gmail.com' } } });
  console.log(sub);
}
run();
