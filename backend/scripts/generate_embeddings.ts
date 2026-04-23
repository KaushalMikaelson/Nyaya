// @ts-nocheck
/**
 * generate_embeddings.ts
 * ──────────────────────────────────────────────────────────────
 * LOCAL embedding pipeline using @xenova/transformers.
 * Model: Xenova/gte-large  →  1024-dim vectors (matches schema)
 * No API key required. Model downloads once to ~/.cache/huggingface
 *
 * Run: npx ts-node scripts/generate_embeddings.ts
 * ──────────────────────────────────────────────────────────────
 */

import { prisma } from '../src/prisma';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import dotenv from 'dotenv';
dotenv.config();

// ──────────────────────────────────────────────────────────────
// CONFIG
// ──────────────────────────────────────────────────────────────

const MODEL_NAME   = 'Xenova/gte-large';   // 1024 dims — matches vector(1024)
const CHUNK_SIZE   = 1200;
const CHUNK_OVERLAP = 150;
const BATCH_SIZE   = 16;                   // texts per local inference batch

// ──────────────────────────────────────────────────────────────
// TEXT SPLITTER
// ──────────────────────────────────────────────────────────────

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: CHUNK_OVERLAP,
  separators: ['\n\n', '\n', '. ', ' '],
});

// ──────────────────────────────────────────────────────────────
// LOCAL EMBEDDING MODEL  (lazy-loaded, downloaded once)
// ──────────────────────────────────────────────────────────────

let _pipeline: any = null;

async function getPipeline() {
  if (_pipeline) return _pipeline;

  // Dynamic import keeps ts-node happy with ESM-only package
  const { pipeline, env } = await import('@xenova/transformers');

  // Allow local model caching (default: ~/.cache/huggingface/hub)
  env.allowLocalModels = true;

  console.log(`\n🤖 Loading model: ${MODEL_NAME}`);
  console.log('   (First run downloads ~670MB — subsequent runs use cache)\n');

  _pipeline = await pipeline('feature-extraction', MODEL_NAME, {
    quantized: false,    // use fp32 for best accuracy
  });

  return _pipeline;
}

// ──────────────────────────────────────────────────────────────
// EMBED  —  returns float32 array per text (mean-pooled, L2-norm)
// ──────────────────────────────────────────────────────────────

async function embedTexts(texts: string[]): Promise<number[][]> {
  const pipe = await getPipeline();
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const end   = Math.min(i + BATCH_SIZE, texts.length);
    process.stdout.write(`    Local embed [${i + 1}–${end} / ${texts.length}]... `);

    const output = await pipe(batch, { pooling: 'mean', normalize: true });

    for (let b = 0; b < batch.length; b++) {
      // output.tolist() gives [[...1024 floats...], ...]
      const vec = Array.from(output[b].data as Float32Array);
      embeddings.push(vec);
    }

    console.log('✓');
  }

  return embeddings;
}

// ──────────────────────────────────────────────────────────────
// DB INSERT
// ──────────────────────────────────────────────────────────────

async function insertChunks(rows: {
  actId: string;
  sectionId?: string;
  clauseId?: string;
  content: string;
  embedding: number[];
}[]) {
  for (const row of rows) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "LegalChunk" ("id","actId","sectionId","clauseId","content","embedding","updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5::vector, NOW())`,
      row.actId,
      row.sectionId ?? null,
      row.clauseId  ?? null,
      row.content,
      `[${row.embedding.join(',')}]`
    );
  }
}

// ──────────────────────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Nyaay Embedding Pipeline — LOCAL (Xenova/gte-large)');
  console.log(`   Dims: 1024 | ChunkSize: ${CHUNK_SIZE} | Batch: ${BATCH_SIZE}`);
  console.log('═'.repeat(60));

  // 1. Clear stale LegalChunk rows (mock embeddings from previous runs)
  console.log('\n🗑  Clearing existing LegalChunk rows...');
  await prisma.$executeRawUnsafe(`DELETE FROM "LegalChunk"`);
  console.log('   Done.\n');

  // 2. Warm up / download model
  await getPipeline();

  // 3. Load Acts + Sections + Clauses
  const acts = await prisma.act.findMany({
    include: { sections: { include: { clauses: true } } },
  });
  console.log(`📚 Found ${acts.length} Act(s) | Processing...\n`);

  let totalChunks = 0;

  for (const act of acts) {
    console.log(`\n📖 ${act.shortName} — ${act.sections.length} sections`);
    console.log('─'.repeat(60));

    for (const section of act.sections) {
      // Build combined text for section + its clauses
      const prefix = act.shortName === 'Constitution' ? 'Article' : 'Section';
      const sectionRaw = `[${act.shortName}] ${prefix} ${section.number}: ${section.title ?? ''}\n${section.content}`;
      const sectionDocs  = await splitter.createDocuments([sectionRaw]);
      const sectionTexts = sectionDocs.map(d => d.pageContent);

      const allTexts: string[] = [...sectionTexts];
      const allMeta : { sectionId?: string; clauseId?: string }[] =
        sectionTexts.map(() => ({ sectionId: section.id }));

      for (const clause of section.clauses) {
        const clauseRaw  = `[${act.shortName}] Art.${section.number} ${clause.number}\n${clause.content}`;
        const clauseDocs = await splitter.createDocuments([clauseRaw]);
        clauseDocs.forEach(d => {
          allTexts.push(d.pageContent);
          allMeta.push({ sectionId: section.id, clauseId: clause.id });
        });
      }

      const titlePreview = (section.title ?? '').slice(0, 38);
      process.stdout.write(`  Art.${String(section.number).padEnd(6)} "${titlePreview}"  →  ${allTexts.length} chunk(s)\n`);

      // Embed all texts for this section + clauses in local batches
      const embeddings = await embedTexts(allTexts);

      // Write to DB
      const rows = allTexts.map((text, i) => ({
        actId    : act.id,
        sectionId: allMeta[i].sectionId,
        clauseId : allMeta[i].clauseId,
        content  : text,
        embedding: embeddings[i],
      }));

      await insertChunks(rows);
      totalChunks += rows.length;
    }
  }

  console.log('\n\n' + '═'.repeat(60));
  console.log(`✅ Done! Inserted ${totalChunks} LegalChunks with local embeddings.`);
  console.log('\nYour RAG pipeline is live — semantic search ready! 🎯\n');
}

main()
  .catch(err => {
    console.error('\n❌ Fatal:', err.message ?? err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
