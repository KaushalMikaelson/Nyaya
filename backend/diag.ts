import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const count = await prisma.legalChunk.count();
  console.log('Total LegalChunks in DB:', count);

  // Check if FTS is populated
  const withFts: any[] = await prisma.$queryRaw`
    SELECT COUNT(*) as cnt FROM "LegalChunk" WHERE fts IS NOT NULL
  `;
  console.log('Chunks with FTS index:', withFts[0].cnt.toString());

  // Check Cohere key
  const cohereKey = process.env.COHERE_API_KEY;
  console.log('Cohere key set:', cohereKey ? `YES (${cohereKey.substring(0,8)}...)` : 'NO');
}

main()
  .catch(e => console.error('Error:', e.message))
  .finally(() => prisma.$disconnect());
