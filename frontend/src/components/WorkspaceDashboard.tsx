"use client";

import { motion } from "framer-motion";
import {
  FileText, Briefcase, Scale, Search, Users, ShieldCheck, Zap,
  ArrowRight, File, TrendingUp, AlertTriangle, Clock, UploadCloud, Bell,
  FileStack, ArrowUpRight, Star, ChevronRight, Activity, Gavel, BookOpen,
  CheckCircle2, Circle, Plus, FileSignature, Landmark, Calendar
} from "lucide-react";

const mockCases = [
  { id: 'CAS-8821', title: 'Sharma vs Reliance Industries', category: 'Corporate', status: 'Hearing Scheduled', date: 'Oct 14, 2026', color: 'bg-blue-100 text-blue-700' },
  { id: 'CAS-7543', title: 'Verma Property Estate Dispute', category: 'Civil', status: 'Drafting Petition', date: 'Oct 18, 2026', color: 'bg-amber-100 text-amber-700' },
  { id: 'CAS-6290', title: 'Mehta Inheritance Claim', category: 'Family', status: 'Under Review', date: 'Oct 22, 2026', color: 'bg-slate-100 text-slate-700' },
  { id: 'CAS-5100', title: 'State vs. R. Kapoor', category: 'Criminal', status: 'Bail Pending', date: 'Nov 02, 2026', color: 'bg-rose-100 text-rose-700' },
];

const mockLawyers = [
  { name: 'Adv. Priya Deshmukh', type: 'Corporate Law', rating: '4.9', img: 'PD' },
  { name: 'Adv. Anjali Kapoor', type: 'Family Law', rating: '4.8', img: 'AK' },
  { name: 'Adv. Rohan Iyer', type: 'Criminal Defense', rating: '4.7', img: 'RI' },
];

const recentActivity = [
  { label: 'Generated FIR Draft for CAS-5100', time: '2 hours ago' },
  { label: 'Queried IPC Section 420 for Corporate Fraud', time: '5 hours ago' },
  { label: 'Case CAS-8821 status changed to Hearing Scheduled', time: 'Yesterday' },
  { label: 'Lease_Agreement_v2.pdf analyzed by AI', time: '2 days ago' },
];

const staggerChildren = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } }
};

const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as any } }
};

