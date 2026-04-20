// @ts-nocheck
/**
 * Document Processor Worker (BullMQ)
 * Processes uploaded documents asynchronously:
 *   1. Fetch file from S3 (or local in dev)
 *   2. OCR / text extraction
 *   3. AI classification (Groq + Zod)
 *   4. AI legal analysis + RAG context retrieval
 *   5. Update UserDocument with results → status READY
 */

import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '../prisma';
import Groq from 'groq-sdk';
import { ChatGroq } from '@langchain/groq';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import pdf from 'pdf-parse';
import Tesseract from 'tesseract.js';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';

// ─── Redis connection ────────────────────────────────────────────────────────

const REDIS_URL = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL || 'redis://localhost:6379';

let redisConnection: IORedis | null = null;

function getRedisConnection(): IORedis | null {
  if (!REDIS_URL || REDIS_URL === 'redis://localhost:6379' || REDIS_URL.includes('127.0.0.1')) {
    // Check if Redis is actually available; if not, return null (graceful degradation)
    try {
      const conn = new IORedis(REDIS_URL, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy: () => null // Prevent infinite reconnection crashing node
      });
      conn.on('error', () => { /* swallow */ });
      return conn;
    } catch {
      return null;
    }
  }
  return new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

export const DOCUMENT_QUEUE = 'document-processing';

// ─── Shared Zod classification schema ───────────────────────────────────────

