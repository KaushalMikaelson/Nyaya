"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut, Plus, MessageSquare, Send, Menu, X, Scale,
  Sparkles, Trash2, Copy, Check, ChevronDown, Bot, Search, Paperclip, Zap, Crosshair, Briefcase
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
    <div className="flex h-screen w-full overflow-hidden" style={{ background: "#07070d" }}>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 md:hidden"
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ─── SIDEBAR ─── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 md:static w-72 flex flex-col transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
        style={{ background: "#0b0b14", borderRight: "1px solid rgba(255,255,255,0.05)" }}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-4 h-16 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 relative"
              style={{ background: "linear-gradient(135deg, #7c6ef7, #a855f7)", boxShadow: "0 0 20px rgba(124,110,247,0.45)" }}>
              <Scale size={15} className="text-white" />
            </div>
            <span className="text-base font-bold tracking-tight text-white">Nyaay</span>
            <span className="text-xs px-1.5 py-0.5 rounded-md font-semibold"
              style={{ background: "rgba(124,110,247,0.15)", color: "#9d8fff", border: "1px solid rgba(124,110,247,0.25)", fontSize: "0.65rem", letterSpacing: "0.05em" }}>
              AI
            </span>
          </div>
          <button className="md:hidden p-1.5 rounded-lg transition-colors" style={{ color: "#4a4a60" }}
            onMouseOver={e => (e.currentTarget.style.color = "#fff")}
            onMouseOut={e => (e.currentTarget.style.color = "#4a4a60")}
            onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="px-3 pt-4 pb-2 shrink-0 space-y-2">
          <button
            onClick={createNewChat}
            className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200"
            style={{ background: "linear-gradient(135deg, #7c6ef7, #a855f7)", boxShadow: "0 0 24px rgba(124,110,247,0.25)" }}
            onMouseOver={e => (e.currentTarget.style.boxShadow = "0 0 32px rgba(124,110,247,0.45)")}
            onMouseOut={e => (e.currentTarget.style.boxShadow = "0 0 24px rgba(124,110,247,0.25)")}
          >
            <Plus size={16} />
            New conversation
          </button>
          
          <button
            onClick={() => router.push('/search')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-200"
            style={{ background: "rgba(255,255,255,0.03)", color: "#a855f7", border: "1px solid rgba(124,110,247,0.2)" }}
            onMouseOver={e => { e.currentTarget.style.background = "rgba(124,110,247,0.1)"; }}
            onMouseOut={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
          >
            <Search size={16} />
            Search Database
          </button>

          <button
            onClick={() => router.push('/intelligence')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-200"
            style={{ background: "transparent", color: "#a0a0bd", border: "1px solid rgba(255,255,255,0.05)" }}
            onMouseOver={e => { e.currentTarget.style.background = "rgba(124,110,247,0.08)"; e.currentTarget.style.color = "#9d8fff"; e.currentTarget.style.borderColor = "rgba(124,110,247,0.2)"; }}
            onMouseOut={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#a0a0bd"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; }}
          >
            <Crosshair size={16} />
            Case Strategy
          </button>

          <button
            onClick={() => router.push('/notifications')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-200"
            style={{ background: "transparent", color: "#a0a0bd", border: "1px solid rgba(255,255,255,0.05)" }}
            onMouseOver={e => { e.currentTarget.style.background = "rgba(124,110,247,0.08)"; e.currentTarget.style.color = "#9d8fff"; e.currentTarget.style.borderColor = "rgba(124,110,247,0.2)"; }}
            onMouseOut={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#a0a0bd"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; }}
          >
            <Zap size={16} />
            Alerts
          </button>

          <button
            onClick={() => router.push('/marketplace')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-200"
            style={{ background: "transparent", color: "#a0a0bd", border: "1px solid rgba(255,255,255,0.05)" }}
            onMouseOver={e => { e.currentTarget.style.background = "rgba(245,158,11,0.08)"; e.currentTarget.style.color = "#f59e0b"; e.currentTarget.style.borderColor = "rgba(245,158,11,0.2)"; }}
            onMouseOut={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#a0a0bd"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; }}
          >
            <Briefcase size={16} />
            Find Lawyer
          </button>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <MessageSquare size={20} style={{ color: "#3a3a4e" }} />
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "#4a4a60" }}>
                No conversations yet.<br />Start chatting above.
              </p>
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = activeChat === conv.id;
              return (
                <motion.div
                  key={conv.id}
                  layout
                  className="relative group"
                >
                  <button
                    onClick={() => selectConversation(conv)}
                    className="sidebar-item flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left"
                    style={{
                      background: isActive ? "rgba(124,110,247,0.1)" : "transparent",
                      border: isActive ? "1px solid rgba(124,110,247,0.2)" : "1px solid transparent",
                    }}
                    onMouseOver={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                    onMouseOut={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: isActive ? "rgba(124,110,247,0.2)" : "rgba(255,255,255,0.04)" }}>
                      <MessageSquare size={13} style={{ color: isActive ? "#9d8fff" : "#4a4a60" }} />
                    </div>
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="truncate text-sm font-medium"
                        style={{ color: isActive ? "#e8e8f8" : "#7a7a90" }}>
                        {conv.title}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "#3a3a50" }}>
                        {formatDate(conv.updatedAt)}
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={(e) => deleteConversation(e, conv.id)}
                    disabled={deletingId === conv.id}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 p-1.5 rounded-lg"
                    style={{ color: "#4a4a60", background: "rgba(239,68,68,0.0)" }}
                    onMouseOver={e => {
                      e.currentTarget.style.color = "#ef4444";
                      e.currentTarget.style.background = "rgba(239,68,68,0.1)";
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.color = "#4a4a60";
                      e.currentTarget.style.background = "transparent";
                    }}
                    title="Delete conversation"
                  >
                    <Trash2 size={13} />
                  </button>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Monetization Upgrade Banner */}
        <div className="px-3 pb-2 pt-1 mx-2 mb-2 rounded-2xl relative overflow-hidden group" style={{ background: "rgba(124,110,247,0.08)", border: "1px solid rgba(124,110,247,0.2)"}}>
          <div className="absolute top-0 right-0 p-2 opacity-20"><Zap size={40} color="#a855f7" /></div>
          <h4 className="text-sm font-bold text-white mb-1 tracking-tight flex items-center gap-1.5"><Zap size={14} color="#a855f7" fill="#a855f7"/> Nyaay PRO</h4>
          <p className="text-xs mb-3" style={{ color: "#a0a0bd" }}>Unlock unlimited queries and document analyses.</p>
          <button 
            onClick={handleRazorpayUpgrade}
            disabled={isUpgrading}
            className="w-full py-2 rounded-xl text-xs font-bold text-white transition-all hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg, #7c6ef7, #a855f7)", boxShadow: "0 0 15px rgba(124,110,247,0.3)"}}
          >
             {isUpgrading ? "Loading..." : "Upgrade to PRO"}
          </button>
        </div>

        {/* User Profile */}
        <div className="shrink-0 p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center gap-3 rounded-2xl px-3 py-2.5"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm text-white"
              style={{ background: "linear-gradient(135deg, #7c6ef7, #a855f7)" }}>
              {user.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate text-xs font-medium" style={{ color: "#9090a8" }}>{user.email}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#22c55e" }} />
                <span className="text-xs" style={{ color: "#4a4a60" }}>Active</span>
              </div>
            </div>
            <button
              onClick={logout}
              className="transition-all duration-200 p-1.5 rounded-lg"
              style={{ color: "#4a4a60" }}
              onMouseOver={e => {
                e.currentTarget.style.color = "#ef4444";
                e.currentTarget.style.background = "rgba(239,68,68,0.1)";
              }}
              onMouseOut={e => {
                e.currentTarget.style.color = "#4a4a60";
                e.currentTarget.style.background = "transparent";
              }}
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex flex-1 flex-col min-w-0 relative">

        {/* Top Bar */}
        <header className="flex items-center h-14 px-4 md:px-5 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(7,7,13,0.9)", backdropFilter: "blur(16px)" }}>
          <button className="md:hidden mr-3 p-1.5 rounded-lg transition-colors" style={{ color: "#4a4a60" }}
            onMouseOver={e => (e.currentTarget.style.color = "#fff")}
            onMouseOut={e => (e.currentTarget.style.color = "#4a4a60")}
            onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-2.5 min-w-0">
            {activeConv ? (
              <>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(124,110,247,0.15)" }}>
                  <MessageSquare size={13} style={{ color: "#9d8fff" }} />
                </div>
                <span className="text-sm font-medium truncate" style={{ color: "#c8c8e0" }}>{activeConv.title}</span>
              </>
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(124,110,247,0.15)" }}>
                  <Scale size={13} style={{ color: "#9d8fff" }} />
                </div>
                <span className="text-sm font-semibold" style={{ color: "#c8c8e0" }}>Nyaay Legal AI</span>
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs px-3 py-1.5 rounded-full font-medium"
              style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.18)", color: "#4ade80" }}>
              <span className="ping-dot w-2 h-2 rounded-full" style={{ background: "#22c55e" }} />
              AI Online
            </div>
          </div>
        </header>

        {/* Messages */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto"
          onScroll={handleScroll}
        >
          <div className="mx-auto max-w-2xl px-4 py-6 pb-44">

            {messages.length === 0 ? (
              /* Empty state */
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center justify-center pt-12 text-center"
              >
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="relative mb-8"
                >
                  <div className="w-24 h-24 rounded-[28px] flex items-center justify-center relative"
                    style={{
                      background: "linear-gradient(135deg, rgba(124,110,247,0.15), rgba(168,85,247,0.15))",
                      border: "1px solid rgba(124,110,247,0.2)",
                      boxShadow: "0 0 80px rgba(124,110,247,0.12), inset 0 1px 0 rgba(255,255,255,0.06)"
                    }}>
                    <Scale size={40} style={{ color: "#9d8fff" }} />
                  </div>
                  {/* Orbiting sparkles */}
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(124,110,247,0.2)", border: "1px solid rgba(124,110,247,0.3)" }}>
                    <Sparkles size={12} style={{ color: "#9d8fff" }} />
                  </div>
                </motion.div>

                <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">
                  How can I help you?
                </h2>
                <p className="max-w-xs text-sm leading-relaxed mb-10" style={{ color: "#6a6a80" }}>
                  Ask anything about Indian law — from your fundamental rights to civil and criminal matters.
                </p>

                {/* Suggestions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg">
                  {SUGGESTED.map((s, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.07 }}
                      onClick={() => handleSuggestedClick(s.text)}
                      className="flex items-start gap-3 rounded-2xl p-4 text-left transition-all duration-200"
                      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
                      onMouseOver={e => {
                        e.currentTarget.style.background = "rgba(124,110,247,0.07)";
                        e.currentTarget.style.borderColor = "rgba(124,110,247,0.22)";
                      }}
                      onMouseOut={e => {
                        e.currentTarget.style.background = "rgba(255,255,255,0.025)";
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                      }}
                    >
                      <span className="text-lg shrink-0">{s.icon}</span>
                      <span className="text-sm leading-relaxed" style={{ color: "#7a7a90" }}>{s.text}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <div className="space-y-5">
                {messages.map((msg, i) => (
                  <motion.div
                    key={msg.id || i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} items-end gap-2.5`}
                  >
                    {msg.role === "assistant" && (
                      <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mb-1"
                        style={{ background: "linear-gradient(135deg, #7c6ef7, #a855f7)", boxShadow: "0 0 14px rgba(124,110,247,0.35)" }}>
                        <Bot size={13} className="text-white" />
                      </div>
                    )}
                    <div className={`max-w-[80%] flex flex-col group ${msg.role === "user" ? "items-end" : "items-start"}`}>
                      <div
                        className="rounded-2xl px-4 py-3 text-sm leading-relaxed"
                        style={msg.role === "user" ? {
                          background: "linear-gradient(135deg, #6d5fee, #9333ea)",
                          color: "#fff",
                          borderBottomRightRadius: "6px",
                          boxShadow: "0 4px 20px rgba(124,110,247,0.2)"
                        } : {
                          background: "#13131e",
                          border: "1px solid rgba(255,255,255,0.06)",
                          color: "#d0d0e4",
                          borderBottomLeftRadius: "6px",
                        }}
                      >
                        <p className="whitespace-pre-wrap message-content">{msg.content}</p>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5 px-1">
                        <span className="text-xs" style={{ color: "#3a3a52" }}>
                          {formatTime(msg.createdAt)}
                        </span>
                        {msg.role === "assistant" && <CopyButton text={msg.content} />}
                      </div>
                    </div>
                    {msg.role === "user" && (
                      <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mb-1 font-bold text-xs text-white"
                        style={{ background: "linear-gradient(135deg, #7c6ef7, #a855f7)" }}>
                        {user.email[0].toUpperCase()}
                      </div>
                    )}
                  </motion.div>
                ))}

                {/* Typing indicator */}
                {loadingChat && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start items-end gap-2.5"
                  >
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "linear-gradient(135deg, #7c6ef7, #a855f7)" }}>
                      <Bot size={13} className="text-white" />
                    </div>
                    <div className="rounded-2xl px-4 py-3.5"
                      style={{ background: "#13131e", border: "1px solid rgba(255,255,255,0.06)", borderBottomLeftRadius: "6px" }}>
                      <div className="flex gap-1.5 items-center">
                        <div className="typing-dot" />
                        <div className="typing-dot" />
                        <div className="typing-dot" />
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
        <div className="absolute inset-x-0 bottom-0 px-4 md:px-5 pb-5 pt-12"
          style={{ background: "linear-gradient(to top, #07070d 65%, transparent)" }}>
          <div className="mx-auto max-w-2xl">
            <div
              className="flex items-end gap-3 rounded-2xl p-3 transition-all duration-300"
              style={{ background: "#0e0e18", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 0 0 0 rgba(124,110,247,0)" }}
              onFocusCapture={e => {
                e.currentTarget.style.borderColor = "rgba(124,110,247,0.35)";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,110,247,0.07)";
              }}
              onBlurCapture={e => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                e.currentTarget.style.boxShadow = "0 0 0 0 rgba(124,110,247,0)";
              }}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={activeChat ? "Ask a legal question… (⏎ to send)" : "Message Nyaay…"}
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm outline-none"
                style={{ color: "#e0e0f4", maxHeight: "160px", lineHeight: "1.65", caretColor: "#9d8fff" }}
              />

              <div className="flex items-center gap-2 shrink-0">
                <input type="file" ref={fileInputRef} hidden accept=".pdf,.txt" onChange={handleFileUpload} />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingDoc}
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200"
                  style={{ color: "#7a7a90", background: "rgba(255,255,255,0.02)" }}
                  title="Upload Document"
                  onMouseOver={e=>e.currentTarget.style.color="#9d8fff"}
                  onMouseOut={e=>e.currentTarget.style.color="#7a7a90"}
                >
                  {uploadingDoc ? <div className="animate-spin w-4 h-4 border-2 border-t-transparent border-[#9d8fff] rounded-full" /> : <Paperclip size={16} />}
                </button>
                
                {input.trim() && (
                  <span className="text-xs hidden sm:block" style={{ color: "#3a3a52" }}>⏎ send</span>
                )}
                <motion.button
                  onClick={() => {
                    if (!activeChat && input.trim()) {
                      createNewChat().then(() => sendMessage());
                    } else {
                      sendMessage();
                    }
                  }}
                  disabled={!input.trim() || loadingChat}
                  whileHover={{ scale: input.trim() && !loadingChat ? 1.08 : 1 }}
                  whileTap={{ scale: input.trim() && !loadingChat ? 0.92 : 1 }}
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-25"
                  style={{
                    background: input.trim() && !loadingChat
                      ? "linear-gradient(135deg, #7c6ef7, #a855f7)"
                      : "rgba(255,255,255,0.05)",
                    boxShadow: input.trim() && !loadingChat ? "0 0 16px rgba(124,110,247,0.4)" : "none"
                  }}
                >
                  <Send size={14} className="text-white ml-px" />
                </motion.button>
              </div>
            </div>
            <p className="mt-2 text-center text-xs" style={{ color: "#2f2f44" }}>
              Nyaay provides legal information, not legal advice. Always consult a qualified lawyer.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
