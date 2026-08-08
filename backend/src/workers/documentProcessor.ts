// @ts-nocheck
/**
 * Document Processor Worker (BullMQ)
 * Processes uploaded documents asynchronously via the Python RAG microservice:
 *   1. Fetch file from S3 (or local in dev)
 *   2. Send to Python RAG /process-document (OCR, classification, analysis)
 *   3. Update UserDocument with results → status READY
 */

import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '../prisma';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { getPythonRagUrl } from '../services/retrieval';

// ─── Redis connection ────────────────────────────────────────────────────────

const REDIS_URL = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL || 'redis://localhost:6379';

let redisConnection: IORedis | null = null;

function getRedisConnection(): IORedis | null {
  if (!REDIS_URL || REDIS_URL === 'redis://localhost:6379' || REDIS_URL.includes('127.0.0.1')) {
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

  // ── Step 2: Delegate to Python RAG /process-document ─────────────────────
  console.log(`[DocProcessor] Sending document ${docId} to Python RAG service...`);
  const pyUrl = getPythonRagUrl();
  const pyRes = await fetch(`${pyUrl}/process-document`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pdfBase64: fileBuffer.toString('base64') }),
  });

  if (!pyRes.ok) {
    const errText = await pyRes.text();
    throw new Error(`Python RAG /process-document returned ${pyRes.status}: ${errText}`);
  }

  const pyData: any = await pyRes.json();

  if (pyData.status !== 'READY') {
    await prisma.userDocument.update({
      where: { id: docId },
      data: {
        status: 'FAILED',
        summary: pyData.summary || 'Document processing failed.',
      },
    });
    return;
  }

  // ── Step 3: Persist results ───────────────────────────────────────────────
  await prisma.userDocument.update({
    where: { id: docId },
    data: {
      status: 'READY',
      documentType: pyData.documentType,
      summary: pyData.summary,
      summaryHi: pyData.summaryHi || pyData.summary,
      partiesInvolved: pyData.partiesInvolved || [],
      extractedText: pyData.extractedText,
      analysisReport: pyData.analysisReport,
      analysisReportHi: pyData.analysisReportHi,
    },
  });

  console.log(`[DocProcessor] Document ${docId} processed successfully.`);
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