const classificationSchema = z.object({
  documentType: z.enum([
    'Contract/Agreement',
    'Legal Notice',
    'Court Judgment/Order',
    'FIR/Police Report',
    'Identity/KYC Document',
    'Petition',
    'Affidavit',
    'Power of Attorney',
    'Will/Testament',
    'Other',
  ]),
  summary: z.string().describe('A 1-2 sentence high-level summary of the document'),
  partiesInvolved: z.array(z.string()).describe('Names, roles, or organizations mentioned in the document'),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function chunkText(text: string, maxWords = 300): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let current: string[] = [];
  for (const word of words) {
    current.push(word);
    if (current.length >= maxWords) {
      chunks.push(current.join(' '));
      current = [];
    }
  }
  if (current.length > 0) chunks.push(current.join(' '));
  return chunks;
}

async function fetchBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 400) {
        reject(new Error(`HTTP error ${res.statusCode}`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function typeSpecificInstructions(docType: string): string {
  switch (docType) {
    case 'Contract/Agreement':
      return 'Focus on termination clauses, liabilities, financial obligations, specific performance, breach consequences, and unfair terms.';
    case 'Legal Notice':
      return 'Focus on the timeline to respond, demanded actions, statutory violations claimed, and the legal weight of the threats made.';
    case 'FIR/Police Report':
      return 'Focus on the penal sections applied, chronology of events, severity of charges (bailable/non-bailable), and immediate legal steps the accused should take.';
    case 'Court Judgment/Order':
      return 'Focus on the ratio decidendi (reasoning), the final decree/order, precedents cited, and compliance obligations.';
    case 'Petition':
      return 'Identify the reliefs sought, grounds raised, jurisdiction, and strength of the legal arguments.';
    case 'Affidavit':
      return 'Check for completeness, accuracy of statements, statutory compliance, and whether a notary/oath commissioner attestation is required.';
    case 'Power of Attorney':
      return 'Identify the scope of powers granted, revocation clauses, duration, and risks of misuse.';
    case 'Will/Testament':
      return 'Focus on clarity of asset distribution, witness requirements under the Indian Succession Act, and any ambiguous clauses.';
    case 'Identity/KYC Document':
      return 'Briefly confirm validity and flag any exposed PII that may create legal risks under the DPDP Act 2023.';
    default:
      return 'Identify the core legal themes, potential risks, and compliance requirements under Indian law.';
  }
}

// ─── Main processor function ─────────────────────────────────────────────────

async function processDocument(docId: string): Promise<void> {
  console.log(`[DocProcessor] Starting job for document: ${docId}`);

  // Mark as PROCESSING
  await prisma.userDocument.update({
    where: { id: docId },
    data: { status: 'PROCESSING' },
  });

  const doc = await prisma.userDocument.findUnique({ where: { id: docId } });
  if (!doc) throw new Error(`Document ${docId} not found`);

  // ── Step 1: Fetch file buffer ──────────────────────────────────────────────
  let fileBuffer: Buffer;
  try {
    if (doc.s3Url.includes('/api/documents/files/')) {
      const filename = doc.s3Url.split('/').pop();
      const localPath = path.join(process.cwd(), 'uploads', 'documents', filename!);
      fileBuffer = await fs.promises.readFile(localPath);
    } else {
      fileBuffer = await fetchBuffer(doc.s3Url);
    }
  } catch (err) {
    throw new Error(`Failed to fetch document from storage: ${(err as Error).message}`);
  }

  // ── Step 2: Text extraction ────────────────────────────────────────────────
  let extractedText = '';
  try {
    if (doc.mimeType === 'application/pdf') {
      const pdfFn = pdf as any;
      const pdfData = await pdfFn(fileBuffer);
      extractedText = pdfData.text || '';
    } else if (doc.mimeType.startsWith('image/')) {
      const { data: { text } } = await Tesseract.recognize(fileBuffer, 'eng');
      extractedText = text || '';
    } else {
      extractedText = fileBuffer.toString('utf-8');
    }
  } catch (err) {
    console.warn(`[DocProcessor] Text extraction failed for ${docId}:`, err);
    extractedText = '';
  }

  if (!extractedText.trim()) {
    await prisma.userDocument.update({
      where: { id: docId },
      data: { status: 'FAILED', summary: 'Document appears to be empty or unreadable.' },
    });
    return;
  }

  // ── Step 3: AI Classification ──────────────────────────────────────────────
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    await prisma.userDocument.update({
      where: { id: docId },
      data: { status: 'FAILED', summary: 'AI processing unavailable: missing API configuration.' },
    });
    return;
  }

  let docClass = {
    documentType: 'Other' as string,
    summary: 'Document classification unavailable.',
    partiesInvolved: [] as string[],
  };

  try {
    const classifier = new ChatGroq({
      model: 'llama-3.1-8b-instant',
      temperature: 0,
      apiKey: groqKey,
    });

    const classificationPrompt = ChatPromptTemplate.fromMessages([
      ['system', 'Analyze the following Indian legal document extract and classify it precisely. You must choose exactly one of the following document types: "Contract/Agreement", "Legal Notice", "Court Judgment/Order", "FIR/Police Report", "Identity/KYC Document", "Petition", "Affidavit", "Power of Attorney", "Will/Testament", or "Other".'],
      ['user', '{text}'],
    ]);

    const chain = classificationPrompt.pipe(classifier.withStructuredOutput(classificationSchema));
    docClass = await chain.invoke({ text: extractedText.substring(0, 2000) });
  } catch (err) {
    console.warn(`[DocProcessor] Classification failed for ${docId}:`, (err as Error).message);
  }

  // ── Step 4: RAG-augmented AI Legal Analysis ───────────────────────────────
  let analysisReport = 'Analysis could not be generated.';
  let analysisReportHi = 'Hindi analysis could not be generated.';
  let summaryHi = docClass.summary;
  try {
    // Translate summary quickly
    try {
      const groqSpeed = new Groq({ apiKey: groqKey });
      const transResponse = await groqSpeed.chat.completions.create({
         model: 'llama-3.1-8b-instant',
         messages: [{ role: 'user', content: `Translate this single sentence strictly into plain Hindi, returning only the translation without quotes: "${docClass.summary}"` }]
      });
      if (transResponse.choices[0]?.message?.content) summaryHi = transResponse.choices[0].message.content.trim();
    } catch { /* ignore and fallback to english summary */ }

    // Build legal context from top chunks in DB
    const allChunks = await prisma.legalChunk.findMany({
      take: 50,
      include: { act: true, section: true },
      orderBy: { createdAt: 'desc' },
    });

    const relevantLawsContext = allChunks
      .slice(0, 5)
      .map((c: any) => `[${c.act?.shortName || 'Unknown Act'} Sec ${c.section?.number || 'N/A'}] ${c.content}`)
      .join('\n\n');

    const groq = new Groq({ apiKey: groqKey });
    const docChunks = chunkText(extractedText);
    const docSelection = docChunks.slice(0, 6).join('\n\n');

    const systemPromptEn = [
      `You are Nyaya, an elite legal document analyzer for Indian law.`,
      `Document Type: **${docClass.documentType}**`,
      `Summary: ${docClass.summary}`,
      `Parties: ${docClass.partiesInvolved.join(', ') || 'Unknown'}`,
      ``,
      `TASK: ${typeSpecificInstructions(docClass.documentType)}`,
      ``,
      `Produce a structured legal analysis report in Markdown.`,
      `Cite applicable Indian laws. Note potential risks. End with a plain-language summary.`,
      `Do NOT give binding legal advice.`,
      ``,
      `RELEVANT INDIAN LAWS:`,
      relevantLawsContext || 'No specific laws retrieved. Apply general Indian legal principles.',
    ].join('\n');

    const systemPromptHi = [
      `You are Nyaya, an elite legal document analyzer for Indian law.`,
      `Document Type: **${docClass.documentType}**`,
      `Parties: ${docClass.partiesInvolved.join(', ') || 'Unknown'}`,
      ``,
      `TASK: ${typeSpecificInstructions(docClass.documentType)}`,
      ``,
      `Produce a structured legal analysis report in Markdown. YOU MUST WRITE THE ENTIRE REPORT EXCLUSIVELY IN HINDI.`,
      `Cite applicable Indian laws. Note potential risks. End with a plain-language summary. DO NOT give binding legal advice.`,
      ``,
      `RELEVANT INDIAN LAWS:`,
      relevantLawsContext || 'No specific laws retrieved. Apply general Indian legal principles.',
    ].join('\n');

    const [responseEn, responseHi] = await Promise.all([
      groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 2048,
        messages: [
          { role: 'system', content: systemPromptEn },
          { role: 'user', content: `Analyze this document:\n\n${docSelection}` },
        ],
      }),
      groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 2048,
        messages: [
          { role: 'system', content: systemPromptHi },
          { role: 'user', content: `Analyze this document. Your output MUST be completely in Hindi:\n\n${docSelection}` },
        ],
      })
    ]);

    analysisReport = responseEn.choices[0]?.message?.content || 'Analysis could not be generated.';
    analysisReportHi = responseHi.choices[0]?.message?.content || 'Hindi analysis could not be generated.';
  } catch (err) {
    console.warn(`[DocProcessor] Analysis failed for ${docId}:`, (err as Error).message);
    analysisReport = `Analysis encountered an error: ${(err as Error).message}`;
  }

  // ── Step 5: Persist results ───────────────────────────────────────────────
  await prisma.userDocument.update({
    where: { id: docId },
    data: {
      status: 'READY',
      documentType: docClass.documentType,
      summary: docClass.summary,
      summaryHi,
      partiesInvolved: docClass.partiesInvolved,
      analysisReport,
      analysisReportHi,
    },
  });

  console.log(`[DocProcessor] ✅ Document ${docId} processed successfully.`);
}

