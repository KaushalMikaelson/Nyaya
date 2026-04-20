"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, Plus, ArrowRight, X, Building2, Scale, Calendar } from "lucide-react";
import { Playfair_Display } from "next/font/google";
import { useAuth } from "@/contexts/AuthContext";
import NyayaNav from "@/components/NyayaNav";

const playfair = Playfair_Display({ subsets: ["latin"], style: ["normal", "italic"] });

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  OPEN:     { color: "#60a5fa", bg: "rgba(59,130,246,0.12)" },
  PENDING:  { color: "#facc15", bg: "rgba(250,204,21,0.12)" },
  CLOSED:   { color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  ARCHIVED: { color: "#94a3b8", bg: "rgba(100,116,139,0.12)" },
  DRAFT:    { color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
};

export default function CasesPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [showFirmModal, setShowFirmModal] = useState(false);
  const [caseForm, setCaseForm] = useState({ title: "", description: "", caseNumber: "", court: "", judgeName: "", firmId: "" });
  const [firmForm, setFirmForm] = useState({ name: "", description: "" });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) { router.push("/login"); return; }
      const res = await fetch("http://localhost:3001/api/cases", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setCases(await res.json());
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:3001/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(caseForm),
      });
      if (res.ok) { setShowCaseModal(false); setCaseForm({ title: "", description: "", caseNumber: "", court: "", judgeName: "", firmId: "" }); fetchData(); }
    } catch (err) { console.error(err); }
  };

  const handleCreateFirm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:3001/api/cases/firms", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(firmForm),
      });
      if (res.ok) { setShowFirmModal(false); setFirmForm({ name: "", description: "" }); }
    } catch (err) { console.error(err); }
  };

  if (authLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center" style={{ background: "#070b16" }}>
        <div className="w-12 h-12 rounded-2xl animate-spin" style={{ background: "linear-gradient(135deg,#7c6ef7,#d4af37)", boxShadow: "0 0 30px rgba(124,110,247,0.4)" }} />
      </div>
    );
  }

  const inputClass = "w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-all";
  const inputStyle = { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(30,38,66,1)", color:"#ededed" };

  return (
    <div className="min-h-screen font-sans" style={{ background: "#070b16", color: "#ededed" }}>
      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <motion.div animate={{ scale:[1,1.2,1], opacity:[0.1,0.2,0.1] }} transition={{ duration:12, repeat:Infinity }}
          style={{ position:"absolute", top:"5%", left:"5%", width:"40vw", height:"40vw", background:"#1a2b58", borderRadius:"50%", filter:"blur(140px)" }} />
        <motion.div animate={{ scale:[1,1.3,1], opacity:[0.04,0.1,0.04] }} transition={{ duration:9, repeat:Infinity, delay:4 }}
          style={{ position:"absolute", bottom:"5%", right:"5%", width:"30vw", height:"30vw", background:"#d4af37", borderRadius:"50%", filter:"blur(160px)" }} />
      </div>

      <NyayaNav user={user} logout={logout} active="cases" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <motion.header initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color:"#7c6ef7" }}>LEGAL WORKSPACE</p>
            <h1 className={`${playfair.className} text-4xl md:text-5xl font-medium text-white`}>
              Case <span style={{ color:"#d4af37", fontStyle:"italic" }}>Management</span>
            </h1>
            <p className="mt-2 text-sm" style={{ color:"#6a6a82" }}>Track hearings, documents, and milestones across all your matters.</p>
          </div>
          <div className="flex gap-3">
            {user.role === "LAWYER" && (
              <motion.button whileHover={{ scale:1.04 }} whileTap={{ scale:0.97 }}
                onClick={() => setShowFirmModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{ background:"rgba(212,175,55,0.08)", border:"1px solid rgba(212,175,55,0.2)", color:"#d4af37" }}>
                <Building2 size={15} /> New Firm
              </motion.button>
            )}
            <motion.button whileHover={{ scale:1.04, boxShadow:"0 0 25px rgba(124,110,247,0.4)" }} whileTap={{ scale:0.97 }}
              onClick={() => setShowCaseModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
              style={{ background:"linear-gradient(135deg,#7c6ef7,#d4af37)", color:"#070b16" }}>
              <Plus size={15} /> Open New Case
            </motion.button>
          </div>
        </motion.header>

        {/* Case list */}
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <div className="w-10 h-10 rounded-full animate-spin" style={{ border:"2px solid rgba(212,175,55,0.2)", borderTop:"2px solid #d4af37" }} />
          </div>
        ) : (
          <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} className="space-y-4">
            {cases.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 rounded-3xl"
                style={{ background:"rgba(13,18,36,0.8)", border:"1px solid rgba(30,38,66,1)" }}>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background:"rgba(212,175,55,0.08)", border:"1px solid rgba(212,175,55,0.15)" }}>
                  <Briefcase size={28} style={{ color:"#d4af37" }} />
                </div>
                <h3 className={`${playfair.className} text-2xl text-white mb-2`}>No active matters</h3>
                <p className="text-sm mb-6 text-center max-w-sm" style={{ color:"#4a4a62" }}>Create your first case to track hearings, link documents, and manage timelines.</p>
                <motion.button whileHover={{ boxShadow:"0 0 25px rgba(212,175,55,0.3)" }}
                  onClick={() => setShowCaseModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
                  style={{ background:"linear-gradient(135deg,#7c6ef7,#d4af37)", color:"#070b16" }}>
                  <Plus size={14} /> Create Case
                </motion.button>
              </div>
            ) : cases.map((c, i) => {
              const sc = STATUS_COLORS[c.status] ?? STATUS_COLORS["OPEN"];
              return (
                <motion.div key={c.id}
                  initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.07 }}
                  whileHover={{ y:-3, boxShadow:"0 12px 40px rgba(0,0,0,0.4)" }}
                  onClick={() => router.push(`/cases/${c.id}`)}
                  className="group flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl cursor-pointer relative overflow-hidden transition-all"
                  style={{ background:"rgba(13,18,36,0.8)", border:"1px solid rgba(30,38,66,1)" }}>
                  {/* gold left bar */}
                  <motion.div
                    className="absolute left-0 top-0 bottom-0 w-0.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                    style={{ background:"linear-gradient(to bottom,#7c6ef7,#d4af37)" }} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-2">
                      <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider" style={{ background:"rgba(255,255,255,0.04)", color:"#6a6a82" }}>
                        {c.caseNumber || "DRAFT"}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                        style={{ background: sc.bg, color: sc.color }}>{c.status}</span>
                    </div>
                    <h2 className={`${playfair.className} text-xl font-medium text-white mb-1 truncate group-hover:text-[#d4af37] transition-colors`}>{c.title}</h2>
                    <p className="text-sm line-clamp-2" style={{ color:"#4a4a62" }}>{c.description || "No description provided."}</p>
                  </div>

                  <div className="flex items-center gap-6 shrink-0">
                    {c.court && (
                      <div className="hidden md:block text-sm">
                        <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color:"#4a4a62" }}>Court</p>
                        <p className="font-medium" style={{ color:"#a1a1aa" }}>{c.court}</p>
                      </div>
                    )}
                    <div className="text-sm">
                      <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color:"#4a4a62" }}>Updated</p>
                      <div className="flex items-center gap-1.5 font-medium" style={{ color:"#a1a1aa" }}>
                        <Calendar size={12} />{new Date(c.updatedAt).toLocaleDateString("en-IN")}
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                      style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(30,38,66,1)" }}>
                      <ArrowRight size={16} style={{ color:"#4a4a62" }} className="group-hover:text-[#d4af37] transition-colors" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* ─ Modals ─ */}
      <AnimatePresence>
        {showCaseModal && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowCaseModal(false)}>
            <motion.div initial={{ scale:0.93, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.93, opacity:0 }}
              className="w-full max-w-lg rounded-3xl p-8 relative"
              style={{ background:"#0d1224", border:"1px solid rgba(30,38,66,1)", boxShadow:"0 20px 60px rgba(0,0,0,0.6)" }}
              onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowCaseModal(false)} className="absolute top-6 right-6" style={{ color:"#4a4a62" }}
                onMouseEnter={e => (e.currentTarget.style.color="#a1a1aa")} onMouseLeave={e => (e.currentTarget.style.color="#4a4a62")}>
                <X size={18} />
              </button>
              <h2 className={`${playfair.className} text-2xl text-white font-medium mb-6`}>Open New Case</h2>
              <form onSubmit={handleCreateCase} className="space-y-4">
                {[
                  { label:"Case Title *", key:"title", required:true },
                  { label:"Case Number", key:"caseNumber" },
                  { label:"Court", key:"court" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-bold mb-1" style={{ color:"#4a4a62" }}>{f.label}</label>
                    <input required={f.required} value={(caseForm as any)[f.key]}
                      onChange={e => setCaseForm({...caseForm, [f.key]: e.target.value})}
                      className={inputClass} style={inputStyle}
                      onFocus={e => (e.currentTarget.style.borderColor="rgba(212,175,55,0.4)")}
                      onBlur={e => (e.currentTarget.style.borderColor="rgba(30,38,66,1)")} />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color:"#4a4a62" }}>Description</label>
                  <textarea value={caseForm.description} onChange={e => setCaseForm({...caseForm, description: e.target.value})}
                    className={`${inputClass} h-24 resize-none`} style={inputStyle}
                    onFocus={e => (e.currentTarget.style.borderColor="rgba(212,175,55,0.4)")}
                    onBlur={e => (e.currentTarget.style.borderColor="rgba(30,38,66,1)")} />
                </div>
                <motion.button type="submit" whileHover={{ boxShadow:"0 0 20px rgba(212,175,55,0.3)" }}
                  className="w-full py-3 rounded-xl text-sm font-bold"
                  style={{ background:"linear-gradient(135deg,#7c6ef7,#d4af37)", color:"#070b16" }}>
                  Save Case
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {showFirmModal && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowFirmModal(false)}>
            <motion.div initial={{ scale:0.93, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.93, opacity:0 }}
              className="w-full max-w-md rounded-3xl p-8 relative"
              style={{ background:"#0d1224", border:"1px solid rgba(30,38,66,1)", boxShadow:"0 20px 60px rgba(0,0,0,0.6)" }}
              onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowFirmModal(false)} className="absolute top-6 right-6" style={{ color:"#4a4a62" }}>
                <X size={18} />
              </button>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background:"rgba(212,175,55,0.1)", border:"1px solid rgba(212,175,55,0.2)" }}>
                  <Building2 size={18} style={{ color:"#d4af37" }} />
                </div>
                <div>
                  <h2 className={`${playfair.className} text-xl text-white font-medium`}>New Firm Setup</h2>
                  <p className="text-xs" style={{ color:"#4a4a62" }}>Create a shared workspace for your team.</p>
                </div>
              </div>
              <form onSubmit={handleCreateFirm} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color:"#4a4a62" }}>Firm Name *</label>
                  <input required value={firmForm.name} onChange={e => setFirmForm({...firmForm, name: e.target.value})}
                    className={inputClass} style={inputStyle}
                    onFocus={e => (e.currentTarget.style.borderColor="rgba(212,175,55,0.4)")}
                    onBlur={e => (e.currentTarget.style.borderColor="rgba(30,38,66,1)")} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color:"#4a4a62" }}>Description</label>
                  <textarea value={firmForm.description} onChange={e => setFirmForm({...firmForm, description: e.target.value})}
                    className={`${inputClass} h-24 resize-none`} style={inputStyle}
                    onFocus={e => (e.currentTarget.style.borderColor="rgba(212,175,55,0.4)")}
                    onBlur={e => (e.currentTarget.style.borderColor="rgba(30,38,66,1)")} />
                </div>
                <motion.button type="submit" whileHover={{ boxShadow:"0 0 20px rgba(212,175,55,0.3)" }}
                  className="w-full py-3 rounded-xl text-sm font-bold"
                  style={{ background:"linear-gradient(135deg,rgba(212,175,55,0.12),rgba(212,175,55,0.04))", color:"#d4af37", border:"1px solid rgba(212,175,55,0.3)" }}>
                  Create Firm Profile
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
