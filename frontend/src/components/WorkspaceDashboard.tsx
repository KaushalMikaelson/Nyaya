"use client";

import { motion } from "framer-motion";
import {
  Zap, Search, FileSignature, Briefcase, Star, UploadCloud,
  AlertTriangle, ShieldCheck, ArrowRight, Calendar, Scale,
  TrendingUp, FileStack, Clock, Activity, Gavel, Users, Bell
} from "lucide-react";
import { Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({ subsets: ["latin"], style: ["normal", "italic"] });

// ── mock data ─────────────────────────────────────────────────────────────────

const mockCases = [
  { id: "CAS-8821", title: "Sharma vs Reliance Industries", category: "Corporate", status: "Hearing Scheduled", date: "Oct 14, 2026", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  { id: "CAS-7543", title: "Verma Property Estate Dispute", category: "Civil",      status: "Drafting Petition",  date: "Oct 18, 2026", color: "#d4af37", bg: "rgba(212,175,55,0.12)" },
  { id: "CAS-6290", title: "Mehta Inheritance Claim",       category: "Family",     status: "Under Review",       date: "Oct 22, 2026", color: "#a1a1aa", bg: "rgba(161,161,170,0.12)" },
  { id: "CAS-5100", title: "State vs. R. Kapoor",           category: "Criminal",   status: "Bail Pending",       date: "Nov 02, 2026", color: "#f43f5e", bg: "rgba(244,63,94,0.12)" },
];

const mockLawyers = [
  { name: "Adv. Priya Deshmukh", type: "Corporate Law",    rating: "4.9", initials: "PD" },
  { name: "Adv. Anjali Kapoor",  type: "Family Law",        rating: "4.8", initials: "AK" },
  { name: "Adv. Rohan Iyer",     type: "Criminal Defense",  rating: "4.7", initials: "RI" },
];

const recentActivity = [
  { label: "Generated FIR Draft for CAS-5100",                   time: "2 hours ago" },
  { label: "Queried IPC Section 420 for Corporate Fraud",         time: "5 hours ago" },
  { label: "Case CAS-8821 status changed to Hearing Scheduled",   time: "Yesterday"   },
  { label: "Lease_Agreement_v2.pdf analyzed by AI",               time: "2 days ago"  },
];

const metrics = [
  { label: "Active Matters",       value: "12",    icon: <Gavel       size={16} className="text-[#d4af37]"  />, color: "#d4af37"  },
  { label: "Saved Documents",      value: "145",   icon: <FileStack   size={16} className="text-indigo-400" />, color: "#818cf8"  },
  { label: "AI Queries Used",      value: "1,284", icon: <Activity    size={16} className="text-emerald-400"/>, color: "#34d399"  },
  { label: "Upcoming Hearings",    value: "3",     icon: <Clock       size={16} className="text-rose-400"   />, color: "#f43f5e"  },
];

// ── variants ──────────────────────────────────────────────────────────────────

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as any } },
};

// ── component ─────────────────────────────────────────────────────────────────

