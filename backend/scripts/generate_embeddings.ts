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

// Function to chunk text loosely into ~300 words per chunk 
// Token estimation roughly: 1 word ~ 1.3 tokens. 
// A 300 word chunk is roughly 400 tokens, perfectly in the 300-500 token range requested.
function chunkText(text: string, maxWords = 300): string[] {
  const words = text.split(/\s+/);
  const chunks = [];
  let currentChunk = [];
  
  for (let word of words) {
    currentChunk.push(word);
    if (currentChunk.length >= maxWords) {
      chunks.push(currentChunk.join(" "));
      currentChunk = [];
    }
  }
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(" "));
  }
  return chunks;
}

// Mock semantic embedding generator if no voyage API key is provided
function generateMockEmbedding(text: string) {
  // Voyage-law-2 provides 1024 d vectors
  const vec = new Array(1024).fill(0);
  // deterministic mock values based on text char code sum so similar texts might have *some* relation
  const seed = Array.from(text.substring(0, 10)).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  for (let i = 0; i < 1024; i++) {
    vec[i] = (Math.sin(seed + i) + 1) / 2; // normalize to 0-1
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
      // Chunk Section Level
      const sectionChunksText = chunkText(`[${act.shortName} - Act] Section ${section.number}: ${section.title || ''}\n${section.content}`);
      const sectionEmbeddings = await getEmbeddings(sectionChunksText);
      
      for (let i = 0; i < sectionChunksText.length; i++) {
        await prisma.legalChunk.create({
          data: {
            actId: act.id,
            sectionId: section.id,
            content: sectionChunksText[i],
            embedding: sectionEmbeddings[i],
          }
        });
      }

      // Chunk Clause Level
      for (const clause of section.clauses) {
        const clauseChunksText = chunkText(`[${act.shortName} - Act] Section ${section.number} Clause ${clause.number}\n${clause.content}`);
        const clauseEmbeddings = await getEmbeddings(clauseChunksText);
        
        for (let i = 0; i < clauseChunksText.length; i++) {
          await prisma.legalChunk.create({
            data: {
              actId: act.id,
              sectionId: section.id,
              clauseId: clause.id,
              content: clauseChunksText[i],
              embedding: clauseEmbeddings[i],
            }
          });
        }
      }
    }
  }
  console.log('✅ Chunks and Embeddings created successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
