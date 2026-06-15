import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log('Clearing existing LegalChunk rows first to allow dimension change...');
  await prisma.$executeRawUnsafe(`DELETE FROM "LegalChunk"`);
  
  console.log('Altering embedding column in database to vector(384)...');
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "LegalChunk" ALTER COLUMN embedding TYPE vector(384);`
  );
  console.log('Successfully altered embedding column to vector(384)!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
