"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase, Plus, ArrowRight, Building2, Calendar,
  Search, Scale, Shield, Users, FileText, Landmark,
  ShoppingCart, Brain, SlidersHorizontal, TrendingUp,
  AlertTriangle, CheckCircle, Clock, X,
} from "lucide-react";
import { Playfair_Display } from "next/font/google";
import { useAuth } from "@/contexts/AuthContext";
import NyayaNav from "@/components/NyayaNav";
import api from "@/lib/api";


const playfair = Playfair_Display({ subsets: ["latin"], style: ["normal", "italic"] });

const STATUS_META: Record<string, { color: string; bg: string; border: string; label: string }> = {
  OPEN:        { color: "#60a5fa", bg: "rgba(59,130,246,0.1)",   border: "rgba(59,130,246,0.25)",  label: "Open" },
  IN_PROGRESS: { color: "#a78bfa", bg: "rgba(167,139,250,0.1)",  border: "rgba(167,139,250,0.25)", label: "In Progress" },
  ON_HOLD:     { color: "#facc15", bg: "rgba(250,204,21,0.1)",   border: "rgba(250,204,21,0.25)",  label: "On Hold" },
  CLOSED:      { color: "#34d399", bg: "rgba(52,211,153,0.1)",   border: "rgba(52,211,153,0.25)",  label: "Closed" },
  APPEALED:    { color: "#fb923c", bg: "rgba(251,146,60,0.1)",   border: "rgba(251,146,60,0.25)",  label: "Appealed" },
};

const PRIORITY_STRIPE: Record<string, string> = {
  LOW: "#34d399", MEDIUM: "#facc15", HIGH: "#fb923c", URGENT: "#f87171",
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  CIVIL: <Scale size={12}/>, CRIMINAL: <Shield size={12}/>, FAMILY: <Users size={12}/>,
  CONSTITUTIONAL: <FileText size={12}/>, LABOUR: <Landmark size={12}/>,
  CONSUMER: <ShoppingCart size={12}/>, TAX: <Landmark size={12}/>, IP: <Brain size={12}/>,
};

const FILTERS = ["ALL","OPEN","IN_PROGRESS","ON_HOLD","CLOSED","APPEALED"];

function StatCard({ icon, label, value, color, delay }: any) {
  return (
    <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay }}
      className="relative flex-1 min-w-[130px] rounded-2xl p-4 overflow-hidden"
      style={{ background:"rgba(13,18,36,0.9)", border:`1px solid ${color}22` }}>
      <div className="absolute inset-0 opacity-5" style={{ background:`radial-gradient(circle at top left, ${color}, transparent 70%)` }}/>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3"
        style={{ background:`${color}15`, border:`1px solid ${color}30`, color }}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-white mb-0.5">{value}</p>
      <p className="text-xs font-medium" style={{ color:"#4a4a62" }}>{label}</p>
    </motion.div>
  );
}

