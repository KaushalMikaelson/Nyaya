"use client";

import { motion } from "framer-motion";
import { 
  FileText, Briefcase, Scale, Search, Users, ShieldCheck, Zap, 
  ArrowRight, File, TrendingUp, AlertTriangle, Fingerprint, Clock, UploadCloud, Bell, FileStack, ArrowUpRight
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from "recharts";
import BillingCard from "./BillingCard";
import { Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({ subsets: ['latin'], style: ['normal', 'italic'] });

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
    <div className="flex flex-col w-full h-full overflow-y-auto custom-scrollbar bg-[#f8f9fa] text-[#1e293b]">
      <div className="space-y-12 w-full max-w-[1600px] mx-auto px-6 md:px-12 py-10 pb-32">
        
        {/* Hero Welcome */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200">
          <div>
            <h1 className={`${playfair.className} text-4xl md:text-5xl text-[#0f172a] tracking-tight leading-tight`}>
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, <br/>
              <span className="italic text-slate-500">{user.email.split('@')[0]}</span>
            </h1>
            <p className="text-slate-500 mt-3 text-sm font-semibold tracking-wider uppercase">Your Legal Intelligence Space</p>
          </div>
          <button 
            onClick={triggerChat} 
            className="flex items-center gap-3 bg-[#0f172a] text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-all shadow-md group"
          >
             Instant AI Consult <ArrowUpRight size={16} className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Action Required Logic */}
        {(user.role === 'CITIZEN' || (user.role === 'LAWYER' && user.verificationStatus !== 'VERIFIED') || (user.role === 'JUDGE' && user.verificationStatus !== 'VERIFIED')) && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 border border-red-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
             <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                 <AlertTriangle className="text-red-600" size={18} />
               </div>
               <div>
                  <h3 className={`${playfair.className} text-xl text-red-900`}>Verification Pending</h3>
                  <p className="text-sm text-red-700 mt-1">Complete your profile KYC to unlock all marketplace and filing features.</p>
               </div>
             </div>
             <button className="px-6 py-2.5 bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors rounded-lg shadow-sm">
               Verify Now
             </button>
          </motion.div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div onClick={() => router.push('/cases')} className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group">
            <div className="flex justify-between items-start mb-6">
               <Briefcase size={20} className="text-slate-400 group-hover:text-[#0f172a] transition-colors" />
               <ArrowUpRight size={14} className="text-slate-300 group-hover:text-[#d4af37] transition-colors" />
            </div>
            <div className="text-3xl font-light text-[#0f172a] mb-1">12</div>
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Total Cases</div>
          </div>
          
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 hover:shadow-md hover:border-slate-300 transition-all group">
            <div className="flex justify-between items-start mb-6">
               <Scale size={20} className="text-slate-400 group-hover:text-[#0f172a] transition-colors" />
            </div>
            <div className="text-3xl font-light text-[#0f172a] mb-1">8</div>
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Active Queries</div>
          </div>
          
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 hover:shadow-md hover:border-slate-300 transition-all group">
            <div className="flex justify-between items-start mb-6">
               <FileText size={20} className="text-slate-400 group-hover:text-[#0f172a] transition-colors" />
            </div>
            <div className="text-3xl font-light text-[#0f172a] mb-1">145</div>
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Docs Processed</div>
          </div>
          
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 hover:shadow-md hover:border-slate-300 transition-all group flex flex-col justify-between">
            <div>
               <div className="flex justify-between items-start mb-6">
                  <Zap size={20} className="text-[#d4af37]" />
               </div>
               <div className="text-3xl font-light text-[#0f172a] mb-1">84%</div>
               <div className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">AI Usage</div>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
               <div className="bg-[#d4af37] h-full w-[84%]" />
            </div>
          </div>
        </div>

        {/* Quick Actions (BIG Cards) / Redesigned */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button onClick={() => router.push('/search')} className="flex flex-col justify-between p-8 min-h-[220px] bg-[#0f172a] text-white rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden text-left border border-slate-800">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Search size={120} /></div>
            <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center shrink-0 mb-8 backdrop-blur-sm"><Search size={24} className="text-white group-hover:scale-110 transition-transform" /></div>
            <div>
              <h3 className={`${playfair.className} text-3xl text-white mb-2`}>Global Database</h3>
              <p className="text-sm font-light text-slate-300 tracking-wide">Query IPC, CrPC, judgments & central acts</p>
            </div>
          </button>
          
          <button onClick={() => triggerChat()} className="flex flex-col justify-between p-8 min-h-[220px] bg-white border border-slate-200 rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden text-left">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-5 transition-opacity"><Zap size={120} className="text-[#d4af37]" /></div>
            <div className="w-14 h-14 bg-[#f8f9fa] border border-slate-200 rounded-xl flex items-center justify-center shrink-0 mb-8"><Zap size={24} className="text-[#d4af37] group-hover:scale-110 transition-transform" /></div>
            <div>
              <h3 className={`${playfair.className} text-3xl text-[#0f172a] mb-2`}>Intelligence Engine</h3>
              <p className="text-sm font-medium text-slate-500 tracking-wide">Draft documents & formulate court strategy</p>
            </div>
          </button>
        </div>

        {/* Dual Panel Data Hub */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Charts Panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8">
               <div className="flex justify-between items-center mb-8">
                  <h3 className="text-sm font-bold tracking-widest uppercase text-slate-700">Intelligence Heatmap</h3>
                  <div className="text-xs bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 text-slate-600 font-semibold">LAST 7 DAYS</div>
               </div>
               <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={queryData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Line type="monotone" dataKey="queries" stroke="#0f172a" strokeWidth={3} dot={{ fill: '#ffffff', stroke: '#0f172a', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: '#0f172a' }} />
                    </LineChart>
                  </ResponsiveContainer>
               </div>
            </div>

            {/* Case Management Preview */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold tracking-widest uppercase text-slate-700">Active Dockets</h3>
                  <button onClick={() => router.push('/cases')} className="text-xs text-[#0f172a] font-bold hover:text-[#d4af37] transition-colors border-b border-transparent hover:border-[#d4af37]">View Archive</button>
              </div>
              <div className="overflow-hidden border border-slate-200 rounded-lg">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest">
                    <tr><th className="px-5 py-4 font-bold">Title</th><th className="px-5 py-4 font-bold">Stage</th><th className="px-5 py-4 font-bold text-right">Date</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {mockCases.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                        <td className="px-5 py-4">
                           <div className="flex flex-col">
                             <span className={`${playfair.className} text-lg text-[#0f172a] group-hover:text-[#d4af37] transition-colors font-medium`}>{c.title}</span>
                             <span className="text-xs font-semibold tracking-widest text-slate-400 uppercase mt-1">{c.id}</span>
                           </div>
                        </td>
                        <td className="px-5 py-4">
                           <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-3 py-1 rounded uppercase tracking-widest">{c.status}</span>
                        </td>
                        <td className="px-5 py-4 text-right text-slate-500 text-xs font-medium tracking-wide">{c.date}</td>
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
             <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 h-full flex flex-col">
                <h3 className="text-sm font-bold tracking-widest uppercase text-slate-700 mb-6">Document Index</h3>
                <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-100 transition-all cursor-pointer group mb-8">
                  <UploadCloud size={28} className="text-slate-400 group-hover:text-[#0f172a] transition-colors mb-4" />
                  <p className="text-sm font-bold text-[#0f172a] mb-1">Process New Evidence</p>
                  <p className="text-xs font-semibold tracking-wide text-slate-500">PDF, DOCX accepted</p>
                </div>
                <div className="space-y-4 flex-1">
                  <div className="flex items-center gap-4 group cursor-pointer p-3 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-200">
                    <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center shrink-0"><File size={18} className="text-blue-600" /></div>
                    <div className="flex-1 min-w-0">
                       <p className="text-sm font-bold text-[#0f172a] truncate">FIR_Draft_v2.pdf</p>
                       <p className="text-[10px] text-slate-500 font-semibold tracking-widest uppercase mt-0.5">2 Hours Ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 group cursor-pointer p-3 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-200">
                    <div className="w-10 h-10 bg-amber-50 border border-amber-100 rounded-lg flex items-center justify-center shrink-0"><File size={18} className="text-[#d4af37]" /></div>
                    <div className="flex-1 min-w-0">
                       <p className="text-sm font-bold text-[#0f172a] truncate">Lease_Agreement.pdf</p>
                       <p className="text-[10px] text-slate-500 font-semibold tracking-widest uppercase mt-0.5">1 Day Ago</p>
                    </div>
                  </div>
                </div>
             </div>
          </div>
        </div>

        {/* Lawyer Marketplace Carousel Preview */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-8">
           <div className="flex justify-between items-center mb-8">
              <h3 className="text-sm font-bold tracking-widest uppercase text-slate-700">Retain Counsel</h3>
              <button className="text-xs text-[#0f172a] font-bold hover:text-[#d4af37] transition-colors border-b border-transparent hover:border-[#d4af37]">View Network</button>
           </div>
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
             {mockLawyers.map((l, i) => (
                <div key={i} className="border border-slate-200 rounded-xl p-6 bg-slate-50 hover:bg-slate-100 transition-colors group">
                   <div className="flex items-start gap-4 mb-6">
                     <div className="w-14 h-14 bg-white border border-slate-200 rounded-full shadow-sm flex items-center justify-center text-sm font-bold tracking-wider text-[#0f172a] shrink-0 group-hover:bg-[#0f172a] group-hover:text-white transition-colors">
                       {l.img}
                     </div>
                     <div>
                       <h4 className={`${playfair.className} text-xl text-[#0f172a] mb-1 font-semibold`}>{l.name}</h4>
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{l.type}</p>
                     </div>
                   </div>
                   <div className="flex items-center justify-between border-t border-slate-200 pt-4 mt-2">
                     <div className="text-xs font-bold text-[#d4af37] tracking-widest">★ {l.rating}</div>
                     <button className="text-[10px] uppercase tracking-widest font-bold border border-slate-300 bg-white text-slate-700 px-4 py-2 rounded-lg hover:bg-[#0f172a] hover:border-[#0f172a] hover:text-white transition-colors shadow-sm">
                       Retain
                     </button>
                   </div>
                </div>
             ))}
           </div>
        </div>

        {/* Billing & Plan Status */}
        <div className="bg-[#0f172a] text-white border border-slate-800 rounded-2xl p-8 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transition-opacity">
               <ShieldCheck size={180} />
           </div>
           <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
              <div>
                <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-4">
                  PRO Plan
                </div>
                <h2 className={`${playfair.className} text-3xl md:text-4xl font-semibold mb-2`}>Elevate Your Practice</h2>
                <p className="text-slate-400 font-medium max-w-lg">
                  Access unlimited AI inferences, 500 document parsings per month, and priority indexing inside the Nyaay marketplace.
                </p>
              </div>
              <button 
                onClick={triggerPro}
                className="bg-[#d4af37] text-slate-900 border-none px-8 py-3.5 rounded-xl font-bold hover:shadow-lg hover:bg-amber-400 hover:scale-[1.02] transition-all flex items-center gap-2"
              >
                Upgrade to PRO
              </button>
           </div>
        </div>

      </div>
    </div>
  );
}
