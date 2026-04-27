const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.legalChunk.count();
  console.log('Total chunks:', count);
  const womenChunks = await prisma.legalChunk.count({
    where: { content: { contains: 'women', mode: 'insensitive' } }
  });
  console.log('Chunks with "women":', womenChunks);
}
main().finally(() => prisma.$disconnect());
