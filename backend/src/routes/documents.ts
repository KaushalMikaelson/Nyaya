// @ts-nocheck
import { Router } from 'express';
import multer from 'multer';
import pdf from 'pdf-parse';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma';
import Groq from 'groq-sdk';
import { VoyageAIClient } from 'voyageai';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const getGroq = () => new Groq({ apiKey: process.env.GROQ_API_KEY });
const voyageKey = process.env.VOYAGE_API_KEY;
const voyageClient = voyageKey ? new VoyageAIClient({ apiKey: voyageKey }) : null;

// Mock Embedding fallback
function generateMockEmbedding(text: string) {
  const vec = new Array(1024).fill(0);
  const seed = Array.from(text.substring(0, 10)).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  for (let i = 0; i < 1024; i++) {
    vec[i] = (Math.sin(seed + i) + 1) / 2;
  }
  return vec;
}

function cosineSimilarity(A: number[], B: number[]) {
  let dotproduct = 0, mA = 0, mB = 0;
  for (let i = 0; i < A.length; i++) {
    dotproduct += (A[i] * B[i]);
    mA += (A[i] * A[i]);
    mB += (B[i] * B[i]);
  }
  if (mA === 0 || mB === 0) return 0;
  return dotproduct / (Math.sqrt(mA) * Math.sqrt(mB));
}

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
  if (currentChunk.length > 0) chunks.push(currentChunk.join(" "));
  return chunks;
}

router.use(authenticate);

router.post('/analyze', upload.single('file'), async (req: AuthRequest, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: 'No document uploaded' });
    return;
  }

  try {
    const fileBuf = req.file.buffer;
    const fileMime = req.file.mimetype;
    let extractedText = '';

    if (fileMime === 'application/pdf') {
      const pdfData = await pdf(fileBuf);
      extractedText = pdfData.text;
    } else {
      extractedText = fileBuf.toString('utf-8');
    }

    if (!extractedText.trim()) {
      res.status(400).json({ error: 'Document appears to be empty or unreadable.' });
      return;
    }

    // Monetization Check
    const dbUser = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!dbUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    if (!dbUser.isPro && dbUser.docsCount >= 2) {
      res.status(403).json({ error: 'FREE_LIMIT_REACHED', message: 'You have exhausted your 2 free AI Document Analyses. Please upgrade to Pro.' });
      return;
    }

    // Pipeline Stage: Chunking
    const docChunks = chunkText(extractedText);
    
    // We'll analyze the document by finding relevant laws across all chunks. 
    // To save time & API calls, we'll embed up to 5 chunks of the document to find the core topical intent.
    const chunksToEmbed = docChunks.slice(0, 5); 
    
    let docEmbeddings: number[][] = [];
    if (voyageClient) {
      try {
        const response = await voyageClient.embed({ input: chunksToEmbed, model: "voyage-law-2" });
        docEmbeddings = response.data.map((d: any) => d.embedding);
      } catch (err) {
        docEmbeddings = chunksToEmbed.map(t => generateMockEmbedding(t));
      }
    } else {
      docEmbeddings = chunksToEmbed.map(t => generateMockEmbedding(t));
    }

    // Pipeline Stage: Retrieval (Cross-referencing doc embeddings with legal database)
    const allLegalChunks = await prisma.legalChunk.findMany({
      include: {
        act: true,
        section: true
      }
    });

    // Score all chunks against the document's top vectors
    let scoredChunks = allLegalChunks.map((lChunk: any) => {
      let maxScore = 0;
      if (lChunk.embedding && lChunk.embedding.length > 0) {
        for (const docEmb of docEmbeddings) {
          const score = cosineSimilarity(docEmb, lChunk.embedding);
          if (score > maxScore) maxScore = score;
        }
      }
      return { ...lChunk, score: maxScore };
    });

    scoredChunks.sort((a: any, b: any) => b.score - a.score);
    const topLegalMatches = scoredChunks.slice(0, 5);
    
    const relevantLawsContext = topLegalMatches.map((c: any) => 
      `[Source: ${c.act?.shortName || ''} Sec ${c.section?.number || ''}] ${c.content}`
    ).join('\n\n');

    // Pipeline Stage: AI Analysis via Groq
    const groq = getGroq();
    const systemPrompt = `You are Nyaay, an elite legal document analyzer. 
You are provided with a user's document text, and relevant Indian Law provisions drawn from our database.
Your Goal: Analyze the document strictly in the context of the provided Indian Laws. Highlight potential legal risks, required compliances, clauses that appear anomalous, and formulate a structured summary. Mention the specific cited laws when they relate directly to the document. Do not give binding legal advice.
--- RELEVANT INDIAN LAWS ---
${relevantLawsContext}
`;

    // Send the first ~2000 words of the extracted document to prevent token limits
    const docSelection = docChunks.slice(0, 6).join("\n\n");

    const groqResponse = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 2048,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Here is the document to analyze: \n\n${docSelection}` }
      ]
    });

    const analysisReport = groqResponse.choices[0]?.message?.content || "Analysis could not be generated.";

    // Option: Automatically create a new conversation thread containing the analysis.
    const conversation = await prisma.conversation.create({
      data: {
        userId: req.user!.userId,
        title: 'Document Analysis',
        messages: {
          create: [
            { role: 'user', content: 'Uploaded a Document for Analysis.' },
            { role: 'assistant', content: analysisReport }
          ]
        }
      }
    });

    if (dbUser && !dbUser.isPro) {
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { docsCount: { increment: 1 } }
      });
    }

    res.json({ analysis: analysisReport, conversationId: conversation.id, lawsRetrieved: topLegalMatches.map(m => m.id) });

  } catch (error) {
    console.error('Document analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze document' });
  }
});

export default router;
