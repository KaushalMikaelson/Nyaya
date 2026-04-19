import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, conversationId: existingConvId, language } = body;

    const latestMessage = messages?.[messages.length - 1];
    if (!latestMessage || latestMessage.role !== 'user') {
      return NextResponse.json({ error: 'Invalid message structure' }, { status: 400 });
    }

    const finalContent = latestMessage.content;

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

    // ── Auth: get token from Authorization header OR refresh via cookie ────────
    let authToken =
      req.headers.get('Authorization') ||
      req.headers.get('authorization') ||
      '';

    // If no valid token in header, try refreshing using the httpOnly cookie
    if (!authToken || authToken === 'Bearer ' || authToken === 'Bearer undefined') {
      const cookieHeader = req.headers.get('cookie') || '';
      try {
        const refreshRes = await fetch(`${backendUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', cookie: cookieHeader },
        });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          if (refreshData.accessToken) {
            authToken = `Bearer ${refreshData.accessToken}`;
            console.log('[Chat Proxy] Token refreshed via cookie successfully');
          }
        }
      } catch (e) {
        console.warn('[Chat Proxy] Token refresh failed:', e);
      }
    }

    if (!authToken || authToken === 'Bearer ' || authToken === 'Bearer undefined') {
      return NextResponse.json({ error: 'Unauthorized: Please log in again.' }, { status: 401 });
    }

    const forwardHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: authToken,
    };

    // ── Step 1: Get or create backend conversation ─────────────────────────────
    let conversationId: string = existingConvId || '';

    if (!conversationId) {
      const shortTitle = finalContent.substring(0, 60);
      const convRes = await fetch(`${backendUrl}/chat/conversations`, {
        method: 'POST',
        headers: forwardHeaders,
        body: JSON.stringify({ title: shortTitle }),
      });

      if (!convRes.ok) {
        const txt = await convRes.text().catch(() => convRes.statusText);
        return NextResponse.json(
          { error: `Failed to create conversation (${convRes.status}): ${txt}` },
          { status: convRes.status }
        );
      }

      const conv = await convRes.json();
      conversationId = conv.id;
    }

    // ── Step 2: Send message through the full RAG pipeline ────────────────────
    const msgRes = await fetch(
      `${backendUrl}/chat/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        headers: forwardHeaders,
        body: JSON.stringify({ content: finalContent, language }),
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
      return NextResponse.json(
        { error: errData?.error || `Backend returned ${msgRes.status}` },
        { status: msgRes.status }
      );
    }

    const data = await msgRes.json() as any;
    const answer: string = data.assistantMessage?.content || 'No response received from AI.';

    // ── Step 3: Stream answer as plain text chunks ─────────────────────────────
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
