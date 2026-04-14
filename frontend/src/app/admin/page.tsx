"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { motion } from "framer-motion";
import {
  Scale, LogOut, Users, Shield, Gavel, CheckCircle2,
  Clock, XCircle, UserCheck, Building2, RefreshCw,
  Crown, AlertTriangle, Activity, CreditCard, Ban, ArrowRight, Briefcase
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';

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

interface PlatformUser {
  id: string; email: string; role: string; isActive: boolean;
  isEmailVerified: boolean; isPro: boolean; createdAt: string;
}

// ─────────────────────────────────────────
// RECHARTS MOCK DATA
// ─────────────────────────────────────────
const revenueData = [
  { name: 'Jan', ProSubs: 4000, Marketplace: 2400 },
  { name: 'Feb', ProSubs: 5000, Marketplace: 1398 },
  { name: 'Mar', ProSubs: 6000, Marketplace: 3800 },
  { name: 'Apr', ProSubs: 7000, Marketplace: 3908 },
  { name: 'May', ProSubs: 8500, Marketplace: 4800 },
  { name: 'Jun', ProSubs: 11000, Marketplace: 3800 },
];

const activityData = [
  { name: '12am', queries: 20 }, { name: '4am', queries: 10 },
  { name: '8am', queries: 60 }, { name: '12pm', queries: 110 },
  { name: '4pm', queries: 150 }, { name: '8pm', queries: 90 }
];

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

  const [activeTab, setActiveTab] = useState<'verifications' | 'users' | 'billing'>('verifications');

  const [stats, setStats] = useState<Stats | null>(null);
  
  // Verification State
  const [pendingLawyers, setPendingLawyers] = useState<PendingLawyer[]>([]);
  const [pendingJudges, setPendingJudges] = useState<PendingJudge[]>([]);
  const [vTab, setVTab] = useState<"lawyers" | "judges">("lawyers");

  // User Management
  const [allUsers, setAllUsers] = useState<PlatformUser[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "ADMIN")) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, lawyersRes, judgesRes, usersRes] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/pending/lawyers"),
        api.get("/admin/pending/judges"),
        api.get("/admin/users?limit=50"), // Initial fetch
      ]);
      setStats(statsRes.data);
      setPendingLawyers(lawyersRes.data.lawyers || []);
      setPendingJudges(judgesRes.data.judges || []);
      setAllUsers(usersRes.data.users || []);
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
      await api.post(`/admin/verify/${type}/${userId}`, { action });
      await fetchAll();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUserToggle = async (userId: string, currentStatus: boolean) => {
    setActionLoading(`user-${userId}`);
    try {
       const url = currentStatus ? `/admin/users/${userId}/suspend` : `/admin/users/${userId}/reactivate`;
       await api.post(url);
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
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(245,158,11,0.06) 0%, transparent 70%)" }} />
      </div>

      <header className="sticky top-0 z-40 px-6 h-16 flex items-center justify-between"
        style={{ background: "rgba(7,7,13,0.92)", borderBottom: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(16px)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-600 shadow-[0_0_20px_rgba(245,158,11,0.4)]">
            <Scale size={15} className="text-white" />
          </div>
          <span className="text-base font-bold text-white tracking-widest uppercase">Nyaya Admin Panel</span>
        </div>

        <nav className="hidden md:flex items-center gap-2">
           <button onClick={() => setActiveTab('verifications')} className={`px-4 py-2 text-sm font-semibold rounded-full transition-all ${activeTab === 'verifications' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'text-slate-400 hover:text-slate-200'}`}>Verifications</button>
           <button onClick={() => setActiveTab('users')} className={`px-4 py-2 text-sm font-semibold rounded-full transition-all ${activeTab === 'users' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'text-slate-400 hover:text-slate-200'}`}>User Management</button>
           <button onClick={() => setActiveTab('billing')} className={`px-4 py-2 text-sm font-semibold rounded-full transition-all ${activeTab === 'billing' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'text-slate-400 hover:text-slate-200'}`}>Analytics & Billing</button>
        </nav>

        <div className="flex items-center gap-4">
          <button onClick={fetchAll} disabled={loading} className="p-2 rounded-lg text-slate-400 hover:text-amber-400 transition-colors">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Crown size={12} /> {user.email}
          </div>
          <button onClick={() => { logout(); router.push('/login'); }} className="p-2 rounded-lg text-slate-400 hover:text-red-500 transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">

        {stats && activeTab === 'verifications' && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="#6366f1" />
              <StatCard icon={Shield} label="Lawyers" value={stats.totalLawyers}
                color="#8b5cf6" sub={`${stats.verifiedLawyers} verified`} />
              <StatCard icon={Gavel} label="Judges" value={stats.totalJudges} color="#4ade80" />
              <StatCard icon={Clock} label="Pending Reviews"
                value={stats.pendingLawyers + stats.pendingJudges}
                color="#f59e0b"
                sub={`${stats.pendingLawyers} lawyers · ${stats.pendingJudges} judges`} />
            </div>

            <div className="bg-[#111827] rounded-3xl overflow-hidden border border-slate-800">
              <div className="flex border-b border-slate-800">
                {(["lawyers", "judges"] as const).map(t => (
                  <button key={t} onClick={() => setVTab(t)}
                    className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-all ${vTab === t ? 'text-amber-400 border-b-2 border-amber-400 bg-slate-800/30' : 'text-slate-400 border-b-2 border-transparent hover:text-slate-200'}`}>
                    {t === "lawyers" ? <Shield size={16} /> : <Gavel size={16} />}
                    {t === "lawyers" ? "Pending Lawyers" : "Pending Judges"}
                    {(t === "lawyers" ? pendingLawyers.length : pendingJudges.length) > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-500">
                        {t === "lawyers" ? pendingLawyers.length : pendingJudges.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="divide-y divide-slate-800/50 min-h-[400px]">
                {vTab === "lawyers" && (
                  pendingLawyers.length === 0 ? (
                    <div className="py-24 text-center">
                      <CheckCircle2 size={40} className="mx-auto mb-4 text-emerald-500/50" />
                      <p className="text-slate-400">Queue empty - all caught up!</p>
                    </div>
                  ) : pendingLawyers.map(lawyer => (
                    <div key={lawyer.id} className="p-6 flex items-start gap-4 hover:bg-slate-800/20 transition-colors">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-bold text-lg text-white font-serif bg-gradient-to-br from-indigo-500 to-purple-600">
                        {(lawyer.fullName || lawyer.user.email)[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-base">{lawyer.fullName || "—"}</p>
                        <p className="text-sm text-slate-500">{lawyer.user.email}</p>
                        <div className="flex flex-wrap gap-3 mt-3">
                          <span className="text-xs flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 rounded-md border border-slate-800 text-slate-400">
                            <Shield size={12} className="text-indigo-400"/> {lawyer.barCouncilNumber}
                          </span>
                          {lawyer.barCouncilState && (
                            <span className="text-xs flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 rounded-md border border-slate-800 text-slate-400">
                              <Building2 size={12} className="text-amber-400"/> {lawyer.barCouncilState}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <button onClick={() => handleAction("lawyer", lawyer.user.id, "approve")} disabled={!!actionLoading} 
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                          {actionLoading === `lawyer-${lawyer.user.id}-approve` ? <RefreshCw size={16} className="animate-spin" /> : <><UserCheck size={16} /> Approve</>}
                        </button>
                        <button onClick={() => handleAction("lawyer", lawyer.user.id, "reject")} disabled={!!actionLoading} 
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-colors">
                          {actionLoading === `lawyer-${lawyer.user.id}-reject` ? <RefreshCw size={16} className="animate-spin" /> : <><XCircle size={16} /> Reject</>}
                        </button>
                      </div>
                    </div>
                  ))
                )}
                
                {vTab === "judges" && (
                   pendingJudges.length === 0 ? (
                    <div className="py-24 text-center">
                      <CheckCircle2 size={40} className="mx-auto mb-4 text-emerald-500/50" />
                      <p className="text-slate-400">No judges pending verification</p>
                    </div>
                  ) : pendingJudges.map(judge => (
                     // Similar structure mapped out...
                     <div key={judge.id} className="p-6 flex items-start gap-4 hover:bg-slate-800/20 transition-colors">
                       <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-bold text-lg text-white font-serif bg-gradient-to-br from-amber-500 to-rose-600">
                         {(judge.fullName || judge.user.email)[0].toUpperCase()}
                       </div>
                       <div className="flex-1">
                         <p className="font-bold text-white text-base">{judge.fullName || "—"}</p>
                         <p className="text-sm text-slate-500">{judge.user.email}</p>
                         <p className="text-xs text-slate-400 mt-2 bg-slate-900 px-3 py-1 rounded inline-block border border-slate-800">{judge.court} · {judge.courtLevel}</p>
                       </div>
                       <div className="flex flex-col gap-2 shrink-0">
                          <button onClick={() => handleAction("judge", judge.user.id, "approve")}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20">
                            <UserCheck size={16} /> Approve
                          </button>
                       </div>
                     </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* User Management Tab */}
        {activeTab === 'users' && (
          <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}}>
            <div className="bg-[#111827] border border-slate-800 rounded-3xl p-6">
               <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><Users className="text-blue-500" /> Platform Accounts</h2>
               <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                   <thead>
                     <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                       <th className="pb-4 font-semibold">User Details</th>
                       <th className="pb-4 font-semibold">Role</th>
                       <th className="pb-4 font-semibold">Status</th>
                       <th className="pb-4 font-semibold text-right">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-800/40">
                     {allUsers.map(u => (
                       <tr key={u.id} className="hover:bg-slate-800/10 transition-colors group">
                          <td className="py-4">
                            <div className="flex flex-col">
                               <span className="text-sm font-semibold text-slate-200">{u.email}</span>
                               <span className="text-[10px] text-slate-500 font-mono mt-0.5">{u.id}</span>
                            </div>
                          </td>
                          <td className="py-4">
                            <span className={`px-2.5 py-1 text-xs font-bold rounded-md border 
                              ${u.role === 'ADMIN' ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' : 
                                u.role === 'LAWYER' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' :
                                u.role === 'JUDGE' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                                'bg-slate-800 text-slate-300 border-slate-700'}`}>
                               {u.role} {u.isPro && '★ PRO'}
                            </span>
                          </td>
                          <td className="py-4">
                             {u.isActive ? (
                               <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                                 <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div> Active
                               </span>
                             ) : (
                               <span className="flex items-center gap-1.5 text-xs text-red-500 font-medium">
                                 <div className="w-2 h-2 rounded-full bg-red-600"></div> Suspended
                               </span>
                             )}
                          </td>
                          <td className="py-4 text-right">
                            {u.role !== 'ADMIN' && (
                               <button 
                                 onClick={() => handleUserToggle(u.id, u.isActive)}
                                 disabled={!!actionLoading}
                                 className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-50
                                  ${u.isActive 
                                    ? 'bg-red-500/10 text-red-500 border-red-500/30 hover:bg-red-500/20' 
                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'}`}>
                                  {actionLoading === `user-${u.id}` ? <RefreshCw size={14} className="animate-spin inline mr-1"/> : null}
                                  {u.isActive ? 'Suspend' : 'Reactivate'}
                               </button>
                            )}
                          </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          </motion.div>
        )}

        {/* Analytics & Billing Tab */}
        {activeTab === 'billing' && (
          <motion.div initial={{opacity:0, scale:0.98}} animate={{opacity:1, scale:1}} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <div className="bg-[#111827] border border-slate-800 rounded-3xl p-6 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2"><CreditCard className="text-emerald-400"/> Revenue Trajectory</h2>
                <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md font-bold">+24% YoY</span>
              </div>
              <div className="flex-1 w-full h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value/1000}k`} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey="ProSubs" name="PRO Subscriptions" stackId="a" fill="#0ea5e9" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="Marketplace" name="Marketplace Fees" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-[#111827] border border-slate-800 rounded-3xl p-6 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                 <h2 className="text-xl font-bold text-white flex items-center gap-2"><Activity className="text-indigo-400"/> AI Queries Logged</h2>
              </div>
              <div className="flex-1 w-full h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                    <Line type="monotone" dataKey="queries" name="Queries Processed" stroke="#6366f1" strokeWidth={4} dot={{ r: 4, fill: '#6366f1', strokeWidth: 2 }} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className="bg-gradient-to-br from-emerald-950 to-[#111827] border border-emerald-900/50 rounded-2xl p-6">
                  <p className="text-sm font-semibold text-emerald-400 mb-1">Total Verified Revenue</p>
                  <p className="text-4xl font-bold text-white">₹1.4M</p>
               </div>
               <div className="bg-gradient-to-br from-indigo-950 to-[#111827] border border-indigo-900/50 rounded-2xl p-6">
                  <p className="text-sm font-semibold text-indigo-400 mb-1">PRO Users</p>
                  <p className="text-4xl font-bold text-white">{allUsers.filter(u => u.isPro).length} <span className="text-sm text-indigo-300 font-normal ml-2">Active</span></p>
               </div>
               <div className="bg-gradient-to-br from-rose-950 to-[#111827] border border-rose-900/50 rounded-2xl p-6">
                  <p className="text-sm font-semibold text-rose-400 mb-1">Blocked Accounts</p>
                  <p className="text-4xl font-bold text-white">{allUsers.filter(u => !u.isActive).length} <span className="text-sm text-rose-300 font-normal ml-2">Suspended</span></p>
               </div>
            </div>

          </motion.div>
        )}

      </div>
    </div>
  );
}
