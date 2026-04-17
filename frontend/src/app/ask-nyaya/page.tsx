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
  Mic,
  FileStack,
  Briefcase,
  Users,
  Bell,
  CreditCard
} from 'lucide-react';

import { useRouter } from 'next/navigation';
import { useAuth } from "@/contexts/AuthContext";

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

const CITATION_SENTINEL = '\n\n[[NYAYA_CITATIONS]]\n';

function getMessageContent(message: any): string {
  if (typeof message.content === 'string') return message.content;
  if (Array.isArray(message.parts)) {
    return (message.parts as Array<{ type: string; text?: string }>)
      .filter((p) => p.type === 'text')
      .map((p) => p.text ?? '')
      .join('');
  }
  return '';
}

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
      <div className="citation-accent" />
      <div className="citation-body">
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
        <div className="citation-section-row">
          <span className="citation-section-num">§&nbsp;{citation.sectionNumber}</span>
          {citation.sectionTitle && (
            <span className="citation-section-title">{citation.sectionTitle}</span>
          )}
        </div>
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

export default function AskNyayaPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, append } = useChat() as any;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const hasAppendedRef = useRef(false);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    // Support ?q= parameter
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('q');
      if (q && !hasAppendedRef.current && messages.length === 0) {
        append({ role: 'user', content: q });
        hasAppendedRef.current = true;
        window.history.replaceState({}, '', '/ask-nyaya'); // Clean URL
      }
    }
  }, [append, messages.length]);

  return (
    <div className="flex h-screen w-full bg-white text-[#0d0d0d] font-sans selection:bg-slate-200 selection:text-slate-900">
      
      {/* ── Scoped Styles ── */}
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
        .citation-card {
           display: flex;
           gap: 8px;
           background: #f9f9f9;
           border: 1px solid #ececec;
           border-radius: 12px;
           padding: 10px 12px;
           overflow: hidden;
           position: relative;
        }
        .citation-accent {
           position: absolute;
           left: 0; top: 0; bottom: 0;
           width: 3px;
           background: #10a37f;
        }
        .citation-body {
           flex: 1;
           display: flex;
           flex-direction: column;
           gap: 4px;
        }
        .citation-top-row {
           display: flex;
           align-items: center;
           gap: 6px;
           font-size: 11px;
           font-weight: 600;
           color: #10a37f;
        }
        .citation-act-pill, .citation-clause-pill {
           display: flex;
           align-items: center;
           gap: 4px;
        }
        .citation-section-row {
           font-size: 14px;
           font-weight: 600;
           color: #333;
        }
        .citation-act-full {
           font-size: 11px;
           color: #888;
           white-space: nowrap;
           overflow: hidden;
           text-overflow: ellipsis;
        }
        .citations-panel {
           margin-top: 16px;
           padding: 14px;
           background: rgba(0,0,0,0.02);
           border: 1px solid rgba(0,0,0,0.06);
           border-radius: 12px;
        }
        .citations-header {
           display: flex;
           align-items: center;
           gap: 6px;
           font-size: 12px;
           font-weight: 600;
           color: #666;
           text-transform: uppercase;
           letter-spacing: 0.5px;
           margin-bottom: 12px;
        }
        .citations-divider {
           flex: 1;
           height: 1px;
           background: rgba(0,0,0,0.06);
           margin: 0 8px;
        }
        .citations-list {
           display: flex;
           flex-direction: column;
           gap: 8px;
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
            <button className="flex items-center justify-center p-2 rounded-md hover:bg-[#ececec] transition-colors text-slate-500" onClick={() => { window.location.href='/ask-nyaya'; }}>
              <Plus size={18} />
            </button>
          </div>

          <div className="px-3 py-2 flex flex-col gap-1">
            <button onClick={() => window.location.href='/ask-nyaya'} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-slate-200 text-slate-800 transition-colors w-full text-left">
              <Zap size={16} /> Ask Nyaay
            </button>
            <button onClick={() => router.push('/')} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-200 text-slate-600 transition-colors w-full text-left">
              <LayoutGrid size={16} /> Dashboard
            </button>
            <button onClick={() => router.push('/documents')} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-200 text-slate-600 transition-colors w-full text-left mt-4 border-t border-slate-200 pt-3">
              <FileStack size={16} /> Documents
            </button>
            <button onClick={() => router.push('/cases')} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-200 text-slate-600 transition-colors w-full text-left">
              <Briefcase size={16} /> Case Management
            </button>
            <button onClick={() => router.push('/marketplace')} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-200 text-slate-600 transition-colors w-full text-left">
              <Users size={16} /> Lawyer Marketplace
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 mt-4 custom-scrollbar">
            {/* Navigational spacing */}
          </div>

          {/* User Profile Footer */}
          <div className="p-3 border-t border-[#ececec]">
            <button onClick={() => router.push('/')} className="flex items-center gap-2 w-full px-2 py-2 rounded-lg hover:bg-[#ececec] transition-colors">
              <div className="w-7 h-7 rounded-full bg-black text-white font-bold flex items-center justify-center text-xs">NK</div>
              <span className="text-sm font-semibold flex-1 text-left text-slate-700">{user?.name || 'Nyaay User'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Main Chat Area ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-white relative">
        
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-3 w-full shrink-0">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <button className="p-2 rounded-md hover:bg-slate-100 transition-colors text-slate-500" onClick={() => setSidebarOpen(true)}>
                <PanelLeftOpen size={20} />
              </button>
            )}
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors text-lg font-semibold text-[#0d0d0d]">
              Ask Nyaay <ChevronDown size={18} className="text-slate-400" />
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
                 What's on the agenda today?
              </h2>

              {/* Centered Input */}
              <div className="w-full max-w-[760px] mx-auto z-20 shadow-[0_0_40px_rgba(0,0,0,0.03)] rounded-[24px]">
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
                      placeholder="Ask anything..."
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
              <div className="mt-8 flex flex-wrap justify-center gap-3 max-w-[760px] opacity-70">
                <button onClick={() => append({role:'user',content:'What is IPC 420?'})} className="px-4 py-2 bg-slate-100 border border-slate-200 rounded-full text-sm font-medium hover:bg-slate-200 text-slate-600 transition-colors">What is IPC 420?</button>
                <button onClick={() => append({role:'user',content:'Draft a landlord eviction notice'})} className="px-4 py-2 bg-slate-100 border border-slate-200 rounded-full text-sm font-medium hover:bg-slate-200 text-slate-600 transition-colors">Draft an eviction notice</button>
                <button onClick={() => append({role:'user',content:'Consumer Protection Act highlights'})} className="px-4 py-2 bg-slate-100 border border-slate-200 rounded-full text-sm font-medium hover:bg-slate-200 text-slate-600 transition-colors">Consumer Protection Act</button>
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
                    <div className="shrink-0 mt-0.5">
                      {isUser ? (
                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[11px] border border-slate-300">NK</div>
                      ) : (
                        <div className="w-8 h-8 rounded-full border border-slate-200 bg-white text-[#10a37f] flex items-center justify-center shadow-sm">
                           <Zap size={18} fill="currentColor" strokeWidth={0} />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pr-4">
                      {isUser ? (
                        <h3 className="font-semibold text-[15px] mb-1">You</h3>
                      ) : (
                        <h3 className="font-semibold text-[15px] mb-1">Nyaay AI</h3>
                      )}
                      
                      <div className="prose prose-sm md:prose-base prose-slate max-w-none text-[#0d0d0d] leading-relaxed whitespace-pre-wrap">
                        {text}
                      </div>

                      {!isUser && citations.length > 0 && <CitationsPanel citations={citations} />}
                    </div>
                  </div>
                );
              })}

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
                       <Loader2 size={16} className="animate-spin text-slate-400" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        {/* Bottom Input Area */}
        {messages.length > 0 && (
          <div className="w-full max-w-[800px] mx-auto px-4 pb-6 pt-2 bg-gradient-to-t from-white via-white to-transparent shrink-0">
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
                  placeholder="Ask anything..."
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
