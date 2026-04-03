// @ts-nocheck
import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma';
import Groq from 'groq-sdk';
import { VoyageAIClient } from 'voyageai';
import { CohereClient } from 'cohere-ai';

const router = Router();

const getGroq = () => new Groq({ apiKey: process.env.GROQ_API_KEY });
const voyageKey = process.env.VOYAGE_API_KEY;
const cohereKey = process.env.COHERE_API_KEY;

const voyageClient = voyageKey ? new VoyageAIClient({ apiKey: voyageKey }) : null;
const cohereClient = cohereKey ? new CohereClient({ token: cohereKey }) : null;

router.use(authenticate);

// Utility: Mock Embedding if no voyage key
function generateMockEmbedding(text: string) {
  const vec = new Array(1024).fill(0);
  const seed = Array.from(text.substring(0, 10)).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  for (let i = 0; i < 1024; i++) {
    vec[i] = (Math.sin(seed + i) + 1) / 2;
  }
  return vec;
}

// Utility: Cosine Similarity
function cosineSimilarity(A: number[], B: number[]) {
  let dotproduct = 0;
  let mA = 0;
  let mB = 0;
  for(let i = 0; i < A.length; i++) { 
      dotproduct += (A[i] * B[i]);
      mA += (A[i]*A[i]);
      mB += (B[i]*B[i]);
  }
  mA = Math.sqrt(mA);
  mB = Math.sqrt(mB);
  const similarity = (dotproduct)/((mA)*(mB));
  return similarity; 
}

router.get('/conversations', async (req: AuthRequest, res): Promise<void> => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { userId: req.user!.userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

router.post('/conversations', async (req: AuthRequest, res): Promise<void> => {
  try {
    const { title } = req.body;
    const conversation = await prisma.conversation.create({
      data: {
        userId: req.user!.userId,
        title: title || 'New Chat'
      }
    });
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

router.delete('/conversations/:id', async (req: AuthRequest, res): Promise<void> => {
  const id = String(req.params.id);
  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id, userId: req.user!.userId }
    });
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    await prisma.message.deleteMany({ where: { conversationId: id } });
    await prisma.conversation.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

router.post('/conversations/:id/messages', async (req: AuthRequest, res): Promise<void> => {
  const id = String(req.params.id);
  const { content } = req.body;

  if (!content) {
    res.status(400).json({ error: 'Message content is required' });
    return;
  }

  try {
    // 0. Monetization Check
    const dbUser = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!dbUser) return res.status(404).json({ error: 'User not found' });
    
    if (!dbUser.isPro && dbUser.queriesCount >= 10) {
      res.status(403).json({ error: 'FREE_LIMIT_REACHED', message: 'You have exhausted your 10 free AI queries.' });
      return;
    }

    // 1. Verify ownership
    const conversation = await prisma.conversation.findFirst({
      where: { id, userId: req.user!.userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });

    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    // 2. Save user message
    const userMessage = await prisma.message.create({
      data: { role: 'user', content, conversationId: id }
    });

    // -------------------------------------------------------------
    // PHASE 1B: RAG HYBRID PIPELINE
    // -------------------------------------------------------------
    
    // Step A: Embed Query (Voyage)
    let queryEmbedding: number[] = [];
    if (voyageClient) {
      const response = await voyageClient.embed({ input: [content], model: "voyage-law-2" });
      queryEmbedding = response.data[0].embedding;
    } else {
      queryEmbedding = generateMockEmbedding(content);
    }

    // Step B: Hybrid Retrieval (Vector + Keyword search)
    const allChunks = await prisma.legalChunk.findMany();
    const queryWords = content.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    
    let scoredChunks = allChunks.map(chunk => {
      // 1. Vector Score
      let vectorScore = 0;
      if (chunk.embedding && chunk.embedding.length > 0) {
        vectorScore = cosineSimilarity(queryEmbedding, chunk.embedding as number[]);
      }
      
      // 2. Keyword Match (FTS Mock)
      let keywordScore = 0;
      const lowerContent = chunk.content.toLowerCase();
      queryWords.forEach(w => {
        if (lowerContent.includes(w)) keywordScore += 0.2;
      });

      // 3. Merge Result
      const hybridScore = (vectorScore * 0.7) + (keywordScore * 0.3);
      return { chunk, score: hybridScore };
    });

    scoredChunks.sort((a, b) => b.score - a.score);
    let topCandidates = scoredChunks.slice(0, 15).map(c => c.chunk.content);

    // Step C: Reranking (Cohere)
    let finalDocuments = [];
    if (cohereClient && topCandidates.length > 0) {
      try {
        const rerankResponse = await cohereClient.rerank({
          query: content,
          documents: topCandidates,
          model: 'rerank-english-v3.0',
          topN: 5
        });
        rerankResponse.results.forEach(result => {
          finalDocuments.push(topCandidates[result.index]);
        });
      } catch (err) {
        console.warn("Cohere Rerank failed, using hybrid top 5.", err);
        finalDocuments = topCandidates.slice(0, 5);
      }
    } else {
      // Custom mocked rerank limitation
      finalDocuments = topCandidates.slice(0, 5);
    }

    // Step D: Context Builder
    const contextString = finalDocuments.length > 0 
      ? `\n\n--- LEGAL CONTEXT (from verified databases) ---\n` + finalDocuments.map((doc, idx) => `[Source ${idx + 1}]: ${doc}`).join('\n\n')
      : '';

    // -------------------------------------------------------------
    // AI INTEGRATION WITH CONTEXT
    // -------------------------------------------------------------

    const groq = getGroq();
    const systemPrompt =
      'You are Nyaay, an elite AI legal assistant specializing in Indian law. Use the provided LEGAL CONTEXT to answer the user accurately. If the context contains the answer, explicitly cite the [Source X]. If the context is insufficient, state that clearly but provide general information regarding Indian law. Always insert a disclaimer that your advice does not substitute for a licensed legal professional.'
      + contextString;

    type GroqRole = 'system' | 'user' | 'assistant';
    const groqMessages: Array<{ role: GroqRole; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...conversation.messages.map((m) => ({
        role: m.role as GroqRole,
        content: m.content
      })),
      { role: 'user', content }
    ];

    let aiResponseContent = 'Sorry, I am unable to process your request at this moment.';
    try {
      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1024,
        messages: groqMessages
      });
      aiResponseContent = response.choices[0]?.message?.content || aiResponseContent;
    } catch (groqError) {
      console.error('Groq API Error:', groqError);
      aiResponseContent = 'Error communicating with AI. Please check your API key.';
    }

    // Save assistant message
    const assistantMessage = await prisma.message.create({
      data: {
        role: 'assistant',
        content: aiResponseContent,
        conversationId: id
      }
    });

    if (conversation.messages.length === 0) {
      const newTitle = content.length > 30 ? content.substring(0, 30) + '...' : content;
      await prisma.conversation.update({
        where: { id },
        data: { title: newTitle }
      });
    } else {
      await prisma.conversation.update({
        where: { id },
        data: { updatedAt: new Date() }
      });
    }

    // Increment usage
    if (dbUser && !dbUser.isPro) {
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { queriesCount: { increment: 1 } }
      });
    }

    res.json({ userMessage, assistantMessage });
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

export default router;
