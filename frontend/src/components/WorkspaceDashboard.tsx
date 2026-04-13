"use client";

import { motion } from "framer-motion";
import { 
  FileText, Briefcase, Scale, Search, Users, ShieldCheck, Zap, 
  ArrowRight, File, TrendingUp, AlertTriangle, Fingerprint, Clock, UploadCloud, Bell, FileStack
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from "recharts";
import BillingCard from "./BillingCard";

const queryData = [
  { name: 'M', queries: 4 },
  { name: 'T', queries: 7 },
  { name: 'W', queries: 5 },
  { name: 'T', queries: 12 },
  { name: 'F', queries: 8 },
  { name: 'S', queries: 15 },
  { name: 'S', queries: 10 },
];

const distributeData = [
  { name: 'Corporate', val: 30 },
  { name: 'Criminal', val: 15 },
  { name: 'Family', val: 20 },
  { name: 'Property', val: 35 },
];

const mockCases = [
  { id: 'CAS-8821', title: 'Sharma vs Reliance', status: 'Hearing', date: 'Oct 14, 2026' },
  { id: 'CAS-7543', title: 'Verma Property Dispute', status: 'Drafting', date: 'Oct 18, 2026' },
];

const mockLawyers = [
  { name: 'Adv. Priya Deshmukh', type: 'Corporate Law', rating: 4.9, img: 'PD' },
  { name: 'Adv. Anjali Kapoor', type: 'Family Law', rating: 4.8, img: 'AK' },
  { name: 'Adv. Rohan Iyer', type: 'Criminal Defense', rating: 4.7, img: 'RI' },
];

export default function WorkspaceDashboard({ user, router, triggerChat, triggerPro }: any) {
  return (
    <div className="flex flex-col w-full h-full overflow-y-auto custom-scrollbar">
      <div className="space-y-8 w-full max-w-6xl mx-auto px-4 md:px-8 py-8 pb-32">
        
        {/* Hero Welcome */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-[#ededed] tracking-tight">
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user.email.split('@')[0]}
            </h1>
            <p className="text-[#a1a1aa] mt-1 text-[15px]">Here's what's happening in your legal workspace today.</p>
          </div>
          <button onClick={triggerChat} className="flex flex-center gap-2 bg-[#ededed] text-black px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-white transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] glow-effect">
            <Zap size={16} className="text-yellow-500" /> Ask AI Assistant
          </button>
        </div>

        {/* Action Required Logic */}
        {(user.role === 'CITIZEN' || (user.role === 'LAWYER' && user.verificationStatus !== 'VERIFIED') || (user.role === 'JUDGE' && user.verificationStatus !== 'VERIFIED')) && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center justify-between">
             <div className="flex items-center gap-3">
               <AlertTriangle className="text-red-400" size={20} />
               <div>
                  <h3 className="text-sm font-semibold text-red-200">Action Required</h3>
                  <p className="text-xs text-red-300/70">Complete your profile verification to unlock all features.</p>
               </div>
             </div>
             <button className="px-4 py-2 bg-red-500/20 text-red-300 text-sm font-medium rounded-lg hover:bg-red-500/30 transition-colors">
               Verify Now
             </button>
          </motion.div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div onClick={() => router.push('/cases')} className="bg-[#0d1224] border border-[#1e2642] rounded-2xl p-5 hover:border-[#2d3759] transition-colors cursor-pointer">
            <div className="flex items-center gap-3 text-[#a1a1aa] mb-3"><Briefcase size={16} /> <span className="text-xs font-semibold uppercase tracking-wider">Total Cases</span></div>
            <div className="text-3xl font-semibold text-[#ededed]">12</div>
          </div>
          <div className="bg-[#0d1224] border border-[#1e2642] rounded-2xl p-5 hover:border-[#2d3759] transition-colors">
            <div className="flex items-center gap-3 text-[#a1a1aa] mb-3"><Scale size={16} /> <span className="text-xs font-semibold uppercase tracking-wider">Active Queries</span></div>
            <div className="text-3xl font-semibold text-[#ededed]">8</div>
          </div>
          <div className="bg-[#0d1224] border border-[#1e2642] rounded-2xl p-5 hover:border-[#2d3759] transition-colors">
            <div className="flex items-center gap-3 text-[#a1a1aa] mb-3"><FileText size={16} /> <span className="text-xs font-semibold uppercase tracking-wider">Docs Processed</span></div>
            <div className="text-3xl font-semibold text-[#ededed]">145</div>
          </div>
          <div className="bg-[#0d1224] border border-[#1e2642] rounded-2xl p-5 hover:border-[#2d3759] transition-colors">
            <div className="flex items-center gap-3 text-[#a1a1aa] mb-3"><Zap size={16} /> <span className="text-xs font-semibold uppercase tracking-wider">AI Usage</span></div>
            <div className="text-3xl font-semibold text-[#ededed]">84%</div>
            <div className="w-full bg-[#1e2642] h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-amber-400 h-full w-[84%] rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
            </div>
          </div>
        </div>

        {/* Quick Actions (BIG Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button onClick={() => router.push('/search')} className="flex items-center gap-5 p-6 rounded-2xl bg-gradient-to-br from-[#111827] to-[#0d1224] border border-[#1e2642] hover:border-[#3a466d] transition-all group relative overflow-hidden text-left">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><Search size={80} /></div>
            <div className="w-12 h-12 rounded-xl bg-[#1e2642] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"><Search size={22} className="text-blue-400" /></div>
            <div>
              <h3 className="text-lg font-semibold text-[#ededed]">Search Legal Database</h3>
              <p className="text-sm text-[#a1a1aa]">Query IPC, CrPC, judgments & acts</p>
            </div>
          </button>
          <button onClick={() => triggerChat()} className="flex items-center gap-5 p-6 rounded-2xl bg-gradient-to-br from-[#111827] to-[#0d1224] border border-[#1e2642] hover:border-[#3a466d] transition-all group relative overflow-hidden text-left">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><Zap size={80} /></div>
            <div className="w-12 h-12 rounded-xl bg-[#1e2642] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"><Zap size={22} className="text-amber-300" /></div>
            <div>
              <h3 className="text-lg font-semibold text-[#ededed]">Ask AI Assistant</h3>
              <p className="text-sm text-[#a1a1aa]">Draft documents & get strategy</p>
            </div>
          </button>
        </div>

        {/* Dual Panel Data Hub */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Charts Panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#0d1224] border border-[#1e2642] rounded-2xl p-5">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-semibold text-[#ededed] flex items-center gap-2"><TrendingUp size={16} className="text-[#a1a1aa]" /> Legal Queries Over Time</h3>
                  <select className="bg-[#131b31] text-xs px-2 py-1 rounded text-[#a1a1aa] border-none outline-none">
                    <option>Last 7 Days</option>
                    <option>Last 30 Days</option>
                  </select>
               </div>
               <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={queryData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e2642" vertical={false} />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0a0f1d', borderColor: '#1e2642', borderRadius: '8px' }} />
                      <Line type="monotone" dataKey="queries" stroke="#d4af37" strokeWidth={3} dot={{ fill: '#d4af37', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
               </div>
            </div>

            {/* Case Management Preview */}
            <div className="bg-[#0d1224] border border-[#1e2642] rounded-2xl p-5">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold text-[#ededed] flex items-center gap-2"><Briefcase size={16} className="text-[#a1a1aa]" /> Active Cases</h3>
                  <button onClick={() => router.push('/cases')} className="text-xs text-amber-300 hover:text-purple-300">View All</button>
              </div>
              <div className="overflow-hidden rounded-xl border border-[#1e2642]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#111827] text-[#a1a1aa] text-xs uppercase">
                    <tr><th className="px-4 py-3 font-medium">Case Name</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Next Hearing</th></tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2642]">
                    {mockCases.map(c => (
                      <tr key={c.id} className="hover:bg-[#1a1a1a] transition-colors cursor-pointer">
                        <td className="px-4 py-3 font-medium text-[#ededed]"><div className="flex flex-col"><span>{c.title}</span><span className="text-[10px] text-[#71717a]">{c.id}</span></div></td>
                        <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] border border-blue-500/20">{c.status}</span></td>
                        <td className="px-4 py-3 text-[#a1a1aa] text-xs">{c.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Sidebar Modules */}
          <div className="space-y-6">
             {/* Doc Intelligence Panel */}
             <div className="bg-[#0d1224] border border-[#1e2642] rounded-2xl p-5 h-full flex flex-col">
                <h3 className="text-sm font-semibold text-[#ededed] flex items-center gap-2 mb-4"><FileStack size={16} className="text-[#a1a1aa]" /> Document Intelligence</h3>
                <div className="flex-1 border-2 border-dashed border-[#1e2642] rounded-xl flex flex-col items-center justify-center p-6 text-center hover:bg-[#1a1a1a] hover:border-[#2d3759] transition-all cursor-pointer group mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#131b31] mb-3 flex items-center justify-center group-hover:scale-110 transition-transform"><UploadCloud size={20} className="text-[#a1a1aa]" /></div>
                  <p className="text-sm font-medium text-[#ededed] mb-1">Upload Legal Document</p>
                  <p className="text-xs text-[#71717a]">Extract entities & summarize instantly</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#131b31] transition-colors cursor-pointer">
                    <div className="w-8 h-8 rounded bg-red-500/10 flex items-center justify-center shrink-0"><File size={14} className="text-red-400" /></div>
                    <div className="flex-1 min-w-0"><p className="text-xs font-medium text-[#ededed] truncate">FIR_Draft_v2.pdf</p><p className="text-[10px] text-[#71717a]">Processed 2h ago</p></div>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#131b31] transition-colors cursor-pointer">
                    <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center shrink-0"><File size={14} className="text-blue-400" /></div>
                    <div className="flex-1 min-w-0"><p className="text-xs font-medium text-[#ededed] truncate">Lease_Agreement.pdf</p><p className="text-[10px] text-[#71717a]">Processed 1d ago</p></div>
                  </div>
                </div>
             </div>
          </div>
        </div>

        {/* Lawyer Marketplace Carousel Preivew */}
        <div className="bg-[#0d1224] border border-[#1e2642] rounded-2xl p-5 overflow-hidden">
           <div className="flex justify-between items-center mb-5">
              <h3 className="text-sm font-semibold text-[#ededed] flex items-center gap-2"><Briefcase size={16} className="text-[#a1a1aa]" /> Top Lawyers in your Area</h3>
              <button className="text-xs text-amber-300 hover:text-purple-300">Marketplace</button>
           </div>
           <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-2">
             {mockLawyers.map((l, i) => (
                <div key={i} className="min-w-[240px] border border-[#1e2642] rounded-xl p-4 bg-[#1a1a1a] hover:border-[#2d3759] transition-all shrink-0">
                   <div className="flex items-center gap-3 mb-3">
                     <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-600 to-yellow-500 flex items-center justify-center text-xs font-bold text-white shrink-0">{l.img}</div>
                     <div>
                       <h4 className="text-sm font-semibold text-[#ededed] truncate">{l.name}</h4>
                       <p className="text-[10px] text-[#a1a1aa] uppercase tracking-wider">{l.type}</p>
                     </div>
                   </div>
                   <div className="flex items-center justify-between mt-4 border-t border-[#1e2642] pt-3">
                     <div className="text-xs font-medium text-amber-400 flex items-center gap-1">★ {l.rating}</div>
                     <button className="text-xs font-medium bg-[#ededed] text-black px-3 py-1 rounded-full hover:bg-white transition-colors">Book</button>
                   </div>
                </div>
             ))}
           </div>
        </div>

        {/* Billing & Plan Status */}
        <BillingCard onUpgrade={triggerPro} />

      </div>
    </div>
  );
}
