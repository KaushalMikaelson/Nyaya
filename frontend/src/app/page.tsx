"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut, Plus, MessageSquare, Send, Menu, X, Scale,
  Sparkles, Trash2, Copy, Check, ChevronDown, Bot, Search, Paperclip, Zap, Crosshair, Briefcase,
  ShieldCheck, Clock, AlertTriangle, Fingerprint, ArrowRight, LayoutDashboard, FileStack, Bell, CreditCard, ShieldAlert,
  SearchIcon, UserCircle, Settings, Users
} from "lucide-react";
import WorkspaceDashboard from "@/components/WorkspaceDashboard";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  messages?: Message[];
}

const SUGGESTED = [
  { icon: "⚖️", text: "What are my rights if I'm arrested?" },
  { icon: "🏠", text: "How does property inheritance work in India?" },
  { icon: "💼", text: "Can my employer fire me without notice?" },
  { icon: "📋", text: "What is the process for filing an FIR?" },
];

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="opacity-0 group-hover:opacity-100 transition-all duration-200 p-1.5 rounded-lg"
      style={{ color: copied ? "#22c55e" : "#5a5a6e", background: "rgba(255,255,255,0.05)" }}
      title="Copy"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

export default function Home() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push("/landing");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) fetchConversations();

    // Check for prompt from Search Engine Phase 2
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const p = params.get('prompt');
      if (p) {
        window.history.replaceState({}, '', '/');
        setTimeout(() => handleSuggestedClick(p), 500);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loadingChat]);

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }, [input]);

  // Scroll-to-bottom button
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 200);
  }, []);

  const fetchConversations = async () => {
    try {
      const { data } = await api.get("/chat/conversations");
      setConversations(data);
      if (data.length > 0 && !activeChat) selectConversation(data[0]);
    } catch (err) {
      console.error(err);
    }
  };

  const createNewChat = async () => {
    try {
      const { data } = await api.post("/chat/conversations", { title: "New Chat" });
      setConversations([data, ...conversations]);
      setActiveChat(data.id);
      setMessages([]);
      if (window.innerWidth < 768) setSidebarOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const selectConversation = (conv: Conversation) => {
    setActiveChat(conv.id);
    setMessages(conv.messages || []);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const deleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    setDeletingId(convId);
    try {
      await api.delete(`/chat/conversations/${convId}`);
      const updated = conversations.filter(c => c.id !== convId);
      setConversations(updated);
      if (activeChat === convId) {
        if (updated.length > 0) {
          selectConversation(updated[0]);
        } else {
          setActiveChat(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const sendMessage = async (content?: string) => {
    const msg = content ?? input;
    if (!msg.trim() || !activeChat) return;
    setInput("");

    const tempId = Date.now().toString();
    setMessages((prev) => [...prev, { id: tempId, role: "user", content: msg, createdAt: new Date().toISOString() }]);
    setLoadingChat(true);

    try {
      const { data } = await api.post(`/chat/conversations/${activeChat}/messages`, { content: msg });
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? data.userMessage : m)).concat(data.assistantMessage)
      );
      if (messages.length === 0) fetchConversations();
    } catch (err) {
      console.error(err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setLoadingChat(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSuggestedClick = async (text: string) => {
    if (!activeChat) {
      try {
        const { data } = await api.post("/chat/conversations", { title: "New Chat" });
        setConversations(prev => [data, ...prev]);
        setActiveChat(data.id);
        setMessages([]);
        await new Promise(r => setTimeout(r, 50));
        const tempId = Date.now().toString();
        setMessages([{ id: tempId, role: "user", content: text, createdAt: new Date().toISOString() }]);
        setLoadingChat(true);
        const res = await api.post(`/chat/conversations/${data.id}/messages`, { content: text });
        setMessages(prev => prev.map(m => m.id === tempId ? res.data.userMessage : m).concat(res.data.assistantMessage));
        fetchConversations();
      } catch { /* noop */ } finally {
        setLoadingChat(false);
      }
    } else {
      sendMessage(text);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingDoc(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const { data } = await api.post("/documents/analyze", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      await fetchConversations();
      setActiveChat(data.conversationId);
      
      // Fetch specifically its messages securely if we rely on conversation swap
      const convsRefresh = await api.get("/chat/conversations");
      const matched = convsRefresh.data.find((c: Conversation) => c.id === data.conversationId);
      if (matched && matched.messages) {
        setMessages(matched.messages);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to analyze document. Please check the format and try again.");
    } finally {
      setUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRazorpayUpgrade = async () => {
    setIsUpgrading(true);
    try {
      // 1. Load Razorpay Script
      const res = await new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });

      if (!res) {
        alert("Razorpay SDK failed to load. Are you online?");
        setIsUpgrading(false);
        return;
      }

      // 2. Obtain Order ID
      const orderOptions = await api.post("/payment/orders");
      
      const options = {
        key: "rzp_test_mockedapi", // Using mock dummy or env dynamically mapped usually
        amount: orderOptions.data.amount,
        currency: orderOptions.data.currency,
        name: "Nyaay AI",
        description: "Nyaay PRO Unlimited AI",
        order_id: orderOptions.data.id.startsWith("order_mock") ? "" : orderOptions.data.id, 
        handler: async function (response: { razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string }) {
          try {
            const verification = await api.post("/payment/verify", {
              razorpay_order_id: response.razorpay_order_id || orderOptions.data.id,
              razorpay_payment_id: response.razorpay_payment_id || "pay_mocked123",
              razorpay_signature: response.razorpay_signature || "signature_mock"
            });
            if (verification.data.success) {
              alert("Successfully upgraded to PRO!");
              // Ideally refresh auth context, but reload works for quick cache sweep
              window.location.reload(); 
            }
          } catch {
            alert("Verification Failed");
          }
        },
        prefill: {
          email: user?.email,
          contact: "9999999999",
        },
        theme: {
          color: "#d4af37",
        },
      };

      // Mock checkout if keys absent
      if (!options.order_id) {
        options.handler({ razorpay_order_id: "order_mock", razorpay_payment_id: "pay_mock", razorpay_signature: "sig_mock" });
      } else {
        const paymentObject = new (window as unknown as { Razorpay: new (opts: object) => { open: () => void } }).Razorpay(options);
        paymentObject.open();
      }

    } catch (err) {
      console.error(err);
      alert("Failed to initiate payment. Please try again.");
    } finally {
      setIsUpgrading(false);
    }
  };

  const activeConv = conversations.find(c => c.id === activeChat);

  if (authLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#f8f9fa]">
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center shadow-md bg-white border border-slate-200">
              <Scale size={28} className="text-[#0f172a]" />
            </div>
            <div className="absolute inset-0 rounded-3xl animate-spin-slow border border-transparent border-t-[#0f172a]/60" />
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full shimmer"
                style={{ background: "rgba(124,110,247,0.5)", animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f8f9fa] text-[#1e293b] font-sans selection:bg-[#0f172a] selection:text-white">

      {/* Drawer Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ─── DRAWER SIDEBAR ─── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] flex flex-col transition-transform duration-300 ease-in-out bg-[#0f172a] border-r border-slate-800 shadow-[20px_0_50px_rgba(0,0,0,0.2)] ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center gap-1.5 px-3 h-[60px] shrink-0">
          <button
            onClick={() => { setActiveChat(null); setMessages([]); if(window.innerWidth < 768) setSidebarOpen(false); }}
            className={`flex items-center justify-center w-10 h-10 shrink-0 rounded-lg transition-colors ${!activeChat && messages.length === 0 ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            title="Dashboard Workspace"
          >
            <LayoutDashboard size={18} />
          </button>
          <button
            onClick={() => router.push('/chat')}
            className="flex-1 flex items-center justify-between px-3 h-10 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors rounded-lg group"
          >
            <div className="flex items-center gap-2">
              <Scale size={16} className="text-slate-400 group-hover:text-white" />
              <span>New chat</span>
            </div>
            <Plus size={16} className="text-slate-400 group-hover:text-white" />
          </button>
          <button className="md:hidden w-10 h-10 flex items-center justify-center shrink-0 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>



        {/* Main Navigation */}
        <div className="flex flex-col gap-1 px-3 py-4 border-b border-slate-800 mb-2 overflow-y-auto custom-scrollbar">
          <button onClick={() => { setActiveChat(null); setMessages([]); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-colors ${!activeChat && messages.length === 0 ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button onClick={() => router.push('/chat')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeChat ? 'bg-slate-800 text-[#d4af37]' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <Zap size={18} /> AI Assistant
          </button>
          <button onClick={() => router.push('/search')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
            <Search size={18} /> Legal Search
          </button>
          <button onClick={() => router.push('/documents')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
            <FileStack size={18} /> Documents
          </button>
          <button onClick={() => router.push('/cases')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
            <Briefcase size={18} /> Case Management
          </button>
          <button onClick={() => router.push('/marketplace')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
            <Users size={18} /> Lawyer Marketplace
          </button>
          <button onClick={() => router.push('/notifications')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
            <div className="flex items-center gap-3"><Bell size={18} /> Notifications</div>
            <div className="w-5 h-5 rounded bg-[#d4af37]/20 text-[#d4af37] text-[10px] flex items-center justify-center font-bold">3</div>
          </button>
          <button onClick={handleRazorpayUpgrade} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
            <CreditCard size={18} /> Billing
          </button>

          {user.role === 'ADMIN' && (
            <button onClick={() => router.push('/admin')} className="w-full flex items-center gap-3 px-3 py-2.5 mt-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-950 transition-colors">
              <ShieldAlert size={18} /> Admin Console
            </button>
          )}
        </div>

        {/* Conversations History */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center px-4 opacity-50">
              <MessageSquare size={16} className="text-[#2d3759] mb-2" />
              <p className="text-[10px] text-[#71717a] uppercase tracking-wider">No Chat History</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 pb-2 ml-1">Recent AI Chats</div>
              {conversations.map((conv) => {
                const isActive = activeChat === conv.id;
                return (
                  <motion.div key={conv.id} layout className="relative group">
                    <button onClick={() => selectConversation(conv)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${isActive ? "bg-slate-800" : "hover:bg-slate-800/50"}`}>
                      <div className="flex-1 min-w-0 pr-6">
                        <div className={`truncate text-[13px] ${isActive ? "text-white font-medium" : "text-slate-400"}`}>{conv.title}</div>
                      </div>
                    </button>
                    <button onClick={(e) => deleteConversation(e, conv.id)} disabled={deletingId === conv.id} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded-md text-slate-500 hover:text-white hover:bg-slate-700" title="Delete chat">
                      <Trash2 size={13} />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Monetization Upgrade Banner */}
        <div className="px-3 pb-3">
          <button 
            onClick={handleRazorpayUpgrade}
            disabled={isUpgrading}
            className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 px-3 text-sm font-medium transition-all bg-[#070b16] text-[#d4d4d8] border border-[#1e2642] hover:bg-[#1e2642] hover:text-white group"
          >
             <Sparkles size={14} className="text-[#d4af37] group-hover:text-[#f2d680] transition-colors" />
             {isUpgrading ? "Loading..." : "Upgrade to PRO"}
          </button>
        </div>

        {/* User Profile */}
        <div className="shrink-0 p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-slate-800 transition-colors cursor-pointer group border border-slate-800" onClick={logout} title="Click to Sign out">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs text-[#0f172a] bg-white">
              {user.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{user.email.split('@')[0]}</div>
            </div>
            <LogOut size={15} className="text-slate-500 group-hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
          </div>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex flex-1 flex-col min-w-0 relative">

        {/* Top Navbar */}
        <header className="flex items-center justify-between h-14 px-4 md:px-6 shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200">
          <div className="flex items-center gap-4 flex-1">
            <button className="p-2 -ml-2 rounded-lg transition-colors text-slate-500 hover:text-[#0f172a] hover:bg-slate-100"
              onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 focus-within:border-slate-300 transition-all rounded-[4px] max-w-sm w-full group shadow-sm">
               <SearchIcon size={14} className="text-slate-400 group-hover:text-[#0f172a]" />
               <input type="text" placeholder="Global search cases, documents, lawyers..." className="bg-transparent border-none outline-none text-sm text-[#0f172a] w-full placeholder:text-slate-400 font-medium" />
               <div className="px-1.5 py-0.5 rounded border border-slate-200 text-[10px] text-slate-500 bg-white font-mono shadow-sm">⌘K</div>
            </div>
            {activeChat && (
              <span className="text-[14px] font-bold text-[#0f172a] truncate block md:hidden ml-1">
                AI Assistant
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
             <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#0f172a] text-white border border-[#0f172a] rounded-full text-xs font-bold tracking-wider uppercase">
               <ShieldCheck size={12} className="text-[#d4af37]" /> {user.role}
             </div>
             <button className="p-2 rounded-full text-slate-400 hover:text-[#0f172a] hover:bg-slate-100 transition-colors relative">
               <Bell size={18} />
               <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border border-white" />
             </button>
             <div className="w-px h-5 bg-slate-200 mx-1" />
             <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
               <div className="w-7 h-7 rounded-full bg-[#0f172a] flex items-center justify-center text-white text-xs font-bold">
                 {user.email[0].toUpperCase()}
               </div>
               <ChevronDown size={14} className="text-slate-400" />
             </button>
          </div>
        </header>



        {/* Main Content Area */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto" onScroll={handleScroll}>
          {messages.length === 0 && !activeChat ? (
             <WorkspaceDashboard user={user} router={router} triggerChat={() => router.push('/chat')} triggerPro={handleRazorpayUpgrade} />
          ) : (
             <div className="mx-auto max-w-3xl px-4 py-6 pb-44">
               {messages.length === 0 && activeChat ? (
                 <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex flex-col pt-12 pb-20 w-full items-center justify-center min-h-[40vh]">
                   <div className="w-16 h-16 rounded-3xl flex items-center justify-center bg-gradient-to-br from-[#111827] to-[#070b16] border border-[#1e2642] mb-6 shadow-[0_0_30px_rgba(168,85,247,0.1)]">
                     <Zap size={28} className="text-amber-300" />
                   </div>
                   <h2 className="text-2xl font-semibold text-[#ededed] mb-2 tracking-tight">Nyaay AI Assistant</h2>
                   <p className="text-[#a1a1aa] text-sm mb-10">How can I help with your legal research today?</p>
   
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl px-4">
                     {SUGGESTED.map((s, i) => (
                       <button key={i} onClick={() => handleSuggestedClick(s.text)} className="flex items-center gap-3 p-4 rounded-xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.08)] transition-all text-left">
                         <span className="text-lg shrink-0 opacity-80">{s.icon}</span>
                         <span className="text-sm font-medium text-[#d4d4d8] leading-tight">{s.text}</span>
                       </button>
                     ))}
                   </div>
                 </motion.div>
               ) : (
                 <div className="space-y-6">
                   {messages.map((msg, i) => (
                     <motion.div key={msg.id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-4`}>
                       {msg.role === "assistant" && (
                         <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-white border border-slate-200 text-[#0f172a] mt-1 shadow-sm">
                           <Scale size={16} />
                         </div>
                       )}
                       <div className={`flex flex-col group ${msg.role === "user" ? "items-end max-w-[70%]" : "items-start max-w-[85%]"}`}>
                         <div className={`px-5 py-3.5 text-[15px] font-medium tracking-wide leading-relaxed shadow-sm ${
                             msg.role === "user" 
                               ? "bg-[#0f172a] text-white rounded-3xl rounded-tr-sm" 
                               : "bg-white border border-slate-200 text-slate-800 rounded-lg"
                           }`}>
                           <p className="whitespace-pre-wrap">{msg.content}</p>
                         </div>
                         <div className="flex items-center gap-2 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <span className="text-[11px] font-bold text-slate-400">{formatTime(msg.createdAt)}</span>
                           {msg.role === "assistant" && <CopyButton text={msg.content} />}
                         </div>
                       </div>
                     </motion.div>
                   ))}
   
                   {/* Typing indicator */}
                   {loadingChat && (
                     <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start gap-4">
                       <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[#ededed] text-black mt-1">
                         <Scale size={16} />
                       </div>
                       <div className="px-5 py-4">
                         <div className="flex gap-1.5 items-center">
                           <div className="w-1.5 h-1.5 rounded-full bg-[#52525b] animate-bounce" />
                           <div className="w-1.5 h-1.5 rounded-full bg-[#52525b] animate-bounce" style={{ animationDelay: "0.15s" }} />
                           <div className="w-1.5 h-1.5 rounded-full bg-[#52525b] animate-bounce" style={{ animationDelay: "0.3s" }} />
                         </div>
                       </div>
                     </motion.div>
                   )}
                 </div>
               )}
               <div ref={messagesEndRef} />
             </div>
          )}
        </div>

        {/* Scroll to bottom button */}
        <AnimatePresence>
          {showScrollBtn && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="absolute bottom-28 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
              style={{ background: "rgba(124,110,247,0.15)", border: "1px solid rgba(124,110,247,0.3)", color: "#9d8fff", backdropFilter: "blur(12px)" }}
            >
              <ChevronDown size={14} />
              Scroll to bottom
            </motion.button>
          )}
        </AnimatePresence>

        {/* ─── INPUT BAR ─── */}
        <div className="absolute inset-x-0 bottom-0 pb-6 pt-12 pointer-events-none bg-gradient-to-t from-[#f8f9fa] via-[#f8f9fa]/90 to-transparent z-10">
          <div className="mx-auto max-w-3xl px-4 pointer-events-auto">
            <div className="relative flex items-end gap-2 p-2.5 bg-white border border-slate-200 text-slate-800 shadow-xl focus-within:border-slate-300 focus-within:shadow-2xl transition-all rounded-xl">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingDoc}
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                title="Upload Document"
              >
                {uploadingDoc ? <div className="animate-spin w-4 h-4 border-2 border-t-transparent border-slate-400 rounded-full" /> : <Paperclip size={20} />}
              </button>
              
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={activeChat ? "Message Nyaay..." : "Ask anything about Indian law..."}
                rows={1}
                className="flex-1 resize-none bg-transparent text-[15px] font-medium outline-none placeholder:text-slate-400 py-2.5 px-1"
                style={{ maxHeight: "200px", lineHeight: "1.5" }}
              />

              <button
                onClick={() => {
                  if (!activeChat && input.trim()) {
                    createNewChat().then(() => sendMessage());
                  } else {
                    sendMessage();
                  }
                }}
                disabled={!input.trim() || loadingChat}
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#0f172a] text-white disabled:opacity-50 disabled:bg-slate-300 disabled:text-slate-500 transition-colors shadow-sm"
              >
                <ArrowRight size={20} />
              </button>
            </div>
            <p className="mt-3 text-center text-xs font-semibold text-slate-400">
              Nyaay can make mistakes. Always consult a qualified lawyer for serious matters.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