export default function WorkspaceDashboard({ user, router, triggerChat, triggerPro }: any) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const username = user?.email ? user.email.split('@')[0] : 'User';

  return (
    <div className="flex flex-col w-full h-full overflow-y-auto custom-scrollbar bg-[#f8f9fa] text-[#0f172a] font-sans">
      <motion.div
        className="w-full max-w-[1400px] mx-auto px-6 md:px-12 py-10 pb-36 space-y-8"
        initial="hidden"
        animate="visible"
        variants={staggerChildren}
      >

        {/* ── HEADER ── */}
        <motion.div variants={fadeUp} className="flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#0f172a] mb-1.5">
              {greeting}, {username}.
            </h1>
            <p className="text-[15px] text-slate-500 font-medium">
              Here is what's happening in your legal workspace today.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={triggerPro}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all bg-white border border-slate-200 text-slate-600 hover:text-[#d4af37] hover:border-[#d4af37] hover:bg-amber-50 shadow-sm"
            >
              <ShieldCheck size={16} /> Upgrade to PRO
            </button>
          </div>
        </motion.div>

        {/* ── VERIFICATION BANNER ── */}
        {(user?.role === 'CITIZEN' || (user?.role === 'LAWYER' && user?.verificationStatus !== 'VERIFIED') || (user?.role === 'JUDGE' && user?.verificationStatus !== 'VERIFIED')) && (
          <motion.div variants={fadeUp}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl p-4 bg-rose-50 border border-rose-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-rose-100 text-rose-600">
                  <AlertTriangle size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-rose-900">Verification Pending</p>
                  <p className="text-xs text-rose-600 mt-0.5">Please complete your identity verification to enable filing and marketplace features.</p>
                </div>
              </div>
              <button className="shrink-0 px-4 py-1.5 rounded-lg text-xs font-semibold bg-white border border-rose-200 text-rose-700 hover:bg-rose-600 hover:text-white transition-colors shadow-sm">
                Verify Identity
              </button>
            </div>
          </motion.div>
        )}

        {/* ── QUICK ACTIONS (USER FRIENDLY) ── */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button onClick={triggerChat} className="flex flex-col p-5 rounded-2xl bg-white border border-slate-200 hover:shadow-md hover:border-[#d4af37] transition-all group text-left h-full">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Zap size={20} className="text-[#d4af37]" />
            </div>
            <h3 className="font-semibold text-[#0f172a] text-[15px] mb-1">New AI Consult</h3>
            <p className="text-xs text-slate-500 font-medium">Chat with Nyaay AI</p>
          </button>
          
          <button onClick={() => router.push('/search')} className="flex flex-col p-5 rounded-2xl bg-white border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all group text-left h-full">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform border border-slate-100">
              <Search size={20} className="text-slate-600" />
            </div>
            <h3 className="font-semibold text-[#0f172a] text-[15px] mb-1">Legal Database</h3>
            <p className="text-xs text-slate-500 font-medium">Search IPC, CrPC & Acts</p>
          </button>

          <button onClick={() => {/* Trigger upload logic */}} className="flex flex-col p-5 rounded-2xl bg-white border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all group text-left h-full">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform border border-slate-100">
              <FileSignature size={20} className="text-slate-600" />
            </div>
            <h3 className="font-semibold text-[#0f172a] text-[15px] mb-1">Analyze Document</h3>
            <p className="text-xs text-slate-500 font-medium">Extract insights from PDF</p>
          </button>

          <button onClick={() => router.push('/cases')} className="flex flex-col p-5 rounded-2xl bg-white border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all group text-left h-full">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform border border-slate-100">
              <Briefcase size={20} className="text-slate-600" />
            </div>
            <h3 className="font-semibold text-[#0f172a] text-[15px] mb-1">Case Management</h3>
            <p className="text-xs text-slate-500 font-medium">Manage active dockets</p>
          </button>
        </motion.div>

        {/* ── CLEAN METRICS ── */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Active Matters', value: '12' },
            { label: 'Saved Documents', value: '145' },
            { label: 'AI Inferences Used', value: '1,284' },
            { label: 'Upcoming Hearings', value: '3' },
          ].map((metric, i) => (
            <div key={i} className="px-5 py-4 rounded-xl bg-white border border-slate-200 flex flex-col justify-center">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">{metric.label}</span>
              <span className="text-2xl font-semibold text-[#0f172a] tracking-tight">{metric.value}</span>
            </div>
          ))}
        </motion.div>

        {/* ── MAIN LAYOUT SPLIT ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT CONTENT (Takes up 2/3) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Dockets Table */}
            <motion.div variants={fadeUp} className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
              <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100">
                <h3 className="text-[15px] font-bold text-[#0f172a]">Active Cases & Matters</h3>
                <button onClick={() => router.push('/cases')} className="text-xs font-semibold text-[#d4af37] hover:text-amber-500 transition-colors flex items-center gap-1">
                  View Directory <ArrowRight size={14} />
                </button>
              </div>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Matter</th>
                      <th className="px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {mockCases.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors cursor-pointer">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-[#0f172a] mb-0.5">{c.title}</span>
                            <span className="text-xs font-medium text-slate-400">{c.id}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-medium text-slate-600">{c.category}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${c.color}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 text-xs font-medium text-slate-500">
                            <Calendar size={13} className="text-slate-400" /> {c.date}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Recent Activity Timeline */}
            <motion.div variants={fadeUp} className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
               <h3 className="text-[15px] font-bold text-[#0f172a] mb-5">Latest Activity</h3>
               <div className="space-y-5 relative">
                  <div className="absolute top-2 bottom-2 left-2.5 w-px bg-slate-200" />
                  {recentActivity.map((act, i) => (
                    <div key={i} className="flex items-start gap-4 relative">
                      <div className="w-5 h-5 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center shrink-0 z-10 mt-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[13px] font-medium text-slate-700">{act.label}</p>
                        <p className="text-[11px] text-slate-400 mt-1">{act.time}</p>
                      </div>
                    </div>
                  ))}
               </div>
            </motion.div>

          </div>

          {/* RIGHT CONTENT (Takes up 1/3) */}
          <div className="space-y-6">

            {/* Usage Quota Card */}
            <motion.div variants={fadeUp} className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
               <h3 className="text-[13px] font-bold tracking-wide text-slate-700 uppercase mb-4 flex items-center gap-2">
                 <Zap size={14} className="text-[#d4af37]" /> Current Plan: Basic
               </h3>
               <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-medium text-slate-600">AI Tokens Used</span>
                      <span className="text-xs font-bold text-[#0f172a]">12k / 50k</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div className="bg-[#d4af37] h-1.5 rounded-full" style={{ width: '24%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-medium text-slate-600">Storage</span>
                      <span className="text-xs font-bold text-[#0f172a]">1.2 GB / 5 GB</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div className="bg-slate-800 h-1.5 rounded-full" style={{ width: '24%' }} />
                    </div>
                  </div>
               </div>
               <button onClick={triggerPro} className="w-full mt-6 py-2 rounded-lg text-xs font-bold bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors">
                 Manage Billing
               </button>
            </motion.div>

            {/* Counsel Network */}
            <motion.div variants={fadeUp} className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-[15px] font-bold text-[#0f172a]">Counsel Directory</h3>
                <button onClick={() => router.push('/marketplace')} className="text-xs text-slate-400 hover:text-[#0f172a] transition-colors font-semibold">View All</button>
              </div>
              <div className="space-y-4">
                {mockLawyers.map((l, i) => (
                  <div key={i} className="flex items-center gap-3 group cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 group-hover:bg-[#0f172a] group-hover:text-white group-hover:border-[#0f172a] transition-all">
                      {l.img}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[13px] font-bold text-[#0f172a] truncate">{l.name}</h4>
                      <p className="text-[11px] text-slate-500 font-medium truncate">{l.type}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded text-xs font-bold text-[#d4af37]">
                      <Star size={10} className="fill-[#d4af37]" /> {l.rating}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Quick Upload */}
            <motion.div variants={fadeUp} className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 relative overflow-hidden group hover:border-slate-300 transition-all cursor-pointer">
               <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-slate-50 rounded-full z-0 group-hover:scale-110 transition-transform" />
               <div className="relative z-10 flex flex-col items-start">
                 <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                   <UploadCloud size={18} className="text-slate-600" />
                 </div>
                 <h3 className="text-[15px] font-bold text-[#0f172a] mb-1">Process New Evidence</h3>
                 <p className="text-[12px] text-slate-500 font-medium mb-4">Upload PDFs or Docs for instant AI extraction & summary.</p>
                 <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-md group-hover:bg-slate-200 transition-colors">
                   Browse Files
                 </span>
               </div>
            </motion.div>

          </div>

        </div>

      </motion.div>
    </div>
  );
}