function CaseCard({ c, index, onClick }: { c:any; index:number; onClick:()=>void }) {
  const sm   = STATUS_META[c.status]   ?? STATUS_META.OPEN;
  const stripe = PRIORITY_STRIPE[c.priority] ?? "#60a5fa";
  const limitSoon = c.limitationDate && new Date(c.limitationDate) < new Date(Date.now()+30*86400000);

  return (
    <motion.div
      initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }}
      transition={{ delay: index * 0.045 }}
      whileHover={{ y:-2, boxShadow:"0 20px 60px rgba(0,0,0,0.5)" }}
      onClick={onClick}
      className="group relative rounded-2xl cursor-pointer overflow-hidden transition-all"
      style={{ background:"rgba(10,14,28,0.95)", border:"1px solid rgba(30,38,66,0.8)" }}>

      {/* Priority stripe */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background:stripe }}/>

      {/* Hover glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ background:`radial-gradient(circle at 0% 50%, ${stripe}08, transparent 60%)` }}/>

      <div className="pl-5 pr-5 py-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md"
                style={{ background:"rgba(255,255,255,0.04)", color:"#4a4a62", border:"1px solid rgba(30,38,66,1)" }}>
                {c.caseNumber || "DRAFT"}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider"
                style={{ background:sm.bg, color:sm.color, border:`1px solid ${sm.border}` }}>
                {sm.label}
              </span>
              {c.caseType && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase"
                  style={{ background:"rgba(124,110,247,0.08)", color:"#9d8fff", border:"1px solid rgba(124,110,247,0.15)" }}>
                  {TYPE_ICON[c.caseType]}{c.caseType}
                </span>
              )}
              {limitSoon && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md"
                  style={{ background:"rgba(248,113,113,0.08)", color:"#f87171", border:"1px solid rgba(248,113,113,0.2)" }}>
                  <AlertTriangle size={9}/>⏰ Limitation
                </span>
              )}
            </div>

            {/* Title */}
            <h2 className={`${playfair.className} text-lg font-medium text-white leading-snug mb-2 group-hover:text-[#d4af37] transition-colors`}
              style={{ display:"-webkit-box", WebkitLineClamp:1, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
              {c.title}
            </h2>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {c.court && (
                <span className="flex items-center gap-1 text-xs" style={{ color:"#4a4a62" }}>
                  <Landmark size={10}/>{c.court}
                </span>
              )}
              {c.judgeName && (
                <span className="text-xs" style={{ color:"#3a3a52" }}>⚖ {c.judgeName}</span>
              )}
              {c.actSection && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                  style={{ background:"rgba(212,175,55,0.06)", color:"#8a7a42", border:"1px solid rgba(212,175,55,0.1)" }}>
                  {c.actSection.slice(0,30)}{c.actSection.length > 30 ? "…" : ""}
                </span>
              )}
            </div>
          </div>

          {/* Right side stats */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex items-center gap-2">
              {c._count?.hearings > 0 && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold"
                  style={{ background:"rgba(124,110,247,0.08)", color:"#9d8fff", border:"1px solid rgba(124,110,247,0.15)" }}>
                  <Calendar size={10}/>{c._count.hearings}
                </div>
              )}
              {c._count?.documents > 0 && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold"
                  style={{ background:"rgba(212,175,55,0.08)", color:"#d4af37", border:"1px solid rgba(212,175,55,0.15)" }}>
                  <FileText size={10}/>{c._count.documents}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 text-[10px]" style={{ color:"#3a3a52" }}>
              <Clock size={9}/>
              {new Date(c.updatedAt).toLocaleDateString("en-IN")}
            </div>
          </div>
        </div>

        {/* Tags + arrow */}
        {(c.tags?.length > 0 || c.opponentName) && (
          <div className="mt-3 pt-3 flex items-center justify-between gap-3"
            style={{ borderTop:"1px solid rgba(30,38,66,0.7)" }}>
            <div className="flex flex-wrap items-center gap-1.5">
              {c.opponentName && (
                <span className="text-[10px] px-2 py-0.5 rounded-md"
                  style={{ background:"rgba(239,68,68,0.06)", color:"#9a5555", border:"1px solid rgba(239,68,68,0.12)" }}>
                  vs. {c.opponentName}
                </span>
              )}
              {c.tags?.slice(0,3).map((t:string) => (
                <span key={t} className="text-[10px] px-2 py-0.5 rounded-md"
                  style={{ background:"rgba(212,175,55,0.06)", color:"#7a6a32", border:"1px solid rgba(212,175,55,0.1)" }}>
                  #{t}
                </span>
              ))}
              {c.tags?.length > 3 && <span className="text-[10px]" style={{ color:"#3a3a52" }}>+{c.tags.length-3}</span>}
            </div>
            <div className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
              style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(30,38,66,1)" }}>
              <ArrowRight size={13} style={{ color:"#3a3a52" }} className="group-hover:text-[#d4af37] transition-colors"/>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function CasesPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const [cases, setCases]           = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);

  const [showFirmModal, setShowFirmModal] = useState(false);
  const [firmForm, setFirmForm]     = useState({ name:"", description:"" });
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch]         = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());
      const { data } = await api.get(`/cases?${params}`);
      setCases(data);
    } catch { } finally { setLoading(false); }
  }, [statusFilter, search]);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  const stats = {
    total:   cases.length,
    open:    cases.filter(c => c.status === "OPEN" || c.status === "IN_PROGRESS").length,
    urgent:  cases.filter(c => c.priority === "URGENT").length,
    closed:  cases.filter(c => c.status === "CLOSED").length,
  };

  if (authLoading || !user) return (
    <div className="flex h-screen items-center justify-center" style={{ background:"#070b16" }}>
      <div className="w-12 h-12 rounded-2xl animate-spin"
        style={{ background:"linear-gradient(135deg,#7c6ef7,#d4af37)", boxShadow:"0 0 30px rgba(124,110,247,0.4)" }}/>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background:"#070b16", color:"#ededed" }}>
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div style={{ position:"absolute", top:"-10%", left:"-5%", width:"50vw", height:"50vw",
          background:"radial-gradient(circle, #1a2b5820, transparent 70%)", borderRadius:"50%" }}/>
        <div style={{ position:"absolute", bottom:"-10%", right:"-5%", width:"40vw", height:"40vw",
          background:"radial-gradient(circle, #d4af3708, transparent 70%)", borderRadius:"50%" }}/>
      </div>

      <NyayaNav user={user} logout={logout} active="cases"/>

      <div className="relative z-10 max-w-5xl mx-auto px-6 pb-16 pt-8">

        {/* Header */}
        <motion.div initial={{ opacity:0, y:-12 }} animate={{ opacity:1, y:0 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-2" style={{ color:"#7c6ef7" }}>
              ⚖ LEGAL WORKSPACE
            </p>
            <h1 className={`${playfair.className} text-4xl md:text-5xl font-medium text-white leading-tight`}>
              Case <span style={{ color:"#d4af37", fontStyle:"italic" }}>Intelligence</span>
            </h1>
            <p className="mt-2 text-sm" style={{ color:"#4a4a62" }}>
              Track hearings, parties, documents and AI insights across all your matters.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            {user.role === "LAWYER" && (
              <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
                onClick={() => setShowFirmModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
                style={{ background:"rgba(212,175,55,0.07)", border:"1px solid rgba(212,175,55,0.2)", color:"#d4af37" }}>
                <Building2 size={14}/> Firm
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale:1.03, boxShadow:"0 0 30px rgba(124,110,247,0.45)" }}
              whileTap={{ scale:0.97 }}
              onClick={() => router.push('/cases/new')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
              style={{ background:"linear-gradient(135deg,#7c6ef7,#d4af37)", color:"#070b16" }}>
              <Plus size={15}/> Open Case
            </motion.button>
          </div>
        </motion.div>

        {/* Stats bar */}
        <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}
          className="flex gap-3 mb-8 overflow-x-auto pb-1">
          <StatCard icon={<Briefcase size={15}/>}    label="Total Cases"   value={stats.total}  color="#7c6ef7" delay={0.1}/>
          <StatCard icon={<TrendingUp size={15}/>}   label="Active"        value={stats.open}   color="#60a5fa" delay={0.15}/>
          <StatCard icon={<AlertTriangle size={15}/>} label="Urgent"       value={stats.urgent} color="#f87171" delay={0.2}/>
          <StatCard icon={<CheckCircle size={15}/>}  label="Closed"        value={stats.closed} color="#34d399" delay={0.25}/>
        </motion.div>

        {/* Search + filter bar */}
        <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}
          className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color:"#3a3a52" }}/>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by title, court, case number..."
              className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder-[#2a2a42]"
              style={{ background:"rgba(13,18,36,0.9)", border:"1px solid rgba(30,38,66,1)" }}
              onFocus={e => { e.currentTarget.style.borderColor="rgba(124,110,247,0.4)"; e.currentTarget.style.boxShadow="0 0 0 3px rgba(124,110,247,0.07)"; }}
              onBlur={e  => { e.currentTarget.style.borderColor="rgba(30,38,66,1)"; e.currentTarget.style.boxShadow="none"; }}/>
          </div>
          <button onClick={() => setShowFilters(v=>!v)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: showFilters ? "rgba(124,110,247,0.1)" : "rgba(13,18,36,0.9)",
              border: showFilters ? "1px solid rgba(124,110,247,0.35)" : "1px solid rgba(30,38,66,1)",
              color: showFilters ? "#9d8fff" : "#4a4a62",
            }}>
            <SlidersHorizontal size={14}/>
            {statusFilter !== "ALL" ? STATUS_META[statusFilter]?.label : "Filter"}
            {statusFilter !== "ALL" && (
              <span onClick={e => { e.stopPropagation(); setStatusFilter("ALL"); }}
                className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-white/10">
                <X size={9}/>
              </span>
            )}
          </button>
        </motion.div>

        {/* Filter pills */}
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }}
              exit={{ opacity:0, height:0 }} className="overflow-hidden mb-5">
              <div className="flex flex-wrap gap-2 py-2">
                {FILTERS.map(f => {
                  const m = STATUS_META[f];
                  return (
                    <button key={f} onClick={() => setStatusFilter(f)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
                      style={{
                        background: statusFilter===f ? (m?.bg ?? "rgba(124,110,247,0.12)") : "rgba(255,255,255,0.03)",
                        border: `1px solid ${statusFilter===f ? (m?.border ?? "rgba(124,110,247,0.3)") : "rgba(30,38,66,1)"}`,
                        color: statusFilter===f ? (m?.color ?? "#9d8fff") : "#3a3a52",
                      }}>
                      {f === "ALL" ? "All Matters" : m?.label ?? f}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Case list */}
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-10 h-10 rounded-full animate-spin"
              style={{ border:"2px solid rgba(212,175,55,0.15)", borderTop:"2px solid #d4af37" }}/>
          </div>
        ) : cases.length === 0 ? (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
            className="flex flex-col items-center justify-center py-28 rounded-3xl"
            style={{ background:"rgba(10,14,28,0.8)", border:"1px solid rgba(30,38,66,0.8)" }}>
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
                style={{ background:"rgba(212,175,55,0.07)", border:"1px solid rgba(212,175,55,0.15)" }}>
                <Briefcase size={32} style={{ color:"#d4af37" }}/>
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background:"linear-gradient(135deg,#7c6ef7,#d4af37)" }}>
                <Plus size={10} style={{ color:"#070b16" }}/>
              </div>
            </div>
            <h3 className={`${playfair.className} text-2xl text-white mb-2`}>
              {search || statusFilter !== "ALL" ? "No matches found" : "No active matters"}
            </h3>
            <p className="text-sm mb-7 text-center max-w-xs" style={{ color:"#3a3a52" }}>
              {search || statusFilter !== "ALL"
                ? "Try adjusting your search or clearing filters."
                : "Open your first case to begin tracking hearings, parties, and documents."}
            </p>
            {!search && statusFilter === "ALL" && (
              <motion.button whileHover={{ boxShadow:"0 0 30px rgba(212,175,55,0.25)" }}
                onClick={() => setShowSlideOver(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold"
                style={{ background:"linear-gradient(135deg,#7c6ef7,#d4af37)", color:"#070b16" }}>
                <Plus size={14}/> Open First Case
              </motion.button>
            )}
          </motion.div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs mb-4" style={{ color:"#3a3a52" }}>
              {cases.length} matter{cases.length !== 1 ? "s" : ""}
              {statusFilter !== "ALL" ? ` · ${STATUS_META[statusFilter]?.label}` : ""}
              {search ? ` · "${search}"` : ""}
            </p>
            {cases.map((c, i) => (
              <CaseCard key={c.id} c={c} index={i} onClick={() => router.push(`/cases/${c.id}`)}/>
            ))}
          </div>
        )}
      </div>



      {/* Firm modal */}
      <AnimatePresence>
        {showFirmModal && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowFirmModal(false)}>
            <motion.div initial={{ scale:0.93, opacity:0 }} animate={{ scale:1, opacity:1 }}
              exit={{ scale:0.93, opacity:0 }}
              className="w-full max-w-md rounded-3xl p-8 relative"
              style={{ background:"#0a0e1c", border:"1px solid rgba(30,38,66,1)", boxShadow:"0 25px 80px rgba(0,0,0,0.7)" }}
              onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowFirmModal(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(30,38,66,1)", color:"#4a4a62" }}>
                <X size={14}/>
              </button>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background:"rgba(212,175,55,0.08)", border:"1px solid rgba(212,175,55,0.2)" }}>
                  <Building2 size={17} style={{ color:"#d4af37" }}/>
                </div>
                <div>
                  <h2 className={`${playfair.className} text-xl text-white font-medium`}>New Firm</h2>
                  <p className="text-xs" style={{ color:"#4a4a62" }}>Create a shared legal workspace.</p>
                </div>
              </div>
              <form onSubmit={async e => {
                e.preventDefault();
                try { await api.post("/cases/firms", firmForm); setShowFirmModal(false); setFirmForm({ name:"", description:"" }); } catch {}
              }} className="space-y-4">
                {[{ label:"Firm Name *", key:"name", required:true }, { label:"Description", key:"description" }].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color:"#4a4a62" }}>{f.label}</label>
                    <input required={f.required} value={(firmForm as any)[f.key]}
                      onChange={e => setFirmForm({ ...firmForm, [f.key]: e.target.value })}
                      className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                      style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(30,38,66,1)" }}
                      onFocus={e => { e.currentTarget.style.borderColor="rgba(212,175,55,0.4)"; }}
                      onBlur={e  => { e.currentTarget.style.borderColor="rgba(30,38,66,1)"; }}/>
                  </div>
                ))}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowFirmModal(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(30,38,66,1)", color:"#6a6a82" }}>
                    Cancel
                  </button>
                  <motion.button type="submit" whileHover={{ boxShadow:"0 0 20px rgba(212,175,55,0.2)" }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                    style={{ background:"linear-gradient(135deg,rgba(212,175,55,0.12),rgba(212,175,55,0.04))", color:"#d4af37", border:"1px solid rgba(212,175,55,0.25)" }}>
                    Create Firm
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
