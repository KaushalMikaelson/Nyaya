import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { planLimiter } from '../middleware/planLimiter';
import { prisma } from '../prisma';
import { VoyageAIClient } from 'voyageai';
import { CohereClient } from 'cohere-ai';

import { ChatGroq } from '@langchain/groq';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { hybridSearch, rerankCandidates } from '../services/retrieval';

const router = Router();

const voyageKey = process.env.VOYAGE_API_KEY;
const cohereKey = process.env.COHERE_API_KEY;

const voyageClient = voyageKey ? new VoyageAIClient({ apiKey: voyageKey }) : null;
const cohereClient = cohereKey ? new CohereClient({ token: cohereKey }) : null;

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

    // ── Step A: Embed query ──────────────────────────────────────────────────
    let queryEmbedding: number[];
    if (voyageClient) {
      try {
        const response = await voyageClient.embed({ input: [content], model: 'voyage-law-2' });
        queryEmbedding = response.data?.[0]?.embedding || generateMockEmbedding(content);
        console.log('✅ Voyage embedding generated');
      } catch (e) {
        console.warn('⚠️ Voyage embed failed, using mock:', (e as Error).message);
        queryEmbedding = generateMockEmbedding(content);
      }
    } else {
      queryEmbedding = generateMockEmbedding(content);
      console.log('⚠️ No Voyage key — using mock embedding');
    }

    // ── Step B: Hybrid retrieval + reranking ─────────────────────────────────
    // Context string is interpolated into system prompt (not a template var)
    let retrievedContext = 'No relevant legal context was found in the database for this query.';
    try {
      const hybridCandidates = await hybridSearch(content, queryEmbedding, 15);
      console.log(`✅ hybridSearch returned ${hybridCandidates.length} candidates`);

      const finalDocuments = await rerankCandidates(content, hybridCandidates, 5);
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
    const history = conversation.messages.map(m =>
      m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
    );

    // ── Step D: LLM generation ───────────────────────────────────────────────
    // IMPORTANT: context is interpolated at build-time (not a LangChain template var)
    // Only {query} and {history} are LangChain template vars — no conflicts.
    const groq = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY!,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
    });

    const systemMessage = [
      'You are Nyaya, a Senior Legal AI Assistant specializing in Indian law.',
      'You assist practicing lawyers, judges, and legal scholars.',
      '',
      'RULES:',
      '1. Answer STRICTLY based on the LEGAL CONTEXT provided below.',
      '2. If context is insufficient, clearly state what information is missing.',
      '3. Cite every legal claim using the source tags provided, e.g. [Source 1: BNS Sec 103].',
      '4. Use precise legal language. Structure your response with clear headings.',
      '5. End with a plain-language summary prefixed with "Summary:" for client briefings.',
      language === 'hindi' ? '6. CRITICAL RULE: YOU MUST RESPOND ENTIRELY IN THE HINDI LANGUAGE using Devanagari script. Do NOT use English except for exact legal case names or section numbers.' : '6. Respond in English.',
      '',
      'LEGAL CONTEXT:',
      retrievedContext,
    ].join('\n');

    const ragPrompt = ChatPromptTemplate.fromMessages([
      ['system', systemMessage],
      new MessagesPlaceholder('history'),
      ['human', '{query}'],
    ]);

    const chain = ragPrompt.pipe(groq).pipe(new StringOutputParser());

    let aiResponseContent: string;
    try {
      console.log('🤖 Calling Groq LLM...');
      const finalQuery = language === 'hindi' 
        ? `[TRANSLATE AND RESPOND TO THE FOLLOWING STRICTLY IN HINDI USING DEVANAGARI SCRIPT]:\n\n${content}`
        : content;
      aiResponseContent = await chain.invoke({ history, query: finalQuery });
      console.log('✅ Groq response received, length:', aiResponseContent.length);
    } catch (e) {
      console.error('❌ LLM generation error:', e);
      aiResponseContent = `I encountered an error generating a legal response. Please try again.\n\nError: ${e instanceof Error ? e.message : String(e)}`;
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
