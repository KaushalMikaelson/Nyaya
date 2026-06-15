import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { planLimiter } from '../middleware/planLimiter';
import { prisma } from '../prisma';

import { ChatGroq } from '@langchain/groq';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { hybridSearch, rerankCandidates } from '../services/retrieval';

const router = Router();

let _pipeline: any = null;
async function getPipeline() {
  if (_pipeline) return _pipeline;
  // Dynamic import for ESM package
  const { pipeline, env } = await import('@xenova/transformers');
  env.allowLocalModels = true;
  _pipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: false });
  return _pipeline;
}

router.use(authenticate);

// Utility: Mock Embedding if no voyage key
function generateMockEmbedding(text: string): number[] {
  const vec = new Array(1024).fill(0);
  const seed = Array.from(text.substring(0, 10)).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  for (let i = 0; i < 1024; i++) {
    vec[i] = (Math.sin(seed + i) + 1) / 2;
  }
  return vec;
}

// ─── GET /conversations ───────────────────────────────────────────────────────
router.get('/conversations', async (req: AuthRequest, res): Promise<void> => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { userId: req.user!.userId },
      orderBy: { updatedAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// ─── POST /conversations ──────────────────────────────────────────────────────
router.post('/conversations', async (req: AuthRequest, res): Promise<void> => {
  try {
    const { title } = req.body;
    const conversation = await prisma.conversation.create({
      data: { userId: req.user!.userId, title: title || 'New Chat' }
    });
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// ─── DELETE /conversations/:id ────────────────────────────────────────────────
router.delete('/conversations/:id', async (req: AuthRequest, res): Promise<void> => {
  const id = String(req.params.id);
  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id, userId: req.user!.userId }
    });
    if (!conversation) { res.status(404).json({ error: 'Conversation not found' }); return; }
    await prisma.message.deleteMany({ where: { conversationId: id } });
    await prisma.conversation.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// ─── POST /conversations/:id/messages ────────────────────────────────────────
router.post('/conversations/:id/messages', planLimiter, async (req: AuthRequest, res): Promise<void> => {
  const id = String(req.params.id);
  const { content, language } = req.body;

  if (!content) {
    res.status(400).json({ error: 'Message content is required' });
    return;
  }

  try {
    // ── Verify user & conversation ───────────────────────────────────────────
    const dbUser = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!dbUser) { res.status(404).json({ error: 'User not found' }); return; }

    const conversation = await prisma.conversation.findFirst({
      where: { id, userId: req.user!.userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });
    if (!conversation) { res.status(404).json({ error: 'Conversation not found' }); return; }

    // ── Save user message ────────────────────────────────────────────────────
    const userMessage = await prisma.message.create({
      data: { role: 'user', content, conversationId: id }
    });

    // ── Step A: Build expanded RAG query from conversation context ────────────
    // When the user asks a follow-up like "what does that mean?", we need to
    // enrich the query with prior context so the vector search retrieves the
    // right chunks — not random unrelated ones.
    const priorUserMessages = conversation.messages
      .filter(m => m.role === 'user')
      .slice(-2)   // last 2 user turns (excluding the current one)
      .map(m => m.content);
    const expandedQuery = priorUserMessages.length > 0
      ? [...priorUserMessages, content].join(' | ')
      : content;
    console.log(`🔍 Expanded RAG query: "${expandedQuery.substring(0, 120)}..."`);

    // ── Step B: Embed expanded query ─────────────────────────────────────────
    let queryEmbedding: number[];
    try {
      console.log('📡 Generating local Xenova embedding for expanded query...');
      const pipe = await getPipeline();
      const output = await pipe([expandedQuery], { pooling: 'mean', normalize: true }) as any;
      queryEmbedding = Array.from(output.tolist()[0] as number[]);
      console.log('✅ Xenova local embedding generated');
    } catch (err) {
      console.warn('⚠️ Xenova local embedding failed, using mock:', (err as Error).message);
      queryEmbedding = generateMockEmbedding(expandedQuery);
    }

    // ── Step C: Hybrid retrieval + reranking ─────────────────────────────────
    // Context string is interpolated into system prompt (not a template var)
    let retrievedContext = 'No relevant legal context was found in the database for this query.';
    try {
      const hybridCandidates = await hybridSearch(expandedQuery, queryEmbedding, 20);
      console.log(`✅ hybridSearch returned ${hybridCandidates.length} candidates`);

      const finalDocuments = await rerankCandidates(content, hybridCandidates, 8);
      console.log(`✅ reranked to ${finalDocuments.length} documents`);

      if (finalDocuments.length > 0) {
        retrievedContext = finalDocuments
          .map((doc, idx) =>
            `[Source ${idx + 1}: ${doc.chunk.act?.shortName || 'Law'} Sec ${doc.chunk.section?.number || 'N/A'}]\n${doc.chunk.content}`
          )
          .join('\n\n---\n\n');
      }
    } catch (e) {
      console.warn('⚠️ Retrieval failed, proceeding without context:', (e as Error).message);
    }

    // ── Step C: Build conversation history ───────────────────────────────────
    // Strip any stored sentinels from assistant messages so the LLM doesn't
    // learn to repeat the [[NYAYA_CONFIDENCE:X]] pattern in its output.
    const SENTINEL_RE = /\[\[NYAYA_CONFIDENCE:\d+\]\]\n?/g;
    const history = conversation.messages.map(m => {
      if (m.role === 'user') return new HumanMessage(m.content);
      const cleanContent = m.content.replace(SENTINEL_RE, '').trimStart();
      return new AIMessage(cleanContent);
    });

    // ── Step D: LLM generation ───────────────────────────────────────────────
    // NOTE: We deliberately avoid ChatPromptTemplate here.
    // Legal text chunks often contain curly-brace patterns like {resolvedLabel}
    // which LangChain's template parser mistakes for unbound input variables.
    // Instead we construct a concrete message array and call the model directly.
    const groq = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY!,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
    });

    const hindiInstruction = language === 'hindi'
      ? '\nCRITICAL RULE: YOU MUST RESPOND ENTIRELY IN THE HINDI LANGUAGE USING DEVANAGARI SCRIPT. Maintain formatting.\n'
      : '';

    // Build a fully-resolved system string — no LangChain placeholders involved.
    const systemPromptText = `You are Nyaya, a precise legal assistant for Indian law.

You MUST answer ONLY using the provided context.
Do NOT use outside knowledge.

STRICT RULES:
1. Do NOT mix different legal domains (e.g., Constitution vs BNS vs IPC).
2. Always identify the correct Act (e.g., Bharatiya Nyaya Sanhita, Constitution of India).
3. Always mention the correct Section/Article number.
4. If the context is insufficient or unclear, say exactly:
   "Insufficient legal context to answer accurately."
5. Do NOT hallucinate, infer, or assume missing information.

CONFIDENCE SCORING GUIDE (be precise and honest):
- 90-100: Context directly answers the question with explicit section/article text.
- 70-89:  Context is relevant but only partially covers the question.
- 50-69:  Context is loosely related; the answer requires some inference.
- 20-49:  Context is marginally related; the answer is mostly uncertain.
- 0-19:   Context is irrelevant or insufficient to answer the question at all.

OUTPUT FORMAT (MANDATORY — follow this exactly):

🔹 Confidence:
<integer 0–100 only, no other text>

🔹 Act:
<Full Act Name>

🔹 Section / Article:
<Number only, e.g. "Section 14" or "Article 21">

🔹 Explanation:
<Clear, concise explanation of what the law says>

🔹 Punishment (if applicable):
- <point 1>
- <point 2>

🔹 Source:
<Exact source reference from context, e.g. "[Constitution] Article 15">
${hindiInstruction}
---
CONTEXT:
${retrievedContext}
---`;

    const finalQuery = language === 'hindi'
      ? `[TRANSLATE AND RESPOND TO THE FOLLOWING STRICTLY IN HINDI USING DEVANAGARI SCRIPT]:\n\n${content}`
      : content;

    // Assemble the complete message list: system + history + new human turn.
    const messages = [
      new SystemMessage(systemPromptText),
      ...history,
      new HumanMessage(finalQuery),
    ];

    let aiResponseContent: string;
    try {
      console.log('🤖 Calling Groq LLM...');
      const result = await groq.pipe(new StringOutputParser()).invoke(messages);
      aiResponseContent = result;
      console.log('✅ Groq response received, length:', aiResponseContent.length);
      
      // Extract confidence score — match the 🔹 Confidence: line
      const confidenceMatch = aiResponseContent.match(/🔹\s*Confidence:\s*(\d+)/);
      let confidenceScore = 0;
      if (confidenceMatch) {
        confidenceScore = Math.min(100, Math.max(0, parseInt(confidenceMatch[1], 10)));
        // Strip the confidence line from the visible response
        aiResponseContent = aiResponseContent.replace(/🔹\s*Confidence:\s*\d+\s*\n?/, '').trimStart();
      } else if (aiResponseContent.toLowerCase().includes('insufficient legal context')) {
        confidenceScore = 0;
      } else {
        confidenceScore = 75; // Fallback if model forgot to include it
      }
      console.log(`📊 Confidence score parsed: ${confidenceScore}`);

      // Prepend sentinel for frontend
      aiResponseContent = `[[NYAYA_CONFIDENCE:${confidenceScore}]]\n` + aiResponseContent;

    } catch (e) {
      console.error('❌ LLM generation error:', e);
      aiResponseContent = `[[NYAYA_CONFIDENCE:0]] I encountered an error generating a legal response. Please try again.\n\nError: ${e instanceof Error ? e.message : String(e)}`;
    }

    // ── Step E: Persist and respond ──────────────────────────────────────────
    const assistantMessage = await prisma.message.create({
      data: { role: 'assistant', content: aiResponseContent, conversationId: id }
    });

    await prisma.conversation.update({
      where: { id },
      data: {
        ...(conversation.messages.length === 0 ? { title: content.substring(0, 50) } : {}),
        updatedAt: new Date(),
      }
    });

    await prisma.user.update({
      where: { id: dbUser.id },
      data: { queriesCount: { increment: 1 } }
    }).catch(() => {});

    res.json({ userMessage, assistantMessage });

  } catch (error) {
    console.error('❌ Fatal error processing message:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

export default router;
