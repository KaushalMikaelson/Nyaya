import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { planLimiter } from '../middleware/planLimiter';
import { prisma } from '../prisma';
import { VoyageAIClient } from 'voyageai';
import { CohereClient } from 'cohere-ai';

import { ChatGroq } from '@langchain/groq';
import { ChatPromptTemplate, MessagesPlaceholder, PromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';

const router = Router();

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

router.post('/conversations/:id/messages', planLimiter, async (req: AuthRequest, res): Promise<void> => {
  const id = String(req.params.id);
  const { content } = req.body;

  if (!content) {
    res.status(400).json({ error: 'Message content is required' });
    return;
  }

  try {
    // 0. Quota is now enforced by planLimiter middleware
    const dbUser = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!dbUser) {
      res.status(404).json({ error: 'User not found' });
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
    // RAG HYBRID PIPELINE
    // -------------------------------------------------------------
    
    // Step A: Embed Query (Voyage)
    let queryEmbedding: number[] = [];
    if (voyageClient) {
      const response = await voyageClient.embed({ input: [content], model: "voyage-law-2" });
      queryEmbedding = response.data?.[0]?.embedding || generateMockEmbedding(content);
    } else {
      queryEmbedding = generateMockEmbedding(content);
    }

    // Step B: Hybrid Retrieval (Vector + Keyword search)
    const allChunks = await prisma.legalChunk.findMany();
    const queryWords = content.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
    
    let scoredChunks = allChunks.map(chunk => {
      let vectorScore = 0;
      if (chunk.embedding && chunk.embedding.length > 0) {
        vectorScore = cosineSimilarity(queryEmbedding, chunk.embedding as number[]);
      }
      
      let keywordScore = 0;
      const lowerContent = chunk.content.toLowerCase();
      queryWords.forEach((w: string) => {
        if (lowerContent.includes(w)) keywordScore += 0.2;
      });

      const hybridScore = (vectorScore * 0.7) + (keywordScore * 0.3);
      return { chunk, score: hybridScore };
    });

    scoredChunks.sort((a, b) => b.score - a.score);
    let topCandidates = scoredChunks.slice(0, 15).map(c => c.chunk.content);

    // Step C: Reranking (Cohere)
    let finalDocuments: string[] = [];
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
      finalDocuments = topCandidates.slice(0, 5);
    }

    // Step D: Context Builder
    const contextString = finalDocuments.length > 0 
      ? finalDocuments.map((doc, idx) => `[Source ${idx + 1}]: ${doc}`).join('\n\n')
      : '';

    // -------------------------------------------------------------
    // LANGCHAIN PIPELINES INIT
    // -------------------------------------------------------------
    const groqGeneral = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: "llama-3.1-8b-instant",
      temperature: 0,
    });

    const groqRAG = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
    });

    // STEP 1: ROUTER - Multi-language routing & Lawyer escalation
    const routerSchema = z.object({
      detected_language: z.string().describe("The primary language of the user's latest query (e.g., 'English', 'Hindi', 'Bengali')."),
      needs_escalation: z.boolean().describe("True if the query involves a highly complex, critical, or urgent legal scenario requiring a human lawyer immediately (e.g., arrest, serious crime, high stakes)."),
      escalation_reason: z.string().describe("A brief explanation of why escalation is needed if needs_escalation is true, else empty string.")
    });
    
    let routerDecision = { detected_language: "English", needs_escalation: false, escalation_reason: "" };
    try {
      const routerPrompt = ChatPromptTemplate.fromMessages([
        ["system", "You are an intelligent legal query router. Analyze the user's query and provide the required structure. If you cannot parse, default to English and no escalation."],
        ["human", "{query}"]
      ]);
      const routerChain = routerPrompt.pipe(groqGeneral.withStructuredOutput(routerSchema));
      routerDecision = await routerChain.invoke({ query: content });
    } catch (e) {
      console.warn("Router execution failed, falling back to defaults.", e);
    }

    // STEP 2: RAG GENERATION - Core Prompt Construction
    let escalationContext = "";
    if (routerDecision.needs_escalation) {
      escalationContext = "\n\nCRITICAL INSTRUCTION: The query has been flagged as requiring human lawyer escalation. You must firmly advise the user to consult a lawyer immediately! Use the Nyaya marketplace feature. Reason: " + routerDecision.escalation_reason;
    }

    const ragSystemPromptTemplate = `You are Nyaay, an elite AI legal assistant specializing in Indian law. 
Use the provided LEGAL CONTEXT to answer the user accurately. 
If the context contains the answer, explicitly cite the [Source X]. 
If the context is insufficient, state that clearly but provide general information regarding Indian law. 
Always insert a disclaimer that your advice does not substitute for a licensed legal professional.
You MUST reply in the user's detected language: {detected_language}.{escalation_context}

--- LEGAL CONTEXT (from verified databases) ---
{context_string}`;

    const ragPrompt = ChatPromptTemplate.fromMessages([
      ["system", ragSystemPromptTemplate],
      new MessagesPlaceholder("history"),
      ["human", "{query}"]
    ]);

    const ragChain = ragPrompt.pipe(groqRAG).pipe(new StringOutputParser());

    const history = conversation.messages.map(m => 
      m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
    );

    let aiResponseContent = 'Sorry, I am unable to process your request at this moment.';
    try {
      aiResponseContent = await ragChain.invoke({
        detected_language: routerDecision.detected_language,
        escalation_context: escalationContext,
        context_string: contextString || "No specific legal context found.",
        history: history,
        query: content
      });
    } catch (e) {
      console.error('Groq/Langchain Context Builder Error:', e);
      aiResponseContent = 'Error communicating with AI. Please check your system logs.';
    }

    // STEP 3: HALLUCINATION GUARD
    // Only guard if we have an actual response and we found some legal context
    if (aiResponseContent && !aiResponseContent.includes('Error') && finalDocuments.length > 0) {
      try {
        const guardPromptTemplate = `You are an AI Hallucination Guard for a Legal Chatbot.
Given the following LEGAL CONTEXT and the AI RESPONSE, determine if the response makes up laws, sections, or claims not supported by the context or general basic legal knowledge. 
Output "PASS" if the response is safe and grounded. Output "FAIL" if the response is hallucinated or dangerous.

LEGAL CONTEXT:
{context}

AI RESPONSE:
{response}

Only output "PASS" or "FAIL". Do not output anything else.`;

        const guardPrompt = PromptTemplate.fromTemplate(guardPromptTemplate);
        const guardChain = guardPrompt.pipe(groqGeneral).pipe(new StringOutputParser());
        
        const guardResult = await guardChain.invoke({
          context: contextString,
          response: aiResponseContent
        });

        if (guardResult.trim().toUpperCase().includes("FAIL")) {
          console.warn("Hallucination guard triggered a FAIL. Overriding response.");
          aiResponseContent = "I apologize, but my hallucination guard detected that I could not securely verify the legality of my planned answer against my verified Indian Law context. As an AI, I avoid providing potentially ungrounded legal advice. Please rephrase or consult a licensed professional on the marketplace.";
        }
      } catch (e) {
        console.error("Hallucination guard error:", e);
      }
    }

    // -------------------------------------------------------------
    // FINALIZATION
    // -------------------------------------------------------------

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

    // Legacy counter keep in sync (non-critical)
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { queriesCount: { increment: 1 } }
    }).catch(() => {});

    res.json({ userMessage, assistantMessage });
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

export default router;
