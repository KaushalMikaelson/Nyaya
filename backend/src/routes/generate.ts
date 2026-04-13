import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { planLimiter } from '../middleware/planLimiter';
import { prisma } from '../prisma';
import Groq from 'groq-sdk';
import { VoyageAIClient } from 'voyageai';

const router = Router();
const getGroq = () => new Groq({ apiKey: process.env.GROQ_API_KEY });
const voyageKey = process.env.VOYAGE_API_KEY;
const voyageClient = voyageKey ? new VoyageAIClient({ apiKey: voyageKey }) : null;

// Mock fallback
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

router.use(authenticate);

router.post('/', planLimiter, async (req: AuthRequest, res): Promise<void> => {
  const { prompt, docType, partyA, partyB, specifics } = req.body;
  if (!prompt) {
    res.status(400).json({ error: 'Prompt is required' });
    return;
  }

  try {
    // Quota is now enforced by planLimiter middleware
    const dbUser = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!dbUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Embed intent for RAG
    const combinedIntent = `${docType} involving ${partyA} and ${partyB}. Concerns: ${specifics}. Goal: ${prompt}`;
    let queryEmbedding: number[] = [];
    
    if (voyageClient) {
      try {
        const response = await voyageClient.embed({ input: [combinedIntent], model: "voyage-law-2" });
        queryEmbedding = response.data?.[0]?.embedding || generateMockEmbedding(combinedIntent);
      } catch (err) {
        queryEmbedding = generateMockEmbedding(combinedIntent);
      }
    } else {
      queryEmbedding = generateMockEmbedding(combinedIntent);
    }

    const allChunks = await prisma.legalChunk.findMany({
      include: {
        act: true,
        section: true
      }
    });

    const scoredChunks = allChunks.map((chunk: any) => {
      let score = 0;
      if (chunk.embedding && chunk.embedding.length > 0) {
        score = cosineSimilarity(queryEmbedding, chunk.embedding as number[]);
      }
      return { ...chunk, score };
    });

    scoredChunks.sort((a: any, b: any) => b.score - a.score);
    const topLaws = scoredChunks.slice(0, 4);

    const relevantContext = topLaws.map((c: any) => 
      `[Framework: ${c.act?.shortName || ''} Sec ${c.section?.number || ''}] Provision Data: ${c.content}`
    ).join('\n\n');

    let templateInstructions = "";
    switch (docType?.toLowerCase().replace(/[^a-z0-9]/g, "")) {
      case 'legalnotice':
        templateInstructions = "TEMPLATE 1: LEGAL NOTICE. Use a formal legal notice format. Include Sender/Advocate letterhead, Date, 'By RPAD/Speed Post', subject line, Recitals mapping the cause of action, explicit Demands, and a strict compliance timeline (e.g., 15 days) before initiating litigation.";
        break;
      case 'fir':
      case 'firstinformationreport':
        templateInstructions = "TEMPLATE 2: FIR (First Information Report). Draft as a formal complaint addressed to the Station House Officer (SHO). Include Date/Time/Location of incident, accused details (if known), chronological factual matrix of the offense, and request to register an FIR under relevant penal provisions.";
        break;
      case 'rentagreement':
      case 'leaseagreement':
        templateInstructions = "TEMPLATE 3: RENT/LEASE AGREEMENT. Draft a formal lease instrument. Define Lessor and Lessee. Include Term of lease, Monthly Rent, Security Deposit, Maintenance responsibilities, Lock-in period, and clear Termination clauses.";
        break;
      case 'nda':
      case 'nondisclosureagreement':
        templateInstructions = "TEMPLATE 4: NON-DISCLOSURE AGREEMENT. Draft a corporate NDA. Define Disclosing and Receiving Parties. Explicitly define 'Confidential Information', exclusions from confidentiality, term of the agreement, and clauses for injunctive relief upon breach.";
        break;
      case 'employmentcontract':
        templateInstructions = "TEMPLATE 5: EMPLOYMENT CONTRACT. Draft a formal employment agreement. Include Position & Duties, Compensation/Remuneration, Working Hours, Non-Compete & Non-Solicitation clauses, Confidentiality, and Termination (with or without cause) logic.";
        break;
      case 'bailapplication':
        templateInstructions = "TEMPLATE 6: BAIL APPLICATION. Draft an application to be presented before a Magistrate or Sessions Court. Include court header, State vs Accused name, FIR details. Provide strong grounds for bail, assure non-tampering of evidence, and cite corresponding legal code sections.";
        break;
      case 'affidavit':
        templateInstructions = "TEMPLATE 7: AFFIDAVIT. Format as a sworn declaration. Begin with 'I, [Name], solemnly affirm and declare as under...'. Use numbered sequence. End with a Verification clause: 'Verified at [Place] on [Date] that the contents are true to my knowledge...'.";
        break;
      default:
        templateInstructions = "Use standard Indian legal drafting principles. Use clear headings, formal language, and a robust structure suitable for the requested document type.";
        break;
    }

    const systemPrompt = `You are a Senior Legal Draftsman in the Indian Legal System. 
Your objective is to generate a highly professional, rigorous, and legally binding document based on the user's constraints.

**TEMPLATE INSTRUCTIONS:**
${templateInstructions}

**HYBRID TEMPLATE ENGINE RULES:**
1. Structure: Strictly follow the formatting rules demanded by the template.
2. Recitals/Facts: Summarize the facts formally using legally precise language.
3. Legal Scaffolding (Crucial): Integrate the specific provisions provided in the retrieved laws. Quote or cite them where relevant.
4. Completeness: Do not leave placeholders empty if the user provided the information.

**RETRIEVED INDIAN LAWS FOR INTEGRATION:**
${relevantContext}

Only output the raw text of the document in Markdown format (use bolding, lists where necessary), do not include conversation chatter. Ensure it looks like a printable legal document.`;

    const userPrompt = `Generate a ${docType || 'Legal Document'}
Sender/First Party: ${partyA || '[Sender]'}
Receiver/Second Party: ${partyB || '[Receiver]'}
Core Issues/Specifics: ${specifics || 'Not provided'}
General Instructions: ${prompt}`;

    const groq = getGroq();
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 3000,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    });

    const generatedDoc = completion.choices[0]?.message?.content || "Failed to generate document";

    // Legacy counter keep in sync (non-critical)
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { docsCount: { increment: 1 } }
    }).catch(() => {});

    res.json({ document: generatedDoc, sources: topLaws });
  } catch (err) {
    console.error('Generation Error:', err);
    res.status(500).json({ error: 'Failed to generate document' });
  }
});

export default router;
