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
      <div className="flex h-screen w-full items-center justify-center" style={{ background: "#070b16" }}>
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div
              className="w-16 h-16 rounded-3xl flex items-center justify-center shadow-xl"
              style={{ background: "linear-gradient(135deg, #7c6ef7, #d4af37)", boxShadow: "0 0 40px rgba(124,110,247,0.4)" }}
            >
              <Scale size={28} className="text-white" />
            </div>
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                style={{ background: "rgba(212,175,55,0.6)", animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden font-sans" style={{ background: "#070b16", color: "#ededed" }}>

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
        className={`fixed inset-y-0 left-0 z-50 w-[260px] flex flex-col transition-transform duration-300 ease-in-out shadow-[20px_0_60px_rgba(0,0,0,0.5)] ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: "#0a0f1d", borderRight: "1px solid rgba(30,38,66,0.8)" }}
      >
        {/* Sidebar Header */}
        <div className="flex items-center gap-2 px-4 h-[64px] shrink-0" style={{ borderBottom: "1px solid rgba(30,38,66,0.8)" }}>
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #7c6ef7, #d4af37)", boxShadow: "0 0 15px rgba(124,110,247,0.35)" }}
          >
            <Scale size={15} className="text-white" />
          </div>
          <span className="text-sm font-bold tracking-widest uppercase flex-1" style={{ color: "#f2d680" }}>Nyaya AI</span>
          <button
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: "#4a4a62" }}
            onClick={() => setSidebarOpen(false)}
            onMouseEnter={e => (e.currentTarget.style.color = "#a1a1aa")}
            onMouseLeave={e => (e.currentTarget.style.color = "#4a4a62")}
          >
            <X size={16} />
          </button>
        </div>



        {/* Main Navigation */}
        <div className="flex flex-col gap-0.5 px-3 py-5 overflow-y-auto custom-scrollbar flex-1">
          {[
            { label: "Dashboard",        icon: <LayoutDashboard size={17} />, action: () => { setActiveChat(null); setMessages([]); }, active: !activeChat && messages.length === 0 },
            { label: "Ask Nyaya",         icon: <Zap size={17} />,             action: () => router.push('/ask-nyaya'),     active: !!activeChat },
            { label: "Documents",         icon: <FileStack size={17} />,       action: () => router.push('/documents'),    active: false },
            { label: "Case Management",   icon: <Briefcase size={17} />,       action: () => router.push('/cases'),        active: false },
            { label: "Marketplace",       icon: <Users size={17} />,           action: () => router.push('/marketplace'),  active: false },
            { label: "Notifications",     icon: <Bell size={17} />,            action: () => router.push('/notifications'),active: false, badge: "3" },
            { label: "Billing",           icon: <CreditCard size={17} />,      action: handleRazorpayUpgrade,              active: false },
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={item.active
                ? { background: "rgba(212,175,55,0.1)", color: "#d4af37", border: "1px solid rgba(212,175,55,0.15)" }
                : { color: "#4a4a62", border: "1px solid transparent" }}
              onMouseEnter={e => { if (!item.active) { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#a1a1aa"; } }}
              onMouseLeave={e => { if (!item.active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#4a4a62"; } }}
            >
              <div className="flex items-center gap-3">{item.icon}{item.label}</div>
              {item.badge && (
                <span className="w-5 h-5 rounded-lg text-[10px] font-bold flex items-center justify-center" style={{ background: "rgba(212,175,55,0.15)", color: "#d4af37" }}>{item.badge}</span>
              )}
            </button>
          ))}
          {user.role === 'ADMIN' && (
            <button onClick={() => router.push('/admin')} className="w-full flex items-center gap-3 px-3 py-2.5 mt-2 rounded-xl text-sm font-medium transition-colors" style={{ color: "#f43f5e" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(244,63,94,0.08)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <ShieldAlert size={17} /> Admin Console
            </button>
          )}
        </div>

        {/* Upgrade CTA */}
        <div className="px-3 pb-3 pt-2" style={{ borderTop: "1px solid rgba(30,38,66,0.8)" }}>
          <motion.button
            whileHover={{ boxShadow: "0 0 25px rgba(212,175,55,0.3)" }}
            onClick={handleRazorpayUpgrade}
            disabled={isUpgrading}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-sm font-bold transition-all"
            style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.04))", color: "#d4af37", border: "1px solid rgba(212,175,55,0.25)" }}
          >
            <Sparkles size={14} />
            {isUpgrading ? "Loading..." : "Upgrade to PRO"}
          </motion.button>
        </div>

        {/* User Profile */}
        <div className="shrink-0 px-3 pb-4">
          <div
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer group transition-all"
            style={{ border: "1px solid rgba(30,38,66,0.8)" }}
            onClick={logout}
            title="Click to Sign out"
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs"
              style={{ background: "linear-gradient(135deg, #7c6ef7, #d4af37)", color: "#070b16" }}
            >
              {user.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-medium text-white">{user.email.split('@')[0]}</div>
              <div className="text-[10px]" style={{ color: "#4a4a62" }}>Sign out</div>
            </div>
            <LogOut size={14} style={{ color: "#4a4a62" }} className="opacity-0 group-hover:opacity-100 transition-all" />
          </div>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex flex-1 flex-col min-w-0 relative">

        {/* Top Navbar */}
        <header
          className="flex items-center justify-between h-14 px-4 md:px-6 shrink-0 sticky top-0 z-30"
          style={{
            background: "rgba(7,11,22,0.85)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(30,38,66,0.8)",
          }}
        >
          <div className="flex items-center gap-4 flex-1">
            <button
              className="p-2 -ml-2 rounded-lg transition-colors"
              style={{ color: "#4a4a62" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#a1a1aa")}
              onMouseLeave={e => (e.currentTarget.style.color = "#4a4a62")}
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            {activeChat && (
              <span className="text-sm font-bold text-white truncate block md:hidden ml-1">AI Assistant</span>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase"
              style={{ background: "rgba(212,175,55,0.1)", color: "#d4af37", border: "1px solid rgba(212,175,55,0.2)" }}
            >
              <ShieldCheck size={11} /> {user.role}
            </div>
            <div className="w-px h-5 mx-1" style={{ background: "rgba(255,255,255,0.06)" }} />
            <button className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: "linear-gradient(135deg,#7c6ef7,#d4af37)", color: "#070b16" }}
              >
                {user.email[0].toUpperCase()}
              </div>
            </button>
          </div>
        </header>



        {/* Main Content Area */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto" onScroll={handleScroll}>
          {messages.length === 0 && !activeChat ? (
             <WorkspaceDashboard user={user} router={router} triggerChat={() => router.push('/ask-nyaya')} triggerPro={handleRazorpayUpgrade} />
          ) : (
             <div className="mx-auto max-w-3xl px-4 py-6 pb-44">
               {messages.length === 0 && activeChat ? (
                 <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex flex-col pt-12 pb-20 w-full items-center justify-center min-h-[40vh]">
                   <div
                     className="w-16 h-16 rounded-3xl flex items-center justify-center mb-6 shadow-xl"
                     style={{ background: "linear-gradient(135deg, #7c6ef7, #d4af37)", boxShadow: "0 0 40px rgba(124,110,247,0.3)" }}
                   >
                     <Zap size={28} className="text-white" />
                   </div>
                   <h2 className="text-2xl font-semibold text-white mb-2 tracking-tight">Nyaya AI Assistant</h2>
                   <p className="text-sm mb-10" style={{ color: "#6a6a82" }}>How can I help with your legal research today?</p>

                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl px-4">
                     {SUGGESTED.map((s, i) => (
                       <button
                         key={i}
                         onClick={() => handleSuggestedClick(s.text)}
                         className="flex items-center gap-3 p-4 rounded-2xl text-left transition-all"
                         style={{ background: "rgba(13,18,36,0.8)", border: "1px solid rgba(30,38,66,1)" }}
                         onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(212,175,55,0.3)"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(13,18,36,1)"; }}
                         onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(30,38,66,1)"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(13,18,36,0.8)"; }}
                       >
                         <span className="text-lg shrink-0 opacity-80">{s.icon}</span>
                         <span className="text-sm font-medium" style={{ color: "#a1a1aa" }}>{s.text}</span>
                       </button>
                     ))}
                   </div>
                 </motion.div>
               ) : (
                 <div className="space-y-6">
                    {messages.map((msg, i) => (
                      <motion.div key={msg.id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-4`}>
                        {msg.role === "assistant" && (
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1"
                            style={{ background: "linear-gradient(135deg,#7c6ef7,#d4af37)", color: "#070b16" }}
                          >
                            <Scale size={15} />
                          </div>
                        )}
                        <div className={`flex flex-col group ${msg.role === "user" ? "items-end max-w-[70%]" : "items-start max-w-[85%]"}`}>
                          <div
                            className={`px-5 py-3.5 text-[15px] font-medium leading-relaxed ${
                              msg.role === "user"
                                ? "rounded-3xl rounded-tr-sm text-white"
                                : "rounded-lg"
                            }`}
                            style={msg.role === "user"
                              ? { background: "linear-gradient(135deg, #7c6ef7, #5b52cc)" }
                              : { background: "rgba(13,18,36,0.8)", border: "1px solid rgba(30,38,66,1)", color: "#c1c1cc" }
                            }
                          >
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[11px] font-bold" style={{ color: "#4a4a62" }}>{formatTime(msg.createdAt)}</span>
                            {msg.role === "assistant" && <CopyButton text={msg.content} />}
                          </div>
                        </div>
                      </motion.div>
                    ))}

                   {/* Typing indicator */}
                   {loadingChat && (
                     <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start gap-4">
                       <div
                         className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1"
                         style={{ background: "linear-gradient(135deg,#7c6ef7,#d4af37)", color: "#070b16" }}
                       >
                         <Scale size={15} />
                       </div>
                       <div className="px-5 py-4">
                         <div className="flex gap-1.5 items-center">
                           <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#d4af37" }} />
                           <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#d4af37", animationDelay: "0.15s" }} />
                           <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#d4af37", animationDelay: "0.3s" }} />
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
        {activeChat && (
        <div
          className="absolute inset-x-0 bottom-0 pb-6 pt-14 pointer-events-none z-10"
          style={{ background: "linear-gradient(to top, #070b16 60%, transparent)" }}
        >
          <div className="mx-auto max-w-3xl px-4 pointer-events-auto">
            <div
              className="relative flex items-end gap-2 p-2.5 transition-all rounded-2xl"
              style={{
                background: "rgba(13,18,36,0.9)",
                border: "1px solid rgba(30,38,66,1)",
                backdropFilter: "blur(12px)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              }}
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingDoc}
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                style={{ color: "#4a4a62" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#a1a1aa")}
                onMouseLeave={e => (e.currentTarget.style.color = "#4a4a62")}
                title="Upload Document"
              >
                {uploadingDoc
                  ? <div className="animate-spin w-4 h-4 border-2 border-t-[#d4af37] border-transparent rounded-full" />
                  : <Paperclip size={20} />}
              </button>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message Nyaya..."
                rows={1}
                className="flex-1 resize-none bg-transparent text-[15px] font-medium outline-none py-2.5 px-1"
                style={{ maxHeight: "200px", lineHeight: "1.5", color: "#ededed" }}
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
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors disabled:opacity-40"
                style={{ background: "linear-gradient(135deg,#7c6ef7,#d4af37)", color: "#070b16" }}
              >
                <ArrowRight size={20} />
              </button>
            </div>
            <p className="mt-3 text-center text-xs font-semibold" style={{ color: "#4a4a62" }}>
              Nyaya can make mistakes. Always consult a qualified lawyer for serious matters.
            </p>
          </div>
        </div>
        )}
      </main>
    </div>
  );
}
