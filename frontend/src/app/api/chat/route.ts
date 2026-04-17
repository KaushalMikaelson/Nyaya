import { NextRequest, NextResponse } from 'next/server';
import { createTextStreamResponse } from 'ai';

// Shape of a legal citation returned by the backend
export interface LegalCitation {
  actTitle: string;
  actShortName: string;
  sectionNumber: string;
  sectionTitle: string;
  clauseNumber?: string;
}

/**
 * Sentinel that separates the human-readable answer from the citations JSON
 * appended at the end of the stream.  Using a plain ASCII delimiter avoids
 * issues with null-byte encoding across HTTP chunked transfer.
 */
export const CITATION_SENTINEL = '\n\n[[NYAYA_CITATIONS]]\n';

export async function POST(req: NextRequest) {
  try {
    // 1. Accept chat messages & extract latest user query
    const { messages } = await req.json();
    const latestMessage = messages[messages.length - 1];

    if (!latestMessage || latestMessage.role !== 'user') {
      return NextResponse.json({ error: 'Invalid message structure' }, { status: 400 });
    }

    // 2. Call RAG backend for search results
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

    const backendRes = await fetch(`${backendUrl}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: latestMessage.content }),
    });

    if (!backendRes.ok) {
      throw new Error(`Backend returned ${backendRes.status}`);
    }

    const data = await backendRes.json();
    const answer: string = data.answer || 'No answer found.';

    // 3. Extract structured legal citations from the results array
    const citations: LegalCitation[] = [];
    const seenKeys = new Set<string>();

    if (data.results && Array.isArray(data.results)) {
      for (const result of data.results) {
        if (!result.act || !result.section) continue;

        const key = `${result.act.shortName}::${result.section.number}::${result.clause?.number ?? ''}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);

        citations.push({
          actTitle: result.act.title,
          actShortName: result.act.shortName,
          sectionNumber: result.section.number,
          sectionTitle: result.section.title || '',
          clauseNumber: result.clause?.number ?? undefined,
        });

        // Cap at 5 unique citations
        if (citations.length >= 5) break;
      }
    }

    // 4. Build a ReadableStream<string>:
    //    • Stream the answer word-by-word for a live-typing effect.
    //    • Append the sentinel + citations JSON at the very end so the client
    //      can strip it out before displaying and render the citation cards.
    const textStream = new ReadableStream<string>({
      async start(controller) {
        const tokens = answer.split(' ');
        for (let i = 0; i < tokens.length; i++) {
          controller.enqueue(tokens[i] + (i < tokens.length - 1 ? ' ' : ''));
          await new Promise((resolve) => setTimeout(resolve, 28));
        }

        if (citations.length > 0) {
          controller.enqueue(`${CITATION_SENTINEL}${JSON.stringify(citations)}`);
        }

        controller.close();
      },
    });

    return createTextStreamResponse({ textStream });
  } catch (error) {
    console.error('[Chat API Error]:', error);
    return NextResponse.json(
      { error: 'An error occurred while communicating with the backend' },
      { status: 500 },
    );
  }
}
