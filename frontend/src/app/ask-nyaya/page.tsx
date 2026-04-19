'use client';

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
import api, { getAccessToken } from "@/lib/api";

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

interface Conversation {
  id: string;
  title: string;
  messages: any[];
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

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function AskNyayaPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [localInput, setLocalInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const hasAppendedRef = useRef(false);

  const fetchConversations = async () => {
    try {
      const res = await api.get('/chat/conversations');
      setConversations(res.data);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
    if (user) fetchConversations();
  }, [authLoading, user, router]);

  const loadConversation = (id: string) => {
    const conv = conversations.find(c => c.id === id);
    if (conv) {
      setConversationId(id);
      setMessages(conv.messages.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content
      })));
    }
  };

  const startNewChat = () => {
    setConversationId(null);
    setMessages([]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const userMsgId = `${Date.now()}-u`;
    const asstMsgId = `${Date.now()}-a`;
    setMessages(prev => [
      ...prev,
      { id: userMsgId, role: 'user', content: `[Uploading Document: ${file.name}...]` },
      { id: asstMsgId, role: 'assistant', content: '' }
    ]);

    const formData = new FormData();
    formData.append('file', file);
    if (conversationId) formData.append('conversationId', conversationId);

    try {
      const res = await api.post('/documents/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const { analysis, classification, conversationId: newConvId } = res.data;

      if (!conversationId && newConvId) setConversationId(newConvId);

      setMessages(prev => prev.map(m => {
        if (m.id === userMsgId) return { ...m, content: `Uploaded a ${classification.documentType} for Analysis.\nSummary: ${classification.summary}` };
        if (m.id === asstMsgId) return { ...m, content: analysis };
        return m;
      }));

      fetchConversations();
    } catch (err: any) {
      console.error('Upload error:', err);
      const errMsg = err.response?.data?.error || err.message || 'Failed to upload document.';
      setMessages(prev => prev.map(m =>
        m.id === asstMsgId ? { ...m, content: `Error: ${errMsg}` } : m
      ));
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = { id: `${Date.now()}-u`, role: 'user', content: trimmed };
    const assistantId = `${Date.now()}-a`;
    setMessages(prev => [...prev, userMsg, { id: assistantId, role: 'assistant', content: '' }]);
    setLocalInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAccessToken()}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          conversationId,
        }),
      });

      const convId = res.headers.get('X-Conversation-Id');
      if (convId && !conversationId) {
        setConversationId(convId);
        fetchConversations();
      }

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => 'Unknown error');
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: `Error: ${errText}` } : m
        ));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        const snap = accumulated;
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: snap } : m
        ));
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: 'Sorry, something went wrong. Please try again.' }
          : m
      ));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('q');
      if (q && !hasAppendedRef.current) {
        hasAppendedRef.current = true;
        sendMessage(q);
        window.history.replaceState({}, '', '/ask-nyaya');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
           background: #ffffff;
           border: 1px solid #e2e8f0;
           border-radius: 10px;
           padding: 12px 14px;
           overflow: hidden;
           position: relative;
           box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .citation-accent {
           position: absolute;
           left: 0; top: 0; bottom: 0;
           width: 3px;
           background: #d4af37;
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
           font-weight: 700;
           color: #0f172a;
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
            <button className="flex items-center justify-center p-2 rounded-md hover:bg-[#ececec] transition-colors text-slate-500" onClick={startNewChat}>
              <Plus size={18} />
            </button>
          </div>

          <div className="px-3 py-2 flex flex-col gap-1">
            <button onClick={startNewChat} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-slate-200 text-slate-800 transition-colors w-full text-left">
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

          <div className="flex-1 overflow-y-auto px-2 mt-4 custom-scrollbar">
            {conversations.length > 0 && (
              <div className="mt-2 flex flex-col gap-1">
                <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">History</h3>
                {conversations.map(conv => (
                  <div key={conv.id} className="relative group">
                    <button 
                      onClick={() => loadConversation(conv.id)}
                      className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors w-full text-left ${conversationId === conv.id ? 'bg-slate-200 text-slate-800' : 'hover:bg-slate-200 text-slate-600'}`}
                    >
                      <MessageSquare size={14} className="shrink-0 mr-2.5 opacity-60" />
                      <span className="truncate w-full font-medium" title={conv.title}>{conv.title}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User Profile Footer */}
          <div className="p-3 border-t border-[#ececec]">
            <button onClick={() => router.push('/')} className="flex items-center gap-2 w-full px-2 py-2 rounded-lg hover:bg-[#ececec] transition-colors">
              <div className="w-7 h-7 rounded-full bg-black text-white font-bold flex items-center justify-center text-xs">{(user?.email?.[0] || 'N').toUpperCase()}</div>
              <span className="text-sm font-semibold flex-1 text-left text-slate-700">{user?.email ? user.email.split('@')[0] : 'Nyaay User'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Main Chat Area ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-white relative">
        
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.png,.jpg,.jpeg,.txt" />

        {/* Header */}
        <header className="h-14 flex items-center justify-between px-3 w-full shrink-0">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <button className="p-2 rounded-md hover:bg-slate-100 transition-colors text-slate-500" onClick={() => setSidebarOpen(true)}>
                <PanelLeftOpen size={20} />
              </button>
            )}
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors text-[20px] font-semibold text-[#0f172a] font-serif tracking-tight">
              Nyaya Workspace <ChevronDown size={18} className="text-slate-400" />
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
              <div className="flex flex-col items-center mb-10 z-10 w-full py-4 relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-[#d4af37] flex items-center justify-center shadow-2xl mb-6 border border-[#334155]">
                  <Scale size={32} strokeWidth={1.5} />
                </div>
                <h2 className="text-[28px] md:text-[36px] font-serif font-medium text-[#0f172a] text-center tracking-tight">
                   How can I assist your legal research?
                </h2>
                <p className="text-[#64748b] mt-3 font-medium text-[15px] text-center max-w-lg">
                   Analyze case laws, draft legal documents, or explore the Indian Penal Code with precision.
                </p>
              </div>

              {/* Centered Input */}
              <div className="w-full max-w-[760px] mx-auto z-20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[16px]">
                <form onSubmit={(e) => { e.preventDefault(); sendMessage(localInput); }} className="relative flex flex-col bg-white border border-[#e2e8f0] rounded-[16px] focus-within:border-[#cbd5e1] focus-within:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all px-4 py-3">
                  <div className="flex items-start gap-2">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors mt-0.5 shrink-0" title="Attach case files">
                      <Paperclip size={20} />
                    </button>
                    <textarea
                      value={localInput}
                      onChange={(e) => setLocalInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage(localInput);
                        }
                      }}
                      placeholder="Ask anything about Indian law..."
                      className="flex-1 resize-none bg-transparent text-[16px] text-slate-800 outline-none py-2 max-h-[200px] placeholder:text-slate-400"
                      rows={1}
                      ref={(el) => {
                        if (el) {
                          el.style.height = 'auto';
                          el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
                        }
                      }}
                    />
                    <div className="flex items-center gap-1 mt-0.5 shrink-0">
                      {!localInput.trim() ? (
                        <button type="button" className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                          <Mic size={18} />
                        </button>
                      ) : (
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#0f172a] text-[#d4af37] hover:bg-[#1e293b] transition-colors disabled:opacity-50 shadow-sm"
                        >
                          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              </div>
              <div className="mt-8 flex flex-wrap justify-center gap-3 max-w-[760px]">
                <button onClick={() => sendMessage('Explain Article 21 of the Constitution of India — Protection of life and personal liberty. What does it guarantee?')} className="px-4 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-[13px] font-medium hover:border-[#cbd5e1] hover:bg-[#f8fafc] text-[#475569] transition-all shadow-sm flex items-center gap-2"><Scale size={14} className="text-[#d4af37]"/> Constitution Art. 21</button>
                <button onClick={() => sendMessage('What is Section 103 of the Bharatiya Nyaya Sanhita (BNS) 2023 — Punishment for murder? How has it changed from the old IPC?')} className="px-4 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-[13px] font-medium hover:border-[#cbd5e1] hover:bg-[#f8fafc] text-[#475569] transition-all shadow-sm flex items-center gap-2"><BookOpen size={14} className="text-[#d4af37]"/> BNS Sec. 103 — Murder</button>
                <button onClick={() => sendMessage('Explain Section 66 of the IT Act 2000 — Computer related offences. What constitutes an offence and what is the penalty?')} className="px-4 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-[13px] font-medium hover:border-[#cbd5e1] hover:bg-[#f8fafc] text-[#475569] transition-all shadow-sm flex items-center gap-2"><FileText size={14} className="text-[#d4af37]"/> IT Act Sec. 66</button>
                <button onClick={() => sendMessage('What are the rights of a consumer under Section 2 of the Consumer Protection Act, 2019?')} className="px-4 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-[13px] font-medium hover:border-[#cbd5e1] hover:bg-[#f8fafc] text-[#475569] transition-all shadow-sm flex items-center gap-2"><Briefcase size={14} className="text-[#d4af37]"/> Consumer Rights</button>
                <button onClick={() => sendMessage('Explain Section 173 of the BNSS 2023 — Information in cognizable cases. How does the FIR filing process work?')} className="px-4 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-[13px] font-medium hover:border-[#cbd5e1] hover:bg-[#f8fafc] text-[#475569] transition-all shadow-sm flex items-center gap-2"><Hash size={14} className="text-[#d4af37]"/> BNSS Sec. 173 — FIR</button>
              </div>
            </div>
          ) : (
            /* Populated Chat Thread */
            <div className="w-full max-w-[760px] flex flex-col gap-8 py-8 px-4 flex-1">
              {messages.map((m: ChatMessage, idx: number) => {
                const isUser = m.role === 'user';
                const { text, citations } = isUser
                  ? { text: m.content, citations: [] as LegalCitation[] }
                  : parseMessage(m.content);

                return (
                  <div key={m.id || idx} className="flex gap-4 msg-enter w-full">
                    <div className="shrink-0 mt-0.5">
                      {isUser ? (
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-[10px] border border-slate-200 shadow-sm uppercase tracking-wide">{user?.email ? user.email.substring(0,2) : 'NK'}</div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg border border-[#1e293b] bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-[#d4af37] flex items-center justify-center shadow-md">
                           <Scale size={16} strokeWidth={1.5} />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pr-4">
                      {isUser ? (
                        <h3 className="font-semibold text-[14px] text-slate-700 mb-1">You</h3>
                      ) : (
                        <h3 className="font-semibold text-[14px] text-[#0f172a] mb-1">Nyaya Legal Assistant</h3>
                      )}
                      
                      <div className="prose prose-sm md:prose-base prose-slate max-w-none text-[#0d0d0d] leading-relaxed whitespace-pre-wrap">
                        {text}
                      </div>

                      {!isUser && citations.length > 0 && <CitationsPanel citations={citations} />}
                    </div>
                  </div>
                );
              })}

              {isLoading && messages[messages.length - 1]?.role === 'assistant' && messages[messages.length - 1]?.content === '' && (
                <div className="flex gap-4 w-full msg-enter">
                  <div className="shrink-0 mt-0.5">
                     <div className="w-8 h-8 rounded-lg border border-[#1e293b] bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-[#d4af37] flex items-center justify-center shadow-md">
                        <Scale size={16} strokeWidth={1.5} />
                     </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-[14px] text-[#0f172a] mb-1">Nyaya Legal Assistant</h3>
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
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(localInput); }} className="relative flex flex-col bg-white border border-[#e2e8f0] rounded-[16px] focus-within:border-[#cbd5e1] focus-within:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all px-4 py-2.5">
              <div className="flex items-start gap-2">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors mt-0.5 shrink-0" title="Attach case files">
                  <Paperclip size={20} />
                </button>
                <textarea
                  value={localInput}
                  onChange={(e) => setLocalInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(localInput);
                    }
                  }}
                  placeholder="Ask anything about Indian law..."
                  className="flex-1 resize-none bg-transparent text-[16px] text-slate-800 outline-none py-1.5 max-h-[200px] placeholder:text-slate-400"
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
                    disabled={isLoading || !localInput.trim()}
                    className="w-10 h-10 flex items-center justify-center rounded-[12px] bg-[#0f172a] text-[#d4af37] hover:bg-[#1e293b] transition-colors disabled:opacity-50 disabled:bg-[#f1f5f9] disabled:text-[#94a3b8] shadow-sm"
                  >
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              </div>
            </form>
            <p className="text-center text-xs text-[#94a3b8] mt-3 font-medium">
              Nyaya Legal Assistant can make mistakes. Always verify critical statutory information independently.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
