"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Search, ArrowLeft, ChevronRight, FileText, Video, PlayCircle, BookMarked, ShieldAlert } from "lucide-react";
import NyayaNav from "@/components/NyayaNav";
import { useAuth } from "@/contexts/AuthContext";

const CATEGORIES = [
  "Know Your Rights",
  "FIR & Police",
  "Family Law Basics",
  "Property Rights",
  "Consumer Protection",
  "Women's Safety Laws"
];

const GUIDES = [
  { id: 1, title: "What to do if Police refuses to file an FIR?", category: "FIR & Police", readTime: "5 min read", type: "article" },
  { id: 2, title: "Understanding the new Bharatiya Nyaya Sanhita (BNS)", category: "Know Your Rights", readTime: "12 min read", type: "article" },
  { id: 3, title: "Step-by-step: Filing a Consumer Complaint", category: "Consumer Protection", readTime: "8 min read", type: "video" },
  { id: 4, title: "Property Inheritance Laws for Women in India", category: "Property Rights", readTime: "10 min read", type: "article" },
  { id: 5, title: "Protection of Women from Domestic Violence Act", category: "Women's Safety Laws", readTime: "15 min read", type: "video" },
  { id: 6, title: "Mutual Consent Divorce Procedure", category: "Family Law Basics", readTime: "7 min read", type: "article" },
];

export default function KnowledgeBase() {
  const router = useRouter();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("citizens");

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col">
      <NyayaNav user={user} logout={() => {}} active="knowledge" />

      <div className="flex-1 max-w-6xl w-full mx-auto p-4 py-8">
        
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center border border-indigo-500/30"
            style={{ background: "linear-gradient(135deg, #4f46e5, #ec4899)" }}>
            <BookOpen size={32} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-3">Legal Literacy Hub</h1>
          <p className="text-slate-400 max-w-xl mx-auto text-sm leading-relaxed">
            Access plain-language guides, FAQs, and explainer modules.
            Empowering citizens with legal knowledge and providing continuous professional development (CPD) for advocates.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 flex gap-2">
             <button 
               onClick={() => setActiveTab('citizens')}
               className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'citizens' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}>
               For Citizens
             </button>
             <button 
               onClick={() => setActiveTab('lawyers')}
               className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'lawyers' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}>
               For Lawyers (CPD)
             </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-2xl mx-auto mb-10">
          <input 
            type="text" 
            placeholder="Search for guides, acts, or procedures..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 outline-none focus:border-indigo-500 transition-colors shadow-inner"
          />
          <Search className="absolute left-4 top-4 text-slate-500" size={20} />
        </div>

        {activeTab === 'citizens' ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar Categories */}
            <div className="lg:col-span-1 space-y-2">
               <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 px-2">Categories</h3>
               {CATEGORIES.map(cat => (
                 <button key={cat} className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors border border-transparent hover:border-white/10">
                   {cat}
                 </button>
               ))}
               <div className="mt-8 p-4 rounded-xl border border-rose-500/20 bg-rose-500/5">
                 <ShieldAlert className="text-rose-400 mb-2" size={24} />
                 <h4 className="text-sm font-bold text-rose-400 mb-1">Emergency Help</h4>
                 <p className="text-xs text-rose-300/70">Need immediate legal assistance? Use Ask Nyaya or contact authorities.</p>
                 <button onClick={() => router.push('/ask-nyaya')} className="mt-3 w-full py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-lg text-xs font-bold transition-colors">Open AI Consult</button>
               </div>
            </div>

            {/* Guides Grid */}
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
               {GUIDES.filter(g => g.title.toLowerCase().includes(search.toLowerCase())).map(guide => (
                 <div key={guide.id} className="group bg-slate-900/50 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-5 transition-all hover:-translate-y-1 cursor-pointer">
                   <div className="flex justify-between items-start mb-4">
                     <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400">
                       {guide.category}
                     </span>
                     {guide.type === 'video' ? <PlayCircle size={18} className="text-pink-400" /> : <FileText size={18} className="text-indigo-400" />}
                   </div>
                   <h3 className="font-bold text-lg mb-2 group-hover:text-indigo-300 transition-colors line-clamp-2">{guide.title}</h3>
                   <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-800/50">
                     <span className="text-xs text-slate-500 font-medium">{guide.readTime}</span>
                     <ChevronRight size={16} className="text-slate-600 group-hover:text-indigo-400 transition-colors" />
                   </div>
                 </div>
               ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-slate-800 rounded-3xl bg-slate-900/20">
             <BookMarked size={48} className="text-indigo-500/50 mb-4" />
             <h3 className="text-2xl font-bold mb-2">Advocate CPD Portal</h3>
             <p className="text-slate-400 max-w-md mb-6 text-sm">
               Continuing Professional Development modules for registered advocates. Access SC judgments, new legislation deep-dives, and earn credits.
             </p>
             <button className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-sm transition-colors flex items-center gap-2">
               Verify Bar Council ID to Access
             </button>
          </div>
        )}

      </div>
    </div>
  );
}
