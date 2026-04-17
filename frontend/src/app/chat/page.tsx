'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useEffect, useRef } from 'react';
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
  Plus,
  Search,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  Paperclip,
  Menu,
  MoreHorizontal,
  LayoutGrid,
  Mic
} from 'lucide-react';

import { useRouter } from 'next/navigation';

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
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat() as any;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const router = useRouter();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex h-screen w-full bg-white text-[#0d0d0d] font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* ── Scoped Styles for specifics ── */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 4px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background: #e5e5e5;
        }
        .msg-enter {
          animation: slideUp 0.3s ease-out;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Sidebar ── */}
      {sidebarOpen && (
        <div className="flex flex-col w-[260px] bg-[#f9f9f9] shrink-0 transition-all duration-300 relative border-r border-[#ececec]">
          {/* Top Actions */}
          <div className="p-3 pb-2 flex items-center justify-between">
            <button className="flex items-center justify-center p-2 rounded-md hover:bg-[#ececec] transition-colors text-slate-500" onClick={() => setSidebarOpen(false)}>
              <PanelLeftClose size={20} />
            </button>
            <button className="flex items-center gap-2 flex-1 justify-end p-2 rounded-md hover:bg-[#ececec] transition-colors text-slate-700 font-medium text-sm">
              <Plus size={18} />
            </button>
          </div>

          <div className="px-3 flex flex-col gap-1">
            <button onClick={() => window.location.reload()} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#ececec] transition-colors w-full text-left text-slate-800">
              <Zap size={16} /> Nyaay AI Chat
            </button>
            <button onClick={() => router.push('/')} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#ececec] transition-colors w-full text-left text-slate-800">
              <LayoutGrid size={16} /> Dashboard
            </button>
            <button onClick={() => router.push('/search')} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#ececec] transition-colors w-full text-left text-slate-600">
              <Search size={16} /> Legal Search
            </button>
          </div>

          {/* Chat History / Projects segment */}
          <div className="flex-1 overflow-y-auto px-3 mt-6 custom-scrollbar opacity-70">
            <h3 className="text-xs font-semibold text-slate-500 px-3 mb-2">Projects</h3>
            <div className="space-y-0.5">
              <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-[#ececec] transition-colors w-full text-left text-slate-600 truncate">
                <FileText size={14} className="shrink-0" /> Draft Petition CAS-11
              </button>
              <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-[#ececec] transition-colors w-full text-left text-slate-600 truncate">
                <FileText size={14} className="shrink-0" /> Inheritence Laws DB
              </button>
            </div>

            <h3 className="text-xs font-semibold text-slate-500 px-3 mt-6 mb-2">Recents</h3>
            <div className="space-y-0.5">
              <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-[#ececec] transition-colors w-full text-left text-slate-600 truncate">
                What is IPC 420?
              </button>
              <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-[#ececec] transition-colors w-full text-left text-slate-600 truncate">
                Landlord eviction notice format
              </button>
            </div>
          </div>

          {/* User Profile Footer */}
          <div className="p-3 border-t border-[#ececec]">
            <button onClick={() => router.push('/')} className="flex items-center gap-2 w-full px-2 py-2 rounded-lg hover:bg-[#ececec] transition-colors">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">NK</div>
              <span className="text-sm font-semibold flex-1 text-left text-slate-700">Nyaay User</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Main Chat Area ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-white relative">
        
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-3 w-full shrink-0">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button className="p-2 rounded-md hover:bg-slate-100 transition-colors text-slate-500" onClick={() => setSidebarOpen(true)}>
                <PanelLeftOpen size={20} />
              </button>
            )}
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors text-lg font-semibold text-[#0d0d0d]">
              Nyaay AI <ChevronDown size={18} className="text-slate-400" />
            </button>
          </div>
          <div className="flex items-center">
             <button className="w-8 h-8 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors">
               <UserIcon size={16} />
             </button>
          </div>
        </header>

        {/* Dynamic Context Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col relative w-full items-center">
          
          {messages.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center flex-1 w-full mt-[-8vh] px-4">
              <h2 className="text-[26px] md:text-[32px] font-semibold text-[#0d0d0d] mb-8 text-center bg-white z-10 w-full py-4 relative">
                How can I help you today?
              </h2>

              {/* Centered Input (moved from bottom when empty) */}
              <div className="w-full max-w-[760px] mx-auto z-20">
                <form onSubmit={handleSubmit} className="relative flex flex-col bg-[#f4f4f4] border border-[#e5e5e5] rounded-[24px] focus-within:bg-white focus-within:border-slate-300 focus-within:shadow-[0_0_15px_rgba(0,0,0,0.05)] transition-all px-4 py-3">
                  <div className="flex items-start gap-2">
                    <button type="button" className="p-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors mt-0.5 shrink-0" title="Attach file">
                      <Plus size={20} />
                    </button>
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
                      placeholder="Ask anything about Indian law..."
                      className="flex-1 resize-none bg-transparent text-[16px] text-slate-800 outline-none py-2 max-h-[200px]"
                      rows={1}
                      ref={(el) => {
                        if (el) {
                          el.style.height = 'auto';
                          el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
                        }
                      }}
                    />
                    <div className="flex items-center gap-1 mt-0.5 shrink-0">
                      {!(input || '').trim() ? (
                        <button type="button" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
                          <Mic size={18} />
                        </button>
                      ) : (
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="w-10 h-10 flex items-center justify-center rounded-full bg-black text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
                        >
                          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            /* Populated Chat Thread */
            <div className="w-full max-w-[760px] flex flex-col gap-8 py-8 px-4 flex-1">
              {messages.map((m: any, idx: number) => {
                const isUser = m.role === 'user';
                const raw = getMessageContent(m);
                const { text, citations } = isUser
                  ? { text: raw, citations: [] as LegalCitation[] }
                  : parseMessage(raw);

                return (
                  <div key={m.id || idx} className="flex gap-4 msg-enter w-full">
                    {/* Avatar */}
                    <div className="shrink-0 mt-0.5">
                      {isUser ? (
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[11px]">NK</div>
                      ) : (
                        <div className="w-8 h-8 rounded-full border border-slate-200 bg-white text-[#10a37f] flex items-center justify-center shadow-sm">
                           <Zap size={18} fill="currentColor" strokeWidth={0} />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-4">
                      {isUser ? (
                        <h3 className="font-semibold text-[15px] mb-1">You</h3>
                      ) : (
                        <h3 className="font-semibold text-[15px] mb-1">Nyaay AI</h3>
                      )}
                      
                      <div className="prose prose-sm md:prose-base prose-slate max-w-none text-[#0d0d0d] leading-relaxed whitespace-pre-wrap">
                        {text}
                      </div>

                      {/* Display Citations inside bot message context */}
                      {!isUser && citations.length > 0 && <CitationsPanel citations={citations} />}
                    </div>
                  </div>
                );
              })}

              {/* Streaming loading indicator */}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex gap-4 w-full msg-enter">
                  <div className="shrink-0 mt-0.5">
                     <div className="w-8 h-8 rounded-full border border-slate-200 bg-white text-[#10a37f] flex items-center justify-center shadow-sm">
                        <Zap size={18} fill="currentColor" strokeWidth={0} />
                     </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-[15px] mb-1">Nyaay AI</h3>
                    <div className="flex items-center gap-1.5 h-6">
                      <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        {/* Bottom Input Area (Visible only when chat is active) */}
        {messages.length > 0 && (
          <div className="w-full max-w-[760px] mx-auto px-4 pb-6 pt-2 bg-gradient-to-t from-white via-white to-transparent shrink-0">
            <form onSubmit={handleSubmit} className="relative flex flex-col bg-[#f4f4f4] border border-[#e5e5e5] rounded-[24px] focus-within:bg-white focus-within:border-slate-300 focus-within:shadow-[0_0_15px_rgba(0,0,0,0.05)] transition-all px-4 py-2.5">
              <div className="flex items-start gap-2">
                <button type="button" className="p-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors mt-0.5 shrink-0" title="Attach file">
                  <Plus size={20} />
                </button>
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
                  placeholder="Ask anything about Indian law..."
                  className="flex-1 resize-none bg-transparent text-[16px] text-slate-800 outline-none py-1.5 max-h-[200px]"
                  rows={1}
                  ref={(el) => {
                    if (el) {
                      el.style.height = 'auto';
                      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
                    }
                  }}
                />
                <div className="flex items-center gap-1 mt-0.5 shrink-0">
                  <button
                    type="submit"
                    disabled={isLoading || !(input || '').trim()}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-black text-white hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:bg-[#ececec] disabled:text-slate-400"
                  >
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              </div>
            </form>
            <p className="text-center text-xs text-slate-400 mt-3 font-medium">
              Nyaay AI can make mistakes. Always check important information.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
