"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { motion } from "framer-motion";
import {
  Scale, LogOut, Users, Shield, Gavel, CheckCircle2,
  Clock, XCircle, UserCheck, Building2, RefreshCw,
  ChevronRight, Crown, AlertTriangle,
} from "lucide-react";

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────

interface Stats {
  totalUsers: number;
  totalCitizens: number;
  totalLawyers: number;
  totalJudges: number;
  pendingLawyers: number;
  pendingJudges: number;
  verifiedLawyers: number;
}

interface PendingLawyer {
  id: string; fullName: string; barCouncilNumber: string;
  barCouncilState: string; verificationStatus: string;
  user: { id: string; email: string; createdAt: string; isEmailVerified: boolean };
}

interface PendingJudge {
  id: string; fullName: string; governmentId: string;
  court: string; courtLevel: string; verificationStatus: string;
  user: { id: string; email: string; createdAt: string; isEmailVerified: boolean };
}

// ─────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color, sub }: {
  icon: React.ElementType; label: string; value: number | string;
  color: string; sub?: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${color}18`, border: `1px solid ${color}33` }}>
          <Icon size={16} style={{ color }} />
        </div>
        <span className="text-xs font-medium" style={{ color: "#5a5a70" }}>{label}</span>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: "#4a4a60" }}>{sub}</p>}
    </motion.div>
  );
}

// ─────────────────────────────────────────
// MAIN ADMIN DASHBOARD
// ─────────────────────────────────────────

export default function AdminDashboard() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<Stats | null>(null);
  const [pendingLawyers, setPendingLawyers] = useState<PendingLawyer[]>([]);
  const [pendingJudges, setPendingJudges] = useState<PendingJudge[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [tab, setTab] = useState<"lawyers" | "judges">("lawyers");

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "ADMIN")) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, lawyersRes, judgesRes] = await Promise.all([
        api.get("/api/admin/stats"),
        api.get("/api/admin/pending/lawyers"),
        api.get("/api/admin/pending/judges"),
      ]);
      setStats(statsRes.data);
      setPendingLawyers(lawyersRes.data.lawyers || []);
      setPendingJudges(judgesRes.data.judges || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "ADMIN") fetchAll();
  }, [user, fetchAll]);

  const handleAction = async (type: "lawyer" | "judge", userId: string, action: "approve" | "reject") => {
    setActionLoading(`${type}-${userId}-${action}`);
    try {
      await api.post(`/api/admin/verify/${type}/${userId}`, { action });
      await fetchAll();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading || (!user || user.role !== "ADMIN")) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#070b16" }}>
        <div className="w-10 h-10 rounded-full border-2 border-yellow-500/30 border-t-yellow-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#070b16" }}>
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(245,158,11,0.06) 0%, transparent 70%)" }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 px-6 h-14 flex items-center justify-between"
        style={{ background: "rgba(7,7,13,0.92)", borderBottom: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(16px)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", boxShadow: "0 0 20px rgba(245,158,11,0.4)" }}>
            <Scale size={15} className="text-white" />
          </div>
          <span className="text-base font-bold text-white">Nyaya</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.25)" }}>
            ADMIN
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={fetchAll} disabled={loading}
            className="p-2 rounded-lg transition-colors" style={{ color: "#5a5a70" }}
            onMouseOver={e => (e.currentTarget.style.color = "#fbbf24")}
            onMouseOut={e => (e.currentTarget.style.color = "#5a5a70")}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full"
            style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#fbbf24" }}>
            <Crown size={12} />
            {user.email}
          </div>
          <button onClick={logout} className="p-2 rounded-lg transition-colors" style={{ color: "#5a5a70" }}
            onMouseOver={e => (e.currentTarget.style.color = "#ef4444")}
            onMouseOut={e => (e.currentTarget.style.color = "#5a5a70")}>
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">Admin Dashboard</h1>
          <p className="text-sm" style={{ color: "#6a6a80" }}>
            Manage lawyer and judge verifications, and platform users.
          </p>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="#6366f1" />
            <StatCard icon={Shield} label="Lawyers" value={stats.totalLawyers}
              color="#8b5cf6" sub={`${stats.verifiedLawyers} verified`} />
            <StatCard icon={Gavel} label="Judges" value={stats.totalJudges} color="#d4af37" />
            <StatCard icon={Clock} label="Pending Reviews"
              value={stats.pendingLawyers + stats.pendingJudges}
              color="#f59e0b"
              sub={`${stats.pendingLawyers} lawyers · ${stats.pendingJudges} judges`} />
          </div>
        )}

        {/* Pending Verifications */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>

          {/* Tab bar */}
          <div className="flex border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            {(["lawyers", "judges"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-all"
                style={tab === t
                  ? { color: "#fbbf24", borderBottom: "2px solid #f59e0b" }
                  : { color: "#4a4a60", borderBottom: "2px solid transparent" }}>
                {t === "lawyers" ? <Shield size={15} /> : <Gavel size={15} />}
                Pending {t === "lawyers" ? "Lawyers" : "Judges"}
                {t === "lawyers" && pendingLawyers.length > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                    style={{ background: "rgba(245,158,11,0.2)", color: "#fbbf24" }}>
                    {pendingLawyers.length}
                  </span>
                )}
                {t === "judges" && pendingJudges.length > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                    style={{ background: "rgba(245,158,11,0.2)", color: "#fbbf24" }}>
                    {pendingJudges.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            {tab === "lawyers" && (
              pendingLawyers.length === 0 ? (
                <div className="py-16 text-center">
                  <CheckCircle2 size={32} className="mx-auto mb-3" style={{ color: "#22c55e", opacity: 0.5 }} />
                  <p className="text-sm" style={{ color: "#4a4a60" }}>No pending lawyer verifications</p>
                </div>
              ) : pendingLawyers.map(lawyer => (
                <div key={lawyer.id} className="p-5 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm text-white"
                    style={{ background: "linear-gradient(135deg,#7c6ef7,#d4af37)" }}>
                    {(lawyer.fullName || lawyer.user.email)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm">{lawyer.fullName || "—"}</p>
                    <p className="text-xs" style={{ color: "#6a6a80" }}>{lawyer.user.email}</p>
                    <div className="flex flex-wrap gap-3 mt-2">
                      <span className="text-xs flex items-center gap-1" style={{ color: "#5a5a70" }}>
                        <Shield size={12} /> {lawyer.barCouncilNumber}
                      </span>
                      {lawyer.barCouncilState && (
                        <span className="text-xs flex items-center gap-1" style={{ color: "#5a5a70" }}>
                          <Building2 size={12} /> {lawyer.barCouncilState}
                        </span>
                      )}
                      <span className="text-xs flex items-center gap-1"
                        style={{ color: lawyer.user.isEmailVerified ? "#22c55e" : "#ef4444" }}>
                        {lawyer.user.isEmailVerified ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        Email {lawyer.user.isEmailVerified ? "verified" : "not verified"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <motion.button
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => handleAction("lawyer", lawyer.user.id, "approve")}
                      disabled={!!actionLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                      style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#4ade80" }}>
                      {actionLoading === `lawyer-${lawyer.user.id}-approve`
                        ? <RefreshCw size={12} className="animate-spin" />
                        : <><UserCheck size={12} /> Approve</>}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => handleAction("lawyer", lawyer.user.id, "reject")}
                      disabled={!!actionLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                      style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}>
                      {actionLoading === `lawyer-${lawyer.user.id}-reject`
                        ? <RefreshCw size={12} className="animate-spin" />
                        : <><XCircle size={12} /> Reject</>}
                    </motion.button>
                  </div>
                </div>
              ))
            )}

            {tab === "judges" && (
              pendingJudges.length === 0 ? (
                <div className="py-16 text-center">
                  <CheckCircle2 size={32} className="mx-auto mb-3" style={{ color: "#22c55e", opacity: 0.5 }} />
                  <p className="text-sm" style={{ color: "#4a4a60" }}>No pending judge verifications</p>
                </div>
              ) : pendingJudges.map(judge => (
                <div key={judge.id} className="p-5 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm text-white"
                    style={{ background: "linear-gradient(135deg,#d4af37,#7c3aed)" }}>
                    {(judge.fullName || judge.user.email)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm">{judge.fullName || "—"}</p>
                    <p className="text-xs" style={{ color: "#6a6a80" }}>{judge.user.email}</p>
                    <div className="flex flex-wrap gap-3 mt-2">
                      <span className="text-xs flex items-center gap-1" style={{ color: "#5a5a70" }}>
                        <Shield size={12} /> {judge.governmentId}
                      </span>
                      {judge.court && (
                        <span className="text-xs flex items-center gap-1" style={{ color: "#5a5a70" }}>
                          <Gavel size={12} /> {judge.court}{judge.courtLevel ? ` · ${judge.courtLevel}` : ""}
                        </span>
                      )}
                      <span className="text-xs flex items-center gap-1"
                        style={{ color: judge.user.isEmailVerified ? "#22c55e" : "#ef4444" }}>
                        {judge.user.isEmailVerified ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                        Email {judge.user.isEmailVerified ? "verified" : "not verified"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <motion.button
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => handleAction("judge", judge.user.id, "approve")}
                      disabled={!!actionLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                      style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#4ade80" }}>
                      {actionLoading === `judge-${judge.user.id}-approve`
                        ? <RefreshCw size={12} className="animate-spin" />
                        : <><UserCheck size={12} /> Approve</>}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => handleAction("judge", judge.user.id, "reject")}
                      disabled={!!actionLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                      style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}>
                      {actionLoading === `judge-${judge.user.id}-reject`
                        ? <RefreshCw size={12} className="animate-spin" />
                        : <><XCircle size={12} /> Reject</>}
                    </motion.button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          {[
            { icon: Users, label: "All Users", desc: "Browse and manage all platform users", href: "#" },
            { icon: Crown, label: "Send Admin Invite", desc: "Invite a new administrator by email", href: "#" },
          ].map(({ icon: Icon, label, desc, href }) => (
            <a key={label} href={href}
              className="flex items-center gap-3 p-4 rounded-2xl transition-all cursor-pointer"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
              onMouseOver={e => { e.currentTarget.style.borderColor = "rgba(245,158,11,0.25)"; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
                <Icon size={16} style={{ color: "#f59e0b" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="text-xs" style={{ color: "#5a5a70" }}>{desc}</p>
              </div>
              <ChevronRight size={14} style={{ color: "#4a4a60" }} />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
