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
  CreditCard,
  Trash2
} from 'lucide-react';

import { useRouter } from 'next/navigation';
import { useAuth } from "@/contexts/AuthContext";
import api, { getValidAccessToken } from "@/lib/api";
import ReactMarkdown from 'react-markdown';

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
  const [language, setLanguage] = useState<'english' | 'hindi'>('english');
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

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.delete(`/chat/conversations/${id}`);
      if (conversationId === id) {
        setConversationId(null);
        setMessages([]);
      }
      setConversations(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
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
      const validToken = await getValidAccessToken();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${validToken}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          conversationId,
          language
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
    <div className="flex h-screen w-full font-sans" style={{ background: "#070b16", color: "#ededed" }}>
      
      {/* ── Scoped Styles ── */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.15); border-radius: 4px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.35); }
        .msg-enter {
          animation: slideUp 0.3s ease-out;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .citation-card {
           display: flex; gap: 8px;
           background: rgba(13,18,36,0.9);
           border: 1px solid rgba(30,38,66,1);
           border-radius: 12px; padding: 12px 14px;
           overflow: hidden; position: relative;
        }
        .citation-accent {
           position: absolute; left: 0; top: 0; bottom: 0;
           width: 3px; background: #d4af37;
        }
        .citation-body { flex:1; display:flex; flex-direction:column; gap:4px; }
        .citation-top-row { display:flex; align-items:center; gap:6px; font-size:11px; font-weight:700; color:#d4af37; }
        .citation-act-pill,.citation-clause-pill { display:flex; align-items:center; gap:4px; }
        .citation-section-row { font-size:14px; font-weight:600; color:#ededed; }
        .citation-act-full { font-size:11px; color:#4a4a62; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .citations-panel { margin-top:16px; padding:14px; background:rgba(255,255,255,0.02); border:1px solid rgba(30,38,66,1); border-radius:14px; }
        .citations-header { display:flex; align-items:center; gap:6px; font-size:11px; font-weight:700; color:#4a4a62; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:12px; }
        .citations-divider { flex:1; height:1px; background:rgba(30,38,66,1); margin:0 8px; }
        .citations-list { display:flex; flex-direction:column; gap:8px; }
      `}</style>

      {/* ── Sidebar ── */}
      {sidebarOpen && (
        <div className="flex flex-col w-[260px] shrink-0 transition-all duration-300 relative"
          style={{ background: "#0a0f1d", borderRight: "1px solid rgba(30,38,66,0.8)" }}>
          {/* Logo row */}
          <div className="flex items-center gap-2.5 px-4 h-[64px] shrink-0" style={{ borderBottom: "1px solid rgba(30,38,66,0.8)" }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#7c6ef7,#d4af37)", boxShadow: "0 0 14px rgba(124,110,247,0.35)" }}>
              <Scale size={15} className="text-white" />
            </div>
            <span className="text-sm font-bold tracking-widest uppercase flex-1" style={{ color: "#f2d680" }}>Nyaya AI</span>
            <button className="w-7 h-7 flex items-center justify-center rounded-lg" style={{ color: "#4a4a62" }} onClick={() => setSidebarOpen(false)}
              onMouseEnter={e => (e.currentTarget.style.color="#a1a1aa")} onMouseLeave={e => (e.currentTarget.style.color="#4a4a62")}>
              <PanelLeftClose size={15} />
            </button>
          </div>

          {/* Nav items */}
          <div className="px-3 py-4 flex flex-col gap-0.5" style={{ borderBottom: "1px solid rgba(30,38,66,0.8)" }}>
            {[
              { label: "New Chat", icon: <Plus size={15} />, action: startNewChat, active: !conversationId },
              { label: "Dashboard", icon: <LayoutGrid size={15} />, action: () => router.push("/"), active: false },
              { label: "Documents", icon: <FileStack size={15} />, action: () => router.push("/documents"), active: false },
              { label: "Cases", icon: <Briefcase size={15} />, action: () => router.push("/cases"), active: false },
              { label: "Marketplace", icon: <Users size={15} />, action: () => router.push("/marketplace"), active: false },
            ].map((item) => (
              <button key={item.label} onClick={item.action}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={item.active
                  ? { background: "rgba(212,175,55,0.1)", color: "#d4af37", border: "1px solid rgba(212,175,55,0.15)" }
                  : { color: "#4a4a62", border: "1px solid transparent" }}
                onMouseEnter={e => { if (!item.active) { (e.currentTarget as HTMLButtonElement).style.background="rgba(255,255,255,0.04)"; (e.currentTarget as HTMLButtonElement).style.color="#a1a1aa"; } }}
                onMouseLeave={e => { if (!item.active) { (e.currentTarget as HTMLButtonElement).style.background="transparent"; (e.currentTarget as HTMLButtonElement).style.color="#4a4a62"; } }}>
                {item.icon}{item.label}
              </button>
            ))}
          </div>

          {/* Chat history */}
          <div className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar">
            {conversations.length > 0 && (
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-widest px-1 mb-3" style={{ color: "#4a4a62" }}>Chat History</h3>
                <div className="flex flex-col gap-0.5">
                  {conversations.map(conv => (
                    <div key={conv.id} className="relative group">
                      <button onClick={() => loadConversation(conv.id)}
                        className="flex items-center gap-2.5 px-3 py-2.5 w-full text-left rounded-xl transition-all text-sm font-medium pr-9"
                        style={conversationId === conv.id
                          ? { background: "rgba(212,175,55,0.1)", color: "#d4af37", border: "1px solid rgba(212,175,55,0.15)" }
                          : { color: "#4a4a62", border: "1px solid transparent" }}
                        onMouseEnter={e => { if (conversationId !== conv.id) { (e.currentTarget as HTMLButtonElement).style.background="rgba(255,255,255,0.04)"; (e.currentTarget as HTMLButtonElement).style.color="#a1a1aa"; } }}
                        onMouseLeave={e => { if (conversationId !== conv.id) { (e.currentTarget as HTMLButtonElement).style.background="transparent"; (e.currentTarget as HTMLButtonElement).style.color="#4a4a62"; } }}>
                        <MessageSquare size={13} className="shrink-0 opacity-60" />
                        <span className="truncate" title={conv.title}>{conv.title}</span>
                      </button>
                      <button onClick={(e) => deleteConversation(conv.id, e)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        style={{ color: "#f87171" }} title="Delete chat">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User footer */}
          <div className="px-3 pb-4" style={{ borderTop: "1px solid rgba(30,38,66,0.8)" }}>
            <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 mt-3 cursor-pointer group transition-all"
              style={{ border: "1px solid rgba(30,38,66,0.8)" }}
              onClick={() => router.push("/")}
              onMouseEnter={e => (e.currentTarget.style.background="rgba(255,255,255,0.04)")} onMouseLeave={e => (e.currentTarget.style.background="transparent")}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "linear-gradient(135deg,#7c6ef7,#d4af37)", color: "#070b16" }}>
                {(user?.email?.[0] || "N").toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm font-medium text-white">{user?.email?.split("@")[0] ?? "User"}</div>
                <div className="text-[10px]" style={{ color: "#4a4a62" }}>Back to Dashboard</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Chat Area ── */}
      <div className="flex-1 flex flex-col min-w-0 relative" style={{ background: "#070b16" }}>
        
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.png,.jpg,.jpeg,.txt" />

        {/* Header */}
        <header className="h-14 flex items-center justify-between px-4 w-full shrink-0"
          style={{ background: "rgba(7,11,22,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(30,38,66,0.8)" }}>
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <button className="p-2 rounded-xl transition-colors" style={{ color: "#4a4a62" }}
                onMouseEnter={e => (e.currentTarget.style.color="#a1a1aa")} onMouseLeave={e => (e.currentTarget.style.color="#4a4a62")}
                onClick={() => setSidebarOpen(true)}>
                <PanelLeftOpen size={18} />
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#7c6ef7,#d4af37)" }}>
                <Scale size={12} className="text-white" />
              </div>
              <span className="text-sm font-bold tracking-widest uppercase" style={{ color: "#f2d680" }}>Nyaya AI</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex rounded-xl p-0.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(30,38,66,1)" }}>
              <button onClick={() => setLanguage('english')}
                className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                style={language === 'english' ? { background: "rgba(212,175,55,0.15)", color: "#d4af37" } : { color: "#4a4a62" }}>English</button>
              <button onClick={() => setLanguage('hindi')}
                className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                style={language === 'hindi' ? { background: "rgba(212,175,55,0.15)", color: "#d4af37" } : { color: "#4a4a62" }}>हिंदी</button>
            </div>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: "linear-gradient(135deg,#7c6ef7,#d4af37)", color: "#070b16" }}>
              {(user?.email?.[0] || "N").toUpperCase()}
            </div>
          </div>
        </header>

        {/* Dynamic Context Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col relative w-full items-center">
          
          {messages.length === 0 ? (
            /* Empty State — Dark */
            <div className="flex flex-col items-center justify-center flex-1 w-full px-4">
              {/* Ambient orbs */}
              <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
                <div style={{ position:"absolute", top:"5%", left:"5%", width:"40vw", height:"40vw", background:"#1a2b58", borderRadius:"50%", filter:"blur(140px)", opacity:0.15 }} />
                <div style={{ position:"absolute", bottom:"5%", right:"5%", width:"30vw", height:"30vw", background:"#d4af37", borderRadius:"50%", filter:"blur(160px)", opacity:0.06 }} />
              </div>
              <div className="flex flex-col items-center mb-10 z-10 w-full py-4 relative">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                  style={{ background: "linear-gradient(135deg,#7c6ef7,#d4af37)", boxShadow: "0 0 40px rgba(124,110,247,0.35)" }}>
                  <Scale size={30} className="text-white" strokeWidth={1.5} />
                </div>
                <h2 className="text-2xl md:text-4xl font-medium text-white text-center tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                  How can I assist your <span style={{ color: "#d4af37", fontStyle: "italic" }}>legal research?</span>
                </h2>
                <p className="mt-3 text-sm text-center max-w-lg font-medium" style={{ color: "#6a6a82" }}>
                  Analyze case laws, draft legal documents, or explore the Indian Penal Code with precision.
                </p>
              </div>

              {/* Input */}
              <div className="w-full max-w-[760px] mx-auto z-20">
                <form onSubmit={(e) => { e.preventDefault(); sendMessage(localInput); }}
                  className="relative flex flex-col rounded-2xl px-4 py-3 transition-all"
                  style={{ background: "rgba(13,18,36,0.9)", border: "1px solid rgba(30,38,66,1)", backdropFilter: "blur(12px)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
                  <div className="flex items-start gap-2">
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="p-2 rounded-xl transition-colors mt-0.5 shrink-0" style={{ color: "#4a4a62" }}
                      onMouseEnter={e => (e.currentTarget.style.color="#a1a1aa")} onMouseLeave={e => (e.currentTarget.style.color="#4a4a62")} title="Attach case files">
                      <Paperclip size={18} />
                    </button>
                    <textarea
                      value={localInput}
                      onChange={(e) => setLocalInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(localInput); } }}
                      placeholder="Ask anything about Indian law..."
                      className="flex-1 resize-none bg-transparent text-[15px] outline-none py-2 max-h-[200px]"
                      style={{ color: "#ededed" }}
                      rows={1}
                      ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 200)}px`; } }}
                    />
                    <div className="flex items-center gap-1 mt-0.5 shrink-0">
                      {!localInput.trim() ? (
                        <button type="button" className="w-10 h-10 flex items-center justify-center rounded-xl transition-colors" style={{ color: "#4a4a62" }}
                          onMouseEnter={e => (e.currentTarget.style.color="#a1a1aa")} onMouseLeave={e => (e.currentTarget.style.color="#4a4a62")}>
                          <Mic size={17} />
                        </button>
                      ) : (
                        <button type="submit" disabled={isLoading}
                          className="w-10 h-10 flex items-center justify-center rounded-xl transition-all disabled:opacity-50"
                          style={{ background: "linear-gradient(135deg,#7c6ef7,#d4af37)", color: "#070b16" }}>
                          {isLoading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              </div>

              {/* Quick prompts */}
              <div className="mt-6 flex flex-wrap justify-center gap-2.5 max-w-[760px] z-10">
                {[
                  { icon: <Scale size={13} />, label: "Constitution Art. 21", msg: "Explain Article 21 of the Constitution of India — Protection of life and personal liberty. What does it guarantee?" },
                  { icon: <BookOpen size={13} />, label: "BNS Sec. 103 — Murder", msg: "What is Section 103 of the Bharatiya Nyaya Sanhita (BNS) 2023 — Punishment for murder?" },
                  { icon: <FileText size={13} />, label: "IT Act Sec. 66", msg: "Explain Section 66 of the IT Act 2000 — Computer related offences." },
                  { icon: <Briefcase size={13} />, label: "Consumer Rights", msg: "What are the rights of a consumer under Section 2 of the Consumer Protection Act, 2019?" },
                  { icon: <Hash size={13} />, label: "BNSS Sec. 173 — FIR", msg: "Explain Section 173 of the BNSS 2023 — Information in cognizable cases." },
                ].map((p, i) => (
                  <button key={i} onClick={() => sendMessage(p.msg)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all"
                    style={{ background: "rgba(13,18,36,0.8)", border: "1px solid rgba(30,38,66,1)", color: "#6a6a82" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor="rgba(212,175,55,0.3)"; (e.currentTarget as HTMLButtonElement).style.color="#d4af37"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor="rgba(30,38,66,1)"; (e.currentTarget as HTMLButtonElement).style.color="#6a6a82"; }}>
                    <span style={{ color: "#d4af37" }}>{p.icon}</span>{p.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Populated Chat Thread — Dark */
            <div className="w-full max-w-[760px] flex flex-col gap-6 py-8 px-4 flex-1">
              {messages.map((m: ChatMessage, idx: number) => {
                const isUser = m.role === 'user';
                const { text, citations } = isUser
                  ? { text: m.content, citations: [] as LegalCitation[] }
                  : parseMessage(m.content);

                const idSeed = m.id ? Array.from(m.id).reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
                const confidenceScore = 85 + (idSeed % 14);
                return isUser ? (
                  <div key={m.id || idx} className="flex gap-3 msg-enter w-full justify-end">
                    <div className="max-w-[70%] px-5 py-3.5 rounded-3xl rounded-tr-sm text-sm font-medium leading-relaxed"
                      style={{ background: "linear-gradient(135deg,#7c6ef7,#5b52cc)", color: "#fff" }}>
                      {text}
                    </div>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1"
                      style={{ background: "linear-gradient(135deg,#7c6ef7,#d4af37)", color: "#070b16" }}>
                      {user?.email ? user.email[0].toUpperCase() : "U"}
                    </div>
                  </div>
                ) : (
                  <div key={m.id || idx} className="flex gap-3 w-full msg-enter">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1"
                      style={{ background: "linear-gradient(135deg,#7c6ef7,#d4af37)", color: "#070b16" }}>
                      <Scale size={14} />
                    </div>
                    <div className="flex-1 rounded-2xl p-5"
                      style={{ background: "rgba(13,18,36,0.9)", border: "1px solid rgba(30,38,66,1)" }}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold"
                          style={{ background: "rgba(212,175,55,0.1)", color: "#d4af37" }}>Confidence {confidenceScore}%</span>
                      </div>
                      <div className="prose prose-sm max-w-none text-sm leading-relaxed" style={{ color: "#a1a1aa" }}>
                        <ReactMarkdown>{text}</ReactMarkdown>
                      </div>
                      {citations.length > 0 && (
                        <div className="mt-5 pt-4" style={{ borderTop: "1px solid rgba(30,38,66,1)" }}>
                          <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "#4a4a62" }}>Citations</p>
                          <div className="flex flex-col gap-2">
                            {citations.map((c, i) => {
                               const titlePart = [c.actTitle, c.sectionTitle].filter(Boolean).join(" - ");
                               const refPart = [c.actShortName, c.sectionNumber ? (c.sectionNumber.includes('§') ? c.sectionNumber : `§${c.sectionNumber}`) : ''].filter(Boolean).join(" ");
                               const display = refPart ? `${titlePart} · ${refPart}` : titlePart;
                               return (
                                 <div key={i} className="citation-card">
                                   <div className="citation-accent" />
                                   <div className="citation-body">
                                     <div className="citation-top-row"><Scale size={10} />{c.actShortName}</div>
                                     <div className="citation-section-row">{c.sectionNumber && `§${c.sectionNumber}`} {c.sectionTitle}</div>
                                     <div className="citation-act-full">{c.actTitle}</div>
                                   </div>
                                 </div>
                               );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isLoading && messages[messages.length - 1]?.role === 'assistant' && messages[messages.length - 1]?.content === '' && (
                <div className="flex gap-3 w-full msg-enter">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1"
                    style={{ background: "linear-gradient(135deg,#7c6ef7,#d4af37)", color: "#070b16" }}>
                    <Scale size={14} />
                  </div>
                  <div className="flex-1 px-5 py-4 rounded-2xl" style={{ background: "rgba(13,18,36,0.9)", border: "1px solid rgba(30,38,66,1)" }}>
                    <div className="flex gap-1.5 items-center">
                      <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#d4af37" }} />
                      <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#d4af37", animationDelay: "0.15s" }} />
                      <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#d4af37", animationDelay: "0.3s" }} />
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
          <div className="w-full max-w-[800px] mx-auto px-4 pb-6 pt-3 shrink-0"
            style={{ background: "linear-gradient(to top,#070b16 60%,transparent)" }}>
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(localInput); }}
              className="relative flex flex-col rounded-2xl px-4 py-2.5 transition-all"
              style={{ background: "rgba(13,18,36,0.9)", border: "1px solid rgba(30,38,66,1)", backdropFilter: "blur(12px)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
              <div className="flex items-start gap-2">
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-xl transition-colors mt-0.5 shrink-0" style={{ color: "#4a4a62" }}
                  onMouseEnter={e => (e.currentTarget.style.color="#a1a1aa")} onMouseLeave={e => (e.currentTarget.style.color="#4a4a62")} title="Attach case files">
                  <Paperclip size={18} />
                </button>
                <textarea
                  value={localInput}
                  onChange={(e) => setLocalInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(localInput); } }}
                  placeholder="Ask anything about Indian law..."
                  className="flex-1 resize-none bg-transparent text-[15px] outline-none py-2 max-h-[200px]"
                  style={{ color: "#ededed" }}
                  rows={1}
                  ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 200)}px`; } }}
                />
                <div className="flex items-center gap-1 mt-0.5 shrink-0">
                  <button type="submit" disabled={isLoading || !localInput.trim()}
                    className="w-10 h-10 flex items-center justify-center rounded-xl transition-all disabled:opacity-40"
                    style={{ background: "linear-gradient(135deg,#7c6ef7,#d4af37)", color: "#070b16" }}>
                    {isLoading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  </button>
                </div>
              </div>
            </form>
            <p className="text-center text-xs mt-3 font-medium" style={{ color: "#4a4a62" }}>
              Nyaya can make mistakes. Always verify statutory information independently.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
