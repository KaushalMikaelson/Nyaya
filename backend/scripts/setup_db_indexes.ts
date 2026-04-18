// @ts-nocheck
import { prisma } from '../src/prisma';

async function main() {
  console.log("Setting up pgvector, tsvector indexes, and triggers...");
  
  try {
    // Attempt to create vector extension if not present
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector;`);
    
    // Create vector index using HNSW for cosine distance
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS embedding_hnsw_idx ON "LegalChunk" USING hnsw (embedding vector_cosine_ops);`);
    
    // Create GIN index for fast full-text search
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS fts_gin_idx ON "LegalChunk" USING GIN (fts);`);
    
    // Create Trigger for auto tsvector update
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION tsvector_update_trigger_func() RETURNS trigger AS $$
      BEGIN
        NEW.fts := to_tsvector('pg_catalog.english', COALESCE(NEW.content, ''));
        RETURN NEW;
      END
      $$ LANGUAGE plpgsql;
    `);

    await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS tsvectorupdate ON "LegalChunk";`);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER tsvectorupdate
      BEFORE INSERT OR UPDATE ON "LegalChunk"
      FOR EACH ROW EXECUTE FUNCTION tsvector_update_trigger_func();
    `);
    
    // Backfill existing data if any (though we'll likely generate new embeddings)
    await prisma.$executeRawUnsafe(`UPDATE "LegalChunk" SET content = content WHERE fts IS NULL;`);

    console.log("✅ Indexes and triggers successfully set up!");
  } catch (error) {
    console.error("❌ Error setting up DB:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
