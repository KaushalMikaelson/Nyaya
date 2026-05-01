"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase, Plus, ArrowRight, Building2, Calendar,
  Search, Filter, Scale, Shield, Users, FileText,
  Landmark, ShoppingCart, Brain, SlidersHorizontal,
} from "lucide-react";
import { Playfair_Display } from "next/font/google";
import { useAuth } from "@/contexts/AuthContext";
import NyayaNav from "@/components/NyayaNav";
import api from "@/lib/api";
import { CaseSlideOver } from "./components/CaseSlideOver";

const playfair = Playfair_Display({ subsets: ["latin"], style: ["normal", "italic"] });

// ─────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────

const STATUS_META: Record<string, { color: string; bg: string; label: string }> = {
  OPEN:        { color: "#60a5fa", bg: "rgba(59,130,246,0.12)",  label: "Open" },
  IN_PROGRESS: { color: "#a78bfa", bg: "rgba(167,139,250,0.12)", label: "In Progress" },
  ON_HOLD:     { color: "#facc15", bg: "rgba(250,204,21,0.12)",  label: "On Hold" },
  CLOSED:      { color: "#34d399", bg: "rgba(52,211,153,0.12)",  label: "Closed" },
  APPEALED:    { color: "#fb923c", bg: "rgba(251,146,60,0.12)",  label: "Appealed" },
};

const PRIORITY_META: Record<string, { color: string; dot: string }> = {
  LOW:    { color: "#34d399", dot: "#34d399" },
  MEDIUM: { color: "#facc15", dot: "#facc15" },
  HIGH:   { color: "#fb923c", dot: "#fb923c" },
  URGENT: { color: "#f87171", dot: "#f87171" },
};

const CASE_TYPE_ICONS: Record<string, React.ReactNode> = {
  CIVIL:          <Scale size={13} />,
  CRIMINAL:       <Shield size={13} />,
  FAMILY:         <Users size={13} />,
  CONSTITUTIONAL: <FileText size={13} />,
  LABOUR:         <Landmark size={13} />,
  CONSUMER:       <ShoppingCart size={13} />,
  TAX:            <Landmark size={13} />,
  IP:             <Brain size={13} />,
};

const FILTER_STATUSES = ["ALL", "OPEN", "IN_PROGRESS", "ON_HOLD", "CLOSED", "APPEALED"];

// ─────────────────────────────────────────
// CASE CARD
// ─────────────────────────────────────────

