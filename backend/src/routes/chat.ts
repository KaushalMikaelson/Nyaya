import { Router } from 'express';
import Groq from 'groq-sdk';
import { authenticate, AuthRequest } from '../middleware/auth';
import { planLimiter } from '../middleware/planLimiter';
import { prisma } from '../prisma';

import { getPythonRagUrl, cleanErrorText } from '../services/retrieval';

const router = Router();

type PythonChatRagResponse = {
  aiResponse?: string;
  confidenceScore?: number;
  retrievedContext?: string;
  documents?: unknown[];
};

router.use(authenticate);

router.get('/conversations', async (req: AuthRequest, res): Promise<void> => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { userId: req.user!.userId },
      orderBy: { updatedAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
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
      data: { userId: req.user!.userId, title: title || 'New Chat' },
    });
    res.json(conversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

router.delete('/conversations/:id', async (req: AuthRequest, res): Promise<void> => {
  const id = String(req.params.id);
  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id, userId: req.user!.userId },
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
  const { content, language } = req.body;

  if (!content || typeof content !== 'string') {
    res.status(400).json({ error: 'Message content is required' });
    return;
  }

  try {
    const dbUser = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!dbUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const conversation = await prisma.conversation.findFirst({
      where: { id, userId: req.user!.userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    const userMessage = await prisma.message.create({
      data: { role: 'user', content, conversationId: id },
    });

    const priorUserMessages = conversation.messages
      .filter((m) => m.role === 'user')
      .slice(-2)
      .map((m) => m.content);

    let aiResponseContent = '';
    const pyUrl = getPythonRagUrl();
    try {
      console.log('[Chat] Delegating full response to Python RAG /chat-rag...');
      const pyRes = await fetch(`${pyUrl}/chat-rag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          priorMessages: priorUserMessages,
          language: language || 'english',
        }),
      });

      if (!pyRes.ok) {
        const errText = await pyRes.text().catch(() => pyRes.statusText);
        throw new Error(`Python RAG /chat-rag returned ${pyRes.status}: ${cleanErrorText(errText, pyRes.status)}`);
      }

      const pyData = (await pyRes.json()) as PythonChatRagResponse;
      if (!pyData.aiResponse || typeof pyData.aiResponse !== 'string') {
        throw new Error('Python RAG /chat-rag returned an invalid response shape');
      }

      aiResponseContent = pyData.aiResponse;
      console.log(`[Chat] Python RAG response received (confidence=${pyData.confidenceScore ?? 'unknown'})`);
    } catch (e) {
      console.error('[Chat] Python RAG generation error:', e);
      const cleanErrStr = cleanErrorText(e instanceof Error ? e.message : String(e));

      if (process.env.GROQ_API_KEY) {
        try {
          console.log('[Chat] Attempting direct Groq LLM fallback...');
          const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
          const hindiInst = language === 'hindi' ? '\nCRITICAL RULE: YOU MUST RESPOND ENTIRELY IN HINDI USING DEVANAGARI SCRIPT.\n' : '';
          const systemPrompt = `You are Nyaya, an expert legal assistant for Indian Law (Constitution of India, BNS, IPC, CrPC, CPC, IT Act, etc.).
Answer the user's legal question directly, thoroughly, and precisely.

CONFIDENCE SCORING GUIDE:
- 90-100: Question is directly covered by standard statutory provisions.
- 70-89:  Answer covers legal concepts well but statutory details may be general.
- 50-69:  Uncertain or required broad inference.

OUTPUT FORMAT (MANDATORY):

🔹 Confidence:
<integer 0–100>

🔹 Act:
<Full Act Name>

🔹 Section / Article:
<Number, e.g. "Section 103" or "Article 21">

🔹 Explanation:
<Clear, concise legal explanation>

🔹 Punishment / Key Provision (if applicable):
- <point 1>
- <point 2>

🔹 Source:
<Statutory reference, e.g. "Constitution of India, Article 21">
${hindiInst}`;

          const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            temperature: 0.1,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: content }
            ]
          });

          const rawAns = completion.choices[0]?.message?.content || '';
          if (rawAns) {
            const confMatch = rawAns.match(/🔹\s*Confidence:\s*(\d+)/);
            const confScore = confMatch ? Math.min(100, Math.max(0, parseInt(confMatch[1], 10))) : 80;
            const cleanAns = rawAns.replace(/🔹\s*Confidence:\s*\d+\s*\n?/g, '').trim();
            aiResponseContent = `[[NYAYA_CONFIDENCE:${confScore}]]\n${cleanAns}`;
            console.log(`[Chat] Direct Groq LLM fallback succeeded (confidence=${confScore}).`);
          } else {
            throw new Error('Groq direct fallback returned empty content');
          }
        } catch (fallbackErr) {
          console.error('[Chat] Direct Groq LLM fallback failed:', fallbackErr);
          aiResponseContent = `[[NYAYA_CONFIDENCE:0]] The Python RAG engine at ${pyUrl} is currently waking up or unreachable (HTTP 502/Service Error). Please wait ~15-30 seconds and try again.\n\nDetails: ${cleanErrStr}`;
        }
      } else {
        aiResponseContent = `[[NYAYA_CONFIDENCE:0]] The Python RAG engine at ${pyUrl} is currently waking up or unreachable (HTTP 502/Service Error). Please wait ~15-30 seconds and try again.\n\nDetails: ${cleanErrStr}`;
      }
    }

    const assistantMessage = await prisma.message.create({
      data: { role: 'assistant', content: aiResponseContent, conversationId: id },
    });

    await prisma.conversation.update({
      where: { id },
      data: {
        ...(conversation.messages.length === 0 ? { title: content.substring(0, 50) } : {}),
        updatedAt: new Date(),
      },
    });

    await prisma.user.update({
      where: { id: dbUser.id },
      data: { queriesCount: { increment: 1 } },
    }).catch(() => {});

    res.json({ userMessage, assistantMessage });
  } catch (error) {
    console.error('[Chat] Fatal error processing message:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

export default router;
