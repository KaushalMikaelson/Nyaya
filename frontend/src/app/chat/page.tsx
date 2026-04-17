'use client';

import { useChat } from '@ai-sdk/react';
import { useEffect, useRef } from 'react';
import {
  Send,
  User as UserIcon,
  Bot as BotIcon,
  Loader2,
  BookOpen,
  Scale,
  Hash,
  FileText,
  Zap,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LegalCitation {
  actTitle: string;
  actShortName: string;
  sectionNumber: string;
  sectionTitle: string;
  clauseNumber?: string;
}

interface ParsedMessage {
  text: string;
  citations: LegalCitation[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Sentinel string used by the backend to separate the answer text from the
 * JSON-encoded citations block appended at the end of the stream.
 */
const CITATION_SENTINEL = '\n\n[[NYAYA_CITATIONS]]\n';

/**
 * Extracts the raw text from an AI SDK UIMessage.
 * - AI SDK v5 and below: message.content (string)
 * - AI SDK v6+: message.parts[].type === 'text' → .text
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getMessageContent(message: any): string {
  // v5 path: plain string content
  if (typeof message.content === 'string') return message.content;
  // v6 path: parts array
  if (Array.isArray(message.parts)) {
    return (message.parts as Array<{ type: string; text?: string }>)
      .filter((p) => p.type === 'text')
      .map((p) => p.text ?? '')
      .join('');
  }
  return '';
}

/**
 * Splits raw message text into the display portion and structured citations.
 */
function parseMessage(raw: string): ParsedMessage {
  const idx = raw.indexOf(CITATION_SENTINEL);
  if (idx === -1) return { text: raw, citations: [] };

  const text = raw.slice(0, idx).trimEnd();
  try {
    const citations: LegalCitation[] = JSON.parse(
      raw.slice(idx + CITATION_SENTINEL.length),
    );
    return { text, citations };
  } catch {
    return { text, citations: [] };
  }
}

// ─── Citation Card ────────────────────────────────────────────────────────────

function CitationCard({ citation, index }: { citation: LegalCitation; index: number }) {
  return (
    <div className="citation-card" style={{ animationDelay: `${index * 70}ms` }}>
      {/* Left gradient accent bar */}
      <div className="citation-accent" />

      <div className="citation-body">
        {/* Top row: Act pill + optional Clause pill */}
        <div className="citation-top-row">
          <div className="citation-act-pill">
            <Scale size={10} strokeWidth={2.5} />
            <span>{citation.actShortName}</span>
          </div>
          {citation.clauseNumber && (
            <div className="citation-clause-pill">
              <Hash size={9} strokeWidth={2.5} />
              <span>Cl.&nbsp;{citation.clauseNumber}</span>
            </div>
          )}
        </div>

        {/* § Number + Section title */}
        <div className="citation-section-row">
          <span className="citation-section-num">§&nbsp;{citation.sectionNumber}</span>
          {citation.sectionTitle && (
            <span className="citation-section-title">{citation.sectionTitle}</span>
          )}
        </div>

        {/* Full Act name */}
        <div className="citation-act-full">{citation.actTitle}</div>
      </div>
    </div>
  );
}

// ─── Citations Panel ──────────────────────────────────────────────────────────

function CitationsPanel({ citations }: { citations: LegalCitation[] }) {
  if (citations.length === 0) return null;

  return (
    <div className="citations-panel">
      <div className="citations-header">
        <BookOpen size={12} strokeWidth={2.5} />
        <span>Legal Sources</span>
        <span className="citations-divider" />
        <FileText size={10} strokeWidth={2} />
        <span className="citations-count-label">
          {citations.length}&nbsp;{citations.length === 1 ? 'reference' : 'references'}
        </span>
      </div>

      <div className="citations-list">
        {citations.map((c, i) => (
          <CitationCard
            key={`${c.actShortName}-${c.sectionNumber}-${i}`}
            citation={c}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ChatPage() {
  // @ai-sdk/react v3 ships with UIMessage generics that may omit form helpers
  // from the inferred type — but they exist at runtime.  Cast to `any` to
  // unblock TypeScript without losing actual functionality.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat() as any;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <>
      {/* ── Scoped styles ─────────────────────────────────────────────── */}
      <style>{`
        /* ── Layout ────────────────────────────────────────────────── */
        .chat-root {
          display: flex;
          flex-direction: column;
          height: 100svh;
          background: #080810;
          font-family: 'Inter', system-ui, sans-serif;
          color: #e5e7eb;
        }

        /* ── Header ────────────────────────────────────────────────── */
        .chat-header {
          position: sticky;
          top: 0;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          padding: 20px 32px;
          background: rgba(8,8,16,0.88);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        
        .ai-assistant-badge {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 12px 24px;
          background-color: #1e293b;
          border-radius: 12px;
          color: #fbbf24;
          font-weight: 500;
          font-size: 16px;
        }

        /* ── Message area ──────────────────────────────────────────── */
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 32px 24px 16px;
          max-width: 860px;
          width: 100%;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 28px;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.07) transparent;
        }

        /* ── Empty state ───────────────────────────────────────────── */
        .chat-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
          gap: 16px;
          text-align: center;
          padding: 80px 20px;
        }
        .chat-empty-icon {
          width: 56px;
          height: 56px;
          border-radius: 18px;
          background: rgba(59,130,246,0.08);
          border: 1px solid rgba(59,130,246,0.14);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #3b82f6;
          box-shadow: 0 0 28px rgba(59,130,246,0.1);
        }
        .chat-empty h2 {
          font-size: 20px;
          font-weight: 600;
          color: #d1d5db;
          margin: 0;
        }
        .chat-empty p {
          font-size: 14px;
          color: #4b5563;
          margin: 0;
          max-width: 360px;
          line-height: 1.65;
        }

        /* ── Message row ───────────────────────────────────────────── */
        .msg-row {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }
        .msg-row.user { flex-direction: row-reverse; }

        /* ── Avatar ─────────────────────────────────────────────────  */
        .avatar {
          flex-shrink: 0;
          width: 32px;
          height: 32px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .avatar.bot {
          background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%);
          box-shadow: 0 0 14px rgba(59,130,246,0.28);
          color: #fff;
        }
        .avatar.user {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.09);
          color: #9ca3af;
        }

        /* ── Bubble wrapper ─────────────────────────────────────────── */
        .bubble-wrap {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-width: min(78%, 640px);
        }

        /* ── Chat bubble ─────────────────────────────────────────────  */
        .bubble {
          padding: 13px 17px;
          border-radius: 16px;
          font-size: 14px;
          line-height: 1.72;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .bubble.bot {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-top-left-radius: 4px;
          color: #e2e8f0;
        }
        .bubble.user {
          background: linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%);
          border: 1px solid rgba(59,130,246,0.18);
          border-top-right-radius: 4px;
          color: #f1f5f9;
        }

        /* ══════════════════════════════════════════════════════════════
           Citations Panel
        ══════════════════════════════════════════════════════════════ */
        .citations-panel {
          display: flex;
          flex-direction: column;
          gap: 8px;
          animation: fadeUp 0.35s ease both;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }

        /* Header row */
        .citations-header {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: #4b5563;
          padding: 0 2px;
        }
        .citations-divider {
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.05);
          margin: 0 4px;
        }
        .citations-count-label {
          color: #374151;
          font-weight: 500;
          letter-spacing: 0.03em;
        }

        .citations-list {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        /* ══════════════════════════════════════════════════════════════
           Citation Card
        ══════════════════════════════════════════════════════════════ */
        .citation-card {
          display: flex;
          align-items: stretch;
          background: rgba(12,16,28,0.75);
          border: 1px solid rgba(59,130,246,0.1);
          border-radius: 10px;
          overflow: hidden;
          animation: fadeUp 0.4s ease both;
          transition: border-color 0.2s, background 0.2s, transform 0.15s;
          cursor: default;
        }
        .citation-card:hover {
          border-color: rgba(59,130,246,0.26);
          background: rgba(17,24,42,0.9);
          transform: translateX(2px);
        }

        /* Left gradient accent */
        .citation-accent {
          width: 3px;
          background: linear-gradient(180deg, #60a5fa 0%, #1d4ed8 100%);
          flex-shrink: 0;
        }

        /* Card content */
        .citation-body {
          display: flex;
          flex-direction: column;
          gap: 5px;
          padding: 10px 13px;
          flex: 1;
          min-width: 0;
        }

        .citation-top-row {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        /* Act pill — blue */
        .citation-act-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(59,130,246,0.1);
          border: 1px solid rgba(59,130,246,0.2);
          color: #93c5fd;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.05em;
          padding: 2px 8px;
          border-radius: 20px;
        }

        /* Clause pill — purple */
        .citation-clause-pill {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          background: rgba(139,92,246,0.1);
          border: 1px solid rgba(139,92,246,0.2);
          color: #a78bfa;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.04em;
          padding: 2px 7px;
          border-radius: 20px;
        }

        /* Section identifier + title */
        .citation-section-row {
          display: flex;
          align-items: baseline;
          gap: 8px;
          flex-wrap: wrap;
        }
        .citation-section-num {
          font-size: 13px;
          font-weight: 700;
          color: #e2e8f0;
          font-variant-numeric: tabular-nums;
          flex-shrink: 0;
        }
        .citation-section-title {
          font-size: 12.5px;
          color: #94a3b8;
          font-weight: 400;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Full act name — dimmed subtitle */
        .citation-act-full {
          font-size: 10.5px;
          color: #374151;
          font-style: italic;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ── Loading dots ──────────────────────────────────────────── */
        .loading-bubble {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 14px 18px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          border-top-left-radius: 4px;
        }
        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #374151;
          animation: bounce 1.2s ease-in-out infinite;
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0);    background: #374151; }
          40%            { transform: translateY(-6px); background: #3b82f6; }
        }

        /* ── Input area ─────────────────────────────────────────────── */
        .chat-input-area {
          background: rgba(8,8,16,0.97);
          border-top: 1px solid rgba(255,255,255,0.05);
          padding: 14px 24px 22px;
        }
        .chat-input-inner {
          max-width: 860px;
          margin: 0 auto;
        }
        .chat-form {
          display: flex;
          align-items: flex-end;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 16px;
          padding: 12px 12px 12px 18px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .chat-form:focus-within {
          border-color: rgba(59,130,246,0.38);
          box-shadow: 0 0 0 3px rgba(59,130,246,0.07);
        }
        .chat-textarea {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          resize: none;
          font-size: 14px;
          color: #f1f5f9;
          line-height: 1.6;
          max-height: 180px;
          padding-top: 2px;
          font-family: inherit;
        }
        .chat-textarea::placeholder { color: #374151; }

        .chat-send-btn {
          flex-shrink: 0;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #2563eb;
          color: #fff;
          transition: background 0.2s, opacity 0.2s, transform 0.15s;
        }
        .chat-send-btn:hover:not(:disabled) {
          background: #1d4ed8;
          transform: scale(1.06);
        }
        .chat-send-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        .chat-disclaimer {
          text-align: center;
          margin-top: 10px;
          font-size: 11px;
          color: #1f2937;
        }
      `}</style>

      {/* ── Layout ─────────────────────────────────────────────────────────── */}
      <div className="chat-root">

        {/* Header */}
        <header className="chat-header">
          <div className="ai-assistant-badge">
            <Zap size={20} strokeWidth={2} />
            <span>AI Assistant</span>
          </div>
        </header>

        {/* Messages */}
        <main className="chat-messages">
          {messages.length === 0 ? (
            <div className="chat-empty" style={{ margin: 'auto' }}>
              <div className="chat-empty-icon">
                <BotIcon size={24} />
              </div>
              <h2>How can I help you today?</h2>
              <p>
                Ask any question about Indian law — I&apos;ll find the relevant
                acts, sections and clauses for you.
              </p>
            </div>
          ) : (
            <>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {messages.map((m: any) => {
                const isUser = m.role === 'user';
                const raw = getMessageContent(m);
                const { text, citations } = isUser
                  ? { text: raw, citations: [] as LegalCitation[] }
                  : parseMessage(raw);

                return (
                  <div key={m.id} className={`msg-row ${isUser ? 'user' : 'bot'}`}>
                    {/* Avatar */}
                    <div className={`avatar ${isUser ? 'user' : 'bot'}`}>
                      {isUser ? <UserIcon size={16} /> : <BotIcon size={16} />}
                    </div>

                    {/* Bubble + Citations stacked */}
                    <div className="bubble-wrap">
                      <div className={`bubble ${isUser ? 'user' : 'bot'}`}>
                        {text}
                      </div>

                      {/* Legal Citations Panel — bot only */}
                      {!isUser && <CitationsPanel citations={citations} />}
                    </div>
                  </div>
                );
              })}

              {/* Streaming loading indicator */}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="msg-row bot">
                  <div className="avatar bot">
                    <BotIcon size={16} />
                  </div>
                  <div className="loading-bubble">
                    <span className="dot" style={{ animationDelay: '0ms' }} />
                    <span className="dot" style={{ animationDelay: '160ms' }} />
                    <span className="dot" style={{ animationDelay: '320ms' }} />
                  </div>
                </div>
              )}
            </>
          )}

          <div ref={messagesEndRef} style={{ height: '1px' }} />
        </main>

        {/* Input */}
        <div className="chat-input-area">
          <div className="chat-input-inner">
            <form onSubmit={handleSubmit} className="chat-form">
              <textarea
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const form = e.currentTarget.form;
                    if (form && (input ?? '' as string).trim()) form.requestSubmit();
                  }
                }}
                placeholder="Ask about Indian law…"
                className="chat-textarea"
                rows={1}
                ref={(el) => {
                  if (el) {
                    el.style.height = 'auto';
                    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
                  }
                }}
              />
              <button
                type="submit"
                disabled={isLoading || !(input ?? '').toString().trim()}
                className="chat-send-btn"
              >
                {isLoading
                  ? <Loader2 size={16} className="animate-spin" />
                  : <Send size={16} />
                }
              </button>
            </form>
            <p className="chat-disclaimer">
              AI can make mistakes. Always verify with a licensed legal professional.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