function CaseCard({ c, onClick }: { c: any; onClick: () => void }) {
  const sm = STATUS_META[c.status] ?? STATUS_META["OPEN"];
  const pm = PRIORITY_META[c.priority] ?? PRIORITY_META["MEDIUM"];
  const isUrgent = c.priority === "URGENT";
  const limitationSoon = c.limitationDate &&
    new Date(c.limitationDate) < new Date(Date.now() + 30 * 86400000);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, boxShadow: "0 12px 40px rgba(0,0,0,0.45)" }}
      onClick={onClick}
      className="group relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl cursor-pointer overflow-hidden transition-all"
      style={{ background: "rgba(13,18,36,0.85)", border: `1px solid ${isUrgent ? "rgba(248,113,113,0.25)" : "rgba(30,38,66,1)"}` }}
    >
      {/* Priority left bar */}
      <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full"
        style={{ background: pm.dot, opacity: 0.7 }} />

      <div className="flex-1 min-w-0 pl-1">
        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider"
            style={{ background: "rgba(255,255,255,0.04)", color: "#6a6a82" }}>
            {c.caseNumber || "DRAFT"}
          </span>
          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider"
            style={{ background: sm.bg, color: sm.color }}>
            {sm.label}
          </span>
          {c.caseType && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider"
              style={{ background: "rgba(124,110,247,0.08)", color: "#9d8fff", border: "1px solid rgba(124,110,247,0.15)" }}>
              {CASE_TYPE_ICONS[c.caseType]}
              {c.caseType}
            </span>
          )}
          <span className="flex items-center gap-1 text-[10px] font-bold"
            style={{ color: pm.color }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: pm.dot }} />
            {c.priority}
          </span>
          {limitationSoon && (
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold"
              style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
              ⏰ Limitation Soon
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className={`${playfair.className} text-lg font-medium text-white mb-1 truncate group-hover:text-[#d4af37] transition-colors`}>
          {c.title}
        </h2>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: "#4a4a62" }}>
          {c.court && <span>🏛 {c.court}</span>}
          {c.opponentName && <span>vs. {c.opponentName}</span>}
          {c._count?.hearings > 0 && <span>📅 {c._count.hearings} hearing{c._count.hearings !== 1 ? "s" : ""}</span>}
          {c._count?.documents > 0 && <span>📄 {c._count.documents} doc{c._count.documents !== 1 ? "s" : ""}</span>}
        </div>

        {/* Tags */}
        {c.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {c.tags.slice(0, 4).map((t: string) => (
              <span key={t} className="px-2 py-0.5 rounded-md text-[10px]"
                style={{ background: "rgba(212,175,55,0.07)", color: "#8a7a42", border: "1px solid rgba(212,175,55,0.12)" }}>
                {t}
              </span>
            ))}
            {c.tags.length > 4 && (
              <span className="text-[10px]" style={{ color: "#3a3a52" }}>+{c.tags.length - 4} more</span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-5 shrink-0">
        <div className="hidden md:block text-right">
          <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "#3a3a52" }}>Updated</p>
          <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#6a6a82" }}>
            <Calendar size={11} />
            {new Date(c.updatedAt).toLocaleDateString("en-IN")}
          </div>
        </div>
        <div className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(30,38,66,1)" }}>
          <ArrowRight size={15} style={{ color: "#4a4a62" }} className="group-hover:text-[#d4af37] transition-colors" />
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────

export default function CasesPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSlideOver, setShowSlideOver] = useState(false);
  const [showFirmModal, setShowFirmModal] = useState(false);
  const [firmForm, setFirmForm] = useState({ name: "", description: "" });
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());
      const { data } = await api.get(`/cases?${params.toString()}`);
      setCases(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  const handleCreateFirm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/cases/firms", firmForm);
      setShowFirmModal(false);
      setFirmForm({ name: "", description: "" });
    } catch (err) { console.error(err); }
  };

  if (authLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center" style={{ background: "#070b16" }}>
        <div className="w-12 h-12 rounded-2xl animate-spin"
          style={{ background: "linear-gradient(135deg,#7c6ef7,#d4af37)", boxShadow: "0 0 30px rgba(124,110,247,0.4)" }} />
      </div>
    );
  }

  const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(30,38,66,1)", color: "#ededed" };

  return (
    <div className="min-h-screen font-sans" style={{ background: "#070b16", color: "#ededed" }}>
      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }} transition={{ duration: 12, repeat: Infinity }}
          style={{ position: "absolute", top: "5%", left: "5%", width: "40vw", height: "40vw", background: "#1a2b58", borderRadius: "50%", filter: "blur(140px)" }} />
        <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.04, 0.1, 0.04] }} transition={{ duration: 9, repeat: Infinity, delay: 4 }}
          style={{ position: "absolute", bottom: "5%", right: "5%", width: "30vw", height: "30vw", background: "#d4af37", borderRadius: "50%", filter: "blur(160px)" }} />
      </div>

      <NyayaNav user={user} logout={logout} active="cases" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <motion.header initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: "#7c6ef7" }}>LEGAL WORKSPACE</p>
            <h1 className={`${playfair.className} text-4xl md:text-5xl font-medium text-white`}>
              Case <span style={{ color: "#d4af37", fontStyle: "italic" }}>Management</span>
            </h1>
            <p className="mt-2 text-sm" style={{ color: "#6a6a82" }}>
              Track hearings, documents, and milestones across all your matters.
            </p>
          </div>
          <div className="flex gap-3">
            {user.role === "LAWYER" && (
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                onClick={() => setShowFirmModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)", color: "#d4af37" }}>
                <Building2 size={15} /> New Firm
              </motion.button>
            )}
            <motion.button whileHover={{ scale: 1.04, boxShadow: "0 0 25px rgba(124,110,247,0.4)" }} whileTap={{ scale: 0.97 }}
              onClick={() => setShowSlideOver(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: "linear-gradient(135deg,#7c6ef7,#d4af37)", color: "#070b16" }}>
              <Plus size={15} /> Open New Case
            </motion.button>
          </div>
        </motion.header>

        {/* Search & filter bar */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#4a4a62" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cases by title, court, or case number..."
              className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm text-white outline-none transition-all placeholder-[#3a3a52]"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(212,175,55,0.4)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(212,175,55,0.07)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(30,38,66,1)"; e.currentTarget.style.boxShadow = "none"; }}
            />
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ ...inputStyle, color: showFilters ? "#d4af37" : "#6a6a82", borderColor: showFilters ? "rgba(212,175,55,0.3)" : "rgba(30,38,66,1)" }}>
            <SlidersHorizontal size={14} /> Filters
          </button>
        </motion.div>

        {/* Status filter tabs */}
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-5">
              <div className="flex flex-wrap gap-2 pb-2">
                {FILTER_STATUSES.map((s) => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
                    style={{
                      background: statusFilter === s ? "rgba(212,175,55,0.12)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${statusFilter === s ? "rgba(212,175,55,0.35)" : "rgba(30,38,66,1)"}`,
                      color: statusFilter === s ? "#d4af37" : "#4a4a62",
                    }}>
                    {s === "ALL" ? "All Statuses" : STATUS_META[s]?.label ?? s}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Case list */}
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <div className="w-10 h-10 rounded-full animate-spin"
              style={{ border: "2px solid rgba(212,175,55,0.2)", borderTop: "2px solid #d4af37" }} />
          </div>
        ) : cases.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 rounded-3xl"
            style={{ background: "rgba(13,18,36,0.8)", border: "1px solid rgba(30,38,66,1)" }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.15)" }}>
              <Briefcase size={28} style={{ color: "#d4af37" }} />
            </div>
            <h3 className={`${playfair.className} text-2xl text-white mb-2`}>
              {search || statusFilter !== "ALL" ? "No matching cases" : "No active matters"}
            </h3>
            <p className="text-sm mb-6 text-center max-w-sm" style={{ color: "#4a4a62" }}>
              {search || statusFilter !== "ALL"
                ? "Try adjusting your search or filters."
                : "Create your first case to track hearings, link documents, and manage timelines."}
            </p>
            {!search && statusFilter === "ALL" && (
              <motion.button whileHover={{ boxShadow: "0 0 25px rgba(212,175,55,0.3)" }}
                onClick={() => setShowSlideOver(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: "linear-gradient(135deg,#7c6ef7,#d4af37)", color: "#070b16" }}>
                <Plus size={14} /> Create Case
              </motion.button>
            )}
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <p className="text-xs font-medium mb-3" style={{ color: "#3a3a52" }}>
              {cases.length} matter{cases.length !== 1 ? "s" : ""} found
            </p>
            {cases.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}>
                <CaseCard c={c} onClick={() => router.push(`/cases/${c.id}`)} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Case Slide-Over */}
      <CaseSlideOver
        open={showSlideOver}
        onClose={() => setShowSlideOver(false)}
        onSuccess={fetchCases}
      />

      {/* Firm Modal */}
      <AnimatePresence>
        {showFirmModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowFirmModal(false)}>
            <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.93, opacity: 0 }}
              className="w-full max-w-md rounded-3xl p-8 relative"
              style={{ background: "#0d1224", border: "1px solid rgba(30,38,66,1)", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)" }}>
                  <Building2 size={18} style={{ color: "#d4af37" }} />
                </div>
                <div>
                  <h2 className={`${playfair.className} text-xl text-white font-medium`}>New Firm</h2>
                  <p className="text-xs" style={{ color: "#4a4a62" }}>Create a shared legal workspace.</p>
                </div>
              </div>
              <form onSubmit={handleCreateFirm} className="space-y-4">
                {[
                  { label: "Firm Name *", key: "name", required: true },
                  { label: "Description", key: "description", required: false },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "#4a4a62" }}>{f.label}</label>
                    <input required={f.required} value={(firmForm as any)[f.key]}
                      onChange={(e) => setFirmForm({ ...firmForm, [f.key]: e.target.value })}
                      className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-all"
                      style={inputStyle}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(212,175,55,0.4)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(30,38,66,1)"; }} />
                  </div>
                ))}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowFirmModal(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(30,38,66,1)", color: "#6a6a82" }}>
                    Cancel
                  </button>
                  <motion.button type="submit" whileHover={{ boxShadow: "0 0 20px rgba(212,175,55,0.25)" }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                    style={{ background: "linear-gradient(135deg,rgba(212,175,55,0.15),rgba(212,175,55,0.05))", color: "#d4af37", border: "1px solid rgba(212,175,55,0.3)" }}>
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
