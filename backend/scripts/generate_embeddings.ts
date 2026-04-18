// @ts-nocheck
import { prisma } from '../src/prisma';
import { VoyageAIClient } from 'voyageai';
import dotenv from 'dotenv';
dotenv.config();

const voyageKey = process.env.VOYAGE_API_KEY;
// Depending on user config, we'll try to initiate the voyage client.
let voyageClient = null;
if (voyageKey) {
  voyageClient = new VoyageAIClient({ apiKey: voyageKey });
}

import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1200,
  chunkOverlap: 250,
  separators: ["\n\n[Clause", "\n\n", "\n", ".", " "],
});

// Mock semantic embedding generator if no voyage API key is provided
function generateMockEmbedding(text: string) {
  const vec = new Array(1024).fill(0);
  const seed = Array.from(text.substring(0, 10)).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  for (let i = 0; i < 1024; i++) {
    vec[i] = ((Math.sin(seed + i) + 1) / 2).toFixed(6); // normalize to 0-1 and fix length for pgvector
  }
  return vec;
}

async function getEmbeddings(texts: string[]) {
  if (voyageClient) {
    console.log(`📡 Hitting Voyage API for ${texts.length} chunks...`);
    try {
      const response = await voyageClient.embed({
        input: texts,
        model: "voyage-law-2",
      });
      return response.data.map(item => item.embedding);
    } catch (e) {
      console.warn("⚠️ Voyage API Failed, falling back to mock embeddings...", e.message);
    }
  }
  // Mock fallback
  return texts.map(t => generateMockEmbedding(t));
}

async function main() {
  console.log('🚀 Starting Phase 1B: Chunking & Embeddings...');

  const acts = await prisma.act.findMany({ include: { sections: { include: { clauses: true } } } });

  for (const act of acts) {
    console.log(`Processing ${act.shortName}...`);
    for (const section of act.sections) {
      // Split via Langchain
      const rawText = `[Act: ${act.shortName}] Section ${section.number}: ${section.title || ''}\n${section.content}`;
      const chunks = await splitter.createDocuments([rawText]);
      const sectionChunksText = chunks.map(c => c.pageContent);
      const sectionEmbeddings = await getEmbeddings(sectionChunksText);
      
      for (let i = 0; i < sectionChunksText.length; i++) {
        await prisma.$executeRawUnsafe(`
          INSERT INTO "LegalChunk" ("id", "actId", "sectionId", "content", "embedding", "updatedAt")
          VALUES (gen_random_uuid(), '${act.id}', '${section.id}', $1, '[${sectionEmbeddings[i].join(',')}]'::vector, NOW())
        `, sectionChunksText[i]);
      }

      // Chunk Clause Level
      for (const clause of section.clauses) {
        const clauseRawText = `[Act: ${act.shortName}] Section ${section.number} Clause ${clause.number}\n${clause.content}`;
        const clauseChunks = await splitter.createDocuments([clauseRawText]);
        const clauseChunksText = clauseChunks.map(c => c.pageContent);
        const clauseEmbeddings = await getEmbeddings(clauseChunksText);
        
        for (let i = 0; i < clauseChunksText.length; i++) {
          await prisma.$executeRawUnsafe(`
            INSERT INTO "LegalChunk" ("id", "actId", "sectionId", "clauseId", "content", "embedding", "updatedAt")
            VALUES (gen_random_uuid(), '${act.id}', '${section.id}', '${clause.id}', $1, '[${clauseEmbeddings[i].join(',')}]'::vector, NOW())
          `, clauseChunksText[i]);
        }
      }
    }
  }
  console.log('✅ Chunks and Embeddings created successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