export default function WorkspaceDashboard({ user, router, triggerChat, triggerPro }: any) {
  const hour     = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const username = user?.email ? user.email.split("@")[0] : "User";

  return (
    <div
      className="flex flex-col w-full h-full overflow-y-auto"
      style={{ background: "#070b16", color: "#ededed" }}
    >
      {/* ── ambient orbs ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute", top: "10%", left: "5%",
            width: "45vw", height: "45vw",
            background: "#1a2b58",
            borderRadius: "50%",
            filter: "blur(140px)",
          }}
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.06, 0.12, 0.06] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          style={{
            position: "absolute", bottom: "5%", right: "5%",
            width: "35vw", height: "35vw",
            background: "#d4af37",
            borderRadius: "50%",
            filter: "blur(180px)",
          }}
        />
      </div>

      <motion.div
        className="relative z-10 w-full max-w-[1400px] mx-auto px-6 md:px-12 py-10 pb-36 space-y-8"
        initial="hidden"
        animate="visible"
        variants={stagger}
      >

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: "#7c6ef7" }}>
              NYAYA LEGAL WORKSPACE
            </p>
            <h1 className={`${playfair.className} text-4xl md:text-5xl font-medium text-white tracking-tight leading-tight`}>
              {greeting},&nbsp;
              <span style={{ color: "#d4af37", fontStyle: "italic" }}>{username}.</span>
            </h1>
            <p className="mt-2 text-sm" style={{ color: "#6a6a82" }}>
              Here is what's happening in your legal workspace today.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <motion.button
              whileHover={{ scale: 1.04, boxShadow: "0 0 30px rgba(212,175,55,0.4)" }}
              whileTap={{ scale: 0.97 }}
              onClick={triggerPro}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all"
              style={{
                background: "linear-gradient(135deg, #cfab35, #ece192)",
                color: "#070b16",
              }}
            >
              <ShieldCheck size={15} /> Upgrade to PRO
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push("/notifications")}
              className="w-10 h-10 rounded-full flex items-center justify-center relative"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <Bell size={16} style={{ color: "#a1a1aa" }} />
              <span
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                style={{ background: "#f43f5e", border: "1.5px solid #070b16" }}
              />
            </motion.button>
          </div>
        </motion.div>

        {/* ── VERIFICATION BANNER ─────────────────────────────────────────── */}
        {(user?.role === "CITIZEN" ||
          (user?.role === "LAWYER" && user?.verificationStatus !== "VERIFIED") ||
          (user?.role === "JUDGE"  && user?.verificationStatus !== "VERIFIED")) && (
          <motion.div variants={fadeUp}>
            <div
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl p-4"
              style={{
                background: "rgba(244,63,94,0.07)",
                border: "1px solid rgba(244,63,94,0.2)",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "rgba(244,63,94,0.15)" }}
                >
                  <AlertTriangle size={15} style={{ color: "#f43f5e" }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Verification Pending</p>
                  <p className="text-xs mt-0.5" style={{ color: "#f43f5e" }}>
                    Complete identity verification to unlock filing & marketplace features.
                  </p>
                </div>
              </div>
              <button
                className="shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-colors"
                style={{ background: "rgba(244,63,94,0.15)", color: "#f43f5e", border: "1px solid rgba(244,63,94,0.3)" }}
              >
                Verify Identity →
              </button>
            </div>
          </motion.div>
        )}

        {/* ── QUICK ACTIONS ───────────────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: <Zap size={22} style={{ color: "#d4af37" }} />, bg: "rgba(212,175,55,0.1)", border: "rgba(212,175,55,0.2)", label: "New AI Consult",    sub: "Chat with Nyaya AI",       action: triggerChat,                        glow: "rgba(212,175,55,0.3)" },
            { icon: <Search size={22} style={{ color: "#818cf8" }} />, bg: "rgba(129,140,248,0.1)", border: "rgba(129,140,248,0.2)", label: "Legal Database",   sub: "Search IPC, CrPC & Acts",  action: () => router.push("/search"),       glow: "rgba(99,102,241,0.3)" },
            { icon: <FileSignature size={22} style={{ color: "#34d399" }} />, bg: "rgba(52,211,153,0.1)", border: "rgba(52,211,153,0.2)", label: "Analyze Document", sub: "Extract insights from PDF", action: () => {},                           glow: "rgba(16,185,129,0.3)" },
            { icon: <Briefcase size={22} style={{ color: "#f43f5e" }} />, bg: "rgba(244,63,94,0.1)", border: "rgba(244,63,94,0.2)", label: "Case Management",  sub: "Manage active dockets",    action: () => router.push("/cases"),       glow: "rgba(244,63,94,0.3)" },
          ].map((item, i) => (
            <motion.button
              key={i}
              onClick={item.action}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -4, boxShadow: `0 12px 30px ${item.glow}` }}
              whileTap={{ scale: 0.97 }}
              className="flex flex-col p-5 rounded-2xl text-left relative overflow-hidden"
              style={{
                background: "rgba(13,18,36,0.8)",
                border: `1px solid ${item.border}`,
                backdropFilter: "blur(10px)",
              }}
            >
              <motion.div
                animate={{ opacity: [0.05, 0.12, 0.05] }}
                transition={{ duration: 3, repeat: Infinity, delay: i * 0.6 }}
                className="absolute inset-0 pointer-events-none"
                style={{ background: `radial-gradient(ellipse at top left, ${item.glow} 0%, transparent 70%)` }}
              />
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 relative"
                style={{ background: item.bg, border: `1px solid ${item.border}` }}
              >
                {item.icon}
              </div>
              <h3 className="font-bold text-white text-[14px] mb-1">{item.label}</h3>
              <p className="text-xs" style={{ color: "#6a6a82" }}>{item.sub}</p>
            </motion.button>
          ))}
        </motion.div>

        {/* ── METRICS ROW ─────────────────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metrics.map((m, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -4 }}
              className="px-5 py-4 rounded-2xl flex items-center gap-4"
              style={{
                background: "rgba(13,18,36,0.8)",
                border: "1px solid rgba(30,38,66,1)",
                backdropFilter: "blur(10px)",
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${m.color}18`, border: `1px solid ${m.color}30` }}
              >
                {m.icon}
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#6a6a82" }}>
                  {m.label}
                </span>
                <div className="text-2xl font-bold text-white tracking-tight">{m.value}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* ── MAIN GRID ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT — 2/3 */}
          <div className="lg:col-span-2 space-y-6">

            {/* Cases Table */}
            <motion.div
              variants={fadeUp}
              className="rounded-2xl overflow-hidden"
              style={{
                background: "rgba(13,18,36,0.8)",
                border: "1px solid rgba(30,38,66,1)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div
                className="flex justify-between items-center px-6 py-5"
                style={{ borderBottom: "1px solid rgba(30,38,66,1)" }}
              >
                <h3 className={`${playfair.className} text-lg text-white font-medium`}>
                  Active Cases &amp; Matters
                </h3>
                <button
                  onClick={() => router.push("/cases")}
                  className="flex items-center gap-1 text-xs font-semibold transition-colors"
                  style={{ color: "#d4af37" }}
                >
                  View All <ArrowRight size={13} />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                      {["Matter", "Category", "Status", "Date"].map((h, i) => (
                        <th
                          key={h}
                          className={`px-6 py-3 text-[10px] font-bold uppercase tracking-widest ${i === 3 ? "text-right" : ""}`}
                          style={{ color: "#4a4a62" }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mockCases.map((c, i) => (
                      <motion.tr
                        key={c.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + i * 0.07 }}
                        className="cursor-pointer transition-colors"
                        style={{ borderTop: "1px solid rgba(255,255,255,0.03)" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.025)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-white">{c.title}</span>
                            <span className="text-xs mt-0.5" style={{ color: "#4a4a62" }}>{c.id}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-medium" style={{ color: "#a1a1aa" }}>{c.category}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                            style={{ color: c.color, background: c.bg }}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 text-xs font-medium" style={{ color: "#4a4a62" }}>
                            <Calendar size={12} /> {c.date}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Activity Timeline */}
            <motion.div
              variants={fadeUp}
              className="rounded-2xl p-6"
              style={{
                background: "rgba(13,18,36,0.8)",
                border: "1px solid rgba(30,38,66,1)",
                backdropFilter: "blur(12px)",
              }}
            >
              <h3 className={`${playfair.className} text-lg text-white font-medium mb-6`}>
                Latest Activity
              </h3>
              <div className="space-y-5 relative">
                <div
                  className="absolute top-2 bottom-2 left-2.5 w-px"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                />
                {recentActivity.map((act, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.07 }}
                    className="flex items-start gap-4 relative"
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 z-10 mt-0.5"
                      style={{ background: "#0d1224", border: "1.5px solid rgba(212,175,55,0.4)" }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#d4af37" }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] font-medium" style={{ color: "#c1c1cc" }}>{act.label}</p>
                      <p className="text-[11px] mt-1" style={{ color: "#4a4a62" }}>{act.time}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* RIGHT — 1/3 */}
          <div className="space-y-6">

            {/* Plan Card */}
            <motion.div
              variants={fadeUp}
              className="rounded-2xl p-6 relative overflow-hidden"
              style={{
                background: "rgba(13,18,36,0.8)",
                border: "1px solid rgba(30,38,66,1)",
                backdropFilter: "blur(12px)",
              }}
            >
              <motion.div
                animate={{ opacity: [0.06, 0.14, 0.06] }}
                transition={{ duration: 5, repeat: Infinity }}
                className="absolute inset-0 pointer-events-none rounded-2xl"
                style={{ background: "radial-gradient(ellipse at top right, rgba(212,175,55,0.1), transparent)" }}
              />
              <div className="flex items-center gap-2 mb-5">
                <Zap size={14} style={{ color: "#d4af37" }} />
                <h3 className="text-[11px] font-bold tracking-widest uppercase" style={{ color: "#4a4a62" }}>
                  Current Plan: Basic
                </h3>
              </div>
              <div className="space-y-4">
                {[
                  { label: "AI Tokens Used",  used: "12k",  total: "50k", pct: 24, color: "#d4af37" },
                  { label: "Storage",          used: "1.2GB", total: "5GB", pct: 24, color: "#818cf8" },
                ].map((bar) => (
                  <div key={bar.label}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-medium" style={{ color: "#a1a1aa" }}>{bar.label}</span>
                      <span className="text-xs font-bold text-white">{bar.used} / {bar.total}</span>
                    </div>
                    <div
                      className="w-full rounded-full h-1.5"
                      style={{ background: "rgba(255,255,255,0.06)" }}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${bar.pct}%` }}
                        transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
                        className="h-1.5 rounded-full"
                        style={{ background: bar.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <motion.button
                whileHover={{ boxShadow: "0 0 20px rgba(212,175,55,0.3)" }}
                onClick={triggerPro}
                className="w-full mt-6 py-2.5 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: "linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))",
                  border: "1px solid rgba(212,175,55,0.3)",
                  color: "#d4af37",
                }}
              >
                Manage Billing →
              </motion.button>
            </motion.div>

            {/* Counsel Directory */}
            <motion.div
              variants={fadeUp}
              className="rounded-2xl p-6"
              style={{
                background: "rgba(13,18,36,0.8)",
                border: "1px solid rgba(30,38,66,1)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div className="flex justify-between items-center mb-5">
                <h3 className={`${playfair.className} text-lg text-white font-medium`}>Counsel Directory</h3>
                <button
                  onClick={() => router.push("/marketplace")}
                  className="text-xs font-semibold transition-colors"
                  style={{ color: "#4a4a62" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#d4af37")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#4a4a62")}
                >
                  View All
                </button>
              </div>
              <div className="space-y-4">
                {mockLawyers.map((l, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.08 }}
                    whileHover={{ x: 3 }}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all"
                      style={{
                        background: "rgba(212,175,55,0.1)",
                        border: "1px solid rgba(212,175,55,0.2)",
                        color: "#d4af37",
                      }}
                    >
                      {l.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[13px] font-bold text-white truncate">{l.name}</h4>
                      <p className="text-[11px] font-medium truncate" style={{ color: "#4a4a62" }}>{l.type}</p>
                    </div>
                    <div
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold shrink-0"
                      style={{ background: "rgba(212,175,55,0.1)", color: "#d4af37" }}
                    >
                      <Star size={10} className="fill-[#d4af37]" /> {l.rating}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Upload Card */}
            <motion.div
              variants={fadeUp}
              whileHover={{ y: -4, boxShadow: "0 16px 40px rgba(99,102,241,0.15)" }}
              className="rounded-2xl p-6 cursor-pointer relative overflow-hidden group"
              style={{
                background: "rgba(13,18,36,0.8)",
                border: "1px solid rgba(99,102,241,0.2)",
                backdropFilter: "blur(12px)",
              }}
            >
              <motion.div
                animate={{ opacity: [0.04, 0.1, 0.04] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute inset-0 pointer-events-none rounded-2xl"
                style={{ background: "radial-gradient(ellipse at bottom right, rgba(99,102,241,0.15), transparent)" }}
              />
              <div className="relative z-10 flex flex-col items-start">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}
                >
                  <UploadCloud size={20} style={{ color: "#818cf8" }} />
                </div>
                <h3 className="text-[15px] font-bold text-white mb-1">Process New Evidence</h3>
                <p className="text-[12px] mb-5" style={{ color: "#6a6a82" }}>
                  Upload PDFs or Docs for instant AI extraction &amp; summary.
                </p>
                <span
                  className="text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors"
                  style={{
                    background: "rgba(99,102,241,0.1)",
                    color: "#818cf8",
                    border: "1px solid rgba(99,102,241,0.2)",
                  }}
                >
                  Browse Files →
                </span>
              </div>
            </motion.div>

          </div>
        </div>
      </motion.div>
    </div>
  );
}
