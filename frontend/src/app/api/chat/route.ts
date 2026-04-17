import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, conversationId: existingConvId } = body;

    const latestMessage = messages?.[messages.length - 1];
    if (!latestMessage || latestMessage.role !== 'user') {
      return NextResponse.json({ error: 'Invalid message structure' }, { status: 400 });
    }

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

    const authHeader =
      req.headers.get('Authorization') ||
      req.headers.get('authorization') ||
      '';

    const forwardHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(authHeader ? { Authorization: authHeader } : {}),
    };

    // ── Step 1: Get or create a backend Conversation ──────────────────────────
    let conversationId: string = existingConvId || '';

    if (!conversationId) {
      const shortTitle = latestMessage.content.substring(0, 60);
      const convRes = await fetch(`${backendUrl}/chat/conversations`, {
        method: 'POST',
        headers: forwardHeaders,
        body: JSON.stringify({ title: shortTitle }),
      });

      if (!convRes.ok) {
        const txt = await convRes.text().catch(() => convRes.statusText);
        throw new Error(`Failed to create conversation (${convRes.status}): ${txt}`);
      }

      const conv = await convRes.json();
      conversationId = conv.id;
    }

    // ── Step 2: Send message through the full RAG + Groq pipeline ────────────
    const msgRes = await fetch(
      `${backendUrl}/chat/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        headers: forwardHeaders,
        body: JSON.stringify({ content: latestMessage.content }),
      },
    );

    if (!msgRes.ok) {
      const errData = await msgRes.json().catch(() => ({})) as any;
      if (errData?.error === 'FREE_LIMIT_REACHED') {
        return new Response(
          'You have reached your free query limit. Please upgrade to Pro to continue.',
          {
            status: 200,
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'X-Conversation-Id': conversationId,
            },
          }
        );
      }
      throw new Error(errData?.error || `Backend returned ${msgRes.status}`);
    }

    const data = await msgRes.json() as any;
    const answer: string = data.assistantMessage?.content || 'No response received from AI.';

    // ── Step 3: Stream answer as plain text chunks ────────────────────────────
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const tokens = answer.split(' ');
        for (let i = 0; i < tokens.length; i++) {
          controller.enqueue(encoder.encode(tokens[i] + (i < tokens.length - 1 ? ' ' : '')));
          await new Promise((r) => setTimeout(r, 18));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Conversation-Id': conversationId,
        'Access-Control-Expose-Headers': 'X-Conversation-Id',
      },
    });

  } catch (error) {
    console.error('[Chat API Error]:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 },
    );
  }
}
