"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut, Plus, MessageSquare, Send, Menu, X, Scale,
  Sparkles, Trash2, Copy, Check, ChevronDown, Bot, Search, Paperclip, Zap, Crosshair, Briefcase,
  ShieldCheck, Clock, AlertTriangle, Fingerprint, ArrowRight, LayoutDashboard
} from "lucide-react";
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
    if (!authLoading && !user) router.push("/login");
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
          color: "#a855f7",
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
      <div className="flex h-screen w-full items-center justify-center" style={{ background: "#07070d" }}>
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #7c6ef7, #a855f7)", boxShadow: "0 0 40px rgba(124,110,247,0.4)" }}>
              <Scale size={28} className="text-white" />
            </div>
            <div className="absolute inset-0 rounded-3xl animate-spin-slow"
              style={{ border: "1px solid transparent", borderTopColor: "rgba(124,110,247,0.6)", borderRadius: "24px" }} />
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
    <div className="flex h-screen w-full overflow-hidden bg-[#0a0a0a] text-[#ededed] font-sans">

      {/* Mobile overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 md:hidden bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ─── SIDEBAR ─── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 md:static w-[260px] flex flex-col transition-transform duration-300 ease-in-out bg-[#171717] ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center gap-1.5 px-3 h-[60px] shrink-0">
          <button
            onClick={() => { setActiveChat(null); setMessages([]); if(window.innerWidth < 768) setSidebarOpen(false); }}
            className={`flex items-center justify-center w-10 h-10 shrink-0 rounded-lg transition-colors ${!activeChat && messages.length === 0 ? 'bg-[#212121] text-[#ededed]' : 'text-[#a1a1aa] hover:bg-[#212121] hover:text-[#ededed]'}`}
            title="Dashboard Workspace"
          >
            <LayoutDashboard size={18} />
          </button>
          <button
            onClick={createNewChat}
            className="flex-1 flex items-center justify-between px-3 h-10 text-sm font-medium text-[#ededed] hover:bg-[#212121] transition-colors rounded-lg group"
          >
            <div className="flex items-center gap-2">
              <Scale size={16} className="text-[#a1a1aa]" />
              <span>New chat</span>
            </div>
            <Plus size={16} className="text-[#a1a1aa] group-hover:text-[#ededed]" />
          </button>
          <button className="md:hidden w-10 h-10 flex items-center justify-center shrink-0 rounded-lg text-[#a1a1aa] hover:bg-[#212121] hover:text-[#ededed] transition-colors"
            onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>



        {/* Conversations */}
        <div className="flex-1 overflow-y-auto px-3 py-2 mt-2">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <MessageSquare size={20} className="text-[#3f3f46] mb-3" />
              <p className="text-xs text-[#71717a]">No chats found.</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              <div className="text-[10px] font-semibold text-[#71717a] uppercase tracking-wider px-2 pb-2 mt-4 ml-1">Previous 7 Days</div>
              {conversations.map((conv) => {
                const isActive = activeChat === conv.id;
                return (
                  <motion.div key={conv.id} layout className="relative group">
                    <button
                      onClick={() => selectConversation(conv)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                        isActive ? "bg-[#212121]" : "hover:bg-[#212121]/50"
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-6">
                        <div className={`truncate text-sm ${isActive ? "text-[#ededed] font-medium" : "text-[#a1a1aa]"}`}>
                          {conv.title}
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={(e) => deleteConversation(e, conv.id)}
                      disabled={deletingId === conv.id}
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded-md text-[#71717a] hover:text-[#ededed] hover:bg-[#3f3f46]"
                      title="Delete conversation"
                    >
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
            className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 px-3 text-sm font-medium transition-all bg-[#0a0a0a] text-[#d4d4d8] border border-[#27272a] hover:bg-[#27272a] hover:text-white group"
          >
             <Sparkles size={14} className="text-[#a855f7] group-hover:text-[#c084fc] transition-colors" />
             {isUpgrading ? "Loading..." : "Upgrade to PRO"}
          </button>
        </div>

        {/* User Profile */}
        <div className="shrink-0 p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-[#212121] transition-colors cursor-pointer group" onClick={logout} title="Click to Sign out">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-medium text-xs text-black bg-[#ededed]">
              {user.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-medium text-[#ededed] group-hover:text-white transition-colors">{user.email.split('@')[0]}</div>
            </div>
            <LogOut size={15} className="text-[#71717a] group-hover:text-[#a1a1aa] opacity-0 group-hover:opacity-100 transition-all" />
          </div>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex flex-1 flex-col min-w-0 relative">

        {/* Top Bar */}
        <header className="flex items-center h-14 px-4 shrink-0 bg-[#0a0a0a]/90 backdrop-blur-md sticky top-0 z-30">
          <button className="md:hidden mr-3 p-2 rounded-lg transition-colors text-[#a1a1aa] hover:text-white"
            onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-2.5 min-w-0">
             <span className="text-[15px] font-medium text-[#ededed] truncate">
               {activeConv ? activeConv.title : "Nyaay Legal AI  v3.0"}
             </span>
          </div>
        </header>



        {/* Messages */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto" onScroll={handleScroll}>
          <div className="mx-auto max-w-3xl px-4 py-6 pb-44">
            {messages.length === 0 ? (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex flex-col pt-8 pb-20 w-full">
                
                <div className="flex flex-col items-center mb-12">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[#ededed] text-[#0a0a0a] mb-5 shadow-[0_0_30px_rgba(255,255,255,0.06)]">
                    <Scale size={28} />
                  </div>
                  <h2 className="text-3xl font-semibold text-[#ededed] mb-2 text-center tracking-tight">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user.email.split('@')[0]}</h2>
                  <p className="text-[#a1a1aa] text-[15px] text-center">Welcome to your Nyaay AI Workspace.</p>
                </div>

                <div className="space-y-10 w-full max-w-3xl mx-auto">
                  
                  {/* Action Required Logic */}
                  {(user.role === 'CITIZEN' || (user.role === 'LAWYER' && user.verificationStatus !== 'VERIFIED') || (user.role === 'JUDGE' && user.verificationStatus !== 'VERIFIED')) && (
                    <section>
                      <h3 className="text-xs font-semibold text-[#71717a] uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Action Required
                      </h3>
                      <div className="flex flex-col gap-3">
                        {user.role === 'CITIZEN' && (
                           <button onClick={() => router.push('/profile/citizen/aadhaar')} className="w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all group bg-[#111827] border border-[#1f2937] hover:bg-[#1f2937]/50 shadow-sm">
                             <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center"><Fingerprint size={20} className="text-indigo-400" /></div>
                               <div className="text-left">
                                 <p className="text-sm font-medium text-indigo-300">Complete Aadhaar eKYC</p>
                                 <p className="text-xs text-indigo-400/70 mt-0.5">Verify your identity to unlock core legal services.</p>
                               </div>
                             </div>
                             <ArrowRight size={18} className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                           </button>
                        )}
                        {user.role === 'LAWYER' && user.verificationStatus !== 'VERIFIED' && (
                           <button onClick={() => router.push('/profile/lawyer')} className="w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all group bg-[#1c1917] border border-[#292524] hover:bg-[#292524]/50 shadow-sm">
                             <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center"><ShieldCheck size={20} className="text-amber-400" /></div>
                               <div className="text-left">
                                 <p className="text-sm font-medium text-amber-300">Submit Bar Council Verification</p>
                                 <p className="text-xs text-amber-400/70 mt-0.5">Your lawyer profile is awaiting credential verification.</p>
                               </div>
                             </div>
                             <ArrowRight size={18} className="text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                           </button>
                        )}
                        {user.role === 'JUDGE' && user.verificationStatus !== 'VERIFIED' && (
                           <button onClick={() => router.push('/profile/judge')} className="w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all group bg-[#2e1065]/40 border border-[#4c1d95]/40 hover:bg-[#4c1d95]/30 shadow-sm">
                             <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center"><Clock size={20} className="text-purple-400" /></div>
                               <div className="text-left">
                                 <p className="text-sm font-medium text-purple-300">Account Pending Admin Approval</p>
                                 <p className="text-xs text-purple-400/70 mt-0.5">Check your account status and required steps.</p>
                               </div>
                             </div>
                             <ArrowRight size={18} className="text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                           </button>
                        )}
                      </div>
                    </section>
                  )}

                  <section>
                    <h3 className="text-xs font-semibold text-[#71717a] uppercase tracking-wider mb-3 px-1">Core Applications</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <button onClick={() => router.push('/search')} className="flex flex-col items-start gap-4 p-5 rounded-2xl bg-[#141414] border border-[#2a2a2a] hover:bg-[#1a1a1a] hover:border-[#3a3a3a] transition-all group">
                        <div className="w-10 h-10 rounded-xl bg-[#212121] flex items-center justify-center group-hover:bg-[#2a2a2a] transition-colors"><Search size={20} className="text-[#a1a1aa] group-hover:text-[#ededed]" /></div>
                        <span className="text-sm font-medium text-[#ededed]">Database</span>
                      </button>
                      <button onClick={() => router.push('/intelligence')} className="flex flex-col items-start gap-4 p-5 rounded-2xl bg-[#141414] border border-[#2a2a2a] hover:bg-[#1a1a1a] hover:border-[#3a3a3a] transition-all group">
                        <div className="w-10 h-10 rounded-xl bg-[#212121] flex items-center justify-center group-hover:bg-[#2a2a2a] transition-colors"><Crosshair size={20} className="text-[#a1a1aa] group-hover:text-[#ededed]" /></div>
                        <span className="text-sm font-medium text-[#ededed]">Strategy</span>
                      </button>
                      <button onClick={() => router.push('/marketplace')} className="flex flex-col items-start gap-4 p-5 rounded-2xl bg-[#141414] border border-[#2a2a2a] hover:bg-[#1a1a1a] hover:border-[#3a3a3a] transition-all group">
                        <div className="w-10 h-10 rounded-xl bg-[#212121] flex items-center justify-center group-hover:bg-[#2a2a2a] transition-colors"><Briefcase size={20} className="text-[#a1a1aa] group-hover:text-[#ededed]" /></div>
                        <span className="text-sm font-medium text-[#ededed]">Lawyers</span>
                      </button>
                      <button onClick={() => router.push('/notifications')} className="flex flex-col items-start gap-4 p-5 rounded-2xl bg-[#141414] border border-[#2a2a2a] hover:bg-[#1a1a1a] hover:border-[#3a3a3a] transition-all group">
                        <div className="w-10 h-10 rounded-xl bg-[#212121] flex items-center justify-center group-hover:bg-[#2a2a2a] transition-colors"><Zap size={20} className="text-[#a1a1aa] group-hover:text-[#ededed]" /></div>
                        <span className="text-sm font-medium text-[#ededed]">Alerts</span>
                      </button>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-xs font-semibold text-[#71717a] uppercase tracking-wider mb-3 px-1">Start a Conversation</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {SUGGESTED.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => handleSuggestedClick(s.text)}
                          className="flex items-center gap-3 p-4 rounded-2xl border border-[rgba(255,255,255,0.03)] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.05)] transition-all text-left"
                        >
                          <span className="text-lg shrink-0 opacity-80">{s.icon}</span>
                          <span className="text-sm font-medium text-[#d4d4d8] leading-tight">{s.text}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                </div>
              </motion.div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg, i) => (
                  <motion.div key={msg.id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-4`}>
                    {msg.role === "assistant" && (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[#ededed] text-black border border-[#2a2a2a] mt-1">
                        <Scale size={16} />
                      </div>
                    )}
                    <div className={`flex flex-col group ${msg.role === "user" ? "items-end max-w-[70%]" : "items-start max-w-[85%]"}`}>
                      <div className={`px-5 py-3.5 text-[15px] leading-relaxed ${
                          msg.role === "user" 
                            ? "bg-[#2f2f2f] text-[#ededed] rounded-3xl rounded-tr-sm" 
                            : "bg-transparent text-[#ededed] rounded-lg"
                        }`}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[11px] text-[#52525b]">{formatTime(msg.createdAt)}</span>
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
        <div className="absolute inset-x-0 bottom-0 pb-6 pt-12 pointer-events-none bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/90 to-transparent z-10 lg:pl-[260px]">
          <div className="mx-auto max-w-3xl px-4 pointer-events-auto">
            <div className="relative flex items-end gap-2 rounded-2xl p-2.5 bg-[#2f2f2f] text-[#ededed] shadow-sm ring-1 ring-white/10 focus-within:ring-white/25 transition-all">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingDoc}
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-[#a1a1aa] hover:text-[#ededed] hover:bg-[#3f3f46] transition-colors"
                title="Upload Document"
              >
                {uploadingDoc ? <div className="animate-spin w-4 h-4 border-2 border-t-transparent border-[#ededed] rounded-full" /> : <Paperclip size={20} />}
              </button>
              
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={activeChat ? "Message Nyaay..." : "Ask anything about Indian law..."}
                rows={1}
                className="flex-1 resize-none bg-transparent text-[15px] outline-none placeholder:text-[#a1a1aa] py-2.5 px-1"
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
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#ededed] text-[#0a0a0a] disabled:opacity-30 disabled:bg-[#3f3f46] disabled:text-[#a1a1aa] transition-colors"
              >
                <ArrowRight size={20} />
              </button>
            </div>
            <p className="mt-3 text-center text-xs text-[#71717a]">
              Nyaay can make mistakes. Always consult a qualified lawyer for serious matters.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
