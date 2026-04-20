// @ts-nocheck
/**
 * Document Management Routes
 *
 * POST /api/documents/upload-url       — Get presigned/local upload URL
 * POST /api/documents/local-upload     — Dev-mode: upload file to local disk
 * POST /api/documents/confirm          — Confirm upload + queue async AI analysis
 * GET  /api/documents                  — List authenticated user's documents
 * GET  /api/documents/:id              — Get single document with analysis
 * DELETE /api/documents/:id            — Soft-delete document (DPDP right-to-erasure)
 * POST /api/documents/analyze          — Legacy: analyze uploaded file synchronously
 */

import { Router } from 'express';
import multer from 'multer';
import pdf from 'pdf-parse';
import Tesseract from 'tesseract.js';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma';
import Groq from 'groq-sdk';
import { VoyageAIClient } from 'voyageai';
import { ChatGroq } from '@langchain/groq';
import { z } from 'zod';
import { ChatPromptTemplate } from '@langchain/core/prompts';

const router = Router();

// ─── Multer config for in-memory processing ───────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB (per PRD)
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPG, PNG, WEBP, and TXT files are allowed.'));
    }
  },
});

// ─── Disk storage for local-upload fallback ───────────────────────────────────
const LOCAL_DOC_DIR = path.join(process.cwd(), 'uploads', 'documents');
if (!fs.existsSync(LOCAL_DOC_DIR)) fs.mkdirSync(LOCAL_DOC_DIR, { recursive: true });

const diskUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, LOCAL_DOC_DIR),
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
      cb(null, `${unique}${path.extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
});

// ─── External services ───────────────────────────────────────────────────────
const getGroq = () => new Groq({ apiKey: process.env.GROQ_API_KEY });
const voyageKey = process.env.VOYAGE_API_KEY;
const voyageClient = voyageKey ? new VoyageAIClient({ apiKey: voyageKey }) : null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateMockEmbedding(text: string) {
  const vec = new Array(1024).fill(0);
  const seed = Array.from(text.substring(0, 10)).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  for (let i = 0; i < 1024; i++) vec[i] = (Math.sin(seed + i) + 1) / 2;
  return vec;
}

function cosineSimilarity(A: number[], B: number[]) {
  let dot = 0, mA = 0, mB = 0;
  for (let i = 0; i < A.length; i++) { dot += A[i] * B[i]; mA += A[i] * A[i]; mB += B[i] * B[i]; }
  if (!mA || !mB) return 0;
  return dot / (Math.sqrt(mA) * Math.sqrt(mB));
}

function chunkText(text: string, maxWords = 300): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let cur: string[] = [];
  for (const w of words) {
    cur.push(w);
    if (cur.length >= maxWords) { chunks.push(cur.join(' ')); cur = []; }
  }
  if (cur.length) chunks.push(cur.join(' '));
  return chunks;
}

function docTypeInstructions(type: string): string {
  const map: Record<string, string> = {
    'Contract/Agreement': 'Identify all parties, highlight payment clauses, termination conditions, penalty clauses, jurisdiction, and flag missing standard clauses or unfair terms under Indian Contract Act.',
    'Legal Notice': 'Extract sender, recipient, demands, statutory basis, response deadline. Assess legal weight and recommend immediate action steps.',
    'Court Judgment/Order': 'Summarize ratio decidendi, final order/decree, compliance requirements, applicable precedents under Indian law.',
    'FIR/Police Report': 'Extract BNS/IPC sections charged, accused/complainant, severity (bailable/non-bailable), and immediate steps for legal defence.',
    'Identity/KYC Document': 'Flag PII exposure risks under DPDP Act 2023. Confirm document type and validity indicators.',
    'Petition': 'Identify reliefs sought, grounds, jurisdiction, and evaluate strength of legal arguments.',
    'Affidavit': 'Check completeness, accuracy of sworn statements, notarization requirements.',
    'Power of Attorney': 'Scope of powers granted, revocation clauses, validity period, misuse risks.',
    "Will/Testament": 'Asset distribution clarity, witness requirements under Indian Succession Act, ambiguous clauses.',
    'Other': 'Identify legal themes, obligations, risks, and compliance requirements under relevant Indian law.',
  };
  return map[type] || map['Other'];
}

const classificationSchema = z.object({
  documentType: z.enum([
    'Contract/Agreement', 'Legal Notice', 'Court Judgment/Order',
    'FIR/Police Report', 'Identity/KYC Document', 'Petition',
    'Affidavit', 'Power of Attorney', 'Will/Testament', 'Other',
  ]),
  summary: z.string().describe('A 1-2 sentence high-level summary'),
  partiesInvolved: z.array(z.string()).describe('Names, roles, or organizations'),
});

// ─── Auth on all routes ───────────────────────────────────────────────────────
router.use(authenticate);

// ─────────────────────────────────────────────────────────────────────────────
// POST /upload-url — Generate presigned URL (S3 in prod, local in dev)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/upload-url', async (req: AuthRequest, res): Promise<void> => {
  const { fileName, mimeType, sizeBytes } = req.body;

  if (!fileName || !mimeType || !sizeBytes) {
    res.status(400).json({ error: 'fileName, mimeType, and sizeBytes are required.' });
    return;
  }

  const ALLOWED_MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  if (!ALLOWED_MIMES.includes(mimeType)) {
    res.status(400).json({ error: 'Unsupported file type. Allowed: PDF, JPG, PNG, WEBP.' });
    return;
  }

  if (sizeBytes > 25 * 1024 * 1024) {
    res.status(400).json({ error: 'File too large. Maximum size is 25 MB.' });
    return;
  }

  // Plan check: Free citizens cannot upload documents
  const dbUser = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!dbUser) { res.status(404).json({ error: 'User not found.' }); return; }

  if (dbUser.role === 'CITIZEN' && !dbUser.isPro) {
    res.status(403).json({
      error: 'UPGRADE_REQUIRED',
      message: 'Document uploads require Citizen Pro (₹499/month) or a Lawyer plan. Upgrade to continue.',
    });
    return;
  }

  const ext = path.extname(fileName).toLowerCase() || '.pdf';
  const s3Key = `documents/${req.user!.userId}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
  const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;

  // In production with AWS: generate actual S3 presigned URL
  // For now: return local upload URL
  const isLocal = !process.env.AWS_S3_BUCKET;

  res.json({
    uploadUrl: isLocal ? `${BACKEND_URL}/api/documents/local-upload` : `/* S3 presigned URL */`,
    s3Key,
    isLocal,
    // In prod: fields for S3 multipart POST would be here
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /local-upload — Dev fallback: receives file, stores to disk, creates record
// ─────────────────────────────────────────────────────────────────────────────
router.post('/local-upload', diskUpload.single('file'), async (req: AuthRequest, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: 'No file received.' });
    return;
  }

  const { title, caseId, consentGranted } = req.body;
  const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;
  const fileUrl = `${BACKEND_URL}/api/documents/files/${req.file.filename}`;

  try {
    const docRecord = await prisma.userDocument.create({
      data: {
        userId: req.user!.userId,
        title: title || req.file.originalname,
        originalName: req.file.originalname,
        s3Key: req.file.filename,
        s3Url: fileUrl,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        status: 'PENDING',
        caseId: caseId || null,
        consentGrantedAt: consentGranted === 'true' ? new Date() : null,
      },
    });

    res.status(201).json({
      success: true,
      docId: docRecord.id,
      message: 'File uploaded. AI analysis will begin shortly.',
    });
  } catch (err) {
    console.error('[local-upload]', err);
    res.status(500).json({ error: 'Failed to save document record.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /confirm — Confirm S3 upload and queue async AI processing
// ─────────────────────────────────────────────────────────────────────────────
router.post('/confirm', async (req: AuthRequest, res): Promise<void> => {
  const { s3Key, fileName, mimeType, sizeBytes, title, caseId, consentGranted } = req.body;

  if (!s3Key || !mimeType || !sizeBytes) {
    res.status(400).json({ error: 's3Key, mimeType, and sizeBytes are required.' });
    return;
  }

  try {
    const s3Url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${s3Key}`;

    const docRecord = await prisma.userDocument.create({
      data: {
        userId: req.user!.userId,
        title: title || fileName || s3Key.split('/').pop() || 'Untitled Document',
        originalName: fileName || s3Key.split('/').pop() || 'document',
        s3Key,
        s3Url,
        mimeType,
        sizeBytes: parseInt(sizeBytes),
        status: 'PENDING',
        caseId: caseId || null,
        consentGrantedAt: consentGranted ? new Date() : null,
      },
    });

    // Attempt to queue BullMQ job
    try {
      const { Queue } = await import('bullmq');
      const IORedis = (await import('ioredis')).default;
      const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
      const conn = new IORedis(REDIS_URL, { maxRetriesPerRequest: null, enableReadyCheck: false, lazyConnect: true, connectTimeout: 1500 });
      const queue = new Queue('document-processing', { connection: conn });
      await queue.add('process-document', { docId: docRecord.id }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
    } catch {
      // Queue unavailable — sync fallback triggered below
      const { processDocumentSync } = await import('../workers/documentProcessor');
      processDocumentSync(docRecord.id).catch(console.error);
    }

    res.status(201).json({
      success: true,
      docId: docRecord.id,
      message: 'Document confirmed. AI analysis queued.',
    });
  } catch (err) {
    console.error('[confirm]', err);
    res.status(500).json({ error: 'Failed to confirm document upload.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /analyze-doc — Trigger AI analysis for an existing document by ID
// ─────────────────────────────────────────────────────────────────────────────
router.post('/analyze-doc/:id', async (req: AuthRequest, res): Promise<void> => {
  const { id } = req.params;

  try {
    const doc = await prisma.userDocument.findFirst({
      where: { id, userId: req.user!.userId, deletedAt: null },
    });

    if (!doc) { res.status(404).json({ error: 'Document not found.' }); return; }
    if (doc.status === 'PROCESSING') { res.status(409).json({ error: 'Document is already being processed.' }); return; }

    // Queue or sync process
    try {
      const { Queue } = await import('bullmq');
      const IORedis = (await import('ioredis')).default;
      const conn = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null, enableReadyCheck: false, lazyConnect: true, connectTimeout: 1500 });
      const queue = new Queue('document-processing', { connection: conn });
      await queue.add('process-document', { docId: doc.id }, { attempts: 3 });
    } catch {
      const { processDocumentSync } = await import('../workers/documentProcessor');
      processDocumentSync(doc.id).catch(console.error);
    }

    await prisma.userDocument.update({ where: { id }, data: { status: 'PENDING' } });
    res.json({ success: true, message: 'AI analysis re-queued.' });
  } catch (err) {
    console.error('[analyze-doc]', err);
    res.status(500).json({ error: 'Failed to queue analysis.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET / — List authenticated user's documents
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req: AuthRequest, res): Promise<void> => {
  try {
    const { status, caseId, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {
      userId: req.user!.userId,
      deletedAt: null, // exclude soft-deleted
    };
    if (status) where.status = status;
    if (caseId) where.caseId = caseId;

    const [docs, total] = await Promise.all([
      prisma.userDocument.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
        select: {
          id: true,
          title: true,
          originalName: true,
          mimeType: true,
          sizeBytes: true,
          status: true,
          documentType: true,
          summary: true,
          partiesInvolved: true,
          caseId: true,
          case: { select: { id: true, title: true } },
          consentGrantedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.userDocument.count({ where }),
    ]);

    res.json({
      success: true,
      data: docs,
      meta: { total, page: parseInt(page as string), limit: parseInt(limit as string) },
    });
  } catch (err) {
    console.error('[GET /documents]', err);
    res.status(500).json({ error: 'Failed to fetch documents.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /:id — Get single document with full analysis
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', async (req: AuthRequest, res): Promise<void> => {
  try {
    const doc = await prisma.userDocument.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.userId,
        deletedAt: null,
      },
      include: {
        case: { select: { id: true, title: true, status: true } },
      },
    });

    if (!doc) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }

    res.json({ success: true, data: doc });
  } catch (err) {
    console.error('[GET /documents/:id]', err);
    res.status(500).json({ error: 'Failed to fetch document.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /:id — Soft-delete (DPDP Act 2023: right to erasure)
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', async (req: AuthRequest, res): Promise<void> => {
  try {
    const doc = await prisma.userDocument.findFirst({
      where: { id: req.params.id, userId: req.user!.userId, deletedAt: null },
    });

    if (!doc) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }

    // Soft delete — DPDP compliant (PII purge scheduled after 30 days)
    await prisma.userDocument.update({
      where: { id: doc.id },
      data: {
        deletedAt: new Date(),
        // Clear PII fields immediately
        summary: null,
        analysisReport: null,
        partiesInvolved: [],
      },
    });

    res.json({ success: true, message: 'Document deleted. Personal data will be purged within 30 days per DPDP Act 2023.' });
  } catch (err) {
    console.error('[DELETE /documents/:id]', err);
    res.status(500).json({ error: 'Failed to delete document.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /files/:filename — Serve locally stored document files (dev only)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/files/:filename', async (req: AuthRequest, res): Promise<void> => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'Files served via CDN in production.' });
    return;
  }
  const filePath = path.join(LOCAL_DOC_DIR, req.params.filename as string);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'File not found.' });
    return;
  }
  res.sendFile(filePath);
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /analyze — Legacy synchronous analysis (kept for backward compat)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/analyze', upload.single('file'), async (req: AuthRequest, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: 'No document uploaded' });
    return;
  }

  try {
    const fileBuf = req.file.buffer;
    const fileMime = req.file.mimetype;
    let extractedText = '';

    const dbUser = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!dbUser) { res.status(404).json({ error: 'User not found' }); return; }

    const userDocsCount = await prisma.userDocument.count({ where: { userId: dbUser.id, deletedAt: null } });

    if (!dbUser.isPro && dbUser.role === 'CITIZEN' && userDocsCount >= 3) {
      res.status(403).json({
        error: 'FREE_LIMIT_REACHED',
        message: 'You have exhausted 3 free AI Document Analyses. Please upgrade to Pro.',
      });
      return;
    }

    // Text extraction
    if (fileMime === 'application/pdf') {
      const pdfFn = pdf as any;
      const pdfData = await pdfFn(fileBuf);
      extractedText = pdfData.text;
    } else if (fileMime.startsWith('image/')) {
      const { data: { text } } = await Tesseract.recognize(fileBuf, 'eng');
      extractedText = text;
    } else {
      extractedText = fileBuf.toString('utf-8');
    }

    if (!extractedText.trim()) {
      res.status(400).json({ error: 'Document appears to be empty or unreadable.' });
      return;
    }

    // AI Classification
    const groqClassifier = new ChatGroq({ model: 'llama-3.1-8b-instant', temperature: 0, apiKey: process.env.GROQ_API_KEY });
    const classificationPrompt = ChatPromptTemplate.fromMessages([
      ['system', 'Analyze the following Indian legal document and classify it. You must choose exactly one of the following document types: "Contract/Agreement", "Legal Notice", "Court Judgment/Order", "FIR/Police Report", "Identity/KYC Document", "Petition", "Affidavit", "Power of Attorney", "Will/Testament", or "Other".'],
      ['user', '{text}'],
    ]);

    let docClass = { documentType: 'Other', summary: 'Unknown document type', partiesInvolved: [] as string[] };
    try {
      const classChain = classificationPrompt.pipe(groqClassifier.withStructuredOutput(classificationSchema));
      docClass = await classChain.invoke({ text: extractedText.substring(0, 2000) });
    } catch (e) {
      console.warn('Classification failed:', e);
    }

    // RAG retrieval
    const docChunks = chunkText(extractedText);
    const chunksToEmbed = docChunks.slice(0, 5);
    let docEmbeddings: number[][] = [];
    if (voyageClient) {
      try {
        const response = await voyageClient.embed({ input: chunksToEmbed, model: 'voyage-law-2' });
        docEmbeddings = response.data?.map((d: any) => d.embedding) || chunksToEmbed.map(t => generateMockEmbedding(t));
      } catch {
        docEmbeddings = chunksToEmbed.map(t => generateMockEmbedding(t));
      }
    } else {
      docEmbeddings = chunksToEmbed.map(t => generateMockEmbedding(t));
    }

    const allLegalChunks = await prisma.legalChunk.findMany({ include: { act: true, section: true } });
    let scoredChunks = allLegalChunks.map((lChunk: any) => {
      let maxScore = 0;
      if (lChunk.embedding?.length) {
        for (const emb of docEmbeddings) {
          const s = cosineSimilarity(emb, lChunk.embedding as number[]);
          if (s > maxScore) maxScore = s;
        }
      }
      return { ...lChunk, score: maxScore };
    });
    scoredChunks.sort((a: any, b: any) => b.score - a.score);
    const topLegalMatches = scoredChunks.slice(0, 5);
    const relevantLawsContext = topLegalMatches
      .map((c: any) => `[${c.act?.shortName || ''} Sec ${c.section?.number || ''}] ${c.content}`)
      .join('\n\n');

    // AI Analysis
    const groq = getGroq();
    const systemPrompt = [
      `You are Nyaya, an elite legal document analyzer.`,
      `Document Type: **${docClass.documentType}**`,
      `Summary: ${docClass.summary}`,
      `Parties: ${docClass.partiesInvolved.join(', ')}`,
      ``,
      `TASK: ${docTypeInstructions(docClass.documentType)}`,
      ``,
      `Produce a structured Markdown report. Cite relevant Indian laws. Note risks and obligations.`,
      `Do NOT give binding legal advice.`,
      ``,
      `RELEVANT LAWS:`,
      relevantLawsContext || 'No specific laws retrieved.',
    ].join('\n');

    const docSelection = docChunks.slice(0, 6).join('\n\n');
    const groqResponse = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 2048,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze this document:\n\n${docSelection}` },
      ],
    });
    const analysisReport = groqResponse.choices[0]?.message?.content || 'Analysis could not be generated.';

    // Save as UserDocument
    const userDoc = await prisma.userDocument.create({
      data: {
        userId: req.user!.userId,
        title: `${docClass.documentType} — ${new Date().toLocaleDateString('en-IN')}`,
        originalName: req.file.originalname,
        s3Key: `legacy/${req.user!.userId}/${Date.now()}`,
        s3Url: '',
        mimeType: fileMime,
        sizeBytes: fileBuf.length,
        status: 'READY',
        documentType: docClass.documentType,
        summary: docClass.summary,
        partiesInvolved: docClass.partiesInvolved,
        analysisReport,
        consentGrantedAt: new Date(),
      },
    });

    // Also create conversation for context
    const existingConvId = req.body.conversationId;
    let conversation;
    if (existingConvId) {
      const existing = await prisma.conversation.findFirst({ where: { id: existingConvId, userId: req.user!.userId } });
      if (existing) {
        conversation = await prisma.conversation.update({
          where: { id: existingConvId },
          data: {
            updatedAt: new Date(),
            messages: {
              create: [
                { role: 'user', content: `Uploaded ${docClass.documentType} for analysis. Summary: ${docClass.summary}` },
                { role: 'assistant', content: analysisReport },
              ],
            },
          },
        });
      }
    }
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          userId: req.user!.userId,
          title: `Analysis: ${docClass.documentType}`,
          messages: {
            create: [
              { role: 'user', content: `Uploaded ${docClass.documentType} for analysis. Summary: ${docClass.summary}` },
              { role: 'assistant', content: analysisReport },
            ],
          },
        },
      });
    }

    if (!dbUser.isPro && dbUser.role === 'CITIZEN') {
      // Free usage is tracked via UserDocument count querying, no increment needed here
    }

    res.json({
      analysis: analysisReport,
      classification: docClass,
      conversationId: conversation.id,
      docId: userDoc.id,
      lawsRetrieved: topLegalMatches.map((m: any) => m.id),
    });
  } catch (error) {
    console.error('Document analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze document' });
  }
});

export default router;
