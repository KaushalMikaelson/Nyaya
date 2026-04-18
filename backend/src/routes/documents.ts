import { Router } from 'express';
import multer from 'multer';
import pdf from 'pdf-parse';
import Tesseract from 'tesseract.js';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma';
import Groq from 'groq-sdk';
import { VoyageAIClient } from 'voyageai';
import { ChatGroq } from '@langchain/groq';
import { z } from 'zod';
import { ChatPromptTemplate } from '@langchain/core/prompts';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

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

    // Monetization Check
    const dbUser = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!dbUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    if (!dbUser.isPro && dbUser.docsCount >= 3) {
      res.status(403).json({ error: 'FREE_LIMIT_REACHED', message: 'You have exhausted your 3 free AI Document Analyses. Please upgrade to Pro.' });
      return;
    }

    // ------------------------------------------------------------------
    // PIPELINE 1: OCR & TEXT EXTRACTION 
    // ------------------------------------------------------------------
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

    // ------------------------------------------------------------------
    // PIPELINE 2: AUTO-CLASSIFICATION (Langchain + Zod)
    // ------------------------------------------------------------------
    const groqClassifier = new ChatGroq({
      model: 'llama-3.1-8b-instant',
      temperature: 0,
      apiKey: process.env.GROQ_API_KEY
    });

    const classificationSchema = z.object({
      documentType: z.enum(['Contract/Agreement', 'Legal Notice', 'Court Judgment/Order', 'FIR/Police Report', 'Identity/KYC Document', 'Other']),
      summary: z.string().describe("A 1-2 sentence high-level summary of the document"),
      partiesInvolved: z.array(z.string()).describe("Names, roles, or organizations involved in the document")
    });

    const classificationPrompt = ChatPromptTemplate.fromMessages([
      ['system', 'Analyze the following document extract and classify its legal nature.'],
      ['user', '{text}']
    ]);

    let docClass = {
      documentType: 'Other',
      summary: 'Unknown document type',
      partiesInvolved: [] as string[]
    };

    try {
      const classChain = classificationPrompt.pipe(groqClassifier.withStructuredOutput(classificationSchema));
      // Extract based on the first approx 1500 characters
      docClass = await classChain.invoke({ text: extractedText.substring(0, 1500) });
    } catch (e) {
      console.warn("Classification failed, continuing with default.", e);
    }

    // ------------------------------------------------------------------
    // PIPELINE 3: RAG EMBEDDING & LAW RETRIEVAL
    // ------------------------------------------------------------------
    const docChunks = chunkText(extractedText);
    const chunksToEmbed = docChunks.slice(0, 5); // Just top chunks for context intent
    
    let docEmbeddings: number[][] = [];
    if (voyageClient) {
      try {
        const response = await voyageClient.embed({ input: chunksToEmbed, model: "voyage-law-2" });
        docEmbeddings = response.data?.map((d: any) => d.embedding) || chunksToEmbed.map(t => generateMockEmbedding(t));
      } catch (err) {
        docEmbeddings = chunksToEmbed.map(t => generateMockEmbedding(t));
      }
    } else {
      docEmbeddings = chunksToEmbed.map(t => generateMockEmbedding(t));
    }

    const allLegalChunks = await prisma.legalChunk.findMany({ include: { act: true, section: true } });

    let scoredChunks = allLegalChunks.map((lChunk: any) => {
      let maxScore = 0;
      if (lChunk.embedding && lChunk.embedding.length > 0) {
        for (const docEmb of docEmbeddings) {
          const score = cosineSimilarity(docEmb, lChunk.embedding as number[]);
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

    // ------------------------------------------------------------------
    // PIPELINE 4: AI ANALYSIS BY DOCUMENT TYPE
    // ------------------------------------------------------------------
    let typeSpecificInstructions = "";
    switch(docClass.documentType) {
      case 'Contract/Agreement':
        typeSpecificInstructions = "Focus on termination clauses, liabilities, financial obligations, specific performance, and potential breach consequences."; break;
      case 'Legal Notice':
        typeSpecificInstructions = "Focus on the timeline to respond, demanded actions, statutory violations claimed, and the legal weight of the threats made."; break;
      case 'FIR/Police Report':
        typeSpecificInstructions = "Focus on the penal sections applied, chronology of events, severity of charges (bailable/non-bailable), and next immediate legal steps."; break;
      case 'Court Judgment/Order':
        typeSpecificInstructions = "Focus on the ratio decidendi (the court's reasoning), the final decree/order, and any compliance required by the parties."; break;
      case 'Identity/KYC Document':
        typeSpecificInstructions = "This is a KYC document. Briefly summarize its validity and identify if any sensitive PII exposes legal risks."; break;
      default:
        typeSpecificInstructions = "Identify the core legal themes, potential risks, and compliance requirements."; break;
    }

    const groq = getGroq();
    const systemPrompt = `You are Nyaay, an elite legal document analyzer. 
You are analyzing a document classified as a **${docClass.documentType}**.
Document Summary: ${docClass.summary}
Parties Involved: ${docClass.partiesInvolved.join(", ")}

**Your Goal**: Analyze the user's document text strictly using the provided Indian Laws as context. 
${typeSpecificInstructions}
Highlight potential legal risks, required compliances, and clauses that appear anomalous. 
Formulate a structured legal report (use Markdown). Mention the specific cited laws when they relate directly to the document. 
Do not give binding legal advice.

--- RELEVANT INDIAN LAWS ---
${relevantLawsContext}
`;

    const docSelection = docChunks.slice(0, 6).join("\n\n");
    const groqResponse = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 2048,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Here is the document extract to analyze: \n\n${docSelection}` }
      ]
    });

    const analysisReport = groqResponse.choices[0]?.message?.content || "Analysis could not be generated.";

    const existingConvId = req.body.conversationId;
    let conversation;

    if (existingConvId) {
      const existingConv = await prisma.conversation.findFirst({
        where: { id: existingConvId, userId: req.user!.userId }
      });
      
      if (!existingConv) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }

      conversation = await prisma.conversation.update({
        where: { id: existingConvId },
        data: {
          updatedAt: new Date(),
          messages: {
            create: [
              { role: 'user', content: `Uploaded a ${docClass.documentType} for Analysis.\nSummary: ${docClass.summary}` },
              { role: 'assistant', content: analysisReport }
            ]
          }
        }
      });
    } else {
      conversation = await prisma.conversation.create({
        data: {
          userId: req.user!.userId,
          title: `Analysis: ${docClass.documentType}`,
          messages: {
            create: [
              { role: 'user', content: `Uploaded a ${docClass.documentType} for Analysis.\nSummary: ${docClass.summary}` },
              { role: 'assistant', content: analysisReport }
            ]
          }
        }
      });
    }

    if (dbUser && !dbUser.isPro) {
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { docsCount: { increment: 1 } }
      });
    }

    res.json({ 
      analysis: analysisReport, 
      classification: docClass,
      conversationId: conversation.id, 
      lawsRetrieved: topLegalMatches.map((m: any) => m.id) 
    });

  } catch (error) {
    console.error('Document analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze document' });
  }
});

export default router;
