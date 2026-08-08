import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { planLimiter } from '../middleware/planLimiter';
import { prisma } from '../prisma';

import { getPythonRagUrl } from '../services/retrieval';

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
        throw new Error(`Python RAG /chat-rag returned ${pyRes.status}: ${errText}`);
      }

      const pyData = (await pyRes.json()) as PythonChatRagResponse;
      if (!pyData.aiResponse || typeof pyData.aiResponse !== 'string') {
        throw new Error('Python RAG /chat-rag returned an invalid response shape');
      }

      aiResponseContent = pyData.aiResponse;
      console.log(`[Chat] Python RAG response received (confidence=${pyData.confidenceScore ?? 'unknown'})`);
    } catch (e) {
      console.error('[Chat] Python RAG generation error:', e);
      aiResponseContent = `[[NYAYA_CONFIDENCE:0]] I could not reach the Python RAG engine. Please make sure it is running at ${pyUrl}.\n\nError: ${e instanceof Error ? e.message : String(e)}`;
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