// ─── Worker setup ─────────────────────────────────────────────────────────────

let worker: Worker | null = null;

export async function startDocumentWorker(): Promise<Worker | null> {
  const conn = getRedisConnection();
  if (!conn) {
    console.warn('[DocProcessor] Redis unavailable — document worker not started. Processing will be synchronous.');
    return null;
  }

  try {
    // Only proceed if Redis actually responds
    await conn.ping();
  } catch (err) {
    console.warn('[DocProcessor] Redis failed to respond to ping. Skipping worker.');
    try { conn.disconnect(); } catch { /* ignore */ }
    return null;
  }

  worker = new Worker(
    DOCUMENT_QUEUE,
    async (job: Job) => {
      const { docId } = job.data;
      await processDocument(docId);
    },
    {
      connection: conn,
      concurrency: 3,
    }
  );

  worker.on('completed', (job) => {
    console.log(`[DocProcessor] Job ${job.id} completed for doc ${job.data.docId}`);
  });

  worker.on('failed', async (job, err) => {
    console.error(`[DocProcessor] Job ${job?.id} failed:`, err.message);
    if (job?.data?.docId) {
      await prisma.userDocument.update({
        where: { id: job.data.docId },
        data: { status: 'FAILED', summary: `Processing failed: ${err.message}` },
      }).catch(() => {});
    }
  });

  console.log('[DocProcessor] Worker started — listening on queue:', DOCUMENT_QUEUE);
  return worker;
}

// ─── Fallback: synchronous processing (when Redis unavailable) ───────────────
export { processDocument as processDocumentSync };
